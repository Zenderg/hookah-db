import { type Page } from 'playwright';
import { Logger } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ItemLoadResult {
  urls: string[];
  totalCount: number;
  loadedCount: number;
  isComplete: boolean;
  method: 'htmx-direct' | 'scroll';
}

export interface ItemLoaderOptions {
  containerSelector: string; // '.tobacco_list_items'
  itemSelector: string; // '.tobacco_list_item'
  baseUrl: string; // 'https://htreviews.org'
  maxScrollAttempts: number; // 100 (fallback)
  maxNoNewContent: number; // 15 (fallback)
  waitForNewItemMs: number; // 2000 (fallback)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HTMX_PATH = '/postData';
const HTMX_RETRY_ATTEMPTS = 2;
const HTMX_RETRY_DELAY_MS = 3000;

const logger = new Logger('ItemLoader');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ContainerData {
  count: number;
  offset: number;
  target: number;
}

interface HtmxTobaccoItem {
  slug?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Line ID extraction
// ---------------------------------------------------------------------------

/**
 * Extract the htreviews internal line ID from the page's inline `<script>` tags.
 *
 * The ID (e.g. `"391"`) is needed for the POST /postData pagination endpoint.
 * It is embedded somewhere in the page's JavaScript — most likely in the same
 * script block that initialises the HTMX lazy-loading logic for the tobacco list.
 *
 * Multiple extraction strategies are tried in order of specificity:
 *
 * 1. `.object_wrapper[data-id]` — a simple DOM query for the element that
 *    wraps the line object; no regex needed, most reliable.
 * 2. `"action":"objectByLine"` … `"id":"391"` — the most reliable pattern,
 *    looks for the exact action name used in the request body near the line id.
 * 3. `objectByLine` (loose) … `"id":"391"` — same idea but tolerant of
 *    whitespace / property ordering between the two tokens.
 * 4. `postData` … `"id":"391"` — the endpoint name appears near the payload.
 * 5. `data-count` / `data-offset` … `"id":"391"` — container attribute names
 *    may appear in the same script that reads them.
 * 6. `lineId` / `line_id` variable assignment.
 * 7. `data-line-id` attribute on the container element (HTML fallback).
 */
export async function extractLineId(page: Page): Promise<string | null> {
  // Strategy 1: .object_wrapper[data-id] — the most reliable method
  const objectWrapper = await page.$('.object_wrapper[data-id]');
  if (objectWrapper) {
    const attrId = await objectWrapper.getAttribute('data-id');
    if (attrId && /^\d+$/.test(attrId)) {
      return attrId;
    }
  }

  return page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));

    for (const script of scripts) {
      const text = script.textContent ?? '';

      // Strategy 2: exact action + id in JSON-like structure
      const m1 = text.match(
        /"action"\s*:\s*"objectByLine"[\s\S]{0,300}?"id"\s*:\s*"(\d+)"/,
      );
      if (m1) return m1[1];

      // Strategy 3: loose — "objectByLine" then "id" within 200 chars
      const m2 = text.match(/objectByLine[\s\S]{0,200}?"id"\s*:\s*"(\d+)"/);
      if (m2) return m2[1];

      // Strategy 4: endpoint name near id
      const m3 = text.match(/postData[\s\S]{0,300}?"id"\s*:\s*"(\d+)"/);
      if (m3) return m3[1];

      // Strategy 5: container data attributes near id
      const m4 = text.match(/data-count[\s\S]{0,300}?"id"\s*:\s*"(\d+)"/);
      if (m4) return m4[1];

      // Strategy 6: lineId / line_id variable
      const m5 = text.match(/(?:line_id|lineId)\s*[:=]\s*["']?(\d+)["']?/);
      if (m5) return m5[1];
    }

    // Strategy 7: data attribute on container element
    const container = document.querySelector('.tobacco_list_items');
    if (container) {
      const attrId = container.getAttribute('data-line-id');
      if (attrId && /^\d+$/.test(attrId)) return attrId;
    }

    return null;
  });
}

// ---------------------------------------------------------------------------
// Container data
// ---------------------------------------------------------------------------

/**
 * Read `data-count`, `data-offset`, `data-target` from the container element.
 */
async function readContainerData(
  page: Page,
  containerSelector: string,
): Promise<ContainerData> {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { count: 0, offset: 0, target: 5 };

    return {
      count: parseInt(el.getAttribute('data-count') ?? '0', 10),
      offset: parseInt(el.getAttribute('data-offset') ?? '0', 10),
      target: parseInt(el.getAttribute('data-target') ?? '5', 10),
    };
  }, containerSelector);
}

// ---------------------------------------------------------------------------
// URL extraction from DOM
// ---------------------------------------------------------------------------

/**
 * Collect tobacco URLs already present in the DOM.
 *
 * Finds links (`<a>`) inside elements matching `itemSelector` within the
 * container. Only links whose `href` matches `/tobaccos/{brand}/{line}/{tobacco}`
 * are collected. Relative URLs are resolved against `baseUrl`.
 */
async function extractUrlsFromDom(
  page: Page,
  options: ItemLoaderOptions,
): Promise<Set<string>> {
  const raw = await page.evaluate(
    ({ containerSelector, itemSelector, baseUrl }) => {
      const result: string[] = [];
      const container = document.querySelector(containerSelector);
      if (!container) return result;

      const items = container.querySelectorAll(itemSelector);
      for (const item of items) {
        const links = item.querySelectorAll('a[href*="/tobaccos/"]');
        for (const link of links) {
          const href = link.getAttribute('href');
          if (!href) continue;

          if (/\/tobaccos\/[^/]+\/[^/]+\/[^/?#]+/.test(href)) {
            result.push(href.startsWith('http') ? href : `${baseUrl}${href}`);
          }
        }
      }
      return result;
    },
    {
      containerSelector: options.containerSelector,
      itemSelector: options.itemSelector,
      baseUrl: options.baseUrl,
    },
  );

  return new Set(raw);
}

// ---------------------------------------------------------------------------
// HTMX direct requests
// ---------------------------------------------------------------------------

/**
 * Send a single POST /postData request with retry on 429 / transient errors.
 * Returns `null` on persistent failure (caller should fall back to scroll).
 */
async function fetchHtmxBatch(
  page: Page,
  baseUrl: string,
  lineId: string,
  offset: number,
  limit: number,
): Promise<HtmxTobaccoItem[] | null> {
  const body = {
    action: 'objectByLine',
    data: {
      id: lineId,
      limit,
      offset,
      sort: { s: 'rating', d: 'desc' },
    },
  };

  for (let attempt = 0; attempt <= HTMX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await page.request.post(`${baseUrl}${HTMX_PATH}`, {
        data: body,
        headers: { 'Content-Type': 'application/json' },
      });

      const status = response.status();

      if (status === 200) {
        return (await response.json()) as HtmxTobaccoItem[];
      }

      // Retry on 429
      if (status === 429 && attempt < HTMX_RETRY_ATTEMPTS) {
        logger.warn(
          `HTMX 429 at offset ${offset}, retry ${attempt + 1}/${HTMX_RETRY_ATTEMPTS}`,
        );
        await delay(HTMX_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      // Non-200, non-429 — do not retry
      logger.warn(`HTMX returned ${status} at offset ${offset}`);
      return null;
    } catch (error) {
      if (attempt < HTMX_RETRY_ATTEMPTS) {
        logger.warn(
          `HTMX request failed at offset ${offset}: ${error instanceof Error ? error.message : String(error)}, retry ${attempt + 1}/${HTMX_RETRY_ATTEMPTS}`,
        );
        await delay(HTMX_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      logger.warn(
        `HTMX request failed after ${attempt + 1} attempts at offset ${offset}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  return null; // should not reach here, but satisfies the compiler
}

/**
 * Primary loading mechanism — sequential POST /postData batches.
 *
 * Returns `{ success: true }` when all remaining items were fetched (or the
 * server returned `[]` signalling end-of-data). Returns `{ success: false }`
 * when the line ID could not be extracted or a batch request failed
 * persistently — the caller should fall back to scroll.
 */
async function loadViaHtmx(
  page: Page,
  options: ItemLoaderOptions,
  containerData: ContainerData,
  existingUrls: Set<string>,
): Promise<{ urls: Set<string>; success: boolean }> {
  const lineId = await extractLineId(page);

  if (!lineId) {
    logger.warn('Could not extract line ID from page — falling back to scroll');
    return { urls: existingUrls, success: false };
  }

  logger.debug(`Extracted line ID: ${lineId}`);

  const { count, offset, target } = containerData;
  let currentOffset = offset;

  while (currentOffset < count) {
    const items = await fetchHtmxBatch(
      page,
      options.baseUrl,
      lineId,
      currentOffset,
      target,
    );

    if (items === null) {
      // Persistent failure — tell caller to fall back
      return { urls: existingUrls, success: false };
    }

    if (items.length === 0) {
      // Empty array = end of data
      logger.debug(`HTMX returned empty array at offset ${currentOffset}`);
      break;
    }

    for (const item of items) {
      if (item.slug) {
        existingUrls.add(`${options.baseUrl}/tobaccos/${item.slug}`);
      }
    }

    logger.debug(
      `HTMX batch offset ${currentOffset}: +${items.length} items → ${existingUrls.size} total`,
    );

    currentOffset += items.length;
  }

  return { urls: existingUrls, success: true };
}

// ---------------------------------------------------------------------------
// Scroll fallback
// ---------------------------------------------------------------------------

/**
 * Fallback loading mechanism — incremental scroll with `waitForFunction`.
 * Used only when direct HTMX requests fail (no line ID, endpoint error, etc.).
 */
async function loadViaScroll(
  page: Page,
  options: ItemLoaderOptions,
  existingUrls: Set<string>,
): Promise<void> {
  let noNewContentCount = 0;
  let scrollAttempts = 0;
  let previousCount = existingUrls.size;

  while (
    noNewContentCount < options.maxNoNewContent &&
    scrollAttempts < options.maxScrollAttempts
  ) {
    scrollAttempts++;

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Wait for new items — timeout is NOT an error, just no new content
    await page
      .waitForFunction(
        ({ selector, expected }: { selector: string; expected: number }) =>
          document.querySelectorAll(selector).length >= expected,
        { selector: options.itemSelector, expected: previousCount + 1 },
        { timeout: options.waitForNewItemMs },
      )
      .catch(() => {});

    // Re-extract URLs from the container
    const fresh = await extractUrlsFromDom(page, options);
    for (const url of fresh) {
      existingUrls.add(url);
    }

    const currentCount = existingUrls.size;
    if (currentCount === previousCount) {
      noNewContentCount++;
    } else {
      noNewContentCount = 0;
      previousCount = currentCount;
    }

    logger.debug(
      `Scroll #${scrollAttempts}: ${existingUrls.size} URLs, ${noNewContentCount} stale`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load all tobacco URLs from a line page.
 *
 * **Primary mechanism** — direct POST requests to the HTMX endpoint
 * (`/postData`). Falls back to incremental scroll only when HTMX requests
 * cannot be used (missing line ID, endpoint errors).
 *
 * The caller is expected to have already navigated the page to the line URL
 * and waited for the initial DOM to settle.
 */
export async function loadAllItems(
  page: Page,
  options: ItemLoaderOptions,
): Promise<ItemLoadResult> {
  // 1. Read container metadata
  const containerData = await readContainerData(
    page,
    options.containerSelector,
  );
  const { count: totalCount } = containerData;

  logger.debug(
    `Container: count=${totalCount}, offset=${containerData.offset}, target=${containerData.target}`,
  );

  // 2. Collect URLs already rendered in the DOM
  const urls = await extractUrlsFromDom(page, options);
  logger.debug(`Initial DOM contains ${urls.size} URLs`);

  let method: ItemLoadResult['method'];

  // 3. Decide loading strategy
  if (containerData.offset >= containerData.count) {
    // Everything already in DOM
    method = 'htmx-direct';
    logger.log(
      `All ${totalCount} items already in DOM (offset ${containerData.offset} >= count ${containerData.count})`,
    );
  } else {
    // Try HTMX direct requests first
    const htmxResult = await loadViaHtmx(page, options, containerData, urls);

    if (htmxResult.success) {
      method = 'htmx-direct';
      logger.log(`Loaded via HTMX direct: ${urls.size} URLs`);
    } else {
      // Fall back to scroll
      logger.warn('HTMX direct failed — falling back to scroll');
      method = 'scroll';
      await loadViaScroll(page, options, urls);
      logger.log(`Loaded via scroll fallback: ${urls.size} URLs`);
    }
  }

  // 4. Verification
  const loadedCount = urls.size;
  const isComplete = totalCount > 0 && loadedCount >= totalCount;

  if (!isComplete && totalCount > 0) {
    logger.warn(`Loaded ${loadedCount} of ${totalCount} items`);
  }

  return {
    urls: Array.from(urls),
    totalCount,
    loadedCount,
    isComplete,
    method,
  };
}
