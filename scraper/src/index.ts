/**
 * Scraper Service
 *
 * This package handles scraping data from htreviews.org.
 * It includes HTTP client, HTML parsing, data extraction, and normalization.
 *
 * @package @hookah-db/scraper
 */

// Export HTTP client
export {
  HttpClient,
  type HttpClientConfig,
  type RequestOptions,
  type IterationState,
  type RequestResult,
} from './http-client.js';

// Export parser types
export type {
  BrandData,
  ProductData,
  ParsedBrandList,
  ParsedProductList,
  HTMXPaginationInfo,
} from './types.js';

// Export parser error
export { ParseError } from './parser-error.js';

// Export HTML parser functions
export {
  cleanText,
  normalizeUrl,
  extractSlug,
  parseHTMXPagination,
  parseBrandList,
  parseBrandDetail,
  parseProductList,
  parseProductDetail,
  isBrandDiscoveryComplete,
  isProductDiscoveryComplete,
} from './html-parser.js';
