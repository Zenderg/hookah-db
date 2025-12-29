/**
 * Brand CRUD Operations
 *
 * Provides create, read, update, delete, and upsert operations for brand records.
 * Uses parameterized queries to prevent SQL injection and handles constraints appropriately.
 *
 * @package @hookah-db/database
 */

import { getDatabaseConnection } from './connection.js';
import { Brand, CreateBrandInput, UpdateBrandInput, PostgresError } from './types.js';

/**
 * Create a new brand record
 * @param input Brand data to insert
 * @returns The created brand record with ID
 * @throws Error if brand name already exists
 */
export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  const connection = getDatabaseConnection();
  
  const query = `
    INSERT INTO brands (name, description, image_url, source_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const params = [
    input.name,
    input.description ?? null,
    input.image_url ?? null,
    input.source_url ?? null,
  ];
  
  try {
    const result = await connection.query<Brand>(query, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create brand');
    }
    return row;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23505') {
      // Unique constraint violation
      throw new Error(`Brand with name "${input.name}" already exists`);
    }
    throw error;
  }
}

/**
 * Get a brand by ID
 * @param id Brand ID
 * @returns The brand record or null if not found
 */
export async function getBrandById(id: number): Promise<Brand | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM brands
    WHERE id = $1
  `;
  
  const result = await connection.query<Brand>(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get all brands with pagination
 * @param limit Maximum number of brands to return (default: 100)
 * @param offset Number of brands to skip (default: 0)
 * @returns Array of brand records
 */
export async function getAllBrands(limit: number = 100, offset: number = 0): Promise<Brand[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM brands
    ORDER BY name ASC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await connection.query<Brand>(query, [limit, offset]);
  return result.rows;
}

/**
 * Search brands by name (case-insensitive partial match)
 * @param searchTerm Search term to match against brand names
 * @param limit Maximum number of results (default: 50)
 * @returns Array of matching brand records
 */
export async function searchBrandsByName(searchTerm: string, limit: number = 50): Promise<Brand[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM brands
    WHERE name ILIKE $1
    ORDER BY name ASC
    LIMIT $2
  `;
  
  const result = await connection.query<Brand>(query, [`%${searchTerm}%`, limit]);
  return result.rows;
}

/**
 * Update a brand by ID
 * @param id Brand ID
 * @param input Fields to update
 * @returns The updated brand record or null if not found
 * @throws Error if brand name already exists (when updating name)
 */
export async function updateBrand(id: number, input: UpdateBrandInput): Promise<Brand | null> {
  const connection = getDatabaseConnection();
  
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const params: (string | number | Date | null)[] = [];
  let paramIndex = 1;
  
  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(input.description);
  }
  if (input.image_url !== undefined) {
    updates.push(`image_url = $${paramIndex++}`);
    params.push(input.image_url);
  }
  if (input.source_url !== undefined) {
    updates.push(`source_url = $${paramIndex++}`);
    params.push(input.source_url);
  }
  
  if (updates.length === 0) {
    // No fields to update, return existing brand
    return getBrandById(id);
  }
  
  params.push(id); // WHERE clause parameter
  
  const query = `
    UPDATE brands
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  try {
    const result = await connection.query<Brand>(query, params);
    return result.rows[0] || null;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23505') {
      // Unique constraint violation
      throw new Error(`Brand with name "${input.name}" already exists`);
    }
    throw error;
  }
}

/**
 * Delete a brand by ID (will cascade to products)
 * @param id Brand ID
 * @returns True if brand was deleted, false if not found
 */
export async function deleteBrand(id: number): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `
    DELETE FROM brands
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await connection.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Upsert a brand (insert or update based on unique name constraint)
 * @param input Brand data to insert or update
 * @returns The created or updated brand record
 */
export async function upsertBrand(input: CreateBrandInput): Promise<Brand> {
  const connection = getDatabaseConnection();
  
  const query = `
    INSERT INTO brands (name, description, image_url, source_url)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (name)
    DO UPDATE SET
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      source_url = EXCLUDED.source_url,
      updated_at = NOW()
    RETURNING *
  `;
  
  const params = [
    input.name,
    input.description ?? null,
    input.image_url ?? null,
    input.source_url ?? null,
  ];
  
  const result = await connection.query<Brand>(query, params);
  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to upsert brand');
  }
  return row;
}

/**
 * Get total count of brands
 * @returns Total number of brand records
 */
export async function getBrandCount(): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM brands`;
  
  const result = await connection.query<{ count: string }>(query);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Check if a brand exists by name
 * @param name Brand name
 * @returns True if brand exists, false otherwise
 */
export async function brandExists(name: string): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT EXISTS(SELECT 1 FROM brands WHERE name = $1)`;
  
  const result = await connection.query<{ exists: boolean }>(query, [name]);
  const row = result.rows[0];
  if (!row) {
    return false;
  }
  return row.exists;
}
