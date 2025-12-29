/**
 * Scraping Metadata CRUD Operations
 *
 * Provides create, read, update, and delete operations for scraping metadata records.
 * Uses parameterized queries to prevent SQL injection and handles constraints appropriately.
 *
 * @package @hookah-db/database
 */

import { getDatabaseConnection } from './connection.js';
import {
  ScrapingMetadata,
  CreateScrapingMetadataInput,
  UpdateScrapingMetadataInput,
} from './types.js';

/**
 * Create a new scraping metadata record
 * @param input Scraping metadata data to insert
 * @returns The created scraping metadata record with ID
 */
export async function createScrapingMetadata(
  input: CreateScrapingMetadataInput
): Promise<ScrapingMetadata> {
  const connection = getDatabaseConnection();
  
  const query = `
    INSERT INTO scraping_metadata (
      operation_type,
      status,
      started_at,
      brands_processed,
      products_processed,
      error_count,
      error_details
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const params = [
    input.operation_type,
    input.status ?? 'in_progress',
    input.started_at ?? new Date(),
    input.brands_processed ?? 0,
    input.products_processed ?? 0,
    input.error_count ?? 0,
    input.error_details ?? null,
  ];
  
  const result = await connection.query<ScrapingMetadata>(query, params);
  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to create scraping metadata');
  }
  return row;
}

/**
 * Get a scraping metadata record by ID
 * @param id Scraping metadata ID
 * @returns The scraping metadata record or null if not found
 */
export async function getScrapingMetadataById(
  id: number
): Promise<ScrapingMetadata | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM scraping_metadata
    WHERE id = $1
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get recent scraping operations
 * @param limit Maximum number of operations to return (default: 100)
 * @param offset Number of operations to skip (default: 0)
 * @returns Array of scraping metadata records, ordered by started_at DESC
 */
export async function getRecentScrapingOperations(
  limit: number = 100,
  offset: number = 0
): Promise<ScrapingMetadata[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM scraping_metadata
    ORDER BY started_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, [limit, offset]);
  return result.rows;
}

/**
 * Get scraping operations by status
 * @param status Status to filter by
 * @param limit Maximum number of operations to return (default: 100)
 * @param offset Number of operations to skip (default: 0)
 * @returns Array of scraping metadata records with specified status
 */
export async function getScrapingOperationsByStatus(
  status: 'in_progress' | 'completed' | 'failed',
  limit: number = 100,
  offset: number = 0
): Promise<ScrapingMetadata[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM scraping_metadata
    WHERE status = $1
    ORDER BY started_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, [status, limit, offset]);
  return result.rows;
}

/**
 * Get scraping operations by operation type
 * @param operationType Operation type to filter by
 * @param limit Maximum number of operations to return (default: 100)
 * @param offset Number of operations to skip (default: 0)
 * @returns Array of scraping metadata records with specified operation type
 */
export async function getScrapingOperationsByType(
  operationType: 'full_refresh' | 'incremental_update',
  limit: number = 100,
  offset: number = 0
): Promise<ScrapingMetadata[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM scraping_metadata
    WHERE operation_type = $1
    ORDER BY started_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, [operationType, limit, offset]);
  return result.rows;
}

/**
 * Get all scraping operations with pagination
 * @param limit Maximum number of operations to return (default: 100)
 * @param offset Number of operations to skip (default: 0)
 * @returns Array of scraping metadata records
 */
export async function getAllScrapingOperations(
  limit: number = 100,
  offset: number = 0
): Promise<ScrapingMetadata[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM scraping_metadata
    ORDER BY started_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, [limit, offset]);
  return result.rows;
}

/**
 * Update a scraping metadata record by ID
 * @param id Scraping metadata ID
 * @param input Fields to update
 * @returns The updated scraping metadata record or null if not found
 */
export async function updateScrapingMetadata(
  id: number,
  input: UpdateScrapingMetadataInput
): Promise<ScrapingMetadata | null> {
  const connection = getDatabaseConnection();
  
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const params: (string | number | Date | null)[] = [];
  let paramIndex = 1;
  
  if (input.operation_type !== undefined) {
    updates.push(`operation_type = $${paramIndex++}`);
    params.push(input.operation_type);
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }
  if (input.started_at !== undefined) {
    updates.push(`started_at = $${paramIndex++}`);
    params.push(input.started_at);
  }
  if (input.completed_at !== undefined) {
    updates.push(`completed_at = $${paramIndex++}`);
    params.push(input.completed_at);
  }
  if (input.brands_processed !== undefined) {
    updates.push(`brands_processed = $${paramIndex++}`);
    params.push(input.brands_processed);
  }
  if (input.products_processed !== undefined) {
    updates.push(`products_processed = $${paramIndex++}`);
    params.push(input.products_processed);
  }
  if (input.error_count !== undefined) {
    updates.push(`error_count = $${paramIndex++}`);
    params.push(input.error_count);
  }
  if (input.error_details !== undefined) {
    updates.push(`error_details = $${paramIndex++}`);
    params.push(input.error_details);
  }
  
  if (updates.length === 0) {
    // No fields to update, return existing metadata
    return getScrapingMetadataById(id);
  }
  
  params.push(id); // WHERE clause parameter
  
  const query = `
    UPDATE scraping_metadata
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, params);
  return result.rows[0] || null;
}

/**
 * Delete a scraping metadata record by ID
 * @param id Scraping metadata ID
 * @returns True if metadata was deleted, false if not found
 */
export async function deleteScrapingMetadata(id: number): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `
    DELETE FROM scraping_metadata
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await connection.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Mark a scraping operation as completed
 * @param id Scraping metadata ID
 * @param brandsProcessed Number of brands processed
 * @param productsProcessed Number of products processed
 * @returns The updated scraping metadata record or null if not found
 */
export async function completeScrapingOperation(
  id: number,
  brandsProcessed: number,
  productsProcessed: number
): Promise<ScrapingMetadata | null> {
  return updateScrapingMetadata(id, {
    status: 'completed',
    completed_at: new Date(),
    brands_processed: brandsProcessed,
    products_processed: productsProcessed,
  });
}

/**
 * Mark a scraping operation as failed
 * @param id Scraping metadata ID
 * @param errorDetails Details about error
 * @returns The updated scraping metadata record or null if not found
 */
export async function failScrapingOperation(
  id: number,
  errorDetails: string
): Promise<ScrapingMetadata | null> {
  return updateScrapingMetadata(id, {
    status: 'failed',
    completed_at: new Date(),
    error_details: errorDetails,
  });
}

/**
 * Increment the error count for a scraping operation
 * @param id Scraping metadata ID
 * @param increment Amount to increment by (default: 1)
 * @returns The updated scraping metadata record or null if not found
 */
export async function incrementScrapingErrorCount(
  id: number,
  increment: number = 1
): Promise<ScrapingMetadata | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    UPDATE scraping_metadata
    SET error_count = error_count + $1
    WHERE id = $2
    RETURNING *
  `;
  
  const result = await connection.query<ScrapingMetadata>(query, [increment, id]);
  return result.rows[0] || null;
}

/**
 * Get total count of scraping operations
 * @returns Total number of scraping metadata records
 */
export async function getScrapingMetadataCount(): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM scraping_metadata`;
  
  const result = await connection.query<{ count: string }>(query);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Get count of scraping operations by status
 * @param status Status to filter by
 * @returns Total number of scraping metadata records with specified status
 */
export async function getScrapingMetadataCountByStatus(
  status: 'in_progress' | 'completed' | 'failed'
): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM scraping_metadata WHERE status = $1`;
  
  const result = await connection.query<{ count: string }>(query, [status]);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Get count of scraping operations by operation type
 * @param operationType Operation type to filter by
 * @returns Total number of scraping metadata records with specified operation type
 */
export async function getScrapingMetadataCountByType(
  operationType: 'full_refresh' | 'incremental_update'
): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM scraping_metadata WHERE operation_type = $1`;
  
  const result = await connection.query<{ count: string }>(query, [operationType]);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Get most recent scraping operation
 * @returns The most recent scraping metadata record or null if none exist
 */
export async function getMostRecentScrapingOperation(): Promise<ScrapingMetadata | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM scraping_metadata
    ORDER BY started_at DESC
    LIMIT 1
  `;
  
  const result = await connection.query<ScrapingMetadata>(query);
  return result.rows[0] || null;
}

/**
 * Get in-progress scraping operations
 * @returns Array of in-progress scraping metadata records
 */
export async function getInProgressScrapingOperations(): Promise<ScrapingMetadata[]> {
  return getScrapingOperationsByStatus('in_progress');
}

/**
 * Get failed scraping operations
 * @param limit Maximum number of operations to return (default: 50)
 * @returns Array of failed scraping metadata records
 */
export async function getFailedScrapingOperations(
  limit: number = 50
): Promise<ScrapingMetadata[]> {
  return getScrapingOperationsByStatus('failed', limit);
}
