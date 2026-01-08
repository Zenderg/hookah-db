/**
 * Brand ID Extractor
 * 
 * Extracts brand ID from brand detail page HTML. This ID is required
 * for API-based flavor extraction from htreviews.org.
 */

import { Scraper } from './scraper';
import { CheerioAPI } from './html-parser';
import { LoggerFactory } from '../utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scraper');

// ============================================================================
// Brand ID Extractor Implementation
// ============================================================================

/**
 * Brand ID Extractor Configuration
 */
export interface BrandIdExtractorConfig {
  /** CSS selector for brand ID element */
  selector?: string;
  /** Attribute name containing brand ID */
  attribute?: string;
}

/**
 * Brand ID Extractor Class
 * 
 * Extracts brand ID from brand detail page HTML using data attributes.
 */
export class BrandIdExtractor {
  private config: Required<BrandIdExtractorConfig>;

  constructor(config?: BrandIdExtractorConfig) {
    this.config = {
      selector: config?.selector || '[data-id]',
      attribute: config?.attribute || 'data-id',
    };
  }

  /**
   * Extract brand ID from brand detail page
   * 
   * @param $ Cheerio instance from brand detail page
   * @returns Brand ID as string or null if not found
   */
  extractBrandId($: CheerioAPI): string | null {
    try {
      // Try to find brand ID using configured selector
      const element = $(this.config.selector).first();
      
      if (element.length === 0) {
        logger.debug('Brand ID element not found with selector', { 
          selector: this.config.selector 
        } as any);
        return null;
      }

      const brandId = element.attr(this.config.attribute);
      
      if (!brandId) {
        logger.debug('Brand ID attribute not found', { 
          selector: this.config.selector,
          attribute: this.config.attribute 
        } as any);
        return null;
      }

      logger.debug('Successfully extracted brand ID', { brandId } as any);
      return brandId;
    } catch (error) {
      logger.error('Error extracting brand ID', { error } as any);
      return null;
    }
  }

  /**
   * Extract brand ID from brand detail page URL
   * 
   * @param brandSlug Brand slug
   * @returns Brand ID as string or null if extraction fails
   */
  async extractBrandIdFromPage(brandSlug: string): Promise<string | null> {
    const scraper = new Scraper();
    
    try {
      logger.debug('Fetching brand page to extract brand ID', { brandSlug } as any);
      
      // Fetch and parse brand detail page
      const $ = await scraper.fetchAndParse(`/tobaccos/${brandSlug}`);
      
      // Extract brand ID from HTML
      const brandId = this.extractBrandId($);
      
      if (brandId) {
        logger.info('Successfully extracted brand ID from page', { 
          brandSlug,
          brandId 
        } as any);
      } else {
        logger.warn('Failed to extract brand ID from page', { brandSlug } as any);
      }
      
      return brandId;
    } catch (error) {
      logger.error('Failed to extract brand ID from page', { 
        brandSlug,
        error 
      } as any);
      return null;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default BrandIdExtractor;
