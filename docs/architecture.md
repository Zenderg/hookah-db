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
- Each package has its own `tsconfig.json` extending the root configuration
- Packages define their own output directory and build settings
- Allows for different build targets per package

### Code Quality Tools

**ESLint Configuration (`.eslintrc.cjs`):**
- Configured as CommonJS module for ES module compatibility
- Shared across all workspace packages
- Enforces consistent code style and best practices

**Prettier Configuration (`.prettierrc`):**
- Shared formatting rules across the entire project
- Applied to all TypeScript and configuration files
- Ensures consistent code formatting

## Project Components

### Backend Service

The backend service is the core component responsible for:

- **HTTP Server**: Exposes REST API endpoints for client access
- **Authentication Middleware**: Validates API keys on incoming requests
- **Data Access Layer**: Interacts with the database to retrieve tobacco data
- **Request Processing**: Handles client queries and returns structured responses

### Scraper Service

The scraper service is responsible for:

- **HTTP Client**: Fetches HTML pages from htreviews.org with support for iterative requests
- **HTML Parser**: Extracts structured data from HTML documents across multiple iterations
- **Data Normalization**: Transforms raw scraped data into consistent formats
- **Error Handling**: Manages network failures and parsing errors
- **Iteration Management**: Handles dynamic loading patterns (infinite scroll, lazy loading, pagination)
- **State Tracking**: Maintains state across iterations for brand and product discovery
- **Completion Detection**: Identifies when all data has been loaded from dynamic lists
- **Checkpoint Management**: Saves progress for resumable scraping operations
- **Duplicate Detection**: Prevents duplicate processing across iterations
- **Batch Processing**: Optimizes database operations for large data volumes

#### HTTP Client Component

The HTTP client ([`scraper/src/http-client.ts`](scraper/src/http-client.ts:1)) provides robust web scraping capabilities with the following features:

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

The HTML parser ([`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)) provides structured data extraction from HTML documents with the following features:

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

**Scraper Architecture Considerations:**

The scraper is designed to handle dynamic loading on the source website:

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

- **Backend Container**: Runs the API service in production mode
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

### Error Handling

Consistent error handling across services:

- Standardized error response formats
- Graceful degradation on failures
- Retry logic for transient errors
- Iteration-level error isolation (scraper)
- Checkpoint recovery mechanisms (scraper)
- HTTP client retry with exponential backoff (scraper)

### Testing

Comprehensive test coverage across all components:

- Unit tests for individual functions
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Dynamic loading scenario tests (scraper)
- Large data volume tests (scraper)
- Checkpoint and recovery tests (scraper)
- HTTP client tests (scraper)

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

- **Explicit Signals**: End-of-list indicators from the source
- **Empty Results**: No new items returned in iteration
- **Pagination Exhaustion**: No more pages available
- **Timeout Fallback**: Maximum iterations or time limit reached

### Resumable Scraping

The scraper supports resumable operations:

- **Checkpoint Creation**: Saves state after each iteration
- **Checkpoint Recovery**: Resumes from last saved state
- **Incremental Updates**: Skips already-processed items
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

- **Batch Operations**: Group database writes for efficiency
- **Concurrent Processing**: Process multiple brands in parallel (with limits)
- **Memory Management**: Clear processed data from memory
- **Rate Limiting**: Respect source server limits (token bucket algorithm)
- **Caching**: Avoid redundant requests
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **User Agent Rotation**: Distribute requests across different user agents

### HTTP Client Integration

The HTTP client ([`scraper/src/http-client.ts`](scraper/src/http-client.ts:1)) is integrated into the scraper architecture as follows:

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

The HTML parser ([`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)) is integrated into the scraper architecture as follows:

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
