/**
 * Unit tests for Logger class
 * 
 * Tests Logger functionality including:
 * - Singleton pattern and initialization
 * - All log levels (error, warn, info, http, verbose, debug, silly)
 * - Metadata enrichment
 * - Correlation ID tracking
 * - Child logger creation
 * - Log level filtering
 * - Transport configuration
 * - Error handling in logger
 */

import { Logger } from '../../../src/utils';
import { LoggerConfig, LogLevel, LogFormat, TransportType } from '../../../src/types';
import winston from 'winston';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock winston to avoid actual file I/O
jest.mock('winston', () => {
  const originalModule = jest.requireActual('winston');
  return {
    ...originalModule,
    createLogger: jest.fn(),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
    },
  };
});

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockLoggerConfig: LoggerConfig = {
  level: LogLevel.INFO,
  service: 'test-service',
  environment: 'development',
  handleExceptions: false,
  handleRejections: false,
  exitOnError: false,
  transports: [
    {
      type: TransportType.CONSOLE,
      level: LogLevel.INFO,
      format: LogFormat.JSON,
      colorize: false,
      enabled: true,
    },
  ],
  defaultMeta: {},
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Logger', () => {
  let mockWinstonLogger: any;
  let logger: Logger;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock winston logger
    mockWinstonLogger = {
      level: LogLevel.INFO,
      defaultMeta: {},
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      verbose: jest.fn(),
      debug: jest.fn(),
      silly: jest.fn(),
      child: jest.fn(() => mockWinstonLogger),
      on: jest.fn(),
    };

    // Mock winston.createLogger to return our mock
    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);

    // Reset singleton instance
    (Logger as any).instance = undefined;
  });

  afterEach(() => {
    // Reset singleton instance after each test
    (Logger as any).instance = undefined;
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should create logger with configuration', () => {
      // Act
      logger = Logger.getInstance(mockLoggerConfig);

      // Assert
      expect(logger).toBeInstanceOf(Logger);
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          defaultMeta: expect.objectContaining({
            service: 'test-service',
            environment: 'development',
          }),
        })
      );
    });

    it('should use default service name when not provided', () => {
      // Arrange
      const config = { ...mockLoggerConfig, service: undefined };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: expect.objectContaining({
            service: 'hookah-db',
          }),
        })
      );
    });

    it('should use NODE_ENV when environment not provided', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const config = { ...mockLoggerConfig, environment: undefined };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: expect.objectContaining({
            environment: 'production',
          }),
        })
      );

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should merge defaultMeta with service and environment', () => {
      // Arrange
      const config = {
        ...mockLoggerConfig,
        defaultMeta: { customField: 'customValue' },
      };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: expect.objectContaining({
            service: 'test-service',
            environment: 'development',
            customField: 'customValue',
          }),
        })
      );
    });

    it('should set handleExceptions when configured', () => {
      // Arrange
      const config = { ...mockLoggerConfig, handleExceptions: true };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          handleExceptions: true,
        })
      );
    });

    it('should set handleRejections when configured', () => {
      // Arrange
      const config = { ...mockLoggerConfig, handleRejections: true };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          handleRejections: true,
        })
      );
    });

    it('should set exitOnError when configured', () => {
      // Arrange
      const config = { ...mockLoggerConfig, exitOnError: true };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          exitOnError: true,
        })
      );
    });

    it('should set silent when configured', () => {
      // Arrange
      const config = { ...mockLoggerConfig, silent: true };

      // Act
      logger = Logger.getInstance(config);

      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true,
        })
      );
    });

    it('should register error handler on winston logger', () => {
      // Act
      logger = Logger.getInstance(mockLoggerConfig);

      // Assert
      expect(mockWinstonLogger.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should throw error when initialized without config', () => {
      // Act & Assert
      expect(() => Logger.getInstance()).toThrow(
        'Logger must be initialized with configuration on first use'
      );
    });
  });

  // ============================================================================
  // Singleton Pattern Tests
  // ============================================================================

  describe('Singleton Pattern', () => {
    it('should return same instance on subsequent calls', () => {
      // Act
      const logger1 = Logger.getInstance(mockLoggerConfig);
      const logger2 = Logger.getInstance();

      // Assert
      expect(logger1).toBe(logger2);
    });

    it('should not create new instance after first initialization', () => {
      // Act
      const logger1 = Logger.getInstance(mockLoggerConfig);
      const logger2 = Logger.getInstance();

      // Assert
      expect(winston.createLogger).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Log Level Tests
  // ============================================================================

  describe('Log Levels', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    describe('error()', () => {
      it('should log error message', () => {
        // Act
        logger.error('Test error message');

        // Assert
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          'Test error message',
          expect.any(Object)
        );
      });

      it('should log error with metadata', () => {
        // Arrange
        const metadata = { userId: '123', action: 'test' } as any;

        // Act
        logger.error('Test error', metadata);

        // Assert
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          'Test error',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.error('Test error');

        // Assert
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          'Test error',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });

    describe('warn()', () => {
      it('should log warning message', () => {
        // Act
        logger.warn('Test warning message');

        // Assert
        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          'Test warning message',
          expect.any(Object)
        );
      });

      it('should log warning with metadata', () => {
        // Arrange
        const metadata = { userId: '123', action: 'test' } as any;

        // Act
        logger.warn('Test warning', metadata);

        // Assert
        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          'Test warning',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.warn('Test warning');

        // Assert
        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          'Test warning',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });

    describe('info()', () => {
      it('should log info message', () => {
        // Act
        logger.info('Test info message');

        // Assert
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          'Test info message',
          expect.any(Object)
        );
      });

      it('should log info with metadata', () => {
        // Arrange
        const metadata = { userId: '123', action: 'test' } as any;

        // Act
        logger.info('Test info', metadata);

        // Assert
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          'Test info',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.info('Test info');

        // Assert
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          'Test info',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });

    describe('http()', () => {
      it('should log HTTP message', () => {
        // Act
        logger.http('Test HTTP message');

        // Assert
        expect(mockWinstonLogger.http).toHaveBeenCalledWith(
          'Test HTTP message',
          expect.any(Object)
        );
      });

      it('should log HTTP with metadata', () => {
        // Arrange
        const metadata = { method: 'GET', url: '/test', statusCode: 200 } as any;

        // Act
        logger.http('Test HTTP', metadata);

        // Assert
        expect(mockWinstonLogger.http).toHaveBeenCalledWith(
          'Test HTTP',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.http('Test HTTP');

        // Assert
        expect(mockWinstonLogger.http).toHaveBeenCalledWith(
          'Test HTTP',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });

    describe('verbose()', () => {
      it('should log verbose message', () => {
        // Act
        logger.verbose('Test verbose message');

        // Assert
        expect(mockWinstonLogger.verbose).toHaveBeenCalledWith(
          'Test verbose message',
          expect.any(Object)
        );
      });

      it('should log verbose with metadata', () => {
        // Arrange
        const metadata = { userId: '123', action: 'test' } as any;

        // Act
        logger.verbose('Test verbose', metadata);

        // Assert
        expect(mockWinstonLogger.verbose).toHaveBeenCalledWith(
          'Test verbose',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.verbose('Test verbose');

        // Assert
        expect(mockWinstonLogger.verbose).toHaveBeenCalledWith(
          'Test verbose',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });

    describe('debug()', () => {
      it('should log debug message', () => {
        // Act
        logger.debug('Test debug message');

        // Assert
        expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
          'Test debug message',
          expect.any(Object)
        );
      });

      it('should log debug with metadata', () => {
        // Arrange
        const metadata = { userId: '123', action: 'test' } as any;

        // Act
        logger.debug('Test debug', metadata);

        // Assert
        expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
          'Test debug',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.debug('Test debug');

        // Assert
        expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
          'Test debug',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });

    describe('silly()', () => {
      it('should log silly message', () => {
        // Act
        logger.silly('Test silly message');

        // Assert
        expect(mockWinstonLogger.silly).toHaveBeenCalledWith(
          'Test silly message',
          expect.any(Object)
        );
      });

      it('should log silly with metadata', () => {
        // Arrange
        const metadata = { userId: '123', action: 'test' } as any;

        // Act
        logger.silly('Test silly', metadata);

        // Assert
        expect(mockWinstonLogger.silly).toHaveBeenCalledWith(
          'Test silly',
          expect.objectContaining(metadata)
        );
      });

      it('should include correlation ID in metadata when set', () => {
        // Arrange
        logger.setCorrelationId('test-correlation-id');

        // Act
        logger.silly('Test silly');

        // Assert
        expect(mockWinstonLogger.silly).toHaveBeenCalledWith(
          'Test silly',
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });
    });
  });

  // ============================================================================
  // Error Logging Tests
  // ============================================================================

  describe('logError()', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    it('should log error object with stack trace', () => {
      // Arrange
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      // Act
      logger.logError(error);

      // Assert
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          errorName: 'Error',
          errorMessage: 'Test error',
          stackTrace: 'Error: Test error\n    at test.js:1:1',
        })
      );
    });

    it('should log error with custom message', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      logger.logError(error, 'Custom error message');

      // Assert
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Custom error message',
        expect.objectContaining({
          message: 'Custom error message',
          errorName: 'Error',
          errorMessage: 'Test error',
        })
      );
    });

    it('should log error with metadata', () => {
      // Arrange
      const error = new Error('Test error');
      const metadata = { userId: '123', action: 'test' } as any;

      // Act
      logger.logError(error, undefined, metadata);

      // Assert
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Test error',
          expect.objectContaining({
            userId: '123',
            action: 'test',
          })
        );
    });

    it('should NOT include correlation ID in error metadata (logError creates its own metadata)', () => {
      // Arrange
      const error = new Error('Test error');
      logger.setCorrelationId('test-correlation-id');

      // Act
      logger.logError(error);

      // Assert
      // logError() creates its own metadata object and doesn't use buildMetadata()
      // so it won't include correlation ID
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Test error',
          expect.not.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
    });

    it('should include timestamp in error metadata', () => {
      // Arrange
      const error = new Error('Test error');
      const beforeLog = new Date().toISOString();

      // Act
      logger.logError(error);
      const afterLog = new Date().toISOString();

      // Assert
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{3}Z$/),
        })
      );
    });

    it('should handle error without stack trace', () => {
      // Arrange
      const error = new Error('Test error');
      delete (error as any).stack;

      // Act
      logger.logError(error);

      // Assert
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          errorName: 'Error',
          errorMessage: 'Test error',
        })
      );
    });
  });

  // ============================================================================
  // Correlation ID Tests
  // ============================================================================

  describe('Correlation ID', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    describe('setCorrelationId()', () => {
      it('should set correlation ID', () => {
        // Act
        logger.setCorrelationId('test-correlation-id');

        // Assert
        expect(logger.getCorrelationId()).toBe('test-correlation-id');
      });

      it('should update correlation ID', () => {
        // Arrange
        logger.setCorrelationId('id1');

        // Act
        logger.setCorrelationId('id2');

        // Assert
        expect(logger.getCorrelationId()).toBe('id2');
      });

      it('should handle empty correlation ID', () => {
        // Act
        logger.setCorrelationId('');

        // Assert
        expect(logger.getCorrelationId()).toBe('');
      });
    });

    describe('getCorrelationId()', () => {
      it('should return undefined when correlation ID not set', () => {
        // Act
        const correlationId = logger.getCorrelationId();

        // Assert
        expect(correlationId).toBeUndefined();
      });

      it('should return set correlation ID', () => {
        // Arrange
        logger.setCorrelationId('test-id');

        // Act
        const correlationId = logger.getCorrelationId();

        // Assert
        expect(correlationId).toBe('test-id');
      });
    });

    describe('clearCorrelationId()', () => {
      it('should clear correlation ID', () => {
        // Arrange
        logger.setCorrelationId('test-id');

        // Act
        logger.clearCorrelationId();

        // Assert
        expect(logger.getCorrelationId()).toBeUndefined();
      });

      it('should handle clearing when correlation ID not set', () => {
        // Act & Assert - should not throw
        expect(() => logger.clearCorrelationId()).not.toThrow();
      });
    });

    describe('Correlation ID in Logs', () => {
      it('should include correlation ID in all log levels when set', () => {
        // Arrange
        logger.setCorrelationId('test-id');

        // Act
        logger.error('error');
        logger.warn('warn');
        logger.info('info');
        logger.http('http');
        logger.verbose('verbose');
        logger.debug('debug');
        logger.silly('silly');

        // Assert
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          'error',
          expect.objectContaining({ correlationId: 'test-id' })
        );
        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          'warn',
          expect.objectContaining({ correlationId: 'test-id' })
        );
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          'info',
          expect.objectContaining({ correlationId: 'test-id' })
        );
        expect(mockWinstonLogger.http).toHaveBeenCalledWith(
          'http',
          expect.objectContaining({ correlationId: 'test-id' })
        );
        expect(mockWinstonLogger.verbose).toHaveBeenCalledWith(
          'verbose',
          expect.objectContaining({ correlationId: 'test-id' })
        );
        expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
          'debug',
          expect.objectContaining({ correlationId: 'test-id' })
        );
        expect(mockWinstonLogger.silly).toHaveBeenCalledWith(
          'silly',
          expect.objectContaining({ correlationId: 'test-id' })
        );
      });
    });
  });

  // ============================================================================
  // Metadata Tests
  // ============================================================================

  describe('addMetadata()', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    it('should add metadata to logger', () => {
      // Act
      logger.addMetadata({ userId: '123', action: 'test' });

      // Assert
      expect(mockWinstonLogger.defaultMeta).toEqual(
        expect.objectContaining({
          userId: '123',
          action: 'test',
        })
      );
    });

    it('should merge metadata with existing metadata', () => {
      // Arrange
      logger.addMetadata({ userId: '123' });

      // Act
      logger.addMetadata({ action: 'test' });

      // Assert
      expect(mockWinstonLogger.defaultMeta).toEqual(
        expect.objectContaining({
          userId: '123',
          action: 'test',
        })
      );
    });

    it('should overwrite existing metadata keys', () => {
      // Arrange
      logger.addMetadata({ userId: '123' });

      // Act
      logger.addMetadata({ action: 'test' });

      // Assert
      expect(mockWinstonLogger.defaultMeta).toEqual(
        expect.objectContaining({
          userId: '456',
          action: 'test',
        })
      );
    });

    it('should handle empty metadata object', () => {
      // Act & Assert - should not throw
      expect(() => logger.addMetadata({})).not.toThrow();
    });
  });

  // ============================================================================
  // Child Logger Tests
  // ============================================================================

  describe('child()', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    it('should create child logger with additional metadata', () => {
      // Act
      const childLogger = logger.child({ childField: 'childValue' });

      // Assert
      expect(childLogger).toBeInstanceOf(Logger);
      expect(mockWinstonLogger.child).toHaveBeenCalledWith({
        childField: 'childValue',
      });
    });

    it('should create child logger with multiple metadata fields', () => {
      // Act
      const childLogger = logger.child({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      });

      // Assert
      expect(mockWinstonLogger.child).toHaveBeenCalledWith({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      });
    });

    it('should share correlation ID with child logger', () => {
      // Arrange
      logger.setCorrelationId('test-id');

      // Act
      const childLogger = logger.child({ childField: 'value' });

      // Assert
      expect(childLogger.getCorrelationId()).toBe('test-id');
    });

    it('should create independent child logger', () => {
      // Act
      const childLogger = logger.child({ childField: 'value' });

      // Assert
      expect(childLogger).not.toBe(logger);
    });
  });

  // ============================================================================
  // Log Level Management Tests
  // ============================================================================

  describe('Log Level Management', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    describe('setLevel()', () => {
      it('should set log level', () => {
        // Act
        logger.setLevel(LogLevel.DEBUG);

        // Assert
        expect(mockWinstonLogger.level).toBe(LogLevel.DEBUG);
      });

      it('should update log level', () => {
        // Arrange
        logger.setLevel(LogLevel.INFO);

        // Act
        logger.setLevel(LogLevel.ERROR);

        // Assert
        expect(mockWinstonLogger.level).toBe(LogLevel.ERROR);
      });

      it('should set all log levels', () => {
        const levels = [
          LogLevel.ERROR,
          LogLevel.WARN,
          LogLevel.INFO,
          LogLevel.HTTP,
          LogLevel.VERBOSE,
          LogLevel.DEBUG,
          LogLevel.SILLY,
        ];

        levels.forEach((level) => {
          logger.setLevel(level);
          expect(mockWinstonLogger.level).toBe(level);
        });
      });
    });

    describe('getLevel()', () => {
      it('should return current log level', () => {
        // Arrange
        mockWinstonLogger.level = LogLevel.DEBUG;

        // Act
        const level = logger.getLevel();

        // Assert
        expect(level).toBe(LogLevel.DEBUG);
      });

      it('should return updated log level after setLevel', () => {
        // Arrange
        logger.setLevel(LogLevel.WARN);

        // Act
        const level = logger.getLevel();

        // Assert
        expect(level).toBe(LogLevel.WARN);
      });
    });
  });

  // ============================================================================
  // Winston Logger Access Tests
  // ============================================================================

  describe('getWinstonLogger()', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    it('should return underlying winston logger', () => {
      // Act
      const winstonLogger = logger.getWinstonLogger();

      // Assert
      expect(winstonLogger).toBe(mockWinstonLogger);
    });

    it('should return same winston logger instance', () => {
      // Act
      const winstonLogger1 = logger.getWinstonLogger();
      const winstonLogger2 = logger.getWinstonLogger();

      // Assert
      expect(winstonLogger1).toBe(winstonLogger2);
    });
  });

  // ============================================================================
  // Close Tests
  // ============================================================================

  describe('close()', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    it('should close all transports', async () => {
      // Arrange
      const mockTransport1 = { close: jest.fn() };
      const mockTransport2 = { close: jest.fn() };
      mockWinstonLogger.transports = [mockTransport1, mockTransport2];

      // Act
      await logger.close();

      // Assert
      expect(mockTransport1.close).toHaveBeenCalled();
      expect(mockTransport2.close).toHaveBeenCalled();
    });

    it('should handle transports without close method', async () => {
      // Arrange
      const mockTransport1 = { close: jest.fn() };
      const mockTransport2 = {}; // No close method
      mockWinstonLogger.transports = [mockTransport1, mockTransport2];

      // Act & Assert - should not throw
      await expect(logger.close()).resolves.not.toThrow();
    });

    it('should handle empty transports array', async () => {
      // Arrange
      mockWinstonLogger.transports = [];

      // Act & Assert - should not throw
      await expect(logger.close()).resolves.not.toThrow();
    });

    it('should return promise that resolves', async () => {
      // Arrange
      mockWinstonLogger.transports = [];

      // Act & Assert
      await expect(logger.close()).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle winston logger errors gracefully', () => {
      // Arrange
      const errorHandler = jest.fn();
      mockWinstonLogger.on.mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          errorHandler.mockImplementation(handler);
        }
      });

      // Act
      logger = Logger.getInstance(mockLoggerConfig);

      // Assert
      expect(mockWinstonLogger.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle null metadata', () => {
      // Arrange
      logger = Logger.getInstance(mockLoggerConfig);

      // Act & Assert - should not throw
      expect(() => logger.info('test', null as any)).not.toThrow();
    });

    it('should handle undefined metadata', () => {
      // Arrange
      logger = Logger.getInstance(mockLoggerConfig);

      // Act & Assert - should not throw
      expect(() => logger.info('test', undefined)).not.toThrow();
    });

    it('should handle empty string message', () => {
      // Arrange
      logger = Logger.getInstance(mockLoggerConfig);

      // Act & Assert - should not throw
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle special characters in message', () => {
      // Arrange
      logger = Logger.getInstance(mockLoggerConfig);

      // Act & Assert - should not throw
      expect(() => logger.info('Test with special chars: \n\t\r')).not.toThrow();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      logger = Logger.getInstance(mockLoggerConfig);
    });

    it('should handle very long messages', () => {
      // Arrange
      const longMessage = 'x'.repeat(100000);

      // Act & Assert - should not throw
      expect(() => logger.info(longMessage)).not.toThrow();
    });

    it('should handle very long correlation IDs', () => {
      // Arrange
      const longId = 'a'.repeat(1000);

      // Act
      logger.setCorrelationId(longId);

      // Assert
      expect(logger.getCorrelationId()).toBe(longId);
    });

    it('should handle metadata with nested objects', () => {
      // Arrange
      const metadata = {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
            },
          },
        },
      } as any;

      // Act & Assert - should not throw
      expect(() => logger.info('test', metadata)).not.toThrow();
    });

    it('should handle metadata with arrays', () => {
      // Arrange
      const metadata = {
        items: [1, 2, 3, 4, 5],
        tags: ['tag1', 'tag2', 'tag3'],
      } as any;

      // Act & Assert - should not throw
      expect(() => logger.info('test', metadata)).not.toThrow();
    });

    it('should handle metadata with null values', () => {
      // Arrange
      const metadata = {
        field1: null,
        field2: 'value',
        field3: null,
      } as any;

      // Act & Assert - should not throw
      expect(() => logger.info('test', metadata)).not.toThrow();
    });

    it('should handle metadata with undefined values', () => {
      // Arrange
      const metadata = {
        field1: undefined,
        field2: 'value',
        field3: undefined,
      } as any;

      // Act & Assert - should not throw
      expect(() => logger.info('test', metadata)).not.toThrow();
    });
  });
});
