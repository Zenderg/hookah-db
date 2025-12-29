/**
 * Transaction Management Utilities
 *
 * Provides utilities for managing database transactions, including begin, commit,
 * rollback, and executing operations within transaction contexts.
 *
 * @package @hookah-db/database
 */

import type { PoolClient } from 'pg';

import { getDatabaseConnection } from './connection.js';

/**
 * Transaction context interface
 * Provides access to transaction client and transaction control methods
 */
export interface TransactionContext {
  client: PoolClient;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

/**
 * Begin a new database transaction
 * @returns A transaction context with client and control methods
 */
export async function beginTransaction(): Promise<TransactionContext> {
  const connection = getDatabaseConnection();
  const client = await connection.getClient();
  
  await client.query('BEGIN');
  
  let committed = false;
  let rolledBack = false;
  
  return {
    client,
    commit: async () => {
      if (committed || rolledBack) {
        throw new Error('Transaction already completed');
      }
      await client.query('COMMIT');
      committed = true;
      client.release();
    },
    rollback: async () => {
      if (committed || rolledBack) {
        throw new Error('Transaction already completed');
      }
      await client.query('ROLLBACK');
      rolledBack = true;
      client.release();
    },
  };
}

/**
 * Execute operations within a transaction context
 * Automatically commits on success or rolls back on error
 * @param callback Function to execute within transaction
 * @returns The result of callback function
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const connection = getDatabaseConnection();
  
  return connection.transaction(callback);
}

/**
 * Execute operations within a transaction context with manual control
 * Provides transaction context for explicit commit/rollback control
 * @param callback Function to execute within transaction
 * @returns The result of callback function
 */
export async function withTransactionContext<T>(
  callback: (tx: TransactionContext) => Promise<T>
): Promise<T> {
  const tx = await beginTransaction();
  
  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch (rollbackError) {
      // Ignore rollback errors (transaction might already be rolled back)
      // This can happen if callback already rolled back before throwing
      console.warn('Rollback error:', rollbackError);
    }
    throw error;
  }
}

/**
 * Execute multiple operations within a transaction
 * All operations must succeed for transaction to commit
 * @param operations Array of functions to execute within transaction
 * @returns Array of results from each operation
 */
export async function executeInTransaction<T>(
  operations: Array<(client: PoolClient) => Promise<T>>
): Promise<T[]> {
  return withTransaction(async (client) => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation(client);
      results.push(result);
    }
    
    return results;
  });
}

/**
 * Execute operations within a transaction with retry logic
 * Retries entire transaction on retryable errors
 * @param callback Function to execute within transaction
 * @param maxAttempts Maximum number of retry attempts (default: 3)
 * @returns The result of callback function
 */
export async function withTransactionRetry<T>(
  callback: (client: PoolClient) => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const isRetryable = isRetryableTransactionError(lastError);
      
      if (!isRetryable || attempt === maxAttempts) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Transaction failed');
}

/**
 * Check if an error is retryable for transactions
 * @param error The error to check
 * @returns True if error is retryable
 */
function isRetryableTransactionError(error: Error): boolean {
  const retryableCodes = [
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '57P01', // admin shutdown
    '57P02', // crash shutdown
    '57P03', // cannot connect now
  ];
  
  const code = (error as { code?: string }).code;
  return code !== undefined && retryableCodes.includes(code);
}

/**
 * Savepoint management within a transaction
 * Allows creating and rolling back to savepoints
 */
export interface SavepointContext {
  client: PoolClient;
  createSavepoint: (name: string) => Promise<void>;
  rollbackToSavepoint: (name: string) => Promise<void>;
  releaseSavepoint: (name: string) => Promise<void>;
}

/**
 * Create a savepoint context within an existing transaction
 * @param client The transaction client
 * @returns A savepoint context with savepoint management methods
 */
export function createSavepointContext(client: PoolClient): SavepointContext {
  return {
    client,
    createSavepoint: async (name: string) => {
      await client.query(`SAVEPOINT ${name}`);
    },
    rollbackToSavepoint: async (name: string) => {
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    },
    releaseSavepoint: async (name: string) => {
      await client.query(`RELEASE SAVEPOINT ${name}`);
    },
  };
}

/**
 * Execute operations with savepoint support
 * Allows partial rollback within a transaction
 * @param callback Function to execute with savepoint context
 * @returns The result of callback function
 */
export async function withSavepoints<T>(
  callback: (tx: TransactionContext, savepoints: SavepointContext) => Promise<T>
): Promise<T> {
  return withTransactionContext(async (tx) => {
    const savepoints = createSavepointContext(tx.client);
    return callback(tx, savepoints);
  });
}

/**
 * Execute a batch of operations with automatic chunking
 * Useful for large batch operations to avoid transaction timeouts
 * @param operations Array of operations to execute
 * @param batchSize Number of operations per transaction (default: 100)
 * @param callback Function to execute for each batch
 * @returns Array of results from all operations
 */
export async function executeBatch<T>(
  operations: Array<(client: PoolClient) => Promise<T>>,
  batchSize: number = 100,
  callback?: (results: T[], batchIndex: number) => void
): Promise<T[]> {
  const allResults: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await executeInTransaction(batch);
    allResults.push(...batchResults);
    
    if (callback) {
      callback(batchResults, Math.floor(i / batchSize));
    }
  }
  
  return allResults;
}

/**
 * Execute operations in parallel transactions
 * Useful for independent operations that can run concurrently
 * @param operations Array of operations to execute in parallel
 * @returns Array of results from all operations
 */
export async function executeParallelTransactions<T>(
  operations: Array<(client: PoolClient) => Promise<T>>
): Promise<T[]> {
  return Promise.all(operations.map(operation => withTransaction(operation)));
}

/**
 * Transaction isolation levels
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * Begin a transaction with a specific isolation level
 * @param isolationLevel The isolation level to use
 * @returns A transaction context with client and control methods
 */
export async function beginTransactionWithIsolation(
  isolationLevel: IsolationLevel
): Promise<TransactionContext> {
  const connection = getDatabaseConnection();
  const client = await connection.getClient();
  
  await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
  
  let committed = false;
  let rolledBack = false;
  
  return {
    client,
    commit: async () => {
      if (committed || rolledBack) {
        throw new Error('Transaction already completed');
      }
      await client.query('COMMIT');
      committed = true;
      client.release();
    },
    rollback: async () => {
      if (committed || rolledBack) {
        throw new Error('Transaction already completed');
      }
      await client.query('ROLLBACK');
      rolledBack = true;
      client.release();
    },
  };
}

/**
 * Execute operations within a transaction with a specific isolation level
 * @param callback Function to execute within transaction
 * @param isolationLevel The isolation level to use
 * @returns The result of callback function
 */
export async function withTransactionIsolation<T>(
  callback: (client: PoolClient) => Promise<T>,
  isolationLevel: IsolationLevel = IsolationLevel.READ_COMMITTED
): Promise<T> {
  const tx = await beginTransactionWithIsolation(isolationLevel);
  
  try {
    const result = await callback(tx.client);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch (rollbackError) {
      // Ignore rollback errors (transaction might already be rolled back)
      console.warn('Rollback error:', rollbackError);
    }
    throw error;
  }
}
