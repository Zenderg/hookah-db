/**
 * API Flavor Extractor
 * 
 * Orchestrates API requests to extract all flavor URLs for a brand
 * by calling htreviews.org's /postData endpoint.
 */

import { HttpClient, HttpClientError } from './http-client';
import { BrandIdExtractor } from './brand-id-extractor';
import { FlavorUrlParser, ParsedFlavorUrl } from './flavor-url-parser';
import { ApiResponseValidator } from './api-response-validator';
import { LoggerFactory } from '@hookah-db/utils';

// ============================================================================
// Logger Helper
// ============================================================================

/**
 * Lazy logger initialization to support mocking in tests
 * The logger is only created when first accessed
 */
let _logger: any = null;

function getLogger(): any {
  if (!_logger) {
    try {
      const factoryLogger = LoggerFactory.createEnvironmentLogger('scraper');
      if (factoryLogger && typeof factoryLogger === 'object') {
        _logger = factoryLogger;
      } else {
        throw new Error('Logger factory returned invalid logger');
      }
    } catch (error) {
      // Fallback to console if logger factory fails (e.g., in tests)
      _logger = {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        verbose: console.debug.bind(console),
      };
    }
  }
  return _logger;
}

/**
 * Reset logger (useful for testing)
 */
export function resetLogger(): void {
  _logger = null;
}

// ============================================================================
// API Flavor Extractor Implementation
// ============================================================================

/**
 * API Flavor Extractor Configuration
 */
export interface ApiFlavorExtractorConfig {
  /** API endpoint path (default: /postData) */
  apiEndpoint?: string;
  /** Number of flavors per request (default: 20) */
  flavorsPerRequest?: number;
  /** Maximum number of pages to fetch (default: 100) */
  maxPages?: number;
  /** Delay between requests in milliseconds (default: 500) */
  requestDelay?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Whether to enable API-based extraction (default: true) */
  enableApiExtraction?: boolean;
  /** Whether to fallback to HTML scraping if API fails (default: true) */
  enableFallback?: boolean;
}

/**
 * API Flavor Extraction Result
 */
export interface ApiFlavorExtractionResult {
  /** Array of flavor URLs */
  flavorUrls: string[];
  /** Total number of flavors extracted */
  totalCount: number;
  /** Number of API requests made */
  requestsCount: number;
  /** Extraction time in milliseconds */
  extractionTime: number;
  /** Whether fallback was used */
  usedFallback: boolean;
}

/**
 * API Flavor Extractor Class
 * 
 * Orchestrates API requests to /postData endpoint to extract all flavor URLs for a brand.
 */
export class ApiFlavorExtractor {
  private httpClient: HttpClient;
  private config: Required<ApiFlavorExtractorConfig>;
  private brandIdExtractor: BrandIdExtractor;
  private flavorUrlParser: FlavorUrlParser;
  private apiResponseValidator: ApiResponseValidator;

  constructor(
    httpClient: HttpClient,
    config?: ApiFlavorExtractorConfig
  ) {
    this.httpClient = httpClient;
    this.config = {
      apiEndpoint: config?.apiEndpoint || '/postData',
      flavorsPerRequest: config?.flavorsPerRequest || 20,
      maxPages: config?.maxPages || 100,
      requestDelay: config?.requestDelay || 500,
      maxRetries: config?.maxRetries || 3,
      enableApiExtraction: config?.enableApiExtraction !== false,
      enableFallback: config?.enableFallback !== false,
    };
    this.brandIdExtractor = new BrandIdExtractor();
    this.flavorUrlParser = new FlavorUrlParser();
    this.apiResponseValidator = new ApiResponseValidator();
  }

  /**
   * Extract all flavor URLs for a brand using API
   * 
   * @param brandId Brand ID from brand detail page
   * @param brandSlug Brand slug for logging
   * @returns Promise resolving to extraction result
   */
  async extractFlavorUrls(
    brandId: string,
    brandSlug: string
  ): Promise<ApiFlavorExtractionResult> {
    const logger = getLogger();
    const startTime = Date.now();
    const allFlavorUrls: string[] = [];
    let requestsCount = 0;
    let hadError = false;
    let lastError: Error | undefined;

    logger.info('Starting API-based flavor extraction', { 
      brandSlug,
      brandId,
      flavorsPerRequest: this.config.flavorsPerRequest,
      requestDelay: this.config.requestDelay,
    } as any);

    let offset = 0;
    let pageCount = 0;

    // Pagination loop with error handling
    try {
      while (pageCount < this.config.maxPages) {
        pageCount++;
        logger.debug(`Fetching page ${pageCount} with offset ${offset}`, { 
          brandSlug,
          brandId,
          offset 
        } as any);

        // Make API request (let errors propagate to outer catch)
        const response = await this.fetchFlavorsFromApi(brandId, offset);
        requestsCount++;

        // Validate response
        const validation = this.apiResponseValidator.validateResponse(response);
        
        if (!validation.isValid) {
          logger.warn('API response validation failed', { 
            brandSlug,
            brandId,
            offset,
            errors: validation.errors 
          } as any);
          // Continue with next page even if validation fails
          break;
        }

        // Parse flavor URLs from response
        const parsedUrls: ParsedFlavorUrl[] = this.flavorUrlParser.parseFlavorUrls(response, brandSlug);
        const flavorUrls = parsedUrls.map(p => p.url);
        
        allFlavorUrls.push(...flavorUrls);

        logger.debug(`Extracted ${flavorUrls.length} flavors from page ${pageCount}`, { 
          brandSlug,
          brandId,
          offset,
          totalFlavors: allFlavorUrls.length 
        } as any);

        // Check if all flavors have been extracted
        if (this.isComplete(flavorUrls.length, this.config.flavorsPerRequest)) {
          logger.info('All flavors extracted', { 
            brandSlug,
            brandId,
            totalCount: allFlavorUrls.length,
            requestsCount 
          } as any);
          break;
        }

        // Increment offset for next page
        offset += this.config.flavorsPerRequest;

        // Add delay between requests (before next request)
        if (this.config.requestDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
        }
      }
    } catch (error) {
      // Store error for later handling
      lastError = error instanceof Error ? error : new Error(String(error));
      hadError = true;
      
      const errorMessage = lastError.message;
      const errorStack = lastError.stack;
      
      logger.error('API-based flavor extraction failed', { 
        brandSlug,
        brandId,
        error: errorMessage,
        stack: errorStack 
      } as any);

      // If fallback is disabled, throw error
      if (!this.config.enableFallback) {
        throw lastError;
      }

      // If fallback is enabled, return empty result with usedFallback=true
      const extractionTime = Date.now() - startTime;
      return {
        flavorUrls: [],
        totalCount: 0,
        requestsCount,
        extractionTime,
        usedFallback: true,
      };
    }

    const extractionTime = Date.now() - startTime;

    logger.info('API-based flavor extraction completed', {
      brandSlug,
      brandId,
      totalCount: allFlavorUrls.length,
      requestsCount,
      extractionTime,
      avgTimePerRequest: requestsCount > 0 ? extractionTime / requestsCount : 0,
      usedFallback: hadError && this.config.enableFallback,
    } as any);

    // Remove duplicates
    const uniqueUrls = Array.from(new Set(allFlavorUrls));
    
    if (uniqueUrls.length !== allFlavorUrls.length) {
      logger.debug(`Removed ${allFlavorUrls.length - uniqueUrls.length} duplicate URLs`, {
        brandSlug,
        originalCount: allFlavorUrls.length,
        uniqueCount: uniqueUrls.length,
      } as any);
    }

    return {
      flavorUrls: uniqueUrls,
      totalCount: uniqueUrls.length,
      requestsCount,
      extractionTime,
      usedFallback: hadError && this.config.enableFallback,
    };
  }

  /**
   * Extract all flavor URLs for a brand with automatic brand ID extraction
   * 
   * @param brandSlug Brand slug
   * @returns Promise resolving to extraction result
   */
  async extractFlavorUrlsBySlug(brandSlug: string): Promise<ApiFlavorExtractionResult> {
    const logger = getLogger();
    const startTime = Date.now();

    try {
      logger.info('Extracting brand ID for API extraction', { brandSlug } as any);

      // Extract brand ID from brand detail page
      const brandId = await this.brandIdExtractor.extractBrandIdFromPage(brandSlug);

      if (!brandId) {
        logger.warn('Failed to extract brand ID, cannot use API extraction', { brandSlug } as any);
        
        // Return result indicating fallback should be used
        return {
          flavorUrls: [],
          totalCount: 0,
          requestsCount: 0,
          extractionTime: Date.now() - startTime,
          usedFallback: true,
        };
      }

      // Extract flavor URLs using API
      return await this.extractFlavorUrls(brandId, brandSlug);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Failed to extract flavor URLs by slug', { 
        brandSlug,
        error: errorMessage,
        stack: errorStack 
      } as any);

      // Return result indicating fallback should be used
      return {
        flavorUrls: [],
        totalCount: 0,
        requestsCount: 0,
        extractionTime: Date.now() - startTime,
        usedFallback: true,
      };
    }
  }

  /**
   * Make a single API request to fetch flavors
   * 
   * @param brandId Brand ID
   * @param offset Offset for pagination
   * @returns Promise resolving to API response
   */
  private async fetchFlavorsFromApi(
    brandId: string,
    offset: number
  ): Promise<any> {
    const logger = getLogger();
    let lastError: Error | undefined;
    const maxRetries = this.config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const payload = {
          action: 'objectByBrand',
          data: {
            id: brandId,
            limit: this.config.flavorsPerRequest,
            offset: offset,
            sort: {}, // Add sorting if needed
          },
        };

        logger.debug(`Making API request (attempt ${attempt + 1}/${maxRetries + 1})`, {
          payload: { action: payload.action, id: brandId, offset },
        } as any);

        const response = await this.httpClient.post(
          this.config.apiEndpoint,
          payload
        );

        return response.data;
      } catch (error) {
        // Ensure error is an Error object
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is HttpClientError with statusCode
        const isHttpClientError = error instanceof HttpClientError;
        const statusCode = isHttpClientError ? error.statusCode : undefined;
        
        // Don't retry on client errors (4xx) - throw immediately
        if (isHttpClientError && 
            statusCode !== undefined && 
            statusCode >= 400 && 
            statusCode < 500) {
          logger.warn('API request failed with client error, no retry', {
            statusCode,
            attempt: attempt + 1,
          } as any);
          throw error;
        }

        // Don't retry after max attempts - throw error
        if (attempt >= maxRetries) {
          const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
          logger.error('API request failed after max retries', {
            maxRetries: maxRetries + 1,
            error: errorMessage,
          } as any);
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        logger.warn(`API request failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: errorMessage,
        } as any);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Unknown error in fetchFlavorsFromApi');
  }

  /**
   * Check if all flavors have been extracted
   * 
   * @param currentCount Current number of flavors extracted
   * @param lastResponseCount Number of flavors in last response
   * @returns True if all flavors extracted
   */
  private isComplete(currentCount: number, lastResponseCount: number): boolean {
    // If we got fewer flavors than requested, we've reached end
    return currentCount === 0 || currentCount < lastResponseCount;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default ApiFlavorExtractor;
