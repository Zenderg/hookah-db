/**
 * Unit tests for error handler logging middleware
 * 
 * Tests error handler logging functionality including:
 * - Error logging with different error types
 * - Log level determination (operational vs unexpected)
 * - Error metadata logging
 * - Request metadata in error logs
 * - Stack trace logging
 * - API key masking in error logs
 * - Configuration options
 * - Correlation ID in error logs
 * - Logging failure handling
 */

import { Request, Response, NextFunction } from 'express';
import { createErrorHandlerMiddleware } from '../../src/middleware/error-handler-middleware';
import { LoggerFactory } from '../../src/utils';
import { LogLevel } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock LoggerFactory
jest.mock('../../src/utils', () => {
  return {
    LoggerFactory: {
      createEnvironmentLogger: jest.fn(),
    },
  };
});

// ============================================================================
// Test Suite
// ============================================================================

describe('Error Handler Logging Middleware', () => {
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
        'x-api-key': 'test-api-key-12345678',
      },
      query: { page: '1', limit: '10' },
      params: { id: '123' },
      body: { test: 'data' },
    };

    res = {
      statusCode: 500,
      status: jest.fn(function (this: Response, code: number) {
        this.statusCode = code;
        return this;
      }),
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
  // Basic Error Handling Tests
  // ============================================================================

  describe('Basic Error Handling', () => {
    it('should log error with default configuration', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error',
          message: 'Test error',
        })
      );
    });

    it('should use correlation ID from request', () => {
      // Arrange
      (req as any).correlationId = 'test-id';
      const error = new Error('Test error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.setCorrelationId).toHaveBeenCalledWith('test-id');
      expect(mockLogger.clearCorrelationId).toHaveBeenCalled();
    });

    it('should clear correlation ID after logging', () => {
      // Arrange
      (req as any).correlationId = 'test-id';
      const error = new Error('Test error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.clearCorrelationId).toHaveBeenCalled();
    });

    it('should handle missing correlation ID', () => {
      // Arrange
      delete (req as any).correlationId;
      const error = new Error('Test error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.setCorrelationId).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Type Tests
  // ============================================================================

  describe('Error Types', () => {
    it('should log generic Error', () => {
      // Arrange
      const error = new Error('Generic error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred: GET /api/v1/brands'),
        expect.objectContaining({
          errorName: 'Error',
          errorMessage: 'Generic error',
        })
      );
    });

    it('should log error with custom status code', () => {
      // Arrange
      const error = new Error('Not found') as any;
      error.statusCode = 404;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error',
          message: 'Not found',
        })
      );
    });

    it('should log error with custom error code', () => {
      // Arrange
      const error = new Error('Custom error') as any;
      error.errorCode = 'CUSTOM_ERROR';

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorCode: 'CUSTOM_ERROR',
        })
      );
    });

    it('should log error with stack trace', () => {
      // Arrange
      const error = new Error('Stack trace error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stackTrace: expect.any(String),
        })
      );
    });

    it('should handle error without stack trace', () => {
      // Arrange
      const error = new Error('No stack error');
      delete error.stack;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error without message', () => {
      // Arrange
      const error = new Error() as any;
      error.message = undefined;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle null error', () => {
      // Arrange
      const error = null as any;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle undefined error', () => {
      // Arrange
      const error = undefined as any;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle string error', () => {
      // Arrange
      const error = 'String error' as any;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle object error', () => {
      // Arrange
      const error = { message: 'Object error', code: 123 } as any;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Log Level Determination Tests
  // ============================================================================

  describe('Log Level Determination', () => {
    it('should use error level for 5xx status codes', () => {
      // Arrange
      const error = new Error('Server error') as any;
      error.statusCode = 500;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use warn level for 4xx status codes', () => {
      // Arrange
      const error = new Error('Client error') as any;
      error.statusCode = 404;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should use error level for unexpected errors', () => {
      // Arrange
      const error = new Error('Unexpected error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use warn level for operational errors', () => {
      // Arrange
      const error = new Error('Operational error') as any;
      error.statusCode = 400;
      error.isOperational = true;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should use error level for operational 5xx errors', () => {
      // Arrange
      const error = new Error('Operational server error') as any;
      error.statusCode = 500;
      error.isOperational = true;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Metadata Tests
  // ============================================================================

  describe('Error Metadata', () => {
    it('should log error metadata', () => {
      // Arrange
      const error = new Error('Error with metadata') as any;
      error.context = {
        userId: '123',
        action: 'create',
      };

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorContext: {
            userId: '123',
            action: 'create',
          },
        })
      );
    });

    it('should log error code', () => {
      // Arrange
      const error = new Error('Error with code') as any;
      error.errorCode = 'ERR_CODE_123';

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorCode: 'ERR_CODE_123',
        })
      );
    });

    it('should log error status code', () => {
      // Arrange
      const error = new Error('Error with status') as any;
      error.statusCode = 404;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it('should log error name', () => {
      // Arrange
      const error = new Error('Error with name');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorName: 'Error',
        })
      );
    });

    it('should log isOperational flag', () => {
      // Arrange
      const error = new Error('Operational error') as any;
      error.isOperational = true;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          isOperational: true,
        })
      );
    });

    it('should log isOperational as false for non-operational errors', () => {
      // Arrange
      const error = new Error('Non-operational error') as any;
      error.isOperational = false;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          isOperational: false,
        })
      );
    });
  });

  // ============================================================================
  // Request Metadata Tests
  // ============================================================================

  describe('Request Metadata', () => {
    it('should log request method', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'GET',
          }),
        })
      );
    });

    it('should log request URL', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            url: '/api/v1/brands',
          }),
        })
      );
    });

    it('should log request IP', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            ip: '127.0.0.1',
          }),
        })
      );
    });

    it('should log user agent', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            userAgent: 'test-agent',
          }),
        })
      );
    });

    it('should log query parameters', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            query: { page: '1', limit: '10' },
          }),
        })
      );
    });

    it('should log route parameters', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            params: { id: '123' },
          }),
        })
      );
    });

    it('should not log request details when disabled', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware({ logRequestDetails: false });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request).toBeUndefined();
    });

    it('should log full URL', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            fullUrl: 'http://test-value/api/v1/brands',
          }),
        })
      );
    });

    it('should log protocol', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            protocol: 'http',
          }),
        })
      );
    });
  });

  // ============================================================================
  // API Key Masking Tests
  // ============================================================================

  describe('API Key Masking', () => {
    it('should mask API key in request metadata', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request.apiKey).toBe('test...5678');
    });

    it('should mask short API key', () => {
      // Arrange
      req.headers = {
        ...req.headers,
        'x-api-key': 'short',
      };
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request.apiKey).toBe('****');
    });

    it('should not include API key when not present', () => {
      // Arrange
      delete req.headers['x-api-key'];
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request.apiKey).toBeUndefined();
    });

    it('should handle non-string API key', () => {
      // Arrange
      req.headers = {
        ...req.headers,
        'x-api-key': ['key1', 'key2'] as any,
      };
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request.apiKey).toBeUndefined();
    });
  });

  // ============================================================================
  // Configuration Options Tests
  // ============================================================================

  describe('Configuration Options', () => {
    it('should use custom logger', () => {
      // Arrange
      const customLogger = {
        ...mockLogger,
        error: jest.fn(),
      };
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware({ logger: customLogger as any });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(customLogger.error).toHaveBeenCalled();
    });

    it('should include stack trace when enabled', () => {
      // Arrange
      const error = new Error('Error with stack');

      // Act
      const errorHandler = createErrorHandlerMiddleware({ logStackTraces: true });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stackTrace: expect.any(String),
        })
      );
    });

    it('should not include stack trace when disabled', () => {
      // Arrange
      const error = new Error('Error with stack');

      // Act
      const errorHandler = createErrorHandlerMiddleware({ logStackTraces: false });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.stackTrace).toBeUndefined();
    });

    it('should include request details when enabled', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware({ logRequestDetails: true });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.any(Object),
        })
      );
    });

    it('should skip logging when disabled', () => {
      // Arrange
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware({ enabled: false });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should use all custom config options', () => {
      // Arrange
      const customLogger = {
        ...mockLogger,
        error: jest.fn(),
      };
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware({
        enabled: true,
        logStackTraces: false,
        logRequestDetails: true,
        logger: customLogger as any,
      });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(customLogger.error).toHaveBeenCalled();
      const loggedData = (customLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.stackTrace).toBeUndefined();
      expect(loggedData.request).toBeDefined();
    });
  });

  // ============================================================================
  // Stack Trace Tests
  // ============================================================================

  describe('Stack Trace', () => {
    it('should include stack trace by default', () => {
      // Arrange
      const error = new Error('Error with stack');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stackTrace: expect.any(String),
        })
      );
    });

    it('should handle error without stack trace', () => {
      // Arrange
      const error = new Error('Error without stack');
      delete error.stack;

      // Act
      const errorHandler = createErrorHandlerMiddleware({ logStackTraces: true });
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.stackTrace).toBeUndefined();
    });

    it('should include stack trace in response in non-production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new Error('Error with stack');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in response in production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new Error('Error with stack');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  // ============================================================================
  // Error Response Tests
  // ============================================================================

  describe('Error Response', () => {
    it('should return 500 status code for unexpected errors', () => {
      // Arrange
      const error = new Error('Unexpected error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return custom status code from error', () => {
      // Arrange
      const error = new Error('Not found') as any;
      error.statusCode = 404;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return error name in response', () => {
      // Arrange
      const error = new Error('Custom error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error',
        })
      );
    });

    it('should return error message in response', () => {
      // Arrange
      const error = new Error('Custom error message');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
        })
      );
    });

    it('should handle error without message', () => {
      // Arrange
      const error = new Error() as any;
      error.message = undefined;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.message).toBeUndefined();
    });
  });

  // ============================================================================
  // Logging Failure Handling Tests
  // ============================================================================

  describe('Logging Failure Handling', () => {
    it('should handle logging errors gracefully', () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLogger.error.mockImplementation(() => {
        throw new Error('Logging error');
      });
      const error = new Error('Original error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logging failed:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should still send error response when logging fails', () => {
      // Arrange
      mockLogger.error.mockImplementation(() => {
        throw new Error('Logging error');
      });
      const error = new Error('Original error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle logger being undefined', () => {
      // Arrange
      (LoggerFactory.createEnvironmentLogger as jest.Mock).mockReturnValue(undefined);
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle error with circular reference', () => {
      // Arrange
      const error = new Error('Circular error') as any;
      error.circular = error;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle error with very long message', () => {
      // Arrange
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with special characters', () => {
      // Arrange
      const error = new Error('Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with Unicode', () => {
      // Arrange
      const error = new Error('Ошибка с Unicode 🌍');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with very deep context', () => {
      // Arrange
      const error = new Error('Deep error') as any;
      error.context = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'deep',
                },
              },
            },
          },
        },
      };

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with array context', () => {
      // Arrange
      const error = new Error('Array error') as any;
      error.context = {
        items: [
          { id: 1, name: 'item1' },
          { id: 2, name: 'item2' },
        ],
      };

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with null context', () => {
      // Arrange
      const error = new Error('Null context error') as any;
      error.context = null;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with undefined context', () => {
      // Arrange
      const error = new Error('Undefined context error') as any;
      error.context = undefined;

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle error with empty context', () => {
      // Arrange
      const error = new Error('Empty context error') as any;
      error.context = {};

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.errorContext).toBeUndefined();
    });

    it('should handle missing request IP', () => {
      // Arrange
      delete (req as any).ip;
      delete req.socket;
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            ip: 'unknown',
          }),
        })
      );
    });

    it('should handle missing user agent', () => {
      // Arrange
      delete req.headers['user-agent'];
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            userAgent: 'unknown',
          }),
        })
      );
    });

    it('should handle empty query parameters', () => {
      // Arrange
      req.query = {};
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request.query).toBeUndefined();
    });

    it('should handle empty route parameters', () => {
      // Arrange
      req.params = {};
      const error = new Error('Error');

      // Act
      const errorHandler = createErrorHandlerMiddleware();
      errorHandler(error, req as Request, res as Response, next);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      const loggedData = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(loggedData.request.params).toBeUndefined();
    });
  });
});
