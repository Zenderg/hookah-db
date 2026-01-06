/**
 * Base query parameters for search functionality
 */
export interface SearchQueryParams {
  /** Optional search term to filter results */
  search?: string;
}

/**
 * Query parameters for brand searches
 * Extends base search parameters with brand-specific filters
 */
export interface BrandQueryParams extends SearchQueryParams {
  /** Optional search term to filter brand names (name, nameEn) */
  search?: string;
}

/**
 * Query parameters for flavor searches
 * Extends base search parameters with flavor-specific filters
 */
export interface FlavorQueryParams extends SearchQueryParams {
  /** Optional search term to filter flavor names (name, nameAlt) */
  search?: string;
}
