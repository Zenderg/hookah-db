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

// Mock playwright — prevent actual browser launch
jest.mock('playwright', () => ({
  chromium: { launch: jest.fn() },
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
const mockWaitForTimeout = jest.fn();
const mockDollarEval = jest.fn();

const mockPage = {
  close: jest.fn(),
  waitForLoadState: mockWaitForLoadState,
  waitForSelector: mockWaitForSelector,
  evaluate: mockEvaluate,
  waitForTimeout: mockWaitForTimeout,
  $$eval: mockDollarEval,
} as unknown as Page;

// ---- Imports after mocks ----

import { BrandParserStrategy } from './brand-parser.strategy';
import { createBrowser, createContext } from '../browser/browser.config';
import { navigateWithCheck } from '../browser/http-checker';

const mockedCreateBrowser = createBrowser as jest.Mock;
const mockedCreateContext = createContext as jest.Mock;
const mockedNavigateWithCheck = navigateWithCheck as jest.Mock;

function createBrandListElement(rating: string, ratingsCount: string) {
  const rankDiv = { textContent: '1' };
  const ratingDiv = { textContent: rating };
  const ratingsCountDiv = { textContent: ratingsCount };
  const nameElement = { textContent: 'Example' };
  const countryElement = { textContent: 'Testland' };
  const imageElement = { getAttribute: () => '/example.png' };
  const linkElement = { getAttribute: () => '/tobaccos/example' };

  return {
    querySelector: (selector: string) => {
      if (selector === '.tobacco_list_item_slug span:first-child') {
        return nameElement;
      }
      if (selector === '.tobacco_list_item_slug .country') {
        return countryElement;
      }
      if (selector === '.tobacco_list_item_image img') return imageElement;
      if (selector === '.tobacco_list_item_slug') return linkElement;
      return null;
    },
    querySelectorAll: (selector: string) =>
      selector === ':scope > div > div'
        ? [rankDiv, ratingDiv, ratingsCountDiv]
        : [],
  };
}

// ---- Tests ----

describe('BrandParserStrategy', () => {
  let strategy: BrandParserStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockedCreateBrowser.mockResolvedValue(mockBrowser);
    mockedCreateContext.mockResolvedValue(mockContext);
    mockNewPage.mockResolvedValue(mockPage);

    strategy = new BrandParserStrategy();
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

  it('should return empty array when parseBrandList navigation fails', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: false,
      status: 403,
      url: 'https://htreviews.org/tobaccos/brands?r=position&s=rating&d=desc',
    });

    const result = await strategy.parseBrands();

    expect(result).toEqual([]);
    expect(mockedNavigateWithCheck).toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });

  it('should fail when parseBrandByUrl navigation fails', async () => {
    const url = '/tobaccos/dogma';

    mockedNavigateWithCheck.mockResolvedValue({
      ok: false,
      status: 403,
      url: 'https://htreviews.org/tobaccos/dogma',
    });

    await expect(strategy.parseBrandByUrl(url)).rejects.toThrow(
      'Failed to navigate to brand page',
    );
    expect(mockedNavigateWithCheck).toHaveBeenCalledWith(
      mockPage,
      'https://htreviews.org/tobaccos/dogma',
    );
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });

  it('skips brands whose detail page fails while retaining successful details', async () => {
    const firstBrand = {
      name: 'First Brand',
      slug: 'first-brand',
      country: 'Testland',
      rating: 4.2,
      ratingsCount: 20,
      detailUrl: '/tobaccos/first-brand',
      description: 'List description',
      logoUrl: '/list-logo.png',
      status: 'Не указано',
    };
    const secondBrand = {
      ...firstBrand,
      name: 'Second Brand',
      slug: 'second-brand',
      detailUrl: '/tobaccos/second-brand',
    };
    mockedNavigateWithCheck
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    mockDollarEval
      .mockResolvedValueOnce([firstBrand, secondBrand])
      .mockResolvedValue([]);
    mockEvaluate.mockResolvedValue({
      logoUrl: '/detail-logo.png',
      description: 'Detail description',
      status: 'Выпускается',
    });

    const result = await strategy.parseBrands(2);

    expect(result).toEqual([
      expect.objectContaining({
        name: 'Second Brand',
        logoUrl: '/detail-logo.png',
        description: 'Detail description',
        status: 'Выпускается',
      }),
    ]);
  });

  it('keeps a brand when its detail page succeeds but optional fields are empty', async () => {
    mockedNavigateWithCheck.mockResolvedValue({ ok: true, status: 200 });
    mockDollarEval
      .mockResolvedValueOnce([
        {
          name: 'Sparse Brand',
          slug: 'sparse-brand',
          country: 'Testland',
          rating: 0,
          ratingsCount: 0,
          detailUrl: '/tobaccos/sparse-brand',
          description: '',
          logoUrl: '',
          status: 'Не указано',
        },
      ])
      .mockResolvedValue([]);
    mockEvaluate.mockResolvedValue({
      logoUrl: '',
      description: '',
      status: 'Не указано',
    });

    const result = await strategy.parseBrands(1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'Sparse Brand', logoUrl: '' });
  });

  it('skips a brand when detail extraction throws', async () => {
    mockDollarEval.mockResolvedValue([
      {
        name: 'Broken Detail Brand',
        slug: 'broken-detail-brand',
        country: 'Testland',
        rating: 4,
        ratingsCount: 10,
        detailUrl: '/tobaccos/broken-detail-brand',
        description: '',
        logoUrl: '',
        status: 'Не указано',
      },
    ]);
    strategy.safeNavigate = (url) => {
      if (url.includes('/tobaccos/broken-detail-brand')) {
        mockEvaluate.mockRejectedValueOnce(
          new Error('detail DOM extraction failed'),
        );
      }
      return Promise.resolve(true);
    };

    await expect(strategy.parseBrands(1)).resolves.toEqual([]);
  });

  it('fails when brand basic data loads but the detail navigation fails', async () => {
    const url = '/tobaccos/dogma';
    mockedNavigateWithCheck
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    mockEvaluate.mockResolvedValue({
      name: 'Dogma',
      slug: 'dogma',
      country: 'Testland',
      rating: 4.5,
      ratingsCount: 10,
      status: 'Выпускается',
    });

    await expect(strategy.parseBrandByUrl(url)).rejects.toThrow(
      'Failed to navigate to brand detail page',
    );
  });

  it('should use domcontentloaded and waitForSelector after successful navigation', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://htreviews.org/tobaccos/brands',
    });

    mockDollarEval.mockResolvedValue([]);

    await strategy.parseBrands();

    expect(mockWaitForLoadState).toHaveBeenCalledWith('domcontentloaded', {
      timeout: 10000,
    });
    expect(mockWaitForSelector).toHaveBeenCalledWith('h1', {
      timeout: 10000,
      state: 'attached',
    });
  });

  it.each([
    { rating: '5', ratingsCount: '42' },
    { rating: '4.5', ratingsCount: '42' },
    { rating: '5', ratingsCount: '5' },
    { rating: '3', ratingsCount: '1' },
  ])(
    'extracts rating $rating and independent count $ratingsCount',
    async ({ rating, ratingsCount }) => {
      mockedNavigateWithCheck.mockResolvedValue({ ok: true, status: 200 });
      mockDollarEval.mockImplementation(
        (_selector, extract: (elements: Element[]) => unknown[]) =>
          extract([createBrandListElement(rating, ratingsCount) as Element]),
      );

      const result = await strategy['parseBrandList']('/fixture');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rating: Number(rating),
        ratingsCount: Number(ratingsCount),
      });
    },
  );
});
