# Project Context

## Current State

**Status:** Brand and Line entity schemas updated - logoUrl and multiple Line fields are now required, slug field added to Line entity. Migration 1706328000007 executed to enforce required fields.

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
- `data/` - Directory for SQLite database persistence (mounted volume)

## Recent Changes

**2026-01-29:** Brand and Line entity schemas updated - multiple fields made required
- **Problem**: Brand and Line entities had several nullable fields that should be required for data integrity
- **Root cause**: Fields like logoUrl, brandId, imageUrl, rating, ratingsCount, strengthOfficial, strengthByRatings, and status were nullable but should always have values
- **Solution**: Created migration to make these fields required (non-nullable)
- Created migration [`src/migrations/1706328000007-MakeBrandAndLineFieldsRequired.ts`](src/migrations/1706328000007-MakeBrandAndLineFieldsRequired.ts) to:
  - **Brand table**: Make `logoUrl` column non-nullable
  - **Line table**: Make `slug`, `brandId`, `imageUrl`, `rating`, `ratingsCount`, `strengthOfficial`, `strengthByRatings`, and `status` columns non-nullable
  - Add index `idx_lines_slug` for faster lookups
  - Add foreign key constraint `fk_lines_brand` with CASCADE delete
  - Includes reversible `down()` method for rollback
- Successfully executed migration to update database schema
- **CRITICAL ISSUE**: Entity files still show some fields as nullable despite migration making them required:
  - [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts:35-36): `imageUrl` is still nullable (line 35-36) - should be non-nullable
  - [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts:44-51): `strengthOfficial`, `strengthByRatings`, and `status` are still nullable (lines 44-51) - should be non-nullable
  - [`src/brands/brands.entity.ts`](src/brands/brands.entity.ts:34-35): `logoUrl` is correctly non-nullable (line 34-35) - matches migration
  - [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts:21-26): `slug` and `brandId` are correctly non-nullable (lines 21-26) - match migration
  - [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts:38-42): `rating` and `ratingsCount` are correctly non-nullable (lines 38-42) - match migration
- **Next steps**: Update [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts) to remove `nullable: true` from imageUrl, strengthOfficial, strengthByRatings, and status columns to match migration

**2026-01-28:** Brand schema updated - slug and name are now required fields
- **Problem**: Brand entity had nullable slug field and unnecessary reviewsCount/views columns that were not being parsed
- **Root cause**: Slug is required for line and tobacco parsing, and reviewsCount/views were not being used
- **Solution**: Made slug and name required fields, removed reviewsCount and views columns
- Created migration [`src/migrations/1706328000006-MakeSlugRequiredAndDropBrandColumns.ts`](src/migrations/1706328000006-MakeSlugRequiredAndDropBrandColumns.ts) to:
  - Update existing brands with empty strings for null slugs
  - Make `slug` column non-nullable
  - Drop `reviewsCount` column
  - Drop `views` column
  - Includes reversible `down()` method for rollback
- Successfully executed migration to update database schema
- Updated [`src/brands/brands.entity.ts`](src/brands/brands.entity.ts) to:
  - Remove `nullable: true` from slug column (line 18)
  - Remove `reviewsCount` column (lines 31-32)
  - Remove `views` column (lines 34-35)
- Updated [`src/brands/dto/find-brands.dto.ts`](src/brands/dto/find-brands.dto.ts:7) to remove `'views'` from sortBy options (now only `'rating' | 'name'`)
- Application compiles successfully with no TypeScript errors
- Tested brand parser with `--limit 3` - successfully parsed and updated 3 brands (Догма, Bonche, Satyr)
- Verified database schema: slug is NOT NULL, reviewsCount and views columns removed
- All brands now have slug values populated (dogma, bonche, satyr)

**2026-01-28:** Brand slug field added for line and tobacco parsing
- **Problem**: Brand parser was not storing slug field needed to construct URLs for line and tobacco parsing
- **Root cause**: Parser was using a `slugify()` helper method to generate slugs from brand names instead of extracting actual slugs from URLs
- **Solution**: Added slug field to Brand entity and updated parser to extract and store actual slugs from detail URLs
- Created migration [`src/migrations/1706328000005-AddSlugToBrand.ts`](src/migrations/1706328000005-AddSlugToBrand.ts) to add `slug` column to Brand entity:
  - `slug` (varchar, nullable) - URL slug extracted from htreviews.org (e.g., "dogma")
  - Added index: `idx_brands_slug` for faster lookups
- Successfully executed migration to update database schema
- Updated [`src/brands/brands.entity.ts`](src/brands/brands.entity.ts) to include `slug` field with index
- Updated [`src/parser/strategies/brand-parser.strategy.ts`](src/parser/strategies/brand-parser.strategy.ts):
  - Added `slug` to [`ParsedBrandData`](src/parser/strategies/brand-parser.strategy.ts:5) type
  - Updated [`parseBrandList`](src/parser/strategies/brand-parser.strategy.ts:98) to extract slug from detailUrl using regex pattern `/\/tobaccos\/([^\/?]+)/`
  - Updated [`normalizeToEntity`](src/parser/strategies/brand-parser.strategy.ts:249) to include slug in entity data
- Updated [`src/parser/parser.service.ts`](src/parser/parser.service.ts):
  - Modified [`parseLinesManually`](src/parser/parser.service.ts:102) to filter brands by slug existence and use stored slugs instead of generating them
  - Removed `slugify()` helper method as it's no longer needed
  - Added logging to show number of brands with slugs being parsed
- Application compiles successfully with no TypeScript errors
- **Note**: Existing brands in database don't have slugs - need to re-parse brands to populate slug field before line parsing will work correctly
- **Next steps**: Re-parse brands to populate slug field, then test line parsing

**2026-01-28:** Line parser implementation
- Created migration [`src/migrations/1706328000004-AddLineFields.ts`](src/migrations/1706328000004-AddLineFields.ts) to add new fields to Line entity:
  - `strengthOfficial` (varchar, nullable)
  - `strengthByRatings` (varchar, nullable)
  - `status` (varchar, nullable)
  - `rating` (decimal, nullable)
  - `ratingsCount` (integer, nullable)
  - Added indexes: idx_lines_rating, idx_lines_status, idx_lines_strength
- Successfully executed migration to update database schema
- Updated [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts) to include all new fields
- Created [`src/parser/strategies/line-parser.strategy.ts`](src/parser/strategies/line-parser.strategy.ts) with:
  - Playwright browser initialization and cleanup
  - Two-phase parsing approach:
    - Phase 1: Parse brand detail pages to extract line data
    - Phase 2: Extract line details from each line item
  - Data extraction based on text patterns (rating, ratings count, description, strength, status)
  - Error handling that continues parsing on individual line failures
  - Data normalization to Line entity format
  - Helper methods for extracting strength and status values
- Updated [`src/parser/parser.service.ts`](src/parser/parser.service.ts) with:
  - Import of Line entity and LineParserStrategy
  - Injection of lineRepository and lineParserStrategy
  - New [`parseLinesManually(limit?: number)`](src/parser/parser.service.ts:98) method for manual line parsing
  - Database operations to update existing lines (not just insert new ones)
  - Comprehensive logging with progress tracking (created, updated, error counts)
  - Error handling that logs failures but continues processing
  - Helper method [`slugify()`](src/parser/parser.service.ts:175) for generating brand slugs from names
- Updated [`src/parser/parser.module.ts`](src/parser/module.ts) to:
  - Import Line entity
  - Register LineParserStrategy as provider
  - Add Line to TypeOrmModule.forFeature imports
- Updated [`src/cli/index.ts`](src/cli/index.ts) to support line parsing:
  - Modified `lines` case in parse command to call [`service.parseLinesManually(limit)`](src/parser/parser.service.ts:98)
  - Removed "not implemented yet" error message
- Application compiles successfully with no TypeScript errors
- **Note**: Parser selectors based on specification may need adjustment for actual htreviews.org HTML structure - testing postponed to next step

**2026-01-27:** Brand parser fixed - CSS selectors updated for actual website structure
- **Problem**: Brand parser was returning 0 brands when running CLI command `npm run cli -- parse brands --limit 5`
- **Root cause**: Parser was using `data-testid` CSS selectors (e.g., `[data-testid="brand-item"]`, `[data-testid="brand-name"]`) which don't exist on htreviews.org
- **Solution**: Updated [`src/parser/strategies/brand-parser.strategy.ts`](src/parser/strategies/brand-parser.strategy.ts) to use correct class-based selectors:
  - Changed list item selector from `[data-testid="brand-item"]` to `.tobacco_list_item`
  - Updated [`parseBrandList`](src/parser/strategies/brand-parser.strategy.ts:98) method to find div children and extract data based on text patterns:
    - Rating: Decimal pattern `/^\d+\.\d+$/` (e.g., 4.5)
    - Ratings count: 3-5 digit pattern `/^\d{3,5}$/` (e.g., 3271)
    - Description: Long text (>50 chars) containing brand/tobacco keywords
  - Updated [`parseBrandDetail`](src/parser/strategies/brand-parser.strategy.ts:217) method to use class-based selectors:
    - Logo: `.brand-header img, .brand img`
    - Description: `p.description, .brand-description, .tobacco_list_item_description`
- **Verification**: Successfully parsed 5 brands (Догма, Bonche, Satyr, Kraken, World Tobacco Original) with all required fields in 48.69 seconds
- **Key learning**: Always verify actual HTML structure using Playwright before implementing selectors - specification-based selectors may not match reality

**2026-01-27:** CLI parse command with limit support for manual testing
- Updated [`src/parser/parser.service.ts`](src/parser/parser.service.ts:19) to support optional `limit` parameter in [`handleDailyRefresh`](src/parser/parser.service.ts:19) method
- Updated [`src/parser/parser.service.ts`](src/parser/parser.service.ts:93) to add [`parseBrandsManually(limit?: number)`](src/parser/parser.service.ts:93) method for manual parsing
- Updated [`src/parser/strategies/brand-parser.strategy.ts`](src/parser/strategies/brand-parser.strategy.ts:45) to support `limit` parameter in [`parseBrands`](src/parser/strategies/brand-parser.strategy.ts:45) method
- Updated [`src/parser/strategies/brand-parser.strategy.ts`](src/parser/strategies/brand-parser.strategy.ts:98) to support `limit` parameter in [`parseBrandList`](src/parser/strategies/brand-parser.strategy.ts:98) method
- Added CLI command [`parse`](src/cli/index.ts:121) to [`src/cli/index.ts`](src/cli/index.ts) with:
  - Subcommands for data types: `brands`, `lines`, `tobaccos`
  - `--limit <number>` option to restrict number of items to parse
  - Validation for limit parameter (must be positive number)
  - Progress tracking and execution time display
  - Statistics output (created, updated, errors)
- Updated [`src/app.module.ts`](src/app.module.ts:33) to import [`ParserModule`](src/parser/module.ts) for CLI access to ParserService
- CLI command tested successfully with `npm run cli -- parse brands --limit 5`
- Command completes in ~18 seconds and shows detailed statistics
- **Note**: Parser selectors based on specification may need adjustment for actual htreviews.org HTML structure

**2026-01-27:** Brand parser implementation
- Created migration [`src/migrations/1706328000003-AddLogoUrlToBrand.ts`](src/migrations/1706328000003-AddLogoUrlToBrand.ts) to add `logoUrl` field to Brand entity
- Updated [`src/brands/brands.entity.ts`](src/brands/brands.entity.ts:33) to include `logoUrl` column
- Successfully ran migration to update database schema
- Created [`src/parser/strategies/brand-parser.strategy.ts`](src/parser/strategies/brand-parser.strategy.ts) with:
  - Playwright browser initialization and cleanup
  - Two-phase parsing approach:
    - Phase 1: Parse brand list pages from both "Best Brands" and "All Other Brands" categories
    - Phase 2: Parse brand detail pages for logoUrl and full description
  - Infinite scroll handling with duplicate detection
  - Error handling that continues parsing on individual brand failures
  - Data normalization to Brand entity format
- Updated [`src/parser/parser.service.ts`](src/parser/parser.service.ts) with:
  - Cron job scheduled for daily execution at 2:00 AM
  - Database operations to update existing brands (not just insert new ones)
  - Comprehensive logging with progress tracking (created, updated, error counts)
  - Error handling that logs failures but continues processing
  - Manual parsing method available via `parseBrandsManually()`
- Updated [`src/parser/parser.module.ts`](src/parser/parser.module.ts) to:
  - Import TypeOrmModule for Brand entity
  - Register BrandParserStrategy as provider
  - Export ParserService for use by other modules
- Application builds successfully and all modules initialize correctly
- **Note**: Selectors used in parser (e.g., `[data-testid="brand-item"]`) are based on specification and may need adjustment if actual HTML structure of htreviews.org differs

**2026-01-27:** Entity schema fixes implemented
- Created migration [`src/migrations/1706328000001-AddImageUrlToLine.ts`](src/migrations/1706328000001-AddImageUrlToLine.ts) to add `imageUrl` field to Line entity
- Created migration [`src/migrations/1706328000002-FixTobaccoSchema.ts`](src/migrations/1706328000002-FixTobaccoSchema.ts) to fix Tobacco entity schema
- Updated [`src/lines/lines.entity.ts`](src/lines/lines.entity.ts:30) to include `imageUrl` field (nullable varchar)
- Updated [`src/tobaccos/tobaccos.entity.ts`](src/tobaccos/tobaccos.entity.ts) with corrected schema:
  - Replaced `nameRu` and `nameEn` with single `name` field
  - Fixed `strengthByRatings` type from decimal to string (critical bug fix)
  - Removed unused fields: `reviewsCount`, `views`, `category`, `flavorDescriptors`, `dateAdded`, `year`, `tier`, `productionStatus`
  - Renamed `productionStatus` to `status`
  - Added `imageUrl` and `description` fields
- Successfully executed both migrations to update database schema
- Verified database schema:
  - Lines table now includes `imageUrl` column
  - Tobaccos table has corrected schema with all required fields and proper types
- Entities now match architecture documentation and are ready for parser implementation

**2026-01-27:** Line image requirement added to documentation
- Used Playwright to verify that line detail pages on htreviews.org have images
- Confirmed that lines display product images on their detail pages (e.g., "100% сигарный панк" line has an image)
- Updated [`plans/line-parsing-spec.md`](plans/line-parsing-spec.md) to add `imageUrl` field to parsing specification:
  - Added `imageUrl` to "Fields to PARSE" table (nullable string field)
  - Updated all 5 data examples to include imageUrl field
  - Updated parsing strategy to mention extracting imageUrl from line detail pages
  - Updated "Database Schema Changes Required" section to include imageUrl
- Updated [`.kilocode/rules/memory-bank/architecture.md`](.kilocode/rules/memory-bank/architecture.md) Line entity to include imageUrl field
- **CRITICAL**: Line entity currently does NOT have imageUrl field - needs to be added via migration
- **Next steps**: Create migration to add imageUrl field to Line entity, implement parser to extract line images

**2026-01-27:** Tobacco parsing specification created
- Created [`plans/tobacco-parsing-spec.md`](plans/tobacco-parsing-spec.md) - Comprehensive specification for parsing Tobacco (Табаки) data from htreviews.org
- **IMPORTANT**: Files in `plans/` directory are temporary and should be deleted after implementation
- Tobacco structure analyzed using Playwright:
  - Expected scale: ~11,861 tobaccos total
  - Data parsed from tobacco detail pages
  - URL structure: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}`
- **Fields to PARSE** (12 total):
  - `name` - Tobacco name as displayed on website (can be Russian or English)
  - `brandId` - Foreign key to brands table (mapped from brand slug)
  - `lineId` - Foreign key to lines table (mapped from line slug, nullable)
  - `rating` - Average rating (0-5 scale)
  - `ratingsCount` - Number of ratings
  - `country` - Country of origin
  - `strengthOfficial` - Official strength rating (nullable): "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано"
  - `strengthByRatings` - Strength by user ratings (nullable): "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано"
  - `status` - Production status (nullable): "Выпускается", "Лимитированная", "Снята с производства"
  - `htreviewsId` - Unique identifier from htreviews.org (format: "htr" + numeric ID)
  - `imageUrl` - URL of tobacco product image
  - `description` - Detailed description of the tobacco
- **Fields to NOT PARSE**:
  - `reviewsCount` - Not required per user requirements
  - `views` - Not required per user requirements
  - `category` - Not required per user requirements
  - `flavorDescriptors` - Not required per user requirements
  - `dateAdded` - Not required per user requirements
  - `year` - Not available on website
  - `tier` - Not available on website
- **CRITICAL ISSUES**:
  - `strengthByRatings` field type mismatch: Entity defines as `decimal` but website stores as STRING. Must be fixed before implementation.
  - Entity cleanup needed: Remove 10 fields (nameRu, nameEn, reviewsCount, views, category, productionStatus, flavorDescriptors, dateAdded, year, tier) and add 2 new fields (imageUrl, description)
- **Parsing strategy**: Two-phase approach
  - Phase 1: Use already parsed brands and lines data
  - Phase 2: For each line, navigate to line detail page and extract tobacco list
  - Phase 3: For each tobacco, navigate to tobacco detail page and extract all 12 fields
- **Data examples**:
  - Dark Chocolate (Bonche - Основная): name="Темный шоколад", rating=4.7, ratingsCount=174, country="Россия", strengthOfficial="Крепкая", strengthByRatings="Средне-крепкая", status="Выпускается", htreviewsId="htr96739", imageUrl="https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp", description="Вкус темного шоколада."
  - Банан желтый (Dogma - 100% сигарный панк): name="Банан желтый", rating=4.4, ratingsCount=64, country="Россия", strengthOfficial="Средне-крепкая", strengthByRatings="Средняя", status="Выпускается", htreviewsId="htr198516", imageUrl="https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp", description="Какой мы хотели сделать банан? — Без травянистой ноты..."
- **Next steps**: Create database migration to fix strengthByRatings field type, remove unused fields, add imageUrl and description fields, implement parser using Playwright

**2026-01-27:** Line parsing specification created
- Created [`plans/brand-parsing-spec.md`](plans/brand-parsing-spec.md) - Comprehensive specification for parsing brand data from htreviews.org
- **IMPORTANT**: Files in `plans/` directory are temporary and should be deleted after implementation
- Brand structure analyzed using Playwright:
  - Two categories: "Лучшие" (~54 brands) and "Все остальные" (~218+ brands)
  - Total: ~272+ brands
  - Infinite scroll loading (no traditional pagination)
- **Fields to PARSE**: name, country, rating, ratingsCount, description, logoUrl
- **Fields to NOT PARSE**: website, yearFounded, status, dateAdded, reviewsCount, views
- **URL structure**:
  - Best brands: `https://htreviews.org/tobaccos/brands?r=position&s=rating&d=desc`
  - All other brands: `https://htreviews.org/tobaccos/brands?r=others&s=rating&d=desc`
- **Parsing strategy**: Two-phase approach - list page for basic data, detail pages for logoUrl and full description
- **Data examples**:
  - Догма: name="Догма", country="Россия", rating=4.5, ratingsCount=3266, logoUrl="https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp"
  - Lezzet: name="Lezzet", country="Россия", rating=5.0, ratingsCount=1, logoUrl="https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp"
- **Next steps**: Update Brand entity to add logoUrl field, implement parser using Playwright

**2026-01-27:** Global exception filter implementation
- Created [`src/common/filters/http-exception-filter.ts`](src/common/filters/http-exception-filter.ts):
  - Implements global exception filter using `@Catch()` decorator
  - Handles `HttpException` with proper status codes and messages
  - Handles unknown exceptions with `INTERNAL_SERVER_ERROR` status
  - Handles validation errors with custom status codes
  - Returns consistent JSON response format: `{ statusCode, timestamp, path, message }`
  - Logs all errors with stack traces for debugging
- Created [`src/common/filters/http-exception-filter.spec.ts`](src/common/filters/http-exception-filter.spec.ts):
  - Comprehensive unit tests for exception filter
  - Tests cover: HttpException handling, unknown exceptions, validation errors, timestamp formatting, and path extraction
  - All 6 tests pass successfully
- Updated [`src/app.module.ts`](src/app.module.ts):
  - Registered `HttpExceptionFilter` globally using `APP_FILTER` provider
  - Filter applies to all endpoints application-wide
- Design decisions documented:
  - Error response format: `{ statusCode, timestamp, path, message }`
  - Unknown exceptions return 500 status with "Internal server error" message
  - Validation errors preserve their original status codes
  - All errors logged with stack traces for debugging

**2026-01-27:** CLI commands implementation for API key management
- Updated [`src/api-keys/api-keys.repository.ts`](src/api-keys/api-keys.repository.ts):
  - Added [`delete(id)`](src/api-keys/api-keys.repository.ts:34) method for deleting API keys by ID
  - Added [`findOneById(id)`](src/api-keys/api-keys.repository.ts:39) method for finding API keys by ID
  - Added [`getCount()`](src/api-keys/api-keys.repository.ts:43) method for getting total count of API keys
- Updated [`src/api-keys/api-keys.service.ts`](src/api-keys/api-keys.service.ts):
  - Implemented [`createApiKey(name)`](src/api-keys/api-keys.service.ts:21) - Creates API key with UUID v4 format
  - Implemented [`deleteApiKey(id)`](src/api-keys/api-keys.service.ts:31) - Deletes API key with existence check
  - Implemented [`getStats()`](src/api-keys/api-keys.service.ts:39) - Returns statistics (totalKeys, activeKeys, inactiveKeys, totalRequests)
  - Updated [`validateApiKey(key)`](src/api-keys/api-keys.service.ts:53) - Now returns ApiKey object and increments request count
- Updated [`src/app.module.ts`](src/app.module.ts):
  - Added [`ApiKeysModule`](src/app.module.ts:29) to imports for CLI access to ApiKeysService
- Implemented [`src/cli/index.ts`](src/cli/index.ts) with four commands:
  - [`create <name>`](src/cli/index.ts:18) - Creates new API key with UUID
  - [`delete <id>`](src/cli/index.ts:46) - Deletes API key by ID
  - [`list`](src/cli/index.ts:61) - Lists all API keys with masked keys (first 8 + last 4 chars)
  - [`stats`](src/cli/index.ts:92) - Shows API key statistics
- All CLI commands tested successfully:
  - Create command generates UUID keys
  - List command masks keys for security
  - Delete command validates key existence
  - Stats command shows aggregated statistics
- Design decisions documented:
  - API keys use UUID v4 format (not hex)
  - No limit on number of keys (despite architecture mentioning 10)
  - Keys stored in plain text (not hashed)
  - Stats shows overall statistics for all keys

**2026-01-27:** DTOs implementation with validation, filtering, sorting, and pagination
- Created common DTOs in [`src/common/dto/pagination.dto.ts`](src/common/dto/pagination.dto.ts):
  - [`PaginationDto`](src/common/dto/pagination.dto.ts:6) - Base pagination with page (default: 1) and limit (default: 20, max: 100)
  - [`PaginationMetaDto`](src/common/dto/pagination.dto.ts:19) - Response metadata with total, page, limit, totalPages
  - [`PaginatedResponseDto<T>`](src/common/dto/pagination.dto.ts:24) - Generic wrapper for paginated responses
- Created brands DTO in [`src/brands/dto/find-brands.dto.ts`](src/brands/dto/find-brands.dto.ts):
  - [`FindBrandsDto`](src/brands/dto/find-brands.dto.ts:5) - Extends PaginationDto with sortBy (rating/views/name), order (asc/desc), and country filter
- Created tobaccos DTO in [`src/tobaccos/dto/find-tobaccos.dto.ts`](src/tobaccos/dto/find-tobaccos.dto.ts):
  - [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts:5) - Extends PaginationDto with comprehensive filters:
    - Sorting by rating, views, dateAdded, name
    - Filters: brandId, lineId, category, minRating, maxRating, year, country, productionStatus
- Created lines DTO in [`src/lines/dto/find-lines.dto.ts`](src/lines/dto/find-lines.dto.ts):
  - [`FindLinesDto`](src/lines/dto/find-lines.dto.ts:5) - Extends PaginationDto with brandId filter
- Updated repositories to use TypeORM QueryBuilder for dynamic filtering and pagination:
  - [`src/brands/brands.repository.ts`](src/brands/brands.repository.ts:14) - Implements country filtering and sorting
  - [`src/tobaccos/tobaccos.repository.ts`](src/tobaccos/tobaccos.repository.ts:14) - Implements comprehensive filtering with multiple conditions
  - [`src/lines/lines.repository.ts`](src/lines/lines.repository.ts:14) - Implements brandId filtering
- Updated services to accept query DTOs and return paginated responses:
  - [`src/brands/brands.service.ts`](src/brands/brands.service.ts:11) - Returns [`PaginatedResponseDto<Brand>`](src/brands/brands.service.ts:11)
  - [`src/tobaccos/tobaccos.service.ts`](src/tobaccos/tobaccos.service.ts:11) - Returns [`PaginatedResponseDto<Tobacco>`](src/tobaccos/tobaccos.service.ts:11)
  - [`src/lines/lines.service.ts`](src/lines/lines.service.ts:11) - Returns [`PaginatedResponseDto<Line>`](src/lines/lines.service.ts:11)
- Updated controllers to use `@Query()` decorator with DTOs:
  - [`src/brands/brands.controller.ts`](src/brands/brands.controller.ts:25) - Uses [`FindBrandsDto`](src/brands/brands.controller.ts:25)
  - [`src/tobaccos/tobaccos.controller.ts`](src/tobaccos/tobaccos.controller.ts:22) - Uses [`FindTobaccosDto`](src/tobaccos/tobaccos.controller.ts:22)
  - [`src/lines/lines.controller.ts`](src/lines/lines.controller.ts:22) - Uses [`FindLinesDto`](src/lines/lines.controller.ts:22)
- All DTOs use `class-validator` decorators for automatic validation:
  - `@IsOptional()`, `@IsString()`, `@IsNumber()`, `@IsUUID()`, `@IsIn()`, `@Min()`, `@Max()`
  - `@Type(() => Number)` for string-to-number transformation
- Application compiles successfully with no TypeScript errors
- API response format standardized to `{ data: [], meta: { total, page, limit, totalPages } }`

**2026-01-27:** TypeORM migrations setup
- Updated [`src/app.module.ts`](src/app.module.ts) to disable `synchronize` and configure migrations
- Created [`src/data-source.ts`](src/data-source.ts) for TypeORM CLI configuration
- Created initial migration [`src/migrations/1706328000000-InitialSchema.ts`](src/migrations/1706328000000-InitialSchema.ts):
  - Creates all tables: brands, lines, tobaccos, api_keys
  - Sets up foreign key relationships with CASCADE and SET NULL
  - Creates performance indexes on frequently queried columns
- Updated [`package.json`](package.json) with migration scripts:
  - `npm run typeorm` - Base TypeORM CLI command
  - `npm run migration:generate` - Generate new migration from entity changes
  - `npm run migration:run` - Run pending migrations
  - `npm run migration:revert` - Revert last migration
  - `npm run migration:show` - Show migration status
- Successfully executed initial migration
- Database file created at [`data/hookah.db`](data/hookah.db)
- All tables and indexes created successfully

**2026-01-26:** Dependency installation and verification
- Fixed dependency versions in package.json:
  - Updated @nestjs/common from ^11.0.1 to ^11.1.12 (latest stable)
  - Updated @nestjs/core from ^11.0.1 to ^11.1.12 (latest stable)
  - Updated @nestjs/platform-express from ^11.0.1 to ^11.1.12 (latest stable)
  - Updated @nestjs/typeorm from ^11.0.1 to ^11.0.0 (latest available)
- Successfully installed all 160 packages with npm install
- Verified application startup:
  - All NestJS modules initialized successfully (TypeOrmModule, ConfigModule, ScheduleModule, etc.)
  - Routes mapped correctly (GET / route)
  - Application starts without code errors
- Known issue: Port 3000 already in use by another process (application works correctly, just needs port configuration or process termination)

**2026-01-26:** Project structure initialization
- Initialized NestJS project with CLI
- Created complete modular architecture following memory bank specifications
- Set up all required directories and files
- Configured package.json with latest stable dependencies
- Added Docker configuration for local deployment
- Created environment configuration template
- Updated gitignore with comprehensive rules

**2026-01-27:** Health check endpoint implementation
- Installed [`@nestjs/terminus@11.0.0`](package.json) package for health check functionality
- Created [`src/health/health.module.ts`](src/health/health.module.ts) - Health module with Terminus integration
- Created [`src/health/health.controller.ts`](src/health/health.controller.ts) - Health controller with database connectivity check
- Updated [`src/app.module.ts`](src/app.module.ts) - Registered HealthModule in application imports
- Health endpoint tested successfully at `http://localhost:3000/health`
- Response format: `{ status: "ok", info: { database: { status: "up" } }, error: {}, details: { database: { status: "up" } }`
- Design decisions documented:
  - Endpoint is public (no API key required)
  - Only database connectivity check implemented (no memory, disk space, or external API checks)
  - Simple status response following Terminus standard format
  - Path: `/health` for monitoring and deployment verification

## Next Steps

### Immediate Actions
1. ✅ Install dependencies: Run `npm install` to install all packages - **COMPLETED**
2. ✅ Add DTOs: Create data transfer objects for request validation - **COMPLETED**
3. ✅ Fix entity schemas: Add imageUrl to Line, fix Tobacco entity schema - **COMPLETED**
4. ⏳ Update Line entity to match migration: Remove `nullable: true` from imageUrl, strengthOfficial, strengthByRatings, and status columns
5. ✅ Implement brand parser: Build Playwright parser for htreviews.org - **COMPLETED**
6. ✅ Add CLI commands: Implement create, delete, list, stats commands - **COMPLETED**
7. Write tests: Add unit and integration tests
8. Configure CORS: Set up proper CORS origins for production
9. ✅ Add error handling: Implement global exception filter - **COMPLETED**
10. ✅ Add health check: Create health endpoint for monitoring - **COMPLETED**
11. ✅ Run migrations: Set up TypeORM migrations - **COMPLETED**
12. ✅ Create tobacco parsing specification: Comprehensive specification for parsing tobacco data - **COMPLETED**
13. ✅ Implement line parser: Build Playwright parser for lines from htreviews.org - **COMPLETED**
14. ⏳ Implement tobacco parser: Build Playwright parser for tobaccos from htreviews.org

### Implementation Priority
1. ✅ Core infrastructure (NestJS setup, database, entities) - **COMPLETED**
2. Authentication system (API keys, middleware) - **STRUCTURE READY**
3. ✅ Brand parser (scraping htreviews.org) - **COMPLETED**
4. API endpoints (brands, tobaccos, lines) - **STRUCTURE READY**
5. ✅ Filtering and sorting logic - **COMPLETED**
6. ✅ Scheduled tasks for data refresh - **COMPLETED**
7. ✅ Docker deployment setup - **COMPLETED**
8. ✅ CLI commands for API key management - **COMPLETED**
9. ✅ Entity schema fixes (Line imageUrl, Tobacco schema) - **COMPLETED**
10. ⏳ Update Line entity to match migration 1706328000007
11. ⏳ Tobacco parser implementation

## Known Constraints

- No limit on API keys/clients (despite architecture mentioning 10)
- Daily data refresh schedule
- No user accounts or social features
- No admin panel or web UI
- Deployment on local server via Docker Compose
- Single database (SQLite)
- Simple authentication (API keys only)

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
- ✅ Entity schema fixes (Line imageUrl, Tobacco schema corrections)
- ✅ API key authentication guard
- ✅ Request/response logging interceptor
- ✅ Environment-based configuration
- ✅ Docker containerization
- ✅ CLI commands for API key management (create, delete, list, stats)
- ✅ Scheduled task structure for data refresh
- ✅ DTOs for validation with filtering, sorting, and pagination
- ✅ API endpoints with filtering/sorting (brands, tobaccos, lines)
- ✅ Global exception filter with consistent error responses
- ✅ Brand parser implementation (scraping htreviews.org)
- ✅ Line parser implementation (scraping htreviews.org)

**Pending Implementation:**
- ⏳ Update Line entity to match migration 1706328000007 (remove nullable from imageUrl, strengthOfficial, strengthByRatings, status)
- ⏳ Business logic in services (partially complete - repositories done)
- ⏳ Tobacco parser implementation
- ⏳ Tests
