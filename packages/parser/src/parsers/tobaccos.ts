import * as cheerio from 'cheerio';
import { loggingConfig } from '@hookah-db/shared';

// ============================================
// Type Definitions
// ============================================

/**
 * Tobacco data extracted from htreviews.org
 */
export interface Tobacco {
  /**
   * Tobacco name (e.g., "Зима", "Кола")
   */
  name: string;

  /**
   * URL-friendly identifier (e.g., "zima", "kola")
   */
  slug: string;

  /**
   * Tobacco description text
   */
  description: string;

  /**
   * URL to tobacco image
   */
  image_url: string;

  /**
   * Brand slug (e.g., "sarma", "dogma")
   */
  brand_slug: string;

  /**
   * Alternative name (optional, e.g., "Двойное яблоко")
   */
  alternative_name?: string;

  /**
   * Line name (optional, e.g., "Классическая", "Легкая Сарма 360")
   */
  line_name?: string;

  /**
   * Country of origin (optional)
   */
  country?: string;

  /**
   * Strength level (optional, e.g., "Средняя", "Лёгкая")
   */
  strength?: string;

  /**
   * Status (optional, e.g., "Выпускается", "Лимитированный")
   */
  status?: string;
}

/**
 * Parsed tobacco listing result
 */
export interface TobaccoListingResult {
  /**
   * Array of parsed tobaccos
   */
  tobaccos: Tobacco[];

  /**
   * Total number of tobaccos found
   */
  totalCount: number;

  /**
   * Number of tobaccos successfully parsed
   */
  parsedCount: number;

  /**
   * Number of tobaccos that failed validation
   */
  skippedCount: number;
}

/**
 * Options for tobacco listing parser
 */
export interface TobaccoListingParserOptions {
  /**
   * Skip validation for testing purposes
   */
  skipValidation?: boolean;

  /**
   * Include tobaccos with missing optional fields
   */
  includeIncomplete?: boolean;

  /**
   * Brand slug to associate with tobaccos (optional)
   */
  brandSlug?: string;
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
   * Whether tobacco data is valid
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
 * Validate tobacco data
 * @param tobacco - The tobacco data to validate
 * @returns Validation result with errors if any
 */
export function validateTobacco(tobacco: Partial<Tobacco>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name (required)
  if (!tobacco.name || typeof tobacco.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Name is required and must be a non-empty string',
      value: tobacco.name,
    });
  } else if (tobacco.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Name cannot be empty or whitespace only',
      value: tobacco.name,
    });
  }

  // Validate slug (required)
  if (!tobacco.slug || typeof tobacco.slug !== 'string') {
    errors.push({
      field: 'slug',
      message: 'Slug is required and must be a non-empty string',
      value: tobacco.slug,
    });
  } else if (tobacco.slug.trim().length === 0) {
    errors.push({
      field: 'slug',
      message: 'Slug cannot be empty or whitespace only',
      value: tobacco.slug,
    });
  } else if (!/^[a-z0-9-]+$/.test(tobacco.slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
      value: tobacco.slug,
    });
  }

  // Validate description (required)
  if (!tobacco.description || typeof tobacco.description !== 'string') {
    errors.push({
      field: 'description',
      message: 'Description is required and must be a non-empty string',
      value: tobacco.description,
    });
  } else if (tobacco.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Description cannot be empty or whitespace only',
      value: tobacco.description,
    });
  }

  // Validate image_url (required)
  if (!tobacco.image_url || typeof tobacco.image_url !== 'string') {
    errors.push({
      field: 'image_url',
      message: 'Image URL is required and must be a non-empty string',
      value: tobacco.image_url,
    });
  } else if (!isValidUrl(tobacco.image_url)) {
    errors.push({
      field: 'image_url',
      message: 'Image URL must be a valid HTTP/HTTPS URL',
      value: tobacco.image_url,
    });
  }

  // Validate brand_slug (required)
  if (!tobacco.brand_slug || typeof tobacco.brand_slug !== 'string') {
    errors.push({
      field: 'brand_slug',
      message: 'Brand slug is required and must be a non-empty string',
      value: tobacco.brand_slug,
    });
  } else if (tobacco.brand_slug.trim().length === 0) {
    errors.push({
      field: 'brand_slug',
      message: 'Brand slug cannot be empty or whitespace only',
      value: tobacco.brand_slug,
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
 * Parse tobacco data from a single tobacco item element
 * @param $ - Cheerio instance
 * @param element - The tobacco item element
 * @param brandSlug - Optional brand slug to use if not found in element
 * @returns Parsed tobacco data or null if parsing failed
 */
function parseTobaccoItem(
  $: cheerio.CheerioAPI,
  element: any,
  brandSlug?: string,
): Partial<Tobacco> | null {
  const $element = $(element);

  try {
    // Extract name from first span inside .tobacco_list_item_name a.tobacco_list_item_slug
    const nameElement = $element.find('.tobacco_list_item_name a.tobacco_list_item_slug span').first();
    const name = nameElement.text().trim();

    // Extract alternative name from second span (optional)
    const alternativeNameElement = $element.find('.tobacco_list_item_name a.tobacco_list_item_slug span').eq(1);
    const alternativeName = alternativeNameElement.length > 0 ? alternativeNameElement.text().trim() : undefined;

    // Extract slug from href attribute of .tobacco_list_item_slug a
    const slugElement = $element.find('.tobacco_list_item_name a.tobacco_list_item_slug').first();
    const href = slugElement.attr('href');
    
    // Extract slug from URL path (e.g., /tobaccos/sarma/klassicheskaya/zima -> zima)
    let slug = '';
    if (href) {
      // Handle both relative and absolute URLs
      const match = href.match(/\/tobaccos\/[^\/]+(?:\/[^\/]+)?\/([^\/?#]+)(?:[\/?#]|$)/);
      if (match) {
        slug = match[1];
      }
    }

    // Extract brand slug from brand link
    const brandSlugElement = $element.find('.tobacco_list_item_brand_slug a').first();
    const brandHref = brandSlugElement.attr('href');
    let extractedBrandSlug = '';
    if (brandHref) {
      const brandMatch = brandHref.match(/\/tobaccos\/([^\/?#]+)(?:[\/?#]|$)/);
      if (brandMatch) {
        extractedBrandSlug = brandMatch[1];
      }
    }

    // Use provided brandSlug or extracted brand slug
    const finalBrandSlug = brandSlug || extractedBrandSlug;

    // Extract line name (optional)
    const lineSlugElement = $element.find('.tobacco_list_item_line_slug a').first();
    const lineName = lineSlugElement.length > 0 ? lineSlugElement.find('span').text().trim() : undefined;

    // Extract image URL from data-src attribute (lazy loading)
    const imageElement = $element.find('.tobacco_list_item_image img').first();
    const imageUrl = imageElement.attr('data-src') || imageElement.attr('src') || '';

    // Extract description from Schema.org JSON-LD if available
    let description = '';
    const scriptElement = $element.find('script[type="application/ld+json"]').first();
    if (scriptElement.length > 0) {
      try {
        const schemaData = JSON.parse(scriptElement.html() || '{}');
        if (schemaData.description) {
          description = schemaData.description;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // If no description in schema, try to extract from other elements
    if (!description) {
      // Try to get description from review content
      const reviewContentElement = $element.find('.last_reviews_item_content span').first();
      description = reviewContentElement.text().trim();
    }

    // Extract status (optional)
    const statusElement = $element.find('.tobacco_list_item_status span').first();
    const status = statusElement.length > 0 ? statusElement.text().trim() : undefined;

    return {
      name,
      slug,
      description,
      image_url: imageUrl,
      brand_slug: finalBrandSlug,
      alternative_name: alternativeName,
      line_name: lineName,
      status,
    };
  } catch (error) {
    if (loggingConfig.level === 'warn') {
      console.warn('[TobaccoParser] Failed to parse tobacco item:', error);
    }
    return null;
  }
}

/**
 * Parse tobacco listing page HTML
 * @param html - The HTML content of tobaccos listing page
 * @param options - Parser options
 * @returns Parsed tobacco listing result
 */
export function parseTobaccoListing(
  html: string,
  options: TobaccoListingParserOptions = {},
): TobaccoListingResult {
  const { skipValidation = false, includeIncomplete = false, brandSlug } = options;

  if (loggingConfig.level === 'info') {
    console.log('[TobaccoParser] Parsing tobacco listing page');
  }

  // Load HTML into Cheerio
  const $ = cheerio.load(html);

  // Find all tobacco items
  const tobaccoItems = $('.tobacco_list_item').toArray();

  if (loggingConfig.level === 'debug') {
    console.debug(`[TobaccoParser] Found ${tobaccoItems.length} tobacco items`);
  }

  const tobaccos: Tobacco[] = [];
  let skippedCount = 0;

  // Parse each tobacco item
  for (const item of tobaccoItems) {
    const tobaccoData = parseTobaccoItem($, item, brandSlug);

    if (!tobaccoData) {
      skippedCount++;
      if (loggingConfig.level === 'warn') {
        console.warn('[TobaccoParser] Failed to parse tobacco item, skipping');
      }
      continue;
    }

    // Validate tobacco data
    if (!skipValidation) {
      const validationResult = validateTobacco(tobaccoData);

      if (!validationResult.isValid) {
        skippedCount++;
        if (loggingConfig.level === 'warn') {
          console.warn(
            `[TobaccoParser] Tobacco validation failed for "${tobaccoData.name}":`,
            validationResult.errors.map((e) => e.message).join(', '),
          );
        }
        continue;
      }
    }

    // Add to results if all required fields are present
    if (includeIncomplete || (
      tobaccoData.name && 
      tobaccoData.slug && 
      tobaccoData.description && 
      tobaccoData.image_url && 
      tobaccoData.brand_slug
    )) {
      tobaccos.push(tobaccoData as Tobacco);
    } else {
      skippedCount++;
      if (loggingConfig.level === 'warn') {
        console.warn('[TobaccoParser] Tobacco has missing required fields, skipping');
      }
    }
  }

  if (loggingConfig.level === 'info') {
    console.log(
      `[TobaccoParser] Parsed ${tobaccos.length} tobaccos, skipped ${skippedCount} invalid tobaccos`,
    );
  }

  return {
    tobaccos,
    totalCount: tobaccoItems.length,
    parsedCount: tobaccos.length,
    skippedCount,
  };
}

/**
 * Parse tobacco detail page HTML
 * @param html - The HTML content of a tobacco detail page
 * @param options - Parser options
 * @returns Parsed tobacco data or null if parsing failed
 */
export function parseTobaccoDetail(
  html: string,
  options: TobaccoListingParserOptions = {},
): Tobacco | null {
  const { skipValidation = false, brandSlug } = options;

  if (loggingConfig.level === 'info') {
    console.log('[TobaccoParser] Parsing tobacco detail page');
  }

  // Load HTML into Cheerio
  const $ = cheerio.load(html);

  // Try to find tobacco information in page
  // Pattern 1: Look for .object_wrapper (detail page structure)
  const objectWrapper = $('.object_wrapper').first();
  
  if (objectWrapper.length > 0) {
    try {
      // Extract name from .object_card_title h1
      const nameElement = objectWrapper.find('.object_card_title h1').first();
      const name = nameElement.text().trim();

      // Extract description from .object_card_discr span
      const descriptionElement = objectWrapper.find('.object_card_discr span').first();
      const description = descriptionElement.text().trim();

      // Extract image URL from .object_image img
      const imageElement = objectWrapper.find('.object_image img').first();
      const imageUrl = imageElement.attr('src') || '';

      // Extract brand slug from brand link
      const brandSlugElement = objectWrapper.find('.object_info_item a').first();
      const brandHref = brandSlugElement.attr('href');
      let extractedBrandSlug = '';
      if (brandHref) {
        const brandMatch = brandHref.match(/\/tobaccos\/([^\/?#]+)(?:[\/?#]|$)/);
        if (brandMatch) {
          extractedBrandSlug = brandMatch[1];
        }
      }

      // Use provided brandSlug or extracted brand slug
      const finalBrandSlug = brandSlug || extractedBrandSlug;

      // Extract line name (optional)
      const lineNameElement = objectWrapper.find('.object_info_item a').eq(1);
      const lineName = lineNameElement.length > 0 ? lineNameElement.text().trim() : undefined;

      // Extract country (optional)
      const countryElement = objectWrapper.find('.object_info_item').filter((_, el) => {
        return $(el).find('span').first().text().trim() === 'Страна';
      }).find('span').last();
      const country = countryElement.length > 0 ? countryElement.text().trim() : undefined;

      // Extract strength (optional)
      const strengthElement = objectWrapper.find('.object_info_item').filter((_, el) => {
        const label = $(el).find('span').first().text().trim();
        return label.includes('Крепость');
      }).find('span').last();
      const strength = strengthElement.length > 0 ? strengthElement.text().trim() : undefined;

      // Extract status (optional)
      const statusElement = objectWrapper.find('.object_info_item').filter((_, el) => {
        return $(el).find('span').first().text().trim() === 'Статус';
      }).find('span').last();
      const status = statusElement.length > 0 ? statusElement.text().trim() : undefined;

      // Extract slug from Schema.org JSON-LD if available
      let slug = '';
      const scriptElement = objectWrapper.find('script[type="application/ld+json"]').first();
      if (scriptElement.length > 0) {
        try {
          const schemaData = JSON.parse(scriptElement.html() || '{}');
          if (schemaData.url) {
            const urlMatch = schemaData.url.match(/\/tobaccos\/[^\/]+(?:\/[^\/]+)?\/([^\/?#]+)(?:[\/?#]|$)/);
            if (urlMatch) {
              slug = urlMatch[1];
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      // If no slug from schema, try to extract from page URL or breadcrumb
      if (!slug) {
        const breadcrumbElement = $('script[type="application/ld+json"]').filter((_, el) => {
          try {
            const data = JSON.parse($(el).html() || '{}');
            return data['@type'] === 'BreadcrumbList';
          } catch {
            return false;
          }
        }).first();
        
        if (breadcrumbElement.length > 0) {
          try {
            const breadcrumbData = JSON.parse(breadcrumbElement.html() || '{}');
            if (breadcrumbData.itemListElement && Array.isArray(breadcrumbData.itemListElement)) {
              const lastItem = breadcrumbData.itemListElement[breadcrumbData.itemListElement.length - 1];
              if (lastItem && lastItem.item) {
                const urlMatch = lastItem.item.match(/\/tobaccos\/[^\/]+(?:\/[^\/]+)?\/([^\/?#]+)(?:[\/?#]|$)/);
                if (urlMatch) {
                  slug = urlMatch[1];
                }
              }
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }

      const tobaccoData: Partial<Tobacco> = {
        name,
        slug,
        description,
        image_url: imageUrl,
        brand_slug: finalBrandSlug,
        line_name: lineName,
        country,
        strength,
        status,
      };

      // Validate tobacco data
      if (!skipValidation) {
        const validationResult = validateTobacco(tobaccoData);

        if (!validationResult.isValid) {
          if (loggingConfig.level === 'warn') {
            console.warn(
              `[TobaccoParser] Tobacco detail validation failed:`,
              validationResult.errors.map((e) => e.message).join(', '),
            );
          }
          return null;
        }
      }

      return tobaccoData as Tobacco;
    } catch (error) {
      if (loggingConfig.level === 'warn') {
        console.warn('[TobaccoParser] Failed to parse tobacco detail from object structure:', error);
      }
      return null;
    }
  }

  // Pattern 2: Look for .tobacco_list_item (same structure as listing)
  const tobaccoItem = $('.tobacco_list_item').first();
  
  if (tobaccoItem.length > 0) {
    const tobaccoData = parseTobaccoItem($, tobaccoItem.get(0), brandSlug);

    if (!tobaccoData) {
      if (loggingConfig.level === 'warn') {
        console.warn('[TobaccoParser] Failed to parse tobacco detail from listing structure');
      }
      return null;
    }

    // Validate tobacco data
    if (!skipValidation) {
      const validationResult = validateTobacco(tobaccoData);

      if (!validationResult.isValid) {
        if (loggingConfig.level === 'warn') {
          console.warn(
            `[TobaccoParser] Tobacco detail validation failed:`,
            validationResult.errors.map((e) => e.message).join(', '),
          );
        }
        return null;
      }
    }

    return tobaccoData as Tobacco;
  }

  if (loggingConfig.level === 'warn') {
    console.warn('[TobaccoParser] No recognizable tobacco structure found in detail page');
  }

  return null;
}

/**
 * Parse multiple tobacco listing pages (for scroll handler integration)
 * @param htmlChunks - Array of HTML chunks from multiple pages
 * @param options - Parser options
 * @returns Parsed tobacco listing result
 */
export function parseMultipleTobaccoListings(
  htmlChunks: string[],
  options: TobaccoListingParserOptions = {},
): TobaccoListingResult {
  if (loggingConfig.level === 'info') {
    console.log(`[TobaccoParser] Parsing ${htmlChunks.length} tobacco listing pages`);
  }

  const allTobaccos: Tobacco[] = [];
  let totalCount = 0;
  let skippedCount = 0;

  for (const html of htmlChunks) {
    const result = parseTobaccoListing(html, options);
    allTobaccos.push(...result.tobaccos);
    totalCount += result.totalCount;
    skippedCount += result.skippedCount;
  }

  return {
    tobaccos: allTobaccos,
    totalCount,
    parsedCount: allTobaccos.length,
    skippedCount,
  };
}
