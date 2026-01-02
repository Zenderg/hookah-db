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

/**
 * Normalized brand data ready for storage
 */
export interface NormalizedBrand {
  /** Unique slug identifier for the brand */
  slug: string;
  /** Cleaned brand name */
  name: string;
  /** Cleaned brand description (optional) */
  description?: string;
  /** Normalized image URL (optional) */
  imageUrl?: string;
  /** Normalized source URL */
  sourceUrl: string;
  /** ISO 8601 timestamp when data was scraped */
  scrapedAt: string;
}

/**
 * Normalized product data ready for storage
 */
export interface NormalizedProduct {
  /** Unique slug identifier for the product */
  slug: string;
  /** Cleaned product name */
  name: string;
  /** Cleaned product description (optional) */
  description?: string;
  /** Normalized image URL (optional) */
  imageUrl?: string;
  /** Normalized source URL */
  sourceUrl: string;
  /** Brand slug for association */
  brandSlug: string;
  /** ISO 8601 timestamp when data was scraped */
  scrapedAt: string;
}

/**
 * Normalized brand detail data ready for storage
 */
export interface NormalizedBrandDetail {
  /** Unique slug identifier for the brand */
  slug: string;
  /** Cleaned brand name */
  name: string;
  /** Cleaned brand description (optional) */
  description?: string;
  /** Normalized image URL (optional) */
  imageUrl?: string;
  /** Normalized source URL */
  sourceUrl: string;
  /** ISO 8601 timestamp when data was scraped */
  scrapedAt: string;
}

/**
 * Normalized product detail data ready for storage
 */
export interface NormalizedProductDetail {
  /** Unique slug identifier for the product */
  slug: string;
  /** Cleaned product name */
  name: string;
  /** Cleaned product description (optional) */
  description?: string;
  /** Normalized image URL (optional) */
  imageUrl?: string;
  /** Normalized source URL */
  sourceUrl: string;
  /** Brand slug for association */
  brandSlug: string;
  /** ISO 8601 timestamp when data was scraped */
  scrapedAt: string;
}

/**
 * Result of data validation
 */
export interface ValidationResult {
  /** Whether the data passed validation */
  isValid: boolean;
  /** Array of validation error messages */
  errors: string[];
}

/**
 * Duplicate detector interface for tracking brands and products
 */
export interface DuplicateDetector {
  /** Set of brand slugs (case-insensitive) */
  brands: Set<string>;
  /** Map of brand slugs to product slug sets (case-insensitive) */
  products: Map<string, Set<string>>;
  /** Total count of all items tracked (brands + products) */
  totalCount: number;
}

/**
 * Type alias for parsed brand data
 */
export type ParsedBrand = BrandData;

/**
 * Type alias for parsed product data
 */
export type ParsedProduct = ProductData;

/**
 * Type alias for parsed brand detail data
 */
export type ParsedBrandDetail = BrandData;

/**
 * Type alias for parsed product detail data
 */
export type ParsedProductDetail = ProductData;
