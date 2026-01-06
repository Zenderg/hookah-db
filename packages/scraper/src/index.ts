/**
 * Web scraper for htreviews.org
 * This package contains web scraping logic, HTML parsing utilities, and HTTP client
 */

// ============================================================================
// HTTP Client Exports
// ============================================================================

export {
  HttpClient,
  httpClient,
  HttpClientError,
  MaxRetriesExceededError,
  RequestTimeoutError,
  RateLimitError,
  RETRYABLE_STATUS_CODES,
} from './http-client';

export type { HttpClientConfig } from './http-client';

// ============================================================================
// HTML Parser Exports
// ============================================================================

export {
  // Text extraction helpers
  extractText,
  extractAttribute,
  extractNumber,
  extractHtml,
  extractTextArray,
  extractAttributeArray,
  extractLinkUrl,
  
  // Special format parsers
  parseViewsCount,
  parseDate,
  parseFlavorsCount,
  parseBoolean,
  parseInteger,
  parseFloatValue,
  
  // Rating distribution parser
  parseRatingDistribution,
  
  // Smoke again percentage parser
  parseSmokeAgainPercentage,
  
  // Image URL parser
  extractImageUrl,
  
  // Slug extractor
  extractSlugFromUrl,
  
  // Rating parser
  extractRating,
  
  // URL builder
  buildUrl,
  
  // Type exports
  type CheerioAPI,
  type CheerioSelector,
} from './html-parser';

// ============================================================================
// Scraper Exports
// ============================================================================

export {
  Scraper,
  scraper,
  ScrapeError,
} from './scraper';

export type {
  ScraperConfig,
  ScrapeResult,
} from './scraper';

// ============================================================================
// Brand Scraper Exports
// ============================================================================

export {
  scrapeBrandsList,
} from './brand-scraper';

export type {
  BrandSummary,
} from './brand-scraper';

// ============================================================================
// Brand Details Scraper Exports
// ============================================================================

export {
  scrapeBrandDetails,
  extractFlavorUrls,
} from './brand-details-scraper';

// ============================================================================
// Flavor Details Scraper Exports
// ============================================================================

export {
  scrapeFlavorDetails,
  extractDetailedTags,
} from './flavor-details-scraper';

export type {
  FlavorTag,
} from './flavor-details-scraper';

// ============================================================================
// Default Exports
// ============================================================================

export { default } from './http-client';
export { default as defaultScraper } from './scraper';
