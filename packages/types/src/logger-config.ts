import { LogLevel } from './log-levels';

/**
 * Transport type enumeration
 * Defines available log transport options
 */
export enum TransportType {
  /** Console transport for development */
  CONSOLE = 'console',
  /** File transport for persistent logging */
  FILE = 'file',
  /** Combined console and file transport */
  COMBINED = 'combined',
}

/**
 * Log format enumeration
 * Defines available log output formats
 */
export enum LogFormat {
  /** JSON format for structured logging */
  JSON = 'json',
  /** Human-readable text format */
  SIMPLE = 'simple',
  /** Detailed format with colors and timestamps */
  PRETTY = 'pretty',
}

/**
 * Base transport configuration interface
 * Common configuration for all transport types
 */
export interface TransportConfig {
  /** Transport type */
  type: TransportType;
  /** Minimum log level to handle */
  level?: LogLevel;
  /** Whether this transport is enabled */
  enabled?: boolean;
  /** Log format */
  format?: LogFormat;
  /** Whether to include timestamps */
  timestamp?: boolean;
  /** Whether to colorize output (console only) */
  colorize?: boolean;
}

/**
 * File transport configuration
 * Configuration for file-based logging
 */
export interface FileTransportConfig extends TransportConfig {
  /** Must be 'file' for this configuration */
  type: TransportType.FILE;
  /** Directory path for log files */
  dirname: string;
  /** Base filename for log files */
  filename: string;
  /** Maximum file size in bytes before rotation */
  maxSize?: number;
  /** Maximum number of log files to keep */
  maxFiles?: number;
  /** Date pattern for log rotation (e.g., 'YYYY-MM-DD') */
  datePattern?: string;
  /** Whether to prepend date to filename */
  prependDate?: boolean;
  /** zlib compression level for log files */
  zippedArchive?: boolean;
  /** Whether to create directory if it doesn't exist */
  createDir?: boolean;
}

/**
 * Console transport configuration
 * Configuration for console-based logging
 */
export interface ConsoleTransportConfig extends TransportConfig {
  /** Must be 'console' for this configuration */
  type: TransportType.CONSOLE;
  /** Whether to use stderr for error logs */
  stderrLevels?: LogLevel[];
  /** Whether to use stderr for warn logs */
  warnToStderr?: boolean;
}

/**
 * Logger configuration interface
 * Main configuration for initializing the logger
 */
export interface LoggerConfig {
  /** Default log level for the logger */
  level: LogLevel;
  /** Whether to handle exceptions */
  handleExceptions?: boolean;
  /** Whether to handle unhandled promise rejections */
  handleRejections?: boolean;
  /** Whether to exit on error after logging */
  exitOnError?: boolean;
  /** Application or service name */
  service?: string;
  /** Environment (development, staging, production) */
  environment?: 'development' | 'staging' | 'production';
  /** Array of transport configurations */
  transports: (ConsoleTransportConfig | FileTransportConfig)[];
  /** Whether to suppress console output in production */
  silent?: boolean;
  /** Default metadata to include in all logs */
  defaultMeta?: Record<string, any>;
  /** Maximum depth for object serialization */
  maxDepth?: number;
  /** Maximum length for string values */
  maxLength?: number;
  /** Whether to pretty print objects */
  prettyPrint?: boolean;
}

/**
 * Predefined logger configurations
 * Common configurations for different environments
 */
export interface LoggerPresets {
  /** Development configuration with console logging */
  development: LoggerConfig;
  /** Production configuration with file logging */
  production: LoggerConfig;
  /** Test configuration with minimal logging */
  test: LoggerConfig;
}
