/**
 * Unit tests for LoggerFactory class
 * 
 * Tests LoggerFactory functionality including:
 * - createLogger() with custom configuration
 * - createDevelopmentLogger() preset
 * - createProductionLogger() preset
 * - createTestLogger() preset
 * - createStagingLogger() preset
 * - createEnvironmentLogger() based on NODE_ENV
 * - createFromEnvironment() with environment variables
 * - getPresets() preset configurations
 * - createConsoleLogger() custom console logger
 * - createFileLogger() custom file logger
 * - createCombinedLogger() combined logger
 */

import { LoggerFactory } from '../../../src/utils';
import { Logger } from '../../../src/utils';
import { LogLevel, LogFormat, TransportType } from '../../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Logger.getInstance to track calls
const mockLoggerInstance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
  silly: jest.fn(),
};

// Mock Logger class
jest.mock('../../../src/utils', () => {
  const actualModule = jest.requireActual('../../../src/utils');
  return {
    ...actualModule,
    Logger: {
      getInstance: jest.fn(() => mockLoggerInstance),
    },
  };
});

// ============================================================================
// Test Suite
// ============================================================================

describe('LoggerFactory', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  // ============================================================================
  // createLogger() Tests
  // ============================================================================

  describe('createLogger()', () => {
    it('should create logger with custom configuration', () => {
      // Arrange
      const config = {
        level: LogLevel.INFO,
        service: 'test-service',
        environment: 'development' as any,
        transports: [],
        defaultMeta: {},
      };

      // Act
      const logger = LoggerFactory.createLogger(config);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(config);
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should pass configuration to Logger.getInstance', () => {
      // Arrange
      const config = {
        level: LogLevel.DEBUG,
        service: 'custom-service',
        environment: 'production' as any,
        transports: [],
        defaultMeta: {},
      };

      // Act
      LoggerFactory.createLogger(config);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(config);
    });
  });

  // ============================================================================
  // createDevelopmentLogger() Tests
  // ============================================================================

  describe('createDevelopmentLogger()', () => {
    it('should create development logger with default service name', () => {
      // Act
      const logger = LoggerFactory.createDevelopmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          service: 'hookah-db',
          environment: 'development',
          handleExceptions: true,
          handleRejections: true,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create development logger with custom service name', () => {
      // Act
      const logger = LoggerFactory.createDevelopmentLogger('custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should configure console transport with pretty format', () => {
      // Act
      LoggerFactory.createDevelopmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
              level: LogLevel.DEBUG,
              format: LogFormat.PRETTY,
              colorize: true,
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // createProductionLogger() Tests
  // ============================================================================

  describe('createProductionLogger()', () => {
    it('should create production logger with default service name', () => {
      // Act
      const logger = LoggerFactory.createProductionLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          service: 'hookah-db',
          environment: 'production',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create production logger with custom service name', () => {
      // Act
      const logger = LoggerFactory.createProductionLogger('custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create production logger with custom log directory', () => {
      // Act
      const logger = LoggerFactory.createProductionLogger('service', '/custom/logs');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.FILE,
              dirname: '/custom/logs',
            }),
          ]),
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should configure console transport with warn level and JSON format', () => {
      // Act
      LoggerFactory.createProductionLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
              level: LogLevel.WARN,
              format: LogFormat.JSON,
              colorize: false,
            }),
          ]),
        })
      );
    });

    it('should configure application file transport', () => {
      // Act
      LoggerFactory.createProductionLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.FILE,
              level: LogLevel.INFO,
              filename: 'application-%DATE%.log',
            }),
          ]),
        })
      );
    });

    it('should configure error file transport', () => {
      // Act
      LoggerFactory.createProductionLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.FILE,
              level: LogLevel.ERROR,
              filename: 'error-%DATE%.log',
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // createTestLogger() Tests
  // ============================================================================

  describe('createTestLogger()', () => {
    it('should create test logger with default service name', () => {
      // Act
      const logger = LoggerFactory.createTestLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.ERROR,
          service: 'hookah-db-test',
          environment: 'development',
          handleExceptions: false,
          handleRejections: false,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create test logger with custom service name', () => {
      // Act
      const logger = LoggerFactory.createTestLogger('custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should configure console transport with simple format', () => {
      // Act
      LoggerFactory.createTestLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
              level: LogLevel.ERROR,
              format: LogFormat.SIMPLE,
              colorize: false,
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // createStagingLogger() Tests
  // ============================================================================

  describe('createStagingLogger()', () => {
    it('should create staging logger with default service name', () => {
      // Act
      const logger = LoggerFactory.createStagingLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          service: 'hookah-db',
          environment: 'staging',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create staging logger with custom service name', () => {
      // Act
      const logger = LoggerFactory.createStagingLogger('custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create staging logger with custom log directory', () => {
      // Act
      const logger = LoggerFactory.createStagingLogger('service', '/custom/logs');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.FILE,
              dirname: '/custom/logs',
            }),
          ]),
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should configure console transport with pretty format', () => {
      // Act
      LoggerFactory.createStagingLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
              level: LogLevel.DEBUG,
              format: LogFormat.PRETTY,
              colorize: true,
            }),
          ]),
        })
      );
    });

    it('should configure file transport with 7 day retention', () => {
      // Act
      LoggerFactory.createStagingLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.FILE,
              maxFiles: 7,
              filename: 'staging-%DATE%.log',
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // createEnvironmentLogger() Tests
  // ============================================================================

  describe('createEnvironmentLogger()', () => {
    afterEach(() => {
      // Reset NODE_ENV after each test
      delete process.env.NODE_ENV;
    });

    it('should create development logger when NODE_ENV=development', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      const logger = LoggerFactory.createEnvironmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
          level: LogLevel.DEBUG,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create production logger when NODE_ENV=production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const logger = LoggerFactory.createEnvironmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
          level: LogLevel.INFO,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create test logger when NODE_ENV=test', () => {
      // Arrange
      process.env.NODE_ENV = 'test';

      // Act
      const logger = LoggerFactory.createEnvironmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'hookah-db-test',
          level: LogLevel.ERROR,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create staging logger when NODE_ENV=staging', () => {
      // Arrange
      process.env.NODE_ENV = 'staging';

      // Act
      const logger = LoggerFactory.createEnvironmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'staging',
          level: LogLevel.DEBUG,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should default to development logger when NODE_ENV not set', () => {
      // Act
      const logger = LoggerFactory.createEnvironmentLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
          level: LogLevel.DEBUG,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should pass custom service name to preset logger', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      LoggerFactory.createEnvironmentLogger('custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
    });
  });

  // ============================================================================
  // createFromEnvironment() Tests
  // ============================================================================

  describe('createFromEnvironment()', () => {
    afterEach(() => {
      // Reset environment variables after each test
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_DIR;
      delete process.env.SERVICE_NAME;
    });

    it('should read NODE_ENV environment variable', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const logger = LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should default to development when NODE_ENV not set', () => {
      // Act
      const logger = LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
          level: LogLevel.DEBUG,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should read LOG_LEVEL environment variable', () => {
      // Arrange
      process.env.LOG_LEVEL = 'WARN';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.WARN,
        })
      );
    });

    it('should default log level based on environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
        })
      );
    });

    it('should read LOG_DIR environment variable', () => {
      // Arrange
      process.env.LOG_DIR = '/custom/logs';
      process.env.NODE_ENV = 'production';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              dirname: '/custom/logs',
            }),
          ]),
        })
      );
    });

    it('should default log directory to ./logs', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              dirname: './logs',
            }),
          ]),
        })
      );
    });

    it('should read SERVICE_NAME environment variable', () => {
      // Arrange
      process.env.SERVICE_NAME = 'custom-service';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
    });

    it('should default service name to hookah-db', () => {
      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'hookah-db',
        })
      );
    });

    it('should configure production transports for production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      const callArgs = (Logger.getInstance as jest.Mock).mock.calls[0][0];
      expect(callArgs.transports).toHaveLength(3);
      expect(callArgs.transports[0].type).toBe(TransportType.CONSOLE);
      expect(callArgs.transports[1].type).toBe(TransportType.FILE);
      expect(callArgs.transports[2].type).toBe(TransportType.FILE);
    });

    it('should configure test transports for test environment', () => {
      // Arrange
      process.env.NODE_ENV = 'test';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      const callArgs = (Logger.getInstance as jest.Mock).mock.calls[0][0];
      expect(callArgs.transports).toHaveLength(1);
      expect(callArgs.transports[0].type).toBe(TransportType.CONSOLE);
    });

    it('should configure development transports for non-production environments', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      LoggerFactory.createFromEnvironment();

      // Assert
      const callArgs = (Logger.getInstance as jest.Mock).mock.calls[0][0];
      expect(callArgs.transports).toHaveLength(1);
      expect(callArgs.transports[0].type).toBe(TransportType.CONSOLE);
    });
  });

  // ============================================================================
  // getPresets() Tests
  // ============================================================================

  describe('getPresets()', () => {
    it('should return all preset configurations', () => {
      // Act
      const presets = LoggerFactory.getPresets();

      // Assert
      expect(presets).toHaveProperty('development');
      expect(presets).toHaveProperty('production');
      expect(presets).toHaveProperty('test');
    });

    it('should return development preset with correct configuration', () => {
      // Act
      const presets = LoggerFactory.getPresets();

      // Assert
      expect(presets.development).toEqual(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          service: 'hookah-db',
          environment: 'development',
        })
      );
    });

    it('should return production preset with correct configuration', () => {
      // Act
      const presets = LoggerFactory.getPresets();

      // Assert
      expect(presets.production).toEqual(
        expect.objectContaining({
          level: LogLevel.INFO,
          service: 'hookah-db',
          environment: 'production',
        })
      );
    });

    it('should return test preset with correct configuration', () => {
      // Act
      const presets = LoggerFactory.getPresets();

      // Assert
      expect(presets.test).toEqual(
        expect.objectContaining({
          level: LogLevel.ERROR,
          service: 'hookah-db-test',
          environment: 'development',
        })
      );
    });

    it('should include transports in presets', () => {
      // Act
      const presets = LoggerFactory.getPresets();

      // Assert
      expect(presets.development.transports).toBeDefined();
      expect(presets.production.transports).toBeDefined();
      expect(presets.test.transports).toBeDefined();
    });
  });

  // ============================================================================
  // createConsoleLogger() Tests
  // ============================================================================

  describe('createConsoleLogger()', () => {
    it('should create console logger with default parameters', () => {
      // Act
      const logger = LoggerFactory.createConsoleLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          format: LogFormat.PRETTY,
          colorize: true,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create console logger with custom log level', () => {
      // Act
      LoggerFactory.createConsoleLogger(LogLevel.DEBUG);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
        })
      );
    });

    it('should create console logger with custom format', () => {
      // Act
      LoggerFactory.createConsoleLogger(LogLevel.INFO, LogFormat.JSON);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          format: LogFormat.JSON,
        })
      );
    });

    it('should create console logger with colorize option', () => {
      // Act
      LoggerFactory.createConsoleLogger(LogLevel.INFO, LogFormat.PRETTY, false);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          colorize: false,
        })
      );
    });

    it('should create console logger with custom service name', () => {
      // Act
      LoggerFactory.createConsoleLogger(LogLevel.INFO, LogFormat.PRETTY, true, 'custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
    });

    it('should configure console transport', () => {
      // Act
      LoggerFactory.createConsoleLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // createFileLogger() Tests
  // ============================================================================

  describe('createFileLogger()', () => {
    it('should create file logger with default parameters', () => {
      // Act
      const logger = LoggerFactory.createFileLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          filename: 'application-%DATE%.log',
          dirname: './logs',
          format: LogFormat.JSON,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create file logger with custom log level', () => {
      // Act
      LoggerFactory.createFileLogger(LogLevel.DEBUG);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
        })
      );
    });

    it('should create file logger with custom filename', () => {
      // Act
      LoggerFactory.createFileLogger(LogLevel.INFO, 'custom-%DATE%.log');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'custom-%DATE%.log',
        })
      );
    });

    it('should create file logger with custom directory', () => {
      // Act
      LoggerFactory.createFileLogger(LogLevel.INFO, 'application-%DATE%.log', '/custom/logs');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          dirname: '/custom/logs',
        })
      );
    });

    it('should create file logger with custom format', () => {
      // Act
      LoggerFactory.createFileLogger(LogLevel.INFO, 'application-%DATE%.log', './logs', LogFormat.SIMPLE);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          format: LogFormat.SIMPLE,
        })
      );
    });

    it('should create file logger with custom service name', () => {
      // Act
      LoggerFactory.createFileLogger(LogLevel.INFO, 'application-%DATE%.log', './logs', LogFormat.JSON, 'custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
    });

    it('should configure file transport with correct defaults', () => {
      // Act
      LoggerFactory.createFileLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.FILE,
              datePattern: 'YYYY-MM-DD',
              maxSize: 20 * 1024 * 1024,
              maxFiles: 14,
              zippedArchive: true,
              createDir: true,
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // createCombinedLogger() Tests
  // ============================================================================

  describe('createCombinedLogger()', () => {
    it('should create combined logger with default parameters', () => {
      // Act
      const logger = LoggerFactory.createCombinedLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          filename: 'application-%DATE%.log',
          dirname: './logs',
          consoleFormat: LogFormat.PRETTY,
          fileFormat: LogFormat.JSON,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should create combined logger with custom log level', () => {
      // Act
      LoggerFactory.createCombinedLogger(LogLevel.DEBUG);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
        })
      );
    });

    it('should create combined logger with custom filename', () => {
      // Act
      LoggerFactory.createCombinedLogger(LogLevel.INFO, 'custom-%DATE%.log');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'custom-%DATE%.log',
        })
      );
    });

    it('should create combined logger with custom directory', () => {
      // Act
      LoggerFactory.createCombinedLogger(LogLevel.INFO, 'application-%DATE%.log', '/custom/logs');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          dirname: '/custom/logs',
        })
      );
    });

    it('should create combined logger with custom console format', () => {
      // Act
      LoggerFactory.createCombinedLogger(LogLevel.INFO, 'application-%DATE%.log', './logs', LogFormat.SIMPLE);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          consoleFormat: LogFormat.SIMPLE,
        })
      );
    });

    it('should create combined logger with custom file format', () => {
      // Act
      LoggerFactory.createCombinedLogger(LogLevel.INFO, 'application-%DATE%.log', './logs', LogFormat.PRETTY, LogFormat.SIMPLE);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          fileFormat: LogFormat.SIMPLE,
        })
      );
    });

    it('should create combined logger with custom service name', () => {
      // Act
      LoggerFactory.createCombinedLogger(LogLevel.INFO, 'application-%DATE%.log', './logs', LogFormat.PRETTY, LogFormat.JSON, 'custom-service');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'custom-service',
        })
      );
    });

    it('should configure both console and file transports', () => {
      // Act
      LoggerFactory.createCombinedLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
            }),
            expect.objectContaining({
              type: TransportType.FILE,
            }),
          ]),
        })
      );
    });

    it('should configure console transport with colorize enabled', () => {
      // Act
      LoggerFactory.createCombinedLogger();

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              type: TransportType.CONSOLE,
              colorize: true,
            }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    afterEach(() => {
      // Reset environment variables after each test
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_DIR;
      delete process.env.SERVICE_NAME;
    });

    it('should handle empty service name', () => {
      // Act
      const logger = LoggerFactory.createDevelopmentLogger('');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: '',
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should handle very long service name', () => {
      // Arrange
      const longName = 'a'.repeat(1000);

      // Act
      const logger = LoggerFactory.createDevelopmentLogger(longName);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: longName,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should handle empty log directory', () => {
      // Act
      const logger = LoggerFactory.createProductionLogger('service', '');

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              dirname: '',
            }),
          ]),
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should handle very long log directory path', () => {
      // Arrange
      const longPath = '/a'.repeat(100);

      // Act
      const logger = LoggerFactory.createProductionLogger('service', longPath);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([
            expect.objectContaining({
              dirname: longPath,
            }),
          ]),
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should handle special characters in service name', () => {
      // Arrange
      const specialName = 'service with spaces & special!@#$%';

      // Act
      const logger = LoggerFactory.createDevelopmentLogger(specialName);

      // Assert
      expect(Logger.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          service: specialName,
        })
      );
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should handle invalid log level gracefully', () => {
      // Arrange
      process.env.LOG_LEVEL = 'INVALID_LEVEL' as any;

      // Act
      const logger = LoggerFactory.createFromEnvironment();

      // Assert
      expect(logger).toBe(mockLoggerInstance);
    });
  });
});
