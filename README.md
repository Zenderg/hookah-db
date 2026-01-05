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
│   ├── utils/              # Utility functions
│   ├── scraper/            # Web scraping logic
│   ├── parser/             # HTML parsing logic
│   ├── cache/              # Caching implementations
│   ├── services/           # Business logic
│   ├── scheduler/          # Cron job scheduler
│   ├── config/             # Shared configuration
│   └── tsconfig/           # TypeScript configurations
├── examples/                # Example HTML files
└── .kilocode/             # Kilo Code configuration
```

### Packages

- **@hookah-db/types**: Shared TypeScript types and interfaces
- **@hookah-db/utils**: Utility functions
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

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Web Scraping**: Cheerio, axios
- **API Framework**: Express.js
- **Scheduler**: node-cron for automated task scheduling
- **Testing**: Jest, Supertest

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
