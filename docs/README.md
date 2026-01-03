# Hookah Tobacco Database API

## Project Overview

This project provides a REST API for accessing hookah tobacco data parsed from [htreviews.org](https://htreviews.org). The API serves structured information about tobacco brands, their lineups (lines), and individual tobacco flavors with ratings and descriptions.

### Problem Statement

Currently, there is no centralized database of hookah tobacco brands and flavors. While htreviews.org provides comprehensive information, it's only available through their website. This project creates a programmatic API that developers can use to access tobacco data for their applications.

### Solution

A web scraper that parses tobacco data from htreviews.org and exposes it through a REST API with API key authentication. The system is designed as a simple, maintainable pet project without complex infrastructure requirements.

### Key Features

- **Data Source**: Parses data from htreviews.org
- **API Access**: RESTful API with API key authentication
- **Data Coverage**: ~100 brands, ~10,000 tobacco flavors
- **Simple Architecture**: Monorepo with pnpm workspaces
- **Docker Support**: Easy deployment with Docker Compose
- **Testing**: Focused tests on core functionality
- **Scroll Handling**: Supports infinite scroll for dynamic content loading

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Monorepo Structure"
        A[packages/api] --> B[packages/parser]
        A --> C[packages/database]
        A --> D[packages/shared]
    end
    
    subgraph "External Services"
        E[htreviews.org]
    end
    
    subgraph "Data Flow"
        E -->|HTML Pages| B
        B -->|Parsed Data| C
        C -->|Database Queries| A
        A -->|JSON Response| F[API Clients]
    end
    
    subgraph "Infrastructure"
        G[Docker Compose]
        G --> A
        G --> C
    end
```

### Architecture Components

1. **API Service** (`packages/api`)
   - RESTful API server
   - API key authentication middleware
   - Request validation
   - Response formatting

2. **Parser Service** (`packages/parser`)
   - HTML parsing logic
   - Data extraction from htreviews.org
   - Scroll/infinite scroll handling
   - Data normalization

3. **Database Service** (`packages/database`)
   - Database schema definitions
   - Query builders
   - Migration management
   - Data access layer

4. **Shared Package** (`packages/shared`)
   - TypeScript types
   - Common utilities
   - Configuration management
   - Error handling

---

## Data Flow

```mermaid
sequenceDiagram
    participant Client as API Client
    participant API as API Service
    participant DB as Database
    participant Parser as Parser Service
    participant Source as htreviews.org
    
    Client->>API: GET /api/brands (with API key)
    API->>API: Validate API key
    API->>DB: Query brands
    DB-->>API: Return brands data
    API-->>Client: JSON response
    
    Note over Parser,DB: Scheduled parsing job
    Parser->>Source: Fetch brands page
    Source-->>Parser: HTML with scroll
    Parser->>Parser: Handle scroll, extract data
    Parser->>DB: Upsert brands
    Parser->>Source: Fetch brand detail pages
    Parser->>Parser: Extract brand info & tobacco links
    Parser->>DB: Upsert brand details
    Parser->>Source: Fetch tobacco detail pages
    Parser->>Parser: Extract tobacco info
    Parser->>DB: Upsert tobacco details
```

### Data Flow Description

1. **API Requests**: Clients make authenticated requests to the API service
2. **Data Retrieval**: API queries the database and returns JSON responses
3. **Data Updates**: Parser service periodically fetches data from htreviews.org
4. **Scroll Handling**: Parser handles infinite scroll to load all items
5. **Data Storage**: Parsed data is stored in the database for API access

---

## Project Structure

```
hookah-db/
├── packages/
│   ├── api/              # REST API server
│   ├── parser/           # HTML parser service
│   ├── database/         # Database schema & migrations
│   └── shared/           # Shared types & utilities
├── examples/             # HTML examples for testing
├── docs/                 # Documentation
│   ├── modules/         # Module-specific documentation
│   ├── architecture.md  # This file
│   ├── database.md      # Database schema documentation
│   ├── api.md           # API endpoints documentation
│   └── implementation.md # Implementation plan
├── docker-compose.yml    # Production deployment
├── docker-compose.dev.yml # Local development
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # Workspace configuration
└── .env.example         # Environment variables template
```

---

## Technology Stack

### Core Technologies

- **Package Manager**: pnpm with workspace support
- **Runtime**: Node.js 20+ with TypeScript
- **API Framework**: Fastify (modern, fast, TypeScript-friendly)
- **Database**: PostgreSQL 15+ (production) / SQLite (development)
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **HTML Parser**: Cheerio (jQuery-like syntax for Node.js)
- **HTTP Client**: Got (modern, promise-based)
- **Testing**: Vitest (fast, native ESM support)
- **Containerization**: Docker & Docker Compose

### Why These Choices?

- **Fastify**: High performance, built-in TypeScript support, plugin ecosystem
- **Drizzle ORM**: Lightweight, type-safe SQL, no heavy abstractions
- **Cheerio**: Fast HTML parsing, familiar jQuery syntax
- **Vitest**: Fast test runner, excellent TypeScript support
- **pnpm**: Efficient disk space usage, strict workspace management

---

## API Access

### Authentication

All API endpoints require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" https://api.example.com/api/brands
```

---

## Environment Variables

All environment variables are defined in a single `.env` file at the project root.

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hookah_db

# API
API_PORT=3000
API_HOST=0.0.0.0

# Parser
PARSER_BASE_URL=https://htreviews.org
PARSER_CONCURRENT_REQUESTS=3
PARSER_SCROLL_DELAY_MS=1000

# API Keys
ADMIN_API_KEY=your-admin-key
```

### Optional Variables

```env
# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Parser Schedule
PARSER_CRON_SCHEDULE=0 2 * * *  # Daily at 2 AM
```

See [`docs/environment.md`](docs/environment.md) for complete documentation.

---

## Development Workflow

### Local Development

1. **Start Services**:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Run Tests**:
   ```bash
   pnpm test
   ```

3. **Run Parser**:
   ```bash
   pnpm --filter @hookah-db/parser run parse
   ```

### Production Deployment

1. **Build Images**:
   ```bash
   docker-compose build
   ```

2. **Start Services**:
   ```bash
   docker-compose up -d
   ```

3. **Generate API Key**:
   ```bash
   pnpm --filter @hookah-db/api run generate-key
   ```

---

## Testing Strategy

### Test Coverage Goals

- **Core Parsing Logic**: 60%+ coverage
- **API Endpoints**: 50%+ coverage
- **Database Operations**: 50%+ coverage
- **Overall**: Not targeting 100%, focusing on critical paths

### Test Categories

1. **Unit Tests**: Individual functions and utilities
2. **Integration Tests**: Database operations, API endpoints
3. **E2E Tests**: Full parsing workflows using example HTML files

### Example HTML Files

The `examples/` directory contains actual HTML pages from htreviews.org:
- `htreviews.org_tobaccos_brands.html` - Brands listing page
- `htreviews.org_tobaccos_sarma.html` - Brand detail page
- `htreviews.org_tobaccos_sarma_klassicheskaya_zima.html` - Tobacco detail page

These files are used for testing parser logic without hitting the live site.

---

## Documentation Structure

### Main Documentation

- **README.md** (this file) - Project overview and architecture
- **database.md** - Database schema and relationships
- **api.md** - API endpoints and usage examples
- **implementation.md** - Step-by-step implementation plan
- **environment.md** - Complete environment variables reference

### Module Documentation

Located in [`docs/modules/`](docs/modules/):
- **parser.md** - Parser service architecture and implementation
- **api.md** - API service architecture and endpoints
- **database.md** - Database service architecture and migrations

---

## Maintenance and Updates

### When to Update Documentation

Documentation should be updated when:

1. **Architecture Changes**: New components, data flow changes
2. **API Changes**: New endpoints, modified responses
3. **Database Changes**: Schema modifications, new tables
4. **Configuration Changes**: New environment variables
5. **Bug Fixes**: Documentation errors or unclear sections

### Documentation Review Process

1. Review documentation monthly during development
2. Update after each major release
3. Keep examples current with actual code
4. Update diagrams when architecture changes

---

## Next Steps

1. Review the [database schema documentation](database.md)
2. Check the [implementation plan](implementation.md)
3. Explore [module-specific documentation](modules/)
4. Set up local development environment

---

## License

This is a personal project. See LICENSE file for details.

## Contact

For questions or issues, please open a GitHub issue.
