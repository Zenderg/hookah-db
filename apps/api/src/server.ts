import express, { Express, Request, Response, NextFunction } from 'express';
import { brandRoutes, flavorRoutes } from './routes';
import {
  healthCheck,
  healthCheckDetailed,
} from './controllers';
import { errorHandler } from './middleware';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swagger';

// Create Express app
const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (optional, for development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic API health status to verify the service is running. This endpoint is lightweight and does not require authentication.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['ok']
 *                   description: Health status
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Current server timestamp in ISO 8601 format
 *                   example: '2026-01-05T15:30:00.000Z'
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
// Health check routes (no authentication required)
app.get('/health', healthCheck);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with cache statistics
 *     description: Returns detailed health status including cache statistics, server uptime, and version information. This endpoint provides insights into system performance and cache efficiency. Does not require authentication.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Detailed health information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['ok', 'degraded', 'error']
 *                   description: Overall health status
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Current server timestamp in ISO 8601 format
 *                   example: '2026-01-05T15:30:00.000Z'
 *                 uptime:
 *                   type: integer
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 version:
 *                   type: string
 *                   description: API version
 *                   example: '1.0.0'
 *                 cache:
 *                   type: object
 *                   description: Cache performance statistics
 *                   properties:
 *                     size:
 *                       type: integer
 *                       description: Total number of items in cache
 *                       example: 150
 *                     keys:
 *                       type: integer
 *                       description: Number of unique cache keys
 *                       example: 50
 *                     hits:
 *                       type: integer
 *                       description: Total cache hits
 *                       example: 1000
 *                     misses:
 *                       type: integer
 *                       description: Total cache misses
 *                       example: 50
 *                     hitRate:
 *                       type: number
 *                       format: float
 *                       description: Cache hit rate percentage (0-100)
 *                       example: 95.24
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
app.get('/health/detailed', healthCheckDetailed);

// Generate OpenAPI specification
const specs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI (no authentication required)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Serve OpenAPI JSON specification (no authentication required)
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// API routes
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/flavors', flavorRoutes);

// 404 handler for undefined routes
app.use((req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.url} not found` });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Server startup
const PORT = process.env.PORT || 3000;

export function startServer(): void {
  app.listen(PORT, () => {
    console.log(`Hookah Tobacco Database API server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API v1: http://localhost:${PORT}/api/v1`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  });
}

// Export app for testing
export default app;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}
