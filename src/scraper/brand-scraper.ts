/**
 * Brand List Scraper
 * 
 * Scrapes the list of all brands from htreviews.org.
 * Extracts brand information from both "Top Brands" and "Other Brands" sections.
 */

import { Scraper } from './scraper';
import {
  parseViewsCount,
  parseInteger,
  extractSlugFromUrl,
  CheerioAPI,
} from './html-parser';
import { LoggerFactory } from '../utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scraper');

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Brand summary with basic information extracted from brands listing page
 * This is a partial Brand object with only the fields available on the listing page
 */
export interface BrandSummary {
  slug: string;
  name: string;
  nameEn: string;
  country: string;
  imageUrl: string | null;
  rating: number;
  ratingsCount: number;
  reviewsCount: number;
  viewsCount: number;
  description: string;
}

// ============================================================================
// Brand List Scraper Implementation
// ============================================================================

/**
 * Scrape the list of all brands from htreviews.org
 * 
 * This function fetches the brands listing page and extracts brand information
 * from both the "Top Brands" and "Other Brands" sections.
 * 
 * @returns Promise resolving to array of brand summaries
 * @throws ScrapeError if scraping fails completely
 */
export async function scrapeBrandsList(): Promise<BrandSummary[]> {
  const scraper = new Scraper();
  const brands: BrandSummary[] = [];
  
  try {
    // Fetch and parse the brands listing page
    const $ = await scraper.fetchAndParse('/tobaccos/brands');

    // Process both sections: top brands (data-active="1") and other brands (data-active="0")
    const sections = [
      { selector: '.tobacco_list_wrapper[data-active="1"]', name: 'Top Brands' },
      { selector: '.tobacco_list_wrapper[data-active="0"]', name: 'Other Brands' },
    ];

    for (const section of sections) {
      const $section = $(section.selector);
      
      if ($section.length === 0) {
        logger.warn('Section not found on brands page', { section: section.name } as any);
        continue;
      }

      // Extract all brand items from this section
      const $items = $section.find('.tobacco_list_item');
      
      logger.info('Found brands in section', { 
        section: section.name, 
        count: $items.length 
      } as any);

      $items.each((_, element) => {
        try {
          const brand = parseBrandItem($, element);
          
          // Only add brands with valid slug
          if (brand.slug) {
            brands.push(brand);
          }
        } catch (error) {
          logger.error('Error parsing brand item', { error } as any);
          // Skip invalid items and continue with others
        }
      });
    }

    logger.info('Successfully scraped brands', { total: brands.length } as any);

    // TODO: Implement pagination support
    // Check if there are more pages by looking for pagination controls
    // or data-offset/data-count attributes on the wrapper
    // If pagination exists, fetch all pages and combine results

    return brands;
  } catch (error) {
    logger.error('Failed to scrape brands list', { error } as any);
    // Return empty array if scraping fails completely
    return [];
  }
}

/**
 * Parse a single brand item from the HTML
 * 
 * @param $ Full CheerioAPI instance
 * @param element DOM element for a single brand item
 * @returns BrandSummary object
 */
function parseBrandItem($: CheerioAPI, element: any): BrandSummary {
  const $item = $(element);

  // Extract brand slug from href
  const $slugElement = $item.find('.tobacco_list_item_slug');
  const href = $slugElement.attr('href');
  const fullSlug = extractSlugFromUrl(href) || '';
  
  // Extract just the brand slug (remove "tobaccos/" prefix if present)
  const slug = fullSlug.replace(/^tobaccos\//, '');

  // Extract brand name (first span in the slug element)
  const name = $slugElement.find('span:first-child').text().trim();

  // For now, nameEn is the same as name (will be updated from the brand detail page later)
  const nameEn = name;

  // Extract country
  const country = $slugElement.find('.country').text().trim();

  // Extract image URL (lazy loading with data-src)
  const $img = $item.find('.tobacco_list_item_image img');
  const imageUrl = $img.attr('data-src') || $img.attr('src') || null;

  // Extract rating
  const ratingText = $item.find('.list_item_rating span').text().trim();
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

  // Extract ratings count
  const ratingsCountText = $item.find('.list_item_ratings_count span').text().trim();
  const ratingsCount = parseInteger(ratingsCountText) || 0;

  // Extract reviews count
  const reviewsCountText = $item.find('.list_item_reviews span').text().trim();
  const reviewsCount = parseInteger(reviewsCountText) || 0;

  // Extract views count (handles k and kk suffixes)
  const viewsText = $item.find('.list_item_stats span').text().trim();
  const viewsCount = parseViewsCount(viewsText) || 0;

  // Extract description
  const description = $item.find('.description_content span').text().trim();

  return {
    slug,
    name,
    nameEn,
    country,
    imageUrl,
    rating,
    ratingsCount,
    reviewsCount,
    viewsCount,
    description,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default scrapeBrandsList;
