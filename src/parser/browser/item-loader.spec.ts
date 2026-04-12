import type { Page } from 'playwright';

// ---- Mocks ----

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// ---- Helpers ----

function mockApiResponse(status: number, body: unknown) {
  return {
    status: () => status,
    json: () => Promise.resolve(body),
    ok: () => status >= 200 && status < 300,
  };
}

function createMockPage() {
  const mockEvaluate = jest.fn();
  const mockWaitForFunction = jest.fn();
  const mockWaitForTimeout = jest.fn();
  const mockPost = jest.fn();
  // page.$(selector) → Promise<ElementHandle | null>
  // Always return null so extractLineId falls through to page.evaluate()
  const mock$ = jest.fn().mockResolvedValue(null);

  const mockPage = {
    evaluate: mockEvaluate,
    waitForFunction: mockWaitForFunction,
    waitForTimeout: mockWaitForTimeout,
    $: mock$,
    request: { post: mockPost },
  } as unknown as Page;

  return {
    mockPage,
    mockEvaluate,
    mockWaitForFunction,
    mockWaitForTimeout,
    mockPost,
    mock$,
  };
}

// Import after mock setup
import { loadAllItems } from './item-loader';
import type { ItemLoaderOptions } from './item-loader';

// ---- Fixtures ----

const defaultOptions: ItemLoaderOptions = {
  containerSelector: '.tobacco_list_items',
  itemSelector: '.tobacco_list_item',
  baseUrl: 'https://htreviews.org',
  maxScrollAttempts: 100,
  maxNoNewContent: 15,
  waitForNewItemMs: 2000,
};

/** Low-limit options to keep scroll-based tests fast */
const scrollOptions: ItemLoaderOptions = {
  ...defaultOptions,
  maxScrollAttempts: 2,
  maxNoNewContent: 2,
  waitForNewItemMs: 100,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadAllItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should return all URLs when count matches data-count', async () => {
    const { mockPage, mockEvaluate } = createMockPage();

    const urls = Array.from(
      { length: 29 },
      (_, i) => `https://htreviews.org/tobaccos/ds/xp/tobacco-${i + 1}`,
    );

    mockEvaluate
      .mockResolvedValueOnce({ count: 29, offset: 29, target: 5 }) // readContainerData
      .mockResolvedValueOnce(urls); // extractUrlsFromDom

    const result = await loadAllItems(mockPage, defaultOptions);

    expect(result.isComplete).toBe(true);
    expect(result.method).toBe('htmx-direct');
    expect(result.totalCount).toBe(29);
    expect(result.loadedCount).toBe(29);
    expect(result.urls).toEqual(urls);
  });

  it('should report incomplete when loaded less than data-count', async () => {
    const { mockPage, mockEvaluate, mockWaitForFunction } = createMockPage();

    const urls = Array.from(
      { length: 20 },
      (_, i) => `https://htreviews.org/tobaccos/ds/xp/tobacco-${i + 1}`,
    );

    // evaluate sequence:
    //  1. readContainerData
    //  2. extractUrlsFromDom
    //  3. extractLineId → null (no line ID)
    //  --- scroll iteration 1 ---
    //  4. scrollBy
    //  5. extractUrlsFromDom (no new content)
    //  --- scroll iteration 2 ---
    //  6. scrollBy
    //  7. extractUrlsFromDom (no new content)
    mockEvaluate
      .mockResolvedValueOnce({ count: 29, offset: 20, target: 5 })
      .mockResolvedValueOnce(urls)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(urls)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(urls);

    mockWaitForFunction
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'));

    const result = await loadAllItems(mockPage, scrollOptions);

    expect(result.isComplete).toBe(false);
    expect(result.method).toBe('scroll');
    expect(result.totalCount).toBe(29);
    expect(result.loadedCount).toBe(20);
  });

  it('should construct URLs from slug in JSON response', async () => {
    const { mockPage, mockEvaluate, mockPost } = createMockPage();

    const domUrls = Array.from(
      { length: 20 },
      (_, i) =>
        `https://htreviews.org/tobaccos/darkside/xperience/tobacco-${i + 1}`,
    );

    mockEvaluate
      .mockResolvedValueOnce({ count: 22, offset: 20, target: 5 }) // readContainerData
      .mockResolvedValueOnce(domUrls) // extractUrlsFromDom
      .mockResolvedValueOnce('391'); // extractLineId

    mockPost.mockResolvedValueOnce(
      mockApiResponse(200, [
        { slug: 'darkside/xperience/maraschino' },
        { slug: 'darkside/xperience/vanilla' },
      ]),
    );

    const result = await loadAllItems(mockPage, defaultOptions);

    expect(result.urls).toContain(
      'https://htreviews.org/tobaccos/darkside/xperience/maraschino',
    );
    expect(result.urls).toContain(
      'https://htreviews.org/tobaccos/darkside/xperience/vanilla',
    );
    expect(result.loadedCount).toBe(22);
    expect(result.isComplete).toBe(true);
  });

  it('should deduplicate URLs', async () => {
    const { mockPage, mockEvaluate, mockPost } = createMockPage();

    // DOM already contains maraschino — HTMX will return it again
    const domUrls = [
      'https://htreviews.org/tobaccos/darkside/xperience/maraschino',
    ];

    mockEvaluate
      .mockResolvedValueOnce({ count: 21, offset: 20, target: 5 })
      .mockResolvedValueOnce(domUrls)
      .mockResolvedValueOnce('391');

    mockPost.mockResolvedValueOnce(
      mockApiResponse(200, [
        { slug: 'darkside/xperience/maraschino' }, // duplicate
        { slug: 'darkside/xperience/new-flavor' },
      ]),
    );

    const result = await loadAllItems(mockPage, defaultOptions);

    const maraschinoCount = result.urls.filter((u) =>
      u.includes('maraschino'),
    ).length;
    expect(maraschinoCount).toBe(1);
    expect(result.urls).toContain(
      'https://htreviews.org/tobaccos/darkside/xperience/new-flavor',
    );
    expect(result.loadedCount).toBe(2);
  });

  it('should return totalCount from data-count attribute', async () => {
    const { mockPage, mockEvaluate } = createMockPage();

    mockEvaluate
      .mockResolvedValueOnce({ count: 42, offset: 42, target: 5 })
      .mockResolvedValueOnce([]);

    const result = await loadAllItems(mockPage, defaultOptions);

    expect(result.totalCount).toBe(42);
  });

  it('should extract line ID from page and make HTMX requests', async () => {
    const { mockPage, mockEvaluate, mockPost } = createMockPage();

    mockEvaluate
      .mockResolvedValueOnce({ count: 21, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('391');

    mockPost.mockResolvedValueOnce(
      mockApiResponse(200, [{ slug: 'ds/xp/tobacco-21' }]),
    );

    const result = await loadAllItems(mockPage, defaultOptions);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(result.method).toBe('htmx-direct');
    expect(result.urls).toContain(
      'https://htreviews.org/tobaccos/ds/xp/tobacco-21',
    );
  });

  it('should send correct POST body to /postData', async () => {
    const { mockPage, mockEvaluate, mockPost } = createMockPage();

    mockEvaluate
      .mockResolvedValueOnce({ count: 25, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('391');

    mockPost.mockResolvedValueOnce(mockApiResponse(200, []));

    await loadAllItems(mockPage, defaultOptions);

    expect(mockPost).toHaveBeenCalledWith('https://htreviews.org/postData', {
      data: {
        action: 'objectByLine',
        data: {
          id: '391',
          limit: 5,
          offset: 20,
          sort: { s: 'rating', d: 'desc' },
        },
      },
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('should stop when response is empty array', async () => {
    const { mockPage, mockEvaluate, mockPost } = createMockPage();

    mockEvaluate
      .mockResolvedValueOnce({ count: 25, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('391');

    mockPost.mockResolvedValueOnce(mockApiResponse(200, []));

    const result = await loadAllItems(mockPage, defaultOptions);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(result.method).toBe('htmx-direct');
    expect(result.loadedCount).toBe(0);
  });

  it('should retry HTMX batch on 429', async () => {
    jest.useFakeTimers();

    const { mockPage, mockEvaluate, mockPost } = createMockPage();

    mockEvaluate
      .mockResolvedValueOnce({ count: 21, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('391');

    mockPost
      .mockResolvedValueOnce(mockApiResponse(429, {}))
      .mockResolvedValueOnce(
        mockApiResponse(200, [{ slug: 'ds/xp/tobacco-21' }]),
      );

    const promise = loadAllItems(mockPage, defaultOptions);
    // HTMX_RETRY_DELAY_MS = 3000; first retry uses 3000 * 1 = 3000 ms
    await jest.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(result.method).toBe('htmx-direct');
    expect(result.urls).toContain(
      'https://htreviews.org/tobaccos/ds/xp/tobacco-21',
    );
  });

  it('should fall back to scroll when HTMX returns non-retryable error', async () => {
    const { mockPage, mockEvaluate, mockPost, mockWaitForFunction } =
      createMockPage();

    // evaluate sequence: readContainerData, extractUrlsFromDom, extractLineId,
    // then scroll iteration 1 (scrollBy, extractUrlsFromDom),
    // then scroll iteration 2 (scrollBy, extractUrlsFromDom)
    mockEvaluate
      .mockResolvedValueOnce({ count: 29, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce('391')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    mockPost.mockResolvedValueOnce(mockApiResponse(403, {}));
    mockWaitForFunction
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'));

    const result = await loadAllItems(mockPage, scrollOptions);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(result.method).toBe('scroll');
  });

  it('should fall back to scroll when line ID not found', async () => {
    const { mockPage, mockEvaluate, mockWaitForFunction } = createMockPage();

    mockEvaluate
      .mockResolvedValueOnce({ count: 29, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null) // extractLineId → null
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    mockWaitForFunction
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'));

    const result = await loadAllItems(mockPage, scrollOptions);

    expect(result.method).toBe('scroll');
  });

  it('should stop at maxScrollAttempts even if incomplete', async () => {
    const { mockPage, mockEvaluate, mockWaitForFunction } = createMockPage();

    // maxNoNewContent is high so the only stop condition is maxScrollAttempts
    const options: ItemLoaderOptions = {
      ...defaultOptions,
      maxScrollAttempts: 2,
      maxNoNewContent: 100,
      waitForNewItemMs: 100,
    };

    // evaluate sequence:
    //  1. readContainerData  (count=29, offset=20 → more items needed)
    //  2. extractUrlsFromDom (initial URLs)
    //  3. extractLineId      → null (trigger scroll fallback)
    //  --- scroll iteration 1 ---
    //  4. scrollBy
    //  5. extractUrlsFromDom (new content added)
    //  --- scroll iteration 2 ---
    //  6. scrollBy
    //  7. extractUrlsFromDom (new content added)
    mockEvaluate
      .mockResolvedValueOnce({ count: 29, offset: 20, target: 5 })
      .mockResolvedValueOnce(['https://htreviews.org/tobaccos/ds/xp/t1'])
      .mockResolvedValueOnce(null) // extractLineId → null
      .mockResolvedValueOnce(undefined) // scrollBy
      .mockResolvedValueOnce([
        'https://htreviews.org/tobaccos/ds/xp/t1',
        'https://htreviews.org/tobaccos/ds/xp/t2',
      ])
      .mockResolvedValueOnce(undefined) // scrollBy
      .mockResolvedValueOnce([
        'https://htreviews.org/tobaccos/ds/xp/t1',
        'https://htreviews.org/tobaccos/ds/xp/t2',
        'https://htreviews.org/tobaccos/ds/xp/t3',
      ]);

    // waitForFunction resolves (new items appear) so maxNoNewContent never triggers
    mockWaitForFunction
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const result = await loadAllItems(mockPage, options);

    expect(result.isComplete).toBe(false);
    expect(result.method).toBe('scroll');
    expect(result.totalCount).toBe(29);
    expect(result.loadedCount).toBe(3);
    // scrollBy called exactly maxScrollAttempts times
    expect(mockEvaluate).toHaveBeenCalledTimes(7);
  });

  it('should use waitForFunction instead of waitForTimeout in scroll fallback', async () => {
    const { mockPage, mockEvaluate, mockWaitForFunction, mockWaitForTimeout } =
      createMockPage();

    const options: ItemLoaderOptions = {
      ...scrollOptions,
      waitForNewItemMs: 500,
    };

    mockEvaluate
      .mockResolvedValueOnce({ count: 29, offset: 20, target: 5 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    mockWaitForFunction
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'));

    await loadAllItems(mockPage, options);

    expect(mockWaitForFunction).toHaveBeenCalledTimes(2);
    expect(mockWaitForFunction).toHaveBeenCalledWith(
      expect.any(Function),
      { selector: '.tobacco_list_item', expected: 1 },
      { timeout: 500 },
    );
    expect(mockWaitForTimeout).not.toHaveBeenCalled();
  });
});
