import {
  chromium,
  type Browser,
  type BrowserContext,
  type LaunchOptions,
} from 'playwright';

/**
 * Update when Playwright/Chrome version changes.
 * See: https://playwright.dev/docs/browsers#chromium
 */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const USER_AGENT =
  process.env.PARSER_USER_AGENT ?? DEFAULT_USER_AGENT;

const VIEWPORT = { width: 1920, height: 1080 } as const;

const LOCALE = 'ru-RU';

const EXTRA_HTTP_HEADERS: Record<string, string> = {
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
};

interface BrowserLaunchConfig {
  launchOptions: LaunchOptions;
  createContext(browser: Browser): Promise<BrowserContext>;
}

const BROWSER_CONFIG: BrowserLaunchConfig = {
  launchOptions: {
    headless: true,
  },

  createContext(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({
      userAgent: USER_AGENT,
      viewport: VIEWPORT,
      locale: LOCALE,
      extraHTTPHeaders: EXTRA_HTTP_HEADERS,
    });
  },
};

async function createBrowser(): Promise<Browser> {
  return chromium.launch(BROWSER_CONFIG.launchOptions);
}

function createContext(browser: Browser): Promise<BrowserContext> {
  return BROWSER_CONFIG.createContext(browser);
}

export {
  BROWSER_CONFIG,
  createBrowser,
  createContext,
  DEFAULT_USER_AGENT,
  USER_AGENT,
  VIEWPORT,
  LOCALE,
  EXTRA_HTTP_HEADERS,
};
export type { BrowserLaunchConfig };
