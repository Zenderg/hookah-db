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

  it('should return minimal data when parseBrandByUrl navigation fails', async () => {
    const url = '/tobaccos/dogma';

    mockedNavigateWithCheck.mockResolvedValue({
      ok: false,
      status: 403,
      url: 'https://htreviews.org/tobaccos/dogma',
    });

    const result = await strategy.parseBrandByUrl(url);

    expect(result).toEqual({
      name: '',
      slug: '',
      country: '',
      rating: 0,
      ratingsCount: 0,
      description: '',
      logoUrl: '',
      detailUrl: url,
      status: 'Не указано',
    });
    expect(mockedNavigateWithCheck).toHaveBeenCalledWith(
      mockPage,
      'https://htreviews.org/tobaccos/dogma',
    );
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
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
    });
  });
});
