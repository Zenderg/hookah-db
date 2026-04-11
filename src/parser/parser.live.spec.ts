import type { Browser, BrowserContext, Page } from 'playwright';
import { createBrowser, createContext } from './browser/browser.config';
import { navigateWithCheck } from './browser/http-checker';
import { loadAllItems, extractLineId } from './browser/item-loader';
import type { ItemLoaderOptions, ItemLoadResult } from './browser/item-loader';

const LIVE_TESTS = !!process.env.LIVE_TESTS;

const BASE_URL = 'https://htreviews.org';
const BRAND_LISTING_URL = `${BASE_URL}/tobaccos/brands?r=position&s=rating&d=desc`;
const TEST_LINE_URL = `${BASE_URL}/tobaccos/darkside/xperience`;

const ITEM_LOADER_OPTIONS: ItemLoaderOptions = {
  containerSelector: '.tobacco_list_items',
  itemSelector: '.tobacco_list_item',
  baseUrl: BASE_URL,
  maxScrollAttempts: 100,
  maxNoNewContent: 15,
  waitForNewItemMs: 2000,
};

(LIVE_TESTS ? describe : describe.skip)('Parser Live Smoke Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let no403Detected = true;

  // Shared state between tests — order-dependent. Acceptable for smoke tests.
  let lineId: string | null = null;
  let htmxResponseItems: Array<{ slug: string; name: string }> = [];

  beforeAll(async () => {
    browser = await createBrowser();
    context = await createContext(browser);
    page = await context.newPage();
  }, 60_000);

  afterAll(async () => {
    await page?.close();
    await context?.close();
    await browser?.close();
  }, 30_000);

  // ---------------------------------------------------------------------------
  // Test 1 — Brand listing
  // ---------------------------------------------------------------------------

  it('should access brand listing page without 403', async () => {
    const result = await navigateWithCheck(page, BRAND_LISTING_URL);

    if (result.status === 403) {
      no403Detected = false;
    }

    try {
      expect(result.status).toBe(200);
    } catch {
      throw new Error(
        [
          `Expected 200 but got ${result.status} from ${BRAND_LISTING_URL}`,
          `Final URL: ${result.url}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    const brandItems = await page.$$('.tobacco_list_item');
    try {
      expect(brandItems.length).toBeGreaterThan(0);
    } catch {
      throw new Error(
        [
          `No .tobacco_list_item elements found on ${BRAND_LISTING_URL}`,
          `HTTP status: ${result.status}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }
  }, 30_000);

  // ---------------------------------------------------------------------------
  // Test 2 — Line page container
  // ---------------------------------------------------------------------------

  it('should access line page and find tobacco container', async () => {
    const result = await navigateWithCheck(page, TEST_LINE_URL);

    if (result.status === 403) {
      no403Detected = false;
    }

    try {
      expect(result.status).toBe(200);
    } catch {
      throw new Error(
        [
          `Expected 200 but got ${result.status} from ${TEST_LINE_URL}`,
          `Final URL: ${result.url}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    const container = await page.$('.tobacco_list_items');
    try {
      expect(container).not.toBeNull();
    } catch {
      throw new Error(
        [
          `No .tobacco_list_items container found on ${TEST_LINE_URL}`,
          `HTTP status: ${result.status}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    const dataCount = await container?.getAttribute('data-count');
    try {
      expect(Number(dataCount)).toBeGreaterThan(0);
    } catch {
      throw new Error(
        [
          `data-count is not > 0: ${dataCount} on ${TEST_LINE_URL}`,
          `HTTP status: ${result.status}`,
        ].join('\n'),
      );
    }
  }, 30_000);

  // ---------------------------------------------------------------------------
  // Test 3 — Container data attributes
  // ---------------------------------------------------------------------------

  it('should read data-count, data-offset, data-target from container', async () => {
    const attrs = await page.evaluate(() => {
      const el = document.querySelector('.tobacco_list_items');
      if (!el) return null;
      return {
        count: el.getAttribute('data-count'),
        offset: el.getAttribute('data-offset'),
        target: el.getAttribute('data-target'),
      };
    });

    try {
      expect(attrs).not.toBeNull();
    } catch {
      throw new Error(`No .tobacco_list_items container found on current page`);
    }

    const { count, offset, target } = attrs!;

    const countNum = Number(count);
    const offsetNum = Number(offset);
    const targetNum = Number(target);

    try {
      expect(isNaN(countNum)).toBe(false);
      expect(countNum).toBeGreaterThan(0);
      expect(isNaN(offsetNum)).toBe(false);
      expect(offsetNum).toBeGreaterThanOrEqual(0);
      expect(isNaN(targetNum)).toBe(false);
      expect(targetNum).toBeGreaterThan(0);
    } catch {
      throw new Error(
        [
          `Invalid container data attributes on ${TEST_LINE_URL}`,
          `data-count: ${count} (parsed: ${countNum})`,
          `data-offset: ${offset} (parsed: ${offsetNum})`,
          `data-target: ${target} (parsed: ${targetNum})`,
        ].join('\n'),
      );
    }
  }, 15_000);

  // ---------------------------------------------------------------------------
  // Test 4 — Pre-rendered tobacco URLs
  // ---------------------------------------------------------------------------

  it('should extract tobacco URLs from pre-rendered items', async () => {
    const items = await page.$$('.tobacco_list_item');

    try {
      expect(items.length).toBeGreaterThanOrEqual(1);
    } catch {
      throw new Error(
        [
          `No .tobacco_list_item elements found on ${TEST_LINE_URL}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll(
        '.tobacco_list_item a[href*="/tobaccos/"]',
      );
      return Array.from(links).map((a) => a.getAttribute('href'));
    });

    try {
      expect(urls.length).toBeGreaterThanOrEqual(1);
    } catch {
      throw new Error(
        [
          `No tobacco links found inside .tobacco_list_item on ${TEST_LINE_URL}`,
          `Items found: ${items.length}`,
        ].join('\n'),
      );
    }

    for (const href of urls) {
      try {
        expect(href).toMatch(/\/tobaccos\//);
      } catch {
        throw new Error(`Link href "${href}" does not contain /tobaccos/`);
      }
    }
  }, 15_000);

  // ---------------------------------------------------------------------------
  // Test 5 — POST /postData HTMX endpoint
  // ---------------------------------------------------------------------------

  it('should call POST /postData and get JSON response', async () => {
    lineId = await extractLineId(page);

    try {
      expect(lineId).not.toBeNull();
    } catch {
      throw new Error(
        [
          `Could not extract line ID from ${TEST_LINE_URL}`,
          `Page scripts did not contain any recognizable line ID pattern`,
        ].join('\n'),
      );
    }

    const body = {
      action: 'objectByLine',
      data: {
        id: lineId,
        limit: 20,
        offset: 0,
        sort: { s: 'rating', d: 'desc' },
      },
    };

    const response = await page.request.post(`${BASE_URL}/postData`, {
      data: body,
      headers: { 'Content-Type': 'application/json' },
    });

    const status = response.status();
    const contentType = response.headers()['content-type'] ?? '';

    try {
      expect(status).toBe(200);
    } catch {
      const bodyText = await response.text().catch(() => '<unreadable>');
      throw new Error(
        [
          `POST /postData returned ${status} (expected 200)`,
          `Content-Type: ${contentType}`,
          `Line ID: ${lineId}`,
          `Response body: ${bodyText.slice(0, 500)}`,
        ].join('\n'),
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new Error(
        [
          `POST /postData returned non-JSON response`,
          `Status: ${status}`,
          `Content-Type: ${contentType}`,
        ].join('\n'),
      );
    }

    try {
      expect(Array.isArray(json)).toBe(true);
    } catch {
      throw new Error(
        [
          `POST /postData returned non-array JSON`,
          `Type: ${typeof json}`,
          `Value: ${JSON.stringify(json).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    htmxResponseItems = json as Array<{ slug: string; name: string }>;
  }, 30_000);

  // ---------------------------------------------------------------------------
  // Test 6 — Parse HTMX batch response format
  // ---------------------------------------------------------------------------

  it('should parse HTMX batch response format', () => {
    try {
      expect(htmxResponseItems.length).toBeGreaterThan(0);
    } catch {
      throw new Error(
        `HTMX response array is empty — expected at least 1 item`,
      );
    }

    for (let i = 0; i < htmxResponseItems.length; i++) {
      const item = htmxResponseItems[i];

      try {
        expect(typeof item.slug).toBe('string');
        expect(item.slug.length).toBeGreaterThan(0);
      } catch {
        throw new Error(
          [
            `HTMX item [${i}] has invalid slug`,
            `Expected non-empty string, got: ${JSON.stringify(item.slug)}`,
            `Full item: ${JSON.stringify(item)}`,
          ].join('\n'),
        );
      }

      try {
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
      } catch {
        throw new Error(
          [
            `HTMX item [${i}] has invalid name`,
            `Expected non-empty string, got: ${JSON.stringify(item.name)}`,
            `Full item: ${JSON.stringify(item)}`,
          ].join('\n'),
        );
      }
    }
  }, 15_000);

  // ---------------------------------------------------------------------------
  // Test 7 — Tobacco detail page
  // ---------------------------------------------------------------------------

  it('should access tobacco detail page and extract data', async () => {
    let tobaccoUrl: string;

    if (htmxResponseItems.length > 0 && htmxResponseItems[0].slug) {
      tobaccoUrl = `${BASE_URL}/tobaccos/${htmxResponseItems[0].slug}`;
    } else {
      // Fallback: grab first link from current page
      const firstHref = await page.evaluate(() => {
        const link = document.querySelector(
          '.tobacco_list_item a[href*="/tobaccos/"]',
        );
        return link?.getAttribute('href');
      });
      if (!firstHref) {
        throw new Error(
          'No tobacco URL available — neither from HTMX response nor from DOM',
        );
      }
      tobaccoUrl = firstHref.startsWith('http')
        ? firstHref
        : `${BASE_URL}${firstHref}`;
    }

    const result = await navigateWithCheck(page, tobaccoUrl);

    if (result.status === 403) {
      no403Detected = false;
    }

    try {
      expect(result.status).toBe(200);
    } catch {
      throw new Error(
        [
          `Expected 200 but got ${result.status} from ${tobaccoUrl}`,
          `Final URL: ${result.url}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    // Check for flavor links (?r=flavor in href)
    const flavorLinks = await page.$$('a[href*="r=flavor"]');
    try {
      expect(flavorLinks.length).toBeGreaterThanOrEqual(1);
    } catch {
      throw new Error(
        [
          `No flavor links (a[href*="r=flavor"]) found on ${tobaccoUrl}`,
          `HTTP status: ${result.status}`,
          `HTML preview: ${(await page.content()).slice(0, 500)}`,
        ].join('\n'),
      );
    }

    const pageContent = await page.content();

    // Check for rating element (same selector the parser uses)
    const ratingValue = await page.$eval('div[data-rating]', (el) =>
      el.getAttribute('data-rating'),
    );

    try {
      expect(ratingValue).not.toBeNull();
      expect(Number(ratingValue)).toBeGreaterThanOrEqual(0);
      expect(Number(ratingValue)).toBeLessThanOrEqual(5);
    } catch {
      throw new Error(
        [
          `No valid rating (div[data-rating]) found on ${tobaccoUrl}`,
          `HTML preview: ${pageContent.slice(0, 500)}`,
        ].join('\n'),
      );
    }

    // Check for htreviewsId (same approach the parser uses: "HtreviewsID" label + htr\d+ pattern)
    const htreviewsId = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const label = allElements.find(
        (el) => el.textContent?.trim() === 'HtreviewsID',
      );
      if (!label) return null;
      const container = label.parentElement;
      if (!container) return null;
      const valueDiv = Array.from(container.children).find((child) => {
        const text = child.textContent?.trim() || '';
        return /^htr\d+$/.test(text);
      });
      return valueDiv?.textContent?.trim() || null;
    });

    try {
      expect(htreviewsId).not.toBeNull();
      expect(htreviewsId).toMatch(/^htr\d+$/);
    } catch {
      throw new Error(
        [
          `No valid htreviewsId found on ${tobaccoUrl}`,
          `Expected pattern htr\\d+, got: ${htreviewsId}`,
          `HTML preview: ${pageContent.slice(0, 500)}`,
        ].join('\n'),
      );
    }
  }, 30_000);

  // ---------------------------------------------------------------------------
  // Test 8 — loadAllItems for Xperience line
  // ---------------------------------------------------------------------------

  it('should load all tobaccos for test line (Xperience)', async () => {
    // Navigate fresh to the line page
    const result = await navigateWithCheck(page, TEST_LINE_URL);

    try {
      expect(result.status).toBe(200);
    } catch {
      throw new Error(
        `Failed to navigate to ${TEST_LINE_URL}: status ${result.status}`,
      );
    }

    const loadResult: ItemLoadResult = await loadAllItems(
      page,
      ITEM_LOADER_OPTIONS,
    );

    try {
      expect(loadResult.loadedCount).toBeGreaterThanOrEqual(
        loadResult.totalCount,
      );
      expect(loadResult.isComplete).toBe(true);
    } catch {
      throw new Error(
        [
          `loadAllItems incomplete for ${TEST_LINE_URL}`,
          `totalCount: ${loadResult.totalCount}`,
          `loadedCount: ${loadResult.loadedCount}`,
          `isComplete: ${loadResult.isComplete}`,
          `method: ${loadResult.method}`,
          `URLs (${loadResult.urls.length}): ${loadResult.urls.slice(0, 5).join(', ')}${loadResult.urls.length > 5 ? '...' : ''}`,
        ].join('\n'),
      );
    }
  }, 60_000);

  // ---------------------------------------------------------------------------
  // Test 9 — No 403 across all tests
  // ---------------------------------------------------------------------------

  it('should not get blocked with configured User-Agent', () => {
    try {
      expect(no403Detected).toBe(true);
    } catch {
      throw new Error(
        [
          'A 403 response was detected during one of the navigation tests.',
          'The configured User-Agent may be blocked by htreviews.org.',
          'Check PARSER_USER_AGENT env variable or update DEFAULT_USER_AGENT in browser.config.ts',
        ].join('\n'),
      );
    }
  }, 5_000);
});
