/**
 * Brand Service
 * 
 * Orchestrates brand data retrieval using SQLite database.
 * Coordinates between database and data service for brand-related operations.
 */

import { Brand } from '@hookah-db/types';
import { SQLiteDatabase } from '@hookah-db/database';
import { DataService } from './data-service';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('brand-service');

// ============================================================================
// Brand Service Implementation
// ============================================================================

/**
 * BrandService implements database-first pattern for brand data.
 * 
 * This service provides methods to retrieve brand data directly from SQLite database.
 * It uses DataService for data refresh operations that scrape from htreviews.org
 * and persist to SQLite.
 */
export class BrandService {
  private db: SQLiteDatabase;
  private dataService: DataService;

  /**
   * Create a new BrandService instance
   * 
   * @param db SQLiteDatabase instance for persistent storage
   * @param dataService DataService for data refresh operations
   */
  constructor(
    db: SQLiteDatabase,
    dataService: DataService
  ) {
    this.db = db;
    this.dataService = dataService;
  }

  /**
   * Get a brand by slug
   * 
   * Retrieves brand data directly from SQLite database.
   * 
   * @param slug Brand slug (e.g., "sarma")
   * @returns Promise resolving to Brand object or null if not found
   */
  async getBrand(slug: string): Promise<Brand | null> {
    try {
      logger.debug('Getting brand from database', { slug } as any);
      
      const brand = this.db.getBrand(slug);
      
      if (brand) {
        logger.debug('Brand found in database', { slug, name: brand.name } as any);
      } else {
        logger.debug('Brand not found in database', { slug } as any);
      }
      
      return brand;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get brand from database', { 
        slug, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return null;
    }
  }

  /**
   * Get all brands
   * 
   * Retrieves all brands from SQLite database.
   * 
   * @returns Promise resolving to array of Brand objects
   */
  async getBrands(): Promise<Brand[]> {
    try {
      logger.debug('Getting all brands from database');
      
      const brands = this.db.getAllBrands();
      
      logger.debug('Brands retrieved from database', { count: brands.length } as any);
      
      return brands;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get brands from database', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return [];
    }
  }

  /**
   * Get all brands (alias for getBrands)
   * 
   * @returns Promise resolving to array of Brand objects
   */
  async getAllBrands(): Promise<Brand[]> {
    return this.getBrands();
  }

  /**
   * Get a brand by slug (alias for getBrand)
   * 
   * @param slug Brand slug (e.g., "sarma")
   * @returns Promise resolving to Brand object or null if not found
   */
  async getBrandBySlug(slug: string): Promise<Brand | null> {
    return this.getBrand(slug);
  }

  /**
   * Get brands filtered by country
   * 
   * Retrieves all brands from database and filters by country.
   * Country comparison is case-insensitive.
   * 
   * @param country Country name to filter by (e.g., "Россия", "USA")
   * @returns Promise resolving to array of Brand objects matching the country
   */
  async getBrandsByCountry(country: string): Promise<Brand[]> {
    try {
      logger.debug('Getting brands by country', { country } as any);
      
      const allBrands = this.db.getAllBrands();
      
      // Filter brands by country (case-insensitive)
      const filteredBrands = allBrands.filter(
        brand => brand.country.toLowerCase() === country.toLowerCase()
      );
      
      logger.debug('Brands filtered by country', { 
        country, 
        count: filteredBrands.length 
      } as any);
      
      return filteredBrands;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get brands by country', { 
        country, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return [];
    }
  }

  /**
   * Refresh all brands
   * 
   * Forces a refresh of all brand data by scraping from htreviews.org
   * and storing in SQLite database via DataService.
   * 
   * @returns Promise resolving to array of refreshed Brand objects
   */
  async refreshBrands(): Promise<Brand[]> {
    try {
      logger.info('Starting brand refresh');
      
      // Use DataService to refresh brands from htreviews.org
      const result = await this.dataService.refreshBrands();
      
      if (!result.success) {
        logger.error('Brand refresh failed', { error: result.error } as any);
        throw new Error(result.error || 'Brand refresh failed');
      }
      
      // Return refreshed brands from database
      const brands = this.db.getAllBrands();
      
      logger.info('Brand refresh completed successfully', { 
        count: brands.length 
      } as any);
      
      return brands;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh brands', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      throw error;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default BrandService;
