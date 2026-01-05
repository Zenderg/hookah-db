import dotenv from 'dotenv';
import path from 'path';
import express, { Express, Request, Response, NextFunction } from 'express';
import { brandRoutes, flavorRoutes } from './routes';
import {
  healthCheck,
  healthCheckDetailed,
} from './controllers';
import { errorHandler, authMiddleware } from './middleware';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swagger';
import { Scheduler, createScheduler } from '@hookah-db/scheduler';
import { DataService } from '@hookah-db/services';
import { BrandService } from '@hookah-db/services';
import { FlavorService } from '@hookah-db/services';
import { createCache } from '@hookah-db/cache';
import { scrapeBrandsList, scrapeBrandDetails, scrapeFlavorDetails } from '@hookah-db/scraper';

// Load environment variables from .env file in root directory
// __dirname is apps/api/src, so we need to go up 3 levels to reach root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

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

// Scheduler routes (authentication required)
app.get('/api/v1/scheduler/stats', authMiddleware, (_req: Request, res: Response) => {
  if (!scheduler) {
    res.status(503).json({ error: 'Scheduler not initialized' });
    return;
  }
  const stats = scheduler.getStats();
  res.json(stats);
});

app.get('/api/v1/scheduler/jobs', authMiddleware, (_req: Request, res: Response) => {
  if (!scheduler) {
    res.status(503).json({ error: 'Scheduler not initialized' });
    return;
  }
  const tasks = scheduler.getAllTasks();
  const jobs = tasks.map(task => ({
    id: task.taskId,
    name: task.name,
    enabled: task.enabled,
    lastRun: task.lastRun,
    nextRun: task.nextRun,
    totalRuns: task.runCount,
    errorCount: task.errorCount,
  }));
  res.json({ jobs });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.url} not found` });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize scheduler
let scheduler: Scheduler | null = null;

// Initialize cache instance
const cache = createCache({ type: 'memory', defaultTTL: 86400 });

// Initialize DataService with required services
const brandService = new BrandService(cache, scrapeBrandsList, scrapeBrandDetails);
const flavorService = new FlavorService(cache, scrapeFlavorDetails);
const dataService = new DataService(brandService, flavorService);

// Create scheduler configuration
const schedulerConfig = {
  enabled: process.env.SCHEDULER_ENABLED === 'true',
  brandsSchedule: process.env.CRON_SCHEDULE_BRANDS || '0 2 * * *',
  flavorsSchedule: process.env.CRON_SCHEDULE_FLAVORS || '0 3 * * *',
  allDataSchedule: process.env.CRON_SCHEDULE_ALL || '0 4 * * *',
  maxExecutionHistory: parseInt(process.env.MAX_EXECUTION_HISTORY || '100', 10),
};

// Create scheduler instance
if (schedulerConfig.enabled) {
  scheduler = createScheduler(schedulerConfig);
  console.log('Scheduler instance created');
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  
  if (scheduler) {
    console.log('Stopping scheduler...');
    await scheduler.stop();
    console.log('Scheduler stopped');
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Server startup
const PORT = process.env.PORT || 3000;

export async function startServer(): Promise<void> {
  // Start scheduler if enabled
  if (scheduler && schedulerConfig.enabled) {
    try {
      // Schedule default refresh tasks
      scheduler.scheduleDefaultRefreshTasks(() => dataService.refreshAllCache());
      
      await scheduler.start();
      console.log('Scheduler started successfully');
      console.log(`  - Brands refresh: ${schedulerConfig.brandsSchedule}`);
      console.log(`  - Flavors refresh: ${schedulerConfig.flavorsSchedule}`);
      console.log(`  - All data refresh: ${schedulerConfig.allDataSchedule}`);
    } catch (error) {
      console.error('Failed to start scheduler:', error);
      // Continue without scheduler if it fails to start
    }
  } else {
    console.log('Scheduler is disabled');
  }

  app.listen(PORT, () => {
    console.log(`Hookah Tobacco Database API server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API v1: http://localhost:${PORT}/api/v1`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    if (scheduler && schedulerConfig.enabled) {
      console.log(`Scheduler stats: http://localhost:${PORT}/api/v1/scheduler/stats`);
      console.log(`Scheduler jobs: http://localhost:${PORT}/api/v1/scheduler/jobs`);
    }
  });
}

// Export app for testing
export default app;

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
