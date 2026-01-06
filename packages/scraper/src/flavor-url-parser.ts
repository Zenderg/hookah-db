/**
 * Flavor URL Parser
 * 
 * Parses API response and extracts flavor URLs from flavor objects.
 */

import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scraper');

// ============================================================================
// Flavor URL Parser Implementation
// ============================================================================

/**
 * Flavor URL Parser Configuration
 */
export interface FlavorUrlParserConfig {
  /** Property name for flavor URL in API response (default: url) */
  urlProperty?: string;
  /** Property name for flavor slug in API response (default: slug) */
  slugProperty?: string;
}

/**
 * Parsed Flavor URL
 */
export interface ParsedFlavorUrl {
  /** Full URL to flavor detail page */
  url: string;
  /** Flavor slug */
  slug: string;
  /** Brand slug */
  brandSlug: string;
}

/**
 * Flavor URL Parser Class
 * 
 * Parses API response and extracts flavor URLs from flavor objects.
 */
export class FlavorUrlParser {
  private config: Required<FlavorUrlParserConfig>;

  constructor(config?: FlavorUrlParserConfig) {
    this.config = {
      urlProperty: config?.urlProperty || 'url',
      slugProperty: config?.slugProperty || 'slug',
    };
  }

  /**
   * Parse flavor URLs from API response
   * 
   * @param response API response data (array of flavor objects)
   * @param brandSlug Brand slug for context
   * @returns Array of parsed flavor URLs
   */
  parseFlavorUrls(response: any, brandSlug: string): ParsedFlavorUrl[] {
    const parsedUrls: ParsedFlavorUrl[] = [];
    
    try {
      // Check if response is an array
      if (!Array.isArray(response)) {
        logger.warn('API response is not an array', { 
          responseType: typeof response 
        } as any);
        return parsedUrls;
      }

      logger.debug(`Parsing ${response.length} flavor objects`, { brandSlug } as any);

      // Parse each flavor object
      for (let i = 0; i < response.length; i++) {
        const flavor = response[i];
        const parsedUrl = this.extractFlavorUrl(flavor, brandSlug);
        
        if (parsedUrl) {
          parsedUrls.push(parsedUrl);
          logger.verbose(`Parsed flavor URL: ${parsedUrl.url}`, { 
            flavorIndex: i,
            brandSlug 
          } as any);
        } else {
          logger.warn(`Failed to parse flavor URL at index ${i}`, { 
            flavor,
            brandSlug 
          } as any);
        }
      }

      // Remove duplicates
      const uniqueUrls = this.removeDuplicates(parsedUrls);
      
      if (uniqueUrls.length !== parsedUrls.length) {
        logger.debug(`Removed ${parsedUrls.length - uniqueUrls.length} duplicate flavor URLs`, { 
          brandSlug,
          originalCount: parsedUrls.length,
          uniqueCount: uniqueUrls.length 
        } as any);
      }

      logger.info(`Successfully parsed ${uniqueUrls.length} flavor URLs`, { 
        brandSlug,
        totalObjects: response.length 
      } as any);

      return uniqueUrls;
    } catch (error) {
      logger.error('Error parsing flavor URLs', { 
        brandSlug,
        error 
      } as any);
      // Return what we have so far
      return parsedUrls;
    }
  }

  /**
   * Extract URL from single flavor object
   * 
   * @param flavor Flavor object from API response
   * @param brandSlug Brand slug for context
   * @returns Parsed flavor URL or null if extraction fails
   */
  private extractFlavorUrl(flavor: any, brandSlug: string): ParsedFlavorUrl | null {
    try {
      // Check if flavor is an object
      if (typeof flavor !== 'object' || flavor === null) {
        logger.debug('Flavor is not an object', { 
          flavor,
          brandSlug 
        } as any);
        return null;
      }

      // First, try to get URL directly from configured property
      let url: string | undefined;
      
      if (flavor[this.config.urlProperty] && typeof flavor[this.config.urlProperty] === 'string') {
        url = flavor[this.config.urlProperty];
      }
      
      // If URL not found, try to construct it from slug
      if (!url) {
        const slug = flavor[this.config.slugProperty];
        if (slug && typeof slug === 'string') {
          // Construct URL from slug (e.g., "sarma/klassicheskaya/zima" -> "/tobaccos/sarma/klassicheskaya/zima")
          url = `/tobaccos/${slug}`;
          logger.debug(`Constructed URL from slug`, { 
            slug,
            constructedUrl: url,
            brandSlug 
          } as any);
        }
      }
      
      if (!url || typeof url !== 'string') {
        logger.debug('Flavor URL not found or invalid type', { 
          flavor,
          urlProperty: this.config.urlProperty,
          slugProperty: this.config.slugProperty,
          brandSlug 
        } as any);
        return null;
      }

      // Extract slug from URL
      let slug: string;
      if (flavor[this.config.slugProperty] && typeof flavor[this.config.slugProperty] === 'string') {
        slug = flavor[this.config.slugProperty];
      } else {
        // Extract slug from URL (e.g., /tobaccos/sarma/zima -> sarma/zima)
        const extractedSlug = this.extractSlugFromUrl(url);
        if (!extractedSlug) {
          logger.debug('Failed to extract flavor slug from URL', { 
            url,
            brandSlug 
          } as any);
          return null;
        }
        slug = extractedSlug;
      }

      const parsedUrl: ParsedFlavorUrl = {
        url,
        slug,
        brandSlug,
      };

      // Validate parsed URL
      if (!this.isValidFlavorUrl(parsedUrl)) {
        logger.debug('Invalid flavor URL', { 
          parsedUrl,
          brandSlug 
        } as any);
        return null;
      }

      return parsedUrl;
    } catch (error) {
      logger.error('Error extracting flavor URL', { 
        flavor,
        brandSlug,
        error 
      } as any);
      return null;
    }
  }

  /**
   * Validate parsed flavor URL
   * 
   * @param parsedUrl Parsed flavor URL
   * @returns True if valid
   */
  private isValidFlavorUrl(parsedUrl: ParsedFlavorUrl): boolean {
    // Check URL format
    if (!parsedUrl.url || typeof parsedUrl.url !== 'string') {
      return false;
    }

    // URL should start with /tobaccos/
    if (!parsedUrl.url.startsWith('/tobaccos/')) {
      return false;
    }

    // Check slug
    if (!parsedUrl.slug || typeof parsedUrl.slug !== 'string') {
      return false;
    }

    // Check brand slug
    if (!parsedUrl.brandSlug || typeof parsedUrl.brandSlug !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Extract slug from flavor URL
   * 
   * @param url Flavor URL
   * @returns Flavor slug or null if extraction fails
   */
  private extractSlugFromUrl(url: string): string | null {
    try {
      // Remove leading slash and split by /
      const parts = url.replace(/^\//, '').split('/');
      
      // URL format: /tobaccos/brandSlug/flavorSlug
      // parts: ['tobaccos', 'brandSlug', 'flavorSlug']
      if (parts.length >= 3) {
        // Return everything after 'tobaccos/' (includes brandSlug and flavorSlug)
        return parts.slice(1).join('/');
      }

      return null;
    } catch (error) {
      logger.error('Error extracting slug from URL', { url, error } as any);
      return null;
    }
  }

  /**
   * Remove duplicate flavor URLs
   * 
   * @param urls Array of parsed flavor URLs
   * @returns Array with duplicates removed
   */
  private removeDuplicates(urls: ParsedFlavorUrl[]): ParsedFlavorUrl[] {
    const seen = new Set<string>();
    const unique: ParsedFlavorUrl[] = []; 
    
    for (const urlObj of urls) {
      const key = urlObj.url; // Use URL as unique key
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(urlObj);
      }
    }

    return unique;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default FlavorUrlParser;
