# Project Context

## Current State

**Status:** PostgreSQL 18.1 migration completed. All parsers implemented and tested. Unit tests in progress.

**Completed Features:**
- ✅ NestJS application with modular architecture
- ✅ PostgreSQL 18.1 database with all tables
- ✅ API key authentication with request tracking
- ✅ Brand, Line, and Tobacco parsers (Playwright-based)
- ✅ RESTful API with filtering, sorting, and pagination
- ✅ Case-insensitive search (ILIKE) for all entities
- ✅ Daily automatic data refresh (cron job at 2:00 AM)
- ✅ CLI commands for API key management and manual parsing
- ✅ Health check endpoint
- ✅ Global exception filter
- ✅ Docker deployment setup
- ✅ Comprehensive README.md documentation (Russian)

**Testing Status (2026-02-02):**
- ✅ BrandsService tests (14 tests)
- ✅ BrandsRepository tests (11 tests)
- ✅ TobaccosService tests (8 tests)
- ✅ TobaccosRepository tests (21 tests)
- ✅ LinesService tests (12 tests)
- ✅ LinesRepository tests (14 tests)
- ✅ ApiKeysService tests (18 tests)
- ✅ ApiKeysRepository tests (11 tests)

## Project Structure

Complete NestJS-based project with feature-based modules:

**Core Application:**
- `src/main.ts` - Application entry point
- `src/app.module.ts` - Root module with TypeORM, Config, and Schedule

**Feature Modules:**
- `brands/` - Brand management (entity, repository, service, controller, DTOs)
- `tobaccos/` - Tobacco management (entity, repository, service, controller, DTOs)
- `lines/` - Line management (entity, repository, service, controller, DTOs)
- `api-keys/` - API key management (entity, repository, service)
- `parser/` - Data parsing from htreviews.org (service, strategies)
- `health/` - Health check endpoint
- `auth/` - Authentication module
- `cli/` - CLI commands (Commander.js)

**Common Utilities:**
- `common/guards/` - API key guard
- `common/middleware/` - Auth middleware
- `common/decorators/` - Public route decorator
- `common/interceptors/` - Logging interceptor
- `common/filters/` - Global exception filter
- `common/dto/` - Shared DTOs (pagination)

## Known Constraints

- No limit on API keys/clients
- Daily data refresh schedule (2:00 AM)
- No user accounts or social features
- No admin panel or web UI
- Deployment on local server via Docker Compose
- Single database (PostgreSQL 18.1)
- Simple authentication (API keys only)

## Recent Changes

### 2026-02-03
- Search improvement planned for tobaccos: multi-field search across tobacco name, brand name, and line name (NOT description)
- Current search limitation: only searches in `tobacco.name` field with ILIKE operator
- Planned implementation: PostgreSQL Full-Text Search with GIN indexes for better performance and relevance ranking
- Search fields: tobacco.name, brand.name, line.name (description excluded per requirement)

### 2026-02-02
- Fixed `/tobaccos/by-url` endpoint to properly validate all three slugs (brand, line, tobacco)
- Updated [`TobaccosService.findByUrl()`](src/tobaccos/tobaccos.service.ts:41) to extract all three slugs from URL
- Added new [`TobaccosRepository.findBySlugs()`](src/tobaccos/tobaccos.repository.ts:88) method that joins with brands and lines tables
- Fixed navigation race condition in TobaccoParserStrategy with retry mechanism
- Added comprehensive unit tests for BrandsService (14 tests)
- Added comprehensive unit tests for BrandsRepository (11 tests)
- Added comprehensive unit tests for TobaccosService (8 tests)
- Added comprehensive unit tests for TobaccosRepository (21 tests)
- Added comprehensive unit tests for LinesService (12 tests)
- Added comprehensive unit tests for LinesRepository (14 tests)
- Added comprehensive unit tests for ApiKeysService (18 tests)
- Added comprehensive unit tests for ApiKeysRepository (11 tests)
- All unit tests completed (108 tests total)

### 2026-01-31
- Added filter value endpoints: GET /brands/countries, /brands/statuses, /tobaccos/statuses, /lines/statuses
- Removed `country` column from tobaccos table (now uses brand's country via JOIN)
- Implemented automatic migrations on startup
- Completed PostgreSQL 18.1 migration (all 4 phases)
- Fixed API key request count tracking bug
- Implemented ILIKE-based case-insensitive search for all entities
- Fixed database schema (UUID types for all id columns)
- Added `createdAt` and `updatedAt` to all parser strategies
- Created comprehensive README.md documentation in Russian
- Implemented URL-based parsing feature for CLI (parse by URL)
- Added status field to Brand entity with filtering support

### 2026-01-30
- Implemented full auto-refresh with sequential parsing (Brands → Lines → Tobaccos)
- Added brand status implementation
- Tested all parsers with PostgreSQL 18.1

## Next Steps

1. **Improve tobacco search** (2026-02-03):
   - Implement multi-field search across tobacco.name, brand.name, line.name (NOT description)
   - Add PostgreSQL Full-Text Search with GIN indexes for performance
   - Implement relevance ranking with ts_rank()
   - Support Russian language stemming for better search accuracy
2. Configure CORS for production (if needed)
3. Monitor automatic nightly parsing performance
4. Consider adding caching layer if performance issues arise
