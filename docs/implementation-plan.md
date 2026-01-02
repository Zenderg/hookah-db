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

### 3.1 HTTP Client ✅ **COMPLETED**

- [x] Implement HTTP client for fetching web pages
- [x] Set up request timeout configuration
- [x] Implement retry logic with exponential backoff
- [x] Add rate limiting to respect source server limits
- [x] Implement user agent management
- [x] Support iterative requests for dynamic loading scenarios
- [x] Implement request state tracking across iterations

**Implementation Notes:**
- Created [`scraper/src/http-client.ts`](scraper/src/http-client.ts:1) with comprehensive HTTP client implementation
- Implemented [`HttpClient`](scraper/src/http-client.ts:192) class with singleton pattern
- Request timeout configuration with configurable global and per-request timeouts
- Retry logic with exponential backoff (base delay, max delay, jitter)
- Rate limiting using token bucket algorithm (configurable RPS and burst capacity)
- User agent rotation through configurable list of browser user agents
- Iterative request support with state tracking (iteration number, continuation tokens)
- Request history tracking (URL, timestamp, status, duration, retry count)
- Discovered items tracking for duplicate detection
- Checkpoint creation and restoration for resumability
- Environment variable configuration (SCRAPER_REQUEST_TIMEOUT, SCRAPER_MAX_RETRIES, etc.)
- Created [`scraper/test/http-client.test.ts`](scraper/test/http-client.test.ts:1) with 54 comprehensive tests
- Test coverage: 97.24% (54 tests, 100% pass rate)

**Key Features:**
- [`fetch()`](scraper/src/http-client.ts:255): Core HTTP GET request method with retry and rate limiting
- [`fetchIterative()`](scraper/src/http-client.ts:329): Iterative request support for dynamic loading
- [`waitForRateLimit()`](scraper/src/http-client.ts:503): Rate limiting enforcement
- [`getUserAgent()`](scraper/src/http-client.ts:534): User agent rotation
- [`createCheckpoint()`](scraper/src/http-client.ts:654): Checkpoint creation for resumability
- [`restoreCheckpoint()`](scraper/src/http-client.ts:669): Checkpoint restoration
- [`getIterationState()`](scraper/src/http-client.ts:562): Iteration state tracking
- [`getRequestHistory()`](scraper/src/http-client.ts:612): Request history retrieval

**Retry Logic Implementation:**
- Exponential backoff with configurable base delay (default: 1000ms)
- Maximum retry delay cap (default: 30000ms)
- Jitter calculation (±25% of capped delay) to prevent thundering herd
- Transient error detection (timeouts, network errors, 5xx errors, 429 rate limit)
- Smart retry decision based on error type and status code
- Configurable maximum retry attempts (default: 3)

**Rate Limiting Implementation:**
- Token bucket algorithm for precise rate control
- Configurable requests per second (default: 2 RPS)
- Configurable burst capacity (default: 5 requests)
- Automatic token refill based on elapsed time
- Respect for server rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset)
- Token count monitoring for debugging

**User Agent Management:**
- Rotating user agents from configurable list
- Default browser user agents (Chrome, Firefox, Safari on Windows, macOS, Linux)
- Per-request custom user agent support
- Environment variable configuration for custom user agent lists

**Iterative Request Support:**
- State tracking across iterations (iteration number, total items, last timestamp)
- Continuation token support for cursor-based pagination
- Page-based pagination support
- Automatic iteration state updates
- Checkpoint creation for resumable scraping

**Request State Tracking:**
- Request history (URL, timestamp, status, duration, retry count)
- Discovered items set for duplicate detection
- Iteration state management
- Rate limiter token count monitoring

**Environment Variables:**
- `SCRAPER_REQUEST_TIMEOUT`: Request timeout in milliseconds (default: 30000)
- `SCRAPER_MAX_RETRIES`: Maximum retry attempts (default: 3)
- `SCRAPER_RETRY_DELAY_BASE`: Base delay for exponential backoff in ms (default: 1000)
- `SCRAPER_RETRY_DELAY_MAX`: Maximum retry delay in ms (default: 30000)
- `SCRAPER_RATE_LIMIT_RPS`: Requests per second (default: 2)
- `SCRAPER_RATE_LIMIT_BURST`: Burst capacity (default: 5)
- `SCRAPER_USER_AGENTS`: Comma-separated list of user agents for rotation

**Phase 3.1 Deliverables:**
1. Comprehensive HTTP client with retry logic and rate limiting
2. User agent rotation mechanism
3. Iterative request support for dynamic loading
4. Request state tracking and history
5. Checkpoint creation and restoration
6. Discovered items tracking for duplicate detection
7. Comprehensive test suite (54 tests, 97.24% coverage)

### 3.2 HTML Parser ✅ **COMPLETED**

- [x] Implement brand list page parser (initial load)
- [x] Implement brand list page parser (subsequent loads)
- [x] Implement brand detail page parser (initial load)
- [x] Implement brand detail page parser (subsequent loads)
- [x] Implement product detail page parser
- [x] Create data extraction utilities
- [x] Implement error handling for malformed HTML
- [x] Implement detection of pagination/infinite scroll mechanisms
- [x] Implement completion detection logic for dynamic lists

**Implementation Notes:**
- Created [`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1) with comprehensive HTML parsing implementation
- Created [`scraper/src/types.ts`](scraper/src/types.ts:1) with TypeScript interfaces for parser data structures
- Created [`scraper/src/parser-error.ts`](scraper/src/parser-error.ts:1) with custom error class for parsing failures
- Implemented [`parseBrandList()`](scraper/src/html-parser.ts:135): Extracts brands from listing pages with HTMX pagination support
- Implemented [`parseBrandDetail()`](scraper/src/html-parser.ts:250): Extracts detailed brand information
- Implemented [`parseProductList()`](scraper/src/html-parser.ts:307): Extracts products from brand pages with pagination
- Implemented [`parseProductDetail()`](scraper/src/html-parser.ts:421): Extracts detailed product information
- Implemented [`isBrandDiscoveryComplete()`](scraper/src/html-parser.ts:477): Checks if all brands have been discovered
- Implemented [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511): Checks if all products have been discovered
- Implemented [`parseHTMXPagination()`](scraper/src/html-parser.ts:88): Extracts HTMX pagination metadata
- Implemented utility functions: [`cleanText()`](scraper/src/html-parser.ts:29), [`normalizeUrl()`](scraper/src/html-parser.ts:43), [`extractSlug()`](scraper/src/html-parser.ts:70)
- Comprehensive error handling with [`ParseError`](scraper/src/parser-error.ts:12) class including element context and HTML preview
- Graceful handling of missing optional fields (description, image URL)
- Skips invalid items while continuing to parse valid ones
- HTMX pagination detection using data attributes (data-target, data-offset, data-count, data-total-count)
- Completion detection based on offset + items >= totalCount

**Key Design Decisions:**

1. **Cheerio for HTML Parsing**: Selected cheerio for its jQuery-like API and server-side compatibility
2. **Graceful Degradation**: Parser continues processing even when individual items fail to parse
3. **Optional Fields**: Description and image URL are optional; parser handles missing values gracefully
4. **HTMX Pagination Support**: Explicitly parses HTMX data attributes for pagination metadata
5. **Error Context**: ParseError includes selector and HTML preview for debugging
6. **Slug-Based URLs**: Constructs source URLs from slugs for consistency
7. **English Name Preference**: For brands with multiple name spans, prefers last (English) name

**Test Coverage:**
- Created [`scraper/test/html-parser.test.ts`](scraper/test/html-parser.test.ts:1) with 92 comprehensive tests
- Test coverage: 91.99%
- Test pass rate: 100% (92/92 tests passing)
- All regression tests passed (334 total tests, no failures)
- No breaking changes to existing code

**Test Categories:**
- Utility functions tests (cleanText, normalizeUrl, extractSlug)
- ParseError class tests
- Brand list parser tests (including example HTML file)
- Brand detail parser tests (including example HTML file)
- Product list parser tests (including example HTML file)
- Product detail parser tests (including example HTML file)
- Completion detection tests (brands and products)
- Edge cases and error scenarios

**Phase 3.2 Deliverables:**
1. Complete HTML parser implementation with 9 parsing functions
2. Custom error class with context for debugging
3. TypeScript type definitions for parser data structures
4. Comprehensive test suite (92 tests, 91.99% coverage)
5. Support for HTMX pagination metadata
6. Completion detection for dynamic loading
7. Graceful error handling and recovery

### 3.3 Data Normalization and Duplicate Detection ✅ **COMPLETED**

- [x] Implement data transformation logic
- [x] Create text cleaning utilities
- [x] Implement URL normalization
- [x] Set up data validation rules
- [x] Create error logging for invalid data
- [x] Implement duplicate detection across iterations

**Implementation Notes:**
- Created [`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1) with comprehensive data normalization implementation
- Created [`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1) with efficient duplicate detection using Set and Map
- Updated [`scraper/src/types.ts`](scraper/src/types.ts:1) with NormalizedBrand, NormalizedProduct, NormalizedBrandDetail, NormalizedProductDetail, ValidationResult, and DuplicateDetector interfaces
- Implemented [`cleanText()`](scraper/src/data-normalizer.ts:45): Normalizes text by removing extra whitespace and normalizing line breaks
- Implemented [`normalizeUrl()`](scraper/src/data-normalizer.ts:73): Converts relative URLs to absolute URLs and removes tracking parameters
- Implemented [`normalizeBrandData()`](scraper/src/data-normalizer.ts:212): Transforms parsed brand data to normalized format
- Implemented [`normalizeProductData()`](scraper/src/data-normalizer.ts:237): Transforms parsed product data to normalized format
- Implemented [`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264): Transforms parsed brand detail data to normalized format
- Implemented [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289): Transforms parsed product detail data to normalized format
- Implemented [`validateBrandData()`](scraper/src/data-normalizer.ts:316): Validates normalized brand data against business rules
- Implemented [`validateProductData()`](scraper/src/data-normalizer.ts:366): Validates normalized product data against business rules
- Implemented [`logInvalidData()`](scraper/src/data-normalizer.ts:422): Logs invalid data with detailed error information
- Implemented [`createDuplicateDetector()`](scraper/src/duplicate-detector.ts:44): Creates new duplicate detector instance
- Implemented [`addBrand()`](scraper/src/duplicate-detector.ts:69): Adds brand to detector and checks for duplicates
- Implemented [`addProduct()`](scraper/src/duplicate-detector.ts:101): Adds product to detector and checks for duplicates
- Implemented [`hasBrand()`](scraper/src/duplicate-detector.ts:139): Checks if brand exists in detector
- Implemented [`hasProduct()`](scraper/src/duplicate-detector.ts:159): Checks if product exists in detector
- Implemented [`getBrandCount()`](scraper/src/duplicate-detector.ts:179): Gets total count of tracked brands
- Implemented [`getProductCount()`](scraper/src/duplicate-detector.ts:195): Gets total count of tracked products
- Implemented [`getProductCountByBrand()`](scraper/src/duplicate-detector.ts:217): Gets product count for specific brand
- Implemented [`clear()`](scraper/src/duplicate-detector.ts:235): Clears all tracked items from detector
- Implemented [`getBrands()`](scraper/src/duplicate-detector.ts:254): Gets all tracked brand slugs
- Implemented [`getProducts()`](scraper/src/duplicate-detector.ts:273): Gets all tracked products with brand associations
- Created [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1) with 110 comprehensive tests
- Created [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1) with 105 comprehensive tests
- Test coverage: 96.83% for data-normalizer, 100% for duplicate-detector
- Total scraper test count: 361 tests (all passing)

**Key Features:**

**Data Normalization:**
- Text cleaning: Removes extra whitespace, normalizes line breaks to spaces
- URL normalization: Converts relative URLs to absolute, removes tracking parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid)
- Slug generation: Creates URL-friendly slugs from names (lowercase, hyphens instead of spaces, removes special characters)
- Slug extraction: Extracts slugs from URLs for consistency
- Timestamp tracking: Adds ISO 8601 scrapedAt timestamp to all normalized data
- Optional field handling: Gracefully handles missing optional fields (description, imageUrl)
- Length validation: Enforces maximum lengths for text fields (10000 chars), names (500 chars), and URLs (2000 chars)
- URL validation: Validates URL format and length
- Timestamp validation: Validates ISO 8601 timestamp format

**Duplicate Detection:**
- Case-insensitive comparison: Normalizes slugs to lowercase for comparison
- O(1) lookup performance: Uses Set for brands and Map of Sets for products
- Brand-level tracking: Tracks unique brand slugs
- Product-level tracking: Tracks unique product slugs per brand
- Total count tracking: Maintains count of all tracked items (brands + products)
- Query functions: Provides functions to check existence, get counts, and retrieve all tracked items
- Clear functionality: Allows resetting detector for new scraping sessions
- Memory efficient: Uses efficient data structures for large-scale tracking

**Validation Rules:**
- Required fields: slug, name, sourceUrl, and brandSlug (for products) must be present and non-empty
- Optional fields: description and imageUrl are optional but must be valid if present
- Length limits: Enforces maximum lengths for all text fields
- URL format: Validates that URLs are properly formatted
- Timestamp format: Validates that scrapedAt is a valid ISO 8601 timestamp

**Error Handling:**
- Graceful URL handling: Returns null for invalid URLs instead of throwing errors
- Detailed error logging: [`logInvalidData()`](scraper/src/data-normalizer.ts:422) provides structured error output with data preview
- Console warnings: Logs warnings for normalization failures (e.g., invalid URLs)
- Truncated previews: Limits data preview to 500 characters for readability

**Integration Points:**
- HTML Parser: Normalizes data returned by parser functions
- Duplicate Detector: Tracks normalized data across iterations
- Database: Stores validated, normalized data
- HTTP Client: Uses normalized URLs for requests

**Test Coverage:**

**Data Normalizer Tests** ([`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1)):
- cleanText() tests: Removing extra whitespace, trimming, normalizing line breaks, handling empty strings
- normalizeUrl() tests: Absolute URLs, relative URLs, tracking parameter removal, malformed URLs
- Slug generation tests: Creating slugs from names, handling special characters, normalizing
- Slug extraction tests: Extracting slugs from URLs, handling edge cases
- normalizeBrandData() tests: Transforming parsed brands, handling optional fields, timestamp generation
- normalizeProductData() tests: Transforming parsed products, brand slug association
- normalizeBrandDetailData() tests: Transforming brand details, full data extraction
- normalizeProductDetailData() tests: Transforming product details, full data extraction
- validateBrandData() tests: Required field validation, length validation, URL validation, timestamp validation
- validateProductData() tests: Required field validation, brand slug validation, all validation rules
- logInvalidData() tests: Error formatting, data preview truncation, error output
- Edge cases: Empty strings, null/undefined values, maximum length values, malformed URLs
- Integration tests: End-to-end normalization and validation flow

**Duplicate Detector Tests** ([`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1)):
- createDuplicateDetector() tests: Initial state, empty tracking sets, zero count
- addBrand() tests: Adding new brands, detecting duplicate brands, case-insensitive comparison
- addProduct() tests: Adding new products, detecting duplicate products, brand-specific tracking
- hasBrand() tests: Checking brand existence, case-insensitive lookup
- hasProduct() tests: Checking product existence, brand-specific lookup
- getBrandCount() tests: Counting tracked brands, multiple additions
- getProductCount() tests: Counting tracked products across all brands
- getProductCountByBrand() tests: Counting products for specific brand
- clear() tests: Resetting detector state, clearing all tracking
- getBrands() tests: Retrieving all brand slugs, array conversion
- getProducts() tests: Retrieving all products with brand associations
- totalCount tests: Accurate counting of brands + products
- Edge cases: Empty detector, single item, multiple brands, multiple products per brand
- Case sensitivity: Uppercase/lowercase/mixed case handling

**Test Results:**
- **Data Normalizer**: 110 tests, 96.83% coverage, 100% pass rate
- **Duplicate Detector**: 105 tests, 100% coverage, 100% pass rate
- **Total Scraper Tests**: 361 tests (all passing)
- **Overall Scraper Coverage**: Excellent coverage across all modules

**Phase 3.3 Deliverables:**
1. Complete data normalization module with text cleaning, URL normalization, and slug generation
2. Comprehensive data validation with business rules and error reporting
3. Efficient duplicate detection using Set and Map data structures
4. TypeScript type definitions for normalized data structures and validation results
5. Comprehensive test suites (215 tests: 110 for normalizer, 105 for duplicate detector)
6. Excellent test coverage (96.83% for normalizer, 100% for duplicate detector)
7. Integration points with HTML parser, duplicate detector, and database

### 3.4 Scraping Orchestration

- Implement iterative brand discovery workflow
  - Detect loading mechanism (pagination, infinite scroll, lazy loading)
  - Fetch initial brand list
  - Iterate through subsequent pages/loads
  - Track discovered brands to avoid duplicates
  - Detect completion when all brands are discovered
- Implement brand data extraction workflow
  - Parse brand information from page
  - Detect product loading mechanism
  - Iterate through product pages/loads
  - Track discovered products to avoid duplicates
  - Detect completion when all products are discovered
- Implement product data extraction workflow
  - Fetch and parse individual product pages
  - Associate products with parent brands
- Create scraping job queue management
  - Queue discovered brands for processing
  - Queue discovered products for processing
  - Manage concurrent processing limits
- Implement progress tracking and logging
  - Track iteration progress for brand discovery
  - Track iteration progress for product discovery
  - Log checkpoints for resumability
  - Monitor overall scraping progress

### 3.5 Error Handling and Recovery

- Implement network error handling
  - Retry logic for failed requests
  - Timeout handling for individual iterations
  - Continue with next iteration on non-critical failures
- Create parsing error logging
  - Log malformed pages
  - Continue processing remaining items in iteration
- Set up duplicate detection logic
  - Detect duplicate brands across iterations
  - Detect duplicate products across iterations
- Implement partial recovery mechanisms
  - Save checkpoints after each iteration
  - Resume from last checkpoint on interruption
  - Skip already-processed items on retry
- Create scraping failure notifications
  - Alert on critical failures
  - Log iteration-specific errors
  - Provide recovery recommendations

### 3.6 Data Volume Handling

- Implement batch database operations
  - Batch insert brands for efficiency
  - Batch insert products for efficiency
  - Optimize for thousands of products
- Implement memory management
  - Process data in chunks to avoid memory issues
  - Clear processed data from memory
  - Handle large datasets efficiently
- Implement resumable scraping
  - Checkpoint after each brand discovery iteration
  - Checkpoint after each product discovery iteration
  - Support incremental updates
  - Support full refresh scenarios

### 3.7 Completion Detection

- Implement brand list completion detection
  - Detect end of pagination
  - Detect no more infinite scroll results
  - Implement timeout-based completion as fallback
- Implement product list completion detection
  - Detect end of pagination
  - Detect no more infinite scroll results
  - Implement timeout-based completion as fallback
- Implement validation of completion
  - Verify no duplicate items in final dataset
  - Verify expected data volume ranges
  - Log completion metrics

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

- [x] Set up test runner configuration
- [x] Configure test coverage tools
- [x] Create test database setup scripts
- [x] Set up test fixtures and seed data
- [x] Configure test reporting

**Implementation Notes:**
- Created [`database/vitest.config.ts`](database/vitest.config.ts:1) for database tests
- Created [`scraper/vitest.config.ts`](scraper/vitest.config.ts:1) for scraper tests
- Test setup implemented in [`database/test/setup.ts`](database/test/setup.ts:1)
- Test database configured in `docker-compose.test.yml`

### 6.2 Example HTML Files

- Download and save brand list page HTML (initial load)
- Download and save brand list page HTML (subsequent loads, if available)
- Download and save brand detail page HTML (initial load)
- Download and save brand detail page HTML (subsequent loads, if available)
- Download and save product detail page HTML
- Organize example files in examples directory
- Document example file structure and loading patterns

### 6.3 Scraper Tests

- [x] Write unit tests for HTTP client functionality
- [x] Write unit tests for HTML parsing functions
- [x] Write unit tests for data normalization
- [x] Write unit tests for iteration state management
- Write unit tests for completion detection logic
- Write integration tests for scraping workflows
- Write tests using example HTML files
- Write tests for iterative brand discovery
- Write tests for iterative product discovery
- Create error scenario tests
- Create tests for checkpoint and recovery
- Create tests for duplicate detection
- Create tests for large data volume handling

**Implementation Notes:**
- Created [`scraper/test/http-client.test.ts`](scraper/test/http-client.test.ts:1) with 54 comprehensive tests
- Test coverage: 97.24% (54 tests, 100% pass rate)
- Tests cover HTTP client functionality, retry logic, rate limiting, user agent rotation, iterative requests, and checkpoint management
- Created [`scraper/test/html-parser.test.ts`](scraper/test/html-parser.test.ts:1) with 92 comprehensive tests
- Test coverage: 91.99% (92 tests, 100% pass rate)
- Tests cover HTML parsing functions, error handling, pagination metadata extraction, and completion detection
- Created [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1) with 110 comprehensive tests
- Test coverage: 96.83% (110 tests, 100% pass rate)
- Tests cover text cleaning, URL normalization, slug generation, data transformation, and validation
- Created [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1) with 105 comprehensive tests
- Test coverage: 100% (105 tests, 100% pass rate)
- Tests cover duplicate detection, tracking, counting, and query operations
- Total scraper tests: 361 tests (all passing)

### 6.4 Backend Tests

- Write unit tests for authentication logic
- Write unit tests for data access layer
- Write integration tests for API endpoints
- Write tests for request validation
- Create error handling tests

### 6.5 Database Tests

- [x] Write tests for CRUD operations
- [x] Write tests for transaction management
- [x] Write tests for constraint enforcement
- [x] Write tests for indexing performance
- [x] Write tests for batch operations
- [x] Create migration tests

**Implementation Notes:**
- Created comprehensive test suite for database operations
- Tests for brands, products, API keys, and metadata CRUD operations
- Tests for transaction management with savepoints and isolation levels
- Tests for constraint enforcement (foreign keys, unique constraints, CHECK constraints)
- Tests for batch operations and parallel transactions
- Test coverage: 100% for database layer

### 6.6 API Key Management Tests

- Write tests for key generation
- Write tests for key validation
- Write tests for key operations
- Write security tests for key storage
- Create audit logging tests

### 6.7 Dynamic Loading Tests

- Write tests for brand discovery across multiple iterations
- Write tests for product discovery across multiple iterations
- Write tests for completion detection
- Write tests for duplicate detection across iterations
- Write tests for checkpoint creation and recovery
- Write tests for handling large data volumes (100+ brands, 1000+ products)
- Write tests for timeout and retry during iterations
- Write tests for state management across iterations

## Phase 7: Final Verification

### 7.1 End-to-End Testing

- Execute full scraping workflow with dynamic loading
- Test all API endpoints with authentication
- Verify data consistency across iterations
- Test error scenarios
- Validate performance requirements with large data volumes
- Test resumable scraping with checkpoints
- Test incremental update scenarios

### 7.2 Security Review

- Review API key security implementation
- Validate input sanitization
- Review database access controls
- Test for common vulnerabilities
- Review logging for sensitive data

### 7.3 Performance Testing

- Test scraping performance with ~100 brands
- Test scraping performance with brands containing 100+ products
- Test overall performance with thousands of products
- Verify memory usage during long-running operations
- Test database performance with batch operations
