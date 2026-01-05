# Technology Stack

## Core Technologies

### Runtime & Language
- **Node.js**: JavaScript runtime for server-side execution
- **TypeScript**: Superset of JavaScript for type safety and better developer experience

### Package Management
- **pnpm**: Fast, disk space efficient package manager (preferred over npm/yarn)
- **pnpm Workspaces**: Monorepo workspace management
- **Turborepo**: Build system for monorepo with intelligent caching and task orchestration
- **@changesets/cli**: Version management and changelog generation for monorepo packages

### Web Scraping
- **Cheerio**: Fast, flexible, and lean implementation of core jQuery for server-side HTML parsing
- **axios**: HTTP client for fetching HTML pages from htreviews.org

### API Framework
- **Express.js**: Mature, widely-used, extensive middleware ecosystem (selected for this project)

### Authentication & Security
- **API Key Middleware**: Custom middleware for X-API-Key header validation
- **Helmet**: Security headers for Express.js
- **Rate Limiting**: express-rate-limit (if using Express)

### Caching
**Primary (In-Memory)**:
- **Node-cache** or **lru-cache**: Simple in-memory caching for development/small deployments

**Optional (Production)**:
- **Redis**: Distributed caching for production environments with multiple instances
- **ioredis**: High-performance Redis client for Node.js

### Scheduler
- **node-cron**: Cron job scheduler for automated task execution
- Configuration via environment variables for flexible scheduling
- Graceful shutdown and error handling

### Data Validation
- **Zod**: TypeScript-first schema validation for API requests/responses
- **Joi** (alternative): Object schema validation

### Utilities
- **date-fns**: Modern date utility library
- **lodash**: Utility library for data manipulation (optional, may use native JS methods)

### Testing
- **Jest**: JavaScript testing framework with built-in assertions, mocking, and coverage
- **Supertest**: HTTP assertion library for testing Node.js HTTP servers
- **ts-node**: TypeScript execution environment for testing

### Development Tools
- **ts-node**: TypeScript execution and REPL
- **nodemon**: Automatically restart server on file changes during development
- **eslint**: Linting utility for JavaScript/TypeScript
- **prettier**: Code formatter

### Documentation
- **Swagger/OpenAPI**: API specification and documentation
- **swagger-jsdoc**: Generate Swagger spec from JSDoc comments
- **swagger-ui-express**: Serve Swagger UI for interactive API documentation

### Environment Variables & Configuration
- **dotenv**: Environment variable loading from .env files

## Development Setup

### Prerequisites
- Node.js (LTS version recommended, e.g., 22.x or 24.x)
- pnpm (install via `npm install -g pnpm`)
- Git

### Initial Setup Commands
```bash
# Install all dependencies across workspace
pnpm install

# Build all packages
pnpm build

# Run specific app in development mode
pnpm --filter @hookah-db/api dev

# Run CLI app
pnpm --filter @hookah-db/cli start

# Type-check all packages
pnpm type-check

# Clean all build artifacts
pnpm clean
```

### Accessing API Documentation
Once the API server is running (default: `http://localhost:3000`), you can access:
- **Swagger UI**: Interactive API documentation at `http://localhost:3000/api-docs`
- **OpenAPI JSON**: Raw specification at `http://localhost:3000/api-docs.json`

### TypeScript Configuration
- **tsconfig.json**: Root TypeScript configuration
- **packages/tsconfig/base.json**: Base TypeScript config shared across packages
- **packages/tsconfig/node.json**: Node.js-specific TypeScript config
- **Strict mode**: Enabled for maximum type safety
- **Target**: ES2024 or newer
- **Module system**: CommonJS or ESNext (depending on Node.js version)

## Project Structure

### Monorepo Organization

The project uses a monorepo structure with pnpm workspaces and Turborepo for build orchestration:

```
hookah-db/
├── apps/                  # Application packages
│   ├── api/               # REST API server
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/               # CLI application
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── packages/              # Shared packages
│   ├── types/             # TypeScript interfaces and types
│   ├── scraper/           # Web scraping module
│   ├── parser/            # Data parsing and transformation
│   ├── cache/             # Caching layer
│   ├── services/          # Business logic
│   ├── scheduler/         # Cron job scheduler
│   ├── utils/             # Utility functions
│   ├── config/            # Shared configuration
│   └── tsconfig/          # Shared TypeScript configurations
├── pnpm-workspace.yaml    # pnpm workspace configuration
├── turbo.json             # Turborepo configuration
└── package.json           # Root package.json
```

### Package Naming Convention

All packages use the `@hookah-db/*` naming convention:
- `@hookah-db/api` - REST API server
- `@hookah-db/cli` - CLI application
- `@hookah-db/types` - TypeScript types and interfaces
- `@hookah-db/scraper` - Web scraping module
- `@hookah-db/parser` - Data parsing module
- `@hookah-db/cache` - Caching layer
- `@hookah-db/services` - Business logic services
- `@hookah-db/scheduler` - Cron job scheduler
- `@hookah-db/utils` - Utility functions
- `@hookah-db/config` - Shared configuration
- `@hookah-db/tsconfig` - Shared TypeScript configurations

### Workspace Dependencies

Packages use the `workspace:*` protocol to reference other packages in the monorepo:

```json
{
  "dependencies": {
    "@hookah-db/types": "workspace:*",
    "@hookah-db/utils": "workspace:*"
  }
}
```

### Build Process

**Development**:
- Use `pnpm --filter @hookah-db/api dev` to run specific apps in development mode
- Turborepo handles dependency graph and parallel execution
- Automatic rebuilds on file changes (via nodemon/ts-node)

**Build All**:
- `pnpm build` - Builds all packages in dependency order
- Turborepo caches build artifacts for faster subsequent builds
- TypeScript compilation to JavaScript

**Type Checking**:
- `pnpm type-check` - Type-checks all packages
- Can be run on individual packages: `pnpm --filter @hookah-db/api type-check`

**Clean**:
- `pnpm clean` - Removes all build artifacts and cache

## Technical Constraints

### Performance Requirements
- API response time: <200ms (average)
- Cache hit rate: >90%
- Scraping interval: At least 24 hours between full scrapes

### Scalability Considerations
- Support up to 10 authorized API clients
- Handle 100+ brands with 10,000+ flavors
- Rate limiting: ~100 requests/minute per client

### Resource Limits
- Memory usage: <500MB for in-memory cache
- Network bandwidth: Minimal (only scraping htreviews.org)
- CPU usage: Low (scraping is I/O bound)

### External Dependencies
- **htreviews.org**: Must be respectful of server resources
  - Implement delays between requests
  - Respect robots.txt
  - Cache responses aggressively
  - Handle rate limiting gracefully

## Tool Usage Patterns

### Web Scraping
- Use Cheerio for HTML parsing
- Implement retry logic for failed requests
- Add user-agent headers to identify scraper
- Parse incrementally (brands → lines → flavors)

### Error Handling
- Try-catch blocks around all I/O operations
- Graceful degradation when scraping fails
- Log errors with appropriate severity levels
- Return cached data when fresh data unavailable

### Caching Strategy
- Cache brand and flavor data separately
- Implement TTL (Time To Live) for cache entries
- Invalidate cache on successful scrape
- Fallback to stale cache if scrape fails

### API Design
- RESTful conventions for endpoints
- Consistent JSON response format
- Proper HTTP status codes
- Pagination for large datasets
- Filtering and sorting capabilities

### Monorepo Development
- Use `pnpm --filter <package>` to run commands on specific packages
- Turborepo automatically handles dependency ordering
- Shared types and utilities are imported via `@hookah-db/*` packages
- Changes to shared packages trigger rebuilds of dependent packages

## Environment Variables

### Required Variables
- `PORT`: Server port (default: 3000)
- `HTREVIEWS_BASE_URL`: Base URL for htreviews.org (default: https://htreviews.org)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 86400)

### Optional Variables
- `REDIS_URL`: Redis connection string (if using Redis)
- `RATE_LIMIT_WINDOW`: Rate limit time window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)
- `LOG_LEVEL`: Logging level (default: info)

### Scheduler Configuration
- `SCHEDULER_ENABLED`: Enable/disable scheduler (default: true)
- `CRON_SCHEDULE_BRANDS`: Cron expression for brand refresh (default: "0 2 * * *")
- `CRON_SCHEDULE_FLAVORS`: Cron expression for flavor refresh (default: "0 3 * * *")
- `CRON_SCHEDULE_ALL`: Cron expression for full data refresh (default: "0 4 * * *")
- `EXECUTION_HISTORY_LIMIT`: Maximum execution history entries (default: 100)

### API Keys
- Store in `.env` file (not committed to git)
- Format: `API_KEY_<CLIENT_NAME>=<key>`
- Example: `API_KEY_CLIENT1=abc123def456`

## Deployment Considerations

### Development
- Use `pnpm --filter @hookah-db/api dev` for hot-reloading
- Run with `ts-node` for TypeScript support
- Local caching (in-memory)

### Production
- Build all packages with `pnpm build`
- Use process manager (PM2, systemd)
- Consider Redis for distributed caching
- Implement proper logging (winston, pino)
- Set up health check endpoints
- Configure reverse proxy (nginx, Apache)

### Monitoring
- Track API response times
- Monitor cache hit rates
- Log scraping errors
- Track rate limit violations
- Monitor server resources (CPU, memory, disk)
- Monitor scheduler job execution and errors

## Installed Dependencies (as of 2026-01-05)

### Core Dependencies
- cheerio: 1.1.2
- axios: 1.13.2
- express: 5.2.1

### Build & Workspace Tools
- turbo: 2.0+
- @changesets/cli: Latest

### TypeScript & Type Definitions
- typescript: 5.9.3
- @types/node: 25.0.3
- @types/express: 5.0.6

### Development Tools
- nodemon: 3.1.11
- ts-node: 10.9.2
- jest: 30.2.0
- @types/jest: 30.0.0
- ts-jest: 29.4.6
- supertest: 7.1.4

### API Documentation
- swagger-jsdoc: 6.2.8
- swagger-ui-express: 5.0.1
- @types/swagger-jsdoc: 6.0.4
- @types/swagger-ui-express: 4.1.7

### Security & Rate Limiting
- express-rate-limit: 7.5.0
- @types/express-rate-limit: 7.1.0

### Caching
- node-cache: 5.1.2
- @types/node-cache: 4.2.5

### Scheduler
- node-cron: 3.0.3
- @types/node-cron: 3.0.11

### Environment & Configuration
- dotenv: latest
