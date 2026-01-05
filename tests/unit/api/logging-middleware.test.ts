/**
 * Unit tests for logging middleware
 * 
 * Tests logging middleware functionality including:
 * - Request logging middleware
 * - Response logging middleware
 * - Combined logging middleware
 * - Correlation ID generation
 * - Sensitive data filtering
 * - API key masking
 * - Configuration options
 * - Log levels based on status codes
 * - Request/response time tracking
 * - Middleware enable/disable
 */

import { Request, Response, NextFunction } from 'express';
import { createRequestLoggingMiddleware } from '@hookah-db/api/src/middleware/request-logging-middleware';
import { createResponseLoggingMiddleware } from '@hookah-db/api/src/middleware/response-logging-middleware';
import { createLoggingMiddleware } from '@hookah-db/api/src/middleware/logging-middleware';
import { LoggerFactory } from '@hookah-db/utils';
import { LogLevel } from '@hookah-db/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock LoggerFactory
jest.mock('@hookah-db/utils', () => {
  return {
    LoggerFactory: {
      createEnvironmentLogger: jest.fn(),
    },
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('Logging Middleware', () => {
  let mockLogger: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      verbose: jest.fn(),
      debug: jest.fn(),
      silly: jest.fn(),
      setCorrelationId: jest.fn(),
      clearCorrelationId: jest.fn(),
    };

    // Mock LoggerFactory.createEnvironmentLogger to return our mock
    (LoggerFactory.createEnvironmentLogger as jest.Mock).mockReturnValue(mockLogger);

    // Create mock request and response
    req = {
      method: 'GET',
      url: '/api/v1/brands',
      originalUrl: '/api/v1/brands',
      protocol: 'http',
      get: jest.fn().mockReturnValue('test-value'),
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
        'host': 'localhost:3000',
      },
      query: { page: '1', limit: '10' },
      params: { id: '123' },
      body: { test: 'data' },
    };

    res = {
      statusCode: 200,
      get: jest.fn().mockReturnValue('1234'),
      getHeaders: jest.fn().mockReturnValue({
        'content-type': 'application/json',
        'content-length': '1234',
      }),
      on: jest.fn((event: string, handler: Function) => {
        if (event === 'finish') {
          setTimeout(() => handler(), 0);
        }
      }) as any,
      json: jest.fn(function (this: Response, body: any) {
        return this;
      }),
      send: jest.fn(function (this: Response, body: any) {
        return this;
      }),
    };

    next = jest.fn();
  });

  // ============================================================================
  // Request Logging Middleware Tests
  // ============================================================================

  describe('Request Logging Middleware', () => {
    it('should log request with default configuration', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Incoming GET request to /api/v1/brands'),
        expect.objectContaining({
          method: 'GET',
          url: '/api/v1/brands',
          correlationId: expect.any(String),
        })
      );
    });

    it('should generate correlation ID', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect((req as any).correlationId).toBeDefined();
      expect(mockLogger.setCorrelationId).toHaveBeenCalled();
    });

    it('should attach correlation ID to request', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect((req as any).correlationId).toBe('mock-uuid');
    });

    it('should attach request start time', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect((req as any).requestStartTime).toBeDefined();
      expect(typeof (req as any).requestStartTime).toBe('number');
    });

    it('should log request metadata', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.any(String),
          level: LogLevel.INFO,
          method: 'GET',
          url: '/api/v1/brands',
          fullUrl: 'http://localhost:3000/api/v1/brands',
          protocol: 'http',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        })
      );
    });

    it('should log headers when enabled', () => {
      // Act
      const middleware = createRequestLoggingMiddleware({ logHeaders: true });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    });

    it('should not log headers when disabled', () => {
      // Act
      const middleware = createRequestLoggingMiddleware({ logHeaders: false });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: undefined,
        })
      );
    });

    it('should log body when enabled', () => {
      // Act
      const middleware = createRequestLoggingMiddleware({ logBody: true });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: { test: 'data' },
        })
      );
    });

    it('should not log body when disabled', () => {
      // Act
      const middleware = createRequestLoggingMiddleware({ logBody: false });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: undefined,
        })
      );
    });

    it('should log query parameters', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: { page: '1', limit: '10' },
        })
      );
    });

    it('should log route parameters', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { id: '123' },
        })
      );
    });

    it('should mask API key', () => {
      // Arrange
      req.headers = {
        ...req.headers,
        'x-api-key': 'test-api-key-12345678',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          apiKey: 'test...5678',
        })
      );
    });

    it('should mask short API key', () => {
      // Arrange
      req.headers = {
        ...req.headers,
        'x-api-key': 'short',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          apiKey: '****',
        })
      );
    });

    it('should not include API key when not present', () => {
      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          apiKey: undefined,
        })
      );
    });

    it('should filter sensitive headers', () => {
      // Arrange
      req.headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer token',
        'cookie': 'session=abc',
        'x-api-key': 'secret-key',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedHeaders = (mockLogger.info as jest.Mock).mock.calls[0][1].headers;
      expect(loggedHeaders).not.toHaveProperty('authorization');
      expect(loggedHeaders).not.toHaveProperty('cookie');
      expect(loggedHeaders).not.toHaveProperty('x-api-key');
      expect(loggedHeaders).toHaveProperty('content-type');
    });

    it('should filter sensitive body fields', () => {
      // Arrange
      req.body = {
        username: 'test',
        password: 'secret',
        token: 'abc123',
        apiKey: 'xyz789',
        normalField: 'value',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedBody = (mockLogger.info as jest.Mock).mock.calls[0][1].body;
      expect(loggedBody.password).toBe('[REDACTED]');
      expect(loggedBody.token).toBe('[REDACTED]');
      expect(loggedBody.apiKey).toBe('[REDACTED]');
      expect(loggedBody.normalField).toBe('value');
    });

    it('should use allowlist when provided', () => {
      // Arrange
      req.headers = {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
        'authorization': 'Bearer token',
      };

      // Act
      const middleware = createRequestLoggingMiddleware({
        allowedHeaders: ['content-type', 'user-agent'],
      });
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedHeaders = (mockLogger.info as jest.Mock).mock.calls[0][1].headers;
      expect(loggedHeaders).toHaveProperty('content-type');
      expect(loggedHeaders).toHaveProperty('user-agent');
      expect(loggedHeaders).not.toHaveProperty('authorization');
    });

    it('should use custom excluded headers', () => {
      // Arrange
      req.headers = {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
        'x-custom': 'custom-value',
      };

      // Act
      const middleware = createRequestLoggingMiddleware({
        excludedHeaders: ['x-custom'],
      });
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedHeaders = (mockLogger.info as jest.Mock).mock.calls[0][1].headers;
      expect(loggedHeaders).toHaveProperty('content-type');
      expect(loggedHeaders).toHaveProperty('user-agent');
      expect(loggedHeaders).not.toHaveProperty('x-custom');
    });

    it('should use custom excluded body fields', () => {
      // Arrange
      req.body = {
        username: 'test',
        secretField: 'secret',
        normalField: 'value',
      };

      // Act
      const middleware = createRequestLoggingMiddleware({
        excludedBodyFields: ['secretField'],
      });
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedBody = (mockLogger.info as jest.Mock).mock.calls[0][1].body;
      expect(loggedBody.secretField).toBe('[REDACTED]');
      expect(loggedBody.normalField).toBe('value');
    });

    it('should use custom log level', () => {
      // Act
      const middleware = createRequestLoggingMiddleware({ logLevel: LogLevel.DEBUG });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should skip logging when disabled', () => {
      // Act
      const middleware = createRequestLoggingMiddleware({ enabled: false });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing correlation ID header', () => {
      // Arrange
      req.headers = {} as any;

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect((req as any).correlationId).toBe('mock-uuid');
    });

    it('should use correlation ID from header when present', () => {
      // Arrange
      req.headers = {
        'x-correlation-id': 'existing-id',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect((req as any).correlationId).toBe('existing-id');
    });

    it('should handle logging errors gracefully', () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logging error');
      });

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Request logging error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should use custom correlation ID header name', () => {
      // Arrange
      req.headers = {
        'x-custom-id': 'custom-id',
      };

      // Act
      const middleware = createRequestLoggingMiddleware({
        correlationIdHeader: 'X-Custom-ID',
      });
      middleware(req as Request, res as Response, next);

      // Assert
      expect((req as any).correlationId).toBe('custom-id');
    });

    it('should handle nested objects in body', () => {
      // Arrange
      req.body = {
        user: {
          username: 'test',
          password: 'secret',
          profile: {
            email: 'test@example.com',
            ssn: '123-45-6789',
          },
        },
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedBody = (mockLogger.info as jest.Mock).mock.calls[0][1].body;
      expect(loggedBody.user.username).toBe('test');
      expect(loggedBody.user.password).toBe('[REDACTED]');
      expect(loggedBody.user.profile.email).toBe('test@example.com');
      expect(loggedBody.user.profile.ssn).toBe('[REDACTED]');
    });

    it('should handle arrays in body', () => {
      // Arrange
      req.body = {
        items: [
          { name: 'item1', password: 'secret1' },
          { name: 'item2', password: 'secret2' },
        ],
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedBody = (mockLogger.info as jest.Mock).mock.calls[0][1].body;
      expect(loggedBody.items[0].name).toBe('item1');
      expect(loggedBody.items[0].password).toBe('[REDACTED]');
    });
  });

  // ============================================================================
  // Response Logging Middleware Tests
  // ============================================================================

  describe('Response Logging Middleware', () => {
    it('should log response with default configuration', async () => {
      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(next).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Response 200 for GET /api/v1/brands'),
        expect.objectContaining({
          statusCode: 200,
          correlationId: expect.any(String),
        })
      );
    });

    it('should calculate response time', async () => {
      // Arrange
      (req as any).requestStartTime = Date.now() - 100;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const loggedData = (mockLogger.debug as jest.Mock).mock.calls[0][1];
      expect(loggedData.responseTime).toBeGreaterThanOrEqual(100);
    });

    it('should use correlation ID from request', async () => {
      // Arrange
      (req as any).correlationId = 'test-id';

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.setCorrelationId).toHaveBeenCalledWith('test-id');
      expect(mockLogger.clearCorrelationId).toHaveBeenCalled();
    });

    it('should use debug level for 2xx status codes', async () => {
      // Arrange
      res.statusCode = 200;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should use info level for 3xx status codes', async () => {
      // Arrange
      res.statusCode = 301;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should use warn level for 4xx status codes', async () => {
      // Arrange
      res.statusCode = 404;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should use error level for 5xx status codes', async () => {
      // Arrange
      res.statusCode = 500;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use custom log level by status', async () => {
      // Arrange
      res.statusCode = 200;

      // Act
      const middleware = createResponseLoggingMiddleware({
        logLevelByStatus: {
          success: LogLevel.INFO,
          redirect: LogLevel.WARN,
          clientError: LogLevel.ERROR,
          serverError: LogLevel.ERROR,
        },
      });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should log content length when available', async () => {
      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          contentLength: 1234,
        })
      );
    });

    it('should filter sensitive response headers', async () => {
      // Arrange
      (res.getHeaders as jest.Mock).mockReturnValue({
        'content-type': 'application/json',
        'authorization': 'Bearer token',
        'set-cookie': 'session=abc',
      });

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const loggedHeaders = (mockLogger.debug as jest.Mock).mock.calls[0][1].headers;
      expect(loggedHeaders).toHaveProperty('content-type');
      expect(loggedHeaders).not.toHaveProperty('authorization');
      expect(loggedHeaders).not.toHaveProperty('set-cookie');
    });

    it('should filter sensitive response body fields', async () => {
      // Arrange
      const responseBody = {
        success: true,
        data: {
          username: 'test',
          password: 'secret',
        },
      };
      (res.json as jest.Mock).mockImplementation(function (this: Response, body: any) {
        return this;
      });

      // Act
      const middleware = createResponseLoggingMiddleware({ logBody: true });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const loggedBody = (mockLogger.debug as jest.Mock).mock.calls[0][1].body;
      expect(loggedBody.data.username).toBe('test');
      expect(loggedBody.data.password).toBe('[REDACTED]');
    });

    it('should skip logging when disabled', async () => {
      // Act
      const middleware = createResponseLoggingMiddleware({ enabled: false });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogger.debug.mockImplementation(() => {
        throw new Error('Logging error');
      });

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(next).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Response logging error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing correlation ID', async () => {
      // Arrange
      delete (req as any).correlationId;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.setCorrelationId).not.toHaveBeenCalled();
    });

    it('should handle response without request start time', async () => {
      // Arrange
      delete (req as any).requestStartTime;

      // Act
      const middleware = createResponseLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const loggedData = (mockLogger.debug as jest.Mock).mock.calls[0][1];
      expect(loggedData.responseTime).toBe(0);
    });
  });

  // ============================================================================
  // Combined Logging Middleware Tests
  // ============================================================================

  describe('Combined Logging Middleware', () => {
    it('should apply both request and response logging', async () => {
      // Act
      const middleware = createLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.info).toHaveBeenCalled(); // Request log
      expect(mockLogger.debug).toHaveBeenCalled(); // Response log
    });

    it('should use same correlation ID for request and response', async () => {
      // Act
      const middleware = createLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const requestCorrelationId = (mockLogger.info as jest.Mock).mock.calls[0][1].correlationId;
      const responseCorrelationId = (mockLogger.debug as jest.Mock).mock.calls[0][1].correlationId;
      expect(requestCorrelationId).toBe(responseCorrelationId);
    });

    it('should pass custom logger to both middlewares', async () => {
      // Arrange
      const customLogger = {
        ...mockLogger,
        info: jest.fn(),
        debug: jest.fn(),
      };

      // Act
      const middleware = createLoggingMiddleware({ logger: customLogger as any });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(customLogger.info).toHaveBeenCalled();
      expect(customLogger.debug).toHaveBeenCalled();
    });

    it('should apply request configuration', async () => {
      // Act
      const middleware = createLoggingMiddleware({
        request: {
          logBody: false,
          logHeaders: false,
        },
      });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const requestLog = (mockLogger.info as jest.Mock).mock.calls[0][1];
      expect(requestLog.body).toBeUndefined();
      expect(requestLog.headers).toBeUndefined();
    });

    it('should apply response configuration', async () => {
      // Act
      const middleware = createLoggingMiddleware({
        response: {
          logBody: true,
          logHeaders: false,
        },
      });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      const responseLog = (mockLogger.debug as jest.Mock).mock.calls[0][1];
      expect(responseLog.body).toBeDefined();
      expect(responseLog.headers).toBeUndefined();
    });

    it('should skip logging when disabled', async () => {
      // Act
      const middleware = createLoggingMiddleware({ enabled: false });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should handle request middleware errors', async () => {
      // Act
      const middleware = createLoggingMiddleware({
        request: { enabled: false },
        response: { enabled: false },
      });
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should use default configuration when none provided', async () => {
      // Act
      const middleware = createLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle error in request middleware', async () => {
      // Act
      const middleware = createLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Wait for finish event
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty body', async () => {
      // Arrange
      req.body = {};

      // Act
      const middleware = createRequestLoggingMiddleware({ logBody: true });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle null body', async () => {
      // Arrange
      req.body = null;

      // Act
      const middleware = createRequestLoggingMiddleware({ logBody: true });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle undefined body', async () => {
      // Arrange
      delete req.body;

      // Act
      const middleware = createRequestLoggingMiddleware({ logBody: true });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle empty headers', async () => {
      // Arrange
      req.headers = {} as any;

      // Act
      const middleware = createRequestLoggingMiddleware({ logHeaders: true });
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle very long URLs', async () => {
      // Arrange
      const longUrl = '/a'.repeat(1000);
      req.url = longUrl;
      req.originalUrl = longUrl;

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle special characters in headers', async () => {
      // Arrange
      req.headers = {
        'x-custom': 'value with spaces and special chars: !@#$%',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle Unicode in body', async () => {
      // Arrange
      req.body = {
        message: 'Привет мир 🌍',
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle very deep nested objects', async () => {
      // Arrange
      req.body = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  password: 'secret',
                },
              },
            },
          },
        },
      };

      // Act
      const middleware = createRequestLoggingMiddleware();
      middleware(req as Request, res as Response, next);

      // Assert
      const loggedBody = (mockLogger.info as jest.Mock).mock.calls[0][1].body;
      expect(loggedBody.level1.level2.level3.level4.level5.password).toBe('[REDACTED]');
    });
  });
});
