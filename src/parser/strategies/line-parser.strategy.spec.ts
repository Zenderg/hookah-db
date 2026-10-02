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

    expect(result).toEqual({ items: [], errors: 1 });
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

    expect(result).toEqual({ items: [], errors: 1 });
    // Error should be logged for the detail page failure
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });

  it('keeps a line when detail navigation succeeds with optional fields missing', async () => {
    mockedNavigateWithCheck.mockResolvedValue({ ok: true, status: 200 });
    mockEvaluate
      .mockResolvedValueOnce({ items: [mockLineFromBrandPage], errors: [] })
      .mockResolvedValueOnce({
        imageUrl: null,
        ratingsCount: 0,
        strengthOfficial: null,
        strengthByRatings: null,
        status: null,
        description: null,
      });

    const result = await strategy.parseLines([{ url: brandUrl, brandId }]);

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          name: 'Xperience',
          brandId,
          imageUrl: null,
          ratingsCount: 0,
        }),
      ],
      errors: 0,
    });
  });

  it('continues to later lines after a detail failure', async () => {
    const laterLine = {
      ...mockLineFromBrandPage,
      name: 'Later line',
      slug: 'later-line',
    };
    mockedNavigateWithCheck
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    mockEvaluate
      .mockResolvedValueOnce({
        items: [mockLineFromBrandPage, laterLine],
        errors: [],
      })
      .mockResolvedValueOnce({
        imageUrl: '/later-line.png',
        ratingsCount: 12,
        strengthOfficial: 'Средняя',
        strengthByRatings: 'Средняя',
        status: 'Выпускается',
        description: null,
      });

    const result = await strategy.parseLines([{ url: brandUrl, brandId }]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      name: 'Later line',
      slug: 'later-line',
      imageUrl: '/later-line.png',
      ratingsCount: 12,
    });
    expect(result.errors).toBe(1);
  });

  it('skips a line when detail extraction throws', async () => {
    mockedNavigateWithCheck.mockResolvedValue({ ok: true, status: 200 });
    mockEvaluate
      .mockResolvedValueOnce({ items: [mockLineFromBrandPage], errors: [] })
      .mockRejectedValueOnce(new Error('detail DOM extraction failed'));

    await expect(
      strategy.parseLines([{ url: brandUrl, brandId }]),
    ).resolves.toEqual({ items: [], errors: 1 });
  });

  it('fails a single line parse when detail navigation fails', async () => {
    mockedNavigateWithCheck.mockResolvedValue({ ok: false, status: 403 });

    await expect(
      strategy.parseLineByUrl('/tobaccos/darkside/xperience', brandId),
    ).rejects.toThrow('Failed to navigate to line detail page');

    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('should preserve a missing image as null when normalizing a line', () => {
    const result = strategy.normalizeToEntity({
      ...mockLineFromBrandPage,
      brandId,
    });

    expect(result.imageUrl).toBeNull();
  });
});
