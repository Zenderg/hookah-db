import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Validate and parse environment variables
 * This will throw an error at startup if any required variables are missing or invalid
 */
export const env = createEnv({
  server: {
    // Database Configuration
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid database connection string'),

    // API Configuration
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_HOST: z.string().default('0.0.0.0'),

    // Parser Configuration
    PARSER_BASE_URL: z.string().url('PARSER_BASE_URL must be a valid URL').default('https://htreviews.org'),
    PARSER_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(3),
    PARSER_SCROLL_DELAY_MS: z.coerce.number().int().nonnegative().default(1000),
    PARSER_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
    PARSER_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

    // Logging Configuration
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  },
  runtimeEnv: process.env,
});

// ============================================
// Convenience Functions
// ============================================

/**
 * Check if running in development environment
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in production environment
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in test environment
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Database configuration object
 */
export const dbConfig = {
  url: env.DATABASE_URL,
} as const;

/**
 * API configuration object
 */
export const apiConfig = {
  port: env.API_PORT,
  host: env.API_HOST,
} as const;

/**
 * Parser configuration object
 */
export const parserConfig = {
  baseUrl: env.PARSER_BASE_URL,
  concurrentRequests: env.PARSER_CONCURRENT_REQUESTS,
  scrollDelayMs: env.PARSER_SCROLL_DELAY_MS,
  maxRetries: env.PARSER_MAX_RETRIES,
  timeoutMs: env.PARSER_TIMEOUT_MS,
} as const;

/**
 * Logging configuration object
 */
export const loggingConfig = {
  level: env.LOG_LEVEL,
  format: env.LOG_FORMAT,
} as const;

/**
 * Rate limiting configuration object
 */
export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
} as const;

// ============================================
// Type Exports
// ============================================

/**
 * Type of the validated environment object
 */
export type Env = typeof env;

/**
 * Type of database configuration
 */
export type DbConfig = typeof dbConfig;

/**
 * Type of API configuration
 */
export type ApiConfig = typeof apiConfig;

/**
 * Type of parser configuration
 */
export type ParserConfig = typeof parserConfig;

/**
 * Type of logging configuration
 */
export type LoggingConfig = typeof loggingConfig;

/**
 * Type of rate limiting configuration
 */
export type RateLimitConfig = typeof rateLimitConfig;
