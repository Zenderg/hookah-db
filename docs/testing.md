# Testing Strategy

## Testing Philosophy

The project follows a comprehensive testing approach that prioritizes reliability and maintainability. Tests serve as living documentation and ensure that scraping logic remains accurate as the source website structure evolves. Given that the source website uses dynamic loading (infinite scroll/lazy loading), testing must verify the iterative data retrieval mechanisms.

## The Examples Directory

The `examples/` directory contains HTML files saved from htreviews.org. These files serve as static snapshots of the website's structure at specific points in time.

### Purpose of Examples

- **Stable Test Data**: Provides consistent, unchanging input for parsing tests
- **Offline Testing**: Enables test execution without network dependencies
- **Regression Prevention**: Detects changes in scraping logic when source structure changes
- **Documentation**: Serves as reference for expected HTML structure

### Example File Types

- **Brand List Page (Initial Load)**: HTML showing the first batch of brands from the listing page
- **Brand List Page (Subsequent Loads)**: HTML showing additional brands loaded via pagination or infinite scroll (if available)
- **Brand Detail Page (Initial Load)**: HTML for a specific brand with initial product links
- **Brand Detail Page (Subsequent Loads)**: HTML showing additional products loaded via pagination or infinite scroll (if available)
- **Product Detail Page**: HTML for a specific tobacco product

### Maintaining Examples

- Update examples when the source website structure changes significantly
- Add new examples when new page types or loading patterns are introduced
- Remove outdated examples when corresponding pages are removed from the source
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
- API key validation against the database
- End-to-end data flow from HTML parsing to database storage
- Checkpoint creation and recovery mechanisms
- Duplicate detection across iterations
- HTTP client integration with scraper workflows

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

**Characteristics:**
- Test complete user scenarios
- Use all real components (except external HTTP calls)
- Verify system behavior as a whole
- Slower execution but high confidence
- Test large data volume handling

## Test Organization

### Test Structure

Tests mirror the project structure:

- **Backend Tests**: Located in backend service directory
- **Scraper Tests**: Located in scraper service directory
- **Shared Tests**: Located in shared utilities directory
- **Database Tests**: Located in database directory

### Test Naming

Tests follow descriptive naming conventions that indicate:

- What is being tested
- What conditions are being tested
- What the expected outcome is

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
- Test maximum retry delay cap
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
- Batch operation failures

**Database Failure Test Scenarios:**
- Connection pool exhaustion
- Invalid connection parameters
- Retry logic on transient failures
- Foreign key constraint violations
- Unique constraint violations
- CHECK constraint violations
- Transaction rollback on errors
- Savepoint rollback
- Isolation level behavior
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
