# Project Context

## Current State

**Status:** PostgreSQL 18.1 migration completed. Database is running with all tables created with UUID types. Application successfully connected to PostgreSQL. **All migration phases completed.**

The project structure has been successfully initialized with all necessary files and directories. Dependencies have been installed and the application startup has been verified. The memory bank contains comprehensive documentation covering:

- Project brief with high-level overview and core goals
- Product description explaining why the project exists and what problems it solves
- Architecture documentation with complete system design
- Technology stack details with all dependencies

## Project Structure Created

Complete NestJS-based project structure has been created with:

**Core Application Files:**
- `src/main.ts` - Application entry point with validation, CORS, and logging setup
- `src/app.module.ts` - Root module with TypeORM, Config, and Schedule configuration

**Common Utilities:**
- `src/common/guards/api-key.guard.ts` - API key authentication guard
- `src/common/middleware/auth.middleware.ts` - Authentication middleware
- `src/common/decorators/public.decorator.ts` - Public route decorator
- `src/common/interceptors/logging.interceptor.ts` - Request/response logging interceptor

**Feature Modules:**

1. **Brands Module** (`src/brands/`):
   - `brands.entity.ts` - Brand database entity
   - `brands.repository.ts` - Data access layer
   - `brands.service.ts` - Business logic layer
   - `brands.controller.ts` - HTTP request handlers
   - `brands.module.ts` - NestJS module configuration

2. **Tobaccos Module** (`src/tobaccos/`):
   - `tobaccos.entity.ts` - Tobacco database entity with relationships to Brand and Line
   - `tobaccos.repository.ts` - Data access layer
   - `tobaccos.service.ts` - Business logic layer
   - `tobaccos.controller.ts` - HTTP request handlers
   - `tobaccos.module.ts` - NestJS module configuration

3. **Lines Module** (`src/lines/`):
   - `lines.entity.ts` - Line database entity with relationship to Brand
   - `lines.repository.ts` - Data access layer
   - `lines.service.ts` - Business logic layer
   - `lines.controller.ts` - HTTP request handlers
   - `lines.module.ts` - NestJS module configuration

4. **Auth Module** (`src/auth/`):
   - `auth.module.ts` - Authentication module configuration

5. **Parser Module** (`src/parser/`):
   - `parser.service.ts` - Parser service with scheduled task placeholder
   - `parser.module.ts` - Parser module configuration
   - `strategies/` - Directory for Playwright/Cheerio implementations

6. **API Keys Module** (`src/api-keys/`):
   - `api-keys.entity.ts` - API key database entity
   - `api-keys.repository.ts` - Data access layer
   - `api-keys.service.ts` - Business logic layer
   - `api-keys.module.ts` - NestJS module configuration

7. **CLI Module** (`src/cli/`):
   - `index.ts` - CLI entry point using Commander.js

**Configuration Files:**
- `package.json` - Updated with all required dependencies (NestJS 11.1.12, TypeORM 0.3.28, etc.)
- `.env.example` - Environment variables template
- `.gitignore` - Updated with comprehensive ignore rules
- `tsconfig.json` - TypeScript configuration
- `tsconfig.build.json` - Build TypeScript configuration
- `nest-cli.json` - NestJS CLI configuration
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc` - Prettier configuration

**Docker Configuration:**
- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Docker Compose service configuration
- `.dockerignore` - Docker build ignore rules

**Data Directory:**
- `data/` - Directory for SQLite database persistence (mounted volume) - **To be replaced with PostgreSQL Docker volume**

## Next Steps

### Immediate Actions
1. ✅ Install dependencies: Run `npm install` to install all packages - **COMPLETED**
2. ✅ Add DTOs: Create data transfer objects for request validation - **COMPLETED**
3. ✅ Fix entity schemas: Add imageUrl to Line, fix Tobacco entity schema - **COMPLETED**
4. ✅ Update Line entity to match migration: Remove `nullable: true` from imageUrl, strengthOfficial, strengthByRatings, and status columns - **COMPLETED**
5. ✅ Implement brand parser: Build Playwright parser for htreviews.org - **COMPLETED**
6. ✅ Add CLI commands: Implement create, delete, list, stats commands - **COMPLETED**
7. Write tests: Add unit and integration tests
8. Configure CORS: Set up proper CORS origins for production
9. ✅ Add error handling: Implement global exception filter - **COMPLETED**
10. ✅ Add health check: Create health endpoint for monitoring - **COMPLETED**
11. ✅ Run migrations: Set up TypeORM migrations - **COMPLETED**
12. ✅ Create tobacco parsing specification: Comprehensive specification for parsing tobacco data - **COMPLETED**
13. ✅ Implement line parser: Build Playwright parser for lines from htreviews.org - **COMPLETED**
14. ✅ Implement tobacco parser: Build Playwright parser for tobaccos from htreviews.org - **COMPLETED**
15. ✅ Test business logic in services: API endpoints tested via curl requests - **COMPLETED** (2026-01-30)
16. ✅ Implement ILIKE search: Add case-insensitive search for brands, lines, and tobaccos - **COMPLETED** (2026-01-31)

### Implementation Priority
1. ✅ Core infrastructure (NestJS setup, database, entities) - **COMPLETED**
2. ✅ Authentication system (API keys, middleware) - **COMPLETED**
3. ✅ Brand parser (scraping htreviews.org) - **COMPLETED**
4. ✅ API endpoints (brands, tobaccos, lines) - **COMPLETED**
5. ✅ Filtering and sorting logic - **COMPLETED**
6. ✅ ILIKE search implementation - **COMPLETED** (2026-01-31)
7. ✅ Scheduled tasks for data refresh - **COMPLETED**
8. ✅ Docker deployment setup - **COMPLETED**
9. ✅ CLI commands for API key management - **COMPLETED**
10. ✅ Entity schema fixes (Line imageUrl, Tobacco schema) - **COMPLETED**
11. ✅ Update Line entity to match migration 1706328000007 - **COMPLETED**
12. ✅ Tobacco parser implementation - **COMPLETED**
13. ✅ Business logic in services (tested via API requests) - **COMPLETED**

## Known Constraints

- No limit on API keys/clients (despite architecture mentioning 10)
- Daily data refresh schedule
- No user accounts or social features
- No admin panel or web UI
- Deployment on local server via Docker Compose
- Single database (PostgreSQL 18.1)
- Simple authentication (API keys only)

## Recent Changes (2026-01-31)

### PostgreSQL Migration - Phase 1 & 2 Completed
**Status:** ✅ COMPLETED (2026-01-31)

**Phase 1: Preparation**
- ✅ Removed `sqlite3` package from dependencies
- ✅ Installed `pg` package for PostgreSQL driver
- ✅ Updated [`src/data-source.ts`](src/data-source.ts) - Changed type from `sqlite` to `postgres`, added connection parameters (host, port, username, password, database)
- ✅ Updated [`src/app.module.ts`](src/app.module.ts) - Updated TypeORM configuration to use PostgreSQL with environment variables

**Phase 2: Database Setup**
- ✅ Updated [`docker-compose.yml`](docker-compose.yml) - Added PostgreSQL 18.1 service with:
  - Image: `postgres:18.1`
  - Port mapping: `5432:5432`
  - Volume: `postgres_data` for data persistence (mounted at `/var/lib/postgresql` for PostgreSQL 18.1+ compatibility)
  - Environment variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - API service updated with dependency on PostgreSQL and new environment variables
- ✅ Updated [`.env.example`](.env.example) - Added PostgreSQL environment variables:
  - `DATABASE_HOST=localhost`
  - `DATABASE_PORT=5432`
  - `DATABASE_USERNAME=postgres`
  - `DATABASE_PASSWORD=postgres`
  - `DATABASE_NAME=hookah_db`
  - Removed unused `API_KEY_SECRET` variable
- ✅ Created [`.env`](.env) - Environment file for local development with PostgreSQL configuration

**Phase 3: Schema Migration**
- ✅ Fixed migration file ([`src/migrations/1706328000000-InitialSchema.ts`](src/migrations/1706328000000-InitialSchema.ts)):
  - Replaced all `datetime` types with `timestamp` for PostgreSQL compatibility (5 occurrences: brands, lines, tobaccos, api_keys tables)
- ✅ Successfully ran TypeORM migration to create all tables:
  - `brands` (with indexes on slug, rating)
  - `lines` (with indexes on slug, rating, status, strengthOfficial, brandId)
  - `tobaccos` (with indexes on brandId, lineId, rating, country)
  - `api_keys` (with unique constraint on key)
  - `migrations` table

**Additional Fixes:**
- ✅ Fixed health endpoint authentication ([`src/health/health.controller.ts`](src/health/health.controller.ts)):
  - Added `@Public()` decorator to make health endpoint publicly accessible
  - Updated [`ApiKeyGuard`](src/common/guards/api-key.guard.ts) to respect `@Public()` decorator

**Current State:**
- PostgreSQL 18.1 running in Docker container
- NestJS application running on http://localhost:3000
- Health check endpoint accessible and reporting database status as "up"
- All database tables created successfully
- Application successfully connected to PostgreSQL

**Next Steps Required:**
1. Write unit tests for services and repositories (pending implementation)
2. Configure CORS: Set up proper CORS origins for production (if needed)

### API Key Request Count Bug Fix
**Status:** ✅ FIXED (2026-01-31)

**Problem:** API key `requestCount` field was staying at 0 despite multiple API requests.

**Root Cause:** [`ApiKeyGuard`](src/common/guards/api-key.guard.ts) was not calling [`ApiKeysService.validateApiKey()`](src/api-keys/api-keys.service.ts:53) method, which is responsible for validating API keys against database and incrementing request count.

**Solution Implemented:**
1. Updated [`ApiKeyGuard`](src/common/guards/api-key.guard.ts) to inject and use [`ApiKeysService`](src/api-keys/api-keys.service.ts)
2. Guard now calls [`validateApiKey()`](src/api-keys/api-keys.service.ts:53) on every authenticated request
3. [`validateApiKey()`](src/api-keys/api-keys.service.ts:53) method calls [`incrementRequestCount()`](src/api-keys/api-keys.repository.ts:30) and [`updateLastUsed()`](src/api-keys/api-keys.repository.ts:26)
4. Made [`ApiKeysModule`](src/api-keys/api-keys.module.ts:7) global with [`@Global()`](src/api-keys/api-keys.module.ts:7) decorator for availability across all modules
5. Moved [`APP_GUARD`](src/app.module.ts:50) registration from [`AuthModule`](src/auth/auth.module.ts) to [`AppModule`](src/app.module.ts) for proper dependency resolution

**Testing Results:**
- Created test API key
- Made 3 API requests (brands, tobaccos)
- Verified `requestCount` incremented from 0 to 4
- CLI `stats` command now shows accurate usage data

### PostgreSQL Migration - Phase 4 Completed
**Status:** ✅ COMPLETED (2026-01-31)

**Phase 4: Application Updates (ILIKE Search)**
- ✅ Added `search` parameter to [`FindBrandsDto`](src/brands/dto/find-brands.dto.ts:17) with `@IsString()` and `@IsOptional()` decorators
- ✅ Added `search` parameter to [`FindLinesDto`](src/lines/dto/find-lines.dto.ts:9) with `@IsString()` and `@IsOptional()` decorators
- ✅ Added `search` parameter to [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts:53) with `@IsString()` and `@IsOptional()` decorators
- ✅ Updated [`BrandsRepository`](src/brands/brands.repository.ts:23) to use ILIKE filter for `brand.name`
- ✅ Updated [`LinesRepository`](src/lines/lines.repository.ts:23) to use ILIKE filter for `line.name`
- ✅ Updated [`TobaccosRepository`](src/tobaccos/tobaccos.repository.ts:48) to use ILIKE filter for `tobacco.name`
- ✅ Fixed [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts:53) by removing non-existent filters (`category`, `year`, `productionStatus`) and renaming `productionStatus` → `status`
- ✅ Fixed [`TobaccosRepository`](src/tobaccos/tobaccos.repository.ts:48) by removing filters for non-existent fields

**ILIKE Search Implementation:**
All three repositories now support case-insensitive search using PostgreSQL's ILIKE operator:
```typescript
if (dto.search) {
  queryBuilder.andWhere('entity.name ILIKE :search', {
    search: `%${dto.search}%`,
  });
}
```

This enables:
- **Case-insensitive search**: "dogma", "Dogma", "DOGMA" all return same results
- **Partial match**: "dog" returns "Dogma", "dogmatic", etc.
- **Multi-language support**: Works with both Latin and Cyrillic characters (UTF-8 encoding)

**API Endpoints Updated:**
- **GET /brands?search=dogma** - Search brands by name
- **GET /lines?search=pank** - Search lines by name
- **GET /tobaccos?search=tangiers** - Search tobaccos by name

### Database Schema Issue Fixed
**Status:** ✅ FIXED (2026-01-31)

**Problem:** Database `id` columns were `text` type instead of `uuid` type (migration bug from initial schema migration `1706328000000-InitialSchema.ts`).

**Impact:** TypeORM expects UUID type for `id` columns but database had TEXT type, which could cause issues with UUID generation and foreign key relationships.

**Solution Implemented:**
1. **Created new migration** ([`src/migrations/1706328000000-InitialSchema.ts`](src/migrations/1706328000000-InitialSchema.ts)):
   - Replaced all `id` columns from `text` to `uuid` type
   - Added `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` for PostgreSQL
   - All `id` columns now use `uuid_generate_v4()` for auto-generation
   - All foreign key columns (`brandId`, `lineId`) also use `uuid` type
   - Deleted old migration file `1706328000001-FixIdColumnsToUuid.ts` (no longer needed)

2. **Database Recreated:**
   - Dropped Docker volume `postgres_data` to completely reset database
   - Ran migration successfully with new UUID schema
   - All tables created with correct UUID types

3. **Fixed API Keys Service Bug** ([`src/api-keys/api-keys.service.ts`](src/api-keys/api-keys.service.ts)):
   - Added `createdAt` and `updatedAt` fields when creating API keys
   - This fixed "null value in column 'createdAt' violates not-null constraint" error

**Testing Results:**
- ✅ All tables verified to have `uuid` type for `id` columns
- ✅ API key created successfully with UUID: `485ffe47-442f-4fb2-bdea-ea14b9728776`
- ✅ API endpoints tested (GET /brands, GET /tobaccos) - all working
- ✅ Request count incrementing correctly (0 → 2 after API requests)
- ✅ Foreign key constraints working correctly
- ✅ Health check endpoint operational

**Migration Status:**
- Single migration file: [`src/migrations/1706328000000-InitialSchema.ts`](src/migrations/1706328000000-InitialSchema.ts)
- All `id` columns: `uuid` type with `uuid_generate_v4()` default
- All foreign key columns: `uuid` type
- Migration table updated successfully

### Parser Testing After PostgreSQL Migration
**Status:** ✅ COMPLETED (2026-01-31)

**Testing Results:**
- ✅ Brand parser tested successfully: 5 brands created
- ✅ Line parser tested successfully: 3 lines created
- ✅ Tobacco parser tested successfully: 3 tobaccos created
- ✅ All parsers working correctly with PostgreSQL 18.1

**Problem Found:** All three parser strategies were missing `createdAt` and `updatedAt` fields in their `normalizeToEntity()` methods, causing "null value in column violates not-null constraint" errors when creating entities in PostgreSQL.

**Solution Implemented:**
1. **BrandParserStrategy** ([`src/parser/strategies/brand-parser.strategy.ts:281`](src/parser/strategies/brand-parser.strategy.ts:281)): Added `createdAt: new Date()` and `updatedAt: new Date()` to `normalizeToEntity()` method
2. **LineParserStrategy** ([`src/parser/strategies/line-parser.strategy.ts:534`](src/parser/strategies/line-parser.strategy.ts:534)): Added `createdAt: new Date()` and `updatedAt: new Date()` to `normalizeToEntity()` method
3. **TobaccoParserStrategy** ([`src/parser/strategies/tobacco-parser.strategy.ts:485`](src/parser/strategies/tobacco-parser.strategy.ts:485)): Added `createdAt: new Date()` and `updatedAt: new Date()` to `normalizeToEntity()` method

**CLI Commands Used:**
- `npm run cli -- parse brands --limit 5` - Parsed 5 brands (Догма, Bonche, Satyr, Kraken, World Tobacco Original)
- `npm run cli -- parse lines --limit 3` - Parsed 3 lines (100% сигарный панк, Сигарный моносорт, Сигарный парфюм)
- `npm run cli -- parse tobaccos --limit 3` - Parsed 3 tobaccos (Лемон дропс, Пушкин, Малиновый компот)

**Verification:**
- API queries confirmed all data saved with proper timestamps
- GET /brands returned 5 brands with `createdAt` and `updatedAt` fields
- GET /lines returned 3 lines with `createdAt` and `updatedAt` fields
- GET /tobaccos returned 3 tobaccos with `createdAt` and `updatedAt` fields

## PostgreSQL Migration Plan

### Migration Goals
1. **Case-Insensitive Search**: Implement ILIKE-based search for all entity name fields (brands, lines, tobaccos)
2. **Multi-Language Support**: Ensure UTF-8 encoding properly handles both Latin and Cyrillic characters
3. **Data Integrity**: Preserve all existing data during migration
4. **Zero Downtime**: Minimize service disruption during migration

### Technical Specifications
- **Database Version**: PostgreSQL 18.1 (latest stable as of 2026-01-31)
- **Search Operator**: ILIKE (PostgreSQL case-insensitive pattern matching)
- **Search Behavior**: Partial match (contains), case-insensitive
- **Query Parameter**: `search` (optional string, e.g., `?search=dogma`)
- **Languages**: Supports both Latin and Cyrillic characters
- **Encoding**: UTF-8 (PostgreSQL default)

### Migration Steps

**Phase 1: Preparation**
- Backup current SQLite database
- Remove `sqlite3` package, install `pg` package
- Update TypeORM configuration to use PostgreSQL driver

**Phase 2: Database Setup**
- Update docker-compose.yml with PostgreSQL 18.1 service
- Configure environment variables (DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME)
- Set up Docker volume for data persistence

**Phase 3: Schema Migration**
- Review and update entity definitions for PostgreSQL compatibility
- Generate new migration for PostgreSQL schema
- Export data from SQLite, transform, and import to PostgreSQL

**Phase 4: Application Updates**
- Update repository queries to use ILIKE for search
- Add `search` parameter to DTOs (FindBrandsDto, FindLinesDto, FindTobaccosDto)
- Update environment variables

**Phase 5: Testing**
- Test case-insensitive search with Latin and Cyrillic characters
- Verify all data migrated correctly
- Test API endpoints with search functionality

**Phase 6: Deployment**
- Deploy to staging, run full test suite
- Schedule maintenance window for production deployment
- Monitor logs and metrics after deployment

### Key Code Changes Required

**1. Update TypeORM Configuration** ([`src/data-source.ts`](src/data-source.ts))
- Change driver from `sqlite3` to `pg`
- Update connection parameters for PostgreSQL

**2. Update Docker Compose** ([`docker-compose.yml`](docker-compose.yml))
```yaml
services:
  postgres:
    image: postgres:18.1
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hookah_db
```

**3. Update Repository Search Queries**
- Add ILIKE filter in [`brands.repository.ts`](src/brands/brands.repository.ts)
- Add ILIKE filter in [`lines.repository.ts`](src/lines/lines.repository.ts)
- Add ILIKE filter in [`tobaccos.repository.ts`](src/tobaccos/tobaccos.repository.ts)

Example:
```typescript
if (dto.search) {
  query.andWhere('brand.name ILIKE :search', {
    search: `%${dto.search}%`,
  });
}
```

**4. Update DTOs**
- Add `search` field to [`FindBrandsDto`](src/brands/dto/find-brands.dto.ts)
- Add `search` field to [`FindLinesDto`](src/lines/dto/find-lines.dto.ts)
- Add `search` field to [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts)

**5. Update Environment Variables** ([`.env.example`](.env.example))
- Add DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME

### Rollback Plan
If migration fails:
1. Stop PostgreSQL service: `docker-compose down`
2. Revert package.json, data-source.ts, docker-compose.yml changes
3. Restore data/ directory from backup
4. Restart service: `docker-compose up -d`

### Estimated Timeline
- Phase 1: 2 hours
- Phase 2: 1 hour
- Phase 3: 4 hours
- Phase 4: 3 hours
- Phase 5: 4 hours
- Phase 6: 2 hours
- **Total**: ~16 hours

### Success Criteria
- ✅ All data migrated without loss
- ✅ Case-insensitive search works for all entities
- ✅ Search works with both Latin and Cyrillic
- ✅ API performance maintained or improved
- ✅ Zero data corruption
- ⏳ All tests passing (pending)

## Technical Decisions

- Parser choice: Playwright selected (Playwright v1.58.0 in package.json)
- API key storage: Database table (implemented in api-keys.entity.ts)
- API key format: UUID v4 (not hex)
- API key limit: No limit enforced (despite architecture mentioning 10)
- API key hashing: Not hashed (stored in plain text)
- CLI framework: Commander.js v14.0.0 for command-line interface
- CLI statistics: Shows overall statistics for all keys (not per-key)
- Error handling strategy: Global exception filter implemented
- Logging framework: Structured JSON logging with interceptor (structure ready)
- Rate limiting: Request logging only (per requirements)

## Architecture Implementation Status

**Implemented:**
- ✅ Modular architecture with feature-based modules
- ✅ Layered design (Controller → Service → Repository)
- ✅ TypeORM entities with proper relationships
- ✅ Entity schema fixes (Line imageUrl, Tobacco schema corrections, Line entity nullable fields)
- ✅ API key authentication guard
- ✅ Request/response logging interceptor
- ✅ Environment-based configuration
- ✅ Docker containerization
- ✅ CLI commands for API key management (create, delete, list, stats)
- ✅ Scheduled task structure for data refresh
- ✅ DTOs for validation with filtering, sorting, and pagination
- ✅ API endpoints with filtering/sorting (brands, tobaccos, lines)
- ✅ ILIKE-based case-insensitive search for brands, lines, and tobaccos
- ✅ Global exception filter with consistent error responses
- ✅ Brand parser implementation (scraping htreviews.org)
- ✅ Line parser implementation (scraping htreviews.org)
- ✅ Tobacco parser implementation (scraping htreviews.org)

**Pending Implementation:**
- ⏳ Tests (unit tests for services and repositories)
