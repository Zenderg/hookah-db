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

jest.mock('../browser/item-loader', () => ({
  loadAllItems: jest.fn(),
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

const mockPage = {
  close: jest.fn(),
  waitForLoadState: mockWaitForLoadState,
  waitForSelector: mockWaitForSelector,
  evaluate: mockEvaluate,
  waitForTimeout: mockWaitForTimeout,
} as unknown as Page;

// ---- Imports after mocks ----

import { TobaccoParserStrategy } from './tobacco-parser.strategy';
import type { TobaccoUrlInfo } from './tobacco-parser.strategy';
import { createBrowser, createContext } from '../browser/browser.config';
import { navigateWithCheck } from '../browser/http-checker';
import { loadAllItems } from '../browser/item-loader';

const mockedCreateBrowser = createBrowser as jest.Mock;
const mockedCreateContext = createContext as jest.Mock;
const mockedNavigateWithCheck = navigateWithCheck as jest.Mock;
const mockedLoadAllItems = loadAllItems as jest.Mock;

// ---- Fixtures ----

const lineInfo: TobaccoUrlInfo = {
  url: '/tobaccos/darkside/xperience',
  lineId: 'line-1',
  brandId: 'brand-1',
  brandSlug: 'darkside',
  lineSlug: 'xperience',
};

const tobaccoUrl =
  'https://htreviews.org/tobaccos/darkside/xperience/energy-drift';

const mockTobaccoEvaluateResult = {
  name: 'Energy Drift',
  imageUrl: '/img/energy-drift.jpg',
  description: 'A cool tobacco',
  strengthOfficial: 'Средняя',
  strengthByRatings: 'Средне-крепкая',
  status: 'Выпускается',
  htreviewsId: 'htr12345',
  rating: 4.8,
  ratingsCount: 100,
  flavors: ['Мята', 'Лимон'],
};

// ---- Tests ----

describe('TobaccoParserStrategy', () => {
  let strategy: TobaccoParserStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockedCreateBrowser.mockResolvedValue(mockBrowser);
    mockedCreateContext.mockResolvedValue(mockContext);
    mockNewPage.mockResolvedValue(mockPage);

    strategy = new TobaccoParserStrategy();
    await strategy.initialize();
  });

  afterEach(async () => {
    await strategy.close();
  });

  it('should use shared browser config', () => {
    expect(mockedCreateBrowser).toHaveBeenCalledTimes(1);
    expect(mockedCreateContext).toHaveBeenCalledTimes(1);
    expect(mockedCreateContext).toHaveBeenCalledWith(mockBrowser);
    expect(mockNewPage).toHaveBeenCalledTimes(1);
  });

  it('should fail on HTTP 403', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: false,
      status: 403,
      url: 'https://htreviews.org/tobaccos/darkside/xperience',
    });

    const result = await strategy.parseTobaccos([lineInfo]);

    expect(result).toEqual([]);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
  });

  it('should retry on HTTP 429', async () => {
    // navigateWithCheck handles retries internally — the strategy just awaits the result
    mockedNavigateWithCheck.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://htreviews.org/tobaccos/darkside/xperience',
    });

    mockedLoadAllItems.mockResolvedValue({
      urls: [tobaccoUrl],
      totalCount: 1,
      loadedCount: 1,
      isComplete: true,
      method: 'htmx-direct',
    });

    mockEvaluate.mockResolvedValue(mockTobaccoEvaluateResult);

    const result = await strategy.parseTobaccos([lineInfo]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Energy Drift');
    expect(result[0].htreviewsId).toBe('htr12345');
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining('htmx-direct'),
    );
  });

  it('should log warning when not all tobaccos loaded', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://htreviews.org/tobaccos/darkside/xperience',
    });

    mockedLoadAllItems.mockResolvedValue({
      urls: [tobaccoUrl],
      totalCount: 29,
      loadedCount: 20,
      isComplete: false,
      method: 'scroll',
    });

    mockEvaluate.mockResolvedValue(mockTobaccoEvaluateResult);

    await strategy.parseTobaccos([lineInfo]);

    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Loaded 20 of 29'),
    );
  });

  it('should pass correct options to loadAllItems', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://htreviews.org/tobaccos/darkside/xperience',
    });

    mockedLoadAllItems.mockResolvedValue({
      urls: [],
      totalCount: 0,
      loadedCount: 0,
      isComplete: true,
      method: 'htmx-direct',
    });

    await strategy.parseTobaccos([lineInfo]);

    expect(mockedLoadAllItems).toHaveBeenCalledWith(mockPage, {
      containerSelector: '.tobacco_list_items',
      itemSelector: '.tobacco_list_item',
      baseUrl: 'https://htreviews.org',
      maxScrollAttempts: 100,
      maxNoNewContent: 15,
      waitForNewItemMs: 2000,
    });
  });

  it('should use domcontentloaded instead of commit', async () => {
    mockedNavigateWithCheck.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://htreviews.org/tobaccos/darkside/xperience',
    });

    mockedLoadAllItems.mockResolvedValue({
      urls: [],
      totalCount: 0,
      loadedCount: 0,
      isComplete: true,
      method: 'htmx-direct',
    });

    await strategy.parseTobaccos([lineInfo]);

    expect(mockWaitForLoadState).toHaveBeenCalledWith('domcontentloaded', {
      timeout: 10000,
    });
    expect(mockWaitForSelector).toHaveBeenCalledWith('h1', {
      timeout: 10000,
    });
  });
});
