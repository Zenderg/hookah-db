import type { Browser, BrowserContext, Page } from 'playwright';

// ---- Mock Logger ----

const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockDebug = jest.fn();

const mockLoggerInstance = {
  log: mockLog,
  warn: mockWarn,
  error: mockError,
  debug: mockDebug,
};

jest.mock('@nestjs/common', () => ({
  Injectable: () => (cls: unknown) => cls,
  Logger: jest.fn().mockImplementation(() => mockLoggerInstance),
}));

// ---- Mock utility modules ----

jest.mock('../browser/browser.config', () => ({
  createBrowser: jest.fn(),
  createContext: jest.fn(),
}));

jest.mock('../browser/http-checker', () => ({
  navigateWithCheck: jest.fn(),
}));

// ---- Mock Playwright objects ----

const mockBrowser = {
  close: jest.fn(),
} as unknown as Browser;

const mockNewPage = jest.fn();

const mockContext = {
  close: jest.fn(),
  newPage: mockNewPage,
} as unknown as BrowserContext;

const mockEvaluate = jest.fn();
const mockWaitForLoadState = jest.fn();
const mockWaitForSelector = jest.fn();

const mockPage = {
  close: jest.fn(),
  waitForLoadState: mockWaitForLoadState,
  waitForSelector: mockWaitForSelector,
  evaluate: mockEvaluate,
} as unknown as Page;

// ---- Imports after mocks ----

import { LineParserStrategy } from './line-parser.strategy';
import { createBrowser, createContext } from '../browser/browser.config';
import { navigateWithCheck } from '../browser/http-checker';

const mockedCreateBrowser = createBrowser as jest.Mock;
const mockedCreateContext = createContext as jest.Mock;
const mockedNavigateWithCheck = navigateWithCheck as jest.Mock;

// ---- Fixtures ----

const brandUrl = '/tobaccos/darkside';
const brandId = 'brand-1';

const mockLineFromBrandPage = {
  name: 'Xperience',
  slug: 'xperience',
  brandId: '',
  description: null,
  imageUrl: null,
  strengthOfficial: null,
  strengthByRatings: null,
  status: null,
  rating: 4.5,
  ratingsCount: 0,
};

// ---- Tests ----

describe('LineParserStrategy', () => {
  let strategy: LineParserStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockedCreateBrowser.mockResolvedValue(mockBrowser);
    mockedCreateContext.mockResolvedValue(mockContext);
    mockNewPage.mockResolvedValue(mockPage);

    strategy = new LineParserStrategy();
    await strategy.initialize();
  });

  afterEach(async () => {
    await strategy.close();
  });

  it('should use shared browser config in initialize', () => {
    expect(mockedCreateBrowser).toHaveBeenCalledTimes(1);
    expect(mockedCreateContext).toHaveBeenCalledTimes(1);
    expect(mockedCreateContext).toHaveBeenCalledWith(mockBrowser);
    expect(mockNewPage).toHaveBeenCalledTimes(1);
  });

  it('should handle HTTP error on brand page navigation', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: false,
      status: 403,
      url: `https://htreviews.org${brandUrl}`,
    });

    const result = await strategy.parseLines([{ url: brandUrl, brandId }]);

    expect(result).toEqual([]);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });

  it('should use domcontentloaded instead of networkidle', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: true,
      status: 200,
      url: `https://htreviews.org${brandUrl}`,
    });

    mockEvaluate.mockResolvedValue({ items: [], errors: [] });

    await strategy.parseLines([{ url: brandUrl, brandId }]);

    expect(mockWaitForLoadState).toHaveBeenCalledWith('domcontentloaded', {
      timeout: 10000,
    });
    expect(mockWaitForSelector).toHaveBeenCalledWith('h1', {
      timeout: 10000,
      state: 'attached',
    });
  });

  it('should handle HTTP error on detail page navigation', async () => {
    // Brand page navigation succeeds
    mockedNavigateWithCheck
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: `https://htreviews.org${brandUrl}`,
      })
      // Detail page navigation fails
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        url: 'https://htreviews.org/tobaccos/darkside/xperience',
      });

    // Brand page returns one line
    mockEvaluate.mockResolvedValueOnce({
      items: [mockLineFromBrandPage],
      errors: [],
    });

    const result = await strategy.parseLines([{ url: brandUrl, brandId }]);

    // Line should still be parsed but with default additional data
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Xperience');
    expect(result[0].brandId).toBe(brandId);
    expect(result[0].ratingsCount).toBe(0);
    expect(result[0].imageUrl).toBeNull();
    // Error should be logged for the detail page failure
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });
});
