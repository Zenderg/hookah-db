import { Router } from 'express';
import {
  getBrands,
  getBrandBySlug,
  refreshBrands,
  getFlavorsByBrand,
} from '../controllers';
import { rateLimitMiddleware, authMiddleware } from '../middleware';

/**
 * Brand routes for the Hookah Tobacco Database API.
 * 
 * Routes:
 * - GET /api/v1/brands - Get paginated list of brands
 * - GET /api/v1/brands/:slug - Get a single brand by slug
 * - GET /api/v1/brands/:brandSlug/flavors - Get flavors for a specific brand
 * - POST /api/v1/brands/refresh - Refresh brand data (requires authentication)
 */
const router = Router();

// Apply rate limiting to all brand routes
router.use(rateLimitMiddleware);

// GET /api/v1/brands - Get paginated list of brands
// Query params: page, limit, country, sort
router.get('/', getBrands);

// GET /api/v1/brands/:slug - Get a single brand by slug
router.get('/:slug', getBrandBySlug);

// GET /api/v1/brands/:brandSlug/flavors - Get flavors for a specific brand
// Query params: page, limit, lineSlug, sort
router.get('/:brandSlug/flavors', getFlavorsByBrand);

// POST /api/v1/brands/refresh - Refresh brand data (requires authentication)
router.post('/refresh', authMiddleware, refreshBrands);

export default router;
