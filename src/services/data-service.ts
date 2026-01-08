/**
 * Data Service
 * 
 * Orchestrator that provides a unified interface for all data operations.
 * Works directly with SQLite database and scrapers for data persistence.
 */

import { SQLiteDatabase } from '../database';
import { scrapeBrandsList, scrapeBrandDetails, scrapeFlavorDetails, extractFlavorUrls } from '../scraper';
import { LoggerFactory } from '../utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('data-service');

// ============================================================================
// Types
// ============================================================================

export interface RefreshResult {
  success: boolean;
  brandsCount: number;
  flavorsCount: number;
  error?: string;
}

export interface DatabaseStats {
  brandsCount: number;
  flavorsCount: number;
  dbSize: number;
}

// ============================================================================
// Data Service Implementation
// ============================================================================

/**
 * DataService orchestrates data operations between scrapers and SQLite database.
 * 
 * This service provides methods to refresh data from htreviews.org and store
 * it directly in SQLite database. It replaces cache-based approach with
 * persistent storage.
 */
export class DataService {
  /**
   * Create a new DataService instance
   * 
   * @param db SQLiteDatabase instance for persistent storage
   */
  constructor(
    private db: SQLiteDatabase
  ) {}

  // ==========================================================================
  // Data Refresh Operations
  // ==========================================================================

  /**
   * Refresh all data from htreviews.org
   * 
   * Scrapes all brands and flavors and stores them in SQLite database.
   * This is a comprehensive refresh that updates all data.
   * 
   * @returns Promise resolving to refresh result with counts
   */
  async refreshAllData(): Promise<RefreshResult> {
    logger.info('Starting full data refresh');
    
    try {
      // Refresh brands first
      const brandsResult = await this.refreshBrands();
      
      if (!brandsResult.success) {
        logger.error('Failed to refresh brands during full refresh', { error: brandsResult.error } as any);
        return {
          success: false,
          brandsCount: 0,
          flavorsCount: 0,
          error: brandsResult.error
        };
      }
      
      // Then refresh flavors
      const flavorsResult = await this.refreshFlavors();
      
      if (!flavorsResult.success) {
        logger.error('Failed to refresh flavors during full refresh', { error: flavorsResult.error } as any);
        return {
          success: false,
          brandsCount: brandsResult.brandsCount,
          flavorsCount: 0,
          error: flavorsResult.error
        };
      }
      
      logger.info('Full data refresh completed successfully', { 
        brandsCount: brandsResult.brandsCount,
        flavorsCount: flavorsResult.flavorsCount 
      } as any);
      
      return {
        success: true,
        brandsCount: brandsResult.brandsCount,
        flavorsCount: flavorsResult.flavorsCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh all data', { 
        error: errorMessage, 
        stack: error instanceof Error ? error.stack : undefined 
      } as any);
      
      return {
        success: false,
        brandsCount: 0,
        flavorsCount: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Refresh brand data from htreviews.org
   * 
   * Scrapes all brands from htreviews.org and stores them in SQLite database.
   * Also scrapes all flavors for each brand and stores them in database.
   * 
   * @returns Promise resolving to refresh result with brand and flavor counts
   */
  async refreshBrands(): Promise<RefreshResult> {
    logger.info('Starting brand data refresh');
    
    try {
      // Scrape brand list
      const brandSummaries = await scrapeBrandsList();
      logger.info(`Scraped ${brandSummaries.length} brand summaries`);
      
      let brandsSaved = 0;
      let brandsUpdated = 0;
      let totalFlavorsScraped = 0;
      
      // For each brand, scrape detailed information and its flavors
      for (const summary of brandSummaries) {
        try {
          logger.debug(`Scraping brand details: ${summary.slug}`);
          const brand = await scrapeBrandDetails(summary.slug);
          
          if (!brand) {
            logger.error(`Brand details returned null: ${summary.slug}`);
            brandsUpdated++;
            continue;
          }
          
          // Save brand to SQLite
          this.db.setBrand(brand);
          brandsSaved++;
          
          logger.debug(`Brand saved: ${brand.slug} (${brand.name})`);
          
          // Scrape flavors for this brand using pagination-aware function
          const flavorsScraped = await this.scrapeFlavorsForBrand(brand.slug);
          totalFlavorsScraped += flavorsScraped;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to scrape brand details: ${summary.slug}`, { error: errorMessage } as any);
          brandsUpdated++;
        }
      }
      
      logger.info('Brand data refresh completed', {
        brandsSaved,
        brandsUpdated,
        totalFlavorsScraped,
        totalBrands: brandSummaries.length
      } as any);
      
      return {
        success: true,
        brandsCount: brandsSaved,
        flavorsCount: totalFlavorsScraped
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh brands', { 
        error: errorMessage, 
        stack: error instanceof Error ? error.stack : undefined 
      } as any);
      
      return {
        success: false,
        brandsCount: 0,
        flavorsCount: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Scrape all flavors for a specific brand
   * 
   * This private method uses the pagination-aware extractFlavorUrls function
   * to get all flavor URLs, then iterates through each URL to scrape
   * complete flavor data.
   * 
   * @param brandSlug The brand slug (e.g., "sarma")
   * @returns Promise resolving to count of flavors successfully scraped
   */
  private async scrapeFlavorsForBrand(brandSlug: string): Promise<number> {
    logger.info(`Starting flavor scraping for brand: ${brandSlug}`);
    
    try {
      // Extract all flavor URLs with pagination support
      logger.info(`Extracting flavor URLs with pagination for brand: ${brandSlug}`);
      const flavorUrls = await extractFlavorUrls(brandSlug);
      
      if (flavorUrls.length === 0) {
        logger.debug(`No flavor URLs found for brand: ${brandSlug}`);
        return 0;
      }
      
      logger.info(`Found ${flavorUrls.length} flavor URLs for brand: ${brandSlug}`);
      
      let flavorsScraped = 0;
      let flavorsFailed = 0;
      
      // Iterate through each flavor URL and scrape details
      for (let i = 0; i < flavorUrls.length; i++) {
        const flavorUrl = flavorUrls[i];
        
        try {
          // Extract flavor slug from URL
          // Handle both absolute URLs (https://htreviews.org/tobaccos/brand/line/flavor)
          // and relative URLs (/tobaccos/brand/line/flavor)
          let flavorSlug: string;
          
          logger.info(`Processing flavor URL: ${flavorUrl}`);
          
          if (flavorUrl.startsWith('http')) {
            // Absolute URL: extract path after /tobaccos/
            const urlParts = new URL(flavorUrl);
            const pathParts = urlParts.pathname.split('/').filter(part => part.length > 0); // Filter out empty strings
            const tobaccosIndex = pathParts.indexOf('tobaccos');
            
            logger.info(`URL parts: pathname=${urlParts.pathname}, pathParts=[${pathParts.join(',')}], tobaccosIndex=${tobaccosIndex}`);
            
            if (tobaccosIndex >= 0 && tobaccosIndex < pathParts.length - 1) {
              flavorSlug = pathParts.slice(tobaccosIndex + 1).join('/');
              logger.info(`Extracted flavor slug: ${flavorSlug}`);
            } else {
              logger.warn(`Invalid flavor URL format: ${flavorUrl}` as any);
              flavorsFailed++;
              continue;
            }
          } else if (flavorUrl.startsWith('/tobaccos/')) {
            // Relative URL starting with /tobaccos/: remove prefix
            flavorSlug = flavorUrl.replace(/^\/tobaccos\//, '');
            logger.info(`Extracted flavor slug (relative): ${flavorSlug}`);
          } else {
            // Other relative URL format, use as-is
            flavorSlug = flavorUrl;
            logger.info(`Using flavor slug as-is: ${flavorSlug}`);
          }
          
          logger.info(`Scraping flavor ${i + 1} of ${flavorUrls.length} for brand ${brandSlug}: ${flavorSlug}`);
          
          // Scrape flavor details
          const flavor = await scrapeFlavorDetails(flavorSlug);
          
          if (!flavor) {
            logger.error(`Flavor details returned null: ${flavorSlug}`);
            flavorsFailed++;
            continue;
          }
          
          // Save flavor to SQLite
          this.db.setFlavor(flavor);
          flavorsScraped++;
          
          logger.debug(`Flavor saved: ${flavor.slug} (${flavor.name})`);
          
          // Add delay between requests to respect rate limiting
          // The HTTP client already has built-in delays, but we add extra delay here
          // to be extra respectful to server
          if (i < flavorUrls.length - 1) {
            await this.sleep(1000); // 1 second delay between requests
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to scrape flavor: ${flavorUrl}`, { error: errorMessage } as any);
          flavorsFailed++;
          
          // Continue with next flavor even if one fails
        }
      }
      
      logger.info(`Flavor scraping completed for brand: ${brandSlug}`, {
        flavorsScraped,
        flavorsFailed,
        total: flavorUrls.length
      } as any);
      
      return flavorsScraped;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to scrape flavors for brand: ${brandSlug}`, { 
        error: errorMessage, 
        stack: error instanceof Error ? error.stack : undefined 
      } as any);
      
      return 0;
    }
  }

  /**
   * Helper method to add delay between requests
   * 
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Refresh flavor data from htreviews.org
   * 
   * Scrapes all flavors from all brands and stores them in SQLite database.
   * 
   * @returns Promise resolving to refresh result with flavor count
   */
  async refreshFlavors(): Promise<RefreshResult> {
    logger.info('Starting flavor data refresh');
    
    try {
      // Get all brands first
      const brands = this.db.getAllBrands();
      logger.info(`Found ${brands.length} brands in database`);
      
      let flavorsSaved = 0;
      let flavorsSkipped = 0;
      
      // For each brand, scrape all its flavors
      for (const brand of brands) {
        try {
          logger.debug(`Scraping flavors for brand: ${brand.slug}`);
          
          // Scrape brand details to get flavor list
          const brandDetails = await scrapeBrandDetails(brand.slug);
          
          if (!brandDetails) {
            logger.error(`Brand details returned null: ${brand.slug}`);
            flavorsSkipped++;
            continue;
          }
          
          if (!brandDetails.flavors || brandDetails.flavors.length === 0) {
            logger.debug(`No flavors found for brand: ${brand.slug}`);
            flavorsSkipped++;
            continue;
          }
          
          logger.debug(`Found ${brandDetails.flavors.length} flavors for brand: ${brand.slug}`);
          
          // For each flavor, scrape detailed information
          for (const flavorSummary of brandDetails.flavors) {
            try {
              // Build full flavor slug: brandSlug/flavorSlug
              const fullSlug = `${brand.slug}/${flavorSummary.slug}`;
              logger.debug(`Scraping flavor details: ${fullSlug}`);
              
              const flavor = await scrapeFlavorDetails(fullSlug);
              
              if (!flavor) {
                logger.error(`Flavor details returned null: ${fullSlug}`);
                flavorsSkipped++;
                continue;
              }
              
              // Save to SQLite
              this.db.setFlavor(flavor);
              flavorsSaved++;
              
              logger.debug(`Flavor saved: ${flavor.slug} (${flavor.name})`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              logger.error(`Failed to scrape flavor: ${flavorSummary.slug}`, { error: errorMessage } as any);
              flavorsSkipped++;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to scrape flavors for brand: ${brand.slug}`, { error: errorMessage } as any);
        }
      }
      
      logger.info('Flavor data refresh completed', {
        flavorsSaved,
        flavorsSkipped
      } as any);
      
      return {
        success: true,
        brandsCount: 0,
        flavorsCount: flavorsSaved
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh flavors', { 
        error: errorMessage, 
        stack: error instanceof Error ? error.stack : undefined 
      } as any);
      
      return {
        success: false,
        brandsCount: 0,
        flavorsCount: 0,
        error: errorMessage
      };
    }
  }

  // ==========================================================================
  // Database Statistics
  // ==========================================================================

  /**
   * Get database statistics
   * 
   * Returns statistics about SQLite database including counts and file size.
   * 
   * @returns Database statistics
   */
  getDatabaseStats(): DatabaseStats {
    try {
      const stats = this.db.getStats();
      logger.debug('Database stats retrieved', stats as any);
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get database stats', { error: errorMessage } as any);
      
      return {
        brandsCount: 0,
        flavorsCount: 0,
        dbSize: 0
      };
    }
  }

  /**
   * Get database file path
   * 
   * Returns path to SQLite database file.
   * Useful for health checks and monitoring.
   * 
   * @returns Path to database file
   */
  getDatabasePath(): string {
    try {
      // The dbPath is not directly exposed in stats, so we return a placeholder
      // In a real implementation, we might need to add a method to SQLiteDatabase
      logger.debug('Database path requested');
      return './hookah-db.db';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get database path', { error: errorMessage } as any);
      return './hookah-db.db';
    }
  }

  // ==========================================================================
  // Legacy Cache Methods (for backward compatibility)
  // ==========================================================================

  /**
   * Refresh all cached data (legacy method)
   * 
   * @deprecated Use refreshAllData() instead
   * @returns Promise that resolves when refresh is complete
   */
  async refreshAllCache(): Promise<void> {
    logger.warn('refreshAllCache() is deprecated, use refreshAllData() instead' as any);
    await this.refreshAllData();
  }
}

// ============================================================================
// Exports
// ============================================================================

export default DataService;
