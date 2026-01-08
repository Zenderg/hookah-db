import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Rate limiting middleware to protect against API abuse.
 *
 * Configuration via environment variables:
 * - RATE_LIMIT_WINDOW: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX: Maximum requests per window (default: 100)
 *
 * Rate limiting is applied per client IP address.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import rateLimitMiddleware from './middleware/rate-limit-middleware';
 *
 * const app = express();
 * app.use(rateLimitMiddleware);
 * ```
 */
export const rateLimitMiddleware = rateLimit({
  /**
   * Time window in milliseconds for rate limiting.
   * Defaults to 60000ms (1 minute) if RATE_LIMIT_WINDOW is not set.
   */
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),

  /**
   * Maximum number of requests allowed per window.
   * Defaults to 100 requests if RATE_LIMIT_MAX is not set.
   */
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  /**
   * Message to send when rate limit is exceeded.
   * Returns a JSON error response with 429 status code.
   */
  message: {
    error: 'Too many requests, please try again later',
  },

  /**
   * Standard headers for rate limit information.
   * When true, returns rate limit info in `RateLimit-*` headers:
   * - RateLimit-Limit: Maximum requests per window
   * - RateLimit-Remaining: Remaining requests in current window
   * - RateLimit-Reset: Time when limit will reset (Unix timestamp)
   */
  standardHeaders: true,

  /**
   * Legacy headers for rate limit information.
   * When false, disables the `X-RateLimit-*` headers in favor of `RateLimit-*` headers.
   */
  legacyHeaders: false,

  /**
   * Skip rate limiting for successful requests (status < 400).
   * This is set to false to rate limit all requests regardless of status.
   */
  skipSuccessfulRequests: false,

  /**
   * Skip rate limiting for failed requests (status >= 400).
   * This is set to false to rate limit all requests regardless of status.
   */
  skipFailedRequests: false,

  /**
   * Function to generate a unique key for each client.
   * Uses the ipKeyGenerator helper to properly handle both IPv4 and IPv6 addresses.
   *
   * @param req - Express request object
   * @returns Unique identifier for the client
   */
  keyGenerator: (req: Request): string => {
    const ip = req.ip || 'unknown';
    return ipKeyGenerator(ip);
  },

  /**
   * Custom handler for rate limit exceeded.
   * Ensures proper JSON response with correct Content-Type header.
   *
   * @param _req - Express request object (unused)
   * @param res - Express response object
   * @param _next - Express next function (unused)
   * @param _options - Rate limit options (unused)
   */
  handler: (_req, res, _next, _options) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
    });
  },
});

export default rateLimitMiddleware;
