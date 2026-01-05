import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import {
  LogLevel,
  LogMetadata,
  LoggerConfig,
  TransportType,
  LogFormat,
  ConsoleTransportConfig,
  FileTransportConfig,
} from '@hookah-db/types';

/**
 * Logger class wrapping winston for structured logging
 * Provides singleton instance with multiple transports and correlation ID support
 */
export class Logger {
  private static instance: Logger;
  private winstonLogger: winston.Logger;
  private correlationId?: string;

  private constructor(config: LoggerConfig) {
    this.winstonLogger = winston.createLogger({
      level: config.level,
      handleExceptions: config.handleExceptions ?? false,
      handleRejections: config.handleRejections ?? false,
      exitOnError: config.exitOnError ?? false,
      defaultMeta: {
        service: config.service || 'hookah-db',
        environment: config.environment || process.env.NODE_ENV || 'development',
        ...config.defaultMeta,
      },
      transports: this.createTransports(config),
      silent: config.silent ?? false,
    });

    // Handle logger errors gracefully
    this.winstonLogger.on('error', (error) => {
      console.error('Logger error:', error);
    });
  }

  /**
   * Get or create the singleton logger instance
   * @param config Logger configuration (only used on first call)
   * @returns Logger instance
   */
  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        throw new Error('Logger must be initialized with configuration on first use');
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Create winston transports based on configuration
   * @param config Logger configuration
   * @returns Array of winston transports
   */
  private createTransports(config: LoggerConfig): winston.transport[] {
    const transports: winston.transport[] = [];

    for (const transportConfig of config.transports) {
      if (!transportConfig.enabled && transportConfig.enabled !== undefined) {
        continue;
      }

      // Check transport type using string comparison
      const transportType = transportConfig.type as string;

      if (transportType === TransportType.COMBINED) {
        // Add both console and file transports
        transports.push(this.createConsoleTransport(transportConfig as ConsoleTransportConfig));
        transports.push(this.createFileTransport(transportConfig as FileTransportConfig));
      } else if (transportType === TransportType.CONSOLE) {
        transports.push(this.createConsoleTransport(transportConfig as ConsoleTransportConfig));
      } else if (transportType === TransportType.FILE) {
        transports.push(this.createFileTransport(transportConfig as FileTransportConfig));
      }
    }

    return transports;
  }

  /**
   * Create console transport with formatting
   * @param config Console transport configuration
   * @returns Console transport
   */
  private createConsoleTransport(config: ConsoleTransportConfig): winston.transports.ConsoleTransportInstance {
    const format = this.createFormat(config.format || LogFormat.PRETTY, config.colorize ?? true);

    return new winston.transports.Console({
      level: config.level,
      format,
      stderrLevels: config.stderrLevels,
    });
  }

  /**
   * Create file transport with daily rotation
   * @param config File transport configuration
   * @returns File transport
   */
  private createFileTransport(config: FileTransportConfig): DailyRotateFile {
    const format = this.createFormat(config.format || LogFormat.JSON, false);

    // Ensure log directory exists
    const fs = require('fs');
    if (config.createDir !== false && !fs.existsSync(config.dirname)) {
      fs.mkdirSync(config.dirname, { recursive: true });
    }

    return new DailyRotateFile({
      level: config.level,
      filename: config.filename,
      dirname: config.dirname,
      datePattern: config.datePattern || 'YYYY-MM-DD',
      maxSize: config.maxSize || '20m',
      maxFiles: config.maxFiles || '14d',
      zippedArchive: config.zippedArchive ?? true,
      format,
    });
  }

  /**
   * Create winston format based on log format type
   * @param formatType Log format type
   * @param colorize Whether to colorize output
   * @returns Winston format
   */
  private createFormat(formatType: LogFormat, colorize: boolean): winston.Logform.Format {
    const timestampFormat = winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    });

    switch (formatType) {
      case LogFormat.JSON:
        return winston.format.combine(
          timestampFormat,
          winston.format.errors({ stack: true }),
          winston.format.json()
        );

      case LogFormat.SIMPLE:
        return winston.format.combine(
          timestampFormat,
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        );

      case LogFormat.PRETTY:
      default:
        return winston.format.combine(
          timestampFormat,
          winston.format.errors({ stack: true }),
          winston.format.colorize({ all: colorize }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null,2)}` : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        );
    }
  }

  /**
   * Set correlation ID for request tracing
   * @param correlationId Correlation ID to set
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   * @returns Current correlation ID or undefined
   */
  public getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  /**
   * Clear correlation ID
   */
  public clearCorrelationId(): void {
    this.correlationId = undefined;
  }

  /**
   * Add metadata to log entries
   * @param metadata Metadata to add
   */
  public addMetadata(metadata: Record<string, any>): void {
    this.winstonLogger.defaultMeta = {
      ...this.winstonLogger.defaultMeta,
      ...metadata,
    };
  }

  /**
   * Log error message
   * @param message Error message
   * @param metadata Additional metadata
   */
  public error(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.error(message, meta);
  }

  /**
   * Log warning message
   * @param message Warning message
   * @param metadata Additional metadata
   */
  public warn(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.warn(message, meta);
  }

  /**
   * Log info message
   * @param message Info message
   * @param metadata Additional metadata
   */
  public info(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.info(message, meta);
  }

  /**
   * Log HTTP request/response
   * @param message HTTP message
   * @param metadata HTTP metadata
   */
  public http(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.http(message, meta);
  }

  /**
   * Log verbose message
   * @param message Verbose message
   * @param metadata Additional metadata
   */
  public verbose(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.verbose(message, meta);
  }

  /**
   * Log debug message
   * @param message Debug message
   * @param metadata Additional metadata
   */
  public debug(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.debug(message, meta);
  }

  /**
   * Log silly message (most detailed)
   * @param message Silly message
   * @param metadata Additional metadata
   */
  public silly(message: string, metadata?: LogMetadata): void {
    const meta = this.buildMetadata(metadata);
    this.winstonLogger.silly(message, meta);
  }

  /**
   * Log error object with stack trace
   * @param error Error object
   * @param message Optional message
   * @param metadata Additional metadata
   */
  public logError(error: Error, message?: string, metadata?: LogMetadata): void {
    const errorMeta: Record<string, any> = {
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
    };

    // Merge with provided metadata, ensuring timestamp is set
    const mergedMeta: LogMetadata = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message: message || error.message,
      ...metadata,
      ...errorMeta,
    };

    this.winstonLogger.error(message || error.message, mergedMeta);
  }

  /**
   * Build metadata with correlation ID
   * @param metadata Metadata to build
   * @returns Complete metadata object
   */
  private buildMetadata(metadata?: LogMetadata): Record<string, any> {
    const base: Record<string, any> = {};

    if (this.correlationId) {
      base.correlationId = this.correlationId;
    }

    return {
      ...base,
      ...metadata,
    };
  }

  /**
   * Get underlying winston logger
   * @returns Winston logger instance
   */
  public getWinstonLogger(): winston.Logger {
    return this.winstonLogger;
  }

  /**
   * Set log level dynamically
   * @param level Log level to set
   */
  public setLevel(level: LogLevel): void {
    this.winstonLogger.level = level;
  }

  /**
   * Get current log level
   * @returns Current log level
   */
  public getLevel(): string {
    return this.winstonLogger.level;
  }

  /**
   * Close logger and flush all transports
   * @returns Promise that resolves when logger is closed
   */
  public async close(): Promise<void> {
    // Close all transports
    const transports = this.winstonLogger.transports;
    await Promise.all(
      transports.map(
        (transport) =>
          new Promise<void>((resolve) => {
            if ('close' in transport && typeof transport.close === 'function') {
              transport.close();
            }
            resolve();
          })
      )
    );
  }

  /**
   * Create a child logger with additional default metadata
   * @param metadata Additional default metadata for child logger
   * @returns Child logger instance
   */
  public child(metadata: Record<string, any>): Logger {
    const childLogger = Object.create(Logger.prototype);
    childLogger.winstonLogger = this.winstonLogger.child(metadata);
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }
}
