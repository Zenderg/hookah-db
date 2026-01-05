# Hookah Tobacco Database API

A centralized data service that aggregates and provides structured information about hookah tobacco brands and flavors from htreviews.org.

## Key Features

- **Web Scraping**: Automated parsing of htreviews.org to extract brand and flavor data
- **Secure API Access**: API key-based authentication for up to 10 authorized clients
- **Comprehensive Data Model**: Brands, flavors, ratings, reviews, and metadata
- **RESTful API**: Clean, documented endpoints for data retrieval
- **Data Caching**: Efficient caching strategy to minimize scraping load
- **Error Handling**: Robust error handling and rate limiting
- **Automated Data Refresh**: Cron-based scheduler for automatic cache updates with configurable schedules
- **Structured Logging**: Production-ready logging with Winston, file rotation, and request/response tracking

## Monorepo Structure

This project uses a monorepo structure with pnpm workspaces and Turborepo for efficient development and building.

### Structure

```
hookah-db/
├── apps/                    # Applications
│   ├── api/               # REST API server
│   └── cli/               # CLI tool
├── packages/                # Shared packages
│   ├── types/              # TypeScript types and interfaces
│   ├── utils/              # Utility functions (includes logging)
│   ├── scraper/            # Web scraping logic
│   ├── parser/             # HTML parsing logic
│   ├── cache/              # Caching implementations
│   ├── services/           # Business logic
│   ├── scheduler/          # Cron job scheduler
│   ├── config/             # Shared configuration
│   └── tsconfig/           # TypeScript configurations
├── docs/                   # Documentation
│   └── LOGGING.md          # Comprehensive logging documentation
├── examples/                # Example HTML files
└── .kilocode/             # Kilo Code configuration
```

### Packages

- **@hookah-db/types**: Shared TypeScript types and interfaces
- **@hookah-db/utils**: Utility functions and logging system
- **@hookah-db/scraper**: Web scraping logic for htreviews.org
- **@hookah-db/parser**: HTML parsing with Cheerio
- **@hookah-db/cache**: Caching layer (in-memory/Redis)
- **@hookah-db/services**: Business logic orchestration
- **@hookah-db/scheduler**: Cron job scheduler for automated data refresh
- **@hookah-db/config**: Shared configuration presets
- **@hookah-db/tsconfig**: Shared TypeScript configurations

### Applications

- **@hookah-db/api**: REST API server (Express.js)
- **@hookah-db/cli**: CLI tool for data management

## Getting Started

### Prerequisites

- Node.js (LTS version)
- pnpm (install via `npm install -g pnpm`)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run API in development
pnpm --filter @hookah-db/api dev

# Run CLI
pnpm --filter @hookah-db/cli dev
```

## Docker

This project includes comprehensive Docker support for both development and production environments.

### Quick Start

```bash
# Start development environment with hot-reload
docker-compose -f docker-compose.dev.yml up

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.prod.yml down
```

### Development with Docker

The development environment uses `docker-compose.dev.yml` for local development with hot-reload capabilities.

#### Starting Development Environment

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up

# Start in detached mode (background)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

#### Features

- **Hot-Reload**: Code changes are automatically reflected without rebuilding
- **Volume Mounts**: Source code is mounted for live editing
- **TypeScript Compilation**: Uses ts-node for on-the-fly compilation
- **Redis Integration**: Redis service included for caching (when implemented)
- **API Access**: API available at `http://localhost:3000`
- **Redis Access**: Redis available at `localhost:6379`

#### Accessing Services

```bash
# Health check
curl http://localhost:3000/health

# API documentation (Swagger UI)
open http://localhost:3000/api-docs

# Test API with authentication
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/brands
```

#### Viewing Logs

```bash
# View all logs
docker-compose -f docker-compose.dev.yml logs -f

# View API service logs only
docker-compose -f docker-compose.dev.yml logs -f api

# View Redis service logs only
docker-compose -f docker-compose.dev.yml logs -f redis
```

### Production Deployment

The production environment uses `docker-compose.prod.yml` for optimized production deployments.

#### Building and Starting Production Environment

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

#### Production Features

- **Multi-Stage Build**: Optimized Dockerfile for smaller production images
- **Compiled TypeScript**: Pre-compiled JavaScript for faster startup
- **Health Checks**: Built-in health checks for service monitoring
- **Environment Configuration**: Separate `.env.prod` for production settings
- **Logging**: Production-ready logging with file rotation
- **Redis Integration**: Redis service for distributed caching

#### Environment Configuration

Create a `.env.prod` file based on `.env.example`:

```bash
# Copy example file
cp .env.example .env.prod

# Edit with production values
nano .env.prod
```

#### Important Production Variables

```bash
# Server configuration
PORT=3000
NODE_ENV=production

# API Keys (configure at least one)
API_KEY_CLIENT1=your-production-api-key

# Cache configuration
CACHE_TTL=86400
REDIS_URL=redis://redis:6379

# Scheduler configuration
SCHEDULER_ENABLED=true
CRON_SCHEDULE_BRANDS="0 2 * * *"
CRON_SCHEDULE_FLAVORS="0 3 * * *"
CRON_SCHEDULE_ALL="0 4 * * *"

# Logging configuration
LOG_LEVEL=info
LOG_DIR=/app/logs
SERVICE_NAME=hookah-db
```

#### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check with cache stats
curl http://localhost:3000/health/detailed

# Check container health
docker inspect --format='{{.State.Health.Status}}' hookah-db-api
```

### Docker Architecture

#### Multi-Stage Dockerfile

The project uses a multi-stage Dockerfile for optimized builds:

1. **Base Stage**: Sets up Node.js and pnpm
2. **Dependencies Stage**: Installs all dependencies
3. **Build Stage**: Compiles TypeScript to JavaScript
4. **Production Stage**: Creates minimal runtime image

#### Services

**API Service** (`api`):
- Exposes port 3000
- Depends on Redis
- Health check endpoint: `/health`
- Includes all application code

**Redis Service** (`redis`):
- Exposes port 6379
- Used for caching (when implemented)
- Persists data to named volume
- Health check: Redis PING command

#### Network Configuration

- **Network**: `hookah-db-network` (bridge network)
- Services communicate via service names (e.g., `redis`, `api`)
- External access via exposed ports (3000, 6379)

#### Volume Configuration

- **Source Code Volume**: Mounts source code for development
- **Logs Volume**: Persists application logs
- **Redis Data Volume**: Persists Redis data
- **Node Modules Volume**: Caches node_modules for faster rebuilds

### Environment Variables

#### Environment Files

- **`.env.example`**: Template with all available variables
- **`.env.dev`**: Development environment configuration
- **`.env.prod`**: Production environment configuration

#### Required Variables

```bash
# Server
PORT=3000
NODE_ENV=development|production

# API Keys (at least one required)
API_KEY_CLIENT1=your-api-key

# Cache
CACHE_TTL=86400
REDIS_URL=redis://redis:6379
```

#### Optional Variables

```bash
# Scheduler
SCHEDULER_ENABLED=true
CRON_SCHEDULE_BRANDS="0 2 * * *"
CRON_SCHEDULE_FLAVORS="0 3 * * *"
CRON_SCHEDULE_ALL="0 4 * * *"

# Logging
LOG_LEVEL=info|debug|error
LOG_DIR=./logs
SERVICE_NAME=hookah-db

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

#### API Key Authentication

All API v1 endpoints require authentication via the `X-API-Key` header:

```bash
# Example request with authentication
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/brands
```

Configure API keys in your environment file:

```bash
# Add multiple API keys for different clients
API_KEY_CLIENT1=abc123def456
API_KEY_CLIENT2=xyz789ghi012
API_KEY_CLIENT3=lmn345opq678
```

### Troubleshooting

#### Common Issues

**1. Container fails to start**

```bash
# Check container logs
docker-compose -f docker-compose.dev.yml logs api

# Check if port 3000 is already in use
lsof -i :3000

# Stop conflicting services and retry
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up
```

**2. Hot-reload not working**

```bash
# Verify volume mounts are correct
docker-compose -f docker-compose.dev.yml config

# Restart the service
docker-compose -f docker-compose.dev.yml restart api

# Check if ts-node is watching files
docker-compose -f docker-compose.dev.yml logs -f api | grep "ts-node"
```

**3. Redis connection issues**

```bash
# Check Redis logs
docker-compose -f docker-compose.dev.yml logs redis

# Test Redis connection
docker-compose -f docker-compose.dev.yml exec redis redis-cli ping

# Should return: PONG
```

**4. Build failures**

```bash
# Clean build artifacts
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

**5. Permission issues with logs**

```bash
# Fix log directory permissions
docker-compose -f docker-compose.dev.yml exec api mkdir -p /app/logs
docker-compose -f docker-compose.dev.yml exec api chown -R node:node /app/logs
```

#### Rebuilding Images

```bash
# Rebuild specific service
docker-compose -f docker-compose.dev.yml build api

# Rebuild all services
docker-compose -f docker-compose.dev.yml build

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache
```

#### Cleaning Up

```bash
# Stop and remove containers
docker-compose -f docker-compose.dev.yml down

# Stop and remove containers with volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove all Docker resources for this project
docker-compose -f docker-compose.dev.yml down -v --rmi all

# Clean up unused Docker resources
docker system prune -a
```

#### Viewing Container Logs

```bash
# View all logs
docker-compose -f docker-compose.dev.yml logs

# Follow logs in real-time
docker-compose -f docker-compose.dev.yml logs -f

# View last 100 lines
docker-compose -f docker-compose.dev.yml logs --tail=100

# View logs since a specific time
docker-compose -f docker-compose.dev.yml logs --since="2024-01-05T10:00:00"

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs api
```

### Useful Commands

#### Container Management

```bash
# List running containers
docker-compose -f docker-compose.dev.yml ps

# Execute command in container
docker-compose -f docker-compose.dev.yml exec api sh

# Attach to container
docker-compose -f docker-compose.dev.yml attach api

# Restart service
docker-compose -f docker-compose.dev.yml restart api

# Scale service (run multiple instances)
docker-compose -f docker-compose.dev.yml up -d --scale api=3
```

#### Monitoring

```bash
# View resource usage
docker stats

# View container details
docker inspect hookah-db-api

# View container processes
docker-compose -f docker-compose.dev.yml top

# Check container health
docker inspect --format='{{.State.Health.Status}}' hookah-db-api
```

#### Debugging

```bash
# Run container in debug mode
docker-compose -f docker-compose.dev.yml run --rm api sh

# View environment variables in container
docker-compose -f docker-compose.dev.yml exec api env

# Test network connectivity
docker-compose -f docker-compose.dev.yml exec api ping redis

# View mounted volumes
docker inspect --format='{{json .Mounts}}' hookah-db-api | jq
```

#### Maintenance

```bash
# Update base image
docker-compose -f docker-compose.dev.yml pull

# Backup Redis data
docker run --rm -v hookah-db-redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Restore Redis data
docker run --rm -v hookah-db-redis-data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /

# View disk usage
docker system df
```

#### API Testing

```bash
# Health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Get brands (requires API key)
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/brands

# Get specific brand
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/brands/sarma

# Get flavors
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/flavors

# Get scheduler stats
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/scheduler/stats

# Get scheduled jobs
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/scheduler/jobs
```

#### Documentation Access

```bash
# Open Swagger UI in browser (macOS)
open http://localhost:3000/api-docs

# Open Swagger UI in browser (Linux)
xdg-open http://localhost:3000/api-docs

# Download OpenAPI specification
curl http://localhost:3000/api-docs.json -o openapi.json
```

## Available Scripts

- `pnpm build` - Build all packages and applications
- `pnpm dev` - Run all packages in development mode
- `pnpm test` - Run all tests
- `pnpm type-check` - Type-check all packages
- `pnpm lint` - Lint all packages
- `pnpm clean` - Clean all build artifacts

## Development

### Building a specific package

```bash
pnpm --filter @hookah-db/types build
```

### Running a specific application

```bash
pnpm --filter @hookah-db/api dev
```

### Adding dependencies

```bash
# Add to a specific package
pnpm --filter @hookah-db/scraper add axios

# Add as dev dependency
pnpm --filter @hookah-db/scraper add -D @types/axios
```

### Running tests

```bash
# Run all tests
pnpm test

# Run scheduler tests
pnpm test scheduler
```

## Logging

The project includes a comprehensive logging system built on Winston for production-ready structured logging.

### Quick Start

```typescript
import { LoggerFactory } from '@hookah-db/utils';

// Get logger configured for current environment
const logger = LoggerFactory.createEnvironmentLogger('my-service');

// Log messages at different levels
logger.info('Application started');
logger.error('An error occurred', { error: err });
logger.debug('Debug information', { data: someData });
```

### Key Features

- **Environment-aware configuration**: Automatically configures based on NODE_ENV
- **Multiple transports**: Console, file, and combined logging
- **Log rotation**: Daily file rotation with configurable retention
- **Correlation ID tracking**: Request tracing across distributed systems
- **Request/Response middleware**: Automatic HTTP logging for Express
- **Sensitive data filtering**: Automatic redaction of passwords, tokens, etc.
- **Log levels**: ERROR, WARN, INFO, HTTP, VERBOSE, DEBUG, SILLY
- **Multiple formats**: JSON, simple, and pretty-printed output

### Environment Variables

```bash
# Logging configuration
LOG_LEVEL=info                    # Minimum log level (error, warn, info, http, verbose, debug, silly)
LOG_DIR=./logs                    # Directory for log files
SERVICE_NAME=hookah-db           # Service name for log identification
NODE_ENV=production              # Environment (development, staging, production)
```

### Middleware Usage

```typescript
import express from 'express';
import { createLoggingMiddleware } from './middleware/logging-middleware';

const app = express();

// Add logging middleware (logs both requests and responses)
app.use(createLoggingMiddleware());
```

For comprehensive logging documentation, see [docs/LOGGING.md](docs/LOGGING.md).

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Web Scraping**: Cheerio, axios
- **API Framework**: Express.js
- **Logging**: Winston, winston-daily-rotate-file
- **Scheduler**: node-cron for automated task scheduling
- **Testing**: Jest, Supertest
- **Containerization**: Docker, Docker Compose

## API Design

RESTful API with JSON responses:

```
GET /health
  Returns: Basic health check

GET /health/detailed
  Returns: Detailed health check with cache stats

GET /api-docs
  Returns: Interactive Swagger UI for API documentation

GET /api-docs.json
  Returns: Raw OpenAPI specification JSON

GET /api/v1/brands
  Query params: page, limit, country, sort
  Returns: List of brands with pagination

GET /api/v1/brands/:slug
  Returns: Full brand details with lines and flavors

POST /api/v1/brands/refresh
  Returns: Refreshed brand data

GET /api/v1/brands/:brandSlug/flavors
  Query params: page, limit, lineSlug, sort
  Returns: Flavors for specific brand

GET /api/v1/flavors
  Query params: page, limit, brandSlug, lineSlug, strength, tags, sort
  Returns: List of flavors with filtering

GET /api/v1/flavors/:slug
  Returns: Full flavor details with reviews

POST /api/v1/flavors/refresh
  Returns: Refreshed flavor data
```

## Scheduler Configuration

The API includes a built-in scheduler for automatic data refresh:

### Environment Variables

- `SCHEDULER_ENABLED` - Enable/disable scheduler (default: true)
- `CRON_SCHEDULE_BRANDS` - Cron expression for brands refresh (default: "0 2 * * *" - 2:00 AM UTC)
- `CRON_SCHEDULE_FLAVORS` - Cron expression for flavors refresh (default: "0 3 * * *" - 3:00 AM UTC)
- `CRON_SCHEDULE_ALL` - Cron expression for full data refresh (default: "0 4 * * *" - 4:00 AM UTC)
- `MAX_EXECUTION_HISTORY` - Maximum execution history entries (default: 100)

### Scheduler API Endpoints

- `GET /api/v1/scheduler/stats` - Get scheduler statistics (requires authentication)
- `GET /api/v1/scheduler/jobs` - List all scheduled jobs with their status (requires authentication)

### Default Scheduled Tasks

1. **Brands Refresh** - Updates brand data cache at 2:00 AM UTC
2. **Flavors Refresh** - Updates flavor data cache at 3:00 AM UTC
3. **All Data Refresh** - Updates all data cache at 4:00 AM UTC

### Monitoring

The scheduler provides comprehensive statistics:
- Uptime tracking
- Task execution count
- Error tracking
- Execution history
- Job status monitoring

## License

ISC
