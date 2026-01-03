/**
 * @hookah-db/parser
 *
 * Parser module for Hookah Tobacco Database API.
 * Handles parsing tobacco data from htreviews.org.
 */

// HTTP Client exports
export {
  HttpClient,
  HttpClientError,
  HttpClientOptions,
  HttpErrorType,
  httpClient,
} from './http/client.js';

export { default } from './http/client.js';

// Scroll Handler exports
export {
  ScrollHandler,
  fetchAllScrollContent,
} from './scroll/index.js';

export type {
  ScrollHandlerOptions,
  ScrollResult,
  ScrollMetadata,
} from './scroll/index.js';
