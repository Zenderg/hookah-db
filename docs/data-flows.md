# Data Flows and Logic

## Overview

The system operates through two primary workflows: data ingestion (scraping) and data serving (API access). These workflows are independent but share same database as their central data store.

## Data Ingestion Flow

### Phase 1: Brand Discovery with Iterative Loading

The scraping process begins with discovering available tobacco brands. Since source website uses dynamic loading, brand discovery is an iterative process coordinated by the scraper orchestrator:

1. **Initial Brand List Request**: The scraper orchestrator uses [`discoverBrands()`](scraper/src/orchestrator.ts:231) to request brands listing page from htreviews.org
2. **Extract Initial Brand Links**: HTML parsing identifies brand page URLs from initially loaded content
3. **Detect Pagination/Loading Mechanism**: Analyze page structure to determine if more brands can be loaded (pagination, infinite scroll, or lazy loading)
4. **Iterative Brand Discovery**: Continue fetching additional brand pages as loading mechanism allows using [`iterativeBrandDiscovery()`](scraper/src/orchestrator.ts:285)
5. **Queue Brand Processing**: Each discovered brand URL is queued for detailed scraping using [`queueBrand()`](scraper/src/orchestrator.ts:640)
6. **Detect Completion**: Identify when all brands have been discovered using [`isBrandDiscoveryComplete()`](scraper/src/html-parser.ts:477)
7. **Track Progress**: Monitor brand discovery progress using [`getProgress()`](scraper/src/orchestrator.ts:804) and [`logProgress()`](scraper/src/orchestrator.ts:821)

**Key Considerations for Brand Discovery:**
- The initial page load may contain only a subset of all brands
- Additional brands may load via scroll-triggered requests, pagination links, or API calls
- The scraper orchestrator must track state across multiple requests to avoid duplicates
- Detection of completion is critical to prevent infinite loops
- Checkpoints are saved at configurable intervals using [`saveCheckpoint()`](scraper/src/orchestrator.ts:841)

### Phase 2: Brand Data Extraction

For each brand in queue:

1. **Fetch Brand Page**: The scraper orchestrator retrieves individual brand page using [`extractBrandData()`](scraper/src/orchestrator.ts:377)
2. **Parse Brand Information**: Extracts brand name, description, and image URL using [`parseBrandDetail()`](scraper/src/html-parser.ts:250)
3. **Normalize Brand Data**: Transforms parsed data into standardized format using [`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264):
   - Cleans text fields (removes extra whitespace, normalizes line breaks)
   - Normalizes URLs (converts relative to absolute, removes tracking parameters)
   - Generates URL-friendly slugs from names
   - Adds ISO 8601 scrapedAt timestamp
4. **Validate Brand Data**: Validates normalized data against business rules using [`validateBrandData()`](scraper/src/data-normalizer.ts:316):
   - Checks required fields (slug, name, sourceUrl) are present and non-empty
   - Validates field lengths (names: 500 chars, text: 10000 chars, URLs: 2000 chars)
   - Validates URL format and timestamp format
5. **Check for Duplicates**: Uses [`addBrand()`](scraper/src/duplicate-detector.ts:69) to check if brand was already processed
6. **Store Brand Data**: Persists brand information to database if not a duplicate using [`upsertBrand()`](database/src/brands.ts:186)
7. **Discover Products with Iterative Loading**: Identifies tobacco product links within brand page using [`discoverProducts()`](scraper/src/orchestrator.ts:437) and [`iterativeProductDiscovery()`](scraper/src/orchestrator.ts:492):
   - Extracts initial product links from loaded content using [`parseProductList()`](scraper/src/html-parser.ts:307)
   - Detects if more products can be loaded (scroll triggers, pagination, API endpoints)
   - Continues fetching additional product pages as available
   - Tracks discovered products to avoid duplicates
   - Detects completion when no more products are available using [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511)
8. **Queue Product Processing**: Each product URL is queued for detailed scraping using [`queueProduct()`](scraper/src/orchestrator.ts:660)
9. **Update Metadata**: Progress is tracked using [`updateProgress()`](scraper/src/orchestrator.ts:860) which updates metadata in database

**Key Considerations for Product Discovery:**
- Product lists within brands may also use dynamic loading
- Some brands may have 100+ products requiring multiple iterations
- The scraper orchestrator must maintain state across iterations for each brand
- Timeout and retry logic must account for iterative nature
- Data normalization ensures consistent format before duplicate checking
- Duplicate detection prevents processing same items across iterations
- Checkpoints are saved at configurable intervals

### Phase 3: Product Data Extraction

For each product in queue:

1. **Fetch Product Page**: The scraper orchestrator retrieves individual product page using [`extractProductData()`](scraper/src/orchestrator.ts:573)
2. **Parse Product Information**: Extracts product name, description, and image URL using [`parseProductDetail()`](scraper/src/html-parser.ts:421)
3. **Normalize Product Data**: Transforms parsed data into standardized format using [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289):
   - Cleans text fields (removes extra whitespace, normalizes line breaks)
   - Normalizes URLs (converts relative to absolute, removes tracking parameters)
   - Generates URL-friendly slugs from names
   - Adds ISO 8601 scrapedAt timestamp
   - Associates product with parent brand via brandSlug
4. **Validate Product Data**: Validates normalized data against business rules using [`validateProductData()`](scraper/src/data-normalizer.ts:366):
   - Checks required fields (slug, name, sourceUrl, brandSlug) are present and non-empty
   - Validates field lengths (names: 500 chars, text: 10000 chars, URLs: 2000 chars)
   - Validates URL format, timestamp format, and brand association
5. **Check for Duplicates**: Uses [`addProduct()`](scraper/src/duplicate-detector.ts:101) to check if product was already processed
6. **Store Product Data**: Persists product information to database if not a duplicate using [`createProduct()`](database/src/products.ts:19)
7. **Update Metadata**: Progress is tracked using [`updateProgress()`](scraper/src/orchestrator.ts:860) which updates metadata in database

**Note**: Product detail pages are typically static and do not require iterative loading.

### Job Queue Processing

The scraper orchestrator manages job queues for efficient processing:

**Brand Queue Processing:**
1. Brands are queued using [`queueBrand()`](scraper/src/orchestrator.ts:640) with job tracking
2. Queue is processed using [`processBrandQueue()`](scraper/src/orchestrator.ts:678) with configurable concurrent limits
3. Jobs are processed in batches respecting [`maxConcurrentBrands`](scraper/src/orchestrator.ts:148) setting
4. Failed jobs are retried up to [`maxRetries`](scraper/src/orchestrator.ts:179) limit
5. Job status is tracked (QUEUED, PROCESSING, COMPLETED, FAILED)

**Product Queue Processing:**
1. Products are queued using [`queueProduct()`](scraper/src/orchestrator.ts:660) with job tracking
2. Queue is processed using [`processProductQueue()`](scraper/src/orchestrator.ts:741) with configurable concurrent limits
3. Jobs are processed in batches respecting [`maxConcurrentProducts`](scraper/src/orchestrator.ts:149) setting
4. Failed jobs are retried up to [`maxRetries`](scraper/src/orchestrator.ts:179) limit
5. Job status is tracked (QUEUED, PROCESSING, COMPLETED, FAILED)

**Progress Monitoring:**
- Progress is tracked using [`getProgress()`](scraper/src/orchestrator.ts:804) which returns comprehensive statistics
- Detailed progress is logged using [`logProgress()`](scraper/src/orchestrator.ts:821)
- Statistics are available via [`getStatistics()`](scraper/src/orchestrator.ts:962)
- Metadata is updated with brand and product counts

### Data Normalization in Ingestion Flow

Data normalization occurs immediately after parsing and before duplicate detection and storage:

**Text Normalization** ([`cleanText()`](scraper/src/data-normalizer.ts:45)):
- Removes leading and trailing whitespace
- Normalizes line breaks to single spaces
- Removes extra whitespace (multiple spaces become single space)
- Handles empty/null/undefined values gracefully

**URL Normalization** ([`normalizeUrl()`](scraper/src/data-normalizer.ts:73)):
- Converts relative URLs to absolute URLs using base URL (defaults to https://htreviews.org)
- Removes tracking parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid)
- Returns null for malformed URLs instead of throwing errors
- Logs warnings for normalization failures

**Slug Generation:**
- Converts names to lowercase
- Removes special characters (keeps only alphanumeric, spaces, and hyphens)
- Replaces spaces with hyphens
- Removes leading/trailing hyphens
- Normalizes multiple consecutive hyphens to single hyphen

**Timestamp Tracking:**
- Adds ISO 8601 scrapedAt timestamp to all normalized data
- Tracks when data was scraped for auditing and freshness monitoring

### Duplicate Detection in Ingestion Flow

Duplicate detection occurs after normalization and before storage:

**Brand Duplicate Detection** ([`addBrand()`](scraper/src/duplicate-detector.ts:69)):
- Normalizes brand slug to lowercase for case-insensitive comparison
- Checks if brand slug exists in tracking Set
- Returns true if duplicate (skip processing), false if new (process and store)
- Increments total count for new brands
- Provides O(1) lookup performance

**Product Duplicate Detection** ([`addProduct()`](scraper/src/duplicate-detector.ts:101)):
- Normalizes brand slug and product slug to lowercase
- Gets or creates product Set for brand
- Checks if product slug exists in brand's product Set
- Returns true if duplicate (skip processing), false if new (process and store)
- Increments total count for new products
- Provides O(1) lookup performance

**Duplicate Detector State Management:**
- Tracks unique brands across all iterations
- Tracks unique products per brand across all iterations
- Maintains total count of all tracked items
- Supports querying (hasBrand, hasProduct, getBrandCount, getProductCount, etc.)
- Supports clearing state for new scraping sessions

### Data Volume Considerations

The scraper is designed to handle significant data volumes:

- **Brands**: Approximately 100 brands to discover and process
- **Products per Brand**: Up to 100 or more products per brand
- **Total Products**: Several thousand products across all brands

**Implications for Data Flow Design:**
- Iterative loading may require hundreds of HTTP requests
- Progress tracking is essential for long-running operations
- Batch processing and checkpointing improve resilience
- Memory management must account for large datasets
- Database operations should use batch inserts for efficiency
- Duplicate detection prevents processing same items multiple times
- Data normalization ensures consistent format before storage
- Job queue management enables efficient concurrent processing
- Orchestration coordinates all workflows with proper error handling

### Error Handling During Scraping

- **Network Failures**: Implements retry logic with exponential backoff, considering iterative nature of requests
- **Parsing Errors**: Logs malformed pages and continues with remaining items in iteration
- **Normalization Errors**: Logs invalid data with detailed error messages using [`logInvalidData()`](scraper/src/data-normalizer.ts:422)
- **Validation Errors**: Validates data before storage, logs invalid data with specific error messages
- **Duplicate Detection**: Skips already-scraped items based on unique identifiers across iterations
- **Rate Limiting**: Respects target server rate limits to avoid blocking during iterative fetching
- **Iteration Failures**: If an iteration fails, logs error and continues with next iteration or retries based on error type
- **Timeout Handling**: Configurable timeouts for individual requests and overall scraping operations
- **State Persistence**: Maintains checkpoints to resume from last successful iteration if interrupted
- **Job Queue Errors**: Failed jobs are retried up to maximum retry limit with exponential backoff
- **Metadata Errors**: Errors are logged and error count is incremented in metadata using [`incrementScrapingErrorCount()`](database/src/metadata.ts:289)

### Resumable Scraping

To handle large data volumes and potential interruptions:

- **Checkpointing**: Saves progress after each successful iteration (brand discovery, product discovery within brand)
- **State Tracking**: Maintains records of which brands and products have been processed
- **Incremental Updates**: On re-scraping, can skip already-processed items or update only changed data
- **Recovery Mechanisms**: Ability to resume from last checkpoint after failure or interruption
- **Duplicate Detector Reset**: Can clear detector state for new scraping sessions
- **Progress Monitoring**: Real-time progress tracking using [`getProgress()`](scraper/src/orchestrator.ts:804) and [`logProgress()`](scraper/src/orchestrator.ts:821)

### Metadata Tracking During Scraping

The scraper orchestrator integrates with metadata operations:

- **Initialization**: [`initializeOperation()`](scraper/src/orchestrator.ts:209) creates metadata record for scraping operation
- **Progress Updates**: [`updateProgress()`](scraper/src/orchestrator.ts:860) updates brand and product counts in metadata
- **Error Tracking**: [`logError()`](scraper/src/orchestrator.ts:881) logs errors and increments error count
- **Completion**: [`completeOperation()`](scraper/src/orchestrator.ts:905) marks operation as completed successfully
- **Failure**: [`failOperation()`](scraper/src/orchestrator.ts:924) marks operation as failed with error details

## Data Serving Flow

### Phase 1: Request Authentication

1. **Receive Request**: Backend service receives an incoming API request
2. **Extract API Key**: Retrieves API key from request headers
3. **Validate Key**: Verifies key exists and is active in database
4. **Authorize or Reject**: Proceeds with request or returns authentication error

### Phase 2: Query Processing

1. **Parse Query Parameters**: Extracts filters, sorting, and pagination options
2. **Build Database Query**: Constructs appropriate database query based on parameters
3. **Execute Query**: Retrieves requested data from database
4. **Format Response**: Transforms database results into API response format

### Phase 3: Response Delivery

1. **Apply Pagination**: Limits results based on requested page size
2. **Add Metadata**: Includes total counts and pagination information
3. **Send Response**: Returns formatted JSON response to client

## Scheduled Scraping

The scraper operates on a scheduled basis:

1. **Trigger**: Cron job or scheduled task initiates scraping
2. **Full vs Incremental**: Determines whether to perform full refresh or incremental update
3. **Progress Tracking**: Logs scraping progress and completion status across iterations
4. **Checkpoint Management**: Saves checkpoints for resumability
5. **Notification**: Alerts on scraping failures or significant issues

**Scraping Strategies:**

- **Full Refresh**: Discards existing data and performs complete scraping from scratch
- **Incremental Update**: Compares existing data with source and updates only changed items
- **Hybrid Approach**: Periodic full refresh with incremental updates between full refreshes

## Component Interactions

### Scraper to Database

- **Write Operations**: Inserts and updates brand and product records in batches
- **Transaction Management**: Ensures data consistency during batch operations
- **Duplicate Handling**: Uses upsert logic to handle existing records
- **Checkpoint Storage**: Saves scraping progress and state to database
- **Bulk Operations**: Optimizes for large data volumes with batch inserts
- **Metadata Operations**: Tracks scraping operations with progress and error counts

### Backend to Database

- **Read Operations**: Queries brands and products with various filters
- **Authentication Queries**: Validates API keys against stored credentials
- **Connection Pooling**: Maintains efficient database connections
- **Pagination Support**: Efficiently handles large result sets

### Backend to Scraper

- **Independence**: Backend operates independently of scraper status
- **Data Freshness**: Backend serves whatever data is currently in database
- **No Direct Communication**: Services interact only through database
- **Progress Visibility**: Backend can query scraping metadata to check data freshness

### Scraper Orchestration Integration

The scraper orchestrator coordinates all scraper components:

- **HTTP Client**: Orchestrator uses [`HttpClient`](scraper/src/http-client.ts:192) to fetch web pages with retry and rate limiting
- **HTML Parser**: Orchestrator uses parser functions ([`parseBrandList()`](scraper/src/html-parser.ts:135), [`parseBrandDetail()`](scraper/src/html-parser.ts:250), [`parseProductList()`](scraper/src/html-parser.ts:307), [`parseProductDetail()`](scraper/src/html-parser.ts:421)) to extract structured data
- **Data Normalizer**: Orchestrator uses normalization functions ([`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264), [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289), [`validateBrandData()`](scraper/src/data-normalizer.ts:316), [`validateProductData()`](scraper/src/data-normalizer.ts:366)) to transform and validate data
- **Duplicate Detector**: Orchestrator uses detector functions ([`addBrand()`](scraper/src/duplicate-detector.ts:69), [`addProduct()`](scraper/src/duplicate-detector.ts:101), [`getBrandCount()`](scraper/src/duplicate-detector.ts:179), [`getProductCount()`](scraper/src/duplicate-detector.ts:195)) to track items across iterations
- **Database**: Orchestrator uses database operations ([`upsertBrand()`](database/src/brands.ts:186), [`createProduct()`](database/src/products.ts:19)) to store validated data
- **Metadata**: Orchestrator uses metadata operations ([`createScrapingMetadata()`](database/src/metadata.ts:18), [`updateScrapingMetadata()`](database/src/metadata.ts:166), [`completeScrapingOperation()`](database/src/metadata.ts:253), [`failScrapingOperation()`](database/src/metadata.ts:272)) to track operations

**Orchestration Workflow:**
1. Initialize operation with metadata tracking
2. Discover brands iteratively with pagination
3. Extract and normalize brand data
4. Discover products iteratively per brand
5. Extract and normalize product data
6. Queue and process jobs with concurrency limits
7. Track progress and save checkpoints
8. Handle errors with retry logic
9. Complete or fail operation with metadata updates

### Data Normalization Integration

- **HTML Parser → Normalizer**: Receives raw parsed data for transformation
- **Normalizer → Duplicate Detector**: Provides normalized data with slugs for duplicate checking
- **Normalizer → Database**: Provides validated, normalized data for storage
- **Normalizer → Error Logging**: Logs invalid data with detailed error information

### Duplicate Detection Integration

- **Normalizer → Duplicate Detector**: Receives normalized data for duplicate checking
- **Duplicate Detector → Scraper Orchestration**: Returns duplicate status to skip or process items
- **Duplicate Detector → Progress Tracking**: Provides counts and queries for monitoring
- **Duplicate Detector → Checkpoints**: State can be saved and restored across sessions

### Job Queue Integration

- **Orchestration → Job Queue**: Queues discovered brands and products for processing
- **Job Queue → Orchestration**: Processes jobs with configurable concurrency and retry logic
- **Job Queue → Progress Tracking**: Provides job status and completion statistics
- **Job Queue → Error Handling**: Implements retry logic for failed jobs

### Metadata Integration

- **Orchestration → Metadata**: Initializes operations, updates progress, and tracks errors
- **Metadata → Database**: Stores operation records with counts and error details
- **Metadata → Progress Tracking**: Provides operation status and completion information
- **Metadata → Error Logging**: Increments error count on failures

## Data Lifecycle

1. **Creation**: Data enters system through iterative scraping process coordinated by orchestrator
2. **Normalization**: Data is cleaned, validated, and standardized
3. **Duplicate Check**: Data is checked against previously processed items
4. **Storage**: Data persists in database with timestamps
5. **Serving**: Data is read by backend for API responses
6. **Updates**: Data is refreshed on subsequent scraping runs with incremental or full refresh
7. **Archival**: Historical data may be retained for audit purposes

## Concurrency Considerations

- **Scraping Parallelism**: Multiple brand/product pages can be scraped concurrently, respecting rate limits via job queue
- **Iteration Management**: Concurrent iterations must coordinate to avoid duplicate processing
- **Database Locking**: Appropriate locking prevents race conditions during updates
- **Request Handling**: Backend handles multiple API requests concurrently
- **Resource Limits**: System enforces limits on concurrent operations
- **Memory Management**: Efficient handling of large datasets during iterative loading
- **Duplicate Detection**: Thread-safe duplicate checking using Set and Map data structures
- **Job Queue Concurrency**: Configurable concurrent processing limits for brands and products

## Scraper Resilience

### Fault Tolerance

- **Retry Logic**: Automatic retries for transient failures with exponential backoff
- **Checkpoint Recovery**: Resume from last successful iteration after interruption
- **Partial Success**: Continue processing remaining items even if some iterations fail
- **Error Isolation**: Failures in one iteration do not prevent processing of others
- **Data Validation**: Validate data before storage to prevent errors
- **Duplicate Detection**: Skip already-processed items to avoid wasted work
- **Job Queue Retry**: Failed jobs are retried up to maximum retry limit

### Performance Optimization

- **Batch Processing**: Group database operations for efficiency
- **Parallel Iterations**: Process multiple brands concurrently when possible
- **Caching**: Cache intermediate results to reduce redundant requests
- **Rate Limiting**: Respectful of source server resources
- **Progressive Loading**: Begin serving data as soon as initial iterations complete
- **O(1) Duplicate Detection**: Efficient Set and Map-based duplicate checking
- **Data Normalization**: Clean and validate data once to avoid repeated processing
- **Job Queue Management**: Efficient concurrent processing with configurable limits
- **Checkpoint Management**: Save state at intervals to enable resumable operations
- **Progress Tracking**: Real-time monitoring and logging of scraping operations
