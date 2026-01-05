/**
 * Data Service
 * 
 * Facade/orchestrator that provides a unified interface for all data operations.
 * Delegates to BrandService and FlavorService for specific operations.
 */

import { Brand, Flavor } from '@hookah-db/types';
import { BrandService } from './brand-service';
import { FlavorService } from './flavor-service';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('data-service');

// ============================================================================
// Data Service Implementation
// ============================================================================

/**
 * DataService acts as a facade for all data operations.
 * 
 * This service provides a unified entry point for API controllers,
 * delegating to appropriate service (BrandService or FlavorService)
 * for each operation. It implements the Facade pattern to simplify
 * interface and hide complexity of underlying services.
 */
export class DataService {
  private brandService: BrandService;
  private flavorService: FlavorService;

  /**
   * Create a new DataService instance
   * 
   * @param brandService BrandService instance for brand operations
   * @param flavorService FlavorService instance for flavor operations
   */
  constructor(
    brandService: BrandService,
    flavorService: FlavorService
  ) {
    this.brandService = brandService;
    this.flavorService = flavorService;
  }

  // ==========================================================================
  // Brand Operations
  // ==========================================================================

  /**
   * Get all brands with caching
   * 
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to array of Brand objects
   */
  async getAllBrands(forceRefresh = false): Promise<Brand[]> {
    try {
      return await this.brandService.getAllBrands(forceRefresh);
    } catch (error) {
      logger.error('Failed to get all brands', { error } as any);
      return [];
    }
  }

  /**
   * Get a specific brand by slug with caching
   * 
   * @param slug Brand slug (e.g., "sarma")
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to Brand object or null if not found
   */
  async getBrandBySlug(slug: string, forceRefresh = false): Promise<Brand | null> {
    try {
      return await this.brandService.getBrandBySlug(slug, forceRefresh);
    } catch (error) {
      logger.error('Failed to get brand by slug', { slug, error } as any);
      return null;
    }
  }

  /**
   * Get brands filtered by country
   * 
   * @param country Country name to filter by (e.g., "Россия", "USA")
   * @returns Promise resolving to array of Brand objects matching country
   */
  async getBrandsByCountry(country: string): Promise<Brand[]> {
    try {
      return await this.brandService.getBrandsByCountry(country);
    } catch (error) {
      logger.error('Failed to get brands by country', { country, error } as any);
      return [];
    }
  }

  // ==========================================================================
  // Flavor Operations
  // ==========================================================================

  /**
   * Get all flavors with caching
   * 
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to array of Flavor objects
   */
  async getAllFlavors(forceRefresh = false): Promise<Flavor[]> {
    try {
      return await this.flavorService.getAllFlavors(forceRefresh);
    } catch (error) {
      logger.error('Failed to get all flavors', { error } as any);
      return [];
    }
  }

  /**
   * Get a specific flavor by slug with caching
   * 
   * @param slug Flavor slug (e.g., "sarma/klassicheskaya/zima")
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to Flavor object or null if not found
   */
  async getFlavorBySlug(slug: string, forceRefresh = false): Promise<Flavor | null> {
    try {
      return await this.flavorService.getFlavorBySlug(slug, forceRefresh);
    } catch (error) {
      logger.error('Failed to get flavor by slug', { slug, error } as any);
      return null;
    }
  }

  /**
   * Get flavors filtered by brand
   * 
   * @param brandSlug Brand slug to filter by (e.g., "sarma")
   * @returns Promise resolving to array of Flavor objects matching brand
   */
  async getFlavorsByBrand(brandSlug: string): Promise<Flavor[]> {
    try {
      return await this.flavorService.getFlavorsByBrand(brandSlug);
    } catch (error) {
      logger.error('Failed to get flavors by brand', { brandSlug, error } as any);
      return [];
    }
  }

  /**
   * Get flavors filtered by line
   * 
   * @param lineSlug Line slug to filter by (e.g., "klassicheskaya")
   * @returns Promise resolving to array of Flavor objects matching line
   */
  async getFlavorsByLine(lineSlug: string): Promise<Flavor[]> {
    try {
      return await this.flavorService.getFlavorsByLine(lineSlug);
    } catch (error) {
      logger.error('Failed to get flavors by line', { lineSlug, error } as any);
      return [];
    }
  }

  /**
   * Get flavors filtered by tag
   * 
   * @param tag Tag name to filter by (e.g., "Холодок")
   * @returns Promise resolving to array of Flavor objects containing tag
   */
  async getFlavorsByTag(tag: string): Promise<Flavor[]> {
    try {
      return await this.flavorService.getFlavorsByTag(tag);
    } catch (error) {
      logger.error('Failed to get flavors by tag', { tag, error } as any);
      return [];
    }
  }

  // ==========================================================================
  // Combined Operations
  // ==========================================================================

  /**
   * Get brand with its flavors
   * 
   * Retrieves a brand and all its flavors in a single operation.
   * 
   * @param brandSlug Brand slug (e.g., "sarma")
   * @param forceRefresh If true, bypass cache and force scraping for both brand and flavors
   * @returns Promise resolving to object containing brand and flavors
   */
  async getBrandWithFlavors(
    brandSlug: string,
    forceRefresh = false
  ): Promise<{ brand: Brand | null; flavors: Flavor[] }> {
    try {
      const brand = await this.brandService.getBrandBySlug(brandSlug, forceRefresh);
      
      if (!brand) {
        return { brand: null, flavors: [] };
      }
      
      const flavors = await this.flavorService.getFlavorsByBrand(brandSlug);
      
      return { brand, flavors };
    } catch (error) {
      logger.error('Failed to get brand with flavors', { brandSlug, error } as any);
      return { brand: null, flavors: [] };
    }
  }

  /**
   * Search flavors by query string
   * 
   * Searches flavors where name, nameAlt, description, or any tag
   * contains query string (case-insensitive).
   * 
   * @param query Search query string
   * @returns Promise resolving to array of matching Flavor objects
   */
  async searchFlavors(query: string): Promise<Flavor[]> {
    try {
      const allFlavors = await this.flavorService.getAllFlavors();
      const lowerQuery = query.toLowerCase();
      
      const filteredFlavors = allFlavors.filter(flavor => {
        // Check name
        if (flavor.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Check nameAlt if it exists
        if (flavor.nameAlt && flavor.nameAlt.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Check description if it exists
        if (flavor.description && flavor.description.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Check tags
        if (flavor.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          return true;
        }
        
        return false;
      });
      
      return filteredFlavors;
    } catch (error) {
      logger.error('Failed to search flavors', { query, error } as any);
      return [];
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Refresh all cached data
   * 
   * Forces a refresh of both brand and flavor caches by scraping fresh data.
   * This updates the cache with latest data from htreviews.org.
   * 
   * @returns Promise that resolves when cache refresh is complete
   */
  async refreshAllCache(): Promise<void> {
    try {
      await Promise.all([
        this.brandService.refreshBrandCache(),
        this.flavorService.refreshFlavorCache()
      ]);
    } catch (error) {
      logger.error('Failed to refresh all cache', { error } as any);
      throw error;
    }
  }

  /**
   * Clear all cached data
   * 
   * Clears both brand and flavor data from the cache.
   * Note: This will force a full scrape on next data access.
   * 
   * @returns Promise that resolves when cache clearing is complete
   */
  async clearAllCache(): Promise<void> {
    try {
      // Clear brand cache by forcing refresh with empty data
      // Since services don't expose cache instances, we use refresh to clear
      // This will repopulate the cache with fresh data
      await this.refreshAllCache();
    } catch (error) {
      logger.error('Failed to clear all cache', { error } as any);
      throw error;
    }
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Get health status of cached data
   * 
   * Checks if brands and flavors are cached and returns their counts.
   * This provides a health check for the API to monitor cache status.
   * 
   * @returns Promise resolving to health status object
   */
  async getHealthStatus(): Promise<{
    brands: { cached: boolean; count: number };
    flavors: { cached: boolean; count: number };
  }> {
    try {
      const brands = await this.brandService.getAllBrands();
      const flavors = await this.flavorService.getAllFlavors();
      
      return {
        brands: {
          cached: brands.length > 0,
          count: brands.length
        },
        flavors: {
          cached: flavors.length > 0,
          count: flavors.length
        }
      };
    } catch (error) {
      logger.error('Failed to get health status', { error } as any);
      return {
        brands: { cached: false, count: 0 },
        flavors: { cached: false, count: 0 }
      };
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default DataService;
