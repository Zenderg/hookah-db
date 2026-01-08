import { Request, Response, NextFunction } from 'express';
import { LoggerFactory } from '../utils';
import { ResponseLogMetadata, LogLevel } from '../types';

/**
 * Configuration options for response logging middleware
 */
export interface ResponseLoggingConfig {
  /** Enable/disable response logging (default: true) */
  enabled?: boolean;
  /** Log level mapping for different status code ranges (default: see below) */
  logLevelByStatus?: {
    /** Log level for 2xx status codes (default: 'debug') */
    success?: LogLevel;
    /** Log level for 3xx status codes (default: 'info') */
    redirect?: LogLevel;
    /** Log level for 4xx status codes (default: 'warn') */
    clientError?: LogLevel;
    /** Log level for 5xx status codes (default: 'error') */
    serverError?: LogLevel;
  };
  /** Enable/disable body logging (default: false) */
  logBody?: boolean;
  /** Enable/disable headers logging (default: true) */
  logHeaders?: boolean;
  /** Headers to log (allowlist). If empty, logs all headers (default: []) */
  allowedHeaders?: string[];
  /** Headers to exclude from logging (blocklist) (default: []) */
  excludedHeaders?: string[];
  /** Fields to exclude from body (sensitive data) (default: ['password', 'token', 'apiKey', 'api_key', 'secret']) */
  excludedBodyFields?: string[];
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
function getDefaultConfig(): Omit<Required<ResponseLoggingConfig>, 'logger'> {
  return {
    enabled: true,
    logLevelByStatus: {
      success: LogLevel.DEBUG,
      redirect: LogLevel.INFO,
      clientError: LogLevel.WARN,
      serverError: LogLevel.ERROR,
    },
    logBody: false,
    logHeaders: true,
    allowedHeaders: [],
    excludedHeaders: [],
    excludedBodyFields: ['password', 'token', 'apiKey', 'api_key', 'secret', 'creditCard', 'ssn'],
  };
}

/**
 * Sanitize headers by filtering sensitive data
 * @param headers Response headers
 * @param config Response logging configuration
 * @returns Sanitized headers
 */
function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
  config: Required<ResponseLoggingConfig>
): Record<string, string | string[] | undefined> {
  const sanitized: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Check if header is in blocklist
    if (config.excludedHeaders.some(h => h.toLowerCase() === lowerKey)) {
      continue;
    }

    // If allowlist is specified, only include headers in allowlist
    if (config.allowedHeaders.length > 0) {
      if (!config.allowedHeaders.some(h => h.toLowerCase() === lowerKey)) {
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Sanitize body by filtering sensitive data
 * @param body Response body
 * @param config Response logging configuration
 * @returns Sanitized body
 */
function sanitizeBody(
  body: any,
  config: Required<ResponseLoggingConfig>
): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized: any = Array.isArray(body) ? [] : {};

  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase();

    // Check if field is in excluded fields list
    if (config.excludedBodyFields.some(f => f.toLowerCase() === lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeBody(value, config);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Determine log level based on status code
 * @param statusCode HTTP status code
 * @param config Response logging configuration
 * @returns Appropriate log level
 */
function getLogLevelByStatus(
  statusCode: number,
  config: Required<ResponseLoggingConfig>
): LogLevel {
  const logLevels = config.logLevelByStatus;
  
  if (statusCode >= 500) {
    return logLevels.serverError || LogLevel.ERROR;
  } else if (statusCode >= 400) {
    return logLevels.clientError || LogLevel.WARN;
  } else if (statusCode >= 300) {
    return logLevels.redirect || LogLevel.INFO;
  } else {
    return logLevels.success || LogLevel.DEBUG;
  }
}

/**
 * Calculate response time in milliseconds
 * @param req Express request object
 * @returns Response time in milliseconds
 */
function getResponseTime(req: Request): number {
  const startTime = (req as any).requestStartTime;
  if (!startTime) {
    return 0;
  }
  return Date.now() - startTime;
}

/**
 * Response logging middleware factory
 * Creates middleware for logging HTTP responses
 * 
 * Features:
 * - Logs status code, response time, content length
 * - Configurable header logging with allowlist/blocklist
 * - Configurable body logging with sensitive data filtering
 * - Automatic log level selection based on status code
 * - Correlation ID tracking from request
 * - Response time calculation from request start time
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { createResponseLoggingMiddleware } from './middleware/response-logging-middleware';
 * 
 * const app = express();
 * app.use(createResponseLoggingMiddleware());
 * ```
 * 
 * @example
 * ```typescript
 * // Custom configuration
 * app.use(createResponseLoggingMiddleware({
 *   logBody: true,
 *   logLevelByStatus: {
 *     success: 'info',
 *     clientError: 'error',
 *   },
 * }));
 * ```
 * 
 * @param config Optional configuration options
 * @returns Express middleware function
 */
export function createResponseLoggingMiddleware(config?: ResponseLoggingConfig) {
  const defaultConfig = getDefaultConfig();
  const finalConfig: Required<ResponseLoggingConfig> = {
    enabled: config?.enabled ?? defaultConfig.enabled,
    logLevelByStatus: {
      success: config?.logLevelByStatus?.success ?? defaultConfig.logLevelByStatus.success,
      redirect: config?.logLevelByStatus?.redirect ?? defaultConfig.logLevelByStatus.redirect,
      clientError: config?.logLevelByStatus?.clientError ?? defaultConfig.logLevelByStatus.clientError,
      serverError: config?.logLevelByStatus?.serverError ?? defaultConfig.logLevelByStatus.serverError,
    },
    logBody: config?.logBody ?? defaultConfig.logBody,
    logHeaders: config?.logHeaders ?? defaultConfig.logHeaders,
    allowedHeaders: config?.allowedHeaders ?? defaultConfig.allowedHeaders,
    excludedHeaders: config?.excludedHeaders ?? defaultConfig.excludedHeaders,
    excludedBodyFields: config?.excludedBodyFields ?? defaultConfig.excludedBodyFields,
    logger: config?.logger ?? getDefaultLogger(),
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!finalConfig.enabled) {
      next();
      return;
    }

    try {
      // Store original res.json to intercept response body
      const originalJson = res.json.bind(res);
      let responseBody: any = undefined;

      // Override res.json to capture response body
      res.json = function (body: any): Response {
        responseBody = body;
        return originalJson(body);
      };

      // Store original res.send to intercept response body
      const originalSend = res.send.bind(res);
      res.send = function (body: any): Response {
        if (typeof body !== 'string') {
          responseBody = body;
        }
        return originalSend(body);
      };

      // Listen for response finish event
      res.on('finish', () => {
        try {
          // Get correlation ID from request
          const correlationId = (req as any).correlationId;

          // Set correlation ID in logger
          if (correlationId) {
            finalConfig.logger.setCorrelationId(correlationId);
          }

          // Calculate response time
          const responseTime = getResponseTime(req);

          // Determine log level based on status code
          const logLevel = getLogLevelByStatus(res.statusCode, finalConfig);

          // Build response metadata
          const metadata: ResponseLogMetadata = {
            timestamp: new Date().toISOString(),
            level: logLevel,
            message: `Response ${res.statusCode} for ${req.method} ${req.url}`,
            correlationId,
            statusCode: res.statusCode,
            responseTime,
          };

          // Add content length if available
          const contentLength = res.get('Content-Length');
          if (contentLength) {
            metadata.contentLength = parseInt(contentLength, 10);
          }

          // Add headers if enabled
          if (finalConfig.logHeaders) {
            const headers: Record<string, string | string[] | undefined> = {};
            for (const [key, value] of Object.entries(res.getHeaders())) {
              headers[key] = value as string | string[] | undefined;
            }
            metadata.headers = sanitizeHeaders(headers, finalConfig);
          }

          // Add body if enabled and captured
          if (finalConfig.logBody && responseBody !== undefined) {
            metadata.body = sanitizeBody(responseBody, finalConfig);
          }

          // Log the response
          switch (logLevel) {
            case LogLevel.ERROR:
              finalConfig.logger.error(metadata.message, metadata);
              break;
            case LogLevel.WARN:
              finalConfig.logger.warn(metadata.message, metadata);
              break;
            case LogLevel.DEBUG:
              finalConfig.logger.debug(metadata.message, metadata);
              break;
            case LogLevel.VERBOSE:
              finalConfig.logger.verbose(metadata.message, metadata);
              break;
            case LogLevel.SILLY:
              finalConfig.logger.silly(metadata.message, metadata);
              break;
            case LogLevel.HTTP:
              finalConfig.logger.http(metadata.message, metadata);
              break;
            case LogLevel.INFO:
            default:
              finalConfig.logger.info(metadata.message, metadata);
              break;
          }

          // Clear correlation ID from logger after logging
          finalConfig.logger.clearCorrelationId();
        } catch (error) {
          // Log errors but don't break response
          console.error('Response logging error:', error);
        }
      });

      next();
    } catch (error) {
      // Log errors but don't break request
      console.error('Response logging middleware error:', error);
      next();
    }
  };
}

/**
 * Default response logging middleware instance
 * Uses default configuration
 */
export const responseLoggingMiddleware = createResponseLoggingMiddleware();

export default responseLoggingMiddleware;
