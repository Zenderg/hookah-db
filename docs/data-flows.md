# Data Flows and Logic

## Overview

The system operates through two primary workflows: data ingestion (scraping) and data serving (API access). These workflows are independent but share the same database as their central data store.

## Data Ingestion Flow

### Phase 1: Brand Discovery with Iterative Loading

The scraping process begins with discovering available tobacco brands. Since the source website uses dynamic loading, brand discovery is an iterative process:

1. **Initial Brand List Request**: The scraper requests the brands listing page from htreviews.org
2. **Extract Initial Brand Links**: HTML parsing identifies brand page URLs from the initially loaded content
3. **Detect Pagination/Loading Mechanism**: Analyze the page structure to determine if more brands can be loaded (pagination, infinite scroll, or lazy loading)
4. **Iterative Brand Discovery**: Continue fetching additional brand pages as the loading mechanism allows
5. **Queue Brand Processing**: Each discovered brand URL is queued for detailed scraping
6. **Detect Completion**: Identify when all brands have been discovered (no more pages to load, end of list indicator, or no new results)

**Key Considerations for Brand Discovery**:
- The initial page load may contain only a subset of all brands
- Additional brands may load via scroll-triggered requests, pagination links, or API calls
- The scraper must track state across multiple requests to avoid duplicates
- Detection of completion is critical to prevent infinite loops

### Phase 2: Brand Data Extraction

For each brand in the queue:

1. **Fetch Brand Page**: The scraper retrieves the individual brand page
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
6. **Store Brand Data**: Persists brand information to the database if not a duplicate
7. **Discover Products with Iterative Loading**: Identifies tobacco product links within the brand page using [`parseProductList()`](scraper/src/html-parser.ts:307) and [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511):
   - Extract initial product links from loaded content
   - Detect if more products can be loaded (scroll triggers, pagination, API endpoints)
   - Continue fetching additional product pages as available
   - Track discovered products to avoid duplicates
   - Detect completion when no more products are available
8. **Queue Product Processing**: Each product URL is queued for detailed scraping

**Key Considerations for Product Discovery**:
- Product lists within brands may also use dynamic loading
- Some brands may have 100+ products requiring multiple iterations
- The scraper must maintain state across iterations for each brand
- Timeout and retry logic must account for the iterative nature
- Data normalization ensures consistent format before duplicate checking
- Duplicate detection prevents processing the same items across iterations

### Phase 3: Product Data Extraction

For each product in the queue:

1. **Fetch Product Page**: The scraper retrieves the individual product page
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
6. **Store Product Data**: Persists product information to the database if not a duplicate

**Note**: Product detail pages are typically static and do not require iterative loading.

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

**Slug Generation**:
- Converts names to lowercase
- Removes special characters (keeps only alphanumeric, spaces, and hyphens)
- Replaces spaces with hyphens
- Removes leading/trailing hyphens
- Normalizes multiple consecutive hyphens to single hyphen

**Timestamp Tracking**:
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
- Gets or creates product Set for the brand
- Checks if product slug exists in brand's product Set
- Returns true if duplicate (skip processing), false if new (process and store)
- Increments total count for new products
- Provides O(1) lookup performance

**Duplicate Detector State Management**:
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

**Implications for Data Flow Design**:
- Iterative loading may require hundreds of HTTP requests
- Progress tracking is essential for long-running operations
- Batch processing and checkpointing improve resilience
- Memory management must account for large datasets
- Database operations should use batch inserts for efficiency
- Duplicate detection prevents processing same items multiple times
- Data normalization ensures consistent format before storage

### Error Handling During Scraping

- **Network Failures**: Implements retry logic with exponential backoff, considering the iterative nature of requests
- **Parsing Errors**: Logs malformed pages and continues with remaining items in the iteration
- **Normalization Errors**: Logs invalid data with detailed error messages using [`logInvalidData()`](scraper/src/data-normalizer.ts:422)
- **Validation Errors**: Validates data before storage, logs invalid data with specific error messages
- **Duplicate Detection**: Skips already-scraped items based on unique identifiers across iterations
- **Rate Limiting**: Respects target server rate limits to avoid blocking during iterative fetching
- **Iteration Failures**: If an iteration fails, logs the error and continues with next iteration or retries based on error type
- **Timeout Handling**: Configurable timeouts for individual requests and overall scraping operations
- **State Persistence**: Maintains checkpoints to resume from last successful iteration if interrupted

### Resumable Scraping

To handle large data volumes and potential interruptions:

- **Checkpointing**: Saves progress after each successful iteration (brand discovery, product discovery within brand)
- **State Tracking**: Maintains records of which brands and products have been processed
- **Incremental Updates**: On re-scraping, can skip already-processed items or update only changed data
- **Recovery Mechanisms**: Ability to resume from last checkpoint after failure or interruption
- **Duplicate Detector Reset**: Can clear detector state for new scraping sessions

## Data Serving Flow

### Phase 1: Request Authentication

1. **Receive Request**: Backend service receives an incoming API request
2. **Extract API Key**: Retrieves the API key from request headers
3. **Validate Key**: Verifies the key exists and is active in the database
4. **Authorize or Reject**: Proceeds with request or returns authentication error

### Phase 2: Query Processing

1. **Parse Query Parameters**: Extracts filters, sorting, and pagination options
2. **Build Database Query**: Constructs appropriate database query based on parameters
3. **Execute Query**: Retrieves requested data from the database
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

### Backend to Database

- **Read Operations**: Queries brands and products with various filters
- **Authentication Queries**: Validates API keys against stored credentials
- **Connection Pooling**: Maintains efficient database connections
- **Pagination Support**: Efficiently handles large result sets

### Backend to Scraper

- **Independence**: Backend operates independently of scraper status
- **Data Freshness**: Backend serves whatever data is currently in the database
- **No Direct Communication**: Services interact only through the database
- **Progress Visibility**: Backend can query scraping metadata to check data freshness

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

## Data Lifecycle

1. **Creation**: Data enters system through iterative scraping process
2. **Normalization**: Data is cleaned, validated, and standardized
3. **Duplicate Check**: Data is checked against previously processed items
4. **Storage**: Data persists in database with timestamps
5. **Serving**: Data is read by backend for API responses
6. **Updates**: Data is refreshed on subsequent scraping runs with incremental or full refresh
7. **Archival**: Historical data may be retained for audit purposes

## Concurrency Considerations

- **Scraping Parallelism**: Multiple brand/product pages can be scraped concurrently, respecting rate limits
- **Iteration Management**: Concurrent iterations must coordinate to avoid duplicate processing
- **Database Locking**: Appropriate locking prevents race conditions during updates
- **Request Handling**: Backend handles multiple API requests concurrently
- **Resource Limits**: System enforces limits on concurrent operations
- **Memory Management**: Efficient handling of large datasets during iterative loading
- **Duplicate Detection**: Thread-safe duplicate checking using Set and Map data structures

## Scraper Resilience

### Fault Tolerance

- **Retry Logic**: Automatic retries for transient failures with exponential backoff
- **Checkpoint Recovery**: Resume from last successful iteration after interruption
- **Partial Success**: Continue processing remaining items even if some iterations fail
- **Error Isolation**: Failures in one iteration do not prevent processing of others
- **Data Validation**: Validate data before storage to prevent errors
- **Duplicate Detection**: Skip already-processed items to avoid wasted work

### Performance Optimization

- **Batch Processing**: Group database operations for efficiency
- **Parallel Iterations**: Process multiple brands concurrently when possible
- **Caching**: Cache intermediate results to reduce redundant requests
- **Rate Limiting**: Respectful of source server resources
- **Progressive Loading**: Begin serving data as soon as initial iterations complete
- **O(1) Duplicate Detection**: Efficient Set and Map-based duplicate checking
- **Data Normalization**: Clean and validate data once to avoid repeated processing
