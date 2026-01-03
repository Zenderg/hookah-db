import got, {
  Got,
  Options,
  RequestError,
  Response,
  CancelableRequest,
} from 'got';
import { parserConfig, loggingConfig } from '@hookah-db/shared';

// ============================================
// Type Definitions
// ============================================

/**
 * Error types that can occur during HTTP requests
 */
export enum HttpErrorType {
  Network = 'network',
  Http = 'http',
  Timeout = 'timeout',
  Parse = 'parse',
  RateLimit = 'rate_limit',
}

/**
 * Custom error class for HTTP client errors
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly type: HttpErrorType,
    public readonly statusCode?: number,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'HttpClientError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * HTTP client configuration options
 */
export interface HttpClientOptions {
  /**
   * Base URL for all requests
   */
  baseUrl?: string;

  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;

  /**
   * Delay between requests in milliseconds (rate limiting)
   */
  requestDelayMs?: number;

  /**
   * Connection timeout in milliseconds
   */
  connectTimeout?: number;

  /**
   * Request timeout in milliseconds (time to receive first byte)
   */
  requestTimeout?: number;

  /**
   * Response timeout in milliseconds (time to receive complete response)
   */
  responseTimeout?: number;

  /**
   * HTTP status codes that should trigger a retry
   */
  retryStatusCodes?: number[];

  /**
   * Enable/disable logging
   */
  enableLogging?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<HttpClientOptions, 'baseUrl' | 'enableLogging'>> = {
  maxRetries: parserConfig.maxRetries,
  requestDelayMs: parserConfig.scrollDelayMs,
  connectTimeout: 10000, // 10 seconds
  requestTimeout: parserConfig.timeoutMs,
  responseTimeout: parserConfig.timeoutMs,
  retryStatusCodes: [429, 500, 502, 503, 504],
};

// ============================================
// Rate Limiter Implementation
// ============================================

/**
 * Simple rate limiter using sliding window algorithm
 */
class RateLimiter {
  private requestTimes: number[] = [];
  private delayMs: number;

  constructor(delayMs: number) {
    this.delayMs = delayMs;
  }

  /**
   * Wait if necessary to respect rate limit
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than the delay window
    this.requestTimes = this.requestTimes.filter(
      (time) => now - time < this.delayMs,
    );

    // If we have recent requests, wait until the oldest one is outside the window
    if (this.requestTimes.length > 0) {
      const oldestRequest = this.requestTimes[0];
      const timeSinceOldest = now - oldestRequest;

      if (timeSinceOldest < this.delayMs) {
        const waitTime = this.delayMs - timeSinceOldest;
        if (loggingConfig.level === 'debug') {
          console.debug(`[RateLimiter] Delaying request for ${waitTime}ms`);
        }
        await this.sleep(waitTime);
      }
    }

    // Record this request
    this.requestTimes.push(Date.now());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.requestTimes = [];
  }
}

// ============================================
// HTTP Client Implementation
// ============================================

/**
 * HTTP client with retry logic, rate limiting, and timeout handling
 */
export class HttpClient {
  private client: Got;
  private rateLimiter: RateLimiter;
  private config: Required<HttpClientOptions>;
  private enableLogging: boolean;

  constructor(options: HttpClientOptions = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options,
      baseUrl: options.baseUrl || parserConfig.baseUrl,
      enableLogging: options.enableLogging ?? true,
    };

    this.enableLogging = this.config.enableLogging;
    this.rateLimiter = new RateLimiter(this.config.requestDelayMs);

    // Initialize got client with configuration
    this.client = got.extend({
      prefixUrl: this.config.baseUrl,
      timeout: {
        connect: this.config.connectTimeout,
        request: this.config.requestTimeout,
        response: this.config.responseTimeout,
      },
      retry: {
        limit: this.config.maxRetries,
        methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'],
        statusCodes: this.config.retryStatusCodes,
        calculateDelay: this.calculateRetryDelay.bind(this),
        errorCodes: [
          'ETIMEDOUT',
          'ECONNRESET',
          'EADDRINUSE',
          'ECONNREFUSED',
          'EPIPE',
          'ENOTFOUND',
          'ENETUNREACH',
          'EAI_AGAIN',
        ],
        maxRetryAfter: undefined,
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; HookahDBParser/1.0; +https://github.com/hookah-db)',
      },
      hooks: {
        beforeRequest: [
          async (options) => {
            // Apply rate limiting before each request
            await this.rateLimiter.waitIfNeeded();

            if (this.enableLogging && loggingConfig.level === 'debug') {
              console.debug(
                `[HttpClient] Request: ${options.method} ${options.url}`,
              );
            }
          },
        ],
        beforeRetry: [
          async (error, retryCount) => {
            if (this.enableLogging) {
              const method = error.options?.method || 'unknown';
              const url = error.options?.url || 'unknown';
              console.warn(
                `[HttpClient] Retry attempt ${retryCount}/${this.config.maxRetries} for ${method} ${url}`,
              );
            }
          },
        ],
        afterResponse: [
          (response) => {
            if (this.enableLogging && loggingConfig.level === 'debug') {
              console.debug(
                `[HttpClient] Response: ${response.statusCode} ${response.request.options.method} ${response.request.options.url}`,
              );
            }
            return response;
          },
        ],
      },
    });
  }

  /**
   * Calculate delay between retries using exponential backoff
   * @param attemptNumber - The current retry attempt number
   * @param error - The error that triggered the retry
   * @param retryOptions - Retry options from got
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay({
    attemptCount,
    error,
    retryOptions,
  }: {
    attemptCount: number;
    error: RequestError;
    retryOptions: Required<Options>['retry'];
  }): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.min(1000 * 2 ** (attemptCount - 1), 30000);

    if (this.enableLogging) {
      console.debug(
        `[HttpClient] Calculating retry delay: ${delay}ms (attempt ${attemptCount})`,
      );
    }

    return delay;
  }

  /**
   * Perform a GET request
   * @param url - The URL path (relative to base URL)
   * @param options - Additional request options
   * @returns Promise resolving to the response
   */
  async get(url: string, options?: Options): Promise<Response<string>> {
    try {
      return await this.client.get(url, options) as Response<string>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Perform a POST request
   * @param url - The URL path (relative to base URL)
   * @param options - Additional request options
   * @returns Promise resolving to the response
   */
  async post(url: string, options?: Options): Promise<Response<string>> {
    try {
      return await this.client.post(url, options) as Response<string>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Perform a PUT request
   * @param url - The URL path (relative to base URL)
   * @param options - Additional request options
   * @returns Promise resolving to the response
   */
  async put(url: string, options?: Options): Promise<Response<string>> {
    try {
      return await this.client.put(url, options) as Response<string>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Perform a DELETE request
   * @param url - The URL path (relative to base URL)
   * @param options - Additional request options
   * @returns Promise resolving to the response
   */
  async delete(url: string, options?: Options): Promise<Response<string>> {
    try {
      return await this.client.delete(url, options) as Response<string>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Perform a HEAD request
   * @param url - The URL path (relative to base URL)
   * @param options - Additional request options
   * @returns Promise resolving to the response
   */
  async head(url: string, options?: Options): Promise<Response<string>> {
    try {
      return await this.client.head(url, options) as Response<string>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and classify errors from HTTP requests
   * @param error - The error to handle
   * @returns A properly classified HttpClientError
   */
  private handleError(error: unknown): HttpClientError {
    if (!(error instanceof RequestError)) {
      return new HttpClientError(
        `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
        HttpErrorType.Parse,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT') {
      const message = `Request timed out: ${error.message}`;
      if (this.enableLogging) {
        console.error(`[HttpClient] ${message}`);
      }
      return new HttpClientError(message, HttpErrorType.Timeout, undefined, error);
    }

    // Handle HTTP status errors
    if (error.response) {
      const statusCode = error.response.statusCode;
      const message = `HTTP ${statusCode}: ${error.message}`;

      // Rate limit error
      if (statusCode === 429) {
        if (this.enableLogging) {
          console.error(`[HttpClient] Rate limit exceeded: ${message}`);
        }
        return new HttpClientError(message, HttpErrorType.RateLimit, statusCode, error);
      }

      // Other HTTP errors
      if (this.enableLogging) {
        console.error(`[HttpClient] ${message}`);
      }
      return new HttpClientError(message, HttpErrorType.Http, statusCode, error);
    }

    // Handle network errors
    const message = `Network error: ${error.message}`;
    if (this.enableLogging) {
      console.error(`[HttpClient] ${message}`);
    }
    return new HttpClientError(message, HttpErrorType.Network, undefined, error);
  }

  /**
   * Reset the rate limiter state
   */
  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }

  /**
   * Get the underlying got client instance for advanced use cases
   * @returns The got client instance
   */
  getRawClient(): Got {
    return this.client;
  }
}

// ============================================
// Default Client Instance
// ============================================

/**
 * Default HTTP client instance configured with environment variables
 */
export const httpClient = new HttpClient({
  baseUrl: parserConfig.baseUrl,
  maxRetries: parserConfig.maxRetries,
  requestDelayMs: parserConfig.scrollDelayMs,
  requestTimeout: parserConfig.timeoutMs,
});

// Export the client as default for convenience
export default httpClient;
