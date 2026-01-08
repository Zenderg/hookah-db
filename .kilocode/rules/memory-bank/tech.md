# Technology Stack

## Core Technologies

### Runtime & Language
- **Node.js**: JavaScript runtime for server-side execution
- **TypeScript**: Superset of JavaScript for type safety and better developer experience

### Package Management
- **npm**: Standard, widely-supported package manager
- **Single Package**: No workspaces, no Turborepo

### Containerization
- **Docker**: Container platform for consistent development and production environments
- **Docker Compose**: Multi-container orchestration for development and production
- **Multi-stage Dockerfile**: Optimized 2-stage builds (build + runtime) for production deployment
- **Pre-compiled JavaScript**: TypeScript compiled during build stage, no runtime compilation needed
- **nodemon**: Development tool for hot reload in development mode

### Web Scraping
- **Cheerio**: Fast, flexible, and lean implementation of core jQuery for server-side HTML parsing
- **axios**: HTTP client for fetching HTML pages from htreviews.org

### API-Based Flavor Extraction
- **API Endpoint**: htreviews.org `/postData` endpoint
- **HTTP Method**: POST requests for flavor data
- **Pagination**: Multiple requests with increasing offset (0, 20, 40, ...)
- **Performance**: 5-6x faster than HTML scraping (2-5s vs 10-30s per brand)
- **Coverage**: 100% flavor coverage (all flavors, not just first 20)

### API Framework
- **Express.js**: Mature, widely-used, extensive middleware ecosystem (selected for this project)

### Authentication & Security
- **API Key Middleware**: Custom middleware for X-API-Key header validation
- **dotenv**: Environment variable loading from .env files
- **Rate Limiting**: express-rate-limit for IP-based rate limiting

### Database & Caching

**Primary Database**:
- **SQLite**: Lightweight, self-contained SQL database for persistent storage
- **better-sqlite3**: Synchronous SQLite driver for Node.js with WAL mode support
- **WAL Mode**: Write-Ahead Logging for better concurrency and performance

**Caching**:
- **node-cache**: Simple in-memory caching for frequently accessed data
- Cache-first strategy with database fallback

### Scheduler
- **node-cron**: Cron job scheduler for automated task execution
- Configuration via environment variables for flexible scheduling
- Graceful shutdown and error handling

### Logging
- **Winston**: Versatile logging library for Node.js with multiple transports
- **winston-daily-rotate-file**: Daily log rotation with configurable retention
- **UUID**: Unique identifier generation for correlation IDs
- **Structured logging**: JSON-formatted logs for easy parsing and analysis
- **Multiple log levels**: ERROR, WARN, INFO, HTTP, VERBOSE, DEBUG, SILLY
- **Multiple transports**: Console, file, and combined logging options
- **Log rotation**: Daily rotation with automatic compression and retention
- **Correlation ID tracking**: Request tracing across distributed systems
- **Sensitive data filtering**: Automatic redaction of passwords, tokens, etc.
- **Express middleware**: Automatic HTTP request/response logging

### Data Validation
- **Zod**: TypeScript-first schema validation for API requests/responses (planned)
- **Joi** (alternative): Object schema validation (planned)

### Utilities
- **date-fns**: Modern date utility library (planned)
- **lodash**: Utility library for data manipulation (optional, may use native JS methods)

### Testing
- **Jest**: JavaScript testing framework with built-in assertions, mocking, and coverage
- **Supertest**: HTTP assertion library for testing Node.js HTTP servers
- **ts-node**: TypeScript execution environment for testing

### Development Tools
- **ts-node**: TypeScript execution and REPL
- **nodemon**: Automatically restart server on file changes during development
- **jest**: JavaScript testing framework
- **ts-jest**: TypeScript preprocessor for Jest
- **supertest**: HTTP assertion library for testing Express.js servers
- **eslint**: Linting utility for JavaScript/TypeScript (planned)
- **prettier**: Code formatter (planned)

### Documentation
- **Swagger/OpenAPI**: API specification and documentation
- **swagger-jsdoc**: Generate Swagger spec from JSDoc comments
- **swagger-ui-express**: Serve Swagger UI for interactive API documentation

### Environment Variables & Configuration
- **dotenv**: Environment variable loading from .env files

## Development Setup

### Prerequisites
- Node.js (LTS version recommended, e.g., 22.x or 24.x)
- npm (standard Node.js package manager)
- Docker (for containerized development and production)
- Docker Compose (for multi-container orchestration)
- Git

### Initial Setup Commands
```bash
# Install dependencies
npm install

# Build project
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm run start

# Run tests
npm test

# Type check
npm run type-check

# Clean build artifacts
npm run clean
```

### Docker Setup

#### Build and Start Containers
```bash
# Build and start containers
docker-compose up --build

# Start containers in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Stop containers and remove volumes
docker-compose down -v
```

#### Docker Commands
```bash
# Build Docker image
docker build -t hookah-db-api:latest .

# Run container with custom environment
docker run -p 3000:3000 --env-file .env hookah-db-api:latest

# Execute commands in running container
docker exec -it hookah-db-api sh
docker exec -it hookah-db-api node dist/server.js

# View container logs
docker logs hookah-db-api
docker logs -f hookah-db-api

# Check container health
docker inspect hookah-db-api | grep -A 10 Health

# Restart container
docker-compose restart

# Rebuild and restart
docker-compose up -d --build
```

### Accessing API Documentation
Once the API server is running (default: `http://localhost:3000`), you can access:
- **Swagger UI**: Interactive API documentation at `http://localhost:3000/api-docs`
- **OpenAPI JSON**: Raw specification at `http://localhost:3000/api-docs.json`

### Accessing Logging Documentation
Comprehensive logging documentation is available at [`docs/LOGGING.md`](docs/LOGGING.md).

### TypeScript Configuration
- **tsconfig.json**: Root TypeScript configuration
- **Strict mode**: Enabled for maximum type safety
- **Target**: ES2022 or newer
- **Module system**: CommonJS
- **rootDir**: ./src (monolithic structure)
- **outDir**: ./dist (compiled output)

## Project Structure

### Monolithic Organization

The project uses a monolithic structure with a single npm package:

```
hookah-db/
├── src/                        # All source code
│   ├── types/                  # TypeScript types and interfaces
│   ├── utils/                  # Utilities and logging system
│   ├── scraper/                # Web scraping module
│   ├── parser/                 # Data parsing and transformation
│   ├── cache/                  # In-memory caching layer
│   ├── database/               # SQLite database layer
│   ├── services/               # Business logic
│   ├── scheduler/              # Cron job scheduler
│   ├── middleware/             # Express middleware
│   ├── controllers/            # API controllers
│   ├── routes/                 # API routes
│   ├── swagger.ts              # Swagger configuration
│   └── server.ts              # Express server
├── tests/                      # Tests
├── dist/                       # Compiled JavaScript
├── logs/                       # Logs
├── data/                       # Data (if needed)
├── examples/                   # Example HTML files
├── docs/                       # Documentation
├── package.json              # Single package.json
├── Dockerfile                  # Docker configuration
├── docker-compose.yaml          # Docker Compose configuration
├── jest.config.js             # Jest configuration
├── tsconfig.json             # TypeScript configuration
├── .nvmrc                  # Node.js version (22)
└── README.md                # Documentation
```

### Docker Architecture

The Docker setup uses a 2-stage multi-stage build approach:

**Stages**:
1. **Build**: Installs all dependencies and compiles TypeScript to JavaScript using `npm run build`
2. **Runtime**: Copies compiled JavaScript and production dependencies for minimal runtime image

**Services** (Docker Compose):
- **API Service**: Node.js API server with Express.js
  - Pre-compiled JavaScript for fast startup
  - Health checks configured (30s interval, 10s timeout, 3 retries)
  - SQLite database in named volume for persistence
  - Non-root user (nodejs:nodejs)
  - Restart policy: unless-stopped

**Networks**:
- **hookah-db-network**: Bridge network for container communication

**Volumes**:
- **hookah-db-data**: Named volume for SQLite database persistence
  - Mount path: /app/data/hookah-db.db (container)

### Package Naming Convention

All modules use relative imports (no workspace packages):
- Types: `../types`
- Utils: `../utils`
- Scraper: `../scraper`
- Parser: `../parser`
- Cache: `../cache`
- Database: `../database`
- Services: `../services`
- Scheduler: `../scheduler`
- Middleware: `../middleware`
- Controllers: `../controllers`
- Routes: `../routes`

### Build Process

**Local Development**:
- Use `npm run dev` to run in development mode
- Automatic rebuilds on file changes (via nodemon/ts-node)

**Docker Development**:
- Use `docker-compose up` for containerized development
- Build stage compiles TypeScript to JavaScript
- Runtime stage uses pre-compiled JavaScript
- Changes require rebuild: `docker-compose up -d --build`

**Docker Production**:
- Use `docker-compose up -d` for production deployment
- Optimized 2-stage builds for smaller image sizes
- Health checks and log rotation configured
- Pre-compiled JavaScript for fast startup (~20-30 seconds)

**Build All**:
- `npm run build` - Compiles TypeScript to JavaScript
- TypeScript compilation to JavaScript

**Type Checking**:
- `npm run type-check` - Type-checks all source code

**Clean**:
- `npm run clean` - Removes all build artifacts and cache

## Technical Constraints

### Performance Requirements
- API response time: <200ms (average)
- Cache hit rate: >90%
- Database query time: <50ms (average)
- Scraping interval: At least 24 hours between full scrapes
- Container startup time: <30 seconds (production)

### Scalability Considerations
- Support up to 10 authorized API clients
- Handle 100+ brands with 10,000+ flavors
- Rate limiting: ~100 requests/minute per client
- Horizontal scaling: Can deploy multiple API containers with load balancer
- SQLite database: Suitable for single-instance deployments

### Resource Limits
- Memory usage: <500MB for in-memory cache
- Database size: <100MB for full dataset
- Network bandwidth: Minimal (only scraping htreviews.org)
- CPU usage: Low (scraping is I/O bound)
- Container memory: Configurable via Docker Compose

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

### API-Based Flavor Extraction
- Use POST requests to `/postData` endpoint
- Implement pagination with increasing offset (0, 20, 40, ...)
- Add configurable delay between requests (default: 500ms)
- Stop when response returns empty array or fewer items than requested
- Track extraction metrics (time, requests, count)
- Support graceful fallback to HTML scraping if API fails
- Implement retry logic with exponential backoff for failed requests

### Error Handling
- Try-catch blocks around all I/O operations
- Graceful degradation when scraping fails
- Log errors with appropriate severity levels
- Return cached data when fresh data unavailable

### Database Strategy
- Use SQLite for persistent storage
- Enable WAL mode for better concurrency
- Create appropriate indexes for queries
- Use transactions for data consistency
- Cache frequently accessed data in memory

### Caching Strategy
- Cache brand and flavor data separately
- Implement TTL (Time To Live) for cache entries
- Invalidate cache on successful database update
- Fallback to database if cache miss

### API Design
- RESTful conventions for endpoints
- Consistent JSON response format
- Proper HTTP status codes
- Pagination for large datasets
- Filtering and sorting capabilities

### Monolithic Development
- Use `npm run dev` to run in development mode
- Use relative imports instead of workspace packages
- Changes to any module require rebuilding
- All source code in src/ directory

### Logging Best Practices
- Use appropriate log levels (error, warn, info, http, verbose, debug, silly)
- Include relevant metadata in log entries
- Filter sensitive data (passwords, tokens, API keys)
- Use correlation IDs for request tracing
- Log errors with stack traces
- Use structured logging with JSON format in production
- Configure log levels appropriately for each environment
- Use child loggers for modules to add context

### Docker Best Practices
- Use 2-stage multi-stage builds for smaller image sizes
- Compile TypeScript during build stage, not runtime
- Leverage Docker layer caching for faster builds
- Use .dockerignore to exclude unnecessary files
- Use named volumes for database persistence (not bind mounts)
- Use health checks for container monitoring
- Configure log rotation to prevent disk space issues
- Use specific version tags for base images (node:22-alpine)
- Keep containers stateless (use volumes for persistence)
- Use environment-specific configurations (.env)
- Run as non-root user for security

## Environment Variables

### Required Variables
- `PORT`: Server port (default: 3000)
- `HTREVIEWS_BASE_URL`: Base URL for htreviews.org (default: https://htreviews.org)
- `DATABASE_PATH`: Path to SQLite database file (default: ./hookah-db.db)

### Optional Variables
- `CACHE_TTL`: Cache time-to-live in seconds (default: 86400)
- `RATE_LIMIT_WINDOW`: Rate limit time window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)
- `LOG_LEVEL`: Logging level (default: info)
- `LOG_DIR`: Directory for log files (default: ./logs)
- `SERVICE_NAME`: Service name for log identification (default: hookah-db)

### API-Based Extraction Variables
- `ENABLE_API_EXTRACTION`: Enable/disable API-based flavor extraction (default: true)
- `API_FLAVORS_PER_REQUEST`: Number of flavors per API request (default: 20)
- `API_REQUEST_DELAY`: Delay between API requests in milliseconds (default: 500)
- `API_MAX_RETRIES`: Maximum retry attempts for failed API requests (default: 3)
- `ENABLE_API_FALLBACK`: Enable fallback to HTML scraping if API fails (default: true)

### Docker-Specific Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Container port (default: 3000)
- `LOG_LEVEL`: Container log level (debug for dev, info for prod)
- `DATABASE_PATH`: Database path (./hookah-db.db for dev, /app/data/hookah-db.db for prod)

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
- Use `npm run dev` for hot-reloading
- Run with `ts-node` for TypeScript support
- SQLite database in project root (./hookah-db.db)
- In-memory caching for frequently accessed data
- Or use Docker: `docker-compose up`

### Production
- Build all packages with `npm run build`
- Use Docker Compose for containerized deployment: `docker-compose up -d`
- Use process manager (PM2, systemd) if not using Docker
- SQLite database in data directory (/app/data/hookah-db.db)
- In-memory caching for frequently accessed data
- Implement proper logging (winston, pino)
- Set up health check endpoints
- Configure reverse proxy (nginx, Apache)
- Use environment-specific configurations (.env)

### Docker Deployment
- **Single Configuration**: Use docker-compose.yaml for both development and production
- **2-Stage Build**: Build stage compiles TypeScript, runtime stage runs pre-compiled JavaScript
- **Named Volumes**: Use named Docker volumes for database persistence (not bind mounts)
- **Health Checks**: Configured for Coolify monitoring (30s interval, 10s timeout, 3 retries)
- **Coolify Deployment**: Single docker-compose.yaml required, environment variables via Coolify UI
- **Image Registry**: Push images to Docker Hub or private registry for CI/CD
- **Orchestration**: Consider Kubernetes or Docker Swarm for larger deployments
- **Monitoring**: Use container health checks and log aggregation
- **Scaling**: Deploy multiple API containers behind a load balancer
- **Updates**: Use rolling updates to minimize downtime

### Monitoring
- Track API response times
- Monitor cache hit rates
- Monitor database query performance
- Log scraping errors
- Track rate limit violations
- Monitor server resources (CPU, memory, disk)
- Monitor scheduler job execution and errors
- Monitor log file sizes and rotation
- Track correlation IDs for request tracing
- Monitor container health and restarts
- Track Docker resource usage (CPU, memory, disk I/O)

## Installed Dependencies (as of 2026-01-08)

### Core Dependencies
- cheerio: 1.1.2
- axios: 1.13.2
- express: 5.2.1
- tslib: 2.8.1
- winston: 3.19.0
- winston-daily-rotate-file: 5.0.0
- better-sqlite3: Latest
- node-cache: 5.1.2
- node-cron: 3.0.3
- uuid: 9.0.1
- express-rate-limit: 7.5.0
- swagger-ui-express: 5.0.1
- swagger-jsdoc: 6.2.8
- dotenv: 17.2.3

### Build & Workspace Tools
- typescript: 5.9.3
- @types/node: 25.0.3
- @types/express: 5.0.6
- @types/jest: 30.0.0
- @types/supertest: 6.0.3
- @types/winston: 2.4.4
- @types/uuid: 9.0.8
- @types/swagger-jsdoc: 6.0.4
- @types/swagger-ui-express: 4.1.7
- @types/express-rate-limit: 7.1.0
- @types/node-cron: 3.0.11
- @types/node-cache: 4.2.5
- ts-node: 10.9.2
- nodemon: 3.1.11
- jest: 30.2.0
- ts-jest: 29.4.6
- supertest: 7.1.4
