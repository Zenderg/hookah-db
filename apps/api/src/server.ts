import dotenv from 'dotenv';
import path from 'path';
import express, { Express, Request, Response, NextFunction } from 'express';
import brandRoutes from './routes/brand-routes';
import flavorRoutes from './routes/flavor-routes';
import errorHandler from './middleware/error-handler-middleware';
import authMiddleware from './middleware/auth-middleware';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swagger';
import { Scheduler, createScheduler } from '@hookah-db/scheduler';
import { DataService } from '@hookah-db/services';
import { BrandService } from '@hookah-db/services';
import { FlavorService } from '@hookah-db/services';
import { SQLiteDatabase } from '@hookah-db/database';
import { LoggerFactory } from '@hookah-db/utils';
import { setBrandService, setFlavorService } from './controllers';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('api-server');

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
    logger.info(`${req.method} ${req.url}` as any);
    next();
  });
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic API health status to verify that service is running. This endpoint is lightweight and does not require authentication.
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
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with database statistics
 *     description: Returns detailed health status including database statistics, server uptime, and version information. This endpoint provides insights into system performance and database efficiency. Does not require authentication.
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
 *                 database:
 *                   type: object
 *                   description: Database performance statistics
 *                   properties:
 *                     path:
 *                       type: string
 *                       description: Path to SQLite database file
 *                       example: './hookah-db.db'
 *                     brandsCount:
 *                       type: integer
 *                       description: Total number of brands in database
 *                       example: 50
 *                     flavorsCount:
 *                       type: integer
 *                       description: Total number of flavors in database
 *                       example: 150
 *                     dbSize:
 *                       type: integer
 *                       description: Database file size in bytes
 *                       example: 102400
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
app.get('/health/detailed', (_req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({ error: 'Database not initialized' });
    return;
  }

  const dbStats = db.getStats();
  const dbPath = process.env.DATABASE_PATH || './hookah-db.db';
  
  // Determine health status
  let status: 'ok' | 'degraded' | 'error' = 'ok';
  if (dbStats.brandsCount === 0 && dbStats.flavorsCount === 0) {
    status = 'degraded';
  }

  res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    database: {
      path: dbPath,
      brandsCount: dbStats.brandsCount,
      flavorsCount: dbStats.flavorsCount,
      dbSize: dbStats.dbSize,
    },
  });
});

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

// Initialize database
let db: SQLiteDatabase | null = null;

try {
  const dbPath = process.env.DATABASE_PATH || './hookah-db.db';
  logger.info(`Initializing SQLite database at ${dbPath}` as any);
  db = new SQLiteDatabase(dbPath);
  logger.info('Database initialized successfully' as any);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Failed to initialize database', { 
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined
  } as any);
  throw error;
}

// Initialize services with database
const dataService = new DataService(db);
const brandService = new BrandService(db, dataService);
const flavorService = new FlavorService(db, dataService);

// Inject services into controllers
setBrandService(brandService);
setFlavorService(flavorService);

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
  try {
    scheduler = createScheduler(dataService, db, schedulerConfig);
    logger.info('Scheduler instance created' as any);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to create scheduler', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    } as any);
    // Continue without scheduler if it fails to initialize
  }
}

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...` as any);
  
  if (scheduler) {
    logger.info('Stopping scheduler...' as any);
    await scheduler.stop();
    logger.info('Scheduler stopped' as any);
  }
  
  if (db) {
    logger.info('Closing database connection...' as any);
    db.close();
    logger.info('Database connection closed' as any);
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
      scheduler.scheduleDefaultRefreshTasks();
      
      await scheduler.start();
      logger.info('Scheduler started successfully' as any);
      logger.info(`  - Brands refresh: ${schedulerConfig.brandsSchedule}` as any);
      logger.info(`  - Flavors refresh: ${schedulerConfig.flavorsSchedule}` as any);
      logger.info(`  - All data refresh: ${schedulerConfig.allDataSchedule}` as any);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start scheduler', { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      } as any);
      // Continue without scheduler if it fails to start
    }
  } else {
    logger.info('Scheduler is disabled' as any);
  }

  app.listen(PORT, () => {
    logger.info(`Hookah Tobacco Database API server is running on port ${PORT}` as any);
    logger.info(`Health check: http://localhost:${PORT}/health` as any);
    logger.info(`API v1: http://localhost:${PORT}/api/v1` as any);
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs` as any);
    if (scheduler && schedulerConfig.enabled) {
      logger.info(`Scheduler stats: http://localhost:${PORT}/api/v1/scheduler/stats` as any);
      logger.info(`Scheduler jobs: http://localhost:${PORT}/api/v1/scheduler/jobs` as any);
    }
  });
}

// Export app for testing
export default app;

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start server', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    } as any);
    process.exit(1);
  });
}
