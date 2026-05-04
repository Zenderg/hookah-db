import type { Page, Response } from 'playwright';

// ---- Mocks ----

function createMockResponse(status: number, url: string): Response {
  return {
    status: () => status,
    url: () => url,
  } as unknown as Response;
}

const mockGoto = jest.fn<Promise<Response | null>, [string, unknown]>();

const mockPage = {
  goto: mockGoto,
} as unknown as Page;

jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  })),
}));

// Import after mock setup
import {
  checkResponse,
  navigateWithCheck,
  type NavigateOptions,
} from './http-checker';

/** Extended options for crash recovery & periodic rotation (TDD — fields don't exist yet). */
type RecoveryNavigateOptions = NavigateOptions & {
  recreateContext?: () => Promise<Page>;
  maxNavigationsBeforeRotation?: number;
  navigationCounter?: { value: number };
};

describe('http-checker', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('checkResponse', () => {
    it('should return ok for 200 response', () => {
      const response = createMockResponse(200, 'https://htreviews.org/');

      const result = checkResponse(response);

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should return not ok for 403 response', () => {
      const response = createMockResponse(403, 'https://htreviews.org/');

      const result = checkResponse(response);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
    });

    it('should return not ok for 404 response', () => {
      const response = createMockResponse(404, 'https://htreviews.org/missing');

      const result = checkResponse(response);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('navigateWithCheck', () => {
    const url = 'https://htreviews.org/tobaccos/darkside/xperience';

    it('should retry on 429 and succeed', async () => {
      mockGoto
        .mockResolvedValueOnce(createMockResponse(429, url))
        .mockResolvedValueOnce(createMockResponse(200, url));

      const result = await navigateWithCheck(mockPage, url, {
        baseDelayMs: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(mockGoto).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries on persistent 429', async () => {
      mockGoto.mockResolvedValue(createMockResponse(429, url));

      const result = await navigateWithCheck(mockPage, url, {
        retries: 3,
        baseDelayMs: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(429);
      expect(mockGoto).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it('should not retry on 403', async () => {
      mockGoto.mockResolvedValue(createMockResponse(403, url));

      const result = await navigateWithCheck(mockPage, url);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(mockGoto).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff with conservative delays', async () => {
      jest.useFakeTimers();
      const delaySpy = jest.spyOn(globalThis, 'setTimeout');

      mockGoto.mockResolvedValue(createMockResponse(429, url));

      const promise = navigateWithCheck(mockPage, url, {
        retries: 2,
        baseDelayMs: 5000,
        maxDelayMs: 30000,
      });

      // Advance through 2 retry attempts
      for (let i = 0; i < 2; i++) {
        await jest.advanceTimersByTimeAsync(30000);
      }

      await promise;

      // Verify delays: 5000 (5s), 10000 (10s) — both under maxDelayMs 30000
      const delayCalls = delaySpy.mock.calls
        .map((call) => call[1] as number)
        .filter((d) => d !== undefined);
      expect(delayCalls[0]).toBe(5000);
      expect(delayCalls[1]).toBe(10000);
    });

    it('should respect custom baseDelayMs', async () => {
      jest.useFakeTimers();
      const delaySpy = jest.spyOn(globalThis, 'setTimeout');

      mockGoto.mockResolvedValue(createMockResponse(429, url));

      const promise = navigateWithCheck(mockPage, url, {
        retries: 1,
        baseDelayMs: 2000,
        maxDelayMs: 30000,
      });

      await jest.advanceTimersByTimeAsync(30000);
      await promise;

      const delayCalls = delaySpy.mock.calls
        .map((call) => call[1] as number)
        .filter((d) => d !== undefined);
      expect(delayCalls[0]).toBe(2000);
    });

    // ---- Crash recovery & periodic rotation tests ----

    it('should recover from page crash by calling recreateContext factory', async () => {
      const crashError = new Error('page.goto: Page crashed');
      mockGoto.mockRejectedValueOnce(crashError);

      const mockFactoryGoto = jest
        .fn<Promise<Response | null>, [string, unknown]>()
        .mockResolvedValueOnce(createMockResponse(200, url));
      const mockNewPage = {
        goto: mockFactoryGoto,
      } as unknown as Page;
      const recreateContext = jest
        .fn<Promise<Page>, []>()
        .mockResolvedValue(mockNewPage);

      const result = await navigateWithCheck(mockPage, url, {
        baseDelayMs: 1,
        recreateContext,
      } as RecoveryNavigateOptions);

      expect(recreateContext).toHaveBeenCalledTimes(1);
      expect(mockFactoryGoto).toHaveBeenCalledTimes(1);
      expect(mockFactoryGoto).toHaveBeenCalledWith(url, expect.any(Object));
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should recover from timeout error by calling recreateContext factory', async () => {
      const timeoutError = new Error('page.goto: Timeout 30000ms exceeded');
      mockGoto.mockRejectedValueOnce(timeoutError);

      const mockFactoryGoto = jest
        .fn<Promise<Response | null>, [string, unknown]>()
        .mockResolvedValueOnce(createMockResponse(200, url));
      const mockNewPage = {
        goto: mockFactoryGoto,
      } as unknown as Page;
      const recreateContext = jest
        .fn<Promise<Page>, []>()
        .mockResolvedValue(mockNewPage);

      const result = await navigateWithCheck(mockPage, url, {
        baseDelayMs: 1,
        recreateContext,
      } as RecoveryNavigateOptions);

      expect(recreateContext).toHaveBeenCalledTimes(1);
      expect(mockFactoryGoto).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should propagate factory error immediately when recreation fails', async () => {
      const crashError = new Error('page.goto: Page crashed');
      const factoryError = new Error('Context creation failed');
      mockGoto.mockRejectedValueOnce(crashError);

      const recreateContext = jest
        .fn<Promise<Page>, []>()
        .mockRejectedValueOnce(factoryError);

      await expect(
        navigateWithCheck(mockPage, url, {
          baseDelayMs: 1,
          recreateContext,
        } as RecoveryNavigateOptions),
      ).rejects.toThrow('Context creation failed');

      expect(recreateContext).toHaveBeenCalledTimes(1);
      // No additional goto calls after factory failure
      expect(mockGoto).toHaveBeenCalledTimes(1);
    });

    it('should limit recovery to 1 attempt — second crash throws immediately', async () => {
      const firstCrash = new Error('page.goto: Page crashed');
      const secondCrash = new Error('page.goto: Page crashed');
      mockGoto.mockRejectedValueOnce(firstCrash);

      const mockFactoryGoto = jest
        .fn<Promise<Response | null>, [string, unknown]>()
        .mockRejectedValueOnce(secondCrash);
      const mockNewPage = {
        goto: mockFactoryGoto,
      } as unknown as Page;
      const recreateContext = jest
        .fn<Promise<Page>, []>()
        .mockResolvedValue(mockNewPage);

      await expect(
        navigateWithCheck(mockPage, url, {
          baseDelayMs: 1,
          recreateContext,
        } as RecoveryNavigateOptions),
      ).rejects.toThrow('Page crashed');

      // Factory called only once — recovery is limited to 1 attempt
      expect(recreateContext).toHaveBeenCalledTimes(1);
      expect(mockFactoryGoto).toHaveBeenCalledTimes(1);
      // Original page goto called once, factory page goto called once
      expect(mockGoto).toHaveBeenCalledTimes(1);
    });

    it('should rotate context after maxNavigationsBeforeRotation threshold', async () => {
      const counter = { value: 5 };
      const maxNavigations = 5;

      const mockFactoryGoto = jest
        .fn<Promise<Response | null>, [string, unknown]>()
        .mockResolvedValueOnce(createMockResponse(200, url));
      const mockNewPage = {
        goto: mockFactoryGoto,
      } as unknown as Page;
      const recreateContext = jest
        .fn<Promise<Page>, []>()
        .mockResolvedValue(mockNewPage);

      const result = await navigateWithCheck(mockPage, url, {
        baseDelayMs: 1,
        maxNavigationsBeforeRotation: maxNavigations,
        navigationCounter: counter,
        recreateContext,
      } as RecoveryNavigateOptions);

      // Factory called because counter hit the threshold
      expect(recreateContext).toHaveBeenCalledTimes(1);
      // Counter was reset to 0 before navigation, then incremented to 1 after success
      expect(counter.value).toBe(1);
      // New page's goto was used for the actual navigation
      expect(mockFactoryGoto).toHaveBeenCalledTimes(1);
      // Original page goto was NOT called (rotation happened before navigation)
      expect(mockGoto).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should not rotate page when navigation count is below threshold', async () => {
      const counter = { value: 1 };

      mockGoto.mockResolvedValueOnce(createMockResponse(200, url));

      const recreateContext = jest.fn<Promise<Page>, []>();

      const result = await navigateWithCheck(mockPage, url, {
        baseDelayMs: 1,
        maxNavigationsBeforeRotation: 100,
        navigationCounter: counter,
        recreateContext,
      } as RecoveryNavigateOptions);

      // Factory NOT called — counter is well below threshold
      expect(recreateContext).not.toHaveBeenCalled();
      // Counter incremented after successful navigation
      expect(counter.value).toBe(2);
      // Original page goto was used
      expect(mockGoto).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should not consume retry capacity when recovering from crash', async () => {
      const crashError = new Error('page.goto: Page crashed');
      mockGoto.mockRejectedValueOnce(crashError);

      const mockFactoryGoto = jest
        .fn<Promise<Response | null>, [string, unknown]>()
        .mockResolvedValueOnce(createMockResponse(429, url))
        .mockResolvedValueOnce(createMockResponse(200, url));
      const mockNewPage = {
        goto: mockFactoryGoto,
      } as unknown as Page;
      const recreateContext = jest
        .fn<Promise<Page>, []>()
        .mockResolvedValue(mockNewPage);

      const result = await navigateWithCheck(mockPage, url, {
        retries: 2,
        baseDelayMs: 1,
        recreateContext,
      } as RecoveryNavigateOptions);

      // Factory called once for crash recovery
      expect(recreateContext).toHaveBeenCalledTimes(1);
      // 3 total goto calls: 1 crash (original) + 1 429 (recovery page) + 1 200 (recovery page)
      expect(mockGoto).toHaveBeenCalledTimes(1);
      expect(mockFactoryGoto).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });
  });
});
