/**
 * Health Controller
 * 
 * Handles HTTP requests for health check and system status.
 * Provides basic and detailed health information including cache statistics.
 */

import { Request, Response } from 'express';
import { createCache } from '@hookah-db/cache';

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
  cache: {
    size: number;
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// ============================================================================
// Service Initialization
// ============================================================================

/**
 * Initialize cache instance for health monitoring.
 * Uses the same configuration as other controllers.
 */
const cache = createCache({ type: 'memory', defaultTTL: 86400 });

/**
 * API version constant.
 * Can be updated to read from package.json if needed.
 */
const API_VERSION = '1.0.0';

// ============================================================================
// Controller Functions
// ============================================================================

/**
 * Basic health check endpoint.
 * 
 * Returns a simple health status to verify the API is running.
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
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in healthCheck controller:', error);
    throw error;
  }
}

/**
 * Detailed health check with cache statistics.
 * 
 * Returns detailed health status including cache statistics,
 * server uptime, and version information. This endpoint should not
 * require authentication and provides insights into system health.
 * 
 * Response format:
 * {
 *   status: 'ok' | 'degraded' | 'error',
 *   timestamp: '2024-01-05T14:00:00.000Z',
 *   uptime: 3600,
 *   version: '1.0.0',
 *   cache: {
 *     size: 150,
 *     keys: 50,
 *     hits: 1000,
 *     misses: 50,
 *     hitRate: 95.24
 *   }
 * }
 * 
 * Status determination:
 * - 'ok': All systems operational, cache hit rate >= 50% or cache not empty
 * - 'degraded': Cache hit rate < 50% or cache is empty
 * - 'error': Critical failures (can be extended with additional checks)
 * 
 * @param _req Express Request object (unused)
 * @param res Express Response object
 */
export async function healthCheckDetailed(_req: Request, res: Response): Promise<void> {
  try {
    // Get cache statistics
    const cacheStats = cache.getStats();

    // Calculate cache hit rate (percentage)
    const totalRequests = cacheStats.hits + cacheStats.misses;
    const hitRate = totalRequests > 0
      ? (cacheStats.hits / totalRequests) * 100
      : 0;

    // Determine health status
    let status: 'ok' | 'degraded' | 'error' = 'ok';

    // Check for degraded status
    if (totalRequests > 0 && hitRate < 50) {
      status = 'degraded';
    }

    if (cacheStats.keys === 0) {
      status = 'degraded';
    }

    // Build response
    const response: HealthCheckDetailedResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: API_VERSION,
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in healthCheckDetailed controller:', error);
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  healthCheck,
  healthCheckDetailed,
};
