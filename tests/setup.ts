/**
 * Test Setup File
 * 
 * This file is run before all tests to set up the test environment.
 * It configures Jest and sets up global test utilities.
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Set up test API key
process.env.API_KEY_TEST = 'test-api-key';

// Set up rate limiting for tests (high limits to avoid blocking)
process.env.RATE_LIMIT_MAX = '1000';
process.env.RATE_LIMIT_WINDOW = '60000';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // Uncomment to suppress console.error in tests
  // error: jest.fn(),
  // Uncomment to suppress console.warn in tests
  // warn: jest.fn(),
};

// Increase timeout for async operations
jest.setTimeout(10000);
