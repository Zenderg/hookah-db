import { Request, Response, NextFunction } from 'express';
import { LoggerFactory } from '@hookah-db/utils';
import { RequestLogMetadata, LogLevel } from '@hookah-db/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for request logging middleware
 */
export interface RequestLoggingConfig {
  /** Enable/disable request logging (default: true) */
  enabled?: boolean;
  /** Log level for request logs (default: 'info') */
  logLevel?: LogLevel;
  /** Enable/disable body logging (default: true) */
  logBody?: boolean;
  /** Enable/disable headers logging (default: true) */
  logHeaders?: boolean;
  /** Headers to log (allowlist). If empty, logs all headers (default: []) */
  allowedHeaders?: string[];
  /** Headers to exclude from logging (blocklist) (default: ['authorization', 'cookie']) */
  excludedHeaders?: string[];
  /** Fields to exclude from body (sensitive data) (default: ['password', 'token', 'apiKey', 'api_key', 'secret']) */
  excludedBodyFields?: string[];
  /** Enable/disable correlation ID generation (default: true) */
  generateCorrelationId?: boolean;
  /** Correlation ID header name (default: 'X-Correlation-ID') */
  correlationIdHeader?: string;
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
function getDefaultConfig(): Omit<Required<RequestLoggingConfig>, 'logger'> {
  return {
    enabled: true,
    logLevel: LogLevel.INFO,
    logBody: true,
    logHeaders: true,
    allowedHeaders: [],
    excludedHeaders: ['authorization', 'cookie', 'x-api-key'],
    excludedBodyFields: ['password', 'token', 'apiKey', 'api_key', 'secret', 'creditCard', 'ssn'],
    generateCorrelationId: true,
    correlationIdHeader: 'X-Correlation-ID',
  };
}

/**
 * Sanitize headers by filtering sensitive data
 * @param headers Request headers
 * @param config Request logging configuration
 * @returns Sanitized headers
 */
function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
  config: Required<RequestLoggingConfig>
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
 * @param body Request body
 * @param config Request logging configuration
 * @returns Sanitized body
 */
function sanitizeBody(
  body: any,
  config: Required<RequestLoggingConfig>
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
 * Generate or extract correlation ID
 * @param req Express request object
 * @param config Request logging configuration
 * @returns Correlation ID
 */
function getCorrelationId(req: Request, config: Required<RequestLoggingConfig>): string {
  // Check if correlation ID already exists in request
  const existingId = (req as any).correlationId;
  if (existingId) {
    return existingId;
  }

  // Try to extract from header
  const headerId = req.headers[config.correlationIdHeader.toLowerCase()];
  if (headerId && typeof headerId === 'string') {
    return headerId;
  }

  // Generate new ID if enabled
  if (config.generateCorrelationId) {
    return uuidv4();
  }

  return 'unknown';
}

/**
 * Request logging middleware factory
 * Creates middleware for logging incoming HTTP requests
 * 
 * Features:
 * - Logs method, URL, IP address, User-Agent
 * - Configurable header logging with allowlist/blocklist
 * - Configurable body logging with sensitive data filtering
 * - Query parameters and route parameters
 * - API key masking
 * - Correlation ID generation and tracking
 * - Request start time tracking for response time calculation
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { createRequestLoggingMiddleware } from './middleware/request-logging-middleware';
 * 
 * const app = express();
 * app.use(createRequestLoggingMiddleware());
 * ```
 * 
 * @example
 * ```typescript
 * // Custom configuration
 * app.use(createRequestLoggingMiddleware({
 *   logLevel: 'debug',
 *   logBody: false,
 *   allowedHeaders: ['content-type', 'user-agent'],
 * }));
 * ```
 * 
 * @param config Optional configuration options
 * @returns Express middleware function
 */
export function createRequestLoggingMiddleware(config?: RequestLoggingConfig) {
  const defaultConfig = getDefaultConfig();
  const finalConfig: Required<RequestLoggingConfig> = {
    enabled: config?.enabled ?? defaultConfig.enabled,
    logLevel: config?.logLevel ?? defaultConfig.logLevel,
    logBody: config?.logBody ?? defaultConfig.logBody,
    logHeaders: config?.logHeaders ?? defaultConfig.logHeaders,
    allowedHeaders: config?.allowedHeaders ?? defaultConfig.allowedHeaders,
    excludedHeaders: config?.excludedHeaders ?? defaultConfig.excludedHeaders,
    excludedBodyFields: config?.excludedBodyFields ?? defaultConfig.excludedBodyFields,
    generateCorrelationId: config?.generateCorrelationId ?? defaultConfig.generateCorrelationId,
    correlationIdHeader: config?.correlationIdHeader ?? defaultConfig.correlationIdHeader,
    logger: config?.logger ?? getDefaultLogger(),
  };

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!finalConfig.enabled) {
      next();
      return;
    }

    try {
      // Get or generate correlation ID
      const correlationId = getCorrelationId(req, finalConfig);
      
      // Attach correlation ID to request for downstream use
      (req as any).correlationId = correlationId;

      // Store request start time for response time calculation
      (req as any).requestStartTime = Date.now();

      // Set correlation ID in logger
      finalConfig.logger.setCorrelationId(correlationId);

      // Build request metadata
      const metadata: RequestLogMetadata = {
        timestamp: new Date().toISOString(),
        level: finalConfig.logLevel,
        message: `Incoming ${req.method} request to ${req.url}`,
        correlationId,
        method: req.method,
        url: req.url,
        fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        protocol: req.protocol,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      };

      // Add headers if enabled
      if (finalConfig.logHeaders) {
        metadata.headers = sanitizeHeaders(req.headers, finalConfig);
      }

      // Add body if enabled and present
      if (finalConfig.logBody && req.body) {
        metadata.body = sanitizeBody(req.body, finalConfig);
      }

      // Add query parameters if present
      if (Object.keys(req.query).length > 0) {
        metadata.query = sanitizeBody(req.query, finalConfig);
      }

      // Add route parameters if present
      if (Object.keys(req.params).length > 0) {
        metadata.params = req.params;
      }

      // Add masked API key if present
      const apiKey = extractApiKey(req);
      if (apiKey) {
        metadata.apiKey = apiKey;
      }

      // Log the request
      switch (finalConfig.logLevel) {
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
    } catch (error) {
      // Log errors but don't break the request
      console.error('Request logging error:', error);
    }

    next();
  };
}

/**
 * Default request logging middleware instance
 * Uses default configuration
 */
export const requestLoggingMiddleware = createRequestLoggingMiddleware();

export default requestLoggingMiddleware;
