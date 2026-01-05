import { Request, Response, NextFunction } from 'express';
import { LoggerFactory } from '@hookah-db/utils';
import {
  createRequestLoggingMiddleware,
  RequestLoggingConfig,
} from './request-logging-middleware';
import {
  createResponseLoggingMiddleware,
  ResponseLoggingConfig,
} from './response-logging-middleware';

/**
 * Configuration options for combined logging middleware
 * Combines request and response logging configuration
 */
export interface LoggingConfig {
  /** Request logging configuration */
  request?: RequestLoggingConfig;
  /** Response logging configuration */
  response?: ResponseLoggingConfig;
  /** Enable/disable both request and response logging (default: true) */
  enabled?: boolean;
  /** Custom logger instance (applied to both request and response) */
  logger?: ReturnType<typeof LoggerFactory.createEnvironmentLogger>;
}

/**
 * Get default logger instance (lazy initialization)
 */
function getDefaultLogger() {
  return LoggerFactory.createEnvironmentLogger('api');
}

/**
 * Default configuration for combined logging middleware
 */
const DEFAULT_CONFIG: Required<Omit<LoggingConfig, 'request' | 'response'>> = {
  enabled: true,
  logger: getDefaultLogger(),
};

/**
 * Combined logging middleware factory
 * Creates middleware that handles both request and response logging
 * 
 * This is a convenience middleware that combines request and response logging
 * into a single middleware function. It provides all the features of both
 * request and response logging middlewares.
 * 
 * Features:
 * - Logs incoming HTTP requests with metadata (method, URL, IP, headers, body, etc.)
 * - Logs HTTP responses with metadata (status code, response time, headers, body, etc.)
 * - Correlation ID generation and tracking across request/response
 * - Configurable header logging with allowlist/blocklist
 * - Configurable body logging with sensitive data filtering
 * - Automatic log level selection based on status code
 * - Response time calculation
 * - API key masking
 * - Query and route parameter logging
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { createLoggingMiddleware } from './middleware/logging-middleware';
 * 
 * const app = express();
 * app.use(createLoggingMiddleware());
 * ```
 * 
 * @example
 * ```typescript
 * // Custom configuration
 * app.use(createLoggingMiddleware({
 *   request: {
 *     logLevel: 'debug',
 *     logBody: false,
 *     allowedHeaders: ['content-type', 'user-agent'],
 *   },
 *   response: {
 *     logBody: true,
 *     logLevelByStatus: {
 *       success: 'info',
 *       clientError: 'error',
 *     },
 *   },
 * }));
 * ```
 * 
 * @example
 * ```typescript
 * // Disable logging for specific routes
 * app.use('/health', createLoggingMiddleware({ enabled: false }));
 * ```
 * 
 * @param config Optional configuration options
 * @returns Express middleware function
 */
export function createLoggingMiddleware(config?: LoggingConfig) {
  const finalConfig = {
    enabled: config?.enabled ?? DEFAULT_CONFIG.enabled,
    logger: config?.logger ?? DEFAULT_CONFIG.logger,
  };

  if (!finalConfig.enabled) {
    return (_req: Request, _res: Response, next: NextFunction): void => {
      next();
    };
  }

  // Apply logger to both request and response configs if provided
  const requestConfig: RequestLoggingConfig = {
    ...config?.request,
    logger: finalConfig.logger,
  };

  const responseConfig: ResponseLoggingConfig = {
    ...config?.response,
    logger: finalConfig.logger,
  };

  // Create request and response middlewares
  const requestMiddleware = createRequestLoggingMiddleware(requestConfig);
  const responseMiddleware = createResponseLoggingMiddleware(responseConfig);

  // Return combined middleware
  return (req: Request, res: Response, next: NextFunction): void => {
    // Apply request middleware
    requestMiddleware(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }

      // Apply response middleware
      responseMiddleware(req, res, next);
    });
  };
}

/**
 * Default combined logging middleware instance
 * Uses default configuration for both request and response logging
 */
export const loggingMiddleware = createLoggingMiddleware();

export default loggingMiddleware;
