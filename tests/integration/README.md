# Integration Tests

This directory contains integration tests that make real HTTP requests to htreviews.org to verify that the scraper works in practice with live data.

## ⚠️ Important Notice

Integration tests are **disabled by default** to:
- Be respectful of htreviews.org's server resources
- Avoid unnecessary network requests during development
- Prevent test failures due to network issues or server downtime

## Running Integration Tests

### Enable Integration Tests

To run integration tests, you must set the `INTEGRATION_TESTS` environment variable to `true`:

```bash
# Run all integration tests
INTEGRATION_TESTS=true pnpm test tests/integration

# Run specific integration test file
INTEGRATION_TESTS=true pnpm test tests/integration/scraper.test.ts

# Run with verbose output
INTEGRATION_TESTS=true pnpm test tests/integration --verbose
```

### Run in Watch Mode

```bash
INTEGRATION_TESTS=true pnpm test tests/integration --watch
```

## Test Coverage

The integration tests cover:

### Brand List Scraper
- ✅ Scrapes brands list from htreviews.org
- ✅ Verifies known brands exist (Sarma, Dogma, DARKSIDE, Tangiers)
- ✅ Validates brand data structure and types
- ✅ Tests rate limiting with multiple requests
- ✅ Handles network errors gracefully

### Brand Details Scraper
- ✅ Scrapes brand details for Sarma, Dogma, DARKSIDE
- ✅ Verifies all brand fields are extracted
- ✅ Tests brands with many lines (DARKSIDE)
- ✅ Handles non-existent brands gracefully (returns null)
- ✅ Validates brand data structure matches Brand type

### Flavor Details Scraper
- ✅ Scrapes flavor details for Sarma Klassicheskaya Zima
- ✅ Scrapes flavor details for Dogma Berry
- ✅ Verifies tags are extracted correctly
- ✅ Tests flavors with many tags
- ✅ Validates rating distribution structure
- ✅ Verifies smoke again percentage
- ✅ Validates htreviewsId and dateAdded
- ✅ Handles non-existent flavors gracefully (returns null)
- ✅ Validates flavor data structure matches Flavor type

### Error Handling
- ✅ Handles 404 errors for non-existent brands
- ✅ Handles 404 errors for non-existent flavors
- ✅ Handles network timeouts gracefully

### Performance
- ✅ Scrapes brands list within 30 seconds
- ✅ Scrapes brand details within 30 seconds
- ✅ Scrapes flavor details within 30 seconds

## Test Timeouts

Integration tests use longer timeouts than unit tests to account for network latency:

- Standard tests: 60 seconds
- Multiple request tests: 90 seconds

## Best Practices

### When to Run Integration Tests

Run integration tests when:
- Making changes to scraper logic
- Updating HTML parsing selectors
- Testing rate limiting behavior
- Verifying data extraction with live data
- Before deploying to production

### When NOT to Run Integration Tests

Avoid running integration tests when:
- Making changes to unit tests
- Updating type definitions
- Refactoring non-scraper code
- Running full test suite frequently during development

### Being Respectful

- Run integration tests sparingly (once per feature change)
- Avoid running in watch mode for extended periods
- Don't run integration tests in CI/CD pipelines unless necessary
- Consider using cached data when possible

## Troubleshooting

### Tests Skipped

If you see "⚠️ Integration tests are skipped" message:
```bash
# Make sure to set the environment variable
INTEGRATION_TESTS=true pnpm test tests/integration
```

### Network Errors

If tests fail with network errors:
- Check your internet connection
- Verify htreviews.org is accessible
- Try running the test again (temporary network issues)
- Check if htreviews.org is experiencing downtime

### Timeouts

If tests timeout:
- Check your internet connection speed
- Verify htreviews.org is responding normally
- Consider increasing timeout values in test file

### 404 Errors

If tests fail with 404 errors for expected data:
- The test data may have changed on htreviews.org
- Update test constants with current brand/flavor slugs
- Verify the brand/flavor still exists on htreviews.org

## Test Data

The integration tests use the following test data:

### Test Brands
- `sarma` - Сарма (Россия)
- `dogma` - Догма (Россия)
- `darkside` - DARKSIDE (Россия)
- `tangiers` - Tangiers (США)

### Test Flavors
- `sarma/klassicheskaya/zima` - Зима (Winter)
- `dogma/berry/berry` - Berry

If these brands or flavors are removed or renamed on htreviews.org, update the test constants in `tests/integration/scraper.test.ts`.

## Continuous Integration

To include integration tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    INTEGRATION_TESTS=true pnpm test tests/integration
  if: github.event_name == 'schedule' || contains(github.event.head_commit.message, '[integration-test]')
```

This ensures integration tests only run:
- On scheduled runs (e.g., nightly)
- When commit message includes `[integration-test]` tag

## Additional Resources

- [Unit Tests](../unit/README.md)
- [Scraper Documentation](../../../packages/scraper/README.md)
- [Type Definitions](../../../packages/types/README.md)
