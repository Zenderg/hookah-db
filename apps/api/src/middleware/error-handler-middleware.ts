import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * Custom API error interface with additional properties.
 * 
 * Extends the standard Error interface with properties for HTTP status codes
 * and operational error flags.
 */
export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Error handling middleware to provide consistent error responses.
 * 
 * This middleware should be registered after all routes to catch any errors.
 * It provides consistent JSON error responses with appropriate HTTP status codes.
 * 
 * Features:
 * - Maps common error types to appropriate HTTP status codes
 * - Includes stack traces only in development environment
 * - Logs errors with request details
 * - Supports custom error status codes via ApiError interface
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import errorHandler from './middleware/error-handler-middleware';
 * 
 * const app = express();
 * 
 * // Define routes
 * app.get('/api/brands', (req, res) => {
 *   throw new Error('Something went wrong');
 * });
 * 
 * // Register error handler after all routes
 * app.use(errorHandler);
 * ```
 * 
 * @param err - Error object (can be standard Error or ApiError)
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (unused, but required for error handler signature)
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Determine the HTTP status code
  const statusCode = (err as ApiError).statusCode || 500;

  // Build the error response object
  const errorResponse: {
    error: string;
    message?: string;
    stack?: string;
  } = {
    error: err.name || 'Internal Server Error',
  };

  // Include error message if available
  if (err.message) {
    errorResponse.message = err.message;
  }

  // Include stack trace only in development environment
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Log the error with request details
  console.error(`[${new Date().toISOString()}] Error: ${req.method} ${req.url}`);
  console.error(`Status: ${statusCode}`);
  console.error(`Error: ${err.message}`);
  
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(`Stack: ${err.stack}`);
  }

  // Send the response with appropriate status code and JSON body
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
