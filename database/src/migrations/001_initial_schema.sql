-- Migration: 001_initial_schema
-- Description: Create initial database schema for brands, products, api_keys, and scraping_metadata tables
-- Created: Phase 2.1 - Database Schema Design

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(2048),
    source_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT brands_name_not_null CHECK (name IS NOT NULL AND name <> '')
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(2048),
    source_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT products_brand_id_not_null CHECK (brand_id IS NOT NULL),
    CONSTRAINT products_name_not_null CHECK (name IS NOT NULL AND name <> ''),
    CONSTRAINT products_brand_name_unique UNIQUE (brand_id, name)
);

-- Create foreign key constraint for products.brand_id
ALTER TABLE products
ADD CONSTRAINT products_brand_id_fkey
FOREIGN KEY (brand_id)
REFERENCES brands(id)
ON DELETE CASCADE;

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_value VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    CONSTRAINT api_keys_key_value_not_null CHECK (key_value IS NOT NULL AND key_value <> ''),
    CONSTRAINT api_keys_name_not_null CHECK (name IS NOT NULL AND name <> '')
);

-- Create scraping_metadata table
CREATE TABLE IF NOT EXISTS scraping_metadata (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    brands_processed INTEGER NOT NULL DEFAULT 0,
    products_processed INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_details TEXT,
    CONSTRAINT scraping_metadata_operation_type_check
        CHECK (operation_type IN ('full_refresh', 'incremental_update')),
    CONSTRAINT scraping_metadata_status_check
        CHECK (status IN ('in_progress', 'completed', 'failed')),
    CONSTRAINT scraping_metadata_operation_type_not_null CHECK (operation_type IS NOT NULL),
    CONSTRAINT scraping_metadata_status_not_null CHECK (status IS NOT NULL)
);

-- Create indexes for brands table
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands(created_at);
CREATE INDEX IF NOT EXISTS idx_brands_updated_at ON brands(updated_at);

-- Create indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand_name ON products(brand_id, name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- Create indexes for scraping_metadata table
CREATE INDEX IF NOT EXISTS idx_scraping_metadata_operation_type ON scraping_metadata(operation_type);
CREATE INDEX IF NOT EXISTS idx_scraping_metadata_status ON scraping_metadata(status);
CREATE INDEX IF NOT EXISTS idx_scraping_metadata_started_at ON scraping_metadata(started_at);
CREATE INDEX IF NOT EXISTS idx_scraping_metadata_completed_at ON scraping_metadata(completed_at);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for brands and products tables
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for active API keys
CREATE OR REPLACE VIEW active_api_keys AS
SELECT id, key_value, name, created_at, last_used_at, expires_at
FROM api_keys
WHERE active = TRUE
AND (expires_at IS NULL OR expires_at > NOW());

-- Create a view for recent scraping operations
CREATE OR REPLACE VIEW recent_scraping_operations AS
SELECT id, operation_type, status, started_at, completed_at,
       brands_processed, products_processed, error_count
FROM scraping_metadata
ORDER BY started_at DESC
LIMIT 100;
