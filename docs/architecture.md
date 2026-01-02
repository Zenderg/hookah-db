# High-Level Architecture

## Monorepository Structure

The project is organized as a monorepository using pnpm workspaces. This approach allows multiple subprojects to coexist in a single repository while sharing dependencies and configuration.

### Workspace Configuration

The workspace is configured in `pnpm-workspace.yaml` with 5 packages:
- `backend/` - Backend API service
- `scraper/` - Data scraping service
- `database/` - Database schemas and migrations
- `shared/` - Shared utilities and types
- `scripts/` - Utility scripts including key management

### TypeScript Configuration Strategy

TypeScript is configured at two levels:

**Root Configuration (`tsconfig.json`):**
- Contains shared compiler options for all packages
- Excludes output-related settings (each package manages its own output)
- Provides common path mappings and type checking rules

**Package-Level Configuration:**
- Each package has its own `tsconfig.json` extending root configuration
- Packages define their own output directory and build settings
- Allows for different build targets per package

### Code Quality Tools

**ESLint Configuration (`.eslintrc.cjs`):**
- Configured as CommonJS module for ES module compatibility
- Shared across all workspace packages
- Enforces consistent code style and best practices

**Prettier Configuration (`.prettierrc`):**
- Shared formatting rules across entire project
- Applied to all TypeScript and configuration files
- Ensures consistent code formatting

## Project Components

### Backend Service

The backend service is core component responsible for:

- **HTTP Server**: Exposes REST API endpoints for client access
- **Authentication Middleware**: Validates API keys on incoming requests
- **Data Access Layer**: Interacts with database to retrieve tobacco data
- **Request Processing**: Handles client queries and returns structured responses

### Scraper Service

The scraper service is responsible for:

- **HTTP Client**: Fetches HTML pages from htreviews.org with support for iterative requests
- **HTML Parser**: Extracts structured data from HTML documents across multiple iterations
- **Data Normalization**: Transforms raw scraped data into consistent formats
- **Duplicate Detection**: Prevents duplicate processing across iterations
- **Error Handling**: Manages network failures and parsing errors
- **Iteration Management**: Handles dynamic loading patterns (infinite scroll, lazy loading, pagination)
- **State Tracking**: Maintains state across iterations for brand and product discovery
- **Completion Detection**: Identifies when all data has been loaded from dynamic lists
- **Checkpoint Management**: Saves progress for resumable scraping operations
- **Batch Processing**: Optimizes database operations for large data volumes
- **Orchestration**: Coordinates all scraping workflows with job queue management and progress tracking

#### HTTP Client Component

The HTTP client ([`scraper/src/http-client.ts`](scraper/src/http-client.ts:1)) provides robust web scraping capabilities with following features:

**Core Responsibilities:**
- HTTP GET requests with automatic retry logic and rate limiting
- User agent rotation to avoid detection
- Iterative request support for dynamic loading scenarios
- Request timeout configuration with per-request overrides
- Request history tracking for debugging and monitoring
- Discovered items tracking for duplicate detection
- Checkpoint creation and restoration for resumable operations

**Retry Logic:**
- Exponential backoff with jitter (base delay configurable, default: 1000ms)
- Maximum retry attempts (default: 3)
- Maximum retry delay cap (default: 30000ms)
- Transient error detection (timeouts, network errors, 5xx errors, 429 rate limit)
- Smart retry decision based on error type

**Rate Limiting:**
- Token bucket algorithm for precise rate control
- Configurable requests per second (default: 2 RPS)
- Configurable burst capacity (default: 5 requests)
- Automatic token refill based on elapsed time
- Respect for server rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset)

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

**Integration with Scraper Architecture:**
- Used by HTML parser to fetch web pages
- Provides rate limiting for all scraper HTTP requests
- Enables iterative loading patterns for dynamic content
- Supports checkpoint creation for resumable scraping operations
- Integrates with duplicate detection to avoid processing same items

#### HTML Parser Component

The HTML parser ([`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)) provides structured data extraction from HTML documents with following features:

**Core Responsibilities:**
- Parse brand list pages and extract brand data with pagination support
- Parse brand detail pages and extract comprehensive brand information
- Parse product list pages and extract product data with pagination support
- Parse product detail pages and extract comprehensive product information
- Extract HTMX pagination metadata for iterative loading
- Detect completion of brand and product discovery
- Handle malformed HTML gracefully with detailed error reporting

**Parser Functions:**
- [`parseBrandList()`](scraper/src/html-parser.ts:135): Extracts brands from listing pages
- [`parseBrandDetail()`](scraper/src/html-parser.ts:250): Extracts detailed brand information
- [`parseProductList()`](scraper/src/html-parser.ts:307): Extracts products from brand pages
- [`parseProductDetail()`](scraper/src/html-parser.ts:421): Extracts detailed product information
- [`isBrandDiscoveryComplete()`](scraper/src/html-parser.ts:477): Checks if all brands discovered
- [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511): Checks if all products discovered

**Utility Functions:**
- [`cleanText()`](scraper/src/html-parser.ts:29): Normalizes text by removing extra whitespace
- [`normalizeUrl()`](scraper/src/html-parser.ts:43): Converts relative URLs to absolute URLs
- [`extractSlug()`](scraper/src/html-parser.ts:70): Extracts URL slug for constructing source URLs
- [`parseHTMXPagination()`](scraper/src/html-parser.ts:88): Extracts HTMX pagination metadata

**Error Handling:**
- Custom [`ParseError`](scraper/src/parser-error.ts:12) class with element context and HTML preview
- Graceful handling of missing optional fields (description, image URL)
- Continues processing valid items even when individual items fail to parse
- Detailed error messages for debugging with selector and HTML preview

**HTMX Pagination Support:**
- Extracts pagination metadata from data attributes (data-target, data-offset, data-count, data-total-count)
- Constructs endpoint URLs for next page requests
- Determines completion status based on offset + items >= totalCount

**Integration with Scraper Architecture:**
- Used by scraper orchestration to extract data from fetched HTML
- Provides pagination metadata for iterative loading
- Enables completion detection for dynamic content
- Integrates with HTTP client for fetching HTML content

#### Data Normalization Component

The data normalization module ([`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1)) transforms raw parsed data into clean, standardized formats ready for storage.

**Core Responsibilities:**
- Clean and normalize text fields (remove extra whitespace, normalize line breaks)
- Normalize URLs (convert relative to absolute, remove tracking parameters)
- Generate URL-friendly slugs from names
- Validate data against business rules (length limits, required fields, URL format)
- Add ISO 8601 timestamps for tracking when data was scraped
- Log invalid data with detailed error information

**Normalization Functions:**
- [`cleanText()`](scraper/src/data-normalizer.ts:45): Normalizes text by removing extra whitespace and normalizing line breaks to single spaces
- [`normalizeUrl()`](scraper/src/data-normalizer.ts:73): Converts relative URLs to absolute URLs and removes tracking parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid)
- [`normalizeBrandData()`](scraper/src/data-normalizer.ts:212): Transforms parsed brand data to normalized format with slug, cleaned text, normalized URLs, and timestamp
- [`normalizeProductData()`](scraper/src/data-normalizer.ts:237): Transforms parsed product data to normalized format with brand association
- [`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264): Transforms parsed brand detail data to normalized format
- [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289): Transforms parsed product detail data to normalized format

**Validation Functions:**
- [`validateBrandData()`](scraper/src/data-normalizer.ts:316): Validates normalized brand data against business rules (required fields, length limits, URL format, timestamp format)
- [`validateProductData()`](scraper/src/data-normalizer.ts:366): Validates normalized product data against business rules (includes brandSlug validation)
- [`logInvalidData()`](scraper/src/data-normalizer.ts:422): Logs invalid data with structured error output and data preview (truncated to 500 characters)

**Validation Rules:**
- Required fields: slug, name, sourceUrl (and brandSlug for products) must be present and non-empty
- Optional fields: description and imageUrl are optional but must be valid if present
- Length limits: MAX_TEXT_LENGTH (10000 chars), MAX_NAME_LENGTH (500 chars), MAX_URL_LENGTH (2000 chars)
- URL format: URLs must be properly formatted and valid
- Timestamp format: scrapedAt must be a valid ISO 8601 timestamp

**Slug Generation:**
- Converts names to lowercase
- Removes special characters (keeps only alphanumeric, spaces, and hyphens)
- Replaces spaces with hyphens
- Removes leading/trailing hyphens
- Normalizes multiple consecutive hyphens to single hyphen

**Error Handling:**
- Graceful URL handling: Returns null for invalid URLs instead of throwing errors
- Console warnings: Logs warnings for normalization failures (e.g., invalid URLs)
- Detailed error logging: Provides structured error messages with field names and specific validation failures
- Data preview: Truncates data preview to 500 characters for readability in error logs

**Integration with Scraper Architecture:**
- Receives raw data from HTML parser
- Produces normalized data ready for duplicate detection and database storage
- Integrates with duplicate detector to track normalized items
- Provides validation results to ensure data quality before storage

#### Duplicate Detection Component

The duplicate detection module ([`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1)) provides efficient duplicate detection for brands and products across multiple scraping iterations.

**Core Responsibilities:**
- Track unique brands across iterations using case-insensitive comparison
- Track unique products per brand across iterations
- Provide O(1) lookup performance for duplicate checking
- Support querying tracked items (existence checks, counts, retrieval)
- Support resetting detector state for new scraping sessions

**Detection Functions:**
- [`createDuplicateDetector()`](scraper/src/duplicate-detector.ts:44): Creates new duplicate detector instance with empty tracking sets
- [`addBrand()`](scraper/src/duplicate-detector.ts:69): Adds brand to detector and returns true if duplicate, false if new
- [`addProduct()`](scraper/src/duplicate-detector.ts:101): Adds product to detector and returns true if duplicate, false if new
- [`hasBrand()`](scraper/src/duplicate-detector.ts:139): Checks if brand exists in detector (case-insensitive)
- [`hasProduct()`](scraper/src/duplicate-detector.ts:159): Checks if product exists in detector for specific brand (case-insensitive)
- [`getBrandCount()`](scraper/src/duplicate-detector.ts:179): Returns total count of tracked brands
- [`getProductCount()`](scraper/src/duplicate-detector.ts:195): Returns total count of tracked products across all brands
- [`getProductCountByBrand()`](scraper/src/duplicate-detector.ts:217): Returns product count for specific brand
- [`clear()`](scraper/src/duplicate-detector.ts:235): Clears all tracked items from detector (resets state)
- [`getBrands()`](scraper/src/duplicate-detector.ts:254): Returns array of all tracked brand slugs
- [`getProducts()`](scraper/src/duplicate-detector.ts:273): Returns array of all tracked products with brand associations

**Data Structures:**
- **DuplicateDetector Interface**: Contains brands (Set<string>), products (Map<string, Set<string>>), and totalCount (number)
- **Brand Tracking**: Uses Set for O(1) lookup and automatic deduplication
- **Product Tracking**: Uses Map of Sets for O(1) lookup per brand and automatic deduplication
- **Case Insensitivity**: Normalizes slugs to lowercase for comparison via [`normalizeSlug()`](scraper/src/duplicate-detector.ts:30)

**Performance Characteristics:**
- O(1) lookup time for brand existence checks
- O(1) lookup time for product existence checks
- O(1) insertion time for adding new brands/products
- Memory efficient: Uses Set and Map data structures optimized for large-scale tracking
- Scales to handle thousands of brands and products

**Integration with Scraper Architecture:**
- Receives normalized data from data normalization module
- Tracks items across multiple iterations to prevent duplicate processing
- Integrates with scraper orchestration to skip already-processed items
- Provides counts and queries for progress tracking and reporting

#### Scraper Orchestration Component

The scraper orchestration module ([`scraper/src/orchestrator.ts`](scraper/src/orchestrator.ts:1)) provides high-level orchestration for scraping workflows, coordinating HTTP client, HTML parser, data normalizer, duplicate detector, and database operations to discover and extract brand and product data.

**Core Responsibilities:**
- Coordinate iterative brand discovery workflow with pagination support
- Coordinate brand data extraction with normalization and validation
- Coordinate iterative product discovery per brand with pagination support
- Coordinate product data extraction with normalization and validation
- Manage job queues for brand and product processing with concurrent limits
- Track progress across all scraping operations
- Create and manage checkpoints for resumable operations
- Handle errors with retry logic and recovery mechanisms
- Manage metadata tracking for scraping operations
- Provide comprehensive statistics and logging

**Orchestration Methods:**
- [`initializeOperation()`](scraper/src/orchestrator.ts:209): Initializes scraping operation with metadata tracking (full_refresh or incremental_update)
- [`discoverBrands()`](scraper/src/orchestrator.ts:231): Discovers all brands from htreviews.org with iterative pagination
- [`iterativeBrandDiscovery()`](scraper/src/orchestrator.ts:285): Handles iterative brand discovery across multiple pages using HTMX pagination
- [`extractBrandData()`](scraper/src/orchestrator.ts:377): Extracts and stores brand data with normalization, validation, and duplicate checking
- [`discoverProducts()`](scraper/src/orchestrator.ts:437): Discovers all products for a specific brand with iterative pagination
- [`iterativeProductDiscovery()`](scraper/src/orchestrator.ts:492): Handles iterative product discovery across multiple pages using HTMX pagination
- [`extractProductData()`](scraper/src/orchestrator.ts:573): Extracts and stores product data with normalization, validation, and duplicate checking
- [`queueBrand()`](scraper/src/orchestrator.ts:640): Queues brand for processing with job tracking
- [`queueProduct()`](scraper/src/orchestrator.ts:660): Queues product for processing with job tracking
- [`processBrandQueue()`](scraper/src/orchestrator.ts:678): Processes queued brands with concurrent limits and retry logic
- [`processProductQueue()`](scraper/src/orchestrator.ts:741): Processes queued products with concurrent limits and retry logic
- [`getProgress()`](scraper/src/orchestrator.ts:804): Returns current scraping progress statistics
- [`logProgress()`](scraper/src/orchestrator.ts:821): Logs detailed progress information to console
- [`saveCheckpoint()`](scraper/src/orchestrator.ts:841): Saves checkpoint for resumability
- [`completeOperation()`](scraper/src/orchestrator.ts:905): Marks operation as completed successfully
- [`failOperation()`](scraper/src/orchestrator.ts:924): Marks operation as failed with error details
- [`reset()`](scraper/src/orchestrator.ts:942): Resets orchestrator state for new operation
- [`getStatistics()`](scraper/src/orchestrator.ts:962): Returns comprehensive operation statistics

**Workflow Coordination:**

**Brand Discovery Workflow:**
1. Fetches initial brand list page from base URL
2. Parses brand list using [`parseBrandList()`](scraper/src/html-parser.ts:135)
3. Extracts pagination metadata from HTMX data attributes
4. Iteratively fetches additional pages using [`iterativeBrandDiscovery()`](scraper/src/orchestrator.ts:285)
5. Detects completion using [`isBrandDiscoveryComplete()`](scraper/src/html-parser.ts:477)
6. Tracks discovered brands to avoid duplicates
7. Logs progress and creates checkpoints at intervals

**Brand Data Extraction Workflow:**
1. Fetches brand detail page using HTTP client
2. Parses brand information using [`parseBrandDetail()`](scraper/src/html-parser.ts:250)
3. Normalizes brand data using [`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264)
4. Validates normalized data using [`validateBrandData()`](scraper/src/data-normalizer.ts:316)
5. Checks for duplicates using [`addBrand()`](scraper/src/duplicate-detector.ts:69)
6. Stores brand in database using [`upsertBrand()`](database/src/brands.ts:186)
7. Updates metadata progress and logs errors

**Product Discovery Workflow:**
1. Fetches brand page to discover products
2. Parses product list using [`parseProductList()`](scraper/src/html-parser.ts:307)
3. Extracts pagination metadata from HTMX data attributes
4. Iteratively fetches additional pages using [`iterativeProductDiscovery()`](scraper/src/orchestrator.ts:492)
5. Detects completion using [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511)
6. Tracks discovered products to avoid duplicates
7. Logs progress and creates checkpoints at intervals

**Product Data Extraction Workflow:**
1. Fetches product detail page using HTTP client
2. Parses product information using [`parseProductDetail()`](scraper/src/html-parser.ts:421)
3. Normalizes product data using [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289)
4. Validates normalized data using [`validateProductData()`](scraper/src/data-normalizer.ts:366)
5. Checks for duplicates using [`addProduct()`](scraper/src/duplicate-detector.ts:101)
6. Retrieves brand ID from database for association
7. Stores product in database using [`createProduct()`](database/src/products.ts:19)
8. Updates metadata progress and logs errors

**Job Queue Management:**
- Job tracking with status enum (QUEUED, PROCESSING, COMPLETED, FAILED)
- Separate queues for brands and products
- Configurable concurrent processing limits (maxConcurrentBrands, maxConcurrentProducts)
- Automatic retry logic with configurable maximum retries
- Job status tracking with timestamps (createdAt, completedAt)
- Error details logging for failed jobs
- Batch processing with configurable concurrency

**Progress Tracking:**
- Tracks brands discovered, processed, and failed
- Tracks products discovered, processed, and failed
- Calculates overall progress percentage (totalProcessed / totalDiscovered)
- Provides detailed progress logging with iteration counts
- Monitors duplicate detector counts
- Tracks errors encountered during operations

**Checkpoint Management:**
- Saves checkpoints at configurable intervals (checkpointInterval)
- Includes iteration counts, discovered items, processed items
- Tracks error counts and timestamps
- Enables resumable scraping operations
- Can be restored after interruption

**Error Handling and Recovery:**
- Network error handling with retry logic in HTTP client
- Parsing error handling with detailed logging
- Validation error handling with data logging using [`logInvalidData()`](scraper/src/data-normalizer.ts:422)
- Database error handling with graceful degradation
- Job retry with exponential backoff
- Maximum retry limit enforcement
- Error context preservation for debugging
- Continues processing after individual item failures

**Metadata Management:**
- Initializes scraping operations with metadata record using [`createScrapingMetadata()`](database/src/metadata.ts:18)
- Supports full_refresh and incremental_update operation types
- Updates metadata with brand and product counts using [`updateScrapingMetadata()`](database/src/metadata.ts:166)
- Increments error count on failures using [`incrementScrapingErrorCount()`](database/src/metadata.ts:289)
- Marks operations as completed using [`completeScrapingOperation()`](database/src/metadata.ts:253)
- Marks operations as failed using [`failScrapingOperation()`](database/src/metadata.ts:272)
- Stores error details for debugging
- Tracks operation start and completion times

**Environment Variables:**
- `SCRAPER_BASE_URL`: Base URL for scraping (default: https://htreviews.org)
- `SCRAPER_MAX_CONCURRENT_BRANDS`: Maximum concurrent brand processing (default: 1)
- `SCRAPER_MAX_CONCURRENT_PRODUCTS`: Maximum concurrent product processing (default: 1)
- `SCRAPER_CHECKPOINT_INTERVAL`: Save checkpoint every N iterations (default: 1)
- `SCRAPER_MAX_RETRIES`: Maximum retry attempts for failed jobs (default: 3)

**Integration with Scraper Architecture:**
- HTTP Client: Fetches web pages with retry and rate limiting
- HTML Parser: Extracts structured data from HTML content
- Data Normalizer: Transforms and validates parsed data
- Duplicate Detector: Tracks items across iterations
- Database: Stores brands, products, and metadata
- Metadata Operations: Tracks scraping progress and errors

**Scraper Architecture Considerations:**

The scraper is designed to handle dynamic loading on source website:

- **Iterative Discovery**: Brand and product lists are discovered through multiple requests, not a single page load
- **Stateful Processing**: Maintains tracking of discovered items to avoid duplicates
- **Resumable Operations**: Saves checkpoints to resume from interruption points
- **Volume Awareness**: Optimized for processing ~100 brands and thousands of products
- **Error Isolation**: Failures in one iteration do not prevent processing of others

### Database

The database stores:

- **Brands**: Tobacco brand information including names, descriptions, and images
- **Products**: Individual tobacco products linked to brands
- **API Keys**: Client authentication credentials
- **Metadata**: Tracking information for scraped operations, including iteration progress

### API Key Management

A standalone utility for:

- **Key Generation**: Creates new API keys for clients
- **Key Validation**: Verifies key format and integrity
- **Key Revocation**: Disables compromised or expired keys

## Directory Organization

```
/
├── backend/          # Backend API service
├── scraper/          # Data scraping service with iterative loading support
├── database/         # Database schemas and migrations
├── shared/           # Shared utilities and types
├── scripts/          # Utility scripts including key management
├── examples/         # HTML samples for testing (includes multiple loading states)
├── docs/             # Project documentation
├── package.json      # Root package with shared dependencies
├── pnpm-workspace.yaml # Workspace configuration
├── tsconfig.json     # Root TypeScript configuration
├── .eslintrc.cjs     # ESLint configuration (CommonJS)
├── .prettierrc       # Prettier configuration
├── .gitignore        # Git ignore rules
├── docker-compose.dev.yml  # Development Docker Compose
├── docker-compose.prod.yml # Production Docker Compose
├── docker-compose.test.yml # Test Docker Compose
├── .env.dev.example  # Development environment template
└── .env.prod.example # Production environment template
```

## Deployment Architecture

### Production Environment

Production deployment uses docker-compose to orchestrate:

- **Backend Container**: Runs API service in production mode
- **Scraper Container**: Executes scheduled scraping tasks with iterative loading support
- **Database Container**: Persistent data storage
- **Network Configuration**: Inter-service communication

**Configuration:**
- Docker Compose file: `docker-compose.prod.yml`
- Environment variables: `.env.prod.example` (template)
- No version attribute (Docker Compose v2+)

### Development Environment

Local development uses a separate docker-compose configuration:

- **Backend Container**: Runs in watch mode with hot-reload
- **Database Container**: Local database instance
- **Volume Mounts**: Live code synchronization
- **Debug Configuration**: Enhanced logging and debugging tools

**Configuration:**
- Docker Compose file: `docker-compose.dev.yml`
- Environment variables: `.env.dev.example` (template)
- No version attribute (Docker Compose v2+)

## Configuration Management

Environment variables are defined centrally and shared across all services:

- **Database Connection**: Connection strings and credentials
- **External Service URLs**: Target URLs for scraping
- **API Settings**: Port numbers, timeouts, and limits
- **Security Settings**: Encryption keys and secrets
- **Scraper Settings**: Iteration timeouts, retry limits, batch sizes, rate limiting

### Environment Templates

Two environment variable templates are provided:

**Development (`.env.dev.example`):**
- Local database connection
- Debug logging enabled
- Relaxed security settings
- Hot-reload configuration

**Production (`.env.prod.example`):**
- Production database connection
- Production logging levels
- Strict security settings
- Optimized performance settings

## Cross-Cutting Concerns

### Logging

All services implement structured logging for:

- Request tracking and debugging
- Error monitoring and alerting
- Performance metrics collection
- Iteration progress tracking (scraper)
- Checkpoint status logging (scraper)
- HTTP request history (scraper HTTP client)
- Invalid data logging (scraper data normalizer)
- Progress logging (scraper orchestrator)
- Metadata tracking (scraper orchestrator)

### Error Handling

Consistent error handling across services:

- Standardized error response formats
- Graceful degradation on failures
- Retry logic for transient errors
- Iteration-level error isolation (scraper)
- Checkpoint recovery mechanisms (scraper)
- HTTP client retry with exponential backoff (scraper)
- Data validation with detailed error logging (scraper)
- Job retry with maximum limits (scraper orchestrator)

### Testing

Comprehensive test coverage across all components:

- Unit tests for individual functions
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Dynamic loading scenario tests (scraper)
- Large data volume tests (scraper)
- Checkpoint and recovery tests (scraper)
- HTTP client tests (scraper)
- Data normalization tests (scraper)
- Duplicate detection tests (scraper)
- Orchestration tests (scraper)

## Scraper Architecture Details

### Iterative Loading Pattern

The scraper implements an iterative loading pattern to handle dynamic content:

```
Initial Request → Extract Items → Detect More Content?
                                              ↓
                                          Yes → Next Iteration
                                               ↓
                                          Extract More Items → Detect More Content?
                                               ↓
                                          No → Complete
```

### State Management

The scraper maintains state across iterations:

- **Discovered Items**: Tracks all brands and products discovered so far
- **Iteration Count**: Monitors number of iterations performed
- **Last Checkpoint**: Saves progress for recovery
- **Completion Status**: Tracks whether discovery is complete

### Completion Detection

Multiple strategies for detecting completion:

- **Explicit Signals**: End-of-list indicators from source
- **Empty Results**: No new items returned in iteration
- **Pagination Exhaustion**: No more pages available
- **Timeout Fallback**: Maximum iterations or time limit reached

### Resumable Scraping

The scraper supports resumable operations:

- **Checkpoint Creation**: Saves state after each iteration
- **Checkpoint Recovery**: Resumes from last saved state
- **Incremental Updates**: Skips already-processed items or updates only changed data
- **Full Refresh**: Discards existing data and starts fresh

### Data Volume Considerations

The scraper is designed for significant data volumes:

- **Brands**: ~100 brands requiring multiple iterations
- **Products**: Up to 100+ products per brand
- **Total Products**: Several thousand products across all brands
- **Requests**: Potentially hundreds of HTTP requests per full scrape
- **Duration**: Long-running operations requiring progress tracking

### Error Isolation

Failures are isolated to prevent cascading issues:

- **Iteration Failures**: Continue with next iteration
- **Brand Failures**: Continue with next brand
- **Product Failures**: Continue with next product
- **Partial Success**: Save whatever data was successfully collected

### Performance Optimization

The scraper implements several optimizations:

- **Batch Processing**: Group database writes for efficiency
- **Concurrent Processing**: Process multiple brands in parallel (with limits)
- **Memory Management**: Clear processed data from memory
- **Rate Limiting**: Respect source server limits (token bucket algorithm)
- **Caching**: Avoid redundant requests
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **User Agent Rotation**: Distribute requests across different user agents
- **Duplicate Detection**: Skip already-processed items using O(1) lookups
- **Data Normalization**: Clean and validate data before storage to prevent errors
- **Job Queue Management**: Efficient processing with configurable concurrency limits
- **Progress Tracking**: Monitor and log scraping progress in real-time
- **Checkpoint Management**: Save state for resumable operations

### HTTP Client Integration

The HTTP client ([`scraper/src/http-client.ts`](scraper/src/http-client.ts:1)) is integrated into scraper architecture as follows:

- **Singleton Pattern**: Single instance used across all scraping operations
- **Rate Limiting**: Enforces rate limits before each HTTP request
- **Retry Logic**: Automatically retries failed requests with exponential backoff
- **State Tracking**: Maintains request history and discovered items
- **Checkpoint Support**: Creates checkpoints for resumable scraping
- **Iterative Requests**: Supports pagination and continuation tokens
- **User Agent Rotation**: Rotates through configured user agents

**Key Methods:**
- [`fetch()`](scraper/src/http-client.ts:255): Core HTTP GET request with retry and rate limiting
- [`fetchIterative()`](scraper/src/http-client.ts:329): Iterative request support for dynamic loading
- [`waitForRateLimit()`](scraper/src/http-client.ts:503): Rate limiting enforcement
- [`getUserAgent()`](scraper/src/http-client.ts:534): User agent rotation
- [`createCheckpoint()`](scraper/src/http-client.ts:654): Checkpoint creation for resumability
- [`restoreCheckpoint()`](scraper/src/http-client.ts:669): Checkpoint restoration
- [`getIterationState()`](scraper/src/http-client.ts:562): Iteration state tracking
- [`getRequestHistory()`](scraper/src/http-client.ts:612): Request history retrieval

### HTML Parser Integration

The HTML parser ([`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)) is integrated into scraper architecture as follows:

- **Data Extraction**: Parses HTML content returned by HTTP client
- **Pagination Metadata**: Extracts HTMX pagination data for iterative loading
- **Completion Detection**: Determines when all items have been discovered
- **Error Handling**: Provides detailed error context for debugging
- **Graceful Degradation**: Continues processing valid items when some fail
- **Type Safety**: Uses TypeScript interfaces for all parsed data structures

**Key Methods:**
- [`parseBrandList()`](scraper/src/html-parser.ts:135): Extracts brands from listing pages
- [`parseBrandDetail()`](scraper/src/html-parser.ts:250): Extracts detailed brand information
- [`parseProductList()`](scraper/src/html-parser.ts:307): Extracts products from brand pages
- [`parseProductDetail()`](scraper/src/html-parser.ts:421): Extracts detailed product information
- [`isBrandDiscoveryComplete()`](scraper/src/html-parser.ts:477): Checks if all brands discovered
- [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511): Checks if all products discovered
- [`parseHTMXPagination()`](scraper/src/html-parser.ts:88): Extracts HTMX pagination metadata

### Data Normalization Integration

The data normalization module ([`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1)) is integrated into scraper architecture as follows:

- **Data Cleaning**: Receives raw parsed data and cleans text fields
- **URL Normalization**: Converts relative URLs to absolute URLs and removes tracking parameters
- **Slug Generation**: Creates URL-friendly slugs from names
- **Data Validation**: Validates normalized data against business rules
- **Timestamp Tracking**: Adds ISO 8601 scrapedAt timestamps to all data
- **Error Logging**: Logs invalid data with detailed error information

**Key Methods:**
- [`cleanText()`](scraper/src/data-normalizer.ts:45): Normalizes text by removing extra whitespace
- [`normalizeUrl()`](scraper/src/data-normalizer.ts:73): Converts relative URLs to absolute URLs
- [`normalizeBrandData()`](scraper/src/data-normalizer.ts:212): Transforms parsed brand data to normalized format
- [`normalizeProductData()`](scraper/src/data-normalizer.ts:237): Transforms parsed product data to normalized format
- [`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264): Transforms parsed brand detail data to normalized format
- [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289): Transforms parsed product detail data to normalized format
- [`validateBrandData()`](scraper/src/data-normalizer.ts:316): Validates normalized brand data
- [`validateProductData()`](scraper/src/data-normalizer.ts:366): Validates normalized product data
- [`logInvalidData()`](scraper/src/data-normalizer.ts:422): Logs invalid data with error details

### Duplicate Detection Integration

The duplicate detection module ([`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1)) is integrated into scraper architecture as follows:

- **Brand Tracking**: Tracks unique brands across iterations using case-insensitive comparison
- **Product Tracking**: Tracks unique products per brand across iterations
- **Duplicate Checking**: Provides O(1) lookup for duplicate detection
- **State Management**: Maintains counts and provides query functions
- **Reset Capability**: Allows clearing detector state for new scraping sessions

**Key Methods:**
- [`createDuplicateDetector()`](scraper/src/duplicate-detector.ts:44): Creates new duplicate detector instance
- [`addBrand()`](scraper/src/duplicate-detector.ts:69): Adds brand and checks for duplicates
- [`addProduct()`](scraper/src/duplicate-detector.ts:101): Adds product and checks for duplicates
- [`hasBrand()`](scraper/src/duplicate-detector.ts:139): Checks if brand exists
- [`hasProduct()`](scraper/src/duplicate-detector.ts:159): Checks if product exists
- [`getBrandCount()`](scraper/src/duplicate-detector.ts:179): Returns brand count
- [`getProductCount()`](scraper/src/duplicate-detector.ts:195): Returns product count
- [`getProductCountByBrand()`](scraper/src/duplicate-detector.ts:217): Returns product count for brand
- [`clear()`](scraper/src/duplicate-detector.ts:235): Clears all tracked items
- [`getBrands()`](scraper/src/duplicate-detector.ts:254): Returns all tracked brands
- [`getProducts()`](scraper/src/duplicate-detector.ts:273): Returns all tracked products

### Scraper Orchestration Integration

The scraper orchestration module ([`scraper/src/orchestrator.ts`](scraper/src/orchestrator.ts:1)) is integrated into scraper architecture as follows:

- **Workflow Coordination**: Coordinates all scraping workflows from discovery to storage
- **Job Queue Management**: Manages brand and product processing with configurable concurrency
- **Progress Tracking**: Monitors and logs scraping progress across all operations
- **Error Handling**: Implements retry logic and recovery mechanisms for failed jobs
- **Checkpoint Management**: Saves state at configurable intervals for resumable operations
- **Metadata Tracking**: Integrates with database metadata operations for operation tracking
- **Component Integration**: Coordinates HTTP client, HTML parser, data normalizer, duplicate detector, and database

**Key Methods:**
- [`initializeOperation()`](scraper/src/orchestrator.ts:209): Initializes scraping operation with metadata
- [`discoverBrands()`](scraper/src/orchestrator.ts:231): Discovers brands with iterative pagination
- [`extractBrandData()`](scraper/src/orchestrator.ts:377): Extracts and stores brand data
- [`discoverProducts()`](scraper/src/orchestrator.ts:437): Discovers products for brand with iterative pagination
- [`extractProductData()`](scraper/src/orchestrator.ts:573): Extracts and stores product data
- [`queueBrand()`](scraper/src/orchestrator.ts:640): Queues brand for processing
- [`queueProduct()`](scraper/src/orchestrator.ts:660): Queues product for processing
- [`processBrandQueue()`](scraper/src/orchestrator.ts:678): Processes brand queue with concurrency limits
- [`processProductQueue()`](scraper/src/orchestrator.ts:741): Processes product queue with concurrency limits
- [`getProgress()`](scraper/src/orchestrator.ts:804): Returns progress statistics
- [`logProgress()`](scraper/src/orchestrator.ts:821): Logs detailed progress
- [`saveCheckpoint()`](scraper/src/orchestrator.ts:841): Saves checkpoint
- [`completeOperation()`](scraper/src/orchestrator.ts:905): Marks operation completed
- [`failOperation()`](scraper/src/orchestrator.ts:924): Marks operation failed
- [`reset()`](scraper/src/orchestrator.ts:942): Resets orchestrator state
- [`getStatistics()`](scraper/src/orchestrator.ts:962): Returns comprehensive statistics
