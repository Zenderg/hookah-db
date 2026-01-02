/**
 * HTML Parser Module
 *
 * Provides functions to parse HTML from htreviews.org and extract brand and product data.
 * Uses cheerio for HTML parsing and follows the CSS selectors identified in the HTML analysis.
 *
 * @module html-parser
 */

import { URL } from 'url';

import * as cheerio from 'cheerio';

import { ParseError } from './parser-error.js';
import type {
  BrandData,
  ProductData,
  ParsedBrandList,
  ParsedProductList,
  HTMXPaginationInfo,
} from './types.js';

/**
 * Clean text by removing extra whitespace and handling null/undefined
 *
 * @param text - Text to clean
 * @returns Cleaned text, or empty string if null/undefined
 */
export function cleanText(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize URL by handling relative URLs and ensuring proper format
 *
 * @param url - URL to normalize
 * @param baseUrl - Base URL for resolving relative URLs (optional)
 * @returns Normalized absolute URL, or null if invalid
 */
export function normalizeUrl(url: string | null | undefined, baseUrl?: string): string | null {
  if (!url) {
    return null;
  }

  try {
    // If it's already an absolute URL, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If no base URL provided, assume it's relative to htreviews.org
    const base = baseUrl ?? 'https://htreviews.org';
    const absoluteUrl = new URL(url, base);
    return absoluteUrl.toString();
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`, error);
    return null;
  }
}

/**
 * Extract slug from URL
 *
 * @param url - URL to extract slug from
 * @returns Extracted slug, or null if not found
 */
export function extractSlug(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Return the last path segment as the slug
    return pathParts.length > 0 ? pathParts[pathParts.length - 1]! : null;
  } catch (error) {
    console.warn(`Failed to extract slug from URL: ${url}`, error);
    return null;
  }
}

/**
 * Extract HTMX pagination information from an element
 *
 * @param element - Cheerio element to extract pagination info from
 * @returns HTMX pagination info, or null if not found
 */
export function parseHTMXPagination(element: cheerio.Cheerio<any> | null): HTMXPaginationInfo | null {
  if (!element || element.length === 0) {
    return null;
  }

  try {
    const target = element.attr('data-target');
    const offsetStr = element.attr('data-offset');
    const countStr = element.attr('data-count');
    const totalCountStr = element.attr('data-total-count');

    if (!target || offsetStr === undefined || countStr === undefined || totalCountStr === undefined) {
      return null;
    }

    const offset = parseInt(offsetStr, 10);
    const count = parseInt(countStr, 10);
    const totalCount = parseInt(totalCountStr, 10);

    if (isNaN(offset) || isNaN(count) || isNaN(totalCount)) {
      console.warn('Invalid pagination data: offset, count, or totalCount is not a number');
      return null;
    }

    // Construct endpoint URL from target
    const endpoint = `https://htreviews.org${target}`;

    return {
      target,
      offset,
      count,
      totalCount,
      endpoint,
    };
  } catch (error) {
    console.warn('Failed to parse HTMX pagination:', error);
    return null;
  }
}

/**
 * Parse brand list page HTML
 *
 * @param html - HTML content of the brand list page
 * @returns Parsed brand list with pagination info
 * @throws ParseError if critical parsing failures occur
 */
export function parseBrandList(html: string): ParsedBrandList {
  const $ = cheerio.load(html);
  const brands: BrandData[] = [];

  try {
    // Find the container with brand items
    const container = $('.tobacco_list_items');
    if (container.length === 0) {
      throw new ParseError(
        'Brand list container not found',
        '.tobacco_list_items',
        html
      );
    }

    // Extract HTMX pagination info
    const pagination = parseHTMXPagination(container);

    // Find all brand items
    const items = container.find('.tobacco_list_item');
    if (items.length === 0) {
      console.warn('No brand items found in brand list page');
    }

    // Parse each brand item
    items.each((_, item) => {
      try {
        const $item = $(item);

        // Extract brand name (prefer English if available)
        const slugElement = $item.find('.tobacco_list_item_slug');
        const nameSpans = slugElement.find('span');
        let name = '';

        if (nameSpans.length >= 2) {
          // Prefer English name (last span)
          name = cleanText(nameSpans.last().text());
        } else if (nameSpans.length === 1) {
          name = cleanText(nameSpans.first().text());
        } else {
          console.warn('No name spans found in brand item');
          return; // Skip this item
        }

        // Extract source URL
        const href = slugElement.attr('href');
        const sourceUrl = normalizeUrl(href);
        if (!sourceUrl) {
          console.warn(`Failed to normalize URL for brand: ${name}`);
          return; // Skip this item
        }

        // Extract description (optional)
        const descriptionElement = $item.find('.description_content span');
        const description = descriptionElement.length > 0
          ? cleanText(descriptionElement.text())
          : undefined;

        // Extract image URL (optional)
        const imageElement = $item.find('.tobacco_list_item_image img');
        const imageUrl = imageElement.length > 0
          ? normalizeUrl(imageElement.attr('src')) ?? undefined
          : undefined;

        brands.push({
          name,
          description,
          imageUrl,
          sourceUrl,
        });
      } catch (error) {
        console.warn('Failed to parse brand item:', error);
        // Continue with other items
      }
    });

    // Determine if more brands are available
    let hasMore = false;
    let totalCount = 0;

    if (pagination) {
      totalCount = pagination.totalCount;
      hasMore = pagination.offset + brands.length < totalCount;
    } else {
      // If no pagination info, assume no more pages
      hasMore = false;
    }

    return {
      brands,
      hasMore,
      totalCount,
      pagination: pagination ?? undefined,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      'Failed to parse brand list page',
      '.tobacco_list_items',
      html,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse brand detail page HTML
 *
 * @param html - HTML content of the brand detail page
 * @param brandSlug - Slug of the brand being parsed
 * @returns Parsed brand data
 * @throws ParseError if critical parsing failures occur
 */
export function parseBrandDetail(html: string, brandSlug: string): BrandData {
  const $ = cheerio.load(html);

  try {
    // Extract brand name
    const nameElement = $('.object_card_title h1');
    if (nameElement.length === 0) {
      throw new ParseError(
        'Brand name not found',
        '.object_card_title h1',
        html
      );
    }
    const name = cleanText(nameElement.text());

    // Extract brand description (optional)
    const descriptionElement = $('.object_card_discr span');
    const description = descriptionElement.length > 0
      ? cleanText(descriptionElement.text())
      : undefined;

    // Extract brand image (optional)
    const imageElement = $('.object_image img');
    const imageUrl = imageElement.length > 0
      ? normalizeUrl(imageElement.attr('src')) ?? undefined
      : undefined;

    // Construct source URL from brand slug
    const sourceUrl = `https://htreviews.org/tobaccos/${brandSlug}`;

    return {
      name,
      description,
      imageUrl,
      sourceUrl,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      'Failed to parse brand detail page',
      '.object_card_title h1',
      html,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse product list from brand detail page HTML
 *
 * @param html - HTML content of the brand detail page
 * @param brandSlug - Slug of the brand for association
 * @returns Parsed product list with pagination info
 * @throws ParseError if critical parsing failures occur
 */
export function parseProductList(html: string, brandSlug: string): ParsedProductList {
  const $ = cheerio.load(html);
  const products: ProductData[] = [];

  try {
    // Find the container with product items
    const container = $('.tobacco_list_items');
    if (container.length === 0) {
      throw new ParseError(
        'Product list container not found',
        '.tobacco_list_items',
        html
      );
    }

    // Extract HTMX pagination info
    const pagination = parseHTMXPagination(container);

    // Find all product items
    const items = container.find('.tobacco_list_item');
    if (items.length === 0) {
      console.warn('No product items found in brand detail page');
    }

    // Parse each product item
    items.each((_, item) => {
      try {
        const $item = $(item);

        // Extract product name
        const slugElement = $item.find('.tobacco_list_item_slug');
        const nameSpans = slugElement.find('span');
        let name = '';

        if (nameSpans.length >= 1) {
          name = cleanText(nameSpans.first().text());
        } else {
          console.warn('No name spans found in product item');
          return; // Skip this item
        }

        // Extract source URL
        const href = slugElement.attr('href');
        const sourceUrl = normalizeUrl(href);
        if (!sourceUrl) {
          console.warn(`Failed to normalize URL for product: ${name}`);
          return; // Skip this item
        }

        // Extract description (optional)
        const descriptionElement = $item.find('.description_content span');
        const description = descriptionElement.length > 0
          ? cleanText(descriptionElement.text())
          : undefined;

        // Extract image URL (optional)
        const imageElement = $item.find('.tobacco_list_item_image img');
        const imageUrl = imageElement.length > 0
          ? normalizeUrl(imageElement.attr('src')) ?? undefined
          : undefined;

        products.push({
          name,
          description,
          imageUrl,
          sourceUrl,
          brandSlug,
        });
      } catch (error) {
        console.warn('Failed to parse product item:', error);
        // Continue with other items
      }
    });

    // Determine if more products are available
    let hasMore = false;
    let totalCount = 0;

    if (pagination) {
      totalCount = pagination.totalCount;
      hasMore = pagination.offset + products.length < totalCount;
    } else {
      // If no pagination info, assume no more pages
      hasMore = false;
    }

    return {
      products,
      hasMore,
      totalCount,
      pagination: pagination ?? undefined,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      'Failed to parse product list from brand detail page',
      '.tobacco_list_items',
      html,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse product detail page HTML
 *
 * @param html - HTML content of the product detail page
 * @param productSlug - Slug of the product being parsed
 * @param brandSlug - Slug of the brand for association
 * @returns Parsed product data
 * @throws ParseError if critical parsing failures occur
 */
export function parseProductDetail(html: string, productSlug: string, brandSlug: string): ProductData {
  const $ = cheerio.load(html);

  try {
    // Extract product name
    const nameElement = $('.object_card_title h1');
    if (nameElement.length === 0) {
      throw new ParseError(
        'Product name not found',
        '.object_card_title h1',
        html
      );
    }
    const name = cleanText(nameElement.text());

    // Extract product description (optional)
    const descriptionElement = $('.object_card_discr span');
    const description = descriptionElement.length > 0
      ? cleanText(descriptionElement.text())
      : undefined;

    // Extract product image (optional)
    const imageElement = $('.object_image img');
    const imageUrl = imageElement.length > 0
      ? normalizeUrl(imageElement.attr('src')) ?? undefined
      : undefined;

    // Construct source URL from brand and product slugs
    const sourceUrl = `https://htreviews.org/tobaccos/${brandSlug}/${productSlug}`;

    return {
      name,
      description,
      imageUrl,
      sourceUrl,
      brandSlug,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      'Failed to parse product detail page',
      '.object_card_title h1',
      html,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if brand discovery is complete based on pagination info
 *
 * @param html - HTML content of the brand list page
 * @returns true if all brands have been discovered, false otherwise
 */
export function isBrandDiscoveryComplete(html: string): boolean {
  try {
    const $ = cheerio.load(html);
    const container = $('.tobacco_list_items');

    if (container.length === 0) {
      // No container means no pagination, assume complete
      return true;
    }

    const pagination = parseHTMXPagination(container);
    if (!pagination) {
      // No pagination info, assume complete
      return true;
    }

    const items = container.find('.tobacco_list_item');
    const itemCount = items.length;

    // Complete if offset + items >= totalCount
    return pagination.offset + itemCount >= pagination.totalCount;
  } catch (error) {
    console.warn('Failed to check brand discovery completion:', error);
    // On error, assume complete to avoid infinite loops
    return true;
  }
}

/**
 * Check if product discovery is complete based on pagination info
 *
 * @param html - HTML content of the product list page
 * @returns true if all products have been discovered, false otherwise
 */
export function isProductDiscoveryComplete(html: string): boolean {
  try {
    const $ = cheerio.load(html);
    const container = $('.tobacco_list_items');

    if (container.length === 0) {
      // No container means no pagination, assume complete
      return true;
    }

    const pagination = parseHTMXPagination(container);
    if (!pagination) {
      // No pagination info, assume complete
      return true;
    }

    const items = container.find('.tobacco_list_item');
    const itemCount = items.length;

    // Complete if offset + items >= totalCount
    return pagination.offset + itemCount >= pagination.totalCount;
  } catch (error) {
    console.warn('Failed to check product discovery completion:', error);
    // On error, assume complete to avoid infinite loops
    return true;
  }
}
