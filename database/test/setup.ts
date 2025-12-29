/**
 * Test Setup for Database Tests
 *
 * Sets up the test database connection and provides utilities for test isolation.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { initializeDatabase, closeDatabase, getDatabaseConnection } from '../src/connection';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/hookah_db_test';

/**
 * Initialize test database connection
 */
beforeAll(async () => {
  // Set test database URL for connection module
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.DATABASE_POOL_MIN = '1';
  process.env.DATABASE_POOL_MAX = '5';
  process.env.DATABASE_TIMEOUT = '10000';

  // Initialize database connection (only once)
  await initializeDatabase();
});

/**
 * Close test database connection
 */
afterAll(async () => {
  await closeDatabase();
});

/**
 * Clean up database after each test
 * This ensures proper test isolation by cleaning up after each test completes
 */
afterEach(async () => {
  try {
    const connection = getDatabaseConnection();

    // Clean up all tables in correct order (respecting foreign key constraints)
    await connection.query('DELETE FROM scraping_metadata');
    await connection.query('DELETE FROM products');
    await connection.query('DELETE FROM brands');
    await connection.query('DELETE FROM api_keys');
  } catch (error) {
    // Ignore errors if connection is not initialized or already closed
    // This can happen when connection tests reset singleton
  }
});

/**
 * Export test utilities
 */
export const TEST_DB_URL = TEST_DATABASE_URL;
