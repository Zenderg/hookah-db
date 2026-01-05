/**
 * Brand Controller
 * 
 * Handles HTTP requests for brand-related operations.
 * Coordinates between Express routes and BrandService.
 */

import { Request, Response } from 'express';
import { BrandService } from '@hookah-db/services';
import { Brand } from '@hookah-db/types';
import { createCache } from '@hookah-db/cache';
import { scrapeBrandsList, scrapeBrandDetails } from '@hookah-db/scraper';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('brand-controller');

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Custom error for not found resources.
 * Used when a requested resource (brand, flavor, etc.) cannot be found.
 */
export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Service Initialization
// ============================================================================

/**
 * Initialize BrandService with required dependencies.
 * Creates an in-memory cache instance and scraper functions.
 */
const cache = createCache({ type: 'memory', defaultTTL: 86400 });
const brandService = new BrandService(cache, scrapeBrandsList, scrapeBrandDetails);

// ============================================================================
// Controller Functions
// ============================================================================

/**
 * Get paginated list of brands.
 * 
 * Supports pagination, country filtering, and sorting.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - country: Filter by country (optional, case-insensitive)
 * - sort: Sort field (optional, supported: 'name', 'rating', '-name', '-rating')
 * 
 * Response format:
 * {
 *   data: Brand[],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }
 * 
 * @param req Express Request object
 * @param res Express Response object
 */
export async function getBrands(req: Request, res: Response): Promise<void> {
  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const country = req.query.country as string | undefined;
    const sort = req.query.sort as string | undefined;

    // Get brands (filter by country if specified)
    let brands: Brand[];
    if (country) {
      brands = await brandService.getBrandsByCountry(country);
    } else {
      brands = await brandService.getAllBrands();
    }

    // Apply sorting if specified
    if (sort) {
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.slice(1) : sort;

      brands.sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === 'rating') {
          comparison = a.rating - b.rating;
        }
        
        return isDescending ? -comparison : comparison;
      });
    }

    // Calculate pagination
    const total = brands.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBrands = brands.slice(startIndex, endIndex);

    // Send response
    res.status(200).json({
      data: paginatedBrands,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error in getBrands controller', { error } as any);
    throw error;
  }
}

/**
 * Get a single brand by slug.
 * 
 * Returns full brand details including lines and flavors.
 * 
 * Route params:
 * - slug: Brand slug (e.g., "sarma")
 * 
 * Response format:
 * Brand object with all properties including lines and flavors
 * 
 * @param req Express Request object
 * @param res Express Response object
 */
export async function getBrandBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;

    // Get brand from service
    const brand = await brandService.getBrandBySlug(slug);

    // Check if brand exists
    if (!brand) {
      throw new NotFoundError(`Brand with slug '${slug}' not found`);
    }

    // Send response
    res.status(200).json(brand);
  } catch (error) {
    logger.error('Error in getBrandBySlug controller', { slug: req.params.slug, error } as any);
    throw error;
  }
}

/**
 * Refresh brand data from scraper.
 * 
 * Forces a refresh of all brand data by bypassing cache and scraping
 * fresh data from htreviews.org. This endpoint should be protected
 * with authentication middleware.
 * 
 * No parameters required.
 * 
 * Response format:
 * {
 *   success: true,
 *   message: string,
 *   data: Brand[]
 * }
 * 
 * @param _req Express Request object (unused)
 * @param res Express Response object
 */
export async function refreshBrands(_req: Request, res: Response): Promise<void> {
  try {
    // Force refresh brand cache
    await brandService.refreshBrandCache();

    // Get refreshed brands
    const brands = await brandService.getAllBrands();

    // Send response
    res.status(200).json({
      success: true,
      message: 'Brand data refreshed successfully',
      data: brands,
    });
  } catch (error) {
    logger.error('Error in refreshBrands controller', { error } as any);
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getBrands,
  getBrandBySlug,
  refreshBrands,
};
