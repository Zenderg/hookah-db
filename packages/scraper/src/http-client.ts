/**
 * HTTP Client Wrapper
 * 
 * Provides a robust HTTP client with retry logic, rate limiting,
 * and error handling for scraping htreviews.org.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration options for the HTTP client
 */
export interface HttpClientConfig {
  /** Base URL for requests (default: https://htreviews.org) */
  baseURL?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Minimum delay between requests in milliseconds (default: 1000) */
  minDelayBetweenRequests?: number;
  /** User-Agent header (default: provided) */
  userAgent?: string;
  /** Whether to enable retry logic (default: true) */
  enableRetry?: boolean;
  /** Whether to enable rate limiting (default: true) */
  enableRateLimit?: boolean;
  /** Custom sleep function (for testing) */
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * HTTP status codes that should trigger a retry
 */
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Custom error class for HTTP client errors
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly url?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'HttpClientError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when maximum retry attempts are exhausted
 */
export class MaxRetriesExceededError extends HttpClientError {
  constructor(
    message: string,
    statusCode?: number,
    url?: string,
    public readonly attempts: number = 0
  ) {
    super(message, statusCode, url);
    this.name = 'MaxRetriesExceededError';
  }
}

/**
 * Error thrown when a request times out
 */
export class RequestTimeoutError extends HttpClientError {
  constructor(url?: string, timeout?: number) {
    super(`Request timeout after ${timeout}ms`, undefined, url);
    this.name = 'RequestTimeoutError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends HttpClientError {
  constructor(url?: string, retryAfter?: number) {
    super(
      retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        : 'Rate limit exceeded.',
      429,
      url
    );
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Simple in-memory rate limiter using timestamps
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private minDelay: number;
  private sleepFn: (ms: number) => Promise<void>;

  constructor(minDelay: number, sleepFn: (ms: number) => Promise<void>) {
    this.minDelay = minDelay;
    this.sleepFn = sleepFn;
  }

  /**
   * Wait if necessary to respect the minimum delay between requests
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      const delay = this.minDelay - timeSinceLastRequest;
      await this.sleepFn(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.lastRequestTime = 0;
  }
}

// ============================================================================
// HTTP Client Implementation
// ============================================================================

/**
 * HTTP Client Wrapper
 * 
 * Provides a robust HTTP client with retry logic, rate limiting,
 * and error handling for scraping htreviews.org.
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;
  private config: Required<HttpClientConfig>;
  private sleepFn: (ms: number) => Promise<void>;

  /**
   * Create a new HTTP client instance
   * @param config Configuration options
   */
  constructor(config: HttpClientConfig = {}) {
    // Use provided sleepFn or default to setTimeout
    // For testing, pass a custom sleepFn that uses Jest's fake timers
    this.sleepFn = config.sleepFn || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    
    this.config = {
      baseURL: config.baseURL !== undefined ? config.baseURL : (process.env.HTREVIEWS_BASE_URL || 'https://htreviews.org'),
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries ?? 3,
      minDelayBetweenRequests: config.minDelayBetweenRequests || 1000,
      userAgent:
        config.userAgent ||
        'Mozilla/5.0 (compatible; HookahDB/1.0; +https://github.com/hookah-db)',
      enableRetry: config.enableRetry !== false,
      enableRateLimit: config.enableRateLimit !== false,
      sleepFn: this.sleepFn,
    };

    this.rateLimiter = new RateLimiter(this.config.minDelayBetweenRequests, this.sleepFn);

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });
  }

  /**
   * Check if an error is an AxiosError or has shape of one
   */
  private isAxiosErrorLike(error: unknown): error is AxiosError {
    if (axios.isAxiosError(error)) {
      return true;
    }
    
    // Check if error has shape of an AxiosError (for testing with mocks)
    return (
      typeof error === 'object' &&
      error !== null &&
      'config' in error &&
      ('response' in error || 'code' in error || 'message' in error)
    );
  }

  /**
   * Convert axios errors to custom error types
   * Returns the custom error (doesn't throw)
   */
  private handleAxiosError(error: unknown): Error {
    // Ensure error is treated as AxiosError-like
    const axiosError = error as any;
    const url = axiosError.config?.url;

    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return new RequestTimeoutError(url, this.config.timeout);
    }

    if (!axiosError.response) {
      // Network error (no response received)
      return new HttpClientError(
        `Network error: ${axiosError.message || 'Unknown error'}`,
        undefined,
        url,
        axiosError instanceof Error ? axiosError : undefined
      );
    }

    const { status, statusText } = axiosError.response;

    if (status === 429) {
      const retryAfter = axiosError.response.headers?.['retry-after'];
      return new RateLimitError(url, retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    if (status && status >= 400 && status < 500) {
      // Client error (4xx) - don't retry
      return new HttpClientError(
        `Client error ${status}: ${statusText}`,
        status,
        url,
        axiosError instanceof Error ? axiosError : undefined
      );
    }

    if (status && status >= 500) {
      // Server error (5xx) - may be retryable
      return new HttpClientError(
        `Server error ${status}: ${statusText}`,
        status,
        url,
        axiosError instanceof Error ? axiosError : undefined
      );
    }

    return new HttpClientError(
      `HTTP error: ${statusText}`,
      status,
      url,
      axiosError instanceof Error ? axiosError : undefined
    );
  }

  /**
   * Execute a request with retry logic and rate limiting
   * @param config Axios request configuration
   * @returns Promise resolving to the response
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Apply rate limiting if enabled
    if (this.config.enableRateLimit) {
      await this.rateLimiter.wait();
    }

    // Execute request with retry logic if enabled
    if (this.config.enableRetry) {
      return this.requestWithRetry<T>(config);
    }

    // Execute request without retry but still handle errors
    try {
      return await this.axiosInstance.request<T>(config);
    } catch (error) {
      if (this.isAxiosErrorLike(error)) {
        throw this.handleAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * Execute a request with retry logic
   * @param config Axios request configuration
   * @returns Promise resolving to the response
   */
  private async requestWithRetry<T = any>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    let lastError: Error | undefined;
    const maxRetries = this.config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>(config);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Convert axios error to custom error type
        if (this.isAxiosErrorLike(error)) {
          const customError = this.handleAxiosError(error);
          lastError = customError;

          // Check if error is retryable
          if (!this.isRetryableError(customError)) {
            throw customError;
          }

          // Don't retry after max attempts
          if (attempt >= maxRetries) {
            break;
          }

          // Calculate delay with exponential backoff: 1s, 2s, 4s, ...
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleepFn(delay);
        } else {
          // Non-axios error, don't retry
          throw error;
        }
      }
    }

    // All retry attempts exhausted
    throw new MaxRetriesExceededError(
      `Maximum retry attempts (${maxRetries}) exceeded`,
      lastError instanceof HttpClientError ? lastError.statusCode : undefined,
      config.url,
      maxRetries
    );
  }

  /**
   * Check if an error should trigger a retry
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof HttpClientError) {
      return (
        error.statusCode !== undefined &&
        RETRYABLE_STATUS_CODES.includes(error.statusCode)
      );
    }

    if (error instanceof RequestTimeoutError) {
      return true;
    }

    // Network errors (no response) are retryable
    if (error instanceof HttpClientError && error.statusCode === undefined) {
      return true;
    }

    return false;
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  resetRateLimiter(): void {
    this.rateLimiter.reset();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default singleton HTTP client instance
 * Can be used directly or create new instances with custom config
 */
export const httpClient = new HttpClient();

// ============================================================================
// Exports
// ============================================================================

export default httpClient;
