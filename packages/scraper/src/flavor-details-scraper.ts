/**
 * Flavor Details Scraper
 * 
 * Scrapes detailed information about a specific flavor from htreviews.org.
 * Extracts complete flavor data including tags, ratings, and metadata.
 */

import { Scraper } from './scraper';
import {
  extractText,
  extractAttribute,
  extractLinkUrl,
  extractImageUrl,
  extractRating,
  parseViewsCount,
  parseDate,
  parseInteger,
  parseRatingDistribution,
  parseSmokeAgainPercentage,
  extractSlugFromUrl,
  CheerioAPI,
} from './html-parser';
import { Flavor } from '@hookah-db/types';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scraper');

// ============================================================================
// Tag Interface
// ============================================================================

/**
 * Represents a flavor tag with its metadata
 */
export interface FlavorTag {
  /** Tag ID (extracted from URL query parameter) */
  id: number;
  /** Tag name (e.g., "Холодок") */
  name: string;
  /** Tag group (e.g., "Освежающий") */
  group: string;
}

// ============================================================================
// Flavor Details Scraper
// ============================================================================

/**
 * Scrape detailed information about a specific flavor
 * @param flavorSlug Flavor slug (e.g., "sarma/klassicheskaya/zima")
 * @returns Complete Flavor object or null if scraping fails
 */
export async function scrapeFlavorDetails(
  flavorSlug: string
): Promise<Flavor | null> {
  const scraper = new Scraper();

  try {
    // Build URL and fetch HTML
    const path = `/tobaccos/${flavorSlug}`;
    const $ = await scraper.fetchAndParse(path);

    // Extract HTReviews ID
    const htreviewsIdAttr = extractAttribute($, '.object_wrapper', 'data-id');
    const htreviewsId = htreviewsIdAttr ? parseInteger(htreviewsIdAttr) : null;
    if (htreviewsId === null) {
      logger.error('Failed to extract HTReviews ID for flavor', { flavorSlug } as any);
      return null;
    }

    // Extract flavor basic info
    const name = extractText($, '.object_card_title h1');
    const nameAlt = extractText($, '.object_card_title span') || null;
    const description = extractText($, '.object_card_discr span');

    // Extract brand info
    const brandName = extractText($, '.object_info_item:contains("Бренд") a');
    const brandUrl = extractLinkUrl($, '.object_info_item:contains("Бренд") a');
    const brandSlug = extractSlugFromUrl(brandUrl);

    // Extract line info
    const lineName = extractText($, '.object_info_item:contains("Линейка") a') || null;
    const lineUrl = extractLinkUrl($, '.object_info_item:contains("Линейка") a');
    const lineSlug = lineUrl ? extractSlugFromUrl(lineUrl) : null;

    // Extract country
    const country = extractText($, '.object_info_item:contains("Страна") > span:last-child');

    // Extract strength info
    const officialStrength =
      extractText($, '.object_info_item:contains("Крепость официальная") > span:last-child') || null;
    const userStrength =
      extractText($, '.object_info_item:contains("Крепость по оценкам") > span:last-child') || null;

    // Extract status
    const status = extractText($, '.object_info_item[data-id="1"] > span:last-child');

    // Extract image URL
    const imageUrl = extractImageUrl($, '.object_image img');

    // Extract rating
    const rating = extractRating($, '.score_graphic div[data-rating]') || 0;

    // Extract counts
    const ratingsCountText = extractText($, '.score_graphic [data-stats="1"] > div:first-child span');
    const ratingsCount = parseInteger(ratingsCountText) || 0;

    const reviewsCountText = extractText($, '.score_graphic [data-stats="1"] > div:nth-child(2) span');
    const reviewsCount = parseInteger(reviewsCountText) || 0;

    const viewsCountText = extractText($, '.score_graphic [data-stats="1"] > div:nth-child(3) span');
    const viewsCount = parseViewsCount(viewsCountText) || 0;

    // Extract rating distribution
    const ratingDistribution = parseRatingDistribution($, '.score_meter .score_meter_item');

    // Extract smoke again percentage
    const smokeAgainPercentage = parseSmokeAgainPercentage($, '.again_meter') || 0;

    // Extract date added
    const dateAddedText = extractText($, '.object_info_item:contains("Добавлен на сайт") > span');
    const dateAdded = parseDate(dateAddedText) || new Date();

    // Extract added by user
    const addedBy = extractText($, '.object_info_item:contains("Добавил") a');

    // Extract tags
    const tags = extractTags($);

    // Build flavor object
    const flavor: Flavor = {
      slug: flavorSlug,
      name,
      nameAlt,
      description,
      brandSlug: brandSlug || '',
      brandName,
      lineSlug,
      lineName,
      country,
      officialStrength,
      userStrength,
      status,
      imageUrl,
      tags,
      rating,
      ratingsCount,
      reviewsCount,
      viewsCount,
      ratingDistribution,
      smokeAgainPercentage,
      htreviewsId,
      dateAdded,
      addedBy,
    };

    return flavor;
  } catch (error) {
    logger.error('Failed to scrape flavor details', { flavorSlug, error } as any);
    return null;
  }
}

// ============================================================================
// Tag Extraction Helpers
// ============================================================================

/**
 * Extract tags from flavor page
 * @param $ Cheerio instance
 * @returns Array of tag names
 */
function extractTags($: CheerioAPI): string[] {
  const tags: string[] = [];

  // Find all tag elements
  $('.group_items .object_card_tag').each((_, element) => {
    const $tag = $(element);
    const tagName = $tag.find('span:last-child').text().trim();
    if (tagName) {
      tags.push(tagName);
    }
  });

  return tags;
}

/**
 * Extract detailed tag information from flavor page
 * @param $ Cheerio instance
 * @returns Array of FlavorTag objects with metadata
 */
export function extractDetailedTags($: CheerioAPI): FlavorTag[] {
  const detailedTags: FlavorTag[] = [];

  // Find all tag groups
  $('.tags_group').each((_, groupElement) => {
    const $group = $(groupElement);
    const groupName = $group.find('.group_title span').text().trim();

    // Find all tags in this group
    $group.next('.group_items').find('.object_card_tag').each((_, tagElement) => {
      const $tag = $(tagElement);
      const tagName = $tag.find('span:last-child').text().trim();
      const tagUrl = $tag.attr('href');

      // Extract tag ID from URL query parameter
      let tagId: number | null = null;
      if (tagUrl) {
        const match = tagUrl.match(/[?&]t=(\d+)/);
        if (match) {
          tagId = parseInt(match[1], 10);
        }
      }

      if (tagName && groupName) {
        detailedTags.push({
          id: tagId || 0,
          name: tagName,
          group: groupName,
        });
      }
    });
  });

  return detailedTags;
}
