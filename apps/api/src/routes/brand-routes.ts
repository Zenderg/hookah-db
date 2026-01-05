import { Router } from 'express';
import {
  getBrands,
  getBrandBySlug,
  refreshBrands,
  getFlavorsByBrand,
} from '../controllers';
import rateLimitMiddleware from '../middleware/rate-limit-middleware';
import authMiddleware from '../middleware/auth-middleware';

/**
 * Brand routes for Hookah Tobacco Database API.
 * 
 * Routes:
 * - GET /api/v1/brands - Get paginated list of brands
 * - GET /api/v1/brands/:slug - Get a single brand by slug
 * - GET /api/v1/brands/:brandSlug/flavors - Get flavors for a specific brand
 * - POST /api/v1/brands/refresh - Refresh brand data (requires authentication)
 * 
 * All routes require authentication via X-API-Key header.
 */
const router = Router();

// Apply rate limiting to all brand routes
router.use(rateLimitMiddleware);

// Apply authentication to all brand routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/brands:
 *   get:
 *     summary: List all brands
 *     description: Retrieve a paginated list of all hookah tobacco brands with optional filtering and sorting
 *     tags:
 *       - Brands
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page (max 100)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter brands by country of origin (case-insensitive)
 *         example: Россия
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: ['name', '-name', 'rating', '-rating']
 *         description: Sort field. Prefix with '-' for descending order
 *         example: name
 *     responses:
 *       200:
 *         description: List of brands retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Brand'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: API key is required
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid API key
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Too many requests, please try again later
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
// GET /api/v1/brands - Get paginated list of brands
// Query params: page, limit, country, sort
router.get('/', getBrands);

/**
 * @swagger
 * /api/v1/brands/{slug}:
 *   get:
 *     summary: Get brand by slug
 *     description: Retrieve detailed information about a specific hookah tobacco brand including lines and flavors
 *     tags:
 *       - Brands
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand slug (unique identifier)
 *         example: sarma
 *     responses:
 *       200:
 *         description: Brand details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: API key is required
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid API key
 *       404:
 *         description: Brand not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Brand with slug 'sarma' not found
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Too many requests, please try again later
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
// GET /api/v1/brands/:slug - Get a single brand by slug
router.get('/:slug', getBrandBySlug);

/**
 * @swagger
 * /api/v1/brands/{brandSlug}/flavors:
 *   get:
 *     summary: Get flavors by brand
 *     description: Retrieve a paginated list of flavors for a specific brand with optional filtering and sorting
 *     tags:
 *       - Brands
 *       - Flavors
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: brandSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand slug (unique identifier)
 *         example: sarma
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page (max 100)
 *       - in: query
 *         name: lineSlug
 *         schema:
 *           type: string
 *         description: Filter flavors by line slug
 *         example: klassicheskaya
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: ['name', '-name', 'rating', '-rating']
 *         description: Sort field. Prefix with '-' for descending order
 *         example: name
 *     responses:
 *       200:
 *         description: List of flavors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flavor'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: API key is required
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid API key
 *       404:
 *         description: Brand not found or no flavors available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No flavors found for brand with slug 'sarma'
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Too many requests, please try again later
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
// GET /api/v1/brands/:brandSlug/flavors - Get flavors for a specific brand
// Query params: page, limit, lineSlug, sort
router.get('/:brandSlug/flavors', getFlavorsByBrand);

/**
 * @swagger
 * /api/v1/brands/refresh:
 *   post:
 *     summary: Refresh brand data
 *     description: Force a refresh of all brand data by bypassing cache and scraping fresh data from htreviews.org. This operation may take some time to complete.
 *     tags:
 *       - Brands
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Brand data refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Brand data refreshed successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Brand'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: API key is required
 *       403:
 *         description: Forbidden - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid API key
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Too many requests, please try again later
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
// POST /api/v1/brands/refresh - Refresh brand data (requires authentication)
router.post('/refresh', refreshBrands);

export default router;
