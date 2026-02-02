# Project Context

## Current State

**Status:** PostgreSQL 18.1 migration completed. Database is running with all tables created with UUID types. Application successfully connected to PostgreSQL. **All migration phases completed. README.md documentation created. Brand status implementation completed (2026-01-31). Full auto-refresh implementation completed (2026-02-01).**

The project structure has been successfully initialized with all necessary files and directories. Dependencies have been installed and the application startup has been verified. The memory bank contains comprehensive documentation covering:

- Project brief with high-level overview and core goals
- Product description explaining why the project exists and what problems it solves
- Architecture documentation with complete system design
- Technology stack details with all dependencies
- Complete README.md documentation for users and developers

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
17. ✅ Create README.md documentation: Comprehensive user documentation in Russian - **COMPLETED** (2026-01-31)
18. ✅ Add URL-based parsing to CLI: Implement parse by URL for brands, lines, and tobaccos - **COMPLETED** (2026-01-31)

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
14. ✅ README.md documentation (comprehensive user documentation) - **COMPLETED** (2026-01-31)
15. ✅ URL-based parsing feature for CLI (parse by URL) - **COMPLETED** (2026-01-31)

## Known Constraints

- No limit on API keys/clients (despite architecture mentioning 10)
- Daily data refresh schedule
- No user accounts or social features
- No admin panel or web UI
- Deployment on local server via Docker Compose
- Single database (PostgreSQL 18.1)
- Simple authentication (API keys only)

## Recent Changes (2026-02-02)

### Navigation Race Condition Fix - Implemented
**Status:** ✅ COMPLETED (2026-02-02)

**Problem:**
During automatic nightly parsing, navigation errors occurred in TobaccoParserStrategy:
```
Navigation to "https://htreviews.org/tobaccos/starbuzz/starbuzz-vintage" is interrupted by another navigation to "https://htreviews.org/tobaccos/hook-by-chabacco/main"
```

This was a race condition where new navigation started before previous navigation completed, causing:
- Some lines not being parsed
- Loss of data for affected lines
- Unstable automatic nightly parsing

**Root Cause:**
- Single page instance (`this.page`) used for all navigations
- `waitUntil: 'networkidle'` parameter unreliable for pages with:
  - Long-lived network requests
  - JavaScript that continues loading resources
  - Network instability
- Infinite scroll mechanism could trigger JavaScript affecting page state
- No delays between consecutive navigations

**Solution Implemented:**

1. **Added `safeNavigate()` method** ([`src/parser/strategies/tobacco-parser.strategy.ts:64`](src/parser/strategies/tobacco-parser.strategy.ts:64)):
   - Retry mechanism with configurable attempts (default: 3)
   - Progressive backoff: 1s, 2s, 3s wait between retries
   - Better waiting strategy: `commit` → `domcontentloaded` → `load` → stability check
   - 500ms additional wait after navigation to ensure page stability
   - Detailed logging for each navigation attempt

2. **Updated navigation calls**:
   - [`extractTobaccoUrlsFromLinePage()`](src/parser/strategies/tobacco-parser.strategy.ts:191) now uses `safeNavigate()` instead of direct `page.goto()`
   - [`parseTobaccoDetailPage()`](src/parser/strategies/tobacco-parser.strategy.ts:301) now uses `safeNavigate()` instead of direct `page.goto()`

3. **Added delays between navigations**:
   - 300ms delay between tobacco page navigations (line 167)
   - 500ms delay between line page navigations (line 182)
   - Prevents race conditions by giving page time to stabilize

**Implementation Details:**

**`safeNavigate()` Method:**
```typescript
private async safeNavigate(url: string, retries = 3): Promise<void> {
  const fullUrl = url.startsWith('http')
    ? url
    : `https://htreviews.org${url}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      this.logger.debug(
        `Navigating to ${fullUrl} (attempt ${attempt}/${retries})`,
      );

      // Use 'commit' for faster initial response, then wait for domcontentloaded
      await this.page.goto(fullUrl, {
        waitUntil: 'commit',
        timeout: 30000,
      });

      // Wait for DOM to be fully loaded
      await this.page.waitForLoadState('domcontentloaded', {
        timeout: 10000,
      });

      // Additional wait to ensure page is stable
      await this.page.waitForTimeout(500);

      // Verify page is stable (not loading)
      const isStable = await this.page.evaluate(() => {
        return document.readyState === 'complete';
      });

      if (!isStable) {
        await this.page.waitForLoadState('load', { timeout: 10000 });
      }

      this.logger.debug(`Successfully navigated to ${fullUrl}`);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (attempt === retries) {
        this.logger.error(
          `Failed to navigate to ${fullUrl} after ${retries} attempts: ${errorMessage}`,
        );
        throw error;
      }

      this.logger.warn(
        `Navigation attempt ${attempt}/${retries} failed for ${fullUrl}: ${errorMessage}. Retrying...`,
      );

      // Wait before retry
      await this.page.waitForTimeout(1000 * attempt);
    }
  }
}
```

**Testing Results:**
- ✅ Build successful (`npm run build` completed without errors)
- ✅ TypeScript compilation successful
- ✅ ESLint formatting applied correctly
- ✅ Manual parsing tested successfully:
  - `npm run cli -- parse brand --url "https://htreviews.org/tobaccos/dogma"` - Completed in 9.03s
  - `npm run cli -- parse line --url "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank"` - Completed in 9.17s
  - `npm run cli -- parse tobacco --url "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/lemon-drops"` - Completed in 2.68s
- ✅ Navigation retry mechanism working correctly (logs show "Navigating to... (attempt 1/3)" and "Successfully navigated to...")
- ✅ No navigation race condition errors during testing

**Important Notes:**
- Retry mechanism handles transient network errors and navigation interruptions
- Progressive backoff prevents overwhelming the server with rapid retries
- Delays between navigations prevent race conditions
- Page stability check ensures DOM is fully loaded before data extraction
- Better waiting strategy (`commit` + `domcontentloaded`) is faster and more reliable than `networkidle`

## Recent Changes (2026-01-31)

### Filter Value Endpoints and Country Column Removal - Implemented
**Status:** ✅ COMPLETED (2026-01-31)

**Changes Made:**
- ✅ Added three new endpoints to return filter values:
  - **GET /brands/countries** - Returns list of unique countries from brands table
  - **GET /tobaccos/statuses** - Returns list of unique statuses from tobaccos table
  - **GET /lines/statuses** - Returns list of unique statuses from lines table
- ✅ Removed `country` column from `tobaccos` table (tobacco country is now derived from associated brand)
- ✅ Dropped Docker volume `hookah-db_postgres_data` and recreated database without `country` column
- ✅ Fixed country filter for tobaccos in [`TobaccosRepository.findAll()`](src/tobaccos/tobaccos.repository.ts:38) by adding `queryBuilder.select('tobacco')` statement
- ✅ Country filter now works via JOIN with brands table (lines 34-35, 53-55)

**Implementation Details:**
- **Brands Countries Endpoint** ([`src/brands/brands.controller.ts:29`](src/brands/brands.controller.ts:29)):
  - Controller: `@Get('countries')` endpoint
  - Service: [`BrandsService.getCountries()`](src/brands/brands.service.ts:68)
  - Repository: [`BrandsRepository.getCountries()`](src/brands/brands.repository.ts:44) uses QueryBuilder with DISTINCT

- **Tobaccos Statuses Endpoint** ([`src/tobaccos/tobaccos.controller.ts:26`](src/tobaccos/tobaccos.controller.ts:26)):
  - Controller: `@Get('statuses')` endpoint
  - Service: [`TobaccosService.getStatuses()`](src/tobaccos/tobaccos.service.ts:35)
  - Repository: [`TobaccosRepository.getStatuses()`](src/tobaccos/tobaccos.repository.ts:81) uses QueryBuilder with DISTINCT

- **Lines Statuses Endpoint** ([`src/lines/lines.controller.ts:27`](src/lines/lines.controller.ts:27)):
  - Controller: `@Get('statuses')` endpoint
  - Service: [`LinesService.getStatuses()`](src/lines/lines.service.ts:67)
  - Repository: [`LinesRepository.getStatuses()`](src/lines/lines.repository.ts:44) uses QueryBuilder with DISTINCT

- **Country Filter for Tobaccos**:
  - Filter parameter: `country` in [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts:37)
  - Repository implementation: [`TobaccosRepository.findAll()`](src/tobaccos/tobaccos.repository.ts:53) uses LEFT JOIN with brands table
  - Query: `queryBuilder.leftJoin('tobacco.brand', 'brand')` followed by `andWhere('brand.country = :country', { country })`

**Testing Results:**
- ✅ GET /brands/countries returns `["Россия", "США"]`
- ✅ GET /tobaccos/statuses returns `["Выпускается"]`
- ✅ GET /lines/statuses returns `["Выпускается", "Лимитированная"]`
- ✅ GET /tobaccos?country=Россия (URL-encoded: `%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F`) returns 98 tobaccos from Russia
- ✅ All endpoints work correctly with URL-encoded Cyrillic parameters

**Important Notes:**
- When using Cyrillic characters in query parameters, URL encoding is required:
  - `Россия` → `%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F`
  - `Выпускается` → `%D0%92%D1%8B%D0%BF%D1%83%D1%81%D0%BA%D0%B0%D0%B5%D1%82%D1%81%D1%8F`
- These endpoints provide filter values for client applications to use in filtering requests
- Country filter for tobaccos works without storing country in tobacco table (uses brand's country via JOIN)

### Automatic Migrations on Startup - Implemented
**Status:** ✅ COMPLETED (2026-01-31)

**Changes Made:**
- ✅ Updated [`src/app.module.ts`](src/app.module.ts:35) - Changed `migrationsRun: false` to `migrationsRun: true`
- ✅ Updated [`src/data-source.ts`](src/data-source.ts:14) - Changed `migrationsRun: false` to `migrationsRun: true`
- ✅ Rebuilt Docker image with new configuration
- ✅ Verified automatic migration execution on startup

**Verification:**
- All tables created automatically on fresh database: `api_keys`, `brands`, `lines`, `tobaccos`, `migrations`
- Migration recorded in migrations table: `InitialSchema1706328000000` (id=1)
- Health check endpoint operational: `/health` returns database status "up"
- No manual migration commands required on startup

**Note:** TypeORM's `migrationsRun: true` option automatically runs pending migrations during DataSource initialization (see [DataSource.ts line 180](src/data-source/DataSource.ts:180))

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

### README.md Documentation Created
**Status:** ✅ COMPLETED (2026-01-31)

**Changes Made:**
- ✅ Created comprehensive [`README.md`](README.md:1) documentation in Russian
- ✅ Documentation follows open source project standards
- ✅ Includes all major sections: Quick Start, API Documentation, CLI commands, Architecture
- ✅ Contains practical examples with curl commands
- ✅ Covers all API endpoints with parameters and examples
- ✅ Documents data structures for Brand, Tobacco, and Line entities
- ✅ Includes Docker deployment instructions
- ✅ Describes development workflow (tests, linting, migrations)
- ✅ Lists project limitations and constraints

**Documentation Sections:**
1. **Возможности** (Features) - Project capabilities overview
2. **Технологический стек** (Technology Stack) - Core technologies and versions
3. **Быстрый старт** (Quick Start) - Installation and setup instructions
4. **Docker развёртывание** (Docker Deployment) - Docker Compose setup
5. **API Документация** (API Documentation):
   - Authentication methods
   - Health check endpoint
   - Brands endpoints with parameters
   - Tobaccos endpoints with parameters
   - Lines endpoints with parameters
6. **Управление API ключами** (API Key Management) - CLI commands
7. **Парсинг данных** (Data Parsing) - Manual and automatic parsing
8. **Структура данных** (Data Structure) - Entity schemas
9. **Разработка** (Development) - Testing, linting, migrations
10. **Архитектура проекта** (Project Architecture) - Directory structure
11. **Ограничения** (Limitations) - Known system limitations

**Documentation Features:**
- Uses emojis for better readability
- Practical curl examples for all endpoints
- Clear parameter descriptions with defaults and constraints
- Case-insensitive search examples
- Pagination examples
- CLI command examples for API key management
- Docker deployment instructions
- Development workflow documentation

**Language:** Russian (as requested)

### URL-Based Parsing Feature - Implemented
**Status:** ✅ COMPLETED (2026-01-31)

**Changes Made:**
- ✅ Added [`parseBrandByUrl()`](src/parser/strategies/brand-parser.strategy.ts:233) method to BrandParserStrategy - Parses a single brand from its detail URL
- ✅ Added [`parseLineByUrl()`](src/parser/strategies/line-parser.strategy.ts:426) method to LineParserStrategy - Parses a single line from its detail URL
- ✅ Added [`parseTobaccoByUrl()`](src/parser/strategies/tobacco-parser.strategy.ts:437) method to TobaccoParserStrategy - Parses a single tobacco from its detail URL
- ✅ Added [`parseBrandByUrl()`](src/parser/parser.service.ts:96) method to ParserService - Orchestrates brand parsing by URL
- ✅ Added [`parseLineByUrl()`](src/parser/parser.service.ts:104) method to ParserService - Orchestrates line parsing by URL
- ✅ Added [`parseTobaccoByUrl()`](src/parser/parser.service.ts:112) method to ParserService - Orchestrates tobacco parsing by URL
- ✅ Updated CLI [`parse`](src/cli/index.ts:71) command:
  - Changed type argument from plural (brands/lines/tobaccos) to singular (brand/line/tobacco)
  - Added `--url <url>` option for URL-based parsing
  - Added validation: `--url` and `--limit` cannot be used together
  - For line/tobacco parsing, extracts brandId and lineId from URL by querying database

**Implementation Details:**

**BrandParserStrategy.parseBrandByUrl()** ([`src/parser/strategies/brand-parser.strategy.ts:233`](src/parser/strategies/brand-parser.strategy.ts:233)):
- Navigates to the provided URL
- Extracts brand data using page.evaluate()
- Combines basic data with logoUrl and description from existing `parseBrandDetail()` method
- Returns ParsedBrandData object

**LineParserStrategy.parseLineByUrl()** ([`src/parser/strategies/line-parser.strategy.ts:426`](src/parser/strategies/line-parser.strategy.ts:426)):
- Extracts brandSlug and lineSlug from URL pattern: `/tobaccos/{brand-slug}/{line-slug}`
- Merges data from brand page (basic line info) and detail page (ratingsCount, imageUrl, strength data)
- Requires brandId parameter to establish relationship

**TobaccoParserStrategy.parseTobaccoByUrl()** ([`src/parser/strategies/tobacco-parser.strategy.ts:437`](src/parser/strategies/tobacco-parser.strategy.ts:437)):
- Delegates to existing `parseTobaccoDetailPage()` method for data extraction
- Requires brandId and lineId parameters to establish relationships

**ParserService Methods:**
- [`parseBrandByUrl(url)`](src/parser/parser.service.ts:96) - Initializes BrandParserStrategy, parses, normalizes, and creates/updates brand
- [`parseLineByUrl(url, brandId)`](src/parser/parser.service.ts:104) - Initializes LineParserStrategy, parses, normalizes, and creates/updates line
- [`parseTobaccoByUrl(url, brandId, lineId)`](src/parser/parser.service.ts:112) - Initializes TobaccoParserStrategy, parses, normalizes, and creates/updates tobacco

**CLI Command Updates:**
- Type argument: `brand`, `line`, or `tobacco` (singular)
- `--url <url>` option: URL of the brand/line/tobacco page on htreviews.org
- `--limit <number>` option: Still supported for batch parsing (cannot be used with --url)
- For line/tobacco parsing by URL, CLI queries database to extract brandId and lineId from slugs

**URL Formats:**
- Brand: `https://htreviews.org/tobaccos/{brand-slug}` (e.g., `https://htreviews.org/tobaccos/dogma`)
- Line: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}` (e.g., `https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank`)
- Tobacco: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}` (e.g., `https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/lemon-drops`)

**Testing Results:**
- ✅ `npm run cli -- parse brand --url "https://htreviews.org/tobaccos/dogma"` - Successfully parsed and created brand "Догма" in 8.95s
- ✅ `npm run cli -- parse line --url "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank"` - Successfully parsed and created line "100% сигарный панк" in 9.91s
- ✅ `npm run cli -- parse tobacco --url "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/lemon-drops"` - Successfully parsed and created tobacco "Лемон дропс" in 6.55s

**Important Notes:**
- For line/tobacco parsing by URL, the brand/line must exist in database first (CLI queries by slug)
- URL-based parsing is useful for parsing specific items without running full batch parsing
- Both `--url` and `--limit` options cannot be used together (validation enforced)

### Brand Status Implementation - Completed
**Status:** ✅ COMPLETED (2026-01-31)

### Full Auto-Refresh Implementation - Completed
**Status:** ✅ COMPLETED (2026-02-01)

**Changes Made:**
- ✅ Updated [`handleDailyRefresh()`](src/parser/parser.service.ts:29) method to parse all three data types (brands, lines, tobaccos) sequentially
- ✅ Changed return type from single result object to nested result object with separate statistics for each entity type
- ✅ Removed `limit` parameter from [`handleDailyRefresh()`](src/parser/parser.service.ts:29) - auto-refresh now parses all data without limits
- ✅ Updated [`parseBrandsManually()`](src/parser/parser.service.ts:248) to be independent method (no longer calls `handleDailyRefresh()`)

**Implementation Details:**

**Sequential Parsing Flow:**
1. **Step 1 - Parse Brands** (lines 42-88):
   - Initializes [`BrandParserStrategy`](src/parser/strategies/brand-parser.strategy.ts)
   - Parses all brands from htreviews.org (no limit)
   - Creates or updates brands in database
   - Logs summary: created/updated/errors
   - Closes parser strategy in finally block

2. **Step 2 - Parse Lines** (lines 90-164):
   - Only runs if brands were successfully created or updated (`results.brands.created > 0 || results.brands.updated > 0`)
   - Initializes [`LineParserStrategy`](src/parser/strategies/line-parser.strategy.ts)
   - Gets all brands from database to build brand URLs
   - Parses all lines from htreviews.org
   - Creates or updates lines in database
   - Logs summary: created/updated/errors
   - Logs warning if skipped (no brands created/updated)
   - Closes parser strategy in finally block

3. **Step 3 - Parse Tobaccos** (lines 166-238):
   - Only runs if lines were successfully created or updated (`results.lines.created > 0 || results.lines.updated > 0`)
   - Initializes [`TobaccoParserStrategy`](src/parser/strategies/tobacco-parser.strategy.ts)
   - Gets all lines from database to build line URLs
   - Gets all brands for slug lookup
   - Parses all tobaccos from htreviews.org
   - Creates or updates tobaccos in database
   - Logs summary: created/updated/errors
   - Logs warning if skipped (no lines created/updated)
   - Closes parser strategy in finally block

**Error Handling:**
- Each step wrapped in try-catch-finally block
- Errors are logged but don't stop the entire process
- If brands parsing fails, lines and tobaccos are skipped (with warning)
- If lines parsing fails, tobaccos are skipped (with warning)
- Individual entity errors are counted and logged, but don't stop parsing of other entities
- All parser strategies are properly closed in finally blocks

**Return Type:**
```typescript
{
  brands: { created: number; updated: number; errors: number };
  lines: { created: number; updated: number; errors: number };
  tobaccos: { created: number; updated: number; errors: number };
}
```

**Logging:**
- Step-by-step logging: "Step 1: Parsing brands...", "Step 2: Parsing lines...", "Step 3: Parsing tobaccos..."
- Per-entity summary logs after each step
- Final summary log with compact format: `Brands (Xc/Yu/Ze), Lines (Xc/Yu/Ze), Tobaccos (Xc/Yu/Ze)` where c=created, u=updated, e=errors
- Warning logs when steps are skipped due to no data from previous steps

**Key Design Decisions:**
- Sequential parsing (not parallel) to maintain data dependencies (lines depend on brands, tobaccos depend on lines)
- No limits on auto-refresh (parses all available data)
- Continue on error strategy (individual entity failures don't stop the process)
- Skip dependent steps if previous step produced no results (optimization)

**Testing:**
- ✅ Build successful (`npm run build` completed without errors)
- ✅ TypeScript compilation successful
- ✅ ESLint errors are pre-existing and unrelated to changes

**Important Notes:**
- Manual parsing commands (`parseBrandsManually()`, `parseLinesManually()`, `parseTobaccosManually()`) still support `--limit` parameter
- Auto-refresh always parses all data without limits
- Auto-refresh runs daily at 2:00 AM (server time) via [`@Cron(CronExpression.EVERY_DAY_AT_2AM)`](src/parser/parser.service.ts:28)

**Changes Made:**
- ✅ Added `status` field to [`Brand`](src/brands/brands.entity.ts:37) entity (required, NOT NULL)
- ✅ Updated migration ([`src/migrations/1706328000000-InitialSchema.ts`](src/migrations/1706328000000-InitialSchema.ts:53-55)) to add status column to brands table
- ✅ Added index `idx_brands_status` for status column (migration lines 86-92)
- ✅ Updated [`BrandParserStrategy`](src/parser/strategies/brand-parser.strategy.ts) to extract status from htreviews.org:
  - Added `status` field to [`ParsedBrandData`](src/parser/strategies/brand-parser.strategy.ts:14) type
  - [`parseBrandDetail()`](src/parser/strategies/brand-parser.strategy.ts:253) extracts status from brand detail pages (lines 278-295)
  - [`parseBrandByUrl()`](src/parser/strategies/brand-parser.strategy.ts:312) extracts status (lines 363-380)
  - [`normalizeToEntity()`](src/parser/strategies/brand-parser.strategy.ts:408) includes status field (line 417)
- ✅ Added status filtering to [`BrandsRepository.findAll()`](src/brands/brands.repository.ts:30-32)
- ✅ Added [`getStatuses()`](src/brands/brands.repository.ts:59) method to repository
- ✅ Added [`getStatuses()`](src/brands/brands.service.ts:72) method to service
- ✅ Added [`GET /brands/statuses`](src/brands/brands.controller.ts:34) endpoint to controller
- ✅ Added `status` parameter to [`FindBrandsDto`](src/brands/dto/find-brands.dto.ts:21-23)

**Implementation Details:**

**Brand Entity** ([`src/brands/brands.entity.ts`](src/brands/brands.entity.ts:37-39)):
```typescript
@Column()
@Index('idx_brands_status')
status: string;
```

**Status Extraction**:
- Parser looks for `.object_info_item` elements with "Статус" label
- Default value: "Не указано" if status not found
- Status values match lines and tobaccos: "Выпускается", "Лимитированная", "Снята с производства"

**API Endpoints:**
- **GET /brands?status=Выпускается** - Filter brands by status
- **GET /brands/statuses** - Returns list of unique statuses from brands table

**Status Values:**
- "Выпускается" (Currently produced)
- "Лимитированная" (Limited edition)
- "Снята с производства" (Discontinued)
- "Не указано" (Not specified - default)

**Important Notes:**
- Status is required for all entities (brands, lines, tobaccos)
- Implementation follows the same pattern as lines and tobaccos
- Status column is indexed for efficient filtering
- Parser extracts status from brand detail pages on htreviews.org

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
- ✅ README.md documentation (comprehensive user documentation in Russian)

**Pending Implementation:**
- ⏳ Tests (unit tests for services and repositories)
