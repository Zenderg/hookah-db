/**
 * Parser Types
 *
 * Type definitions for HTML parsing and data extraction.
 *
 * @module types
 */

/**
 * Extracted brand data from HTML
 */
export interface BrandData {
  /** Brand name (prefer English if available) */
  name: string;
  /** Brand description (optional) */
  description?: string;
  /** URL to brand image (optional) */
  imageUrl?: string;
  /** Source URL of the brand page */
  sourceUrl: string;
}

/**
 * Extracted product data from HTML
 */
export interface ProductData {
  /** Product name */
  name: string;
  /** Product description (optional) */
  description?: string;
  /** URL to product image (optional) */
  imageUrl?: string;
  /** Source URL of the product page */
  sourceUrl: string;
  /** Brand slug for association */
  brandSlug: string;
}

/**
 * Parsed brand list with pagination info
 */
export interface ParsedBrandList {
  /** Array of extracted brand data */
  brands: BrandData[];
  /** Whether more brands are available */
  hasMore: boolean;
  /** Total count of brands (from pagination) */
  totalCount: number;
  /** HTMX pagination information */
  pagination?: HTMXPaginationInfo;
}

/**
 * Parsed product list with pagination info
 */
export interface ParsedProductList {
  /** Array of extracted product data */
  products: ProductData[];
  /** Whether more products are available */
  hasMore: boolean;
  /** Total count of products (from pagination) */
  totalCount: number;
  /** HTMX pagination information */
  pagination?: HTMXPaginationInfo;
}

/**
 * HTMX pagination information extracted from data attributes
 */
export interface HTMXPaginationInfo {
  /** Target element for HTMX update */
  target: string;
  /** Current offset in the list */
  offset: number;
  /** Number of items per page */
  count: number;
  /** Total number of items available */
  totalCount: number;
  /** Endpoint URL for next page */
  endpoint: string;
}
