import { type Browser, type BrowserContext, type Page } from 'playwright';

import {
  startTestServer,
  type TestServer,
  type TestServerConfig,
} from './__tests__/helpers/test-server';
import { createBrowser } from './browser/browser.config';
import {
  EXTRA_HTTP_HEADERS,
  LOCALE,
  USER_AGENT,
  VIEWPORT,
} from './browser/browser.config';
import { loadAllItems, type ItemLoaderOptions } from './browser/item-loader';
import { navigateWithCheck } from './browser/http-checker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOADER_OPTIONS: Omit<ItemLoaderOptions, 'baseUrl'> = {
  containerSelector: '.tobacco_list_items',
  itemSelector: '.tobacco_list_item',
  maxScrollAttempts: 100,
  maxNoNewContent: 15,
  waitForNewItemMs: 2000,
};

function loaderOpts(baseUrl: string): ItemLoaderOptions {
  return { ...LOADER_OPTIONS, baseUrl };
}

/**
 * Create a browser context with `baseURL` set so that relative API requests
 * (e.g. `page.request.post('/postData')`) resolve against the test server.
 */
async function createTestContext(
  browser: Browser,
  baseURL: string,
): Promise<BrowserContext> {
  return browser.newContext({
    userAgent: USER_AGENT,
    viewport: VIEWPORT,
    locale: LOCALE,
    extraHTTPHeaders: EXTRA_HTTP_HEADERS,
    baseURL,
  });
}

interface TestSetup {
  server: TestServer;
  context: BrowserContext;
  page: Page;
  cleanup: () => Promise<void>;
}

/**
 * Spin up a test server + browser context + page with the correct baseURL.
 * Each test that needs HTMX support must use its own setup so that
 * `page.request.post('/postData')` targets the right server.
 */
async function setup(
  browser: Browser,
  config?: TestServerConfig,
): Promise<TestSetup> {
  const server = await startTestServer(config);
  const context = await createTestContext(browser, server.url);
  const page = await context.newPage();

  const cleanup = async () => {
    await page.close();
    await context.close();
    await server.close();
  };

  return { server, context, page, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Parser Integration Tests', () => {
  jest.setTimeout(30_000);

  let browser: Browser;

  beforeAll(async () => {
    browser = await createBrowser();
  });

  afterAll(async () => {
    await browser.close();
  });

  // -------------------------------------------------------------------------
  // 1. HTMX direct loading — all items fetched via POST /postData batches
  // -------------------------------------------------------------------------

  it('should load all tobaccos via HTMX on line page', async () => {
    const { server, page, cleanup } = await setup(browser);
    try {
      await page.goto(`${server.url}/tobaccos/darkside/xperience`);
      await page.waitForLoadState('domcontentloaded');

      const result = await loadAllItems(page, loaderOpts(server.url));

      expect(result.isComplete).toBe(true);
      expect(result.loadedCount).toBe(29);
      expect(result.method).toBe('htmx-direct');
      expect(result.urls).toHaveLength(29);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // 2. Incomplete loading — server stops returning batches early
  // -------------------------------------------------------------------------

  it('should detect incomplete loading', async () => {
    const { server, page, cleanup } = await setup(browser, {
      skipLastBatch: true,
    });
    try {
      await page.goto(`${server.url}/tobaccos/darkside/xperience`);
      await page.waitForLoadState('domcontentloaded');

      const result = await loadAllItems(page, loaderOpts(server.url));

      expect(result.isComplete).toBe(false);
      expect(result.loadedCount).toBeLessThan(result.totalCount);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // 3. Pre-rendered page — data-offset equals data-count, no HTMX needed
  // -------------------------------------------------------------------------

  it('should work when all items pre-rendered', async () => {
    const { server, page, cleanup } = await setup(browser, {
      linePageFixture: 'complete',
    });
    try {
      await page.goto(`${server.url}/tobaccos/darkside/xperience`);
      await page.waitForLoadState('domcontentloaded');

      const result = await loadAllItems(page, loaderOpts(server.url));

      expect(result.isComplete).toBe(true);
      expect(result.method).toBe('htmx-direct');
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // 4. Tobacco detail page — full field extraction via page.evaluate()
  //    Mirrors the extraction logic from TobaccoParserStrategy.
  // -------------------------------------------------------------------------

  it('should parse tobacco detail page correctly', async () => {
    const { server, page, cleanup } = await setup(browser);
    try {
      await page.goto(`${server.url}/tobaccos/darkside/xperience/energy-drift`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1', { timeout: 5000 });

      const data = await page.evaluate(() => {
        // -- name --
        const name = document.querySelector('h1')?.textContent?.trim() || '';

        // -- description --
        const description =
          document.querySelector('.object_card_discr')?.textContent?.trim() ||
          '';

        // -- rating --
        let rating = 0;
        const ratingDiv = document.querySelector('div[data-rating]');
        if (ratingDiv) {
          const v = ratingDiv.getAttribute('data-rating');
          if (v) rating = parseFloat(v);
        }

        // -- ratings count --
        let ratingsCount = 0;
        const statsDiv = document.querySelector('div[data-stats]');
        if (statsDiv?.firstElementChild) {
          const t =
            statsDiv.firstElementChild
              .querySelector('span')
              ?.textContent?.trim() || '';
          ratingsCount = parseInt(t, 10);
        }

        // -- flavors --
        const flavors: string[] = [];
        for (const link of Array.from(
          document.querySelectorAll('a[href*="r=flavor"]'),
        )) {
          const n = link.textContent?.trim();
          if (n && !flavors.includes(n)) flavors.push(n);
        }

        // -- htreviewsId --
        let htreviewsId = '';
        const allEls = Array.from(document.querySelectorAll('*'));
        const label = allEls.find(
          (el) => el.textContent?.trim() === 'HtreviewsID',
        );
        if (label?.parentElement) {
          const val = Array.from(label.parentElement.children).find((c) =>
            /^htr\d+$/.test(c.textContent?.trim() || ''),
          );
          if (val) htreviewsId = val.textContent?.trim() || '';
        }

        return {
          name,
          description,
          rating,
          ratingsCount,
          flavors,
          htreviewsId,
        };
      });

      expect(data.name).toBeTruthy();
      expect(typeof data.rating).toBe('number');
      expect(typeof data.ratingsCount).toBe('number');
      expect(Array.isArray(data.flavors)).toBe(true);
      expect(data.htreviewsId).toMatch(/^htr\d+$/);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // 5. HTTP error detection — 403 is not retried (only 429 is)
  // -------------------------------------------------------------------------

  it('should detect HTTP error and skip page', async () => {
    const { server, page, cleanup } = await setup(browser, {
      forceStatus: 403,
    });
    try {
      const result = await navigateWithCheck(
        page,
        `${server.url}/tobaccos/darkside/xperience`,
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // 6. Brand page — line links are discoverable
  // -------------------------------------------------------------------------

  it('should find all lines on brand page', async () => {
    const { server, page, cleanup } = await setup(browser);
    try {
      await page.goto(`${server.url}/tobaccos/`);
      await page.waitForLoadState('domcontentloaded');

      const lineLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/tobaccos/"]'))
          .map((a) => a.getAttribute('href') || '')
          .filter((href) => /\/tobaccos\/[^/]+\/[^/]+$/.test(href));
      });

      expect(lineLinks.length).toBeGreaterThanOrEqual(1);
      expect(lineLinks[0]).toMatch(/\/tobaccos\/[^/]+\/[^/]+$/);
    } finally {
      await cleanup();
    }
  });

  // -------------------------------------------------------------------------
  // 7. Warning logging — incomplete load triggers Logger.warn
  // -------------------------------------------------------------------------

  it('should log warning for incomplete loads', async () => {
    // NestJS ConsoleLogger.warn() writes to process.stdout (not console.warn),
    // so we spy on process.stdout.write to capture the output.
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation();

    const { server, page, cleanup } = await setup(browser, {
      skipLastBatch: true,
    });
    try {
      await page.goto(`${server.url}/tobaccos/darkside/xperience`);
      await page.waitForLoadState('domcontentloaded');

      await loadAllItems(page, loaderOpts(server.url));

      const allOutput = writeSpy.mock.calls
        .map((args) => String(args[0]))
        .join('\n');
      expect(allOutput).toContain('Loaded');
      expect(allOutput).toContain(' of ');
    } finally {
      writeSpy.mockRestore();
      await cleanup();
    }
  });
});
