import { Router } from 'express';
import {
  getFlavors,
  getFlavorBySlug,
  refreshFlavors,
} from '../controllers';
import { rateLimitMiddleware, authMiddleware } from '../middleware';

/**
 * Flavor routes for the Hookah Tobacco Database API.
 * 
 * Routes:
 * - GET /api/v1/flavors - Get paginated list of flavors
 * - GET /api/v1/flavors/:slug - Get a single flavor by slug
 * - POST /api/v1/flavors/refresh - Refresh flavor data (requires authentication)
 * 
 * Note: GET /api/v1/brands/:brandSlug/flavors is defined in brand-routes.ts
 */
const router = Router();

// Apply rate limiting to all flavor routes
router.use(rateLimitMiddleware);

// GET /api/v1/flavors - Get paginated list of flavors
// Query params: page, limit, brandSlug, lineSlug, strength, tags, sort
router.get('/', getFlavors);

// GET /api/v1/flavors/:slug - Get a single flavor by slug
router.get('/:slug', getFlavorBySlug);

// POST /api/v1/flavors/refresh - Refresh flavor data (requires authentication)
router.post('/refresh', authMiddleware, refreshFlavors);

export default router;
