/**
 * Test server setup for API tests
 * Creates an Express app with mocked services
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  MockBrandService,
  MockFlavorService,
  MockDataService,
  MockCache,
} from './test-utils';

// ============================================================================
// Create Test App
// ============================================================================

export function createTestApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Rate limiting middleware (with high limits for tests)
  const rateLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Create mock services
  const mockCache = new MockCache();
  const mockBrandService = new MockBrandService();
  const mockFlavorService = new MockFlavorService();
  const mockDataService = new MockDataService();

  // ============================================================================
  // Health Check Routes
  // ============================================================================

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/detailed', async (req: Request, res: Response) => {
    try {
      const cacheStats = await mockCache.getStats();

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        cache: {
          size: cacheStats.size,
          keys: cacheStats.keys,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: cacheStats.hitRate,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get cache statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Brand Routes
  // ============================================================================

  // GET /api/v1/brands - List all brands with pagination and filtering
  app.get('/api/v1/brands', rateLimiter, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const country = req.query.country as string;
      const sort = req.query.sort as string;

      let result;
      if (country) {
        result = await mockBrandService.getBrandsByCountry(country, { page, limit, sort });
      } else {
        result = await mockBrandService.getBrands({ page, limit, sort });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBrands controller:', error);
      throw error;
    }
  });

  // GET /api/v1/brands/:slug - Get brand by slug
  app.get('/api/v1/brands/:slug', rateLimiter, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const brand = await mockBrandService.getBrandBySlug(slug);

      if (!brand) {
        const error = new Error(`Brand with slug '${slug}' not found`) as any;
        error.name = 'Not Found';
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      res.status(200).json(brand);
    } catch (error) {
      console.error(`Error in getBrandBySlug controller for slug '${req.params.slug}':`, error);
      throw error;
    }
  });

  // GET /api/v1/brands/:brandSlug/flavors - Get flavors for a specific brand
  app.get('/api/v1/brands/:brandSlug/flavors', rateLimiter, async (req: Request, res: Response) => {
    try {
      const { brandSlug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await mockFlavorService.getFlavorsByBrand(brandSlug, { page, limit });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBrandFlavors controller:', error);
      throw error;
    }
  });

  // POST /api/v1/brands/refresh - Refresh brand data (requires authentication)
  app.post('/api/v1/brands/refresh', rateLimiter, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const result = await mockBrandService.refreshBrands();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in refreshBrands controller:', error);
      throw error;
    }
  });

  // ============================================================================
  // Flavor Routes
  // ============================================================================

  // GET /api/v1/flavors - List all flavors with pagination and filtering
  app.get('/api/v1/flavors', rateLimiter, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const brandSlug = req.query.brandSlug as string;
      const lineSlug = req.query.lineSlug as string;
      const strength = req.query.strength as string;
      const tags = req.query.tags as string;
      const sort = req.query.sort as string;

      const filters: any = { page, limit };
      if (brandSlug) filters.brandSlug = brandSlug;
      if (lineSlug) filters.lineSlug = lineSlug;
      if (strength) filters.strength = strength;
      if (tags) filters.tags = tags.split(',');
      if (sort) filters.sort = sort;

      const result = await mockFlavorService.getFlavors(filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getFlavors controller:', error);
      throw error;
    }
  });

  // GET /api/v1/flavors/:slug - Get flavor by slug
  app.get('/api/v1/flavors/:slug', rateLimiter, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const flavor = await mockFlavorService.getFlavorBySlug(slug);

      if (!flavor) {
        const error = new Error(`Flavor with slug '${slug}' not found`) as any;
        error.name = 'Not Found';
        error.statusCode = 404;
        error.isOperational = true;
        throw error;
      }

      res.status(200).json(flavor);
    } catch (error) {
      console.error(`Error in getFlavorBySlug controller for slug '${req.params.slug}':`, error);
      throw error;
    }
  });

  // POST /api/v1/flavors/refresh - Refresh flavor data (requires authentication)
  app.post('/api/v1/flavors/refresh', rateLimiter, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const result = await mockFlavorService.refreshFlavors();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in refreshFlavors controller:', error);
      throw error;
    }
  });

  // ============================================================================
  // Error Handling Middleware
  // ============================================================================

  // 404 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    const error = new Error(`Route ${req.method} ${req.url} not found`) as any;
    error.name = 'Not Found';
    error.statusCode = 404;
    error.isOperational = true;
    next(error);
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const statusCode = (err as any).statusCode || 500;
    const isOperational = (err as any).isOperational || false;

    // Log the error with request details
    console.error(`[${new Date().toISOString()}] Error: ${req.method} ${req.url}`);
    console.error(`Status: ${statusCode}`);
    console.error(`Error: ${err.message}`);

    if (process.env.NODE_ENV !== 'production' && err.stack) {
      console.error(`Stack: ${err.stack}`);
    }

    // Send the response with appropriate status code and JSON body
    res.status(statusCode).json({
      error: err.name,
      message: err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack }),
    });
  });

  return app;
}

// ============================================================================
// Authentication Middleware
// ============================================================================

function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    const error = new Error('API key is required') as any;
    error.name = 'Unauthorized';
    error.statusCode = 401;
    error.isOperational = true;
    res.status(401).json({
      error: error.name,
      message: error.message,
    });
    return;
  }

  const validApiKeys = [
    process.env.API_KEY_TEST,
    process.env.API_KEY_CLIENT1,
    process.env.API_KEY_CLIENT2,
  ].filter(Boolean) as string[];

  if (!validApiKeys.includes(apiKey)) {
    const error = new Error('Invalid API key') as any;
    error.name = 'Forbidden';
    error.statusCode = 403;
    error.isOperational = true;
    res.status(403).json({
      error: error.name,
      message: error.message,
    });
    return;
  }

  next();
}
