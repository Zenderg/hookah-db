import * as cheerio from 'cheerio';
import { loggingConfig } from '@hookah-db/shared';

// ============================================
// Type Definitions
// ============================================

/**
 * Brand data extracted from htreviews.org
 */
export interface Brand {
  /**
   * Brand name (e.g., "Догма", "Bonche")
   */
  name: string;

  /**
   * URL-friendly identifier (e.g., "dogma", "bonche")
   */
  slug: string;

  /**
   * Brand description text
   */
  description: string;

  /**
   * URL to brand image
   */
  image_url: string;
}

/**
 * Parsed brand listing result
 */
export interface BrandListingResult {
  /**
   * Array of parsed brands
   */
  brands: Brand[];

  /**
   * Total number of brands found
   */
  totalCount: number;

  /**
   * Number of brands successfully parsed
   */
  parsedCount: number;

  /**
   * Number of brands that failed validation
   */
  skippedCount: number;
}

/**
 * Options for brand listing parser
 */
export interface BrandListingParserOptions {
  /**
   * Skip validation for testing purposes
   */
  skipValidation?: boolean;

  /**
   * Include brands with missing optional fields
   */
  includeIncomplete?: boolean;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether brand data is valid
   */
  isValid: boolean;

  /**
   * Array of validation errors
   */
  errors: ValidationError[];
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a URL string
 * @param url - The URL to validate
 * @returns Whether URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate brand data
 * @param brand - The brand data to validate
 * @returns Validation result with errors if any
 */
export function validateBrand(brand: Partial<Brand>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name (required)
  if (!brand.name || typeof brand.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Name is required and must be a non-empty string',
      value: brand.name,
    });
  } else if (brand.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Name cannot be empty or whitespace only',
      value: brand.name,
    });
  }

  // Validate slug (required)
  if (!brand.slug || typeof brand.slug !== 'string') {
    errors.push({
      field: 'slug',
      message: 'Slug is required and must be a non-empty string',
      value: brand.slug,
    });
  } else if (brand.slug.trim().length === 0) {
    errors.push({
      field: 'slug',
      message: 'Slug cannot be empty or whitespace only',
      value: brand.slug,
    });
  } else if (!/^[a-z0-9-]+$/.test(brand.slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
      value: brand.slug,
    });
  }

  // Validate description (required)
  if (!brand.description || typeof brand.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'Description is required and must be a non-empty string',
      value: brand.description,
    });
  } else if (brand.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Description cannot be empty or whitespace only',
      value: brand.description,
    });
  }

  // Validate image_url (required)
  if (!brand.image_url || typeof brand.image_url !== 'string') {
    errors.push({
      field: 'image_url',
      message: 'Image URL is required and must be a non-empty string',
      value: brand.image_url,
    });
  } else if (!isValidUrl(brand.image_url)) {
    errors.push({
      field: 'image_url',
      message: 'Image URL must be a valid HTTP/HTTPS URL',
      value: brand.image_url,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// Parsing Functions
// ============================================

/**
 * Parse brand data from a single brand item element
 * @param $ - Cheerio instance
 * @param element - The brand item element
 * @returns Parsed brand data or null if parsing failed
 */
function parseBrandItem(
  $: cheerio.CheerioAPI,
  element: any,
): Partial<Brand> | null {
  const $element = $(element);

  try {
    // Extract name from first span inside .tobacco_list_item_name a.tobacco_list_item_slug
    const nameElement = $element.find('.tobacco_list_item_name a.tobacco_list_item_slug span').first();
    const name = nameElement.text().trim();

    // Extract slug from href attribute of .tobacco_list_item_slug a
    const slugElement = $element.find('.tobacco_list_item_name a.tobacco_list_item_slug').first();
    const href = slugElement.attr('href');
    
    // Extract slug from URL path (e.g., /tobaccos/dogma -> dogma, https://htreviews.org/tobaccos/dogma -> dogma)
    let slug = '';
    if (href) {
      // Handle both relative and absolute URLs
      const match = href.match(/\/tobaccos\/([^\/?#]+)(?:[\/?#]|$)/);
      if (match) {
        slug = match[1];
      }
    }

    // Extract description from .description_content span
    const descriptionElement = $element.find('.description_content span').first();
    const description = descriptionElement.text().trim();

    // Extract image URL from data-src attribute (lazy loading)
    const imageElement = $element.find('.tobacco_list_item_image img').first();
    const imageUrl = imageElement.attr('data-src') || imageElement.attr('src') || '';

    return {
      name,
      slug,
      description,
      image_url: imageUrl,
    };
  } catch (error) {
    if (loggingConfig.level === 'warn') {
      console.warn('[BrandParser] Failed to parse brand item:', error);
    }
    return null;
  }
}

/**
 * Parse brand listing page HTML
 * @param html - The HTML content of brands listing page
 * @param options - Parser options
 * @returns Parsed brand listing result
 */
export function parseBrandListing(
  html: string,
  options: BrandListingParserOptions = {},
): BrandListingResult {
  const { skipValidation = false, includeIncomplete = false } = options;

  if (loggingConfig.level === 'info') {
    console.log('[BrandParser] Parsing brand listing page');
  }

  // Load HTML into Cheerio
  const $ = cheerio.load(html);

  // Find all brand items
  const brandItems = $('.tobacco_list_item').toArray();

  if (loggingConfig.level === 'debug') {
    console.debug(`[BrandParser] Found ${brandItems.length} brand items`);
  }

  const brands: Brand[] = [];
  let skippedCount = 0;

  // Parse each brand item
  for (const item of brandItems) {
    const brandData = parseBrandItem($, item);

    if (!brandData) {
      skippedCount++;
      if (loggingConfig.level === 'warn') {
        console.warn('[BrandParser] Failed to parse brand item, skipping');
      }
      continue;
    }

    // Validate brand data
    if (!skipValidation) {
      const validationResult = validateBrand(brandData);

      if (!validationResult.isValid) {
        skippedCount++;
        if (loggingConfig.level === 'warn') {
          console.warn(
            `[BrandParser] Brand validation failed for "${brandData.name}":`,
            validationResult.errors.map((e) => e.message).join(', '),
          );
        }
        continue;
      }
    }

    // Add to results if all required fields are present
    if (includeIncomplete || (brandData.name && brandData.slug && brandData.description && brandData.image_url)) {
      brands.push(brandData as Brand);
    } else {
      skippedCount++;
      if (loggingConfig.level === 'warn') {
        console.warn('[BrandParser] Brand has missing required fields, skipping');
      }
    }
  }

  if (loggingConfig.level === 'info') {
    console.log(
      `[BrandParser] Parsed ${brands.length} brands, skipped ${skippedCount} invalid brands`,
    );
  }

  return {
    brands,
    totalCount: brandItems.length,
    parsedCount: brands.length,
    skippedCount,
  };
}

/**
 * Parse brand detail page HTML
 * @param html - The HTML content of a brand detail page
 * @param options - Parser options
 * @returns Parsed brand data or null if parsing failed
 */
export function parseBrandDetail(
  html: string,
  options: BrandListingParserOptions = {},
): Brand | null {
  const { skipValidation = false } = options;

  if (loggingConfig.level === 'info') {
    console.log('[BrandParser] Parsing brand detail page');
  }

  // Load HTML into Cheerio
  const $ = cheerio.load(html);

  // Try to find brand information in page
  // Brand detail pages may have different structure than listing pages
  // We'll look for common patterns

  // Pattern 1: Look for .tobacco_list_item (same structure as listing)
  const brandItem = $('.tobacco_list_item').first();
  
  if (brandItem.length > 0) {
    const brandData = parseBrandItem($, brandItem.get(0));

    if (!brandData) {
      if (loggingConfig.level === 'warn') {
        console.warn('[BrandParser] Failed to parse brand detail from listing structure');
      }
      return null;
    }

    // Validate brand data
    if (!skipValidation) {
      const validationResult = validateBrand(brandData);

      if (!validationResult.isValid) {
        if (loggingConfig.level === 'warn') {
          console.warn(
            `[BrandParser] Brand detail validation failed:`,
            validationResult.errors.map((e) => e.message).join(', '),
          );
        }
        return null;
      }
    }

    return brandData as Brand;
  }

  // Pattern 2: Look for brand-specific structure (to be implemented based on actual detail page structure)
  // This is a placeholder for future enhancement when we have detail page examples
  
  if (loggingConfig.level === 'warn') {
    console.warn('[BrandParser] No recognizable brand structure found in detail page');
  }

  return null;
}

/**
 * Parse multiple brand listing pages (for scroll handler integration)
 * @param htmlChunks - Array of HTML chunks from multiple pages
 * @param options - Parser options
 * @returns Parsed brand listing result
 */
export function parseMultipleBrandListings(
  htmlChunks: string[],
  options: BrandListingParserOptions = {},
): BrandListingResult {
  if (loggingConfig.level === 'info') {
    console.log(`[BrandParser] Parsing ${htmlChunks.length} brand listing pages`);
  }

  const allBrands: Brand[] = [];
  let totalCount = 0;
  let skippedCount = 0;

  for (const html of htmlChunks) {
    const result = parseBrandListing(html, options);
    allBrands.push(...result.brands);
    totalCount += result.totalCount;
    skippedCount += result.skippedCount;
  }

  return {
    brands: allBrands,
    totalCount,
    parsedCount: allBrands.length,
    skippedCount,
  };
}
