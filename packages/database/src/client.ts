import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool, PoolConfig } from 'pg';
import Database from 'better-sqlite3';
import * as pgSchema from './schema';
import * as sqliteSchema from './schema/sqlite';
import { env } from '@hookah-db/shared';

// ============================================
// Type Definitions
// ============================================

export type DrizzleDB = ReturnType<typeof drizzle<typeof pgSchema>> | 
                       ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>;

export type Transaction = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

// ============================================
// Database Type Detection
// ============================================

/**
 * Determines the database type based on environment configuration
 */
function getDatabaseType(): 'postgresql' | 'sqlite' {
  const databaseUrl = env.DATABASE_URL.toLowerCase();
  const nodeEnv = env.NODE_ENV;

  // SQLite for development or if DATABASE_URL contains 'sqlite'
  if (nodeEnv === 'development' || databaseUrl.includes('sqlite')) {
    return 'sqlite';
  }

  // PostgreSQL for production
  return 'postgresql';
}

// ============================================
// Database Instance (Singleton)
// ============================================

let dbInstance: DrizzleDB | null = null;

/**
 * Creates and returns a database client instance
 * Implements singleton pattern to reuse the database connection
 */
export function getDb(): DrizzleDB {
  if (dbInstance) {
    return dbInstance;
  }

  const dbType = getDatabaseType();

  if (dbType === 'postgresql') {
    dbInstance = createPostgresClient();
  } else {
    dbInstance = createSqliteClient();
  }

  return dbInstance;
}

/**
 * Creates a PostgreSQL database client with connection pooling
 */
function createPostgresClient(): DrizzleDB {
  const poolConfig: PoolConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 30000,
    query_timeout: 30000,
  };

  const pool = new Pool(poolConfig);
  return drizzle(pool, { schema: pgSchema });
}

/**
 * Creates a SQLite database client (single connection, no pooling)
 */
function createSqliteClient(): DrizzleDB {
  const db = new Database(env.DATABASE_URL.replace('file:', ''));
  return drizzleSqlite(db, { schema: sqliteSchema });
}

/**
 * Closes the database connection and clears the cached instance
 * Useful for testing or cleanup
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance = null;
  }
}
