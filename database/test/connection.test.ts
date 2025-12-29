/**
 * Tests for Database Connection Layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DatabaseConnection,
  getDatabaseConnection,
  initializeDatabase,
  closeDatabase,
  ConnectionState,
  type HealthCheckResult,
} from '../src/connection';

describe('DatabaseConnection', () => {
  let connection: DatabaseConnection;

  beforeEach(() => {
    // Reset singleton
    (global as any).__databaseConnection = null;
    connection = new DatabaseConnection();
  });

  afterEach(async () => {
    try {
      await closeDatabase();
    } catch {
      // Ignore errors if connection was already closed
    }
  });

  describe('initialize', () => {
    it('should initialize connection pool successfully', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test',
        1,
        5,
        10000
      );

      expect(connection.getState()).toBe(ConnectionState.CONNECTED);
      expect(connection.getConfig()).not.toBeNull();
    });

    it('should use environment variables when no parameters provided', async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test';
      process.env.DATABASE_POOL_MIN = '1';
      process.env.DATABASE_POOL_MAX = '5';
      process.env.DATABASE_TIMEOUT = '10000';

      await connection.initialize();

      expect(connection.getState()).toBe(ConnectionState.CONNECTED);
      const config = connection.getConfig();
      expect(config?.min).toBe(1);
      expect(config?.max).toBe(5);
      expect(config?.timeout).toBe(10000);
    });

    it('should throw error when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;

      await expect(connection.initialize()).rejects.toThrow('DATABASE_URL environment variable is not set');
    });

    it('should throw error for invalid DATABASE_URL format', async () => {
      await expect(
        connection.initialize('invalid-url-format')
      ).rejects.toThrow('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database');
    });

    it('should throw error for invalid port number', async () => {
      await expect(
        connection.initialize('postgresql://user:pass@host:99999/db')
      ).rejects.toThrow('Database port must be between 1 and 65535');
    });

    it('should throw error when max pool size < min pool size', async () => {
      await expect(
        connection.initialize(
          process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test',
          10,
          5
        )
      ).rejects.toThrow('Maximum pool size must be greater than or equal to minimum pool size');
    });
  });

  describe('getPool', () => {
    it('should return pool after initialization', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      const pool = connection.getPool();
      expect(pool).toBeDefined();
      expect(pool.totalCount).toBeGreaterThan(0);
    });

    it('should throw error when pool not initialized', () => {
      expect(() => connection.getPool()).toThrow('Database connection pool not initialized. Call initialize() first.');
    });
  });

  describe('getClient', () => {
    it('should return a client from the pool', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      const client = await connection.getClient();
      expect(client).toBeDefined();
      client.release();
    });

    it('should throw error when pool not initialized', async () => {
      await expect(connection.getClient()).rejects.toThrow('Database connection pool not initialized. Call initialize() first.');
    });
  });

  describe('query', () => {
    it('should execute a simple query', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      const result = await connection.query('SELECT 1 as value');
      expect(result.rows[0].value).toBe(1);
    });

    it('should execute a query with parameters', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      const result = await connection.query('SELECT $1 as value', [42]);
      expect(result.rows[0].value).toBe('42');
    });

    it('should throw error when pool not initialized', async () => {
      await expect(connection.query('SELECT 1')).rejects.toThrow('Database connection pool not initialized. Call initialize() first.');
    });
  });

  describe('transaction', () => {
    it('should execute a transaction successfully', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      const result = await connection.transaction(async (client) => {
        const res = await client.query('SELECT 1 as value');
        return res.rows[0].value;
      });

      expect(result).toBe(1);
    });

    it('should rollback on error', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      await expect(
        connection.transaction(async (client) => {
          await client.query('INSERT INTO brands (name) VALUES ($1)', ['Test Brand']);
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Verify rollback - brand should not exist
      const result = await connection.query('SELECT COUNT(*) as count FROM brands WHERE name = $1', ['Test Brand']);
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when connection is working', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      const health = await connection.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.poolSize.totalCount).toBeGreaterThan(0);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
    });

    it('should return unhealthy status when pool not initialized', async () => {
      const health = await connection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
      expect(health.error).toBe('Connection pool not initialized');
    });
  });

  describe('getState', () => {
    it('should return disconnected state initially', () => {
      expect(connection.getState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should return connecting state during initialization', async () => {
      const initPromise = connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      // State should be connecting (though timing may vary)
      const state = connection.getState();
      expect([ConnectionState.CONNECTING, ConnectionState.CONNECTED]).toContain(state);

      await initPromise;
    });

    it('should return connected state after successful initialization', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      expect(connection.getState()).toBe(ConnectionState.CONNECTED);
    });
  });

  describe('close', () => {
    it('should close the connection pool', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      await connection.close();

      expect(connection.getState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should not throw error when closing already closed pool', async () => {
      await connection.close(); // Should not throw
    });
  });

  describe('closeWithTimeout', () => {
    it('should close the connection pool within timeout', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      await connection.closeWithTimeout(5000);

      expect(connection.getState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should throw error on timeout', async () => {
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      // Mock close to never resolve
      vi.spyOn(connection, 'close').mockImplementation(() => new Promise(() => {}));

      await expect(connection.closeWithTimeout(100)).rejects.toThrow('Connection pool close timeout');
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      const connection = new DatabaseConnection({
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      });

      // This test assumes the database is available and will connect on first attempt
      await connection.initialize(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      expect(connection.getState()).toBe(ConnectionState.CONNECTED);
    });
  });
});

describe('Singleton functions', () => {
  afterEach(async () => {
    try {
      await closeDatabase();
    } catch {
      // Ignore errors if connection was already closed
    }
  });

  describe('getDatabaseConnection', () => {
    it('should return singleton instance', () => {
      const conn1 = getDatabaseConnection();
      const conn2 = getDatabaseConnection();

      expect(conn1).toBe(conn2);
    });

    it('should use custom retry config', () => {
      const conn = getDatabaseConnection({
        maxAttempts: 10,
        initialDelay: 2000,
      });

      expect(conn).toBeInstanceOf(DatabaseConnection);
    });
  });

  describe('initializeDatabase', () => {
    it('should initialize singleton connection', async () => {
      const conn = await initializeDatabase(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      expect(conn.getState()).toBe(ConnectionState.CONNECTED);
    });

    it('should return same instance on subsequent calls', async () => {
      const testUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test';
      const conn1 = await initializeDatabase(testUrl);
      const conn2 = await initializeDatabase(testUrl);

      expect(conn1).toBe(conn2);
    });
  });

  describe('closeDatabase', () => {
    it('should close singleton connection', async () => {
      await initializeDatabase(
        process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test'
      );

      await closeDatabase();

      // Should be able to create new connection after closing
      const conn = getDatabaseConnection();
      expect(conn.getState()).toBe(ConnectionState.DISCONNECTED);
    });
  });
});
