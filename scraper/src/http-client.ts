/**
 * HTTP Client Module
 *
 * Provides a robust HTTP client with retry logic, rate limiting,
 * user agent rotation, and iterative request support for web scraping.
 *
 * @module http-client
 */

import { URL } from 'url';

/**
 * Configuration options for HTTP client
 */
export interface HttpClientConfig {
  /** Request timeout in milliseconds (default: 30000) */
  requestTimeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryDelayBase?: number;
  /** Maximum retry delay in ms (default: 30000) */
  retryDelayMax?: number;
  /** Requests per second (default: 2) */
  rateLimitRps?: number;
  /** Burst capacity (default: 5) */
  rateLimitBurst?: number;
  /** List of user agents to rotate through */
  userAgents?: string[];
}

/**
 * Options for individual requests
 */
export interface RequestOptions {
  /** Timeout for this specific request in milliseconds */
  timeout?: number;
  /** Maximum retries for this specific request */
  retries?: number;
  /** Custom user agent for this request */
  userAgent?: string;
  /** Custom headers for this request */
  headers?: Record<string, string>;
  /** Query parameters to append to the URL */
  params?: Record<string, string | number>;
  /** Pagination page number */
  page?: number;
  /** Pagination page size */
  pageSize?: number;
  /** Continuation token for cursor-based pagination */
  continuationToken?: string;
}

/**
 * State for iterative requests
 */
export interface IterationState {
  /** Current iteration number */
  iteration: number;
  /** Total items discovered so far */
  totalItems: number;
  /** Timestamp of the last request */
  lastTimestamp: Date;
  /** Continuation token for next iteration */
  continuationToken?: string;
  /** Current page number */
  currentPage?: number;
  /** Whether more data is available */
  hasMoreData: boolean;
}

/**
 * Result of an HTTP request
 */
export interface RequestResult {
  /** Whether the request was successful */
  success: boolean;
  /** HTML content returned */
  content?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Error if request failed */
  error?: Error;
  /** Duration of the request in milliseconds */
  duration: number;
  /** Number of retries performed */
  retryCount: number;
  /** URL that was requested */
  url: string;
  /** Timestamp of the request */
  timestamp: Date;
}

/**
 * Entry in the request history
 */
interface RequestHistoryEntry {
  /** URL that was requested */
  url: string;
  /** Timestamp of the request */
  timestamp: Date;
  /** HTTP status code */
  statusCode?: number;
  /** Whether the request was successful */
  success: boolean;
  /** Duration in milliseconds */
  duration: number;
  /** Number of retries */
  retryCount: number;
}

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerSecond / 1000;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume a token
   * @returns true if token was consumed, false if bucket is empty
   */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Wait until a token is available
   */
  async waitForToken(): Promise<void> {
    while (!this.tryConsume()) {
      const waitTime = Math.ceil(1000 / (this.refillRate * 1000));
      await this.sleep(waitTime);
    }
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Default user agents for rotation
 */
const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
] as const;

/**
 * HTTP Client with retry logic, rate limiting, and user agent rotation
 */
export class HttpClient {
  private config: Required<HttpClientConfig>;
  private userAgents: string[];
  private userAgentIndex: number = 0;
  private rateLimiter: TokenBucket;
  private iterationState: IterationState;
  private requestHistory: RequestHistoryEntry[] = [];
  private discoveredItems: Set<string> = new Set();

  constructor(config?: HttpClientConfig) {
    this.config = {
      requestTimeout: config?.requestTimeout ?? this.getNumberEnv('SCRAPER_REQUEST_TIMEOUT', 30000),
      maxRetries: config?.maxRetries ?? this.getNumberEnv('SCRAPER_MAX_RETRIES', 3),
      retryDelayBase: config?.retryDelayBase ?? this.getNumberEnv('SCRAPER_RETRY_DELAY_BASE', 1000),
      retryDelayMax: config?.retryDelayMax ?? this.getNumberEnv('SCRAPER_RETRY_DELAY_MAX', 30000),
      rateLimitRps: config?.rateLimitRps ?? this.getNumberEnv('SCRAPER_RATE_LIMIT_RPS', 2),
      rateLimitBurst: config?.rateLimitBurst ?? this.getNumberEnv('SCRAPER_RATE_LIMIT_BURST', 5),
      userAgents: config?.userAgents ?? this.getUserAgentsFromEnv(),
    };

    this.userAgents = this.config.userAgents.length > 0 ? this.config.userAgents : [...DEFAULT_USER_AGENTS];
    this.rateLimiter = new TokenBucket(this.config.rateLimitBurst, this.config.rateLimitRps);
    this.iterationState = this.createInitialIterationState();
  }

  /**
   * Get number from environment variable
   */
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get user agents from environment variable
   */
  private getUserAgentsFromEnv(): string[] {
    const envValue = process.env.SCRAPER_USER_AGENTS;
    if (!envValue) {
      return [];
    }
    return envValue.split(',').map((agent) => agent.trim()).filter(Boolean);
  }

  /**
   * Create initial iteration state
   */
  private createInitialIterationState(): IterationState {
    return {
      iteration: 0,
      totalItems: 0,
      lastTimestamp: new Date(),
      hasMoreData: true,
    };
  }

  /**
   * Fetch a URL with retry logic and rate limiting
   */
  async fetch(url: string, options?: RequestOptions): Promise<RequestResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    let retryCount = 0;
    let lastError: Error | undefined;

    // Build URL with query parameters
    const fullUrl = this.buildUrl(url, options);

    // Attempt request with retries
    while (retryCount <= this.config.maxRetries) {
      // Wait for rate limit before each attempt
      await this.waitForRateLimit();

      try {
        const result = await this.performRequest(fullUrl, options);
        const duration = Date.now() - startTime;

        // Record request in history
        this.recordRequestHistory(fullUrl, { success: true, statusCode: result.statusCode }, duration, retryCount);

        return {
          success: true,
          content: result.content,
          statusCode: result.statusCode,
          duration,
          retryCount,
          url: fullUrl,
          timestamp,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        if (this.shouldRetry(lastError) && retryCount < this.config.maxRetries) {
          // Increment retry count and retry
          retryCount++;
          const delay = this.calculateRetryDelay(retryCount);
          console.warn(`Request failed (${lastError.message}), retrying in ${delay}ms (attempt ${retryCount}/${this.config.maxRetries})`);
          await this.sleep(delay);
        } else {
          // Don't retry or max retries exceeded - record failure and return
          const duration = Date.now() - startTime;
          this.recordRequestHistory(fullUrl, { success: false, statusCode: undefined }, duration, retryCount);

          return {
            success: false,
            error: lastError,
            duration,
            retryCount,
            url: fullUrl,
            timestamp,
          };
        }
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime;
    this.recordRequestHistory(fullUrl, { success: false, statusCode: undefined }, duration, retryCount);

    return {
      success: false,
      error: lastError,
      duration,
      retryCount,
      url: fullUrl,
      timestamp,
    };
  }

  /**
   * Fetch with iterative request support
   */
  async fetchIterative(
    url: string,
    options?: RequestOptions & { iterationState?: Partial<IterationState> }
  ): Promise<RequestResult> {
    // Update iteration state if provided
    if (options?.iterationState) {
      this.iterationState = {
        ...this.iterationState,
        ...options.iterationState,
      };
    }

    // Add iteration info to options
    const iterativeOptions: RequestOptions = {
      ...options,
      page: options?.page ?? this.iterationState.currentPage,
      continuationToken: options?.continuationToken ?? this.iterationState.continuationToken,
    };

    // Perform the request
    const result = await this.fetch(url, iterativeOptions);

    // Update iteration state
    if (result.success) {
      this.iterationState.iteration++;
      this.iterationState.lastTimestamp = new Date();
    }

    return result;
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest(url: string, options?: RequestOptions): Promise<{ content: string; statusCode: number }> {
    const controller = new AbortController();
    const timeout = options?.timeout ?? this.config.requestTimeout;

    // Set timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'User-Agent': this.getUserAgent(options?.userAgent),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        ...options?.headers,
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).statusCode = response.status;
        throw error;
      }

      const content = await response.text();

      // Check for rate limit headers
      this.checkRateLimitHeaders(response);

      return { content, statusCode: response.status };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Re-throw the error as-is to preserve original error message
      throw error;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(url: string, options?: RequestOptions): string {
    try {
      const urlObj = new URL(url);

      // Add query parameters
      if (options?.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          urlObj.searchParams.set(key, String(value));
        });
      }

      // Add pagination parameters
      if (options?.page !== undefined) {
        urlObj.searchParams.set('page', String(options.page));
      }

      if (options?.pageSize !== undefined) {
        urlObj.searchParams.set('page_size', String(options.pageSize));
      }

      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Check if an error should trigger a retry
   */
  private shouldRetry(error: Error): boolean {
    // Check for timeout errors
    if (error.message.includes('timeout')) {
      return true;
    }

    // Check for network errors
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('ENOTFOUND') || 
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')) {
      return true;
    }

    // Check for HTTP status codes
    const statusCode = (error as any).statusCode;
    if (statusCode) {
      // Retry on 5xx errors
      if (statusCode >= 500 && statusCode < 600) {
        return true;
      }
      // Retry on 429 (Too Many Requests)
      if (statusCode === 429) {
        return true;
      }
      // Don't retry on 4xx errors (except 429)
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        return false;
      }
    }

    // Default: retry on network errors
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: base * 2^(retryCount-1)
    const exponentialDelay = this.config.retryDelayBase * Math.pow(2, retryCount - 1);

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, this.config.retryDelayMax);

    // Add jitter: +/- 25% of the capped delay
    const jitter = cappedDelay * 0.25;
    const randomJitter = (Math.random() * 2 - 1) * jitter;

    // Ensure final delay doesn't exceed maxDelay (including jitter)
    const finalDelay = Math.min(cappedDelay + randomJitter, this.config.retryDelayMax);

    return Math.floor(finalDelay);
  }

  /**
   * Wait for rate limit
   */
  async waitForRateLimit(): Promise<void> {
    await this.rateLimiter.waitForToken();
  }

  /**
   * Check rate limit headers from response
   */
  private checkRateLimitHeaders(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (remaining !== null) {
      const remainingCount = parseInt(remaining, 10);
      if (remainingCount <= 1) {
        console.warn('Rate limit nearly exhausted');
      }
    }

    if (reset !== null) {
      const resetTime = parseInt(reset, 10);
      const now = Math.floor(Date.now() / 1000);
      if (resetTime > now) {
        const waitTime = (resetTime - now) * 1000;
        console.warn(`Rate limit will reset in ${waitTime}ms`);
      }
    }
  }

  /**
   * Get a user agent (rotating through the list)
   */
  getUserAgent(customUserAgent?: string): string {
    if (customUserAgent) {
      return customUserAgent;
    }

    const agent = this.userAgents[this.userAgentIndex];
    if (!agent) {
      return DEFAULT_USER_AGENTS[0]!;
    }

    this.userAgentIndex = (this.userAgentIndex + 1) % Math.max(1, this.userAgents.length);
    return agent;
  }

  /**
   * Set custom user agents
   */
  setUserAgents(agents: string[]): void {
    if (agents.length === 0) {
      throw new Error('User agent list cannot be empty');
    }
    this.userAgents = agents;
    this.userAgentIndex = 0;
  }

  /**
   * Get current iteration state
   */
  getIterationState(): IterationState {
    return { ...this.iterationState };
  }

  /**
   * Reset iteration state
   */
  resetIterationState(): void {
    this.iterationState = this.createInitialIterationState();
  }

  /**
   * Update iteration state
   */
  updateIterationState(updates: Partial<IterationState>): void {
    this.iterationState = {
      ...this.iterationState,
      ...updates,
    };
  }

  /**
   * Record request in history
   */
  private recordRequestHistory(
    url: string,
    result: { success: boolean; statusCode?: number },
    duration: number,
    retryCount: number
  ): void {
    const entry: RequestHistoryEntry = {
      url,
      timestamp: new Date(),
      statusCode: result.statusCode,
      success: result.success,
      duration,
      retryCount,
    };

    this.requestHistory.push(entry);

    // Keep only last 1000 entries
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift();
    }
  }

  /**
   * Get request history
   */
  getRequestHistory(): RequestHistoryEntry[] {
    return [...this.requestHistory];
  }

  /**
   * Clear request history
   */
  clearRequestHistory(): void {
    this.requestHistory = [];
  }

  /**
   * Add a discovered item
   */
  addDiscoveredItem(item: string): void {
    this.discoveredItems.add(item);
  }

  /**
   * Check if an item has been discovered
   */
  hasDiscoveredItem(item: string): boolean {
    return this.discoveredItems.has(item);
  }

  /**
   * Get count of discovered items
   */
  getDiscoveredItemCount(): number {
    return this.discoveredItems.size;
  }

  /**
   * Clear discovered items
   */
  clearDiscoveredItems(): void {
    this.discoveredItems.clear();
  }

  /**
   * Create a checkpoint for resumability
   */
  createCheckpoint(): {
    iterationState: IterationState;
    discoveredItems: string[];
    timestamp: Date;
  } {
    return {
      iterationState: this.getIterationState(),
      discoveredItems: Array.from(this.discoveredItems),
      timestamp: new Date(),
    };
  }

  /**
   * Restore from a checkpoint
   */
  restoreCheckpoint(checkpoint: {
    iterationState: IterationState;
    discoveredItems: string[];
  }): void {
    this.iterationState = checkpoint.iterationState;
    this.discoveredItems = new Set(checkpoint.discoveredItems);
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter token count
   */
  getRateLimitTokenCount(): number {
    return this.rateLimiter.getTokenCount();
  }
}
