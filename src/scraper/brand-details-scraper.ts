/**
 * Brand Details Scraper
 * 
 * Scrapes detailed information about a specific brand from htreviews.org.
 * Extracts complete brand information including lines, ratings, and metadata.
 * 
 * Supports both HTML-based scraping and API-based flavor extraction.
 */

import { Scraper } from './scraper';
import { Brand, Line } from '../types';
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
import { LoggerFactory } from '../utils';
import { BrandIdExtractor } from './brand-id-extractor';
import { ApiFlavorExtractor } from './api-flavor-extractor';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scraper');

// ============================================================================
// Brand Details Scraper Implementation
// ============================================================================

/**
 * Scrape detailed information about a specific brand from htreviews.org
 * 
 * This function fetches brand detail page and extracts complete brand information
 * including basic info, ratings, statistics, lines, and flavor URLs.
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
      logger.warn('Failed to extract basic brand info', { brandSlug } as any);
      return null;
    }
    
    // Extract rating distribution (not used in Brand model but available for future use)
    parseRatingDistribution($, '.score_meter .score_meter_item');
    
    // Extract smoke again percentage (not used in Brand model but available for future use)
    parseSmokeAgainPercentage($, '.again_meter');

    // Extract lines list
    const lines = extractLines($, brandSlug);

    // Extract flavor URLs with pagination support
    const flavorUrls = await extractFlavorUrlsWithPagination($, brandSlug, scraper);

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
      flavors: [], // Flavors will be scraped separately using extracted URLs
    };

    logger.info('Successfully scraped brand details', { 
      brandName: brand.name, 
      brandSlug, 
      linesCount: lines.length,
      flavorsCount: flavorUrls.length,
      rating: brand.rating,
      ratingsCount: brand.ratingsCount 
    } as any);

    return brandDetails;
  } catch (error) {
    logger.error('Failed to scrape brand details', { brandSlug, error } as any);
    return null;
  }
}

/**
 * Extract all flavor URLs for a brand with pagination support
 * 
 * This function fetches all pages of flavors for a brand and returns
 * complete list of flavor URLs. It handles pagination automatically.
 * 
 * @param brandSlug The brand slug (e.g., "sarma")
 * @returns Promise resolving to array of flavor URLs (strings)
 */
export async function extractFlavorUrls(brandSlug: string): Promise<string[]> {
  const scraper = new Scraper();
  
  try {
    // Fetch and parse brand detail page
    const $ = await scraper.fetchAndParse(`/tobaccos/${brandSlug}`);
    
    // Extract flavor URLs with pagination support
    const flavorUrls = await extractFlavorUrlsWithPagination($, brandSlug, scraper);
    
    return flavorUrls;
  } catch (error) {
    logger.error('Failed to extract flavor URLs', { brandSlug, error } as any);
    return [];
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
      logger.warn('Brand name not found' as any);
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
    logger.error('Error extracting brand basic info', { error } as any);
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
      logger.error('Error parsing line item', { error } as any);
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
    logger.warn('Line slug not found' as any);
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

/**
 * Extract flavor URLs from brand detail page with pagination support
 * 
 * This function extracts all flavor URLs from .tobacco_list_items section
 * by finding .tobacco_list_item elements and extracting href attributes from
 * .tobacco_list_item_slug elements. It handles pagination by making additional
 * requests with offset parameters until all flavors are extracted.
 * 
 * Supports both API-based extraction (new) and HTML-based scraping (legacy).
 * 
 * @param $ Cheerio instance from initial page
 * @param brandSlug Brand slug for pagination requests
 * @param scraper Scraper instance for making additional requests
 * @returns Promise resolving to array of flavor URLs (strings)
 */
async function extractFlavorUrlsWithPagination(
  $: CheerioAPI,
  brandSlug: string,
  scraper: Scraper
): Promise<string[]> {
  // Check if API-based extraction is enabled
  const enableApiExtraction = process.env.ENABLE_API_EXTRACTION !== 'false';
  
  if (enableApiExtraction) {
    try {
      logger.info('Using API-based flavor extraction', { brandSlug } as any);
      
      // Extract brand ID
      const brandIdExtractor = new BrandIdExtractor();
      const brandId = brandIdExtractor.extractBrandId($);
      
      if (!brandId) {
        logger.warn('Failed to extract brand ID, falling back to HTML scraping', { brandSlug } as any);
        return await extractFlavorUrlsFromHtml($, brandSlug, scraper);
      }
      
      // Extract flavor URLs using API
      const apiExtractor = new ApiFlavorExtractor(scraper.getHttpClient(), {
        flavorsPerRequest: parseInt(process.env.API_FLAVORS_PER_REQUEST || '20', 10),
        requestDelay: parseInt(process.env.API_REQUEST_DELAY || '500', 10),
        maxRetries: parseInt(process.env.API_MAX_RETRIES || '3', 10),
        enableApiExtraction: true,
        enableFallback: process.env.ENABLE_API_FALLBACK !== 'false',
      });
      
      const result = await apiExtractor.extractFlavorUrls(brandId, brandSlug);
      
      logger.info('API-based flavor extraction completed', {
        brandSlug,
        totalCount: result.totalCount,
        requestsCount: result.requestsCount,
        extractionTime: result.extractionTime,
        usedFallback: result.usedFallback,
      } as any);
      
      return result.flavorUrls;
    } catch (error) {
      logger.error('API-based extraction failed, falling back to HTML scraping', {
        brandSlug,
        error,
      } as any);
      
      // Fallback to HTML scraping
      return await extractFlavorUrlsFromHtml($, brandSlug, scraper);
    }
  } else {
    // Use HTML-based scraping (current implementation)
    logger.info('Using HTML-based flavor extraction', { brandSlug } as any);
    return await extractFlavorUrlsFromHtml($, brandSlug, scraper);
  }
}

/**
 * Extract flavor URLs from brand detail page using HTML scraping (legacy method)
 * 
 * This function extracts all flavor URLs from .tobacco_list_items section
 * by finding .tobacco_list_item elements and extracting href attributes from
 * .tobacco_list_item_slug elements. It handles pagination by making additional
 * requests with offset parameters until all flavors are extracted.
 * 
 * @param $ Cheerio instance from initial page
 * @param brandSlug Brand slug for pagination requests
 * @param scraper Scraper instance for making additional requests
 * @returns Promise resolving to array of flavor URLs (strings)
 */
async function extractFlavorUrlsFromHtml(
  $: CheerioAPI,
  brandSlug: string,
  scraper: Scraper
): Promise<string[]> {
  const allFlavorUrls: string[] = [];
  const ITEMS_PER_PAGE = 20;
  
  try {
    // Extract total count from data-count attribute
    const tobaccoListWrapper = $('.tobacco_list_items');
    const totalCountAttr = tobaccoListWrapper.attr('data-count');
    const totalCount = totalCountAttr ? parseInt(totalCountAttr, 10) : 0;
    
    if (totalCount === 0) {
      logger.debug('No flavors found on brand page (data-count=0)' as any);
      return allFlavorUrls;
    }
    
    logger.debug(`Brand has ${totalCount} total flavors (pagination needed)` as any);
    
    // Extract flavor URLs from first page
    const firstPageUrls = extractFlavorUrlsFromPage($);
    allFlavorUrls.push(...firstPageUrls);
    
    logger.debug(`Extracted ${firstPageUrls.length} flavors from first page` as any);
    
    // If we have all flavors on first page, return early
    if (firstPageUrls.length >= totalCount) {
      logger.debug(`All ${totalCount} flavors extracted from first page` as any);
      return allFlavorUrls;
    }
    
    // Calculate number of additional pages needed
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    logger.debug(`Need to fetch ${totalPages - 1} additional pages` as any);
    
    // Fetch remaining pages
    for (let page = 2; page <= totalPages; page++) {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      try {
        logger.debug(`Fetching page ${page} with offset ${offset}` as any);
        
        // Fetch next page with offset parameter
        const pageUrl = `/tobaccos/${brandSlug}?offset=${offset}`;
        const $page = await scraper.fetchAndParse(pageUrl);
        
        // Extract flavor URLs from this page
        const pageUrls = extractFlavorUrlsFromPage($page);
        
        if (pageUrls.length === 0) {
          logger.warn(`No flavors found on page ${page}, stopping pagination` as any);
          break;
        }
        
        allFlavorUrls.push(...pageUrls);
        logger.debug(`Extracted ${pageUrls.length} flavors from page ${page} (total: ${allFlavorUrls.length}/${totalCount})` as any);
        
        // If we've extracted all expected flavors, stop
        if (allFlavorUrls.length >= totalCount) {
          logger.debug(`Extracted all ${totalCount} flavors` as any);
          break;
        }
        
        // Add a small delay between page requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`Failed to fetch page ${page}`, { offset, error } as any);
        // Continue with next page even if one fails
      }
    }
    
    logger.info(`Extracted ${allFlavorUrls.length} flavor URLs from ${totalPages} page(s)` as any);
    
    // Remove duplicates (in case of any overlap)
    const uniqueUrls = Array.from(new Set(allFlavorUrls));
    
    if (uniqueUrls.length !== allFlavorUrls.length) {
      logger.debug(`Removed ${allFlavorUrls.length - uniqueUrls.length} duplicate URLs` as any);
    }
    
    return uniqueUrls;
  } catch (error) {
    logger.error('Error extracting flavor URLs with pagination', { error } as any);
    // Return what we have so far
    return allFlavorUrls;
  }
}

/**
 * Extract flavor URLs from a single page
 * 
 * This function extracts flavor URLs from .tobacco_list_items section
 * by finding .tobacco_list_item elements and extracting href attributes from
 * .tobacco_list_item_slug elements.
 * 
 * @param $ Cheerio instance
 * @returns Array of flavor URLs (strings)
 */
function extractFlavorUrlsFromPage($: CheerioAPI): string[] {
  const flavorUrls: string[] = [];
  
  try {
    // Select all flavor list items
    const flavorItems = $('.tobacco_list_item');
    
    if (flavorItems.length === 0) {
      logger.debug('No flavor items found on this page' as any);
      return flavorUrls;
    }
    
    // Extract href from each flavor item's slug element
    for (let i = 0; i < flavorItems.length; i++) {
      const item = flavorItems.eq(i);
      const slugElement = item.find('.tobacco_list_item_slug');
      
      if (slugElement.length > 0) {
        const href = slugElement.attr('href');
        
        // Only add non-empty hrefs
        if (href && href.trim() !== '') {
          flavorUrls.push(href.trim());
        }
      }
    }
    
    logger.debug(`Extracted ${flavorUrls.length} flavor URLs from current page` as any);
  } catch (error) {
    logger.error('Error extracting flavor URLs from page', { error } as any);
    // Return empty array on error to allow scraping to continue
  }
  
  return flavorUrls;
}

// ============================================================================
// Exports
// ============================================================================

export default scrapeBrandDetails;
