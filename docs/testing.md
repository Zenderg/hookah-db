# Testing Strategy

## Testing Philosophy

The project follows a comprehensive testing approach that prioritizes reliability and maintainability. Tests serve as living documentation and ensure that scraping logic remains accurate as the source website structure evolves.

## The Examples Directory

The `examples/` directory contains HTML files saved from htreviews.org. These files serve as static snapshots of the website's structure at specific points in time.

### Purpose of Examples

- **Stable Test Data**: Provides consistent, unchanging input for parsing tests
- **Offline Testing**: Enables test execution without network dependencies
- **Regression Prevention**: Detects changes in scraping logic when source structure changes
- **Documentation**: Serves as reference for expected HTML structure

### Example File Types

- **Brand List Page**: HTML showing the list of all tobacco brands
- **Brand Detail Page**: HTML for a specific brand with product links
- **Product Detail Page**: HTML for a specific tobacco product

### Maintaining Examples

- Update examples when the source website structure changes significantly
- Add new examples when new page types are introduced
- Remove outdated examples when corresponding pages are removed from the source

## Test Categories

### Unit Tests

Test individual functions and components in isolation.

**Scope**:
- HTML parsing functions for extracting specific data points
- Data transformation and normalization logic
- Utility functions for string manipulation, URL handling
- API key generation and validation logic

**Characteristics**:
- Fast execution
- No external dependencies
- Mock all external interactions
- Test edge cases and error conditions

### Integration Tests

Test interactions between multiple components.

**Scope**:
- Scraper reading HTML from files and extracting data
- Database operations for storing and retrieving entities
- API key validation against the database
- End-to-end data flow from HTML parsing to database storage

**Characteristics**:
- Use real database instances (test-specific)
- Use example HTML files as input
- Test component interactions
- Verify data persistence

### End-to-End Tests

Test complete workflows from start to finish.

**Scope**:
- Full scraping workflow using example HTML files
- API request handling with authentication
- Complete data retrieval from database to API response
- API key management workflow

**Characteristics**:
- Test complete user scenarios
- Use all real components (except external HTTP calls)
- Verify system behavior as a whole
- Slower execution but high confidence

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

### Critical Path Coverage

All critical paths must have comprehensive tests:

- Brand discovery and extraction
- Product discovery and extraction
- Data persistence to database
- API request authentication
- API response formatting

## Test Data Management

### Test Database

- Separate database instance for testing
- Isolated from development and production databases
- Clean state before each test run
- Seed data for common test scenarios
- Configured via `docker-compose.test.yml`
- Test setup implemented in [`database/test/setup.ts`](database/test/setup.ts)

### Test Fixtures

- Reusable test data objects
- Consistent across test suites
- Easy to modify when requirements change
- Documented for maintainability

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

### Continuous Integration

All tests run in CI pipeline:

- Full test suite on every pull request
- Coverage reports generated and checked
- Tests must pass before merging

### Manual Testing

Ad-hoc testing scenarios:

- Manual API testing with generated keys
- Verification against live website
- Performance testing under load

## Testing External Dependencies

### HTML Parsing

Tests use example HTML files instead of live website:

- Eliminates network dependency
- Provides consistent test input
- Allows testing of historical page structures
- Prevents rate limiting from source website

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

## Error Scenario Testing

### Network Failures

- Connection timeouts
- DNS resolution failures
- HTTP error responses
- Malformed responses

### Parsing Failures

- Missing expected HTML elements
- Malformed HTML structure
- Empty or null values
- Unexpected data formats

### Database Failures

- Connection failures
- Constraint violations
- Duplicate key errors
- Transaction rollbacks
- Serialization failures
- Deadlock detection

**Database Failure Test Scenarios**:
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

## Test Maintenance

### Updating Tests

Tests must be updated when:

- Business logic changes
- Data model changes
- API contracts change
- Source website structure changes

### Refactoring Tests

Regular test maintenance includes:

- Removing obsolete tests
- Consolidating duplicate tests
- Improving test clarity
- Optimizing test performance

## Quality Gates

### Pre-Commit

- Fast unit tests run automatically
- Linting and formatting checks
- Type checking (if applicable)

### Pre-Merge

- Full test suite must pass
- Coverage thresholds must be met
- No flaky tests allowed
- Code review approval required

### Pre-Release

- All tests passing
- Integration tests with staging environment
- Performance benchmarks met
- Security review completed
