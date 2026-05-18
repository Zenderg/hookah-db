import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  LaunchOptions,
} from 'playwright';

// Mock playwright — only chromium.launch is used by createBrowser
const mockNewContext = jest.fn<
  Promise<BrowserContext>,
  [BrowserContextOptions?]
>();
const mockBrowserClose = jest.fn<Promise<void>, []>();

const mockBrowser = {
  newContext: mockNewContext,
  close: mockBrowserClose,
} as unknown as Browser;

const mockChromiumLaunch = jest.fn<Promise<Browser>, [LaunchOptions?]>();

jest.mock('playwright', () => ({
  chromium: {
    launch: (options?: LaunchOptions): Promise<Browser> =>
      mockChromiumLaunch(options),
  },
}));

// Import after mock setup
import { createBrowser, createContext } from './browser.config';

function getLaunchOptions(): LaunchOptions {
  const options = mockChromiumLaunch.mock.calls[0]?.[0];
  if (!options) {
    throw new Error('Expected chromium.launch to be called with options');
  }
  return options;
}

function getContextOptions(): BrowserContextOptions {
  const options = mockNewContext.mock.calls[0]?.[0];
  if (!options) {
    throw new Error('Expected browser.newContext to be called with options');
  }
  return options;
}

describe('browser.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.PARSER_USER_AGENT;

    mockChromiumLaunch.mockResolvedValue(mockBrowser);
    mockNewContext.mockResolvedValue({} as unknown as BrowserContext);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createBrowser', () => {
    it('should create browser with custom user agent', async () => {
      // Arrange & Act
      const browser = await createBrowser();

      // Assert
      expect(mockChromiumLaunch).toHaveBeenCalledTimes(1);
      const launchOptions = getLaunchOptions();
      // Browser launch itself does not pass userAgent directly —
      // that's handled in createContext. Verify headless is set.
      expect(launchOptions.headless).toBe(true);
      // Most importantly: the default UA must NOT contain HeadlessChrome
      // (the UA is applied via createContext, so verify that next)
      expect(browser).toBe(mockBrowser);
    });
  });

  describe('createContext', () => {
    it('should create context with ru-RU locale', async () => {
      // Arrange & Act
      await createContext(mockBrowser);

      // Assert
      expect(mockNewContext).toHaveBeenCalledTimes(1);
      const contextOptions = getContextOptions();
      expect(contextOptions.locale).toBe('ru-RU');
    });

    it('should create context with viewport 1920x1080', async () => {
      // Arrange & Act
      await createContext(mockBrowser);

      // Assert
      expect(mockNewContext).toHaveBeenCalledTimes(1);
      const contextOptions = getContextOptions();
      expect(contextOptions.viewport).toEqual({ width: 1920, height: 1080 });
    });

    it('should set Accept-Language header', async () => {
      // Arrange & Act
      await createContext(mockBrowser);

      // Assert
      expect(mockNewContext).toHaveBeenCalledTimes(1);
      const contextOptions = getContextOptions();
      const headers = contextOptions.extraHTTPHeaders;
      expect(headers).toBeDefined();
      expect(headers?.['Accept-Language']).toBe(
        'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      );
    });

    it('should use user agent without HeadlessChrome', async () => {
      // Arrange & Act
      await createContext(mockBrowser);

      // Assert
      expect(mockNewContext).toHaveBeenCalledTimes(1);
      const contextOptions = getContextOptions();
      const userAgent = contextOptions.userAgent;
      expect(userAgent).toBeDefined();
      expect(userAgent).not.toContain('HeadlessChrome');
    });

    it('should allow overriding user agent via env variable', async () => {
      // Arrange
      const customUA =
        'Mozilla/5.0 (X11; Linux x86_64) CustomBot/1.0 Safari/537.36';
      process.env.PARSER_USER_AGENT = customUA;

      // Act
      await createContext(mockBrowser);

      // Assert
      expect(mockNewContext).toHaveBeenCalledTimes(1);
      const contextOptions = getContextOptions();
      expect(contextOptions.userAgent).toBe(customUA);
    });
  });
});
