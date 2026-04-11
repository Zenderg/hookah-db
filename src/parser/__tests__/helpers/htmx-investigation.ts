/**
 * Temporary investigation script — NOT a test, NOT production code.
 *
 * Run manually:
 *   npx ts-node src/parser/__tests__/helpers/htmx-investigation.ts
 *
 * Purpose: intercept HTMX lazy-loading requests from htreviews.org to
 * determine endpoint URLs, headers, response format, and whether direct
 * reproduction via Playwright `page.request` API is viable.
 */

import { chromium, type Request, type Response, type Page } from 'playwright';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InterceptedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  resourceType: string;
}

interface InterceptedResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface CapturedCall {
  request: InterceptedRequest;
  response: InterceptedResponse;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_URL = 'https://htreviews.org/tobaccos/darkside/xperience';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CONTAINER_SELECTOR = '.tobacco_list_items';

const SKIP_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.ico',
  '.webp',
]);

const SKIP_DOMAINS = new Set([
  'www.google-analytics.com',
  'analytics.google.com',
  'connect.facebook.net',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'mc.yandex.ru',
]);

const SCROLL_PAUSE_MS = 2500;
const MAX_SCROLLS = 20;
const NO_NEW_REQUEST_THRESHOLD = 3;
const OVERALL_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isStaticAsset(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return Array.from(SKIP_EXTENSIONS).some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function isAnalyticsOrFont(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return Array.from(SKIP_DOMAINS).some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

function isRelevantRequest(req: Request): boolean {
  if (req.resourceType() !== 'xhr' && req.resourceType() !== 'fetch') {
    return false;
  }
  const url = req.url();
  if (isStaticAsset(url) || isAnalyticsOrFont(url)) return false;
  return true;
}

function hasPaginationParams(url: string): boolean {
  try {
    const params = new URL(url).searchParams;
    for (const key of params.keys()) {
      if (
        ['offset', 'limit', 'page', 'start', 'count', 'skip', 'take'].some(
          (p) => key.toLowerCase().includes(p),
        )
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `… (${str.length} chars total)`;
}

function filterHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const keep = new Set([
    'content-type',
    'hx-request',
    'hx-current-url',
    'hx-target',
    'hx-trigger',
    'x-requested-with',
    'accept',
    'authorization',
    'cookie',
  ]);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (keep.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== HTMX Investigation Script ===\n');
  console.log(`Target: ${TARGET_URL}\n`);

  const browser = await chromium.launch({
    headless: false,
  });

  const timeoutHandle = setTimeout(() => {
    console.error('\n[TIMEOUT] Overall timeout reached, aborting.');
    void browser.close().then(() => process.exit(1));
  }, OVERALL_TIMEOUT_MS);

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 },
      locale: 'ru-RU',
    });

    const page = await context.newPage();

    // -- Collect intercepted requests ----------------------------------------
    const captured: CapturedCall[] = [];
    const seenUrls = new Set<string>();

    page.on('request', (req: Request) => {
      if (!isRelevantRequest(req)) return;
      const url = req.url();
      if (seenUrls.has(url)) return;
      seenUrls.add(url);
      console.log(`[REQ] ${req.method()} ${truncate(url, 120)}`);
    });

    page.on('response', async (res: Response) => {
      if (!isRelevantRequest(res.request())) return;
      try {
        const body = await res.text();
        captured.push({
          request: {
            url: res.request().url(),
            method: res.request().method(),
            headers: filterHeaders(res.request().headers()),
            body: res.request().postData() ?? undefined,
            resourceType: res.request().resourceType(),
          },
          response: {
            status: res.status(),
            headers: filterHeaders(res.headers()),
            body,
          },
        });
      } catch {
        // ignore response body read errors
      }
    });

    // -- Navigate ------------------------------------------------------------
    console.log('\n--- Navigating to target page ---\n');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // -- Read container attributes -------------------------------------------
    console.log('\n--- Container Attributes ---\n');
    const containerAttrs = await page
      .locator(CONTAINER_SELECTOR)
      .first()
      .evaluate((el) => ({
        dataCount: el.getAttribute('data-count'),
        dataOffset: el.getAttribute('data-offset'),
        dataTarget: el.getAttribute('data-target'),
        innerHTML_length: el.innerHTML.length,
      }))
      .catch(() => null);

    if (containerAttrs) {
      console.log(`  data-count:  ${containerAttrs.dataCount}`);
      console.log(`  data-offset: ${containerAttrs.dataOffset}`);
      console.log(`  data-target: ${containerAttrs.dataTarget}`);
      console.log(`  innerHTML length: ${containerAttrs.innerHTML_length}`);
    } else {
      console.log('  Container not found!');
    }

    // -- Scroll to trigger lazy loading -------------------------------------
    console.log('\n--- Scrolling to trigger HTMX lazy loading ---\n');

    let noNewRequestStreak = 0;
    let prevCapturedCount = 0;

    for (let i = 0; i < MAX_SCROLLS; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      console.log(`  Scroll ${i + 1}/${MAX_SCROLLS} …`);
      await page.waitForTimeout(SCROLL_PAUSE_MS);

      if (captured.length === prevCapturedCount) {
        noNewRequestStreak++;
        console.log(
          `    No new requests (${noNewRequestStreak}/${NO_NEW_REQUEST_THRESHOLD})`,
        );
      } else {
        noNewRequestStreak = 0;
        console.log(
          `    New requests captured: ${captured.length - prevCapturedCount}`,
        );
      }
      prevCapturedCount = captured.length;

      if (noNewRequestStreak >= NO_NEW_REQUEST_THRESHOLD) {
        console.log('  No new requests detected — stopping scroll loop.');
        break;
      }
    }

    // -- Filter & deduplicate HTMX endpoints --------------------------------
    console.log('\n--- Intercepted HTMX Requests ---\n');

    const htmxRequests = captured.filter((c) => {
      // Skip the auth check
      if (c.request.url.endsWith('/auth')) return false;
      // Match known HTMX patterns
      if (hasPaginationParams(c.request.url)) return true;
      if (c.request.url.includes('/tobaccos/')) return true;
      if (c.request.url.includes('ajax') || c.request.url.includes('load')) return true;
      if (c.request.url.includes('partial') || c.request.url.includes('htmx')) return true;
      if (c.request.headers['hx-request'] === 'true') return true;
      // Catch POST requests to data endpoints (e.g. /postData)
      if (
        c.request.method === 'POST' &&
        (c.request.url.includes('data') || c.request.url.includes('Data'))
      )
        return true;
      return false;
    });

    if (htmxRequests.length === 0) {
      console.log('  No HTMX-like requests detected.');
      console.log(`  Total relevant requests captured: ${captured.length}`);
      if (captured.length > 0) {
        console.log('\n  All captured requests:');
        for (const c of captured) {
          console.log(
            `    ${c.request.method} ${c.request.url} → ${c.response.status}`,
          );
        }
      }
    } else {
      for (let i = 0; i < htmxRequests.length; i++) {
        const c = htmxRequests[i];
        console.log(`  [${i + 1}] ${c.request.method} ${c.request.url}`);
        console.log(`      Status: ${c.response.status}`);
        console.log(`      Headers: ${JSON.stringify(c.request.headers)}`);
        if (c.request.body) {
          console.log(`      Body: ${truncate(c.request.body, 200)}`);
        }
        console.log(
          `      Response snippet: ${truncate(c.response.body, 300)}`,
        );
        console.log('');
      }
    }

    // -- Reproduce via page.request API -------------------------------------
    console.log('\n--- Reproduction via page.request API ---\n');

    const uniqueEndpoints = new Map<string, CapturedCall>();
    for (const c of htmxRequests) {
      const key = `${c.request.method}:${c.request.url}`;
      if (!uniqueEndpoints.has(key)) {
        uniqueEndpoints.set(key, c);
      }
    }

    if (uniqueEndpoints.size === 0) {
      console.log('  No endpoints to reproduce.');
    } else {
      for (const [key, original] of uniqueEndpoints) {
        console.log(`  Reproducing: ${key}`);
        try {
          let response;
          if (original.request.method === 'POST') {
            response = await page.request.post(original.request.url, {
              headers: original.request.headers,
              data: original.request.body,
            });
          } else {
            response = await page.request.get(original.request.url, {
              headers: original.request.headers,
            });
          }

          const status = response.status();
          const body = await response.text();
          const success =
            status === 200 &&
            body.length > 0 &&
            (body.includes('<') || body.includes('{')); // HTML or JSON

          console.log(`    Status: ${status}`);
          console.log(`    Body length: ${body.length}`);
          console.log(
            `    Snippet: ${truncate(body, 300)}`,
          );
          console.log(`    Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        } catch (err) {
          console.log(
            `    Result: ❌ ERROR — ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        console.log('');
      }
    }

    // -- Final recommendation ------------------------------------------------
    console.log('\n=== Recommendation ===\n');

    if (htmxRequests.length === 0) {
      console.log(
        'No HTMX lazy-loading requests were detected during scrolling.',
      );
      console.log(
        'The page may load all items in the initial HTML, or lazy loading',
      );
      console.log(
        'may use a mechanism not captured by XHR/Fetch interception.',
      );
      console.log('Fallback: scroll + parse DOM after each scroll.');
    } else {
      const reproducible = Array.from(uniqueEndpoints.entries()).filter(
        async ([key]) => {
          try {
            const original = uniqueEndpoints.get(key)!;
            let response;
            if (original.request.method === 'POST') {
              response = await page.request.post(original.request.url, {
                headers: original.request.headers,
                data: original.request.body,
              });
            } else {
              response = await page.request.get(original.request.url, {
                headers: original.request.headers,
              });
            }
            return response.ok();
          } catch {
            return false;
          }
        },
      );

      if (reproducible.length > 0) {
        console.log(
          `Direct requests viable: ${reproducible.length}/${uniqueEndpoints.size} endpoints can be reproduced.`,
        );
        console.log(
          'Recommendation: Use page.request API with proper headers to fetch',
        );
        console.log('all pages without scrolling.');
      } else {
        console.log(
          'Direct requests NOT viable: none of the endpoints could be reproduced.',
        );
        console.log('Fallback to scroll + parse DOM after each scroll.');
      }
    }

    // -- Cleanup after scrolling (check final state) ------------------------
    console.log('\n--- Final container state ---\n');
    const finalAttrs = await page
      .locator(CONTAINER_SELECTOR)
      .first()
      .evaluate((el) => ({
        dataOffset: el.getAttribute('data-offset'),
        childCount: el.children.length,
      }))
      .catch(() => null);

    if (finalAttrs) {
      console.log(`  data-offset (final): ${finalAttrs.dataOffset}`);
      console.log(`  child elements: ${finalAttrs.childCount}`);
    }

    console.log(
      `\n  Total captured relevant requests: ${captured.length}`,
    );
    console.log(
      `  HTMX-like requests: ${htmxRequests.length}`,
    );
  } catch (err) {
    console.error('\n[ERROR]', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
  } finally {
    clearTimeout(timeoutHandle);
    console.log('\n--- Closing browser ---\n');
    await browser.close();
    console.log('Done.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
