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
- **Scraper Settings**: Iteration timeouts, retry limits, batch sizes

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

### Error Handling

Consistent error handling across services:

- Standardized error response formats
- Graceful degradation on failures
- Retry logic for transient errors
- Iteration-level error isolation (scraper)
- Checkpoint recovery mechanisms (scraper)

### Testing

Comprehensive test coverage across all components:

- Unit tests for individual functions
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Dynamic loading scenario tests (scraper)
- Large data volume tests (scraper)
- Checkpoint and recovery tests (scraper)

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
- **Rate Limiting**: Respect source server limits
- **Caching**: Avoid redundant requests
