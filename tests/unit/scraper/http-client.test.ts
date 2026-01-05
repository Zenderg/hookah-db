/**
 * Unit Tests for HTTP Client
 * 
 * Tests retry logic, rate limiting, and error handling
 */

import axios, { AxiosInstance } from 'axios';
import {
  HttpClient,
  HttpClientConfig,
  HttpClientError,
  MaxRetriesExceededError,
  RequestTimeoutError,
  RateLimitError,
  RETRYABLE_STATUS_CODES,
} from '../../../packages/scraper/src/http-client';

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockAxiosInstance: any;
  let mockSleepFn: jest.Mock<Promise<void>, [number]>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    // Create mock sleep function that uses Jest's fake timers
    mockSleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
    
    // Create mock instance
    mockAxiosInstance = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };
    
    // Spy on axios.create to return our mock instance
    jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance);
    
    // Create new HTTP client for each test with mock sleep function
    httpClient = new HttpClient({ sleepFn: mockSleepFn });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should create default instance with correct configuration', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ sleepFn });
      
      expect(axios.create).toHaveBeenCalled();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://htreviews.org',
          timeout: 30000,
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('HookahDB'),
          }),
        })
      );
    });

    it('should create instance with custom baseURL', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { baseURL: 'https://example.com', sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.com',
        })
      );
    });

    it('should create instance with custom timeout', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { timeout: 60000, sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should create instance with custom maxRetries', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { maxRetries: 5, sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalled();
    });

    it('should create instance with custom minDelayBetweenRequests', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { minDelayBetweenRequests: 2000, sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalled();
    });

    it('should create instance with custom userAgent', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { userAgent: 'CustomAgent/1.0', sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'CustomAgent/1.0',
          }),
        })
      );
    });

    it('should create instance with retry disabled', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { enableRetry: false, sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalled();
    });

    it('should create instance with rate limiting disabled', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = { enableRateLimit: false, sleepFn };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalled();
    });

    it('should create instance with all custom options', () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const config: HttpClientConfig = {
        baseURL: 'https://custom.com',
        timeout: 45000,
        maxRetries: 7,
        minDelayBetweenRequests: 1500,
        userAgent: 'TestAgent/2.0',
        enableRetry: false,
        enableRateLimit: false,
        sleepFn,
      };
      const client = new HttpClient(config);
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.com',
          timeout: 45000,
          headers: expect.objectContaining({
            'User-Agent': 'TestAgent/2.0',
          }),
        })
      );
    });
  });

  describe('successful requests', () => {
    it('should handle successful GET request', async () => {
      const mockResponse = { data: { result: 'success' }, status: 200 };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      const result = await httpClient.get('/test');
      
      expect(result.data).toEqual({ result: 'success' });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
        })
      );
    });

    it('should handle successful POST request', async () => {
      const mockResponse = { data: { created: true }, status: 201 };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      const result = await httpClient.post('/test', { name: 'test' });
      
      expect(result.data).toEqual({ created: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          data: { name: 'test' },
        })
      );
    });

    it('should handle request with custom headers', async () => {
      const mockResponse = { data: { result: 'success' }, status: 200 };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      await httpClient.get('/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-Custom-Header': 'custom-value' },
        })
      );
    });

    it('should handle request with query parameters', async () => {
      const mockResponse = { data: { result: 'success' }, status: 200 };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      await httpClient.get('/test', {
        params: { page: 1, limit: 10 },
      });
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { page: 1, limit: 10 },
        })
      );
    });

    it('should handle successful PUT request', async () => {
      const mockResponse = { data: { updated: true }, status: 200 };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      const result = await httpClient.put('/test', { name: 'updated' });
      
      expect(result.data).toEqual({ updated: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/test',
          data: { name: 'updated' },
        })
      );
    });

    it('should handle successful DELETE request', async () => {
      const mockResponse = { data: { deleted: true }, status: 200 };
      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);
      
      const result = await httpClient.delete('/test');
      
      expect(result.data).toEqual({ deleted: true });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/test',
        })
      );
    });
  });

  describe('retry logic', () => {
    it('should not retry on 400 status code', async () => {
      const mockError = {
        response: { status: 400, statusText: 'Bad Request' },
        config: { url: '/test' },
      };
      
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);
      
      await expect(httpClient.get('/test')).rejects.toThrow(HttpClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 status code', async () => {
      const mockError = {
        response: { status: 401, statusText: 'Unauthorized' },
        config: { url: '/test' },
      };
      
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);
      
      await expect(httpClient.get('/test')).rejects.toThrow(HttpClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 status code', async () => {
      const mockError = {
        response: { status: 404, statusText: 'Not Found' },
        config: { url: '/test' },
      };
      
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);
      
      await expect(httpClient.get('/test')).rejects.toThrow(HttpClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 422 status code', async () => {
      const mockError = {
        response: { status: 422, statusText: 'Unprocessable Entity' },
        config: { url: '/test' },
      };
      
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);
      
      await expect(httpClient.get('/test')).rejects.toThrow(HttpClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry when retry is disabled', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ enableRetry: false, enableRateLimit: false, sleepFn });
      
      const mockError = {
        response: { status: 500, statusText: 'Internal Server Error' },
        config: { url: '/test' },
      };
      
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);
      
      await expect(client.get('/test')).rejects.toThrow(HttpClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limiting', () => {
    it('should allow requests after minimum delay has passed', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ minDelayBetweenRequests: 500, enableRetry: false, sleepFn });
      
      const mockResponse = { data: 'success', status: 200 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
      
      await client.get('/test1');
      jest.advanceTimersByTime(500);
      await client.get('/test2');
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should allow rate limiter reset', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ minDelayBetweenRequests: 1000, enableRetry: false, sleepFn });
      
      const mockResponse = { data: 'success', status: 200 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
      
      await client.get('/test1');
      client.resetRateLimiter();
      await client.get('/test2');
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should allow rate limiting to be disabled', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ enableRateLimit: false, enableRetry: false, sleepFn });
      
      const mockResponse = { data: 'success', status: 200 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
      
      await client.get('/test1');
      await client.get('/test2');
      await client.get('/test3');
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should not delay when rate limiting is disabled', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ 
        minDelayBetweenRequests: 5000, 
        enableRateLimit: false,
        enableRetry: false,
        sleepFn,
      });
      
      const mockResponse = { data: 'success', status: 200 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
      
      await client.get('/test1');
      await client.get('/test2');
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('custom error types', () => {
    describe('HttpClientError', () => {
      it('should create HttpClientError with message only', () => {
        const error = new HttpClientError('Test error');
        
        expect(error.name).toBe('HttpClientError');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBeUndefined();
        expect(error.url).toBeUndefined();
        expect(error.originalError).toBeUndefined();
      });

      it('should create HttpClientError with all properties', () => {
        const originalError = new Error('Original');
        const error = new HttpClientError('Test error', 500, '/test', originalError);
        
        expect(error.name).toBe('HttpClientError');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.url).toBe('/test');
        expect(error.originalError).toBe(originalError);
      });

      it('should have correct prototype chain', () => {
        const error = new HttpClientError('Test');
        
        expect(error instanceof Error).toBe(true);
        expect(error instanceof HttpClientError).toBe(true);
      });
    });

    describe('MaxRetriesExceededError', () => {
      it('should create MaxRetriesExceededError with default attempts', () => {
        const error = new MaxRetriesExceededError('Max retries exceeded', 500, '/test');
        
        expect(error.name).toBe('MaxRetriesExceededError');
        expect(error.message).toBe('Max retries exceeded');
        expect(error.statusCode).toBe(500);
        expect(error.url).toBe('/test');
        expect(error.attempts).toBe(0);
      });

      it('should create MaxRetriesExceededError with custom attempts', () => {
        const error = new MaxRetriesExceededError('Max retries exceeded', 500, '/test', 5);
        
        expect(error.name).toBe('MaxRetriesExceededError');
        expect(error.attempts).toBe(5);
      });

      it('should extend HttpClientError', () => {
        const error = new MaxRetriesExceededError('Max retries exceeded');
        
        expect(error instanceof HttpClientError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });

    describe('RequestTimeoutError', () => {
      it('should create RequestTimeoutError with default values', () => {
        const error = new RequestTimeoutError();
        
        expect(error.name).toBe('RequestTimeoutError');
        expect(error.message).toContain('timeout');
        expect(error.url).toBeUndefined();
      });

      it('should create RequestTimeoutError with url and timeout', () => {
        const error = new RequestTimeoutError('/test', 30000);
        
        expect(error.name).toBe('RequestTimeoutError');
        expect(error.message).toContain('30000ms');
        expect(error.url).toBe('/test');
      });

      it('should extend HttpClientError', () => {
        const error = new RequestTimeoutError();
        
        expect(error instanceof HttpClientError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });

    describe('RateLimitError', () => {
      it('should create RateLimitError without retry-after', () => {
        const error = new RateLimitError('/test');
        
        expect(error.name).toBe('RateLimitError');
        expect(error.message).toBe('Rate limit exceeded.');
        expect(error.statusCode).toBe(429);
        expect(error.url).toBe('/test');
      });

      it('should create RateLimitError with retry-after', () => {
        const error = new RateLimitError('/test', 60);
        
        expect(error.name).toBe('RateLimitError');
        expect(error.message).toContain('60 seconds');
        expect(error.statusCode).toBe(429);
        expect(error.url).toBe('/test');
      });

      it('should extend HttpClientError', () => {
        const error = new RateLimitError();
        
        expect(error instanceof HttpClientError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      const mockResponse = { data: 'success', status: 200 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
    });

    it('should support GET method', async () => {
      const result = await httpClient.get('/test');
      
      expect(result.data).toBe('success');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
        })
      );
    });

    it('should support POST method', async () => {
      const result = await httpClient.post('/test', { data: 'value' });
      
      expect(result.data).toBe('success');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          data: { data: 'value' },
        })
      );
    });

    it('should support PUT method', async () => {
      const result = await httpClient.put('/test', { data: 'value' });
      
      expect(result.data).toBe('success');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/test',
          data: { data: 'value' },
        })
      );
    });

    it('should support DELETE method', async () => {
      const result = await httpClient.delete('/test');
      
      expect(result.data).toBe('success');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/test',
        })
      );
    });

    it('should support PATCH method', async () => {
      const result = await httpClient.patch('/test', { data: 'value' });
      
      expect(result.data).toBe('success');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/test',
          data: { data: 'value' },
        })
      );
    });

    it('should pass config to GET method', async () => {
      await httpClient.get('/test', { headers: { 'X-Custom': 'value' } });
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          headers: { 'X-Custom': 'value' },
        })
      );
    });

    it('should pass config to POST method', async () => {
      await httpClient.post('/test', { data: 'value' }, { headers: { 'X-Custom': 'value' } });
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          data: { data: 'value' },
          headers: { 'X-Custom': 'value' },
        })
      );
    });

    it('should pass config to PUT method', async () => {
      await httpClient.put('/test', { data: 'value' }, { headers: { 'X-Custom': 'value' } });
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: '/test',
          data: { data: 'value' },
          headers: { 'X-Custom': 'value' },
        })
      );
    });

    it('should pass config to DELETE method', async () => {
      await httpClient.delete('/test', { headers: { 'X-Custom': 'value' } });
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/test',
          headers: { 'X-Custom': 'value' },
        })
      );
    });
  });

  describe('RETRYABLE_STATUS_CODES', () => {
    it('should include 429', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(429);
    });

    it('should include 500', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(500);
    });

    it('should include 502', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(502);
    });

    it('should include 503', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(503);
    });

    it('should include 504', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(504);
    });

    it('should not include 400', () => {
      expect(RETRYABLE_STATUS_CODES).not.toContain(400);
    });

    it('should not include 404', () => {
      expect(RETRYABLE_STATUS_CODES).not.toContain(404);
    });
  });

  describe('edge cases', () => {
    it('should handle zero maxRetries', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ maxRetries: 0, enableRateLimit: false, sleepFn });
      
      const mockError = {
        response: { status: 500, statusText: 'Internal Server Error' },
        config: { url: '/test' },
      };
      
      mockAxiosInstance.request.mockRejectedValueOnce(mockError);
      
      await expect(client.get('/test')).rejects.toThrow(HttpClientError);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should handle very large maxRetries', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ maxRetries: 100, sleepFn });
      
      expect(axios.create).toHaveBeenCalled();
    });

    it('should handle very large timeout', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ timeout: 300000, enableRetry: false, sleepFn });
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 300000,
        })
      );
    });

    it('should handle empty baseURL', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ baseURL: '', enableRetry: false, sleepFn });
      
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: '',
        })
      );
    });

    it('should handle concurrent requests with rate limiting', async () => {
      const sleepFn = jest.fn((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
      const client = new HttpClient({ minDelayBetweenRequests: 100, enableRetry: false, sleepFn });
      
      const mockResponse = { data: 'success', status: 200 };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
      
      const promises = [
        client.get('/test1'),
        client.get('/test2'),
        client.get('/test3'),
      ];
      
      jest.runAllTimers();
      
      await Promise.all(promises);
      
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });
});
