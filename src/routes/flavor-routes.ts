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
 * Available routes:
 * - GET /api/v1/flavors - Get paginated list of flavors
 * - GET /api/v1/flavors/:slug - Get a single flavor by slug (supports slugs with slashes via URL encoding)
 * - POST /api/v1/flavors/refresh - Refresh flavor data (requires authentication)
 * 
 * Note: GET /api/v1/brands/:brandSlug/flavors is defined in brand-routes.ts
 * 
 * All routes require authentication via X-API-Key header.
 * 
 * Important: Flavor slugs containing slashes must be URL-encoded.
 * For example:
 *   - Slug "afzal/afzal-main/orange" should be requested as "afzal%2Fafzal-main%2Forange"
 *   - Slug "sarma/klassicheskaya/zima" should be requested as "sarma%2Fklassicheskaya%2Fzima"
 *   - Slug "zima" (no slashes) can be requested as "zima" (no encoding needed)
 */
const router: Router = Router();

// Apply rate limiting to all flavor routes
router.use(rateLimitMiddleware);

// Apply authentication to all flavor routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/flavors:
 *   get:
 *     summary: List all flavors
 *     description: Retrieve a paginated list of all hookah tobacco flavors with optional filtering by brand, line, strength, tags, and sorting
 *     tags:
 *       - Flavors
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search flavors by name (searches both name and nameAlt fields, case-insensitive)
 *         example: Зима
 *       - in: query
 *         name: brandSlug
 *         schema:
 *           type: string
 *         description: Filter flavors by brand slug (unique identifier)
 *         example: sarma
 *       - in: query
 *         name: lineSlug
 *         schema:
 *           type: string
 *         description: Filter flavors by line slug (unique identifier)
 *         example: klassicheskaya
 *       - in: query
 *         name: strength
 *         schema:
 *           type: string
 *         description: Filter flavors by strength level (case-insensitive, matches official or user strength)
 *         example: Средняя
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter flavors by tags (comma-separated, case-insensitive)
 *         example: Холодок,Цитрус
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
// GET /api/v1/flavors - Get paginated list of flavors
// Query params: page, limit, search, brandSlug, lineSlug, strength, tags, sort
router.get('/', getFlavors);

/**
 * @swagger
 * /api/v1/flavors/refresh:
 *   post:
 *     summary: Refresh flavor data
 *     description: Force a refresh of all flavor data by bypassing cache and scraping fresh data from htreviews.org. This operation may take some time to complete.
 *     tags:
 *       - Flavors
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Flavor data refreshed successfully
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
 *                   example: Flavor data refreshed successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flavor'
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
// POST /api/v1/flavors/refresh - Refresh flavor data (requires authentication)
// Must be placed before slug route to avoid matching "refresh" as a slug
router.post('/refresh', refreshFlavors);

/**
 * @swagger
 * /api/v1/flavors/{slug}:
 *   get:
 *     summary: Get flavor by slug
 *     description: Retrieve detailed information about a specific hookah tobacco flavor including rating distribution and metadata. The slug may contain slashes, which must be URL-encoded (e.g., "sarma%2Fklassicheskaya%2Fzima" for "sarma/klassicheskaya/zima").
 *     tags:
 *       - Flavors
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: "Flavor slug (unique identifier, may contain slashes - use URL encoding for slashes %2F)"
 *         example: sarma%2Fklassicheskaya%2Fzima
 *     responses:
 *       200:
 *         description: Flavor details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Flavor'
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
 *         description: Flavor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Flavor with slug 'sarma/klassicheskaya/zima' not found
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
// GET /api/v1/flavors/:slug - Get a single flavor by slug
// Flavor slugs containing slashes must be URL-encoded:
//   - Simple slug: /api/v1/flavors/zima
//   - Slug with slashes: /api/v1/flavors/afzal%2Fafzal-main%2Forange
//   - Slug with slashes: /api/v1/flavors/sarma%2Fklassicheskaya%2Fzima
// The controller will decode URL-encoded slug automatically
router.get('/:slug', getFlavorBySlug);

export default router;
