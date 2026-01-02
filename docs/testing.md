# Testing Strategy

## Testing Philosophy

The project follows a comprehensive testing approach that prioritizes reliability and maintainability. Tests serve as living documentation and ensure that scraping logic remains accurate as source website structure evolves. Given that source website uses dynamic loading (infinite scroll/lazy loading), testing must verify iterative data retrieval mechanisms.

## The Examples Directory

The `examples/` directory contains HTML files saved from htreviews.org. These files serve as static snapshots of website's structure at specific points in time.

### Purpose of Examples

- **Stable Test Data**: Provides consistent, unchanging input for parsing tests
- **Offline Testing**: Enables test execution without network dependencies
- **Regression Prevention**: Detects changes in scraping logic when source structure changes
- **Documentation**: Serves as reference for expected HTML structure

### Example File Types

- **Brand List Page (Initial Load)**: HTML showing first batch of brands from listing page
- **Brand List Page (Subsequent Loads)**: HTML showing additional brands loaded via pagination or infinite scroll (if available)
- **Brand Detail Page (Initial Load)**: HTML for a specific brand with initial product links
- **Brand Detail Page (Subsequent Loads)**: HTML showing additional products loaded via pagination or infinite scroll (if available)
- **Product Detail Page**: HTML for a specific tobacco product

### Maintaining Examples

- Update examples when source website structure changes significantly
- Add new examples when new page types or loading patterns are introduced
- Remove outdated examples when corresponding pages are removed from source
- For dynamic loading scenarios, maintain multiple examples showing different states of loading

## Test Categories

### Unit Tests

Test individual functions and components in isolation.

**Scope:**
- HTML parsing functions for extracting specific data points
- Data transformation and normalization logic
- Utility functions for string manipulation, URL handling
- API key generation and validation logic
- Iteration state management functions
- Completion detection logic for dynamic loading
- HTTP client functionality (retry logic, rate limiting, user agent rotation)
- Data validation functions (brand data, product data)
- Duplicate detection functions (brand tracking, product tracking)
- Orchestration functions (brand discovery, product discovery, job queue management, progress tracking)

**Characteristics:**
- Fast execution
- No external dependencies
- Mock all external interactions
- Test edge cases and error conditions
- Test iteration logic with various states

### Integration Tests

Test interactions between multiple components.

**Scope:**
- Scraper reading HTML from files and extracting data across multiple iterations
- Database operations for storing and retrieving entities in batches
- API key validation against database
- End-to-end data flow from HTML parsing to database storage
- Checkpoint creation and recovery mechanisms
- Duplicate detection across iterations
- HTTP client integration with scraper workflows
- Data normalization integration with parser and duplicate detector
- Orchestration integration with all scraper components
- Job queue processing with concurrency limits
- Metadata tracking integration with database

**Characteristics:**
- Use real database instances (test-specific)
- Use example HTML files as input
- Test component interactions
- Verify data persistence
- Test iterative loading scenarios with multiple example files

### End-to-End Tests

Test complete workflows from start to finish.

**Scope:**
- Full scraping workflow using example HTML files with multiple iterations
- API request handling with authentication
- Complete data retrieval from database to API response
- API key management workflow
- Resumable scraping with checkpoint recovery
- Incremental update scenarios
- Complete orchestration workflow from discovery to storage

**Characteristics:**
- Test complete user scenarios
- Use all real components (except external HTTP calls)
- Verify system behavior as a whole
- Slower execution but high confidence
- Test large data volume handling

## Test Organization

### Test Structure

Tests mirror project structure:

- **Backend Tests**: Located in backend service directory
- **Scraper Tests**: Located in scraper service directory
- **Shared Tests**: Located in shared utilities directory
- **Database Tests**: Located in database directory

### Test Naming

Tests follow descriptive naming conventions that indicate:

- What is being tested
- What conditions are being tested
- What expected outcome is

## Coverage Requirements

### Minimum Coverage Standards

- **Overall Code Coverage**: 80% of business logic
- **Parsing Logic**: 80% coverage using example HTML files
- **Database Operations**: 80% coverage of CRUD operations
- **API Endpoints**: 80% coverage of all endpoints
- **Authentication**: 80% coverage of API key validation
- **Iteration Logic**: 80% coverage of dynamic loading mechanisms
- **Completion Detection**: 80% coverage of end-of-list detection
- **HTTP Client**: 80% coverage of HTTP client functionality
- **Data Normalization**: 80% coverage of normalization and validation functions
- **Duplicate Detection**: 80% coverage of duplicate detection functions
- **Orchestration**: 80% coverage of orchestration functions

### Critical Path Coverage

All critical paths must have comprehensive tests:

- Brand discovery and extraction across multiple iterations
- Product discovery and extraction across multiple iterations
- Data persistence to database in batches
- API request authentication
- API response formatting
- Checkpoint creation and recovery
- Duplicate detection across iterations
- Completion detection for both brand and product lists
- HTTP client retry logic and rate limiting
- HTTP client user agent rotation
- HTTP client iterative request support
- Data normalization and validation
- Duplicate detection and tracking
- Job queue management and processing
- Progress tracking and logging
- Metadata management for scraping operations
- Complete orchestration workflow from discovery to storage

## HTTP Client Testing

### HTTP Client Test Coverage

The HTTP client ([`scraper/src/http-client.ts`](scraper/src/http-client.ts:1)) has comprehensive test coverage with 54 tests achieving 97.24% code coverage.

**Test File**: [`scraper/test/http-client.test.ts`](scraper/test/http-client.test.ts:1)

### HTTP Client Test Categories

#### Configuration Tests

- Test default configuration values
- Test custom configuration overrides
- Test environment variable configuration
- Test user agent list initialization
- Test rate limiter initialization

#### Request Tests

- Test successful HTTP GET requests
- Test request with custom timeout
- Test request with custom headers
- Test request with query parameters
- Test request with pagination parameters
- Test request with continuation token

#### Retry Logic Tests

- Test retry on timeout errors
- Test retry on network errors (ECONNREFUSED, ENOTFOUND, ECONNRESET, ETIMEDOUT)
- Test retry on 5xx errors
- Test retry on 429 (Too Many Requests)
- Test no retry on 4xx errors (except 429)
- Test exponential backoff calculation
- Test jitter calculation
- Test maximum retry attempts
- Test retry delay with different retry counts

#### Rate Limiting Tests

- Test token bucket initialization
- Test token consumption
- Test token refill over time
- Test burst capacity
- Test rate limit enforcement
- Test waiting for rate limit
- Test token count monitoring

#### User Agent Tests

- Test user agent rotation
- Test custom user agent per request
- Test user agent list update
- Test default user agent fallback
- Test environment variable user agent configuration

#### Iterative Request Tests

- Test iterative request with state tracking
- Test iteration state updates
- Test continuation token handling
- Test page-based pagination
- Test iteration number increment
- Test iteration state retrieval

#### State Management Tests

- Test iteration state tracking
- Test iteration state reset
- Test iteration state update
- Test discovered items tracking
- Test discovered items count
- Test discovered items clear

#### Request History Tests

- Test request history recording
- Test request history retrieval
- Test request history clearing
- Test history size limit (1000 entries)
- Test history entry fields (URL, timestamp, status, duration, retry count)

#### Checkpoint Tests

- Test checkpoint creation
- Test checkpoint restoration
- Test checkpoint data completeness
- Test iteration state in checkpoint
- Test discovered items in checkpoint

#### Error Handling Tests

- Test timeout error handling
- Test network error handling
- Test HTTP error handling
- Test error propagation
- Test error message formatting

### HTTP Client Testing Approach

**Mocked HTTP Requests:**
- Use Vitest's mocking capabilities to mock fetch API
- Simulate various HTTP responses (success, errors, timeouts)
- Test retry logic without actual network calls
- Test rate limiting behavior with controlled timing

**Timing Tests:**
- Test retry delay calculations
- Test exponential backoff behavior
- Test jitter randomness
- Test rate limiting timing
- Use fake timers for deterministic timing tests

**State Tests:**
- Test iteration state persistence
- Test discovered items tracking
- Test request history management
- Test checkpoint creation and restoration

**Edge Cases:**
- Test maximum retry attempts
- Test maximum delay caps
- Test empty user agent lists
- Test invalid URLs
- Test concurrent requests

### HTTP Client Test Results

- **Total Tests**: 54
- **Pass Rate**: 100%
- **Code Coverage**: 97.24%
- **Test File**: [`scraper/test/http-client.test.ts`](scraper/test/http-client.test.ts:1)

## HTML Parser Testing

### HTML Parser Test Coverage

The HTML parser ([`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)) has comprehensive test coverage with 92 tests achieving 91.99% code coverage.

**Test File**: [`scraper/test/html-parser.test.ts`](scraper/test/html-parser.test.ts:1)

### HTML Parser Test Categories

#### Utility Functions Tests

**cleanText() Tests:**
- Test removing extra whitespace
- Test trimming leading/trailing spaces
- Test normalizing line breaks
- Test handling empty strings
- Test handling strings with only whitespace
- Test preserving single spaces between words

**normalizeUrl() Tests:**
- Test converting relative URLs to absolute URLs
- Test handling already absolute URLs (http://, https://)
- Test handling URLs with query parameters
- Test handling URLs with fragments
- Test handling empty URLs
- Test handling malformed URLs

**extractSlug() Tests:**
- Test extracting slug from brand URLs
- Test extracting slug from product URLs
- Test handling URLs without slugs
- Test handling URLs with multiple path segments
- Test handling URLs with query parameters
- Test handling malformed URLs

#### ParseError Class Tests

**Error Creation Tests:**
- Test creating ParseError with message
- Test creating ParseError with selector
- Test creating ParseError with HTML preview
- Test creating ParseError with all fields

**Error Properties Tests:**
- Test accessing error message
- Test accessing error selector
- Test accessing error HTML preview
- Test error instanceof ParseError

**Error Formatting Tests:**
- Test error message formatting
- Test error string representation
- Test error JSON serialization

#### Brand List Parser Tests

**Basic Parsing Tests:**
- Test extracting brands from listing page
- Test extracting brand names
- Test extracting brand URLs
- Test extracting brand slugs
- Test handling multiple brands

**HTMX Pagination Tests:**
- Test extracting pagination metadata
- Test detecting data-target attribute
- Test detecting data-offset attribute
- Test detecting data-count attribute
- Test detecting data-total-count attribute
- Test handling missing pagination attributes

**Edge Cases Tests:**
- Test handling empty brand list
- Test handling missing brand elements
- Test handling malformed HTML
- Test handling duplicate brands
- Test handling brands with missing URLs

**Example HTML File Tests:**
- Test parsing actual brand list HTML file
- Verify extracted brands match expected data
- Test pagination metadata extraction from example file

#### Brand Detail Parser Tests

**Basic Parsing Tests:**
- Test extracting brand name
- Test extracting brand description
- Test extracting brand image URL
- Test constructing source URL from slug
- Test handling missing optional fields

**Edge Cases Tests:**
- Test handling missing description
- Test handling missing image URL
- Test handling multiple name spans (prefers English)
- Test handling empty brand detail page
- Test handling malformed HTML

**Example HTML File Tests:**
- Test parsing actual brand detail HTML file
- Verify extracted brand data matches expected values
- Test handling of real-world HTML structure

#### Product List Parser Tests

**Basic Parsing Tests:**
- Test extracting products from brand page
- Test extracting product names
- Test extracting product URLs
- Test extracting product slugs
- Test handling multiple products

**HTMX Pagination Tests:**
- Test extracting pagination metadata
- Test detecting completion based on offset + count >= totalCount
- Test handling incomplete pagination data
- Test handling missing pagination attributes

**Edge Cases Tests:**
- Test handling empty product list
- Test handling missing product elements
- Test handling malformed HTML
- Test handling duplicate products
- Test handling products with missing URLs

**Example HTML File Tests:**
- Test parsing actual product list HTML file
- Verify extracted products match expected data
- Test pagination metadata extraction from example file

#### Product Detail Parser Tests

**Basic Parsing Tests:**
- Test extracting product name
- Test extracting product description
- Test extracting product image URL
- Test constructing source URL from slug
- Test handling missing optional fields

**Edge Cases Tests:**
- Test handling missing description
- Test handling missing image URL
- Test handling empty product detail page
- Test handling malformed HTML
- Test handling product with minimal data

**Example HTML File Tests:**
- Test parsing actual product detail HTML file
- Verify extracted product data matches expected values
- Test handling of real-world HTML structure

#### Completion Detection Tests

**Brand Discovery Completion Tests:**
- Test completion detection when offset + count >= totalCount
- Test incomplete detection when more items available
- Test handling missing pagination metadata
- Test handling zero totalCount
- Test handling zero count

**Product Discovery Completion Tests:**
- Test completion detection when offset + count >= totalCount
- Test incomplete detection when more items available
- Test handling missing pagination metadata
- Test handling zero totalCount
- Test handling zero count

#### Error Scenario Tests

**Malformed HTML Tests:**
- Test handling of missing required elements
- Test handling of invalid HTML structure
- Test graceful degradation on parse errors
- Test error context in ParseError

**Missing Data Tests:**
- Test handling of missing optional fields
- Test handling of null/undefined values
- Test handling of empty strings
- Test graceful degradation with incomplete data

**Invalid Data Tests:**
- Test handling of invalid URLs
- Test handling of non-numeric pagination data
- Test handling of unexpected data types
- Test error propagation for critical failures

### HTML Parser Testing Approach

**Example HTML Files:**
- Use real HTML files saved from htreviews.org
- Provides realistic test data
- Ensures parser works with actual website structure
- Enables offline testing without network dependencies

**Cheerio Integration:**
- Test parser with cheerio-loaded HTML
- Verify CSS selector accuracy
- Test data extraction from DOM elements
- Ensure compatibility with cheerio API

**Error Context Testing:**
- Verify ParseError includes selector for debugging
- Verify ParseError includes HTML preview
- Test error message clarity
- Ensure errors are actionable

**Graceful Degradation Testing:**
- Test parser continues on individual item failures
- Verify valid items are extracted even when some fail
- Test handling of missing optional fields
- Ensure robustness against malformed HTML

**Type Safety Testing:**
- Verify all parser functions return correct TypeScript types
- Test type guards and validation
- Ensure type definitions match actual data structures
- Test edge cases with type boundaries

### HTML Parser Test Results

- **Total Tests**: 92
- **Pass Rate**: 100% (92/92 tests passing)
- **Code Coverage**: 91.99%
- **Test File**: [`scraper/test/html-parser.test.ts`](scraper/test/html-parser.test.ts:1)
- **Regression Tests**: All 334 total tests passed with no failures

## Data Normalization Testing

### Data Normalizer Test Coverage

The data normalizer ([`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1)) has comprehensive test coverage with 110 tests achieving 96.83% code coverage.

**Test File**: [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1)

### Data Normalizer Test Categories

#### Text Normalization Tests

**cleanText() Tests:**
- Test removing leading and trailing whitespace
- Test trimming strings
- Test normalizing line breaks to single spaces
- Test removing extra whitespace (multiple spaces become single space)
- Test handling empty strings
- Test handling strings with only whitespace
- Test preserving single spaces between words
- Test handling strings with tabs and newlines

#### URL Normalization Tests

**normalizeUrl() Tests:**
- Test converting relative URLs to absolute URLs
- Test handling already absolute URLs (http://, https://)
- Test handling URLs with base URL parameter
- Test removing tracking parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid)
- Test handling URLs with query parameters
- Test handling URLs with fragments
- Test handling empty strings
- Test handling null/undefined values
- Test handling malformed URLs gracefully (returns null)
- Test handling URLs without protocol
- Test handling URLs with invalid characters
- Test URL length validation (MAX_URL_LENGTH: 2000 characters)

#### Slug Generation Tests

- Test generating slugs from names
- Test converting to lowercase
- Test removing special characters (keeps only alphanumeric, spaces, and hyphens)
- Test replacing spaces with hyphens
- Test removing leading/trailing hyphens
- Test normalizing multiple consecutive hyphens to single hyphen
- Test handling empty strings
- Test handling names with special characters
- Test handling names with multiple spaces
- Test handling names with numbers
- Test handling very long names (exceeding 500 chars)
- Test handling names with hyphens already present

#### Slug Extraction Tests

- Test extracting slugs from URLs
- Test extracting from absolute URLs
- Test extracting from relative URLs
- Test handling URLs without path segments
- Test handling URLs with multiple path segments
- Test handling URLs with query parameters
- Test handling malformed URLs (returns null)
- Test extracting last path segment as slug

#### Brand Data Normalization Tests

**normalizeBrandData() Tests:**
- Test transforming parsed brand data to normalized format
- Test cleaning brand name with cleanText()
- Test normalizing brand description
- Test normalizing brand image URL
- Test normalizing brand source URL
- Test generating slug from source URL or name
- Test adding scrapedAt timestamp (ISO 8601)
- Test handling missing optional fields (description, imageUrl)
- Test handling empty description
- Test handling null imageUrl

**normalizeBrandDetailData() Tests:**
- Test transforming parsed brand detail data to normalized format
- Test cleaning brand name with cleanText()
- Test normalizing brand description
- Test normalizing brand image URL
- Test normalizing brand source URL
- Test generating slug from source URL or name
- Test adding scrapedAt timestamp (ISO 8601)
- Test handling missing optional fields (description, imageUrl)

#### Product Data Normalization Tests

**normalizeProductData() Tests:**
- Test transforming parsed product data to normalized format
- Test cleaning product name with cleanText()
- Test normalizing product description
- Test normalizing product image URL
- Test normalizing product source URL
- Test cleaning and associating brandSlug
- Test generating slug from source URL or name
- Test adding scrapedAt timestamp (ISO 8601)
- Test handling missing optional fields (description, imageUrl)
- Test handling empty description
- Test handling null imageUrl

**normalizeProductDetailData() Tests:**
- Test transforming parsed product detail data to normalized format
- Test cleaning product name with cleanText()
- Test normalizing product description
- Test normalizing product image URL
- Test normalizing product source URL
- Test cleaning and associating brandSlug
- Test generating slug from source URL or name
- Test adding scrapedAt timestamp (ISO 8601)
- Test handling missing optional fields (description, imageUrl)

#### Brand Data Validation Tests

**validateBrandData() Tests:**
- Test validating required field: slug (non-empty, max 500 chars)
- Test validating required field: name (non-empty, max 500 chars)
- Test validating required field: sourceUrl (valid URL format, max 2000 chars)
- Test validating optional field: description (max 10000 chars if present)
- Test validating optional field: imageUrl (valid URL format, max 2000 chars if present)
- Test validating scrapedAt timestamp (valid ISO 8601 format)
- Test validation with all valid data (isValid: true, errors: [])
- Test validation with missing required fields (isValid: false, specific errors)
- Test validation with empty required fields (isValid: false, specific errors)
- Test validation with exceeding length limits (isValid: false, specific errors)
- Test validation with invalid URL format (isValid: false, specific errors)
- Test validation with invalid timestamp format (isValid: false, specific errors)

#### Product Data Validation Tests

**validateProductData() Tests:**
- Test validating required field: slug (non-empty, max 500 chars)
- Test validating required field: name (non-empty, max 500 chars)
- Test validating required field: sourceUrl (valid URL format, max 2000 chars)
- Test validating required field: brandSlug (non-empty, max 500 chars)
- Test validating optional field: description (max 10000 chars if present)
- Test validating optional field: imageUrl (valid URL format, max 2000 chars if present)
- Test validating scrapedAt timestamp (valid ISO 8601 format)
- Test validation with all valid data (isValid: true, errors: [])
- Test validation with missing required fields (isValid: false, specific errors)
- Test validation with empty required fields (isValid: false, specific errors)
- Test validation with exceeding length limits (isValid: false, specific errors)
- Test validation with invalid URL format (isValid: false, specific errors)
- Test validation with invalid timestamp format (isValid: false, specific errors)
- Test validation with invalid brandSlug (isValid: false, specific errors)

#### Invalid Data Logging Tests

**logInvalidData() Tests:**
- Test logging invalid data with error messages
- Test logging multiple validation errors
- Test logging data preview (truncated to 500 characters)
- Test handling data that cannot be serialized (fallback message)
- Test logging format with numbered error list
- Test handling empty errors array

#### Edge Cases and Integration Tests

**Text Normalization Edge Cases:**
- Test handling strings with only whitespace
- Test handling strings with tabs and multiple newlines
- Test handling Unicode characters
- Test handling very long strings (exceeding limits)
- Test handling strings with mixed whitespace types

**URL Normalization Edge Cases:**
- Test handling URLs with all tracking parameters
- Test handling URLs with multiple query parameters
- Test handling URLs with fragments
- Test handling URLs at maximum length (2000 chars)
- Test handling URLs without protocol
- Test handling protocol-only URLs (http://, https://)
- Test handling relative URLs with multiple path segments
- Test handling relative URLs with protocol

**Slug Generation Edge Cases:**
- Test handling names with only special characters
- Test handling names with consecutive special characters
- Test handling names with leading/trailing spaces
- Test handling names with numbers
- Test handling very long names (exceeding 500 chars)
- Test handling names with hyphens already present

**Integration Tests:**
- Test end-to-end normalization flow (parse → normalize → validate)
- Test normalization with duplicate detection integration
- Test normalization with real-world scraped data
- Test handling of data from HTML parser output

### Data Normalizer Testing Approach

**Unit Testing:**
- Test each normalization function in isolation
- Test with various input types (strings, null, undefined)
- Test edge cases and boundary conditions
- Verify output format matches expected interfaces

**Validation Testing:**
- Test all validation rules independently
- Test with valid and invalid inputs
- Verify error messages are specific and actionable
- Test that validation catches all business rule violations

**Integration Testing:**
- Test normalization pipeline (parse → normalize → validate → log errors)
- Test with realistic scraped data from HTML parser
- Test error handling and logging flow
- Verify data flows through normalization to storage

**Edge Case Testing:**
- Test boundary conditions (empty strings, maximum lengths, minimum lengths)
- Test malformed inputs (invalid URLs, invalid timestamps)
- Test null/undefined handling throughout pipeline
- Test with realistic edge cases from actual scraping scenarios

### Data Normalizer Test Results

- **Total Tests**: 110
- **Pass Rate**: 100% (110/110 tests passing)
- **Code Coverage**: 96.83%
- **Test File**: [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1)

## Duplicate Detection Testing

### Duplicate Detector Test Coverage

The duplicate detector ([`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1)) has comprehensive test coverage with 105 tests achieving 100% code coverage.

**Test File**: [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1)

### Duplicate Detector Test Categories

#### Detector Creation Tests

**createDuplicateDetector() Tests:**
- Test creating new detector instance
- Test initial state (empty brands Set, empty products Map)
- Test initial totalCount (0)
- Test multiple detector instances are independent
- Test detector can be reused after clearing

#### Brand Duplicate Detection Tests

**addBrand() Tests:**
- Test adding first brand (returns false, adds to Set)
- Test adding duplicate brand (returns true, doesn't add to Set)
- Test case-insensitive comparison (Brand, brand, BRAND all detected as same)
- Test incrementing totalCount on new brand
- Test totalCount not incremented on duplicate
- Test multiple brands with same slug (only first added)

**hasBrand() Tests:**
- Test checking existence of added brand (returns true)
- Test checking non-existent brand (returns false)
- Test case-insensitive lookup (Brand, brand, BRAND all match)
- Test checking with empty detector (returns false)
- Test checking after clearing detector

#### Product Duplicate Detection Tests

**addProduct() Tests:**
- Test adding first product for brand (returns false, adds to Set)
- Test adding duplicate product for brand (returns true, doesn't add to Set)
- Test case-insensitive comparison (Product, product, PRODUCT all detected as same)
- Test incrementing totalCount on new product
- Test totalCount not incremented on duplicate
- Test creating new product Set for new brand
- Test reusing existing product Set for brand
- Test multiple products with same slug (only first added)

**hasProduct() Tests:**
- Test checking existence of added product (returns true)
- Test checking non-existent product (returns false)
- Test case-insensitive lookup (Product, product, PRODUCT all match)
- Test checking with empty detector (returns false)
- Test checking with non-existent brand (returns false)
- Test checking after clearing detector

#### Count and Query Tests

**getBrandCount() Tests:**
- Test counting brands in empty detector (returns 0)
- Test counting after adding single brand (returns 1)
- Test counting after adding multiple brands
- Test count doesn't include duplicates
- Test count after clearing detector

**getProductCount() Tests:**
- Test counting products in empty detector (returns 0)
- Test counting after adding single product (returns 1)
- Test counting after adding multiple products for same brand
- Test counting after adding products for multiple brands
- Test count doesn't include duplicates
- Test count after clearing detector

**getProductCountByBrand() Tests:**
- Test counting products for specific brand (empty brand returns 0)
- Test counting products for brand with products
- Test counting after adding product to brand
- Test counting duplicates (only unique products counted)
- Test counting for non-existent brand (returns 0)

**getBrands() Tests:**
- Test retrieving brands from empty detector (returns empty array)
- Test retrieving all added brands
- Test brands are returned as array
- Test order preservation (order of addition)
- Test after clearing detector

**getProducts() Tests:**
- Test retrieving products from empty detector (returns empty array)
- Test retrieving all added products with brand associations
- Test products are returned as array of objects with slug and brandSlug
- Test products from multiple brands are included
- Test order preservation (order of addition)
- Test after clearing detector

**totalCount Tests:**
- Test initial totalCount (0)
- Test totalCount after adding brand (1)
- Test totalCount after adding product (2)
- Test totalCount after adding duplicate brand (still 1)
- Test totalCount after adding duplicate product (still 2)
- Test totalCount after clearing (returns to 0)

#### State Management Tests

**clear() Tests:**
- Test clearing all brands from detector
- Test clearing all products from detector
- Test resetting totalCount to 0
- Test detector can be reused after clearing
- Test clearing empty detector (no errors)

#### Edge Cases and Performance Tests

**Empty Detector Tests:**
- Test all operations with empty detector
- Test hasBrand() returns false for empty detector
- Test hasProduct() returns false for empty detector
- Test counts return 0 for empty detector
- Test retrieval returns empty arrays

**Single Item Tests:**
- Test adding single brand and checking existence
- Test adding single product and checking existence
- Test counts with single item
- Test retrieval with single item

**Multiple Items Tests:**
- Test adding multiple brands
- Test adding multiple products for same brand
- Test adding products for multiple brands
- Test counts with multiple items
- Test retrieval with multiple items

**Case Sensitivity Tests:**
- Test uppercase brand/product slugs
- Test lowercase brand/product slugs
- Test mixed case brand/product slugs
- Test all variations detected as same brand/product
- Test normalization to lowercase for comparison

**Brand-Specific Product Tests:**
- Test products for different brands are tracked separately
- Test getProducts() returns products with correct brandSlug
- Test getProductCountByBrand() returns correct count per brand
- Test duplicate detection is brand-specific (same slug in different brand is not duplicate)

### Duplicate Detector Testing Approach

**Unit Testing:**
- Test each duplicate detection function in isolation
- Test with various input types and edge cases
- Verify O(1) lookup performance
- Test case-insensitive comparison

**Integration Testing:**
- Test duplicate detection with normalized data
- Test duplicate detection with real-world scraped data
- Test duplicate detection with HTML parser output
- Test duplicate detector state persistence across operations

**Performance Testing:**
- Verify O(1) lookup time for brand existence checks
- Verify O(1) lookup time for product existence checks
- Test with large numbers of items (100+ brands, 1000+ products)
- Verify memory efficiency of Set and Map data structures

**State Testing:**
- Test detector state persistence
- Test totalCount accuracy
- Test independence of multiple detector instances
- Test state reset functionality

**Edge Case Testing:**
- Test empty detector state
- Test single item scenarios
- Test multiple items scenarios
- Test case sensitivity variations
- Test brand-specific product tracking
- Test clearing and reusing detector

### Duplicate Detector Test Results

- **Total Tests**: 105
- **Pass Rate**: 100% (105/105 tests passing)
- **Code Coverage**: 100%
- **Test File**: [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1)

## Scraper Orchestration Testing

### Scraper Orchestration Test Coverage

The scraper orchestrator ([`scraper/src/orchestrator.ts`](scraper/src/orchestrator.ts:1)) has comprehensive test coverage with 109 tests achieving 93.56% statements, 76.51% branches, 100% functions, and 93.56% lines code coverage.

**Test File**: [`scraper/test/orchestrator.test.ts`](scraper/test/orchestrator.test.ts:1)

### Scraper Orchestration Test Categories

#### Initialization Tests (8 tests)

**Constructor Tests:**
- Test creating ScraperOrchestrator with default configuration
- Test creating ScraperOrchestrator with custom configuration
- Test HTTP client initialization
- Test duplicate detector initialization
- Test configuration parameter application

**Environment Variable Tests:**
- Test reading SCRAPER_BASE_URL environment variable
- Test reading SCRAPER_MAX_CONCURRENT_BRANDS environment variable
- Test reading SCRAPER_MAX_CONCURRENT_PRODUCTS environment variable
- Test reading SCRAPER_CHECKPOINT_INTERVAL environment variable
- Test reading SCRAPER_MAX_RETRIES environment variable
- Test default values when environment variables not set

**Component Initialization Tests:**
- Test HTTP client is instantiated
- Test duplicate detector is created
- Test initial state of orchestrator (empty queues, zero counts)

#### Brand Discovery Tests (8 tests)

**Initial Discovery Tests:**
- Test discovering brands from initial page load
- Test extracting brand slugs from initial page
- Test tracking discovered brands count
- Test handling successful brand discovery
- Test returning correct result structure

**Iterative Discovery Tests:**
- Test iterative brand discovery with pagination
- Test handling multiple pages of brands
- Test detecting completion when all brands discovered
- Test tracking iteration counts
- Test handling empty brand lists
- Test handling malformed HTML during brand discovery
- Test retry logic on network failures during brand discovery
- Test checkpoint creation during brand discovery iterations

**Completion Detection Tests:**
- Test detecting brand discovery completion
- Test handling no more available brands
- Test handling empty pagination metadata
- Test tracking discovered brands correctly

#### Brand Data Extraction Tests (10 tests)

**Successful Extraction Tests:**
- Test extracting brand data successfully
- Test parsing brand detail page
- Test normalizing brand data
- Test validating brand data
- Test checking for duplicate brands
- Test storing brand in database
- Test updating metadata after successful extraction
- Test returning normalized brand data

**Parsing Tests:**
- Test calling parseBrandDetail with correct parameters
- Test handling parsed brand data
- Test extracting brand name, description, and image URL
- Test handling missing optional fields

**Normalization Tests:**
- Test calling normalizeBrandDetailData with parsed data
- Test cleaning text fields
- Test normalizing URLs
- Test generating slugs
- Test adding scrapedAt timestamps

**Validation Tests:**
- Test calling validateBrandData with normalized data
- Test validating required fields
- Test validating field lengths
- Test validating URL format
- Test handling validation failures

**Duplicate Detection Tests:**
- Test calling addBrand to check for duplicates
- Test skipping duplicate brands
- Test returning null for duplicate brands
- Test duplicate detector state updates

**Database Tests:**
- Test calling upsertBrand with normalized data
- Test handling database storage
- Test handling database errors
- Test retrieving brand ID for product association

**Error Handling Tests:**
- Test handling HTTP errors during brand extraction
- Test handling parsing errors
- Test handling validation errors
- Test logging invalid brand data
- Test returning null on errors
- Test updating metadata error count

**Optional Field Tests:**
- Test handling missing description field
- Test handling missing image URL field
- Test handling null optional fields
- Test graceful degradation with incomplete data

#### Product Discovery Tests (8 tests)

**Initial Discovery Tests:**
- Test discovering products from brand page
- Test extracting product slugs from initial page
- Test tracking discovered products count
- Test handling successful product discovery
- Test returning correct result structure

**Iterative Discovery Tests:**
- Test iterative product discovery with pagination
- Test handling multiple pages of products
- Test detecting completion when all products discovered
- Test tracking iteration counts per brand
- Test handling empty product lists
- Test handling malformed HTML during product discovery
- Test retry logic on network failures during product discovery
- Test checkpoint creation during product discovery iterations

**Completion Detection Tests:**
- Test detecting product discovery completion
- Test handling no more available products
- Test handling empty pagination metadata
- Test tracking discovered products correctly

#### Product Data Extraction Tests (10 tests)

**Successful Extraction Tests:**
- Test extracting product data successfully
- Test parsing product detail page
- Test normalizing product data
- Test validating product data
- Test checking for duplicate products
- Test storing product in database
- Test updating metadata after successful extraction
- Test returning normalized product data

**Parsing Tests:**
- Test calling parseProductDetail with correct parameters
- Test handling parsed product data
- Test extracting product name, description, and image URL
- Test handling missing optional fields

**Normalization Tests:**
- Test calling normalizeProductDetailData with parsed data
- Test cleaning text fields
- Test normalizing URLs
- Test generating slugs
- Test adding scrapedAt timestamps
- Test associating product with brand

**Validation Tests:**
- Test calling validateProductData with normalized data
- Test validating required fields
- Test validating field lengths
- Test validating URL format
- Test validating brandSlug association
- Test handling validation failures

**Duplicate Detection Tests:**
- Test calling addProduct to check for duplicates
- Test skipping duplicate products
- Test returning null for duplicate products
- Test duplicate detector state updates

**Database Tests:**
- Test calling createProduct with normalized data
- Test retrieving brand ID from database
- Test handling database storage
- Test handling database errors
- Test associating product with brand

**Error Handling Tests:**
- Test handling HTTP errors during product extraction
- Test handling parsing errors
- Test handling validation errors
- Test logging invalid product data
- Test returning null on errors
- Test updating metadata error count

**Optional Field Tests:**
- Test handling missing description field
- Test handling missing image URL field
- Test handling null optional fields
- Test graceful degradation with incomplete data

#### Job Queue Management Tests (9 tests)

**Queue Operations Tests:**
- Test queueing brands for processing
- Test queueing products for processing
- Test generating unique job IDs
- Test tracking job status (queued, processing, completed, failed)
- Test job timestamps (createdAt, completedAt)
- Test job data storage (brand slug, product slug + brand slug)

**Sequential Processing Tests:**
- Test processing brand queue sequentially
- Test processing product queue sequentially
- Test processing all queued items
- Test returning correct processed counts
- Test handling empty queues

**Concurrent Processing Tests:**
- Test respecting concurrent processing limits for brands
- Test respecting concurrent processing limits for products
- Test processing in batches
- Test concurrent job execution
- Test handling multiple jobs with concurrency limits

**Job Status Tracking Tests:**
- Test job status transitions (queued → processing → completed)
- Test job status transitions (queued → processing → failed)
- Test tracking job retry counts
- Test storing error messages in failed jobs

**Retry Logic Tests:**
- Test retrying failed jobs
- Test respecting maximum retry limit
- Test exponential backoff in retries
- Test retry count increment
- Test giving up after max retries
- Test retrying with different error types

**Multiple Items Tests:**
- Test processing queue with multiple items
- Test processing queue with many brands
- Test processing queue with many products
- Test batch processing with concurrency limits
- Test handling all items successfully
- Test handling some items failing

#### Progress Tracking Tests (10 tests)

**Brand Discovery Progress Tests:**
- Test tracking brand discovery iterations
- Test tracking brands discovered count
- Test logging brand discovery progress
- Test updating progress statistics

**Product Discovery Progress Tests:**
- Test tracking product discovery iterations
- Test tracking products discovered count
- Test logging product discovery progress
- Test updating progress statistics per brand

**Brand Processing Progress Tests:**
- Test tracking brands processed count
- Test tracking brands failed count
- Test updating progress after brand extraction

**Product Processing Progress Tests:**
- Test tracking products processed count
- Test tracking products failed count
- Test updating progress after product extraction

**Overall Progress Tests:**
- Test calculating total discovered items (brands + products)
- Test calculating total processed items
- Test calculating progress percentage
- Test tracking errors encountered
- Test returning correct progress structure
- Test handling zero items discovered

**Progress Logging Tests:**
- Test logging detailed progress information
- Test displaying iteration counts
- Test displaying discovered/processed counts
- Test displaying progress percentage
- Test displaying duplicate detector counts

**Checkpoint Tests:**
- Test saving checkpoints at intervals
- Test checkpoint data completeness
- Test checkpoint timestamp tracking
- Test handling checkpoint interval configuration

#### Error Handling Tests (8 tests)

**Brand Discovery Errors:**
- Test handling network errors during brand discovery
- Test handling HTTP errors during brand discovery
- Test logging brand discovery errors
- Test continuing after brand discovery failures
- Test updating metadata error count

**Brand Extraction Errors:**
- Test handling network errors during brand extraction
- Test handling parsing errors during brand extraction
- Test handling validation errors during brand extraction
- Test handling database errors during brand extraction
- Test logging brand extraction errors
- Test updating metadata error count

**Product Discovery Errors:**
- Test handling network errors during product discovery
- Test handling HTTP errors during product discovery
- Test logging product discovery errors
- Test continuing after product discovery failures
- Test updating metadata error count

**Product Extraction Errors:**
- Test handling network errors during product extraction
- Test handling parsing errors during product extraction
- Test handling validation errors during product extraction
- Test handling database errors during product extraction
- Test logging product extraction errors
- Test updating metadata error count

**Continuation After Failures:**
- Test continuing with next item after individual failures
- Test continuing with next brand after brand failures
- Test continuing with next product after product failures
- Test graceful degradation on multiple failures

#### Metadata Management Tests (8 tests)

**Initialization Tests:**
- Test creating scraping metadata record
- Test initializing with full_refresh operation type
- Test initializing with incremental_update operation type
- Test setting initial status to in_progress
- Test setting initial counts to zero
- Test recording start timestamp

**Progress Updates:**
- Test updating metadata with brand count
- Test updating metadata with product count
- Test updating both counts simultaneously
- Test updating metadata during extraction operations
- Test handling metadata update errors

**Error Tracking:**
- Test incrementing error count on failures
- Test incrementing error count on multiple errors
- Test storing error details in metadata
- Test handling metadata error tracking failures

**Completion Tests:**
- Test marking operation as completed
- Test setting completion timestamp
- Test updating final counts
- Test handling completion without initialization

**Failure Tests:**
- Test marking operation as failed
- Test storing error details
- Test setting failure timestamp
- Test handling failure without initialization

**No Initialization Tests:**
- Test handling operations without metadata ID
- Test graceful handling of completeOperation without initialization
- Test graceful handling of failOperation without initialization
- Test graceful handling of updateProgress without initialization

#### Integration Tests (7 tests)

**End-to-End Workflows:**
- Test complete brand discovery workflow
- Test complete brand extraction workflow
- Test complete product discovery workflow
- Test complete product extraction workflow
- Test complete scraping workflow from discovery to storage
- Test handling all components together

**Component Integration Tests:**
- Test HTTP client integration with orchestrator
- Test HTML parser integration with orchestrator
- Test data normalizer integration with orchestrator
- Test duplicate detector integration with orchestrator
- Test database integration with orchestrator
- Test metadata integration with orchestrator

**Workflow Coordination Tests:**
- Test initialization → discovery → extraction → storage flow
- Test error handling throughout workflow
- Test progress tracking throughout workflow
- Test checkpoint creation throughout workflow
- Test metadata updates throughout workflow

#### Edge Cases and Error Scenarios (11 tests)

**Network Scenarios:**
- Test handling network timeouts during operations
- Test handling rate limit responses (429)
- Test handling connection errors
- Test handling DNS resolution failures
- Test handling intermittent network failures

**Parsing Scenarios:**
- Test handling malformed HTML responses
- Test handling missing required elements
- Test handling empty responses
- Test handling unexpected HTML structure changes

**Data Validation Scenarios:**
- Test handling invalid data formats
- Test handling missing required fields
- Test handling exceeding field length limits
- Test handling invalid URLs
- Test handling invalid timestamps

**Database Scenarios:**
- Test handling database connection failures
- Test handling constraint violations
- Test handling duplicate key errors
- Test handling transaction rollbacks
- Test handling serialization failures

**Duplicate Item Scenarios:**
- Test handling duplicate items across iterations
- Test handling duplicate brands in same iteration
- Test handling duplicate products in same iteration
- Test duplicate detector state corruption
- Test case sensitivity variations

**Infinite Loop Prevention:**
- Test handling infinite pagination loops
- Test detecting completion when no new items
- Test handling empty pagination metadata
- Test timeout-based completion as fallback

**Special Characters and Unicode:**
- Test handling very long URLs
- Test handling special characters in names
- Test handling emoji in names
- Test handling Unicode characters in text fields

**Edge Case Recovery:**
- Test handling corrupted checkpoint data
- Test handling missing checkpoint data
- Test handling invalid checkpoint structure
- Test recovery from incomplete state

#### Utility Methods Tests (4 tests)

**State Management Tests:**
- Test resetting orchestrator state
- Test clearing all queues
- Test resetting all counters
- Test resetting duplicate detector
- Test resetting metadata ID
- Test resetting iteration counts

**Statistics Tests:**
- Test getting comprehensive statistics
- Test statistics accuracy after operations
- Test statistics with empty state
- Test statistics after partial operations
- Test statistics include all tracked counts

**Checkpoint Tests:**
- Test saving checkpoint with current state
- Test checkpoint data structure
- Test checkpoint includes all necessary fields
- Test checkpoint timestamp accuracy

**Progress Logging Tests:**
- Test logging progress with various states
- Test progress log format
- Test progress log completeness
- Test progress log with zero items

**Helper Function Tests:**
- Test extractSlugFromUrl helper
- Test getStringEnv helper
- Test getNumberEnv helper
- Test environment variable parsing

#### Job Status Tests (1 test)

**Job Status Enum Tests:**
- Test JobStatus.QUEUED value
- Test JobStatus.PROCESSING value
- Test JobStatus.COMPLETED value
- Test JobStatus.FAILED value
- Test all status enum values are correct strings

### Scraper Orchestration Testing Approach

**Unit Testing:**
- Test each orchestration function in isolation
- Test with various input types and edge cases
- Verify error handling and retry logic
- Test job queue management
- Test progress tracking accuracy
- Test metadata integration

**Integration Testing:**
- Test end-to-end scraping workflows
- Test coordination between all components
- Test HTTP client integration
- Test HTML parser integration
- Test data normalizer integration
- Test duplicate detector integration
- Test database integration
- Test metadata integration

**Mocking Strategy:**
- Mock HTTP client for all HTTP requests
- Mock HTML parser functions for parsing tests
- Mock data normalizer functions for validation tests
- Mock duplicate detector for tracking tests
- Mock database operations for storage tests
- Mock metadata operations for tracking tests

**State Testing:**
- Test orchestrator state across operations
- Test progress tracking accuracy
- Test job queue state management
- Test checkpoint creation and restoration
- Test error count tracking

**Edge Case Testing:**
- Test empty queues and zero counts
- Test single item processing
- Test multiple items with failures
- Test infinite loop prevention
- Test malformed data handling
- Test network failures
- Test database failures
- Test validation failures

**Performance Testing:**
- Test concurrent processing with limits
- Test large queue processing
- Test progress calculation with large numbers
- Test memory efficiency with large datasets

### Scraper Orchestration Test Results

- **Total Tests**: 109
- **Pass Rate**: 100% (109/109 tests passing)
- **Code Coverage**: 93.56% statements, 76.51% branches, 100% functions, 93.56% lines
- **Test File**: [`scraper/test/orchestrator.test.ts`](scraper/test/orchestrator.test.ts:1)
- **Test Categories**: 12 (Initialization, Brand Discovery, Brand Data Extraction, Product Discovery, Product Data Extraction, Job Queue Management, Progress Tracking, Error Handling, Metadata Management, Integration, Edge Cases, Utility Methods, Job Status)
- **Integration Points**: HTTP Client, HTML Parser, Data Normalizer, Duplicate Detector, Database, Metadata
- **Environment Variables**: SCRAPER_BASE_URL, SCRAPER_MAX_CONCURRENT_BRANDS, SCRAPER_MAX_CONCURRENT_PRODUCTS, SCRAPER_CHECKPOINT_INTERVAL, SCRAPER_MAX_RETRIES
- **Total Scraper Tests**: 470 tests (54 HTTP client + 92 HTML parser + 110 data normalizer + 105 duplicate detector + 109 orchestrator)
- **Overall Scraper Coverage**: Excellent coverage across all modules

## Dynamic Loading Test Scenarios

### Brand Discovery Tests

**Single Page Brand Discovery:**
- Verify extraction of all brands from a single page load
- Test parsing of brand links and metadata
- Validate brand data structure

**Multi-Page Brand Discovery:**
- Verify iterative discovery across multiple page loads
- Test duplicate detection across iterations
- Validate completion detection when all brands are discovered
- Test handling of empty or malformed intermediate pages

**Brand Discovery with Failures:**
- Test retry logic when a page load fails
- Verify continuation after failed iteration
- Test timeout handling during brand discovery
- Validate state persistence after interruption

### Product Discovery Tests

**Single Page Product Discovery:**
- Verify extraction of all products from a brand page initial load
- Test parsing of product links and metadata
- Validate product-brand association

**Multi-Page Product Discovery:**
- Verify iterative discovery across multiple product page loads
- Test handling of brands with large product counts (100+)
- Validate completion detection when all products are discovered
- Test duplicate detection across product iterations

**Product Discovery with Failures:**
- Test retry logic when a product page load fails
- Verify continuation after failed iteration
- Test timeout handling during product discovery
- Validate state persistence after interruption

### Iteration State Management Tests

**State Tracking:**
- Verify proper tracking of discovered items across iterations
- Test state persistence and recovery
- Validate state consistency after interruptions

**Duplicate Detection:**
- Test identification of duplicate brands across iterations
- Test identification of duplicate products across iterations
- Verify deduplication logic with various data scenarios

**Completion Detection:**
- Test detection of end-of-list for brand discovery
- Test detection of end-of-list for product discovery
- Verify handling of ambiguous completion signals
- Test timeout-based completion as fallback

### Resumable Scraping Tests

**Checkpoint Creation:**
- Verify checkpoint creation after each iteration
- Test checkpoint data completeness
- Validate checkpoint storage in database

**Checkpoint Recovery:**
- Test resumption from last checkpoint after interruption
- Verify correct continuation of iteration sequence
- Test handling of corrupted or missing checkpoints

**Incremental Updates:**
- Test identification of already-processed items
- Verify update logic for changed items
- Test full refresh vs incremental update scenarios

### Large Data Volume Tests

**Brand Volume Testing:**
- Test handling of 100+ brands
- Verify performance with large brand sets
- Test memory management during brand discovery

**Product Volume Testing:**
- Test handling of brands with 100+ products
- Verify performance with large product sets
- Test batch database operations for efficiency

**Combined Volume Testing:**
- Test handling of thousands of products across all brands
- Verify system stability during long-running operations
- Test resource management and cleanup

## Test Data Management

### Test Database

- Separate database instance for testing
- Isolated from development and production databases
- Clean state before each test run
- Seed data for common test scenarios
- Configured via `docker-compose.test.yml`
- Test setup implemented in [`database/test/setup.ts`](database/test/setup.ts:1)

### Test Fixtures

- Reusable test data objects
- Consistent across test suites
- Easy to modify when requirements change
- Documented for maintainability

### Dynamic Loading Test Fixtures

- Multiple example HTML files representing different iteration states
- Mock responses for pagination or infinite scroll endpoints
- Test data for various completion scenarios
- Error scenario fixtures for iteration failures

## Running Tests

### Local Development

Tests run automatically during development:

- Watch mode triggers tests on file changes
- Fast feedback loop for developers
- Failed tests block commits in pre-commit hooks

### Database Tests

Run database tests from the database package directory:

```bash
# Run all database tests
cd database && pnpm test:run

# Run tests with coverage
cd database && pnpm test:coverage
```

### Scraper Tests

Run scraper tests to verify dynamic loading logic:

```bash
# Run all scraper tests
cd scraper && pnpm test:run

# Run tests with coverage
cd scraper && pnpm test:coverage

# Run specific HTTP client tests
cd scraper && pnpm test:run --grep "HTTP Client"

# Run specific HTML parser tests
cd scraper && pnpm test:run --grep "HTML Parser"

# Run specific data normalizer tests
cd scraper && pnpm test:run --grep "Data Normalizer"

# Run specific duplicate detector tests
cd scraper && pnpm test:run --grep "Duplicate Detector"

# Run specific orchestrator tests
cd scraper && pnpm test:run --grep "Orchestrator"

# Run specific dynamic loading tests
cd scraper && pnpm test:run --grep "dynamic loading"
```

### Continuous Integration

All tests run in CI pipeline:

- Full test suite on every pull request
- Coverage reports generated and checked
- Tests must pass before merging
- Dynamic loading scenarios included in CI

### Manual Testing

Ad-hoc testing scenarios:

- Manual API testing with generated keys
- Verification against live website
- Performance testing under load
- Testing with actual dynamic loading behavior

## Testing External Dependencies

### HTML Parsing

Tests use example HTML files instead of live website:

- Eliminates network dependency
- Provides consistent test input
- Allows testing of historical page structures
- Prevents rate limiting from source website
- For dynamic loading, multiple example files simulate iterative loads

### Database

Tests use test database instance:

- Isolated from production data
- Configurable for different test scenarios
- Fast setup and teardown
- No risk to production data
- Test database configured in `docker-compose.test.yml`
- Clean state before each test run

### HTTP Requests

External HTTP requests are mocked:

- Tests don't depend on external services
- Can simulate various response scenarios
- Faster test execution
- No network flakiness
- Can mock iterative loading responses with different states

## Error Scenario Testing

### Network Failures

- Connection timeouts
- DNS resolution failures
- HTTP error responses
- Malformed responses
- Rate limiting responses
- Intermittent network failures during iterations

### Parsing Failures

- Missing expected HTML elements
- Malformed HTML structure
- Empty or null values
- Unexpected data formats
- Inconsistent data across iterations

### Database Failures

- Connection failures
- Constraint violations
- Duplicate key errors
- Transaction rollbacks
- Serialization failures
- Deadlock detection
- Cascade delete behavior

### Iteration Failures

- Timeout during iteration
- Incomplete iteration due to error
- Duplicate items in iteration
- Infinite iteration loops
- State corruption during iteration
- Checkpoint creation failures
- Recovery from corrupted state

### HTTP Client Failures

- Request timeout
- Network connectivity issues
- Rate limit exceeded
- Server errors (5xx)
- Client errors (4xx)
- Retry exhaustion
- Invalid user agents
- Malformed URLs

### HTML Parser Failures

- Malformed HTML structure
- Missing required elements
- Invalid CSS selectors
- Unexpected HTML changes
- Missing optional fields
- Invalid data types
- Empty results

### Data Normalization Failures

- Invalid URL format
- Exceeding field length limits
- Missing required fields
- Invalid timestamp format
- Null/undefined values in required fields
- Malformed URLs that cannot be parsed

### Duplicate Detection Failures

- Case sensitivity issues
- Incorrect slug generation
- State corruption
- Memory issues with large datasets
- Incorrect count tracking
- Brand/product association errors

### Orchestration Failures

- Job queue processing failures
- Progress tracking errors
- Checkpoint creation failures
- Metadata update failures
- Concurrent processing errors
- Retry logic failures
- State reset failures
- Statistics calculation errors

## Test Maintenance

### Updating Tests

Tests must be updated when:

- Business logic changes
- Data model changes
- API contracts change
- Source website structure changes
- Dynamic loading behavior changes
- Iteration patterns change
- HTTP client behavior changes
- HTML parser logic changes
- Data normalization rules change
- Duplicate detection logic changes
- Orchestration logic changes

### Refactoring Tests

Regular test maintenance includes:

- Removing obsolete tests
- Consolidating duplicate tests
- Improving test clarity
- Optimizing test performance
- Updating example HTML files for new page structures

### Dynamic Loading Test Maintenance

Special considerations for dynamic loading tests:

- Update example HTML files when loading patterns change
- Add new test scenarios for new iteration mechanisms
- Update completion detection tests when end-of-list signals change
- Maintain test coverage for various data volume scenarios

### HTTP Client Test Maintenance

Special considerations for HTTP client tests:

- Update retry logic tests when retry behavior changes
- Update rate limiting tests when rate limit algorithm changes
- Update user agent tests when user agent list changes
- Maintain test coverage for all HTTP client features
- Update error scenario tests as new error cases are identified

### HTML Parser Test Maintenance

Special considerations for HTML parser tests:

- Update example HTML files when website structure changes
- Update selector tests when CSS selectors change
- Update completion detection tests when pagination logic changes
- Add new test cases for new data types or fields
- Update error scenario tests as new parsing errors are identified
- Maintain test coverage for all parser functions

### Data Normalization Test Maintenance

Special considerations for data normalization tests:

- Update validation tests when business rules change
- Update length limit tests when field constraints change
- Add new normalization tests for new data types
- Update URL normalization tests when URL handling changes
- Maintain test coverage for all normalization functions
- Update error logging tests when error handling changes

### Duplicate Detection Test Maintenance

Special considerations for duplicate detection tests:

- Add new tests for new duplicate detection scenarios
- Update performance tests when data structures change
- Maintain test coverage for all duplicate detection functions
- Update integration tests with other components
- Update state tests for new tracking features

### Orchestration Test Maintenance

Special considerations for orchestration tests:

- Add new tests for new orchestration features
- Update job queue tests when queue logic changes
- Update progress tracking tests when monitoring features change
- Update metadata integration tests when tracking changes
- Update error handling tests for retry logic changes
- Maintain test coverage for all orchestration functions
- Update integration tests with all scraper components

## Documentation Updates

This documentation was updated to include HTML Parser Testing section following to completion of Phase3.2 HTML Parser implementation.

**Changes Made:**
- Added comprehensive HTML Parser Testing section
- Documented all 92 test categories and their purposes
- Included test results (91.99% coverage, 100% pass rate)
- Added HTML Parser Testing approach and methodology
- Updated Test Maintenance section with HTML Parser specific considerations

**Test File Reference:**
- [`scraper/test/html-parser.test.ts`](scraper/test/html-parser.test.ts:1)

**Implementation Reference:**
- [`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)
- [`scraper/src/parser-error.ts`](scraper/src/parser-error.ts:1)
- [`scraper/src/types.ts`](scraper/src/types.ts:1)

This documentation was updated to include Data Normalization Testing and Duplicate Detection Testing sections following to completion of Phase 3.3 Data Normalization and Duplicate Detection implementation.

**Changes Made:**
- Added comprehensive Data Normalization Testing section with 110 tests
- Added comprehensive Duplicate Detection Testing section with 105 tests
- Documented all test categories and their purposes
- Included test results (96.83% coverage for data normalizer, 100% coverage for duplicate detector)
- Added testing approaches and methodologies
- Updated Test Maintenance section with data normalization and duplicate detection specific considerations

**Test File References:**
- [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1) - 110 tests, 96.83% coverage
- [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1) - 105 tests, 100% coverage

**Implementation References:**
- [`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1) - Data normalization module
- [`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1) - Duplicate detection module
- [`scraper/src/types.ts`](scraper/src/types.ts:1) - Type definitions for normalized data and duplicate detector

This documentation was updated to include Scraper Orchestration Testing section following to completion of Phase 3.4 Scraping Orchestration implementation.

**Changes Made:**
- Added comprehensive Scraper Orchestration Testing section with 109 tests
- Documented all 12 test categories and their purposes
- Included test results (93.56% statements, 76.51% branches, 100% functions, 93.56% lines coverage)
- Added Scraper Orchestration Testing approach and methodology
- Updated Test Maintenance section with orchestration specific considerations

**Test File Reference:**
- [`scraper/test/orchestrator.test.ts`](scraper/test/orchestrator.test.ts:1) - 109 tests, 93.56% coverage

**Implementation References:**
- [`scraper/src/orchestrator.ts`](scraper/src/orchestrator.ts:1) - Scraper orchestration module
- [`scraper/src/types.ts`](scraper/src/types.ts:1) - Type definitions for orchestrator
- [`scraper/src/http-client.ts`](scraper/src/http-client.ts:1) - HTTP client for web requests
- [`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1) - HTML parser for data extraction
- [`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1) - Data normalization module
- [`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1) - Duplicate detection module
- [`database/src/brands.ts`](database/src/brands.ts:1) - Database brand operations
- [`database/src/products.ts`](database/src/products.ts:1) - Database product operations
- [`database/src/metadata.ts`](database/src/metadata.ts:1) - Database metadata operations
