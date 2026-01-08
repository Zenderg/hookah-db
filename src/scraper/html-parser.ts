/**
 * HTML Parser Utilities
 * 
 * Provides utility functions for parsing HTML content from htreviews.org
 * using Cheerio. Handles text extraction, special format parsing, and
 * common scraping operations.
 */

import * as cheerio from 'cheerio';
import { RatingDistribution } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Cheerio type for HTML parsing
 */
export type CheerioAPI = ReturnType<typeof cheerio.load>;
export type CheerioSelector = cheerio.Cheerio<any>;

// ============================================================================
// Text Extraction Helpers
// ============================================================================

/**
 * Extract text from a selector, return empty string if not found
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @returns Extracted text or empty string
 */
export function extractText($: CheerioAPI, selector: string): string {
  const element = $(selector).first();
  if (element.length === 0) {
    return '';
  }
  return element.text().trim();
}

/**
 * Extract attribute value from a selector
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @param attribute Attribute name
 * @returns Attribute value or null if not found
 */
export function extractAttribute(
  $: CheerioAPI,
  selector: string,
  attribute: string
): string | null {
  const element = $(selector).first();
  if (element.length === 0) {
    return null;
  }
  const value = element.attr(attribute);
  return value !== undefined ? value : null;
}

/**
 * Extract and parse number from text
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @returns Parsed number or null if not found/invalid
 */
export function extractNumber($: CheerioAPI, selector: string): number | null {
  const text = extractText($, selector);
  if (!text) {
    return null;
  }
  
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = text.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

// ============================================================================
// Special Format Parsers
// ============================================================================

/**
 * Parse views count with suffixes (k, kk)
 * Examples:
 * - "319.1k" → 319100
 * - "1.9kk" → 1900000
 * - "5.2k" → 5200
 * - "1000" → 1000
 * @param text Text containing views count
 * @returns Parsed views count or null if invalid
 */
export function parseViewsCount(text: string): number | null {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim();
  
  // Check for "kk" suffix (thousands of thousands = millions)
  const kkMatch = trimmed.match(/^([\d.]+)kk$/i);
  if (kkMatch) {
    const value = parseFloat(kkMatch[1]);
    if (isNaN(value)) return null;
    return Math.round(value * 1000000);
  }
  
  // Check for "k" suffix (thousands)
  const kMatch = trimmed.match(/^([\d.]+)k$/i);
  if (kMatch) {
    const value = parseFloat(kMatch[1]);
    if (isNaN(value)) return null;
    return Math.round(value * 1000);
  }
  
  // Parse as plain number
  const parsed = parseInt(trimmed.replace(/[^\d]/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse date in DD.MM.YYYY format
 * @param text Text containing date
 * @returns Date object or null if invalid
 */
export function parseDate(text: string): Date | null {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  
  if (!match) {
    return null;
  }
  
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}`);
  
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extract number from flavors count text
 * Examples:
 * - "53 вкуса" → 53
 * - "21 вкус" → 21
 * - "1 вкус" → 1
 * @param text Text containing flavors count
 * @returns Parsed number or null if invalid
 */
export function parseFlavorsCount(text: string): number | null {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d+)\s*(?:вкус|вкуса|вкусов)/i);
  
  if (!match) {
    return null;
  }
  
  const parsed = parseInt(match[1], 10);
  return isNaN(parsed) ? null : parsed;
}

// ============================================================================
// Rating Distribution Parser
// ============================================================================

/**
 * Parse rating distribution from score_meter items
 * Initializes all ratings (1-5) to 0, then updates counts from present items
 * @param $ Cheerio instance
 * @param selector Base selector for score_meter container (optional)
 * @returns RatingDistribution object
 */
export function parseRatingDistribution(
  $: CheerioAPI,
  selector: string = '.score_meter .item'
): RatingDistribution {
  const distribution: RatingDistribution = {
    count1: 0,
    count2: 0,
    count3: 0,
    count4: 0,
    count5: 0,
  };
  
  $(selector).each((_, element) => {
    const $item = $(element);
    
    // Try to extract from data-score and data-score-count attributes
    const scoreElement = $item.find('[data-score]');
    const scoreCountElement = $item.find('[data-score-count]');
    
    if (scoreElement.length && scoreCountElement.length) {
      const scoreAttr = scoreElement.attr('data-score');
      const scoreCountAttr = scoreCountElement.attr('data-score-count');
      
      if (scoreAttr && scoreCountAttr) {
        const rating = parseInt(scoreAttr, 10);
        
        // Extract count from data-score-count attribute value
        let count = 0;
        
        // Try to parse count from attribute value first
        const parsedFromAttr = parseInt(scoreCountAttr, 10);
        if (!isNaN(parsedFromAttr)) {
          count = parsedFromAttr;
        } else {
          // Fallback to extracting from child spans
          const spans = scoreCountElement.find('span');
          if (spans.length >= 2) {
            const countText = $(spans[1]).text().trim();
            count = parseInt(countText, 10);
          } else if (spans.length === 1) {
            const countText = $(spans[0]).text().trim();
            count = parseInt(countText, 10);
          } else {
            const countText = scoreCountElement.text().trim();
            count = parseInt(countText, 10);
          }
        }
        
        if (!isNaN(rating) && !isNaN(count) && rating >= 1 && rating <= 5) {
          switch (rating) {
            case 1:
              distribution.count1 = count;
              break;
            case 2:
              distribution.count2 = count;
              break;
            case 3:
              distribution.count3 = count;
              break;
            case 4:
              distribution.count4 = count;
              break;
            case 5:
              distribution.count5 = count;
              break;
          }
        }
      }
    } else {
      // Fallback to text parsing for backward compatibility
      const text = $item.text().trim();
      
      // Extract rating number and count
      // Expected format: "5: 123" or "5 - 123"
      const match = text.match(/^([1-5])[:\s-]+(\d+)/);
      
      if (match) {
        const rating = parseInt(match[1], 10);
        const count = parseInt(match[2], 10);
        
        switch (rating) {
          case 1:
            distribution.count1 = count;
            break;
          case 2:
            distribution.count2 = count;
            break;
          case 3:
            distribution.count3 = count;
            break;
          case 4:
            distribution.count4 = count;
            break;
          case 5:
            distribution.count5 = count;
            break;
        }
      }
    }
  });
  
  return distribution;
}

// ============================================================================
// Smoke Again Percentage Parser
// ============================================================================

/**
 * Extract percentage from again_meter
 * @param $ Cheerio instance
 * @param selector Selector for again_meter element
 * @returns Percentage (0-100) or null if not found
 */
export function parseSmokeAgainPercentage(
  $: CheerioAPI,
  selector: string = '.again_meter'
): number | null {
  const text = extractText($, selector);
  if (!text) {
    return null;
  }
  
  // Extract percentage (e.g., "75%" or "75 %")
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) {
    return null;
  }
  
  const percentage = parseFloat(match[1]);
  return isNaN(percentage) ? null : percentage;
}

// ============================================================================
// Image URL Parser
// ============================================================================

/**
 * Extract image URL, handling lazy loading (data-src first, fallback to src)
 * @param $ Cheerio instance
 * @param selector CSS selector for image element
 * @returns Image URL or null if not found
 */
export function extractImageUrl(
  $: CheerioAPI,
  selector: string
): string | null {
  const element = $(selector).first();
  if (element.length === 0) {
    return null;
  }
  
  // Try data-src first (lazy loading)
  let url = element.attr('data-src');
  
  // Fallback to src attribute
  if (!url) {
    url = element.attr('src');
  }
  
  // Fallback to srcset (take first URL)
  if (!url) {
    const srcset = element.attr('srcset');
    if (srcset) {
      const firstUrl = srcset.split(/\s+/)[0];
      url = firstUrl;
    }
  }
  
  // Return null if url is empty string, otherwise return url
  return url && url.length > 0 ? url : null;
}

// ============================================================================
// Slug Extractor
// ============================================================================

/**
 * Extract slug from full URL path, removing the "tobaccos/" prefix
 * Examples:
 * - "/tobaccos/sarma" → "sarma"
 * - "/tobaccos/sarma/klassicheskaya/zima" → "sarma/klassicheskaya/zima"
 * - "https://htreviews.org/tobaccos/sarma" → "sarma"
 * - "https://htreviews.org/tobaccos/dogma/sigarnyy-monosort/san-andres" → "dogma/sigarnyy-monosort/san-andres"
 * @param url Full URL or path
 * @returns Extracted slug without "tobaccos/" prefix, or null if invalid
 */
export function extractSlugFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  
  try {
    // Parse URL to handle both full URLs and paths
    let pathname: string;
    
    try {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
    } catch {
      // If URL parsing fails, treat as path
      pathname = url;
    }
    
    // Remove leading/trailing slashes and split
    const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
    
    // Filter out empty parts
    const nonEmptyParts = parts.filter(part => part.length > 0);
    
    if (nonEmptyParts.length === 0) {
      return null;
    }
    
    // Remove "tobaccos" prefix if it exists
    if (nonEmptyParts[0].toLowerCase() === 'tobaccos') {
      nonEmptyParts.shift();
    }
    
    // Return null if no parts left after removing "tobaccos"
    if (nonEmptyParts.length === 0) {
      return null;
    }
    
    // Join remaining parts to form the slug
    return nonEmptyParts.join('/');
  } catch {
    return null;
  }
}

// ============================================================================
// Rating Parser
// ============================================================================

/**
 * Extract rating from text (e.g., "4.5", "5", "3.7")
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @returns Rating (0-5) or null if not found/invalid
 */
export function extractRating($: CheerioAPI, selector: string): number | null {
  const text = extractText($, selector);
  if (!text) {
    return null;
  }
  
  // Extract first number found (including negative numbers)
  const match = text.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  
  const rating = parseFloat(match[1]);
  
  // Validate rating is in valid range
  if (isNaN(rating) || rating < 0 || rating > 5) {
    return null;
  }
  
  return rating;
}

// ============================================================================
// URL Builder
// ============================================================================

/**
 * Build a full URL from a base URL and a path
 * @param baseUrl Base URL
 * @param path Path to append
 * @returns Full URL
 */
export function buildUrl(baseUrl: string, path: string): string {
  // Remove trailing slash from base and leading slash from path
  const cleanBase = baseUrl.replace(/\/+$/, '');
  // Remove leading slashes and collapse multiple slashes in the middle
  const cleanPath = path.replace(/^\/+/, '').replace(/\/+/g, '/');
  
  return `${cleanBase}/${cleanPath}`;
}

// ============================================================================
// HTML Content Extractor
// ============================================================================

/**
 * Extract HTML content from a selector
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @returns HTML content or empty string if not found
 */
export function extractHtml($: CheerioAPI, selector: string): string {
  const element = $(selector).first();
  if (element.length === 0) {
    return '';
  }
  return element.html() || '';
}

// ============================================================================
// Multi-Text Extractor
// ============================================================================

/**
 * Extract text from multiple elements matching a selector
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @returns Array of extracted text values
 */
export function extractTextArray($: CheerioAPI, selector: string): string[] {
  const texts: string[] = [];
  $(selector).each((_, element) => {
    const text = $(element).text().trim();
    if (text) {
      texts.push(text);
    }
  });
  return texts;
}

// ============================================================================
// Attribute Array Extractor
// ============================================================================

/**
 * Extract attribute values from multiple elements matching a selector
 * @param $ Cheerio instance
 * @param selector CSS selector
 * @param attribute Attribute name
 * @returns Array of attribute values
 */
export function extractAttributeArray(
  $: CheerioAPI,
  selector: string,
  attribute: string
): string[] {
  const values: string[] = [];
  $(selector).each((_, element) => {
    const value = $(element).attr(attribute);
    if (value !== undefined) {
      values.push(value);
    }
  });
  return values;
}

// ============================================================================
// Link Extractor
// ============================================================================

/**
 * Extract href attribute from a link element
 * @param $ Cheerio instance
 * @param selector CSS selector for anchor element
 * @returns URL or null if not found
 */
export function extractLinkUrl($: CheerioAPI, selector: string): string | null {
  return extractAttribute($, selector, 'href');
}

// ============================================================================
// Boolean Parser
// ============================================================================

/**
 * Parse boolean from text
 * @param text Text to parse
 * @returns Boolean value or null if not found
 */
export function parseBoolean(text: string | null | undefined): boolean | null {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim().toLowerCase();
  
  if (['true', 'yes', '1', 'да', 'есть', 'включено'].includes(trimmed)) {
    return true;
  }
  
  if (['false', 'no', '0', 'нет', 'нету', 'выключено'].includes(trimmed)) {
    return false;
  }
  
  return null;
}

// ============================================================================
// Integer Parser
// ============================================================================

/**
 * Parse integer from text
 * @param text Text to parse
 * @returns Integer or null if invalid
 */
export function parseInteger(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim();
  const parsed = parseInt(trimmed, 10);
  
  return isNaN(parsed) ? null : parsed;
}

// ============================================================================
// Float Parser
// ============================================================================

/**
 * Parse float from text
 * @param text Text to parse
 * @returns Float or null if invalid
 */
export function parseFloatValue(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim();
  const parsed = parseFloat(trimmed);
  
  return isNaN(parsed) ? null : parsed;
}
