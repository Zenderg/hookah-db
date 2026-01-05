import { Logger } from './logger';
import {
  LogLevel,
  LoggerConfig,
  TransportType,
  LogFormat,
  LoggerPresets,
} from '@hookah-db/types';

/**
 * Logger factory for creating configured logger instances
 * Provides preset configurations and custom logger creation
 */
export class LoggerFactory {
  /**
   * Create a logger with custom configuration
   * @param config Logger configuration
   * @returns Configured logger instance
   */
  public static createLogger(config: LoggerConfig): Logger {
    return Logger.getInstance(config);
  }

  /**
   * Create a development logger preset
   * Console transport with pretty print and debug level
   * @param serviceName Optional service name
   * @returns Development logger instance
   */
  public static createDevelopmentLogger(serviceName?: string): Logger {
    const config: LoggerConfig = {
      level: LogLevel.DEBUG,
      service: serviceName || 'hookah-db',
      environment: 'development',
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      transports: [
        {
          type: TransportType.CONSOLE,
          level: LogLevel.DEBUG,
          format: LogFormat.PRETTY,
          colorize: true,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }

  /**
   * Create a production logger preset
   * File transport with JSON format and info level
   * @param serviceName Optional service name
   * @param logDir Optional log directory path
   * @returns Production logger instance
   */
  public static createProductionLogger(serviceName?: string, logDir?: string): Logger {
    const config: LoggerConfig = {
      level: LogLevel.INFO,
      service: serviceName || 'hookah-db',
      environment: 'production',
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      transports: [
        {
          type: TransportType.CONSOLE,
          level: LogLevel.WARN,
          format: LogFormat.JSON,
          colorize: false,
          enabled: true,
        },
        {
          type: TransportType.FILE,
          level: LogLevel.INFO,
          format: LogFormat.JSON,
          dirname: logDir || './logs',
          filename: 'application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: 20 * 1024 * 1024, // 20MB
          maxFiles: 14,
          zippedArchive: true,
          createDir: true,
          enabled: true,
        },
        {
          type: TransportType.FILE,
          level: LogLevel.ERROR,
          format: LogFormat.JSON,
          dirname: logDir || './logs',
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: 20 * 1024 * 1024, // 20MB
          maxFiles: 30,
          zippedArchive: true,
          createDir: true,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }

  /**
   * Create a test logger preset
   * Console transport with simple format and error level
   * @param serviceName Optional service name
   * @returns Test logger instance
   */
  public static createTestLogger(serviceName?: string): Logger {
    const config: LoggerConfig = {
      level: LogLevel.ERROR,
      service: serviceName || 'hookah-db-test',
      environment: 'development', // Use 'development' for test environment
      handleExceptions: false,
      handleRejections: false,
      exitOnError: false,
      transports: [
        {
          type: TransportType.CONSOLE,
          level: LogLevel.ERROR,
          format: LogFormat.SIMPLE,
          colorize: false,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }

  /**
   * Create a staging logger preset
   * Combined console and file transport with debug level
   * @param serviceName Optional service name
   * @param logDir Optional log directory path
   * @returns Staging logger instance
   */
  public static createStagingLogger(serviceName?: string, logDir?: string): Logger {
    const config: LoggerConfig = {
      level: LogLevel.DEBUG,
      service: serviceName || 'hookah-db',
      environment: 'staging',
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      transports: [
        {
          type: TransportType.CONSOLE,
          level: LogLevel.DEBUG,
          format: LogFormat.PRETTY,
          colorize: true,
          enabled: true,
        },
        {
          type: TransportType.FILE,
          level: LogLevel.DEBUG,
          format: LogFormat.JSON,
          dirname: logDir || './logs',
          filename: 'staging-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: 20 * 1024 * 1024, // 20MB
          maxFiles: 7,
          zippedArchive: true,
          createDir: true,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }

  /**
   * Create a logger based on environment variable
   * Automatically selects preset based on NODE_ENV
   * @param serviceName Optional service name
   * @param logDir Optional log directory path
   * @returns Logger instance configured for current environment
   */
  public static createEnvironmentLogger(serviceName?: string, logDir?: string): Logger {
    const environment = process.env.NODE_ENV || 'development';

    switch (environment) {
      case 'production':
        return LoggerFactory.createProductionLogger(serviceName, logDir);
      case 'test':
        return LoggerFactory.createTestLogger(serviceName);
      case 'staging':
        return LoggerFactory.createStagingLogger(serviceName, logDir);
      case 'development':
      default:
        return LoggerFactory.createDevelopmentLogger(serviceName);
    }
  }

  /**
   * Create a logger with environment variable configuration
   * Reads configuration from environment variables
   * @returns Logger instance configured from environment variables
   */
  public static createFromEnvironment(): Logger {
    const nodeEnv = process.env.NODE_ENV || 'development';
    // Map 'test' to 'development' for environment field
    const environment = (nodeEnv === 'test' ? 'development' : nodeEnv) as 'development' | 'staging' | 'production';
    const logLevel = (process.env.LOG_LEVEL as LogLevel) || (environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG);
    const logDir = process.env.LOG_DIR || './logs';
    const serviceName = process.env.SERVICE_NAME || 'hookah-db';

    const config: LoggerConfig = {
      level: logLevel,
      service: serviceName,
      environment,
      handleExceptions: nodeEnv !== 'test',
      handleRejections: nodeEnv !== 'test',
      exitOnError: false,
      transports: [],
      defaultMeta: {},
    };

    // Configure transports based on environment
    if (environment === 'production') {
      config.transports.push({
        type: TransportType.CONSOLE,
        level: LogLevel.WARN,
        format: LogFormat.JSON,
        colorize: false,
        enabled: true,
      });
      config.transports.push({
        type: TransportType.FILE,
        level: LogLevel.INFO,
        format: LogFormat.JSON,
        dirname: logDir,
        filename: 'application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: 20 * 1024 * 1024, // 20MB
        maxFiles: 14,
        zippedArchive: true,
        createDir: true,
        enabled: true,
      });
      config.transports.push({
        type: TransportType.FILE,
        level: LogLevel.ERROR,
        format: LogFormat.JSON,
        dirname: logDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: 20 * 1024 * 1024, // 20MB
        maxFiles: 30,
        zippedArchive: true,
        createDir: true,
        enabled: true,
      });
    } else if (nodeEnv === 'test') {
      config.transports.push({
        type: TransportType.CONSOLE,
        level: LogLevel.ERROR,
        format: LogFormat.SIMPLE,
        colorize: false,
        enabled: true,
      });
    } else {
      // Development or staging
      config.transports.push({
        type: TransportType.CONSOLE,
        level: logLevel,
        format: LogFormat.PRETTY,
        colorize: true,
        enabled: true,
      });
    }

    return Logger.getInstance(config);
  }

  /**
   * Get all preset configurations
   * @returns Object containing all preset configurations
   */
  public static getPresets(): LoggerPresets {
    return {
      development: {
        level: LogLevel.DEBUG,
        service: 'hookah-db',
        environment: 'development',
        handleExceptions: true,
        handleRejections: true,
        exitOnError: false,
        transports: [
          {
            type: TransportType.CONSOLE,
            level: LogLevel.DEBUG,
            format: LogFormat.PRETTY,
            colorize: true,
            enabled: true,
          },
        ],
        defaultMeta: {},
      },
      production: {
        level: LogLevel.INFO,
        service: 'hookah-db',
        environment: 'production',
        handleExceptions: true,
        handleRejections: true,
        exitOnError: false,
        transports: [
          {
            type: TransportType.CONSOLE,
            level: LogLevel.WARN,
            format: LogFormat.JSON,
            colorize: false,
            enabled: true,
          },
          {
            type: TransportType.FILE,
            level: LogLevel.INFO,
            format: LogFormat.JSON,
            dirname: './logs',
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: 20 * 1024 * 1024, // 20MB
            maxFiles: 14,
            zippedArchive: true,
            createDir: true,
            enabled: true,
          },
          {
            type: TransportType.FILE,
            level: LogLevel.ERROR,
            format: LogFormat.JSON,
            dirname: './logs',
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: 20 * 1024 * 1024, // 20MB
            maxFiles: 30,
            zippedArchive: true,
            createDir: true,
            enabled: true,
          },
        ],
        defaultMeta: {},
      },
      test: {
        level: LogLevel.ERROR,
        service: 'hookah-db-test',
        environment: 'development', // Use 'development' for test environment
        handleExceptions: false,
        handleRejections: false,
        exitOnError: false,
        transports: [
          {
            type: TransportType.CONSOLE,
            level: LogLevel.ERROR,
            format: LogFormat.SIMPLE,
            colorize: false,
            enabled: true,
          },
        ],
        defaultMeta: {},
      },
    };
  }

  /**
   * Create a custom console-only logger
   * @param level Log level
   * @param format Log format
   * @param colorize Whether to colorize output
   * @param serviceName Optional service name
   * @returns Console-only logger instance
   */
  public static createConsoleLogger(
    level: LogLevel = LogLevel.INFO,
    format: LogFormat = LogFormat.PRETTY,
    colorize: boolean = true,
    serviceName?: string
  ): Logger {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const environment = (nodeEnv === 'test' ? 'development' : nodeEnv) as 'development' | 'staging' | 'production';

    const config: LoggerConfig = {
      level,
      service: serviceName || 'hookah-db',
      environment,
      handleExceptions: false,
      handleRejections: false,
      exitOnError: false,
      transports: [
        {
          type: TransportType.CONSOLE,
          level,
          format,
          colorize,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }

  /**
   * Create a custom file-only logger
   * @param level Log level
   * @param filename Base filename for log files
   * @param dirname Directory for log files
   * @param format Log format
   * @param serviceName Optional service name
   * @returns File-only logger instance
   */
  public static createFileLogger(
    level: LogLevel = LogLevel.INFO,
    filename: string = 'application-%DATE%.log',
    dirname: string = './logs',
    format: LogFormat = LogFormat.JSON,
    serviceName?: string
  ): Logger {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const environment = (nodeEnv === 'test' ? 'development' : nodeEnv) as 'development' | 'staging' | 'production';

    const config: LoggerConfig = {
      level,
      service: serviceName || 'hookah-db',
      environment,
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      transports: [
        {
          type: TransportType.FILE,
          level,
          format,
          dirname,
          filename,
          datePattern: 'YYYY-MM-DD',
          maxSize: 20 * 1024 * 1024, // 20MB
          maxFiles: 14,
          zippedArchive: true,
          createDir: true,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }

  /**
   * Create a combined console and file logger
   * @param level Log level
   * @param filename Base filename for log files
   * @param dirname Directory for log files
   * @param consoleFormat Console log format
   * @param fileFormat File log format
   * @param serviceName Optional service name
   * @returns Combined logger instance
   */
  public static createCombinedLogger(
    level: LogLevel = LogLevel.INFO,
    filename: string = 'application-%DATE%.log',
    dirname: string = './logs',
    consoleFormat: LogFormat = LogFormat.PRETTY,
    fileFormat: LogFormat = LogFormat.JSON,
    serviceName?: string
  ): Logger {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const environment = (nodeEnv === 'test' ? 'development' : nodeEnv) as 'development' | 'staging' | 'production';

    const config: LoggerConfig = {
      level,
      service: serviceName || 'hookah-db',
      environment,
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      transports: [
        {
          type: TransportType.CONSOLE,
          level,
          format: consoleFormat,
          colorize: true,
          enabled: true,
        },
        {
          type: TransportType.FILE,
          level,
          format: fileFormat,
          dirname,
          filename,
          datePattern: 'YYYY-MM-DD',
          maxSize: 20 * 1024 * 1024, // 20MB
          maxFiles: 14,
          zippedArchive: true,
          createDir: true,
          enabled: true,
        },
      ],
      defaultMeta: {},
    };

    return Logger.getInstance(config);
  }
}
