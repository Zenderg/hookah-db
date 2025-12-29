/**
 * Product CRUD Operations
 *
 * Provides create, read, update, delete, and upsert operations for product records.
 * Uses parameterized queries to prevent SQL injection and handles constraints appropriately.
 *
 * @package @hookah-db/database
 */

import { getDatabaseConnection } from './connection.js';
import { Product, CreateProductInput, UpdateProductInput, PostgresError } from './types.js';

/**
 * Create a new product record
 * @param input Product data to insert
 * @returns The created product record with ID
 * @throws Error if brand doesn't exist or product name already exists for brand
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const connection = getDatabaseConnection();
  
  const query = `
    INSERT INTO products (brand_id, name, description, image_url, source_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const params = [
    input.brand_id,
    input.name,
    input.description ?? null,
    input.image_url ?? null,
    input.source_url ?? null,
  ];
  
  try {
    const result = await connection.query<Product>(query, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create product');
    }
    return row;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23505') {
      // Unique constraint violation on (brand_id, name)
      throw new Error(`Product with name "${input.name}" already exists for brand ID ${input.brand_id}`);
    }
    if (pgError.code === '23503') {
      // Foreign key violation - brand doesn't exist
      throw new Error(`Brand with ID ${input.brand_id} does not exist`);
    }
    throw error;
  }
}

/**
 * Get a product by ID
 * @param id Product ID
 * @returns The product record or null if not found
 */
export async function getProductById(id: number): Promise<Product | null> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM products
    WHERE id = $1
  `;
  
  const result = await connection.query<Product>(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get all products for a specific brand
 * @param brandId Brand ID
 * @param limit Maximum number of products to return (default: 100)
 * @param offset Number of products to skip (default: 0)
 * @returns Array of product records
 */
export async function getProductsByBrandId(
  brandId: number,
  limit: number = 100,
  offset: number = 0
): Promise<Product[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM products
    WHERE brand_id = $1
    ORDER BY name ASC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await connection.query<Product>(query, [brandId, limit, offset]);
  return result.rows;
}

/**
 * Get all products with pagination
 * @param limit Maximum number of products to return (default: 100)
 * @param offset Number of products to skip (default: 0)
 * @returns Array of product records
 */
export async function getAllProducts(limit: number = 100, offset: number = 0): Promise<Product[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM products
    ORDER BY brand_id ASC, name ASC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await connection.query<Product>(query, [limit, offset]);
  return result.rows;
}

/**
 * Search products by name (case-insensitive partial match)
 * @param searchTerm Search term to match against product names
 * @param limit Maximum number of results (default: 50)
 * @returns Array of matching product records
 */
export async function searchProductsByName(searchTerm: string, limit: number = 50): Promise<Product[]> {
  const connection = getDatabaseConnection();
  
  const query = `
    SELECT * FROM products
    WHERE name ILIKE $1
    ORDER BY name ASC
    LIMIT $2
  `;
  
  const result = await connection.query<Product>(query, [`%${searchTerm}%`, limit]);
  return result.rows;
}

/**
 * Update a product by ID
 * @param id Product ID
 * @param input Fields to update
 * @returns The updated product record or null if not found
 * @throws Error if brand doesn't exist or product name already exists for brand
 */
export async function updateProduct(id: number, input: UpdateProductInput): Promise<Product | null> {
  const connection = getDatabaseConnection();
  
  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const params: (string | number | Date | null)[] = [];
  let paramIndex = 1;
  
  if (input.brand_id !== undefined) {
    updates.push(`brand_id = $${paramIndex++}`);
    params.push(input.brand_id);
  }
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
    // No fields to update, return existing product
    return getProductById(id);
  }
  
  params.push(id); // WHERE clause parameter
  
  const query = `
    UPDATE products
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  try {
    const result = await connection.query<Product>(query, params);
    return result.rows[0] || null;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23505') {
      // Unique constraint violation on (brand_id, name)
      throw new Error(
        `Product with name "${input.name}" already exists for brand ID ${input.brand_id}`
      );
    }
    if (pgError.code === '23503') {
      // Foreign key violation - brand doesn't exist
      throw new Error(`Brand with ID ${input.brand_id} does not exist`);
    }
    throw error;
  }
}

/**
 * Delete a product by ID
 * @param id Product ID
 * @returns True if product was deleted, false if not found
 */
export async function deleteProduct(id: number): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `
    DELETE FROM products
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await connection.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Upsert a product (insert or update based on unique (brand_id, name) constraint)
 * @param input Product data to insert or update
 * @returns The created or updated product record
 * @throws Error if brand doesn't exist
 */
export async function upsertProduct(input: CreateProductInput): Promise<Product> {
  const connection = getDatabaseConnection();
  
  const query = `
    INSERT INTO products (brand_id, name, description, image_url, source_url)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (brand_id, name)
    DO UPDATE SET
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      source_url = EXCLUDED.source_url,
      updated_at = NOW()
    RETURNING *
  `;
  
  const params = [
    input.brand_id,
    input.name,
    input.description ?? null,
    input.image_url ?? null,
    input.source_url ?? null,
  ];
  
  try {
    const result = await connection.query<Product>(query, params);
    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to upsert product');
    }
    return row;
  } catch (error) {
    const pgError = error as PostgresError;
    if (pgError.code === '23503') {
      // Foreign key violation - brand doesn't exist
      throw new Error(`Brand with ID ${input.brand_id} does not exist`);
    }
    throw error;
  }
}

/**
 * Get total count of products
 * @returns Total number of product records
 */
export async function getProductCount(): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM products`;
  
  const result = await connection.query<{ count: string }>(query);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Get total count of products for a specific brand
 * @param brandId Brand ID
 * @returns Total number of product records for brand
 */
export async function getProductCountByBrandId(brandId: number): Promise<number> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT COUNT(*) as count FROM products WHERE brand_id = $1`;
  
  const result = await connection.query<{ count: string }>(query, [brandId]);
  const row = result.rows[0];
  if (!row) {
    return 0;
  }
  return parseInt(row.count, 10);
}

/**
 * Check if a product exists by brand ID and name
 * @param brandId Brand ID
 * @param name Product name
 * @returns True if product exists, false otherwise
 */
export async function productExists(brandId: number, name: string): Promise<boolean> {
  const connection = getDatabaseConnection();
  
  const query = `SELECT EXISTS(SELECT 1 FROM products WHERE brand_id = $1 AND name = $2)`;
  
  const result = await connection.query<{ exists: boolean }>(query, [brandId, name]);
  const row = result.rows[0];
  if (!row) {
    return false;
  }
  return row.exists;
}
