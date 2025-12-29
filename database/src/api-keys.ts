/**
 * API Key CRUD Operations
 *
 * Provides create, read, update, delete, and validation operations for API key records.
 * Uses parameterized queries to prevent SQL injection and handles constraints appropriately.
 *
 * @package @hookah-db/database
 */

import { getDatabaseConnection } from './connection.js';
import { ApiKey, CreateApiKeyInput, UpdateApiKeyInput, PostgresError } from './types.js';

/**
 * Create a new API key record
 * @param input API key data to insert
 * @returns The created API key record with ID
 * @throws Error if key value already exists
 */
export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
  const connection = getDatabaseConnection();
  
  const query = `
    INSERT INTO api_keys (key_value, name, active, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const params = [
    input.key_value,
    input.name,
    input.active ?? true,
    input.expires_at ?? null,
  ];
  
  try {
    const result = await connection.query<ApiKey>(query, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create API key');
    }
    return row;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23505') {
      // Unique constraint violation
      throw new Error(`API key with value "${input.key_value}" already exists`);
    }
    throw error;
  }
}

/**
 * Get an API key by ID
 * @param id API key ID
 * @returns The API key record or null if not found
 */
export async function getApiKeyById(id: number): Promise<ApiKey | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM api_keys
    WHERE id = $1
  `;
  
  const result = await connection.query<ApiKey>(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get an API key by its key value
 * @param keyValue The API key string
 * @returns The API key record or null if not found
 */
export async function getApiKeyByValue(keyValue: string): Promise<ApiKey | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM api_keys
    WHERE key_value = $1
  `;
  
  const result = await connection.query<ApiKey>(query, [keyValue]);
  return result.rows[0] || null;
}

/**
 * Get all active API keys
 * @returns Array of active API key records
 */
export async function getAllActiveApiKeys(): Promise<ApiKey[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM api_keys
    WHERE active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `;
  
  const result = await connection.query<ApiKey>(query);
  return result.rows;
}

/**
 * Get all API keys with pagination
 * @param limit Maximum number of API keys to return (default: 100)
 * @param offset Number of API keys to skip (default: 0)
 * @returns Array of API key records
 */
export async function getAllApiKeys(limit: number = 100, offset: number = 0): Promise<ApiKey[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM api_keys
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await connection.query<ApiKey>(query, [limit, offset]);
  return result.rows;
}

/**
 * Update an API key by ID
 * @param id API key ID
 * @param input Fields to update
 * @returns The updated API key record or null if not found
 * @throws Error if key value already exists (when updating key_value)
 */
export async function updateApiKey(id: number, input: UpdateApiKeyInput): Promise<ApiKey | null> {
  const connection = getDatabaseConnection();
  
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const params: (string | number | boolean | Date | null)[] = [];
  let paramIndex = 1;
  
  if (input.key_value !== undefined) {
    updates.push(`key_value = $${paramIndex++}`);
    params.push(input.key_value);
  }
  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name);
  }
  if (input.active !== undefined) {
    updates.push(`active = $${paramIndex++}`);
    params.push(input.active);
  }
  if (input.last_used_at !== undefined) {
    updates.push(`last_used_at = $${paramIndex++}`);
    params.push(input.last_used_at);
  }
  if (input.expires_at !== undefined) {
    updates.push(`expires_at = $${paramIndex++}`);
    params.push(input.expires_at);
  }
  
  if (updates.length === 0) {
    // No fields to update, return existing API key
    return getApiKeyById(id);
  }
  
  params.push(id); // WHERE clause parameter
  
  const query = `
    UPDATE api_keys
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  try {
    const result = await connection.query<ApiKey>(query, params);
    return result.rows[0] || null;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23505') {
      // Unique constraint violation
      throw new Error(`API key with value "${input.key_value}" already exists`);
    }
    throw error;
  }
}

/**
 * Delete an API key by ID
 * @param id API key ID
 * @returns True if API key was deleted, false if not found
 */
export async function deleteApiKey(id: number): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `
    DELETE FROM api_keys
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await connection.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Validate an API key (check if it exists and is active)
 * @param keyValue The API key string to validate
 * @returns The API key record if valid, null otherwise
 */
export async function validateApiKey(keyValue: string): Promise<ApiKey | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM api_keys
    WHERE key_value = $1
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  
  const result = await connection.query<ApiKey>(query, [keyValue]);
  return result.rows[0] || null;
}

/**
 * Update the last_used_at timestamp for an API key
 * @param id API key ID
 * @returns The updated API key record or null if not found
 */
export async function updateApiKeyLastUsed(id: number): Promise<ApiKey | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    UPDATE api_keys
    SET last_used_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  
  const result = await connection.query<ApiKey>(query, [id]);
  return result.rows[0] || null;
}

/**
 * Update the last_used_at timestamp by key value
 * @param keyValue The API key string
 * @returns The updated API key record or null if not found
 */
export async function updateApiKeyLastUsedByValue(keyValue: string): Promise<ApiKey | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    UPDATE api_keys
    SET last_used_at = NOW()
    WHERE key_value = $1
    RETURNING *
  `;
  
  const result = await connection.query<ApiKey>(query, [keyValue]);
  return result.rows[0] || null;
}

/**
 * Deactivate an API key by ID
 * @param id API key ID
 * @returns The updated API key record or null if not found
 */
export async function deactivateApiKey(id: number): Promise<ApiKey | null> {
  return updateApiKey(id, { active: false });
}

/**
 * Activate an API key by ID
 * @param id API key ID
 * @returns The updated API key record or null if not found
 */
export async function activateApiKey(id: number): Promise<ApiKey | null> {
  return updateApiKey(id, { active: true });
}

/**
 * Get total count of API keys
 * @returns Total number of API key records
 */
export async function getApiKeyCount(): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM api_keys`;
  
  const result = await connection.query<{ count: string }>(query);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Get count of active API keys
 * @returns Total number of active API key records
 */
export async function getActiveApiKeyCount(): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT COUNT(*) as count FROM api_keys
    WHERE active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  
  const result = await connection.query<{ count: string }>(query);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Check if an API key exists by value
 * @param keyValue The API key string
 * @returns True if API key exists, false otherwise
 */
export async function apiKeyExists(keyValue: string): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT EXISTS(SELECT 1 FROM api_keys WHERE key_value = $1)`;
  
  const result = await connection.query<{ exists: boolean }>(query, [keyValue]);
  const row = result.rows[0];
  if (!row) {
    return false;
  }
  return row.exists;
}
