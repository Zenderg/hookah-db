/**
 * Flavor Service
 * 
 * Orchestrates flavor data retrieval using SQLite database.
 * Coordinates between database and data service for flavor-related operations.
 */

import { Flavor } from '@hookah-db/types';
import { SQLiteDatabase } from '@hookah-db/database';
import { DataService } from './data-service';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('flavor-service');

// ============================================================================
// Flavor Service Implementation
// ============================================================================

/**
 * FlavorService implements database-first pattern for flavor data.
 * 
 * This service provides methods to retrieve flavor data directly from SQLite database.
 * It uses DataService for data refresh operations that scrape from htreviews.org
 * and persist to SQLite.
 */
export class FlavorService {
  private db: SQLiteDatabase;
  private dataService: DataService;

  /**
   * Create a new FlavorService instance
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
   * Get a flavor by slug
   * 
   * Retrieves flavor data directly from SQLite database.
   * 
   * @param slug Flavor slug (e.g., "sarma/klassicheskaya/zima")
   * @returns Promise resolving to Flavor object or null if not found
   */
  async getFlavor(slug: string): Promise<Flavor | null> {
    try {
      logger.debug('Getting flavor from database', { slug } as any);
      
      const flavor = this.db.getFlavor(slug);
      
      if (flavor) {
        logger.debug('Flavor found in database', { slug, name: flavor.name } as any);
      } else {
        logger.debug('Flavor not found in database', { slug } as any);
      }
      
      return flavor;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get flavor from database', { 
        slug, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return null;
    }
  }

  /**
   * Get all flavors
   * 
   * Retrieves all flavors from SQLite database.
   * 
   * @returns Promise resolving to array of Flavor objects
   */
  async getFlavors(): Promise<Flavor[]> {
    try {
      logger.debug('Getting all flavors from database');
      
      const flavors = this.db.getAllFlavors();
      
      logger.debug('Flavors retrieved from database', { count: flavors.length } as any);
      
      return flavors;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get flavors from database', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return [];
    }
  }

  /**
   * Get all flavors (alias for getFlavors)
   * 
   * @returns Promise resolving to array of Flavor objects
   */
  async getAllFlavors(): Promise<Flavor[]> {
    return this.getFlavors();
  }

  /**
   * Get a flavor by slug (alias for getFlavor)
   * 
   * @param slug Flavor slug (e.g., "sarma/klassicheskaya/zima")
   * @returns Promise resolving to Flavor object or null if not found
   */
  async getFlavorBySlug(slug: string): Promise<Flavor | null> {
    return this.getFlavor(slug);
  }

  /**
   * Get flavors filtered by brand
   * 
   * Retrieves flavors from database filtered by brandSlug.
   * 
   * @param brandSlug Brand slug to filter by (e.g., "sarma")
   * @returns Promise resolving to array of Flavor objects matching brand
   */
  async getFlavorsByBrand(brandSlug: string): Promise<Flavor[]> {
    try {
      logger.debug('Getting flavors by brand', { brandSlug } as any);
      
      const flavors = this.db.getFlavorsByBrand(brandSlug);
      
      logger.debug('Flavors retrieved by brand', { 
        brandSlug, 
        count: flavors.length 
      } as any);
      
      return flavors;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get flavors by brand', { 
        brandSlug, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return [];
    }
  }

  /**
   * Get flavors filtered by line
   * 
   * Retrieves all flavors from database and filters by lineSlug.
   * 
   * @param lineSlug Line slug to filter by (e.g., "klassicheskaya")
   * @returns Promise resolving to array of Flavor objects matching line
   */
  async getFlavorsByLine(lineSlug: string): Promise<Flavor[]> {
    try {
      logger.debug('Getting flavors by line', { lineSlug } as any);
      
      const allFlavors = this.db.getAllFlavors();
      
      // Filter flavors by lineSlug
      const filteredFlavors = allFlavors.filter(
        flavor => flavor.lineSlug === lineSlug
      );
      
      logger.debug('Flavors filtered by line', { 
        lineSlug, 
        count: filteredFlavors.length 
      } as any);
      
      return filteredFlavors;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get flavors by line', { 
        lineSlug, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return [];
    }
  }

  /**
   * Get flavors filtered by tag
   * 
   * Retrieves all flavors from database and filters by tag.
   * Tag matching is case-insensitive.
   * 
   * @param tag Tag name to filter by (e.g., "Холодок")
   * @returns Promise resolving to array of Flavor objects containing tag
   */
  async getFlavorsByTag(tag: string): Promise<Flavor[]> {
    try {
      logger.debug('Getting flavors by tag', { tag } as any);
      
      const allFlavors = this.db.getAllFlavors();
      
      // Filter flavors that contain tag (case-insensitive)
      const filteredFlavors = allFlavors.filter(
        flavor => flavor.tags.some(
          flavorTag => flavorTag.toLowerCase() === tag.toLowerCase()
        )
      );
      
      logger.debug('Flavors filtered by tag', { 
        tag, 
        count: filteredFlavors.length 
      } as any);
      
      return filteredFlavors;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get flavors by tag', { 
        tag, 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      
      return [];
    }
  }

  /**
   * Refresh all flavors
   * 
   * Forces a refresh of all flavor data by scraping from htreviews.org
   * and storing in SQLite database via DataService.
   * 
   * @returns Promise resolving to array of refreshed Flavor objects
   */
  async refreshFlavors(): Promise<Flavor[]> {
    try {
      logger.info('Starting flavor refresh');
      
      // Use DataService to refresh flavors from htreviews.org
      const result = await this.dataService.refreshFlavors();
      
      if (!result.success) {
        logger.error('Flavor refresh failed', { error: result.error } as any);
        throw new Error(result.error || 'Flavor refresh failed');
      }
      
      // Return refreshed flavors from database
      const flavors = this.db.getAllFlavors();
      
      logger.info('Flavor refresh completed successfully', { 
        count: flavors.length 
      } as any);
      
      return flavors;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh flavors', { 
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

export default FlavorService;
