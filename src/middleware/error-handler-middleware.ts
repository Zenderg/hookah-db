import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { LoggerFactory } from '../utils';
import { ErrorLogMetadata, LogLevel } from '../types';

/**
 * Custom API error interface with additional properties.
 * 
 * Extends the standard Error interface with properties for HTTP status codes
 * and operational error flags.
 */
export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errorCode?: string;
  context?: Record<string, any>;
}

/**
 * Configuration options for error handler middleware
 */
export interface ErrorHandlerConfig {
  /** Enable/disable error logging (default: true) */
  enabled?: boolean;
  /** Include stack traces in logs (default: true) */
  logStackTraces?: boolean;
  /** Include request details in logs (default: true) */
  logRequestDetails?: boolean;
  /** Custom logger instance (default: uses environment logger) */
  logger?: ReturnType<typeof LoggerFactory.createEnvironmentLogger>;
}

/**
 * Get default logger instance (lazy initialization)
 */
function getDefaultLogger() {
  return LoggerFactory.createEnvironmentLogger('api');
}

/**
 * Get default configuration
 */
function getDefaultConfig(): Omit<Required<ErrorHandlerConfig>, 'logger'> {
  return {
    enabled: true,
    logStackTraces: true,
    logRequestDetails: true,
  };
}

/**
 * Extract API key from request and mask it
 * @param req Express request object
 * @returns Masked API key or undefined
 */
function extractApiKey(req: Request): string | undefined {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    return undefined;
  }

  // Mask API key - show first 4 and last 4 characters
  if (apiKey.length <= 8) {
    return '****';
  }

  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Determine to appropriate log level based on error type
 * @param err Error object
 * @param statusCode HTTP status code
 * @returns Appropriate log level
 */
function determineLogLevel(err: Error | ApiError, statusCode: number): LogLevel {
  const apiError = err as ApiError;

  // Check if error is explicitly marked as operational
  if (apiError.isOperational === true) {
    return LogLevel.WARN;
  }

  // 5xx status codes indicate server errors
  if (statusCode >= 500) {
    return LogLevel.ERROR;
  }

  // 4xx status codes indicate client errors
  if (statusCode >= 400) {
    return LogLevel.WARN;
  }

  // Default to error for unexpected issues
  return LogLevel.ERROR;
}

/**
 * Error handling middleware to provide consistent error responses.
 * 
 * This middleware should be registered after all routes to catch any errors.
 * It provides consistent JSON error responses with appropriate HTTP status codes
 * and comprehensive structured logging.
 * 
 * Features:
 * - Maps common error types to appropriate HTTP status codes
 * - Includes stack traces only in development environment (in responses)
 * - Logs errors with comprehensive metadata using structured logger
 * - Supports custom error status codes via ApiError interface
 * - Tracks correlation IDs for request tracing
 * - Masks sensitive information (API keys)
 * - Determines appropriate log levels based on error type
 * 
 * Logging includes:
 * - Error name and message
 * - Stack trace (configurable)
 * - HTTP status code
 * - Error code (if available)
 * - Whether error is operational (expected)
 * - Error context (additional metadata)
 * - Request information (method, URL, correlation ID)
 * - API key (masked)
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { errorHandler } from './middleware/error-handler-middleware';
 * 
 * const app = express();
 * 
 * // Define routes
 * app.get('/api/brands', (req, res) => {
 *   throw new Error('Something went wrong');
 * });
 * 
 * // Register error handler after all routes
 * app.use(errorHandler);
 * ```
 * 
 * @example
 * ```typescript
 * // Custom configuration
 * import { createErrorHandlerMiddleware } from './middleware/error-handler-middleware';
 * 
 * app.use(createErrorHandlerMiddleware({
 *   logStackTraces: false,
 *   logRequestDetails: true,
 * }));
 * ```
 * 
 * @param config Optional configuration options
 * @returns Express error handler middleware
 */
export function createErrorHandlerMiddleware(config?: ErrorHandlerConfig): ErrorRequestHandler {
  const defaultConfig = getDefaultConfig();
  const finalConfig: Required<ErrorHandlerConfig> = {
    enabled: config?.enabled ?? defaultConfig.enabled,
    logStackTraces: config?.logStackTraces ?? defaultConfig.logStackTraces,
    logRequestDetails: config?.logRequestDetails ?? defaultConfig.logRequestDetails,
    logger: config?.logger ?? getDefaultLogger(),
  };

  return (
    err: Error | ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    // Determine the HTTP status code
    const statusCode = (err as ApiError).statusCode || 500;
    const apiError = err as ApiError;

    // Build the error response object
    const errorResponse: {
      error: string;
      message?: string;
      stack?: string;
    } = {
      error: err.name || 'Internal Server Error',
    };

    // Include error message if available
    if (err.message) {
      errorResponse.message = err.message;
    }

    // Include stack trace only in development environment
    if (process.env.NODE_ENV !== 'production' && err.stack) {
      errorResponse.stack = err.stack;
    }

    // Log the error with comprehensive metadata
    if (finalConfig.enabled) {
      try {
        // Determine appropriate log level
        const logLevel = determineLogLevel(err, statusCode);

        // Get correlation ID from request
        const correlationId = (req as any).correlationId;

        // Build error metadata
        const errorMetadata: ErrorLogMetadata = {
          timestamp: new Date().toISOString(),
          level: logLevel,
          message: `Error occurred: ${req.method} ${req.url}`,
          correlationId,
          errorName: err.name,
          errorMessage: err.message,
          statusCode,
          isOperational: apiError.isOperational ?? false,
        };

        // Add stack trace if enabled and available
        if (finalConfig.logStackTraces && err.stack) {
          errorMetadata.stackTrace = err.stack;
        }

        // Add error code if available
        if (apiError.errorCode) {
          errorMetadata.errorCode = apiError.errorCode;
        }

        // Add error context if available
        if (apiError.context && Object.keys(apiError.context).length > 0) {
          errorMetadata.errorContext = apiError.context;
        }

        // Add request details if enabled
        if (finalConfig.logRequestDetails) {
          errorMetadata.request = {
            timestamp: new Date().toISOString(),
            level: logLevel,
            message: `Request that caused error: ${req.method} ${req.url}`,
            correlationId,
            method: req.method,
            url: req.url,
            fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            protocol: req.protocol,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
          };

          // Add masked API key if present
          const apiKey = extractApiKey(req);
          if (apiKey) {
            errorMetadata.request.apiKey = apiKey;
          }

          // Add query parameters if present
          if (Object.keys(req.query).length > 0) {
            errorMetadata.request.query = req.query;
          }

          // Add route parameters if present
          if (Object.keys(req.params).length > 0) {
            errorMetadata.request.params = req.params;
          }
        }

        // Set correlation ID in logger for this log entry
        if (correlationId) {
          finalConfig.logger.setCorrelationId(correlationId);
        }

        // Log the error with appropriate level
        switch (logLevel) {
          case LogLevel.ERROR:
            finalConfig.logger.error(errorMetadata.message, errorMetadata);
            break;
          case LogLevel.WARN:
            finalConfig.logger.warn(errorMetadata.message, errorMetadata);
            break;
          default:
            finalConfig.logger.error(errorMetadata.message, errorMetadata);
            break;
        }

        // Clear correlation ID after logging
        if (correlationId) {
          finalConfig.logger.clearCorrelationId();
        }
      } catch (logError) {
        // If logging fails, fall back to console.error to ensure error is not lost
        console.error('Error logging failed:', logError);
        console.error(`[${new Date().toISOString()}] Error: ${req.method} ${req.url}`);
        console.error(`Status: ${statusCode}`);
        console.error(`Error: ${err.message}`);
        
        if (process.env.NODE_ENV !== 'production' && err.stack) {
          console.error(`Stack: ${err.stack}`);
        }
      }
    }

    // Send the response with appropriate status code and JSON body
    res.status(statusCode).json(errorResponse);
  };
}

/**
 * Default error handler middleware instance
 * Uses default configuration
 */
export const errorHandler: ErrorRequestHandler = createErrorHandlerMiddleware();

export default errorHandler;
