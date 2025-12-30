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
2. **Parse Brand Information**: Extracts brand name, description, and image URL
3. **Discover Products with Iterative Loading**: Identifies tobacco product links within the brand page using iterative approach:
   - Extract initial product links from loaded content
   - Detect if more products can be loaded (scroll triggers, pagination, API endpoints)
   - Continue fetching additional product pages as available
   - Track discovered products to avoid duplicates
   - Detect completion when no more products are available
4. **Store Brand Data**: Persists brand information to the database
5. **Queue Product Processing**: Each product URL is queued for detailed scraping

**Key Considerations for Product Discovery**:
- Product lists within brands may also use dynamic loading
- Some brands may have 100+ products requiring multiple iterations
- The scraper must maintain state across iterations for each brand
- Timeout and retry logic must account for the iterative nature

### Phase 3: Product Data Extraction

For each product in the queue:

1. **Fetch Product Page**: The scraper retrieves the individual product page
2. **Parse Product Information**: Extracts product name, description, and image URL
3. **Associate with Brand**: Links the product to its parent brand
4. **Store Product Data**: Persists product information to the database

**Note**: Product detail pages are typically static and do not require iterative loading.

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

### Error Handling During Scraping

- **Network Failures**: Implements retry logic with exponential backoff, considering the iterative nature of requests
- **Parsing Errors**: Logs malformed pages and continues with remaining items in the iteration
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

**Scraping Strategies**:

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

## Data Lifecycle

1. **Creation**: Data enters system through iterative scraping process
2. **Storage**: Data persists in database with timestamps
3. **Serving**: Data is read by backend for API responses
4. **Updates**: Data is refreshed on subsequent scraping runs with incremental or full refresh
5. **Archival**: Historical data may be retained for audit purposes

## Concurrency Considerations

- **Scraping Parallelism**: Multiple brand/product pages can be scraped concurrently, respecting rate limits
- **Iteration Management**: Concurrent iterations must coordinate to avoid duplicate processing
- **Database Locking**: Appropriate locking prevents race conditions during updates
- **Request Handling**: Backend handles multiple API requests concurrently
- **Resource Limits**: System enforces limits on concurrent operations
- **Memory Management**: Efficient handling of large datasets during iterative loading

## Scraper Resilience

### Fault Tolerance

- **Retry Logic**: Automatic retries for transient failures with exponential backoff
- **Checkpoint Recovery**: Resume from last successful iteration after interruption
- **Partial Success**: Continue processing remaining items even if some iterations fail
- **Error Isolation**: Failures in one iteration do not prevent processing of others

### Performance Optimization

- **Batch Processing**: Group database operations for efficiency
- **Parallel Iterations**: Process multiple brands concurrently when possible
- **Caching**: Cache intermediate results to reduce redundant requests
- **Rate Limiting**: Respectful of source server resources
- **Progressive Loading**: Begin serving data as soon as initial iterations complete
