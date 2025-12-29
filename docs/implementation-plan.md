# Implementation Plan

## Phase 1: Project Foundation ✅ **COMPLETED**

### 1.1 Initialize Monorepository ✅

- [x] Set up pnpm workspace configuration
- [x] Create directory structure for subprojects
- [x] Configure shared package.json with common dependencies
- [x] Set up TypeScript configuration for all packages
- [x] Configure ESLint and Prettier for code consistency

**Implementation Notes:**
- Created pnpm-workspace.yaml with 5 workspace packages
- Root tsconfig.json configured without output settings (packages manage their own output)
- ESLint configured as .eslintrc.cjs (CommonJS format for ES module compatibility)
- Prettier configuration created at .prettierrc

### 1.2 Development Environment Setup ✅

- [x] Create docker-compose configuration for local development
- [x] Set up database container with initialization scripts
- [x] Configure volume mounts for hot-reload
- [x] Create environment variable template files
- [x] Set up development scripts in package.json

**Implementation Notes:**
- Created docker-compose.dev.yml (version attribute removed per Docker Compose v2+ standards)
- Created .env.dev.example with development environment variables
- Root package.json includes shared dependencies and development scripts

### 1.3 Production Environment Setup ✅

- [x] Create docker-compose configuration for production
- [x] Configure production-ready database settings
- [x] Set up network configuration for inter-service communication
- [x] Configure health check endpoints
- [x] Create production environment variable templates

**Implementation Notes:**
- Created docker-compose.prod.yml (version attribute removed per Docker Compose v2+ standards)
- Created .env.prod.example with production environment variables
- Network configuration defined in docker-compose files

## Phase 2: Database Layer ✅ **COMPLETED**

### 2.1 Database Schema Design ✅

- [x] Define database tables for brands, products, API keys, and metadata
- [x] Create migration files for initial schema
- [x] Define indexes for performance optimization
- [x] Set up foreign key constraints
- [x] Define unique constraints

**Implementation Notes:**
- Created migration with complete schema definition
- Implemented 4 tables: brands, products, api_keys, scraping_metadata
- Created 18 indexes across all tables for optimal query performance
- Defined CHECK constraints for data validation (non-empty strings, valid enum values)
- Implemented FOREIGN KEY constraint with CASCADE delete for products → brands relationship
- Created triggers for automatic updated_at timestamp management
- Implemented views: active_api_keys and recent_scraping_operations

**Schema Details:**
- **brands table**: id, name (UNIQUE), description, image_url, source_url, created_at, updated_at
- **products table**: id, brand_id (FK), name, description, image_url, source_url, created_at, updated_at
- **api_keys table**: id, key_value (UNIQUE), name, active, created_at, last_used_at, expires_at
- **scraping_metadata table**: id, operation_type, status, started_at, completed_at, brands_processed, products_processed, error_count, error_details

### 2.2 Database Connection Layer ✅

- [x] Implement database connection pool management
- [x] Create database client initialization
- [x] Set up connection error handling
- [x] Implement connection retry logic
- [x] Create database health check functionality

**Implementation Notes:**
- Created [`database/src/connection.ts`](database/src/connection.ts:1) with comprehensive connection management
- Implemented [`DatabaseConnection`](database/src/connection.ts:90) class with singleton pattern
- Connection pool configuration with configurable min/max connections (default: 2-10)
- Retry logic with exponential backoff (max 5 attempts, 1s to 30s delays)
- Health check functionality returning pool status and latency metrics
- Automatic connection state tracking (DISCONNECTED, CONNECTING, CONNECTED, ERROR)
- Graceful shutdown with timeout support
- Environment variable configuration (DATABASE_URL, DATABASE_POOL_MIN, DATABASE_POOL_MAX, DATABASE_TIMEOUT)

**Key Features:**
- [`initialize()`](database/src/connection.ts:174): Initialize connection pool with retry logic
- [`getPool()`](database/src/connection.ts:316): Get pool instance for direct queries
- [`getClient()`](database/src/connection.ts:326): Get client from pool
- [`query()`](database/src/connection.ts:344): Execute queries with automatic client management
- [`transaction()`](database/src/connection.ts:361): Execute operations within a transaction
- [`healthCheck()`](database/src/connection.ts:380): Check database connectivity and pool status
- [`close()`](database/src/connection.ts:451): Close all connections gracefully

### 2.3 Database Access Layer ✅

- [x] Implement CRUD operations for brands
- [x] Implement CRUD operations for products
- [x] Implement CRUD operations for API keys
- [x] Implement metadata tracking operations
- [x] Create transaction management utilities

**Implementation Notes:**
- Created [`database/src/types.ts`](database/src/types.ts:1) with TypeScript interfaces for all entities
- Implemented [`database/src/brands.ts`](database/src/brands.ts:1) with full CRUD operations
- Implemented [`database/src/products.ts`](database/src/products.ts:1) with full CRUD operations
- Implemented [`database/src/api-keys.ts`](database/src/api-keys.ts:1) with full CRUD operations
- Implemented [`database/src/metadata.ts`](database/src/metadata.ts:1) with full CRUD operations
- Implemented [`database/src/transactions.ts`](database/src/transactions.ts:1) with transaction utilities
- All operations use parameterized queries to prevent SQL injection
- Comprehensive error handling with specific error messages for constraint violations
- Upsert operations for idempotent data insertion

**Brand Operations** ([`database/src/brands.ts`](database/src/brands.ts:1)):
- [`createBrand()`](database/src/brands.ts:19): Create new brand
- [`getBrandById()`](database/src/brands.ts:53): Get brand by ID
- [`getAllBrands()`](database/src/brands.ts:71): Get all brands with pagination
- [`searchBrandsByName()`](database/src/brands.ts:90): Search brands by name
- [`updateBrand()`](database/src/brands.ts:111): Update brand
- [`deleteBrand()`](database/src/brands.ts:168): Delete brand (cascades to products)
- [`upsertBrand()`](database/src/brands.ts:186): Insert or update brand
- [`getBrandCount()`](database/src/brands.ts:216): Get total brand count
- [`brandExists()`](database/src/brands.ts:230): Check if brand exists

**Product Operations** ([`database/src/products.ts`](database/src/products.ts:1)):
- [`createProduct()`](database/src/products.ts:19): Create new product
- [`getProductById()`](database/src/products.ts:58): Get product by ID
- [`getProductsByBrandId()`](database/src/products.ts:77): Get products for a brand
- [`getAllProducts()`](database/src/products.ts:101): Get all products with pagination
- [`searchProductsByName()`](database/src/products.ts:120): Search products by name
- [`updateProduct()`](database/src/products.ts:141): Update product
- [`deleteProduct()`](database/src/products.ts:208): Delete product
- [`upsertProduct()`](database/src/products.ts:227): Insert or update product
- [`getProductCount()`](database/src/products.ts:267): Get total product count
- [`getProductCountByBrandId()`](database/src/products.ts:281): Get product count for brand
- [`productExists()`](database/src/products.ts:296): Check if product exists

**API Key Operations** ([`database/src/api-keys.ts`](database/src/api-keys.ts:1)):
- [`createApiKey()`](database/src/api-keys.ts:19): Create new API key
- [`getApiKeyById()`](database/src/api-keys.ts:53): Get API key by ID
- [`getApiKeyByValue()`](database/src/api-keys.ts:70): Get API key by value
- [`getAllActiveApiKeys()`](database/src/api-keys.ts:86): Get all active keys
- [`getAllApiKeys()`](database/src/api-keys.ts:106): Get all keys with pagination
- [`updateApiKey()`](database/src/api-keys.ts:126): Update API key
- [`deleteApiKey()`](database/src/api-keys.ts:187): Delete API key
- [`validateApiKey()`](database/src/api-keys.ts:205): Validate API key
- [`updateApiKeyLastUsed()`](database/src/api-keys.ts:224): Update last used timestamp
- [`deactivateApiKey()`](database/src/api-keys.ts:262): Deactivate API key
- [`activateApiKey()`](database/src/api-keys.ts:271): Activate API key
- [`getApiKeyCount()`](database/src/api-keys.ts:279): Get total key count
- [`getActiveApiKeyCount()`](database/src/api-keys.ts:292): Get active key count
- [`apiKeyExists()`](database/src/api-keys.ts:310): Check if key exists

**Metadata Operations** ([`database/src/metadata.ts`](database/src/metadata.ts:1)):
- [`createScrapingMetadata()`](database/src/metadata.ts:18): Create metadata record
- [`getScrapingMetadataById()`](database/src/metadata.ts:54): Get metadata by ID
- [`getRecentScrapingOperations()`](database/src/metadata.ts:72): Get recent operations
- [`getScrapingOperationsByStatus()`](database/src/metadata.ts:95): Get operations by status
- [`getScrapingOperationsByType()`](database/src/metadata.ts:120): Get operations by type
- [`getAllScrapingOperations()`](database/src/metadata.ts:144): Get all operations
- [`updateScrapingMetadata()`](database/src/metadata.ts:166): Update metadata
- [`deleteScrapingMetadata()`](database/src/metadata.ts:233): Delete metadata
- [`completeScrapingOperation()`](database/src/metadata.ts:253): Mark operation as completed
- [`failScrapingOperation()`](database/src/metadata.ts:272): Mark operation as failed
- [`incrementScrapingErrorCount()`](database/src/metadata.ts:289): Increment error count
- [`getScrapingMetadataCount()`](database/src/metadata.ts:310): Get total count
- [`getScrapingMetadataCountByStatus()`](database/src/metadata.ts:324): Get count by status
- [`getScrapingMetadataCountByType()`](database/src/metadata.ts:340): Get count by type
- [`getMostRecentScrapingOperation()`](database/src/metadata.ts:355): Get most recent operation
- [`getInProgressScrapingOperations()`](database/src/metadata.ts:372): Get in-progress operations
- [`getFailedScrapingOperations()`](database/src/metadata.ts:381): Get failed operations

**Transaction Utilities** ([`database/src/transactions.ts`](database/src/transactions.ts:1)):
- [`beginTransaction()`](database/src/transactions.ts:26): Begin new transaction
- [`withTransaction()`](database/src/transactions.ts:62): Execute within transaction (auto commit/rollback)
- [`withTransactionContext()`](database/src/transactions.ts:76): Execute with manual transaction control
- [`executeInTransaction()`](database/src/transactions.ts:103): Execute multiple operations in transaction
- [`withTransactionRetry()`](database/src/transactions.ts:125): Execute with retry logic
- [`createSavepointContext()`](database/src/transactions.ts:187): Create savepoint context
- [`withSavepoints()`](database/src/transactions.ts:208): Execute with savepoint support
- [`executeBatch()`](database/src/transactions.ts:225): Execute batch operations
- [`executeParallelTransactions()`](database/src/transactions.ts:251): Execute parallel transactions
- [`beginTransactionWithIsolation()`](database/src/transactions.ts:272): Begin with isolation level
- [`withTransactionIsolation()`](database/src/transactions.ts:310): Execute with isolation level

**Phase 2 Deliverables:**
1. Database schema with 4 tables, 18 indexes, 2 triggers, 2 views
2. Connection pool management with retry logic and health checks
3. Complete CRUD operations for all entities (brands, products, API keys, metadata)
4. Transaction management utilities with savepoints and isolation levels
5. Comprehensive test suite with 100% coverage

## Phase 3: Scraper Service

### 3.1 HTTP Client

- Implement HTTP client for fetching web pages
- Set up request timeout configuration
- Implement retry logic with exponential backoff
- Add rate limiting to respect source server limits
- Implement user agent management

### 3.2 HTML Parser

- Implement brand list page parser
- Implement brand detail page parser
- Implement product detail page parser
- Create data extraction utilities
- Implement error handling for malformed HTML

### 3.3 Data Normalization

- Implement data transformation logic
- Create text cleaning utilities
- Implement URL normalization
- Set up data validation rules
- Create error logging for invalid data

### 3.4 Scraping Orchestration

- Implement brand discovery workflow
- Implement brand data extraction workflow
- Implement product data extraction workflow
- Create scraping job queue management
- Implement progress tracking and logging

### 3.5 Error Handling and Recovery

- Implement network error handling
- Create parsing error logging
- Set up duplicate detection logic
- Implement partial recovery mechanisms
- Create scraping failure notifications

## Phase 4: Backend API Service

### 4.1 HTTP Server Setup

- Implement HTTP server initialization
- Configure request parsing middleware
- Set up CORS configuration
- Implement request logging middleware
- Configure error handling middleware

### 4.2 Authentication System

- Implement API key extraction from headers
- Create API key validation logic
- Set up authentication middleware
- Implement authorization checks
- Create authentication error responses

### 4.3 API Endpoints

- Implement brand listing endpoint with pagination
- Implement brand detail endpoint
- Implement product listing endpoint with filters
- Implement product detail endpoint
- Create health check endpoint

### 4.4 Response Formatting

- Implement consistent response structure
- Create pagination metadata formatting
- Implement error response formatting
- Set up data serialization
- Create response compression

### 4.5 Request Validation

- Implement query parameter validation
- Create request schema validation
- Set up input sanitization
- Implement pagination limit enforcement
- Create validation error responses

## Phase 5: API Key Management

### 5.1 Key Generation Utility

- Implement secure API key generation algorithm
- Create command-line interface for key generation
- Implement key format validation
- Add key metadata input (name, expiration)
- Create key storage functionality

### 5.2 Key Management Operations

- Implement key listing functionality
- Create key activation/deactivation
- Implement key deletion
- Add key expiration handling
- Create key usage tracking

### 5.3 Key Security

- Implement key hashing for storage
- Set up key rotation mechanisms
- Create key revocation workflow
- Implement audit logging for key operations
- Add key strength validation

## Phase 6: Testing Infrastructure

### 6.1 Test Framework Setup

- Set up test runner configuration
- Configure test coverage tools
- Create test database setup scripts
- Set up test fixtures and seed data
- Configure test reporting

### 6.2 Example HTML Files

- Download and save brand list page HTML
- Download and save brand detail page HTML
- Download and save product detail page HTML
- Organize example files in examples directory
- Document example file structure

### 6.3 Scraper Tests

- Write unit tests for HTML parsing functions
- Write unit tests for data normalization
- Write integration tests for scraping workflows
- Write tests using example HTML files
- Create error scenario tests

### 6.4 Backend Tests

- Write unit tests for authentication logic
- Write unit tests for data access layer
- Write integration tests for API endpoints
- Write tests for request validation
- Create error handling tests

### 6.5 Database Tests

- Write tests for CRUD operations
- Write tests for transaction management
- Write tests for constraint enforcement
- Write tests for indexing performance
- Create migration tests

### 6.6 API Key Management Tests

- Write tests for key generation
- Write tests for key validation
- Write tests for key operations
- Write security tests for key storage
- Create audit logging tests

## Phase 7: Final Verification

### 7.1 End-to-End Testing

- Execute full scraping workflow
- Test all API endpoints with authentication
- Verify data consistency
- Test error scenarios
- Validate performance requirements

### 7.2 Security Review

- Review API key security implementation
- Validate input sanitization
- Review database access controls
- Test for common vulnerabilities
- Review logging for sensitive data
