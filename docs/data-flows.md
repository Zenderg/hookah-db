# Data Flows and Logic

## Overview

The system operates through two primary workflows: data ingestion (scraping) and data serving (API access). These workflows are independent but share the same database as their central data store.

## Data Ingestion Flow

### Phase 1: Brand Discovery

The scraping process begins with discovering available tobacco brands:

1. **Fetch Brand List**: The scraper requests the brands listing page from htreviews.org
2. **Extract Brand Links**: HTML parsing identifies all brand page URLs
3. **Queue Brand Processing**: Each discovered brand URL is queued for detailed scraping

### Phase 2: Brand Data Extraction

For each brand in the queue:

1. **Fetch Brand Page**: The scraper retrieves the individual brand page
2. **Parse Brand Information**: Extracts brand name, description, and image URL
3. **Discover Products**: Identifies all tobacco product links within the brand page
4. **Store Brand Data**: Persists brand information to the database
5. **Queue Product Processing**: Each product URL is queued for detailed scraping

### Phase 3: Product Data Extraction

For each product in the queue:

1. **Fetch Product Page**: The scraper retrieves the individual product page
2. **Parse Product Information**: Extracts product name, description, and image URL
3. **Associate with Brand**: Links the product to its parent brand
4. **Store Product Data**: Persists product information to the database

### Error Handling During Scraping

- **Network Failures**: Implements retry logic with exponential backoff
- **Parsing Errors**: Logs malformed pages and continues with remaining items
- **Duplicate Detection**: Skips already-scraped items based on unique identifiers
- **Rate Limiting**: Respects target server rate limits to avoid blocking

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
3. **Progress Tracking**: Logs scraping progress and completion status
4. **Notification**: Alerts on scraping failures or significant issues

## Component Interactions

### Scraper to Database

- **Write Operations**: Inserts and updates brand and product records
- **Transaction Management**: Ensures data consistency during batch operations
- **Duplicate Handling**: Uses upsert logic to handle existing records

### Backend to Database

- **Read Operations**: Queries brands and products with various filters
- **Authentication Queries**: Validates API keys against stored credentials
- **Connection Pooling**: Maintains efficient database connections

### Backend to Scraper

- **Independence**: Backend operates independently of scraper status
- **Data Freshness**: Backend serves whatever data is currently in the database
- **No Direct Communication**: Services interact only through the database

## Data Lifecycle

1. **Creation**: Data enters system through scraping
2. **Storage**: Data persists in database with timestamps
3. **Serving**: Data is read by backend for API responses
4. **Updates**: Data is refreshed on subsequent scraping runs
5. **Archival**: Historical data may be retained for audit purposes

## Concurrency Considerations

- **Scraping Parallelism**: Multiple brand/product pages can be scraped concurrently
- **Database Locking**: Appropriate locking prevents race conditions during updates
- **Request Handling**: Backend handles multiple API requests concurrently
- **Resource Limits**: System enforces limits on concurrent operations
