/**
 * Base Scraper Class
 * 
 * Provides a base scraper implementation that uses the HTTP client
 * to fetch and parse HTML pages from htreviews.org.
 */

import * as cheerio from 'cheerio';
import { HttpClient, HttpClientConfig } from './http-client';
import { CheerioAPI } from './html-parser';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration options for the scraper
 */
export interface ScraperConfig extends HttpClientConfig {
  /** Base URL for htreviews.org (default: https://htreviews.org) */
  baseURL?: string;
}

/**
 * Result of a scrape operation
 */
export interface ScrapeResult<T> {
  /** Parsed data */
  data: T;
  /** URL that was scraped */
  url: string;
  /** Timestamp of the scrape */
  timestamp: Date;
  /** HTML content (optional, for debugging) */
  html?: string;
}

/**
 * Error thrown when scraping fails
 */
export class ScrapeError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ScrapeError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Base Scraper Class
// ============================================================================

/**
 * Base scraper class for fetching and parsing HTML pages
 */
export class Scraper {
  protected httpClient: HttpClient;
  protected baseURL: string;

  /**
   * Create a new scraper instance
   * @param config Configuration options
   */
  constructor(config: ScraperConfig = {}) {
    this.baseURL = config.baseURL || process.env.HTREVIEWS_BASE_URL || 'https://htreviews.org';
    
    this.httpClient = new HttpClient({
      ...config,
      baseURL: this.baseURL,
    });
  }

  /**
   * Fetch HTML content from a URL
   * @param path Path to fetch (e.g., '/tobaccos/brands')
   * @returns HTML content
   * @throws ScrapeError if fetching fails
   */
  async fetchHtml(path: string): Promise<string> {
    try {
      const response = await this.httpClient.get<string>(path);
      return response.data;
    } catch (error) {
      const url = this.buildUrl(path);
      throw new ScrapeError(
        `Failed to fetch HTML from ${url}`,
        url,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fetch and parse HTML content from a URL
   * @param path Path to fetch (e.g., '/tobaccos/brands')
   * @returns Cheerio instance for parsing
   * @throws ScrapeError if fetching or parsing fails
   */
  async fetchAndParse(path: string): Promise<CheerioAPI> {
    const html = await this.fetchHtml(path);
    return cheerio.load(html);
  }

  /**
   * Fetch HTML content with full result metadata
   * @param path Path to fetch (e.g., '/tobaccos/brands')
   * @returns Scrape result with HTML content
   * @throws ScrapeError if fetching fails
   */
  async fetchHtmlWithResult(path: string): Promise<ScrapeResult<string>> {
    const url = this.buildUrl(path);
    const html = await this.fetchHtml(path);
    
    return {
      data: html,
      url,
      timestamp: new Date(),
      html,
    };
  }

  /**
   * Fetch and parse HTML content with full result metadata
   * @param path Path to fetch (e.g., '/tobaccos/brands')
   * @returns Scrape result with Cheerio instance
   * @throws ScrapeError if fetching or parsing fails
   */
  async fetchAndParseWithResult(path: string): Promise<ScrapeResult<CheerioAPI>> {
    const url = this.buildUrl(path);
    const html = await this.fetchHtml(path);
    const $ = cheerio.load(html);
    
    return {
      data: $,
      url,
      timestamp: new Date(),
      html,
    };
  }

  /**
   * Build a full URL from a path
   * @param path Path to append to base URL
   * @returns Full URL
   */
  protected buildUrl(path: string): string {
    // Remove leading slash from path
    const cleanPath = path.replace(/^\/+/, '');
    // Remove trailing slash from base URL
    const cleanBase = this.baseURL.replace(/\/+$/, '');
    
    // If path is empty, return base URL without trailing slash
    if (!cleanPath) {
      return cleanBase;
    }
    
    return `${cleanBase}/${cleanPath}`;
  }

  /**
   * Check if a Cheerio element exists
   * @param $ Cheerio instance
   * @param selector CSS selector
   * @returns True if element exists
   */
  protected elementExists($: CheerioAPI, selector: string): boolean {
    return $(selector).length > 0;
  }

  /**
   * Extract text from a selector with error handling
   * @param $ Cheerio instance
   * @param selector CSS selector
   * @param defaultValue Default value if element not found
   * @returns Extracted text or default value
   */
  protected extractTextSafe(
    $: CheerioAPI,
    selector: string,
    defaultValue: string = ''
  ): string {
    const element = $(selector).first();
    if (element.length === 0) {
      return defaultValue;
    }
    return element.text().trim() || defaultValue;
  }

  /**
   * Extract attribute from a selector with error handling
   * @param $ Cheerio instance
   * @param selector CSS selector
   * @param attribute Attribute name
   * @param defaultValue Default value if element not found
   * @returns Attribute value or default value
   */
  protected extractAttributeSafe(
    $: CheerioAPI,
    selector: string,
    attribute: string,
    defaultValue: string | null = null
  ): string | null {
    const element = $(selector).first();
    if (element.length === 0) {
      return defaultValue;
    }
    const value = element.attr(attribute);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Extract number from a selector with error handling
   * @param $ Cheerio instance
   * @param selector CSS selector
   * @param defaultValue Default value if parsing fails
   * @returns Parsed number or default value
   */
  protected extractNumberSafe(
    $: CheerioAPI,
    selector: string,
    defaultValue: number | null = null
  ): number | null {
    const text = this.extractTextSafe($, selector);
    if (!text) {
      return defaultValue;
    }
    
    // Remove all non-numeric characters except decimal point and minus
    const cleaned = text.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get the HTTP client instance (useful for testing or advanced usage)
   * @returns HTTP client instance
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  resetRateLimiter(): void {
    this.httpClient.resetRateLimiter();
  }

  /**
   * Get the base URL
   * @returns Base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Set a new base URL
   * @param url New base URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }
}

// ============================================================================
// Default Scraper Instance
// ============================================================================

/**
 * Default scraper instance
 * Can be used directly or create new instances with custom config
 */
export const scraper = new Scraper();

// ============================================================================
// Exports
// ============================================================================

export default scraper;
