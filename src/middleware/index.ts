/**
 * Middleware module exports
 * This file exports all middleware for API
 * 
 * IMPORTANT: We import all middleware modules here to ensure they are compiled
 * into the dist folder. This prevents TypeScript's tree-shaking from
 * optimizing away unused modules, which would cause "MODULE_NOT_FOUND" errors
 * at runtime when importing from this index file.
 */
export * from './auth-middleware';
export * from './rate-limit-middleware';
export * from './error-handler-middleware';
export * from './request-logging-middleware';
export * from './response-logging-middleware';
export * from './logging-middleware';
