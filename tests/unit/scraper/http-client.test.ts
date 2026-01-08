/**
 * Unit tests for HTTP Client
 * 
 * Tests HTTP client functionality including:
 * - Making GET requests
 * - Handling responses
 * - Error handling
 * - Retry logic
 */

import axios from 'axios';
import { HttpClient, HttpClientError } from '../../src/scraper';

// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ============================================================================
// Test Suite
// ============================================================================

describe('HTTP Client', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Tests for get method
  // ============================================================================

  describe('get', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': expect.any(String),
        },
      });
    });

    it('should make GET request with custom headers', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const customHeaders = {
        'Custom-Header': 'value',
      };

      const response = await httpClient.get('https://example.com', customHeaders);

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': expect.any(String),
          'Custom-Header': 'value',
        },
      });
    });

    it('should make GET request with custom User-Agent', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const customHeaders = {
        'User-Agent': 'Custom User Agent',
      };

      const response = await httpClient.get('https://example.com', customHeaders);

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': 'Custom User Agent',
        },
      });
    });

    it('should handle HTTP errors', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: 'Not Found',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error');
      (mockError as any).isAxiosError = true;

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', async () => {
      const mockError = new Error('Request timeout');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ECONNABORTED';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle DNS resolution errors', async () => {
      const mockError = new Error('getaddrinfo ENOTFOUND example.com');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ENOTFOUND';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle connection refused errors', async () => {
      const mockError = new Error('ECONNREFUSED');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ECONNREFUSED';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 500 Internal Server Error', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: 'Internal Server Error',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 503 Service Unavailable', async () => {
      const mockError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: 'Service Unavailable',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 429 Too Many Requests', async () => {
      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: 'Too Many Requests',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 403 Forbidden', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: 'Forbidden',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 401 Unauthorized', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: 'Unauthorized',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 400 Bad Request', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: 'Bad Request',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Tests for HttpClientError
  // ============================================================================

  describe('HttpClientError', () => {
    it('should create error with message', () => {
      const error = new HttpClientError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('HttpClientError');
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original error');
      const error = new HttpClientError('Test error message', originalError);

      expect(error.message).toBe('Test error message');
      expect(error.originalError).toBe(originalError);
    });

    it('should create error with HTTP status code', () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
        },
        isAxiosError: true,
      };

      const error = new HttpClientError('Not Found', mockError);

      expect(error.message).toBe('Not Found');
      expect(error.originalError).toBe(mockError);
      expect(error.statusCode).toBe(404);
    });

    it('should create error without HTTP status code', () => {
      const originalError = new Error('Network Error');
      const error = new HttpClientError('Network Error', originalError);

      expect(error.message).toBe('Network Error');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBeUndefined();
    });

    it('should create error with stack trace', () => {
      const error = new HttpClientError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  // ============================================================================
  // Tests for User-Agent header
  // ============================================================================

  describe('User-Agent Header', () => {
    it('should include default User-Agent header', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await httpClient.get('https://example.com');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': expect.any(String),
        },
      });
    });

    it('should override default User-Agent with custom header', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const customHeaders = {
        'User-Agent': 'Custom User Agent',
      };

      await httpClient.get('https://example.com', customHeaders);

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': 'Custom User Agent',
        },
      });
    });

    it('should preserve User-Agent format', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await httpClient.get('https://example.com');

      const callArgs = mockedAxios.get.mock.calls[0];
      const userAgent = callArgs[1].headers['User-Agent'];

      expect(userAgent).toContain('Mozilla');
      expect(userAgent).toContain('Chrome');
    });
  });

  // ============================================================================
  // Tests for URL handling
  // ============================================================================

  describe('URL Handling', () => {
    it('should handle HTTP URLs', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('http://example.com');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://example.com', expect.any(Object));
    });

    it('should handle HTTPS URLs', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', expect.any(Object));
    });

    it('should handle URLs with query parameters', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com?param1=value1&param2=value2');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com?param1=value1&param2=value2',
        expect.any(Object)
      );
    });

    it('should handle URLs with fragments', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com#section');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com#section', expect.any(Object));
    });

    it('should handle URLs with path segments', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com/path/to/resource');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/path/to/resource',
        expect.any(Object)
      );
    });

    it('should handle URLs with special characters', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com/path?param=value%20with%20spaces');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/path?param=value%20with%20spaces',
        expect.any(Object)
      );
    });

    it('should handle URLs with Unicode characters', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com/path/тест');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/path/тест',
        expect.any(Object)
      );
    });

    it('should handle URLs with port numbers', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com:8080/path');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com:8080/path',
        expect.any(Object)
      );
    });

    it('should handle URLs with authentication', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://user:pass@example.com/path');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://user:pass@example.com/path',
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // Tests for response handling
  // ============================================================================

  describe('Response Handling', () => {
    it('should return response data', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.data).toBe('<html>test</html>');
    });

    it('should return response status', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.status).toBe(200);
    });

    it('should return response status text', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.statusText).toBe('OK');
    });

    it('should return response headers', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'text/html',
          'content-length': '100',
        },
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.headers).toEqual({
        'content-type': 'text/html',
        'content-length': '100',
      });
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        data: '',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.data).toBe('');
    });

    it('should handle JSON response data', async () => {
      const mockResponse = {
        data: { key: 'value', nested: { key2: 'value2' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.data).toEqual({
        key: 'value',
        nested: { key2: 'value2' },
      });
    });

    it('should handle array response data', async () => {
      const mockResponse = {
        data: ['item1', 'item2', 'item3'],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.data).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle null response data', async () => {
      const mockResponse = {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.data).toBeNull();
    });

    it('should handle undefined response data', async () => {
      const mockResponse = {
        data: undefined,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://example.com');

      expect(response.data).toBeUndefined();
    });
  });

  // ============================================================================
  // Tests for edge cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long URLs', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const longUrl = 'https://example.com/' + 'a'.repeat(1000);

      const response = await httpClient.get(longUrl);

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(longUrl, expect.any(Object));
    });

    it('should handle URLs with many query parameters', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const queryParams = Array.from({ length: 100 }, (_, i) => `param${i}=value${i}`).join('&');
      const url = `https://example.com?${queryParams}`;

      const response = await httpClient.get(url);

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(url, expect.any(Object));
    });

    it('should handle URLs with special query characters', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const url = 'https://example.com?param=value%20with%20spaces&special=!@#$%^&*()';

      const response = await httpClient.get(url);

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(url, expect.any(Object));
    });

    it('should handle URLs with IPv4 addresses', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://192.168.1.1/path');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://192.168.1.1/path', expect.any(Object));
    });

    it('should handle URLs with IPv6 addresses', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('https://[2001:db8::1]/path');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://[2001:db8::1]/path', expect.any(Object));
    });

    it('should handle URLs with localhost', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('http://localhost:3000/path');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3000/path', expect.any(Object));
    });

    it('should handle URLs with 127.0.0.1', async () => {
      const mockResponse = {
        data: '<html>test</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await httpClient.get('http://127.0.0.1:3000/path');

      expect(response).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:3000/path', expect.any(Object));
    });
  });

  // ============================================================================
  // Tests for multiple requests
  // ============================================================================

  describe('Multiple Requests', () => {
    it('should handle multiple sequential requests', async () => {
      const mockResponse1 = {
        data: '<html>test1</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const mockResponse2 = {
        data: '<html>test2</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const response1 = await httpClient.get('https://example.com/page1');
      const response2 = await httpClient.get('https://example.com/page2');

      expect(response1).toEqual(mockResponse1);
      expect(response2).toEqual(mockResponse2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle requests to different domains', async () => {
      const mockResponse1 = {
        data: '<html>test1</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const mockResponse2 = {
        data: '<html>test2</html>',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const response1 = await httpClient.get('https://example.com');
      const response2 = await httpClient.get('https://another.com');

      expect(response1).toEqual(mockResponse1);
      expect(response2).toEqual(mockResponse2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});
