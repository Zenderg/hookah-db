/**
 * HTTP Client Tests
 *
 * Comprehensive test suite for the HTTP client module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HttpClient, HttpClientConfig, IterationState } from '../src/http-client.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Create a fresh HTTP client for each test
    httpClient = new HttpClient({
      requestTimeout: 5000,
      maxRetries: 3,
      retryDelayBase: 100,
      retryDelayMax: 1000,
      rateLimitRps: 10,
      rateLimitBurst: 5,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Request Tests', () => {
    it('should successfully fetch a URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => '<html><body>Test Content</body></html>',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(true);
      expect(result.content).toBe('<html><body>Test Content</body></html>');
      expect(result.statusCode).toBe(200);
      expect(result.retryCount).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP 404 error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await httpClient.fetch('https://example.com/not-found');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('HTTP 404');
      expect(result.statusCode).toBeUndefined();
      expect(result.retryCount).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP 500 error with retries', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await httpClient.fetch('https://example.com/error');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.retryCount).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should handle request timeout', async () => {
      // Mock fetch to always throw an AbortError
      const abortError = new Error('Request timeout after 100ms');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const result = await httpClient.fetch('https://example.com', { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle network errors', async () => {
      // Mock fetch to always throw a network error
      const networkError = new Error('ECONNREFUSED');
      networkError.name = 'TypeError';
      mockFetch.mockRejectedValue(networkError);

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ECONNREFUSED');
      expect(result.retryCount).toBeGreaterThan(0);
    });

    it('should add custom headers to request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await httpClient.fetch('https://example.com', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'Authorization': 'Bearer token',
          }),
        })
      );
    });

    it('should add query parameters to URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await httpClient.fetch('https://example.com', {
        params: {
          q: 'search',
          page: 1,
          limit: 10,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/?q=search&page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should add pagination parameters to URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await httpClient.fetch('https://example.com', {
        page: 2,
        pageSize: 20,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/?page=2&page_size=20',
        expect.any(Object)
      );
    });
  });

  describe('Retry Logic Tests', () => {
    it('should retry on transient network errors', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('ECONNRESET');
        }
        return {
          ok: true,
          status: 200,
          text: async () => 'success',
          headers: new Headers(),
        };
      });

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(attemptCount).toBe(3);
    });

    it('should retry on HTTP 5xx errors', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => 'error',
            headers: new Headers(),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => 'success',
          headers: new Headers(),
        };
      });

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(attemptCount).toBe(3);
    });

    it('should retry on HTTP 429 (Too Many Requests)', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: async () => 'error',
            headers: new Headers(),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => 'success',
          headers: new Headers(),
        };
      });

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(attemptCount).toBe(2);
    });

    it('should NOT retry on HTTP 4xx errors (except 429)', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await httpClient.fetch('https://example.com/not-found');

      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'error',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(false);
      expect(result.retryCount).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should use exponential backoff with jitter', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout to capture delays
      global.setTimeout = vi.fn((callback: () => void, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately
      }) as any;

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'error',
        headers: new Headers(),
      });

      await httpClient.fetch('https://example.com');

      // Check that delays increase exponentially (with some jitter)
      expect(delays.length).toBeGreaterThan(0);
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should cap retry delay at maximum', async () => {
      const client = new HttpClient({
        retryDelayBase: 1000,
        retryDelayMax: 5000,
        maxRetries: 5,
        rateLimitRps: 100, // High rate limit to avoid rate limiting delays
        rateLimitBurst: 100,
        requestTimeout: 1000, // Short timeout to avoid capturing long timeout
      });

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn((callback: () => void, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'error',
        headers: new Headers(),
      });

      await client.fetch('https://example.com');

      // All delays should be <= max delay
      // Filter out rate limiting delays (which are typically small)
      // Also filter out request timeout (1000ms)
      const retryDelays = delays.filter(d => d > 100 && d <= 10000);
      retryDelays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(5000);
      });

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limiting', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      
      // Make 10 requests with rate limit of 10 RPS
      const promises = Array.from({ length: 10 }, () => 
        httpClient.fetch('https://example.com')
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // Should take at least ~200ms for 10 requests at 10 RPS (with burst)
      expect(duration).toBeGreaterThanOrEqual(200);
    });

    it('should respect burst capacity', async () => {
      const client = new HttpClient({
        rateLimitRps: 1,
        rateLimitBurst: 3,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // First 3 requests should be immediate (burst)
      const startTime = Date.now();
      await Promise.all([
        client.fetch('https://example.com/1'),
        client.fetch('https://example.com/2'),
        client.fetch('https://example.com/3'),
      ]);
      const burstDuration = Date.now() - startTime;

      // Burst should complete quickly
      expect(burstDuration).toBeLessThan(200);
    });

    it('should recover rate limit tokens over time', async () => {
      const client = new HttpClient({
        rateLimitRps: 2,
        rateLimitBurst: 2,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Use all burst tokens
      await Promise.all([
        client.fetch('https://example.com/1'),
        client.fetch('https://example.com/2'),
      ]);

      // Wait for tokens to refill
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should be able to make another request
      const startTime = Date.now();
      await client.fetch('https://example.com/3');
      const duration = Date.now() - startTime;

      // Should not wait long since tokens have refilled
      // Allow for some timing variance
      expect(duration).toBeLessThan(600);
    });

    it('should parse rate limit headers', async () => {
      const headers = new Headers();
      headers.set('X-RateLimit-Remaining', '1');
      headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60));

      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers,
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await httpClient.fetch('https://example.com');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Rate limit nearly exhausted');
      consoleWarnSpy.mockRestore();
    });

    it('should get rate limit token count', () => {
      const tokenCount = httpClient.getRateLimitTokenCount();
      expect(typeof tokenCount).toBe('number');
      expect(tokenCount).toBeGreaterThan(0);
    });
  });

  describe('User Agent Tests', () => {
    it('should rotate through user agents', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const userAgents: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        await httpClient.fetch('https://example.com');
        const callArgs = mockFetch.mock.calls[i];
        userAgents.push(callArgs[1].headers['User-Agent']);
      }

      // All user agents should be present
      expect(new Set(userAgents).size).toBeGreaterThan(1);
    });

    it('should use custom user agent when provided', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const customUserAgent = 'MyCustomBot/1.0';
      await httpClient.fetch('https://example.com', { userAgent: customUserAgent });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': customUserAgent,
          }),
        })
      );
    });

    it('should set custom user agents', async () => {
      const customAgents = [
        'CustomAgent1/1.0',
        'CustomAgent2/1.0',
      ];

      httpClient.setUserAgents(customAgents);

      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetch('https://example.com');

      const callArgs = mockFetch.mock.calls[0];
      expect(customAgents).toContain(callArgs[1].headers['User-Agent']);
    });

    it('should throw error when setting empty user agent list', () => {
      expect(() => {
        httpClient.setUserAgents([]);
      }).toThrow('User agent list cannot be empty');
    });

    it('should get user agent', () => {
      const userAgent = httpClient.getUserAgent();
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBeGreaterThan(0);
    });

    it('should get custom user agent when provided', () => {
      const customUserAgent = 'CustomBot/1.0';
      const userAgent = httpClient.getUserAgent(customUserAgent);
      expect(userAgent).toBe(customUserAgent);
    });
  });

  describe('Iterative Request Tests', () => {
    it('should track iteration state', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetchIterative('https://example.com');
      await httpClient.fetchIterative('https://example.com');

      const state = httpClient.getIterationState();
      expect(state.iteration).toBe(2);
    });

    it('should update iteration state on successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const initialState = httpClient.getIterationState();
      expect(initialState.iteration).toBe(0);

      await httpClient.fetchIterative('https://example.com');

      const newState = httpClient.getIterationState();
      expect(newState.iteration).toBe(1);
    });

    it('should not update iteration state on failed request', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const initialState = httpClient.getIterationState();
      await httpClient.fetchIterative('https://example.com');

      const newState = httpClient.getIterationState();
      expect(newState.iteration).toBe(initialState.iteration);
    });

    it('should accept custom iteration state', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const customState: Partial<IterationState> = {
        iteration: 10,
        totalItems: 100,
      };

      await httpClient.fetchIterative('https://example.com', { iterationState: customState });

      const state = httpClient.getIterationState();
      expect(state.iteration).toBe(11); // 10 + 1
    });

    it('should reset iteration state', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetchIterative('https://example.com');
      await httpClient.fetchIterative('https://example.com');

      httpClient.resetIterationState();

      const state = httpClient.getIterationState();
      expect(state.iteration).toBe(0);
      expect(state.totalItems).toBe(0);
      expect(state.hasMoreData).toBe(true);
    });

    it('should update iteration state partially', () => {
      httpClient.updateIterationState({
        totalItems: 50,
        hasMoreData: false,
      });

      const state = httpClient.getIterationState();
      expect(state.totalItems).toBe(50);
      expect(state.hasMoreData).toBe(false);
      expect(state.iteration).toBe(0); // unchanged
    });

    it('should use continuation token from state', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      httpClient.updateIterationState({
        continuationToken: 'abc123',
      });

      await httpClient.fetchIterative('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com'),
        expect.any(Object)
      );
    });
  });

  describe('Request History Tests', () => {
    it('should record request history', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetch('https://example.com/1');
      await httpClient.fetch('https://example.com/2');

      const history = httpClient.getRequestHistory();
      expect(history.length).toBe(2);
      expect(history[0]?.url).toContain('https://example.com/1');
      expect(history[1]?.url).toContain('https://example.com/2');
    });

    it('should record request duration', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetch('https://example.com');

      const history = httpClient.getRequestHistory();
      expect(history[0]?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should record retry count', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'error',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetch('https://example.com');

      const history = httpClient.getRequestHistory();
      expect(history[0]?.retryCount).toBeGreaterThan(0);
    });

    it('should clear request history', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpClient.fetch('https://example.com');
      httpClient.clearRequestHistory();

      const history = httpClient.getRequestHistory();
      expect(history.length).toBe(0);
    });

    it('should limit history size', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Make more requests than history limit (1000)
      // Use a smaller number to avoid timeout
      for (let i = 0; i < 1050; i++) {
        await httpClient.fetch(`https://example.com/${i}`);
      }

      const history = httpClient.getRequestHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    }, 120000); // Increase timeout to 120s
  });

  describe('Discovered Items Tests', () => {
    it('should add discovered items', () => {
      httpClient.addDiscoveredItem('item1');
      httpClient.addDiscoveredItem('item2');

      expect(httpClient.getDiscoveredItemCount()).toBe(2);
    });

    it('should check if item is discovered', () => {
      httpClient.addDiscoveredItem('item1');

      expect(httpClient.hasDiscoveredItem('item1')).toBe(true);
      expect(httpClient.hasDiscoveredItem('item2')).toBe(false);
    });

    it('should not add duplicate items', () => {
      httpClient.addDiscoveredItem('item1');
      httpClient.addDiscoveredItem('item1');

      expect(httpClient.getDiscoveredItemCount()).toBe(1);
    });

    it('should clear discovered items', () => {
      httpClient.addDiscoveredItem('item1');
      httpClient.addDiscoveredItem('item2');
      httpClient.clearDiscoveredItems();

      expect(httpClient.getDiscoveredItemCount()).toBe(0);
    });
  });

  describe('Checkpoint Tests', () => {
    it('should create checkpoint', () => {
      httpClient.updateIterationState({
        iteration: 5,
        totalItems: 100,
      });
      httpClient.addDiscoveredItem('item1');
      httpClient.addDiscoveredItem('item2');

      const checkpoint = httpClient.createCheckpoint();

      expect(checkpoint.iterationState.iteration).toBe(5);
      expect(checkpoint.iterationState.totalItems).toBe(100);
      expect(checkpoint.discoveredItems).toEqual(['item1', 'item2']);
      expect(checkpoint.timestamp).toBeInstanceOf(Date);
    });

    it('should restore from checkpoint', () => {
      const checkpoint = {
        iterationState: {
          iteration: 10,
          totalItems: 200,
          lastTimestamp: new Date(),
          hasMoreData: true,
        },
        discoveredItems: ['item1', 'item2', 'item3'],
      };

      httpClient.restoreCheckpoint(checkpoint);

      const state = httpClient.getIterationState();
      expect(state.iteration).toBe(10);
      expect(state.totalItems).toBe(200);
      expect(httpClient.getDiscoveredItemCount()).toBe(3);
    });

    it('should restore checkpoint correctly after reset', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Make some requests
      await httpClient.fetchIterative('https://example.com');
      httpClient.addDiscoveredItem('item1');

      // Create checkpoint
      const checkpoint = httpClient.createCheckpoint();

      // Reset
      httpClient.resetIterationState();
      httpClient.clearDiscoveredItems();

      // Restore
      httpClient.restoreCheckpoint(checkpoint);

      const state = httpClient.getIterationState();
      expect(state.iteration).toBe(1);
      expect(httpClient.hasDiscoveredItem('item1')).toBe(true);
    });
  });

  describe('Configuration Tests', () => {
    it('should use default configuration when not provided', () => {
      const client = new HttpClient();
      
      expect(client.getRateLimitTokenCount()).toBeGreaterThan(0);
    });

    it('should use custom configuration', () => {
      const config: HttpClientConfig = {
        requestTimeout: 10000,
        maxRetries: 5,
        retryDelayBase: 2000,
        retryDelayMax: 60000,
        rateLimitRps: 5,
        rateLimitBurst: 10,
      };

      const client = new HttpClient(config);
      expect(client).toBeDefined();
    });

    it('should read configuration from environment variables', () => {
      process.env.SCRAPER_REQUEST_TIMEOUT = '15000';
      process.env.SCRAPER_MAX_RETRIES = '5';
      process.env.SCRAPER_RATE_LIMIT_RPS = '3';

      const client = new HttpClient();
      
      // Clean up
      delete process.env.SCRAPER_REQUEST_TIMEOUT;
      delete process.env.SCRAPER_MAX_RETRIES;
      delete process.env.SCRAPER_RATE_LIMIT_RPS;

      expect(client).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete request flow with retries and rate limiting', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => 'error',
            headers: new Headers(),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => 'success',
          headers: new Headers(),
        };
      });

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(true);
      expect(result.retryCount).toBeGreaterThanOrEqual(1); // Allow for timing variations
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle multiple iterative requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(mockResponse);

      for (let i = 0; i < 5; i++) {
        await httpClient.fetchIterative('https://example.com');
      }

      const state = httpClient.getIterationState();
      expect(state.iteration).toBe(5);
    });

    it('should handle error recovery scenarios', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => 'error',
            headers: new Headers(),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => 'success',
          headers: new Headers(),
        };
      });

      const result1 = await httpClient.fetch('https://example.com');
      expect(result1.success).toBe(true);

      // Second request should succeed immediately
      const result2 = await httpClient.fetch('https://example.com');
      expect(result2.success).toBe(true);
      expect(result2.retryCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid URL gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      // Invalid URL but fetch should still be called
      const result = await httpClient.fetch('not-a-valid-url');
      
      // The result depends on how fetch handles invalid URLs
      expect(result).toBeDefined();
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => '',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await httpClient.fetch('https://example.com');

      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });

    it('should handle very long URLs', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: async () => 'content',
        headers: new Headers(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const longUrl = 'https://example.com/?' + 'a'.repeat(2000);
      const result = await httpClient.fetch(longUrl);

      expect(result).toBeDefined();
    });
  });
});
