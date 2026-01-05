/**
 * Utility functions for hookah-db
 * This package provides shared utility functions and services
 */

// Export Logger class
export { Logger } from './logger';

// Export LoggerFactory for creating configured logger instances
export { LoggerFactory } from './logger-factory';

// Re-export types from @hookah-db/types for convenience
export type {
  LogLevel,
  LogLevelType,
  LogMetadata,
  RequestLogMetadata,
  ResponseLogMetadata,
  ErrorLogMetadata,
  SchedulerLogMetadata,
  CacheLogMetadata,
  ScraperLogMetadata,
  TransportType,
  LogFormat,
  TransportConfig,
  FileTransportConfig,
  ConsoleTransportConfig,
  LoggerConfig,
  LoggerPresets,
} from '@hookah-db/types';
