/**
 * Health Controller
 * 
 * Handles HTTP requests for health check and system status.
 * Provides basic and detailed health information including database statistics.
 */

import { Request, Response } from 'express';
import { SQLiteDatabase } from '../database';
import { createCache } from '../cache';
import { LoggerFactory } from '../utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('health-controller');

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Basic health check response
 */
interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
}

/**
 * Detailed health check response
 */
interface HealthCheckDetailedResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  database?: {
    path: string;
    brandsCount: number;
    flavorsCount: number;
    dbSize: number;
  };
  cache?: {
    size: number;
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// ============================================================================
// Controller Class
// ============================================================================

/**
 * API version constant.
 * Can be updated to read from package.json if needed.
 */
const API_VERSION = '1.0.0';

/**
 * HealthController class for managing health check endpoints
 */
export class HealthController {
  /**
   * Create a new HealthController instance
   * @param db - SQLiteDatabase instance for database operations (optional, for backward compatibility)
   */
  constructor(private db?: SQLiteDatabase) {}

  /**
   * Basic health check endpoint.
   * 
   * Returns a simple health status to verify API is running.
   * This endpoint should not require authentication and should be lightweight.
   * 
   * Response format:
   * {
   *   status: 'ok',
   *   timestamp: '2024-01-05T14:00:00.000Z'
   * }
   * 
   * @param _req Express Request object (unused)
   * @param res Express Response object
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // Check database connection if available
      if (this.db) {
        const dbStats = this.db.getStats();

        // Log health check
        logger.info('Health check performed', {
          brandsCount: dbStats.brandsCount,
          flavorsCount: dbStats.flavorsCount,
        } as any);
      } else {
        logger.info('Health check performed (no database initialized)' as any);
      }

      const response: HealthCheckResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in healthCheck controller', { error } as any);
      throw error;
    }
  }

  /**
   * Detailed health check with database statistics.
   * 
   * Returns detailed health status including database statistics,
   * server uptime, and version information. This endpoint should not
   * require authentication and provides insights into system health.
   * 
   * Response format:
   * {
   *   status: 'ok' | 'degraded' | 'error',
   *   timestamp: '2024-01-05T14:00:00.000Z',
   *   uptime: 3600,
   *   version: '1.0.0',
   *   database: {
   *     path: '/path/to/hookah-db.db',
   *     brandsCount: 50,
   *     flavorsCount: 150,
   *     dbSize: 102400
   *   }
   * }
   * 
   * Status determination:
   * - 'ok': Database has data (brands + flavors > 0)
   * - 'degraded': Database is empty or has minimal data
   * - 'error': Critical failures (can be extended with additional checks)
   * 
   * @param _req Express Request object (unused)
   * @param res Express Response object
   */
  async healthCheckDetailed(_req: Request, res: Response): Promise<void> {
    try {
      let status: 'ok' | 'degraded' | 'error' = 'ok';
      const response: HealthCheckDetailedResponse = {
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: API_VERSION,
      };

      // If database is available, use database stats
      if (this.db) {
        // Get database statistics
        const dbStats = this.db.getStats();

        // Get database path from environment variable
        const databasePath = process.env.DATABASE_PATH || './hookah-db.db';

        // Check for degraded status (empty database)
        if (dbStats.brandsCount === 0 && dbStats.flavorsCount === 0) {
          status = 'degraded';
        }

        response.status = status;
        response.database = {
          path: databasePath,
          brandsCount: dbStats.brandsCount,
          flavorsCount: dbStats.flavorsCount,
          dbSize: dbStats.dbSize,
        };

        // Log detailed health check
        logger.info('Detailed health check performed', {
          status,
          brandsCount: dbStats.brandsCount,
          flavorsCount: dbStats.flavorsCount,
          dbSize: dbStats.dbSize,
        } as any);
      } else {
        // Fallback to cache for backward compatibility
        const cache = createCache({ type: 'memory', defaultTTL: 86400 });
        const cacheStats = cache.getStats();

        // Calculate cache hit rate (percentage)
        const totalRequests = cacheStats.hits + cacheStats.misses;
        const hitRate = totalRequests > 0
          ? (cacheStats.hits / totalRequests) * 100
          : 0;

        // Check for degraded status
        if (totalRequests > 0 && hitRate < 50) {
          status = 'degraded';
        }

        if (cacheStats.keys === 0) {
          status = 'degraded';
        }

        response.status = status;
        response.cache = {
          size: cacheStats.size,
          keys: cacheStats.keys,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
          hitRate: Math.round(hitRate * 100) / 100,
        };

        // Log detailed health check (cache fallback)
        logger.info('Detailed health check performed (cache fallback)', {
          status,
          cacheSize: cacheStats.size,
          cacheKeys: cacheStats.keys,
          hitRate,
        } as any);
      }

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in healthCheckDetailed controller', { error } as any);
      throw error;
    }
  }
}

// ============================================================================
// Backward Compatibility - Function Exports
// ============================================================================

/**
 * Default database instance for backward compatibility.
 * This will be replaced by server.ts with actual database instance.
 */
let defaultDb: SQLiteDatabase | undefined;

/**
 * Set the default database instance for health check functions.
 * This is called by server.ts during initialization.
 * @param db - SQLiteDatabase instance
 */
export function setDefaultDatabase(db: SQLiteDatabase): void {
  defaultDb = db;
}

/**
 * Basic health check endpoint (backward compatibility function).
 * 
 * @param req Express Request object
 * @param res Express Response object
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const controller = new HealthController(defaultDb);
  await controller.healthCheck(_req, res);
}

/**
 * Detailed health check endpoint (backward compatibility function).
 * 
 * @param req Express Request object
 * @param res Express Response object
 */
export async function healthCheckDetailed(_req: Request, res: Response): Promise<void> {
  const controller = new HealthController(defaultDb);
  await controller.healthCheckDetailed(_req, res);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  healthCheck,
  healthCheckDetailed,
  setDefaultDatabase,
};
