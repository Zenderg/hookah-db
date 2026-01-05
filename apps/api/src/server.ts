import express, { Express, Request, Response, NextFunction } from 'express';
import { brandRoutes, flavorRoutes } from './routes';
import {
  healthCheck,
  healthCheckDetailed,
} from './controllers';
import { errorHandler } from './middleware';

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

// Health check routes (no authentication required)
app.get('/health', healthCheck);
app.get('/health/detailed', healthCheckDetailed);

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
  });
}

// Export app for testing
export default app;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}
