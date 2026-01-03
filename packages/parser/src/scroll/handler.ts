import { HttpClient } from '../http/client.js';
import { parserConfig, loggingConfig } from '@hookah-db/shared';

// ============================================
// Type Definitions
// ============================================

/**
 * Configuration options for scroll handler
 */
export interface ScrollHandlerOptions {
  /**
   * Base URL path to scroll (e.g., '/tobaccos/brands')
   */
  path: string;

  /**
   * Number of items to fetch per request
   */
  itemsPerPage?: number;

  /**
   * Maximum number of items to fetch (0 for unlimited)
   */
  maxItems?: number;

  /**
   * Delay between scroll requests in milliseconds
   */
  scrollDelayMs?: number;

  /**
   * HTTP client to use for requests
   */
  httpClient?: HttpClient;
}

/**
 * Result of a scroll operation
 */
export interface ScrollResult {
  /**
   * All HTML content aggregated from all scroll loads
   */
  html: string;

  /**
   * Total number of items fetched
   */
  totalItems: number;

  /**
   * Number of requests made
   */
  requestCount: number;

  /**
   * Whether more items are available
   */
  hasMore: boolean;
}

/**
 * Parsed metadata from HTML
 */
export interface ScrollMetadata {
  /**
   * Total number of items available
   */
  totalCount: number;

  /**
   * Current offset
   */
  offset: number;

  /**
   * Items per page
   */
  limit: number;
}

// ============================================
// Scroll Handler Implementation
// ============================================

/**
 * Scroll handler for infinite scroll pages on htreviews.org
 * 
 * This handler simulates infinite scroll by making incremental requests
 * with pagination parameters (offset, limit) and aggregating the content.
 * 
 * The site uses server-side rendering with HTMX, so we can fetch pages
 * by incrementing the offset parameter until no more content is available.
 */
export class ScrollHandler {
  private httpClient: HttpClient;
  private path: string;
  private itemsPerPage: number;
  private maxItems: number;
  private scrollDelayMs: number;

  constructor(options: ScrollHandlerOptions) {
    this.path = options.path;
    this.itemsPerPage = options.itemsPerPage || 20;
    this.maxItems = options.maxItems || 0; // 0 means unlimited
    this.scrollDelayMs = options.scrollDelayMs || parserConfig.scrollDelayMs;
    this.httpClient = options.httpClient || new HttpClient({
      baseUrl: parserConfig.baseUrl,
      maxRetries: parserConfig.maxRetries,
      requestDelayMs: this.scrollDelayMs,
      requestTimeout: parserConfig.timeoutMs,
    });
  }

  /**
   * Fetch all content from a scrollable page
   * @returns Promise resolving to scroll result with aggregated HTML
   */
  async fetchAll(): Promise<ScrollResult> {
    if (loggingConfig.level === 'info') {
      console.log(`[ScrollHandler] Starting scroll for path: ${this.path}`);
    }

    const allHtml: string[] = [];
    let offset = 0;
    let totalItems = 0;
    let requestCount = 0;
    let hasMore = true;

    while (hasMore) {
      // Check if we've reached the maximum items limit
      if (this.maxItems > 0 && totalItems >= this.maxItems) {
        if (loggingConfig.level === 'info') {
          console.log(`[ScrollHandler] Reached max items limit: ${this.maxItems}`);
        }
        break;
      }

      // Fetch the next page
      const result = await this.fetchPage(offset);

      if (!result.html) {
        // No more content available
        hasMore = false;
        if (loggingConfig.level === 'info') {
          console.log(`[ScrollHandler] No more content available at offset ${offset}`);
        }
        break;
      }

      // Add the HTML to our collection
      allHtml.push(result.html);
      totalItems += result.itemsFetched;
      requestCount++;

      if (loggingConfig.level === 'debug') {
        console.debug(
          `[ScrollHandler] Fetched ${result.itemsFetched} items (offset: ${offset}, total: ${totalItems})`,
        );
      }

      // Check if we've fetched all available items
      if (result.metadata && totalItems >= result.metadata.totalCount) {
        hasMore = false;
        if (loggingConfig.level === 'info') {
          console.log(
            `[ScrollHandler] Fetched all ${result.metadata.totalCount} available items`,
          );
        }
        break;
      }

      // Check if we got fewer items than requested (indicates end of list)
      if (result.itemsFetched < this.itemsPerPage) {
        hasMore = false;
        if (loggingConfig.level === 'info') {
          console.log(
            `[ScrollHandler] Got fewer items than requested (${result.itemsFetched}/${this.itemsPerPage}), end of list`,
          );
        }
        break;
      }

      // Increment offset for next request
      offset += this.itemsPerPage;

      // Add delay between scroll requests (in addition to rate limiter)
      if (this.scrollDelayMs > 0) {
        await this.sleep(this.scrollDelayMs);
      }
    }

    // Aggregate all HTML content
    const aggregatedHtml = this.aggregateHtml(allHtml);

    if (loggingConfig.level === 'info') {
      console.log(
        `[ScrollHandler] Completed: ${totalItems} items fetched in ${requestCount} requests`,
      );
    }

    return {
      html: aggregatedHtml,
      totalItems,
      requestCount,
      hasMore,
    };
  }

  /**
   * Fetch a single page at the given offset
   * @param offset - The offset to start fetching from
   * @returns Promise resolving to page result
   */
  private async fetchPage(
    offset: number,
  ): Promise<{
    html: string;
    itemsFetched: number;
    metadata?: ScrollMetadata;
  }> {
    try {
      // Build URL with pagination parameters
      const url = this.buildUrl(offset);

      if (loggingConfig.level === 'debug') {
        console.debug(`[ScrollHandler] Fetching: ${url}`);
      }

      // Fetch the page
      const response = await this.httpClient.get(url);

      // Extract metadata from HTML
      const metadata = this.extractMetadata(response.body);

      // Count items in the response
      const itemsFetched = this.countItems(response.body);

      return {
        html: response.body,
        itemsFetched,
        metadata,
      };
    } catch (error) {
      if (loggingConfig.level === 'error') {
        console.error(`[ScrollHandler] Error fetching page at offset ${offset}:`, error);
      }
      throw error;
    }
  }

  /**
   * Build URL with pagination parameters
   * @param offset - The offset to start fetching from
   * @returns The full URL with query parameters
   */
  private buildUrl(offset: number): string {
    // The site uses query parameters for pagination
    // Format: /tobaccos/brands?offset=20&limit=20
    const params = new URLSearchParams();
    params.append('offset', offset.toString());
    params.append('limit', this.itemsPerPage.toString());

    return `${this.path}?${params.toString()}`;
  }

  /**
   * Extract metadata from HTML response
   * @param html - The HTML response body
   * @returns Metadata object with total count, offset, and limit
   */
  private extractMetadata(html: string): ScrollMetadata | undefined {
    try {
      // The site stores metadata in data attributes on the .tobacco_list_items element
      // Example: <div class="tobacco_list_items" data-target="5" data-offset="20" data-count="53">
      const metadataMatch = html.match(
        /<div[^>]+class="tobacco_list_items"[^>]*data-count="(\d+)"[^>]*data-offset="(\d+)"[^>]*data-target="(\d+)"/,
      );

      if (metadataMatch) {
        return {
          totalCount: parseInt(metadataMatch[1], 10),
          offset: parseInt(metadataMatch[2], 10),
          limit: parseInt(metadataMatch[3], 10),
        };
      }

      return undefined;
    } catch (error) {
      if (loggingConfig.level === 'warn') {
        console.warn('[ScrollHandler] Failed to extract metadata from HTML:', error);
      }
      return undefined;
    }
  }

  /**
   * Count the number of items in the HTML response
   * @param html - The HTML response body
   * @returns The number of items found
   */
  private countItems(html: string): number {
    try {
      // Count .tobacco_list_item elements
      const itemMatches = html.match(/<div[^>]+class="tobacco_list_item"/g);
      return itemMatches ? itemMatches.length : 0;
    } catch (error) {
      if (loggingConfig.level === 'warn') {
        console.warn('[ScrollHandler] Failed to count items in HTML:', error);
      }
      return 0;
    }
  }

  /**
   * Aggregate HTML content from multiple pages
   * @param htmlChunks - Array of HTML chunks from each page
   * @returns Aggregated HTML content
   */
  private aggregateHtml(htmlChunks: string[]): string {
    if (htmlChunks.length === 0) {
      return '';
    }

    if (htmlChunks.length === 1) {
      return htmlChunks[0];
    }

    // For multiple pages, we need to merge the content
    // We'll extract the item containers and combine them
    const allItems: string[] = [];

    for (const chunk of htmlChunks) {
      // Extract all .tobacco_list_item elements
      const itemRegex = /<div[^>]+class="tobacco_list_item"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
      let match;
      while ((match = itemRegex.exec(chunk)) !== null) {
        allItems.push(match[0]);
      }
    }

    // Return the aggregated items as HTML
    return allItems.join('\n');
  }

  /**
   * Sleep for a specified number of milliseconds
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset the HTTP client rate limiter
   */
  resetRateLimiter(): void {
    this.httpClient.resetRateLimiter();
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Fetch all content from a scrollable page
 * @param path - The path to scroll (e.g., '/tobaccos/brands')
 * @param options - Optional configuration
 * @returns Promise resolving to scroll result
 */
export async function fetchAllScrollContent(
  path: string,
  options?: Partial<ScrollHandlerOptions>,
): Promise<ScrollResult> {
  const handler = new ScrollHandler({
    path,
    ...options,
  });
  return handler.fetchAll();
}
