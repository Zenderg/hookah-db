import { LogLevel } from './log-levels';

/**
 * Base log metadata interface
 * Contains common fields for all log entries
 */
export interface LogMetadata {
  /** Timestamp when the log was created (ISO 8601 format) */
  timestamp: string;
  /** Log level severity */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Unique identifier for the log entry */
  id?: string;
  /** Application or service name */
  service?: string;
  /** Environment (development, staging, production) */
  environment?: string;
  /** Correlation ID for tracking requests across services */
  correlationId?: string;
  /** Additional context-specific data */
  [key: string]: any;
}

/**
 * HTTP request log metadata
 * Contains information about incoming HTTP requests
 */
export interface RequestLogMetadata extends LogMetadata {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;
  /** Request URL path */
  url: string;
  /** Full URL with query parameters */
  fullUrl?: string;
  /** Request protocol (http, https) */
  protocol?: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Request headers */
  headers?: Record<string, string | string[] | undefined>;
  /** Request body (sanitized) */
  body?: any;
  /** Query parameters */
  query?: Record<string, any>;
  /** Request parameters */
  params?: Record<string, any>;
  /** API key used for authentication (masked) */
  apiKey?: string;
}

/**
 * HTTP response log metadata
 * Contains information about HTTP responses
 */
export interface ResponseLogMetadata extends LogMetadata {
  /** HTTP status code */
  statusCode: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Response size in bytes */
  contentLength?: number;
  /** Response headers */
  headers?: Record<string, string | string[] | undefined>;
  /** Response body (sanitized) */
  body?: any;
}

/**
 * Error log metadata
 * Contains detailed error information
 */
export interface ErrorLogMetadata extends LogMetadata {
  /** Error name/type */
  errorName?: string;
  /** Error message */
  errorMessage?: string;
  /** Error stack trace */
  stackTrace?: string;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Error code (custom application error code) */
  errorCode?: string;
  /** Whether the error is operational (expected) or programming error */
  isOperational?: boolean;
  /** Additional error context */
  errorContext?: Record<string, any>;
  /** Request metadata if error occurred during HTTP request */
  request?: RequestLogMetadata;
}

/**
 * Scheduler job log metadata
 * Contains information about scheduled job execution
 */
export interface SchedulerLogMetadata extends LogMetadata {
  /** Job name/identifier */
  jobName: string;
  /** Cron expression for the job */
  cronExpression?: string;
  /** Job execution status (started, completed, failed) */
  status: 'started' | 'completed' | 'failed';
  /** Execution duration in milliseconds */
  duration?: number;
  /** Number of items processed */
  itemsProcessed?: number;
  /** Number of items that failed */
  itemsFailed?: number;
  /** Next scheduled execution time */
  nextExecution?: string;
  /** Previous execution time */
  previousExecution?: string;
  /** Additional job-specific data */
  jobData?: Record<string, any>;
}

/**
 * Cache operation log metadata
 * Contains information about cache operations
 */
export interface CacheLogMetadata extends LogMetadata {
  /** Cache operation type */
  operation: 'get' | 'set' | 'delete' | 'clear' | 'flush' | 'has' | 'keys';
  /** Cache key */
  key?: string;
  /** Cache namespace (if applicable) */
  namespace?: string;
  /** Operation success status */
  success: boolean;
  /** Cache hit or miss (for get operations) */
  hit?: boolean;
  /** TTL (time to live) in seconds (for set operations) */
  ttl?: number;
  /** Value size in bytes (for set operations) */
  valueSize?: number;
  /** Number of keys affected (for clear/flush operations) */
  keysCount?: number;
  /** Operation duration in milliseconds */
  duration?: number;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Scraper operation log metadata
 * Contains information about web scraping operations
 */
export interface ScraperLogMetadata extends LogMetadata {
  /** Scraper operation type */
  operation: 'scrape' | 'parse' | 'fetch' | 'retry';
  /** Target URL being scraped */
  url?: string;
  /** Brand slug (if scraping brand data) */
  brandSlug?: string;
  /** Flavor slug (if scraping flavor data) */
  flavorSlug?: string;
  /** Number of items scraped */
  itemsScraped?: number;
  /** Number of items parsed */
  itemsParsed?: number;
  /** Number of items that failed */
  itemsFailed?: number;
  /** HTTP status code from response */
  statusCode?: number;
  /** Response size in bytes */
  responseSize?: number;
  /** Number of retry attempts */
  retryAttempt?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Scraping duration in milliseconds */
  duration?: number;
  /** Error message if operation failed */
  error?: string;
  /** Additional scraping context */
  context?: Record<string, any>;
}
