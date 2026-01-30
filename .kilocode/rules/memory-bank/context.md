# Project Context

## Current State

**Status:** All three parsers (Brand, Line, Tobacco) fully implemented and integrated. Entity schemas now match database migrations. All parsers have CLI commands available for manual testing.

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

### Implementation Priority
1. ✅ Core infrastructure (NestJS setup, database, entities) - **COMPLETED**
2. ✅ Authentication system (API keys, middleware) - **COMPLETED**
3. ✅ Brand parser (scraping htreviews.org) - **COMPLETED**
4. ✅ API endpoints (brands, tobaccos, lines) - **COMPLETED**
5. ✅ Filtering and sorting logic - **COMPLETED**
6. ✅ Scheduled tasks for data refresh - **COMPLETED**
7. ✅ Docker deployment setup - **COMPLETED**
8. ✅ CLI commands for API key management - **COMPLETED**
9. ✅ Entity schema fixes (Line imageUrl, Tobacco schema) - **COMPLETED**
10. ✅ Update Line entity to match migration 1706328000007 - **COMPLETED**
11. ✅ Tobacco parser implementation - **COMPLETED**
12. ✅ Business logic in services (tested via API requests) - **COMPLETED**

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
- ✅ Entity schema fixes (Line imageUrl, Tobacco schema corrections, Line entity nullable fields)
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
- ✅ Tobacco parser implementation (scraping htreviews.org)

**Pending Implementation:**
- ⏳ Tests (unit tests for services and repositories)
