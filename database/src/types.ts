/**
 * Database Entity Types
 *
 * TypeScript interfaces for all database entities in hookah tobacco database.
 * These types define of structure of data stored in PostgreSQL tables.
 *
 * @package @hookah-db/database
 */

/**
 * Brand entity representing a tobacco brand or manufacturer.
 */
export interface Brand {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Product entity representing an individual tobacco product or flavor.
 */
export interface Product {
  id: number;
  brand_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * API Key entity representing a client authentication credential.
 */
export interface ApiKey {
  id: number;
  key_value: string;
  name: string;
  active: boolean;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date | null;
}

/**
 * Scraping Metadata entity tracking information about scraping operations.
 */
export interface ScrapingMetadata {
  id: number;
  operation_type: 'full_refresh' | 'incremental_update';
  status: 'in_progress' | 'completed' | 'failed';
  started_at: Date;
  completed_at: Date | null;
  brands_processed: number;
  products_processed: number;
  error_count: number;
  error_details: string | null;
}

/**
 * Type for creating a new brand record (without auto-generated fields).
 */
export interface CreateBrandInput {
  name: string;
  description?: string | null;
  image_url?: string | null;
  source_url?: string | null;
}

/**
 * Type for creating a new product record (without auto-generated fields).
 */
export interface CreateProductInput {
  brand_id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  source_url?: string | null;
}

/**
 * Type for creating a new API key record (without auto-generated fields).
 */
export interface CreateApiKeyInput {
  key_value: string;
  name: string;
  active?: boolean;
  expires_at?: Date | null;
}

/**
 * Type for creating a new scraping metadata record (without auto-generated fields).
 */
export interface CreateScrapingMetadataInput {
  operation_type: 'full_refresh' | 'incremental_update';
  status?: 'in_progress' | 'completed' | 'failed';
  started_at?: Date;
  brands_processed?: number;
  products_processed?: number;
  error_count?: number;
  error_details?: string | null;
}

/**
 * Type for updating a brand record.
 */
export interface UpdateBrandInput {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  source_url?: string | null;
}

/**
 * Type for updating a product record.
 */
export interface UpdateProductInput {
  brand_id?: number;
  name?: string;
  description?: string | null;
  image_url?: string | null;
  source_url?: string | null;
}

/**
 * Type for updating an API key record.
 */
export interface UpdateApiKeyInput {
  key_value?: string;
  name?: string;
  active?: boolean;
  last_used_at?: Date | null;
  expires_at?: Date | null;
}

/**
 * Type for updating a scraping metadata record.
 */
export interface UpdateScrapingMetadataInput {
  operation_type?: 'full_refresh' | 'incremental_update';
  status?: 'in_progress' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date | null;
  brands_processed?: number;
  products_processed?: number;
  error_count?: number;
  error_details?: string | null;
}

/**
 * PostgreSQL error interface
 */
export interface PostgresError extends Error {
  code?: string;
  detail?: string;
  schema?: string;
  table?: string;
  constraint?: string;
}
