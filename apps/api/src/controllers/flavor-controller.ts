/**
 * Flavor Controller
 * 
 * Handles HTTP requests for flavor-related operations.
 * Coordinates between Express routes and FlavorService.
 */

import { Request, Response } from 'express';
import { FlavorService } from '@hookah-db/services';
import { Flavor } from '@hookah-db/types';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('flavor-controller');

// ============================================================================
// Service Initialization
// ============================================================================

/**
 * Initialize FlavorService with required dependencies.
 * Service will be injected by server.ts during initialization.
 */
let flavorService: FlavorService | null = null;

/**
 * Set FlavorService instance (called by server.ts)
 */
export function setFlavorService(service: FlavorService): void {
  flavorService = service;
}

// ============================================================================
// Controller Functions
// ============================================================================

/**
 * Get paginated list of flavors.
 * 
 * Supports pagination, filtering by brand, line, strength, tags, and sorting.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - brandSlug: Filter by brand slug (optional)
 * - lineSlug: Filter by line slug (optional)
 * - strength: Filter by strength level (optional, case-insensitive)
 * - tags: Filter by tags (comma-separated, optional, case-insensitive)
 * - sort: Sort field (optional, supported: 'name', 'rating', '-name', '-rating')
 * 
 * Response format:
 * {
 *   data: Flavor[],
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
export async function getFlavors(req: Request, res: Response): Promise<void> {
  if (!flavorService) {
    res.status(503).json({ error: 'FlavorService not initialized' });
    return;
  }

  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const brandSlug = req.query.brandSlug as string | undefined;
    const lineSlug = req.query.lineSlug as string | undefined;
    const strength = req.query.strength as string | undefined;
    const tags = req.query.tags as string | undefined;
    const sort = req.query.sort as string | undefined;

    // Get flavors based on filters
    let flavors: Flavor[];
    
    if (brandSlug) {
      // Filter by brand
      flavors = await flavorService.getFlavorsByBrand(brandSlug);
    } else if (lineSlug) {
      // Filter by line
      flavors = await flavorService.getFlavorsByLine(lineSlug);
    } else {
      // Get all flavors
      flavors = await flavorService.getAllFlavors();
    }

    // Apply additional filters
    if (strength) {
      flavors = flavors.filter(
        flavor => flavor.userStrength?.toLowerCase() === strength.toLowerCase() ||
                   flavor.officialStrength?.toLowerCase() === strength.toLowerCase()
      );
    }

    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
      flavors = flavors.filter(
        flavor => tagList.some(tag => 
          flavor.tags.some(flavorTag => flavorTag.toLowerCase() === tag)
        )
      );
    }

    // Apply sorting if specified
    if (sort) {
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.slice(1) : sort;

      flavors.sort((a, b) => {
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
    const total = flavors.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFlavors = flavors.slice(startIndex, endIndex);

    // Send response
    res.status(200).json({
      data: paginatedFlavors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error in getFlavors controller', { error } as any);
    throw error;
  }
}

/**
 * Get a single flavor by slug.
 * 
 * Returns full flavor details including rating distribution.
 * 
 * Route params:
 * - slug: Flavor slug (e.g., "sarma/klassicheskaya/zima")
 * 
 * Response format:
 * Flavor object with all properties including rating distribution
 * 
 * @param req Express Request object
 * @param res Express Response object
 */
export async function getFlavorBySlug(req: Request, res: Response): Promise<void> {
  if (!flavorService) {
    res.status(503).json({ error: 'FlavorService not initialized' });
    return;
  }

  try {
    const { slug } = req.params;

    // Get flavor from service
    const flavor = await flavorService.getFlavorBySlug(slug);

    // Check if flavor exists
    if (!flavor) {
      const error = new Error(`Flavor with slug '${slug}' not found`);
      (error as any).statusCode = 404;
      (error as any).isOperational = true;
      throw error;
    }

    // Send response
    res.status(200).json(flavor);
  } catch (error) {
    logger.error('Error in getFlavorBySlug controller', { slug: req.params.slug, error } as any);
    throw error;
  }
}

/**
 * Get flavors for a specific brand.
 * 
 * Returns paginated list of flavors for specified brand.
 * 
 * Route params:
 * - brandSlug: Brand slug (e.g., "sarma")
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - lineSlug: Filter by line slug (optional)
 * - sort: Sort field (optional, supported: 'name', 'rating', '-name', '-rating')
 * 
 * Response format:
 * {
 *   data: Flavor[],
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
export async function getFlavorsByBrand(req: Request, res: Response): Promise<void> {
  if (!flavorService) {
    res.status(503).json({ error: 'FlavorService not initialized' });
    return;
  }

  try {
    const { brandSlug } = req.params;

    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const lineSlug = req.query.lineSlug as string | undefined;
    const sort = req.query.sort as string | undefined;

    // Get flavors for brand
    let flavors = await flavorService.getFlavorsByBrand(brandSlug);

    // Check if brand has any flavors
    if (flavors.length === 0) {
      const error = new Error(`No flavors found for brand with slug '${brandSlug}'`);
      (error as any).statusCode = 404;
      (error as any).isOperational = true;
      throw error;
    }

    // Apply line filter if specified
    if (lineSlug) {
      flavors = flavors.filter(flavor => flavor.lineSlug === lineSlug);
    }

    // Apply sorting if specified
    if (sort) {
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.slice(1) : sort;

      flavors.sort((a, b) => {
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
    const total = flavors.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFlavors = flavors.slice(startIndex, endIndex);

    // Send response
    res.status(200).json({
      data: paginatedFlavors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error in getFlavorsByBrand controller', { brandSlug: req.params.brandSlug, error } as any);
    throw error;
  }
}

/**
 * Refresh flavor data from scraper.
 * 
 * Forces a refresh of all flavor data by bypassing cache and scraping
 * fresh data from htreviews.org. This endpoint should be protected
 * with authentication middleware.
 * 
 * No parameters required.
 * 
 * Response format:
 * {
 *   success: true,
 *   message: string,
 *   data: Flavor[]
 * }
 * 
 * @param _req Express Request object (unused)
 * @param res Express Response object
 */
export async function refreshFlavors(_req: Request, res: Response): Promise<void> {
  if (!flavorService) {
    res.status(503).json({ error: 'FlavorService not initialized' });
    return;
  }

  try {
    // Force refresh flavor data
    const flavors = await flavorService.refreshFlavors();

    // Send response
    res.status(200).json({
      success: true,
      message: 'Flavor data refreshed successfully',
      data: flavors,
    });
  } catch (error) {
    logger.error('Error in refreshFlavors controller', { error } as any);
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getFlavors,
  getFlavorBySlug,
  getFlavorsByBrand,
  refreshFlavors,
};
