/**
 * Brand Details Scraper
 * 
 * Scrapes detailed information about a specific brand from htreviews.org.
 * Extracts complete brand information including lines, ratings, and metadata.
 */

import { Scraper } from './scraper';
import { Brand, Line } from '@hookah-db/types';
import {
  CheerioAPI,
  extractText,
  extractAttribute,
  parseViewsCount,
  parseDate,
  parseFlavorsCount,
  parseRatingDistribution,
  parseSmokeAgainPercentage,
  extractImageUrl,
  parseInteger,
  extractSlugFromUrl,
} from './html-parser';

// ============================================================================
// Brand Details Scraper Implementation
// ============================================================================

/**
 * Scrape detailed information about a specific brand from htreviews.org
 * 
 * This function fetches brand detail page and extracts complete brand information
 * including basic info, ratings, statistics, and lines.
 * 
 * @param brandSlug The brand slug (e.g., "sarma")
 * @returns Promise resolving to complete Brand object or null if scraping fails
 */
export async function scrapeBrandDetails(brandSlug: string): Promise<Brand | null> {
  const scraper = new Scraper();

  try {
    // Fetch and parse brand detail page
    const $ = await scraper.fetchAndParse(`/tobaccos/${brandSlug}`);

    // Extract brand basic information
    const brand = extractBrandBasicInfo($, brandSlug);
    
    if (!brand) {
      console.warn(`Failed to extract basic brand info for slug: ${brandSlug}`);
      return null;
    }

    // Extract rating distribution (not used in Brand model but available for future use)
    parseRatingDistribution($, '.score_meter .score_meter_item');
    
    // Extract smoke again percentage (not used in Brand model but available for future use)
    parseSmokeAgainPercentage($, '.again_meter');

    // Extract lines list
    const lines = extractLines($, brandSlug);

    // Construct complete brand object
    const brandDetails: Brand = {
      slug: brand.slug,
      name: brand.name,
      nameEn: brand.nameEn,
      description: brand.description,
      country: brand.country,
      website: brand.website,
      foundedYear: brand.foundedYear,
      status: brand.status,
      imageUrl: brand.imageUrl,
      rating: brand.rating,
      ratingsCount: brand.ratingsCount,
      reviewsCount: brand.reviewsCount,
      viewsCount: brand.viewsCount,
      lines,
      flavors: [], // Flavors will be scraped separately
    };

    console.log(`Successfully scraped brand details for: ${brand.name} (${brandSlug})`);
    console.log(`  - Lines: ${lines.length}`);
    console.log(`  - Rating: ${brand.rating} (${brand.ratingsCount} ratings)`);

    return brandDetails;
  } catch (error) {
    console.error(`Failed to scrape brand details for ${brandSlug}`);
    return null;
  }
}

/**
 * Extract basic brand information from HTML
 * 
 * @param $ Cheerio instance
 * @param brandSlug Brand slug
 * @returns Brand object with basic information or null if extraction fails
 */
function extractBrandBasicInfo($: CheerioAPI, brandSlug: string): Brand | null {
  try {
    // Extract brand name (Russian)
    const name = extractText($, '.object_card_title h1');
    
    // Extract brand name (English)
    const nameEn = extractText($, '.object_card_title span');

    if (!name) {
      console.warn('Brand name not found');
      return null;
    }

    // Extract description
    const description = extractText($, '.object_card_discr span');

    // Extract website
    const website = extractAttribute($, '.object_info_item a[href^="http"]', 'href');

    // Extract country
    // Find object_info_item that contains "Страна" text and get div value
    const country = extractCountry($);

    // Extract founded year
    const foundedYearText = extractFoundedYearText($);
    const foundedYear = parseFoundedYear(foundedYearText);

    // Extract status
    const status = extractStatus($);

    // Extract date added (not used in Brand model but available for future use)
    const dateAddedText = extractText($, '.object_info_item:contains("Добавлен на сайт") > span:last-child');
    parseDate(dateAddedText);

    // Extract image URL
    const imageUrl = extractImageUrl($, '.object_image img');

    // Extract rating
    const ratingAttr = extractAttribute($, '.score_graphic div[data-rating]', 'data-rating');
    const rating = ratingAttr ? parseFloat(ratingAttr) : 0;

    // Extract ratings count
    const ratingsCountText = extractText($, '.score_graphic [data-stats="1"] > div:first-child span');
    const ratingsCount = parseInteger(ratingsCountText) || 0;

    // Extract reviews count
    const reviewsCountText = extractText($, '.score_graphic [data-stats="1"] > div:nth-child(2) span');
    const reviewsCount = parseInteger(reviewsCountText) || 0;

    // Extract views count
    const viewsCountText = extractText($, '.score_graphic [data-stats="1"] > div:nth-child(3) span');
    const viewsCount = parseViewsCount(viewsCountText) || 0;

    return {
      slug: brandSlug,
      name,
      nameEn: nameEn || name,
      description,
      country: country || '',
      website,
      foundedYear,
      status: status || '',
      imageUrl,
      rating,
      ratingsCount,
      reviewsCount,
      viewsCount,
      lines: [], // Will be populated separately
      flavors: [], // Will be populated separately
    };
  } catch (error) {
    console.error('Error extracting brand basic info:', error);
    return null;
  }
}

/**
 * Parse founded year from text
 * 
 * @param foundedYearText Founded year text
 * @returns Year as number or null if invalid
 */
function parseFoundedYear(foundedYearText: string | null): number | null {
  if (!foundedYearText) {
    return null;
  }
  
  const year = parseInt(foundedYearText, 10);
  
  // Return null for invalid values like NaN, N/A, or non-numeric strings
  if (isNaN(year) || !/^\d{4}$/.test(foundedYearText)) {
    return null;
  }
  
  return year;
}

/**
 * Extract country from brand info section
 * 
 * @param $ Cheerio instance
 * @returns Country string or empty string if not found
 */
function extractCountry($: CheerioAPI): string {
  // Find object_info_item that contains "Страна" text
  let country = '';
  
  const items = $('.object_info_item');
  for (let i = 0; i < items.length; i++) {
    const item = items.eq(i);
    const labelText = item.find('span:first-child').text().trim();
    
    if (labelText === 'Страна') {
      country = item.find('div').text().trim();
      break;
    }
  }
  
  return country;
}

/**
 * Extract founded year from brand info section
 * 
 * @param $ Cheerio instance
 * @returns Founded year text or null if not found
 */
function extractFoundedYearText($: CheerioAPI): string | null {
  let foundedYearText: string | null = null;
  
  const items = $('.object_info_item');
  for (let i = 0; i < items.length; i++) {
    const item = items.eq(i);
    const labelText = item.find('span:first-child').text().trim();
    
    if (labelText === 'Год основания') {
      foundedYearText = item.find('div').text().trim();
      break;
    }
  }
  
  return foundedYearText;
}

/**
 * Extract status from brand info section
 * 
 * @param $ Cheerio instance
 * @returns Status string or empty string if not found
 */
function extractStatus($: CheerioAPI): string {
  // Status is in object_info_item with data-id="1"
  const statusItem = $('.object_info_item[data-id="1"]');
  if (statusItem.length > 0) {
    return statusItem.find('span:last-child').text().trim();
  }
  
  return '';
}

/**
 * Extract lines list from brand detail page
 * 
 * @param $ Cheerio instance
 * @param brandSlug Parent brand slug
 * @returns Array of Line objects
 */
function extractLines($: CheerioAPI, brandSlug: string): Line[] {
  const lines: Line[] = [];
  
  const items = $('.brand_lines_item');
  for (let i = 0; i < items.length; i++) {
    try {
      const line = parseLineItem(items.eq(i), brandSlug);
      if (line) {
        lines.push(line);
      }
    } catch (error) {
      console.error('Error parsing line item:', error);
      // Skip invalid items and continue with others
    }
  }
  
  return lines;
}

/**
 * Parse a single line item from HTML
 * 
 * @param lineItem Cheerio element for a single line item
 * @param brandSlug Parent brand slug
 * @returns Line object or null if parsing fails
 */
function parseLineItem(lineItem: any, brandSlug: string): Line | null {
  // Extract line slug from href
  const nameLink = lineItem.find('.lines_item_name');
  const href = nameLink.attr('href');
  const slug = extractSlugFromUrl(href);

  if (!slug) {
    console.warn('Line slug not found');
    return null;
  }

  // Extract line name
  const name = nameLink.find('h3').text().trim();

  // Extract line rating
  const ratingText = lineItem.find('.lines_item_score span').text().trim();
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

  // Extract line strength
  const strength = lineItem.find('.lines_item_strength span').text().trim() || null;

  // Extract line status
  const status = lineItem.find('.lines_item_status span').text().trim();

  // Extract flavors count
  const flavorsCountText = lineItem.find('.lines_item_tobaccos span').text().trim();
  const flavorsCount = parseFlavorsCount(flavorsCountText) || 0;

  // Extract line description
  const description = lineItem.find('.lines_item_description span').text().trim() || null;

  return {
    slug,
    name,
    description,
    strength,
    status,
    flavorsCount,
    rating,
    brandSlug,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default scrapeBrandDetails;
