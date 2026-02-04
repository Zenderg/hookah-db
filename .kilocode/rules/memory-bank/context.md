# Project Context

## Current State

**Status:** PostgreSQL 18.1 migration completed. All parsers implemented and tested. Full-text search for tobaccos implemented with multi-language support (Russian + English).

**Completed Features:**
- ✅ NestJS application with modular architecture
- ✅ PostgreSQL 18.1 database with all tables
- ✅ API key authentication with request tracking
- ✅ Brand, Line, and Tobacco parsers (Playwright-based)
- ✅ RESTful API with filtering, sorting, and pagination
- ✅ Case-insensitive search (ILIKE) for brands and lines
- ✅ PostgreSQL Full-Text Search for tobaccos with relevance ranking (multi-field: tobacco.name, brand.name, line.name, combined Russian + English configurations)
- ✅ Daily automatic data refresh (cron job at 2:00 AM)
- ✅ CLI commands for API key management and manual parsing
- ✅ Health check endpoint
- ✅ Global exception filter
- ✅ Docker deployment setup
- ✅ Comprehensive README.md documentation (Russian)

**Testing Status (2026-02-04):**
- ✅ BrandsService tests (14 tests)
- ✅ BrandsRepository tests (11 tests)
- ✅ TobaccosService tests (8 tests)
- ✅ TobaccosRepository tests (33 tests) - updated with prefix search and ranking tests
- ✅ LinesService tests (12 tests)
- ✅ LinesRepository tests (14 tests)
- ✅ ApiKeysService tests (18 tests)
- ✅ ApiKeysRepository tests (11 tests)
- ✅ All 124 tests passing

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

### 2026-02-04
- ✅ Implemented improved tobacco search with prefix matching and enhanced ranking
  - **Prefix Search:** Added ILIKE conditions for partial word matching (e.g., "col" finds "Cola", "Cola Lime", "California Cola")
  - **FTS Prefix Operator:** Used `:*` operator in `to_tsquery` for stemming support with prefix matching
  - **Enhanced Ranking:** Implemented bonus-based ranking system with the following weights:
    - Exact match of tobacco.name: +100
    - Prefix match at start of tobacco.name: +50
    - Prefix match at start of brand.name: +30
    - Prefix match at start of line.name: +30
  - **Combined Score:** Final ranking score = base FTS relevance + exact match bonuses + prefix match bonuses
  - **Multi-word Search:** Maintains cross-field AND logic where each search word must match in at least one field
  - **Case-Insensitive Search:** All searches use LOWER() function for case-insensitive matching
  - **Updated [`TobaccosRepository.findAll()`](src/tobaccos/tobaccos.repository.ts:14)** with:
    - ILIKE conditions for prefix matching across tobacco.name, brand.name, and line.name
    - FTS prefix operator (`:*`) for stemming support
    - Bonus calculations for exact and prefix matches
    - Combined ranking score calculation
  - **Added 10 new tests** to [`TobaccosRepository`](src/tobaccos/tobaccos.repository.spec.ts) for prefix search and ranking validation:
    - Prefix search with ILIKE for partial word matches
    - FTS prefix operator (`:*`) for stemming support
    - Exact match bonus for tobacco name
    - Prefix match bonus for tobacco name
    - Prefix match bonus for brand name
    - Prefix match bonus for line name
    - Multi-word search with cross-field AND logic
    - Combined base relevance with bonuses for final ranking
    - Parameter setting for prefix and exact match calculations
    - Case-insensitive search validation
  - **All 124 tests passing** (33 TobaccosRepository tests, including 10 new tests)
  - **Benefits:**
    - Users can now find tobaccos by entering only part of the name
    - Most relevant results appear first due to bonus-based ranking
    - Search is more predictable and intuitive
    - Example: "cola" now returns results in order: "Cola" (exact match), "Cola Lime" (prefix match), "California Cola" (middle match)
    - Example: "cola darks" now correctly finds "Cola" from "Darkside" brand
  - **Performance:** Uses existing GIN indexes for FTS, ILIKE for prefix matching, all calculations done in database for optimal performance
  - **Backward Compatible:** API parameters remain unchanged, client applications require no modifications

### 2026-02-03
  - ✅ Enhanced tobacco search with multi-language PostgreSQL Full-Text Search (Russian + English configurations)
  - Created migration [`1738606800000-AddMultiLanguageFullTextSearch.ts`](src/migrations/1738606800000-AddMultiLanguageFullTextSearch.ts) to add 6 GIN indexes (3 for Russian, 3 for English)
  - Updated [`TobaccosRepository.findAll()`](src/tobaccos/tobaccos.repository.ts:67) to use combined Russian and English full-text search with cross-field AND logic
  - Multi-field search across tobacco.name, brand.name, and line.name with both language configurations
  - Implemented relevance ranking with combined `ts_rank()` from both Russian and English configurations
  - Results sorted by relevance when search is provided (override sortBy parameter)
  - Benefits: Stemming (words in different forms), stop-word removal, proper Russian and English language processing
  - **Critical Bug Fix (2026-02-03):** Fixed multi-word search logic
    - **Problem:** Multi-word searches like "vanilla sebero" returned no results even though data existed
    - **Root Cause:** Original implementation used AND operator (`&`) which required ALL search terms to match in the SAME field
    - **Solution:** Changed to cross-field AND logic where each search word must match in at least one field (tobacco.name OR brand.name OR line.name)
    - **Implementation:** Split search query into individual words, create separate WHERE condition for each word with OR logic across all fields, then combine all word conditions with AND
    - **Result:** "vanilla sebero" now correctly finds vanilla tobacco from Sebero brand
  - Updated [`TobaccosRepository`](src/tobaccos/tobaccos.repository.spec.ts) tests to validate new multi-language full-text search functionality
  - All 114 tests passing (including 23 TobaccosRepository tests)
  - Example: "кола darkside" finds "Cola" from "Darkside", "Кола" from "Darkside", etc.

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

1. Configure CORS for production (if needed)
2. Monitor automatic nightly parsing performance
3. Consider adding caching layer if performance issues arise
4. Add integration tests for API endpoints and parser workflows
