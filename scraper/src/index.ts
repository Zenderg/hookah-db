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
