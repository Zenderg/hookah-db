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
  })),
}));

// Import after mock setup
import { checkResponse, navigateWithCheck } from './http-checker';

describe('http-checker', () => {
  beforeEach(() => {
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
  });
});
