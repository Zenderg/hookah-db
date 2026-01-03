# Documentation Summary

## Overview

This document provides a summary of all documentation for the Hookah Tobacco Database API project. The project is a simple pet project that parses tobacco data from htreviews.org and exposes it through a REST API with API key authentication.

## Documentation Structure

```
docs/
├── README.md                    # Main project documentation
├── database.md                  # Database schema and design
├── api.md                       # API endpoints and usage
├── implementation.md            # Implementation plan
├── environment.md               # Environment variables
├── modules/
│   ├── api.md                   # API module technical details
│   ├── database.md              # Database module technical details
│   └── parser.md                # Parser module technical details
└── SUMMARY.md                   # This file
```

## Quick Links

- **Getting Started**: See [`README.md`](README.md)
- **Database Design**: See [`database.md`](database.md)
- **API Reference**: See [`api.md`](api.md)
- **Implementation Plan**: See [`implementation.md`](implementation.md)
- **Environment Variables**: See [`environment.md`](environment.md)
- **API Module Details**: See [`modules/api.md`](modules/api.md)
- **Database Module Details**: See [`modules/database.md`](modules/database.md)
- **Parser Module Details**: See [`modules/parser.md`](modules/parser.md)

## Documentation by Topic

### 1. Project Overview ([`README.md`](README.md))

**Contents**:
- Problem statement and solution
- High-level architecture
- Technology stack
- Project structure
- Data flow diagrams
- API access guide
- Development workflow
- Documentation maintenance

**Key Points**:
- Simple pet project, not over-engineered
- Monorepo with pnpm workspaces
- Four main modules: API, Database, Parser, Shared
- REST API with API key authentication
- Docker Compose for deployment

---

### 2. Database Design ([`database.md`](database.md))

**Contents**:
- Database schema design
- Table relationships
- Column descriptions
- ER diagrams
- Design decisions and rationale

**Schema**:
- **brands**: Brand information (id, name, slug, description, imageUrl, updatedAt, parsedAt)
- **tobaccos**: Tobacco information (id, brandId, name, slug, description, imageUrl, updatedAt, parsedAt)
- **api_keys**: API key management (id, name, keyHash, isActive, createdAt)

**Schema Structure**:
- PostgreSQL schemas are in `packages/database/src/schema/` directory
- SQLite schemas are in `packages/database/src/schema/sqlite/` directory
- `brands.ts` - brands table definition with indexes
- `tobaccos.ts` - tobaccos table definition with foreign key and indexes
- `api-keys.ts` - api_keys table definition with indexes
- `index.ts` - exports all schema definitions

**Indexes**:
- **brands**: `brands_name_idx` (name), `brands_slug_idx` (slug, UNIQUE)
- **tobaccos**: `tobaccos_brand_id_idx` (brand_id), `tobaccos_name_idx` (name), `tobaccos_slug_idx` (slug, UNIQUE)
- **api_keys**: `api_keys_key_hash_idx` (key_hash, UNIQUE), `api_keys_is_active_idx` (is_active)

**Key Points**:
- Minimal schema with only essential data
- No lines table (user doesn't want to store line information)
- No api_key_usage table (user doesn't need logs)
- UUID primary keys
- Foreign key relationship from tobaccos to brands with cascade delete
- Unique constraints on slugs
- Indexes created on frequently queried columns for performance
- Dual-database support: SQLite for development, PostgreSQL for production

---

### 3. API Reference ([`api.md`](api.md))

**Contents**:
- Authentication requirements
- All API endpoints with examples
- Request/response formats
- Error responses
- Code examples in TypeScript and Python

**Endpoints**:
- `GET /api/brands` - List all brands
- `GET /api/brands/:slug` - Get single brand
- `GET /api/brands/:slug/tobaccos` - Get tobaccos for a brand
- `GET /api/tobaccos` - List all tobaccos
- `GET /api/tobaccos/:slug` - Get single tobacco
- `POST /api/keys/generate` - Generate new API key
- `GET /api/keys` - List all API keys
- `POST /api/keys/:id/toggle` - Toggle API key status
- `DELETE /api/keys/:id` - Delete API key

**Key Points**:
- All endpoints require API key in `X-API-Key` header
- Pagination support (page, limit, total, totalPages)
- Search and filtering support
- Sorting support
- Standardized error responses

---

### 4. Implementation Plan ([`implementation.md`](implementation.md))

**Contents**:
- 8-phase implementation plan
- Gantt chart timeline
- Detailed task breakdown
- Testing checklist
- Deployment steps

**Phases**:
1. Project Setup (pnpm workspace, Docker Compose)
2. Database Module (schema, migrations, queries)
3. Parser Module (HTTP client, HTML parser, scroll handler)
4. API Module (server, authentication, routes)
5. Integration (connect all modules)
6. Testing (unit tests, integration tests)
7. Documentation (API docs, README)
8. Deployment (Docker, environment setup)

**Key Points**:
- Simple, manageable steps
- Focus on core functionality
- No over-engineering
- Test coverage for main functionality only

---

### 5. Environment Variables ([`environment.md`](environment.md))

**Contents**:
- All environment variables
- Required vs optional variables
- Example configurations
- Security considerations
- Common issues and solutions

**Variables**:
- `DATABASE_URL` - Database connection string
- `API_PORT` - API server port
- `API_HOST` - API server host
- `PARSER_BASE_URL` - htreviews.org URL
- `PARSER_CONCURRENT_REQUESTS` - Concurrent requests limit
- `PARSER_SCROLL_DELAY_MS` - Delay between scroll requests
- `PARSER_MAX_RETRIES` - Retry attempts
- `PARSER_TIMEOUT_MS` - Request timeout
- `LOG_LEVEL` - Logging level
- `LOG_FORMAT` - Log format
- `NODE_ENV` - Environment mode
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

**Key Points**:
- Centralized configuration
- Environment-specific configs (dev/production)
- Security best practices
- Default values provided

---

### 6. API Module Details ([`modules/api.md`](modules/api.md))

**Contents**:
- Technical implementation details
- Server setup with Fastify
- Authentication middleware
- Route handlers
- Error handling
- Validation
- Testing strategies
- Performance considerations

**Key Points**:
- Fastify framework for performance
- API key authentication via middleware
- Input validation with Zod
- Standardized error responses
- Unit tests for routes
- Integration tests for full flow

---

### 7. Database Module Details ([`modules/database.md`](modules/database.md))

**Contents**:
- Technical implementation details
- Schema definitions with Drizzle ORM
- Migration system
- Query helpers
- Upsert operations
- Connection pooling
- Testing strategies
- Performance considerations

**Key Points**:
- Drizzle ORM for type-safe queries
- PostgreSQL for production, SQLite for development
- Migration system with Drizzle Kit
- Reusable query helpers
- Transaction support
- Unit tests for queries
- Indexes for performance
- Dual-database support with SQLite-specific schemas
- Migration workflow with generate, migrate, push, and studio commands

---

### 8. Parser Module Details ([`modules/parser.md`](modules/parser.md))

**Contents**:
- Technical implementation details
- HTTP Client with got v14.6.3
- Retry logic with exponential backoff
- Rate limiting with sliding window algorithm
- Timeout handling
- HTML parser with Cheerio
- Scroll handler for infinite scroll
- Data extractor
- Database writer
- CLI interface
- Testing strategies
- Performance considerations

**Key Points**:
- got v14.6.3 for HTTP requests with built-in retry and timeout support
- Custom sliding window rate limiter for request throttling
- Exponential backoff retry logic (1s, 2s, 4s, 8s, capped at 30s)
- Handles retryable HTTP status codes: 429, 500, 502, 503, 504
- Handles network errors: ETIMEDOUT, ECONNRESET, EADDRINUSE, ECONNREFUSED, EPIPE, ENOTFOUND, ENETUNREACH, EAI_AGAIN
- Cheerio for HTML parsing
- Infinite scroll handling
- Batch operations for efficiency
- CLI for running parser
- Unit tests with example HTML files

---

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 20+ with TypeScript 5.9.3
- **Package Manager**: pnpm 10.27.0 with workspaces and catalog feature
- **API Framework**: Fastify
- **Database ORM**: Drizzle ORM v0.45.1
- **Databases**: PostgreSQL (production), SQLite (development)
- **Database Drivers**: pg v8.16.3, better-sqlite3 v12.5.0
- **Migration Tool**: Drizzle Kit v0.31.8
- **HTML Parser**: Cheerio
- **HTTP Client**: Got
- **Testing**: Vitest 3.2.4
- **Containerization**: Docker & Docker Compose

### Supporting Libraries
- **Environment Management**: @t3-oss/env-core
- **Validation**: Zod
- **UUID**: crypto.randomUUID()
- **Logging**: pino (Fastify default)
- **Rate Limiting**: @fastify/rate-limit
- **HTTP Client**: got v14.6.3

### Key Configuration Choices
- **pnpm Catalogs**: Centralized dependency management across packages
- **TypeScript Composite Projects**: Enabled for monorepo support (composite: true)
- **Module Resolution**: Set to "bundler" for Node 20+ compatibility
- **ESM by Default**: All package.json files use "type": "module"
- **Workspace Protocol**: Internal dependencies use workspace:* syntax
- **Package References**: tsconfig files reference other packages for cross-package type checking

---

## Key Design Decisions

### Simplicity Over Complexity
- Minimal database schema (only essential data)
- No over-engineering
- Focus on core functionality
- No CI/CD, backups, or advanced features

### Monorepo Structure
- pnpm workspaces for code sharing
- Separate packages for each module
- Clear separation of concerns
- Catalog feature for centralized dependency management

### Database Design
- PostgreSQL for production (performance, reliability)
- SQLite for development (simplicity, no setup)
- UUID primary keys (distributed system ready)
- Foreign key constraints (data integrity)
- Unique constraints (prevent duplicates)
- Indexes on frequently queried columns (performance)
- Dual-database support with separate schemas for SQLite compatibility

### API Design
- RESTful conventions
- API key authentication (simple, effective)
- Pagination (handle large datasets)
- Search and filtering (flexible queries)
- Standardized error responses (consistent API)

### Parser Design
- Retry logic (handle network issues)
- Rate limiting (respect htreviews.org)
- Infinite scroll support (get all data)
- Batch operations (efficiency)
- CLI interface (easy to use)

---

## Project Structure

```
hookah-db/
├── package.json                 # Root package.json with workspace configuration
├── pnpm-workspace.yaml         # Workspace definition with catalog
├── tsconfig.json               # Root TypeScript configuration
├── pnpm-lock.yaml              # Lock file (auto-generated)
├── packages/
│   ├── api/
│   │   ├── package.json        # API module package.json
│   │   ├── tsconfig.json       # API TypeScript config
│   │   └── src/
│   │       └── index.ts        # API entry point
│   ├── parser/
│   │   ├── package.json        # Parser module package.json
│   │   ├── tsconfig.json       # Parser TypeScript config
│   │   └── src/
│   │       ├── http/
│   │       │   └── client.ts   # HTTP client implementation
│   │       └── index.ts        # Parser entry point
│   ├── database/
│   │   ├── package.json        # Database module package.json
│   │   ├── tsconfig.json       # Database TypeScript config
│   │   ├── drizzle.config.ts   # Drizzle Kit configuration
│   │   ├── migrations/         # Database migration files
│   │   │   ├── 0000_bored_nebula.sql  # Initial migration
│   │   │   └── meta/          # Migration metadata
│   │   │       ├── _journal.json
│   │   │       └── 0000_snapshot.json
│   │   └── src/
│   │       ├── schema/         # PostgreSQL schema definitions
│   │       │   ├── brands.ts
│   │       │   ├── tobaccos.ts
│   │       │   ├── api-keys.ts
│   │       │   └── index.ts
│   │       ├── schema/sqlite/  # SQLite schema definitions
│   │       │   ├── brands.ts
│   │       │   ├── tobaccos.ts
│   │       │   ├── api-keys.ts
│   │       │   └── index.ts
│   │       └── index.ts        # Database entry point
│   └── shared/
│       ├── package.json        # Shared module package.json
│       ├── tsconfig.json       # Shared TypeScript config
│       └── src/
│           └── index.ts        # Shared entry point
├── docs/                       # Documentation
│   ├── modules/               # Module-specific documentation
│   ├── architecture.md        # This file
│   ├── database.md            # Database schema documentation
│   ├── api.md                 # API endpoints documentation
│   └── implementation.md      # Implementation plan
├── examples/                   # Example HTML files
├── .gitignore                  # Git ignore file
├── docker-compose.yml          # Production deployment (to be created)
├── docker-compose.dev.yml      # Local development (to be created)
└── .env.example               # Environment variables template (to be created)
```

---

## Development Workflow

### Local Development
1. Clone repository
2. Install dependencies: `pnpm install`
3. Copy `.env.development` to `.env`
4. Start services: `docker-compose -f docker-compose.dev.yml up`
5. Run parser: `pnpm --filter @hookah-db/parser parse all`
6. Access API: `http://localhost:3000`

### Testing
1. Run unit tests: `pnpm test`
2. Run integration tests: `pnpm test:integration`
3. Run specific module tests: `pnpm --filter @hookah-db/database test`

### Deployment
1. Build Docker images: `docker-compose build`
2. Configure environment variables
3. Start services: `docker-compose up -d`
4. Run parser: `docker-compose exec api pnpm parse all`

---

## Documentation Maintenance

### When to Update Documentation

Update documentation when:
- Adding new API endpoints
- Changing database schema
- Modifying environment variables
- Updating implementation plan
- Changing project structure
- Adding new modules or features

### How to Update Documentation

1. Update relevant documentation files
2. Update SUMMARY.md if needed
3. Update diagrams if architecture changes
4. Update examples if API changes
5. Test all code examples
6. Review for consistency

---

## Next Steps

1. **Review Documentation**: Read through all documentation files
2. **Clarify Questions**: Ask any questions about the design
3. **Approve Plan**: Confirm the implementation plan
4. **Start Implementation**: Switch to Code mode to begin development

---

## Questions?

If you have any questions about the documentation or need clarification on any aspect of the project, please ask before starting implementation.

---

## Summary

This documentation provides a complete guide for implementing the Hookah Tobacco Database API project. The architecture is designed to be simple and maintainable, focusing on core functionality without over-engineering. All documentation is in English as requested, and the project is structured as a monorepo with pnpm workspaces for easy development and deployment.

The project features:
- **Dual-database support**: SQLite for development, PostgreSQL for production
- **Migration system**: Drizzle Kit with versioned migrations
- **SQLite-specific schemas**: Separate schema definitions for SQLite compatibility
- **Comprehensive documentation**: All modules and features well-documented
- **Simple architecture**: Focus on essential functionality without over-engineering
- **Robust HTTP client**: got v14.6.3 with retry logic, rate limiting, and timeout handling
- **Exponential backoff**: 1s, 2s, 4s, 8s, capped at 30s for failed requests
- **Sliding window rate limiter**: Custom implementation for request throttling
