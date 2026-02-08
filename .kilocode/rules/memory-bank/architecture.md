# Architecture

## System Architecture

The system follows a monolithic architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              NestJS Application                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Controllers  │→ │ Services     │→ │ Repositories│ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Middleware   │  │ Guards       │  │ Entities   │ │  │
│  │  │ (Auth)       │  │ (API Key)    │  │ (TypeORM)  │ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │         Scheduled Tasks (Cron)                │  │  │
│  │  │         - Daily data refresh                  │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PostgreSQL 18.1 Database                 │  │
│  │  - Brands (with case-insensitive search)             │  │
│  │  - Tobaccos (with case-insensitive search)          │  │
│  │  - Lines (with case-insensitive search)             │  │
│  │  - API Keys                                          │  │
│  │  - UTF-8 encoding for multi-language support        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Source Code Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── common/                 # Shared utilities
│   ├── guards/             # Auth guards (API key)
│   ├── middleware/         # Auth middleware
│   ├── decorators/         # Custom decorators
│   ├── interceptors/       # Logging interceptor
│   ├── filters/            # Global exception filters
│   │   └── http-exception-filter.ts  # Global exception filter
│   └── dto/               # Shared DTOs
│       └── pagination.dto.ts  # Pagination base classes
├── brands/                 # Brand module
│   ├── brands.controller.ts
│   ├── brands.service.ts
│   ├── brands.repository.ts
│   ├── brands.entity.ts
│   ├── brands.module.ts
│   └── dto/               # Request/response DTOs
│       └── find-brands.dto.ts
├── tobaccos/               # Tobacco module
│   ├── tobaccos.controller.ts
│   ├── tobaccos.service.ts
│   ├── tobaccos.repository.ts
│   ├── tobaccos.entity.ts
│   ├── tobaccos.module.ts
│   └── dto/               # Request/response DTOs
│       └── find-tobaccos.dto.ts
├── lines/                  # Line module
│   ├── lines.controller.ts
│   ├── lines.service.ts
│   ├── lines.repository.ts
│   ├── lines.entity.ts
│   ├── lines.module.ts
│   └── dto/               # Request/response DTOs
│       └── find-lines.dto.ts
├── flavors/                # Flavor module
│   ├── flavors.controller.ts
│   ├── flavors.service.ts
│   ├── flavors.repository.ts
│   ├── flavors.entity.ts
│   └── flavors.module.ts
├── auth/                   # Authentication module
│   ├── auth.guard.ts
│   ├── auth.middleware.ts
│   └── auth.module.ts
├── parser/                 # Parser module
│   ├── parser.service.ts
│   ├── parser.module.ts
│   └── strategies/         # Parser strategies (Playwright/Cheerio)
├── api-keys/               # API key management
│   ├── api-keys.entity.ts
│   ├── api-keys.service.ts
│   ├── api-keys.repository.ts
│   └── api-keys.module.ts
└── cli/                    # CLI commands
    └── index.ts             # CLI entry point with Commander.js
└── health/                  # Health check module
    ├── health.module.ts      # Health module configuration
    └── health.controller.ts  # Health check endpoint
```

## Data Model

### Brand Entity

```typescript
{
  id: string (UUID)
  name: string (required)
  slug: string (required) - URL slug extracted from htreviews.org (e.g., "dogma")
  country: string
  rating: number
  ratingsCount: number
  description: string
  logoUrl: string
  status: string (required) - "Выпускается", "Лимитированная", "Снята с производства", "Не указано"
  createdAt: Date
  updatedAt: Date
}
```

**Note**: Slug and name are now required fields. Slug is extracted from the brand detail URL (format: `/tobaccos/{slug}`) and stored for use in line and tobacco parsing. The reviewsCount and views columns have been removed as they were not being parsed or used. Status is required (2026-01-31) and follows the same pattern as lines and tobaccos.

### Tobacco Entity

```typescript
{
  id: string (UUID)
  name: string (can be Russian or English)
  slug: string (required) - URL slug extracted from htreviews.org
  brandId: string (FK)
  lineId: string (FK, nullable)
  rating: number
  ratingsCount: number
  strengthOfficial: string (required) - "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано"
  strengthByRatings: string (required) - "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано", "Мало оценок"
  status: string (required) - "Выпускается", "Лимитированная", "Снята с производства"
  htreviewsId: string (unique)
  imageUrl: string - URL of tobacco product image
  description: text - Detailed tobacco description
  createdAt: Date
  updatedAt: Date
}
```

**Note**: Entity schema has been corrected via migration (2026-01-27):
- Removed fields: nameRu, nameEn (replaced with single `name`), reviewsCount, views, category, flavorDescriptors, dateAdded, year, tier, productionStatus, **country**
- Added fields: slug, imageUrl, description
- Renamed: productionStatus → status
- Fixed: strengthByRatings type from `decimal` to `string` (critical bug)
- All fields are now required except lineId and description (nullable)
- **Country removed (2026-01-31)**: Tobacco country is now derived from associated brand via JOIN query
- Migration: [`src/migrations/1706328000000-InitialSchema.ts`](src/migrations/1706328000000-InitialSchema.ts)

### Line Entity

```typescript
{
  id: string (UUID)
  name: string
  slug: string (required) - URL slug extracted from htreviews.org (e.g., "100-sigarnyy-pank")
  brandId: string (FK, required)
  description: string
  imageUrl: string (required) - URL of line product image
  rating: number (required)
  ratingsCount: number (required)
  strengthOfficial: string (required) - "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано"
  strengthByRatings: string (required) - "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано", "Мало оценок"
  status: string (required) - "Выпускается", "Лимитированная", "Снята с производства"
  createdAt: Date
  updatedAt: Date
}
```

**Note**: Slug, brandId, imageUrl, rating, ratingsCount, strengthOfficial, strengthByRatings, and status are required fields per migration 1706328000000 (InitialSchema). Entity has been updated to match migration schema - all required fields are now non-nullable. Status: ✅ VERIFIED

### Flavor Entity

```typescript
{
  id: string (UUID)
  name: string (unique)
  tobaccos: Tobacco[] (many-to-many relationship)
  createdAt: Date
  updatedAt: Date
}
```

**Note**: Flavor entity has a many-to-many relationship with Tobacco via the `tobacco_flavors` junction table. Migration: [`src/migrations/1738700000000-AddFlavors.ts`](src/migrations/1738700000000-AddFlavors.ts). Status: ✅ VERIFIED (2026-02-08)

### API Key Entity

```typescript
{
  id: string (UUID)
  key: string (unique)
  name: string
  isActive: boolean
  requestCount: number
  lastUsedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

## API Endpoints

### Authentication
All endpoints require API key authentication via:
- Header: `X-API-Key: <key>`
- OR Header: `Authorization: Bearer <key>`

### Health

**GET /health**
- Returns: Health check status
- Authentication: Public (no API key required)
- Response format:
  ```json
  {
    "status": "ok",
    "info": {
      "database": {
        "status": "up"
      }
    },
    "error": {},
    "details": {
      "database": {
        "status": "up"
      }
    }
  }
  ```

### Brands

**GET /brands**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc&country=Russia&status=Выпускается&search=dogma`
- Returns: Paginated list of brands
- Filtering: by country, status, case-insensitive name search (ILIKE, partial match)
- Sorting: by rating, name
- Search: `search` parameter performs case-insensitive partial match on brand name (works with both Latin and Cyrillic characters)

**GET /brands/countries**
- Returns: List of unique countries from brands table
- Authentication: Required (API key)
- Response format: `["Россия", "США"]`
- Used by client applications to populate country filter dropdowns

**GET /brands/statuses**
- Returns: List of unique statuses from brands table
- Authentication: Required (API key)
- Response format: `["Выпускается", "Лимитированная", "Снята с производства"]`
- Used by client applications to populate status filter dropdowns

**GET /brands/:id**
- Returns: Single brand details

**GET /brands/:id/tobaccos**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc`
- Returns: Paginated list of tobaccos for brand

### Tobaccos

**GET /tobaccos**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc&brandId=xxx&lineId=xxx&minRating=4&maxRating=5&country=Russia&status=Выпускается&flavors=cola,cherry&search=tobacco`
- Returns: Paginated list of tobaccos
- Filtering: by brandId, lineId, rating range, country, status, flavors (AND logic), multi-language full-text search (PostgreSQL FTS with Russian + English configurations)
- Sorting: by rating, views, dateAdded, name, or relevance (when search is provided)
- Search: `search` parameter performs PostgreSQL Full-Text Search across tobacco.name, brand.name, and line.name with combined Russian and English configurations
  - Supports stemming (words in different forms): "кола" finds "колы", "колу", etc.
  - Supports stop-word removal for both Russian and English
  - Results sorted by relevance when search is provided
  - **Cross-field AND logic (2026-02-03):** For multi-word searches, each search word must match in at least one field (tobacco.name OR brand.name OR line.name)
  - Example: "кола darkside" finds "Cola" from "Darkside", "Кола" from "Darkside", etc.
  - Example: "vanilla sebero" finds vanilla tobacco from Sebero brand
- Flavors filter: `flavors` parameter (array of strings) filters tobaccos by flavors using AND logic - tobacco must have ALL specified flavors
- Country filter: Uses JOIN with brands table to filter by brand's country (tobacco table doesn't have country column)

**GET /tobaccos/statuses**
- Returns: List of unique statuses from tobaccos table
- Authentication: Required (API key)
- Response format: `["Выпускается"]`
- Used by client applications to populate status filter dropdowns

**GET /tobaccos/:id**
- Returns: Single tobacco details

**GET /tobaccos/by-url**
- Query params: `?url=https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}`
- Returns: Single tobacco details matching all three slugs
- Authentication: Required (API key)
- URL validation: Must match format `https://htreviews.org/tobaccos/{brand}/{line}/{tobacco}`
- Implementation: Extracts all three slugs from URL and joins with brands and lines tables for exact match
- Returns 404 if no tobacco matches the combination of brand, line, and tobacco slugs
- Example: `GET /tobaccos/by-url?url=https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/pushkin`

### Lines

**GET /lines**
- Query params: `?page=1&limit=20&brandId=xxx&search=line`
- Returns: Paginated list of lines
- Filtering: by brandId, case-insensitive name search (ILIKE, partial match)
- Search: `search` parameter performs case-insensitive partial match on line name (works with both Latin and Cyrillic characters)

**GET /lines/statuses**
- Returns: List of unique statuses from lines table
- Authentication: Required (API key)
- Response format: `["Выпускается", "Лимитированная"]`
- Used by client applications to populate status filter dropdowns

**GET /lines/:id**
- Returns: Single line details

**GET /lines/:id/tobaccos**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc`
- Returns: Paginated list of tobaccos for line

### Flavors

**GET /flavors**
- Returns: List of all flavors sorted by name (ASC)
- Authentication: Required (API key)
- Response format:
  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
  ```
- Used by client applications to populate flavor filter dropdowns
- Many-to-many relationship with tobaccos via `tobacco_flavors` junction table
- Migration: [`src/migrations/1738700000000-AddFlavors.ts`](src/migrations/1738700000000-AddFlavors.ts)

## DTOs and Validation

### Common DTOs
Located in [`src/common/dto/pagination.dto.ts`](src/common/dto/pagination.dto.ts):
- [`PaginationDto`](src/common/dto/pagination.dto.ts:6) - Base pagination class with `page` (default: 1) and `limit` (default: 20, max: 100)
- [`PaginationMetaDto`](src/common/dto/pagination.dto.ts:19) - Response metadata with total, page, limit, totalPages
- [`PaginatedResponseDto<T>`](src/common/dto/pagination.dto.ts:24) - Generic wrapper for paginated responses

### Feature DTOs

**Brands** ([`src/brands/dto/find-brands.dto.ts`](src/brands/dto/find-brands.dto.ts)):
- [`FindBrandsDto`](src/brands/dto/find-brands.dto.ts:5) - Extends PaginationDto with:
  - `sortBy`: 'rating' | 'name' (default: 'rating')
  - `order`: 'asc' | 'desc' (default: 'desc')
  - `country`: Optional string filter
  - `status`: Optional string filter (e.g., "Выпускается", "Лимитированная", "Снята с производства")
  - `search`: Optional string filter for case-insensitive partial match on brand name

**Tobaccos** ([`src/tobaccos/dto/find-tobaccos.dto.ts`](src/tobaccos/dto/find-tobaccos.dto.ts)):
- [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts:5) - Extends PaginationDto with:
  - `sortBy`: 'rating' | 'views' | 'dateAdded' | 'name' (default: 'rating')
  - `order`: 'asc' | 'desc' (default: 'desc')
  - `brandId`: Optional UUID filter
  - `lineId`: Optional UUID filter
  - `minRating`/`maxRating`: Optional number range filter (0-5)
  - `country`: Optional string filter
  - `status`: Optional string filter (e.g., "Выпускается", "Лимитированная", "Снята с производства")
  - `flavors`: Optional string array filter (AND logic - tobacco must have ALL specified flavors)
  - `search`: Optional string filter for case-insensitive partial match on tobacco name

**Note:** The following filters were removed as they don't exist in the Tobacco entity: `category`, `year`, `productionStatus` (replaced with `status`)

**Lines** ([`src/lines/dto/find-lines.dto.ts`](src/lines/dto/find-lines.dto.ts)):
- [`FindLinesDto`](src/lines/dto/find-lines.dto.ts:5) - Extends PaginationDto with:
  - `brandId`: Optional UUID filter
  - `search`: Optional string filter for case-insensitive partial match on line name

**Tobaccos by URL** ([`src/tobaccos/dto/find-tobacco-by-url.dto.ts`](src/tobaccos/dto/find-tobacco-by-url.dto.ts)):
- [`FindTobaccoByUrlDto`](src/tobaccos/dto/find-tobacco-by-url.dto.ts:3) - Validates URL format:
  - `url`: Required URL parameter
  - `@IsUrl()`: Validates that the parameter is a valid URL
  - `@Matches()`: Ensures URL matches pattern `https://htreviews.org/tobaccos/{brand}/{line}/{tobacco}`

### Validation Decorators
All DTOs use `class-validator` decorators for automatic validation:
- `@IsOptional()` - Marks parameters as optional
- `@IsString()`, `@IsNumber()`, `@IsUUID()` - Type validation
- `@IsIn()` - Enum value validation
- `@Min()`, `@Max()` - Range validation
- `@Type(() => Number)` - Transform string query params to numbers

### Repository Implementation
All repositories use TypeORM QueryBuilder for:
- Dynamic WHERE clause building based on provided filters
- Sorting with uppercase order ('ASC' | 'DESC')
- Pagination with skip/take
- Efficient `getManyAndCount()` for data + total count
- **Country filter fix (2026-01-31)**: [`TobaccosRepository`](src/tobaccos/tobaccos.repository.ts:38) now includes `queryBuilder.select('tobacco')` to ensure correct JOIN behavior with brands table for country filtering

### Filtering and Sorting

**Available filters:**
- `brandId`: Filter by brand UUID
- `lineId`: Filter by line UUID
- `minRating`, `maxRating`: Filter by rating range
- `country`: Filter by country of origin (for brands and tobaccos; for tobaccos uses JOIN with brands table)
- `status`: Filter by production status (e.g., "Выпускается", "Лимитированная", "Снята с производства")
- `search`: PostgreSQL Full-Text Search across tobacco.name, brand.name, and line.name with combined Russian and English configurations
  - Supports stemming (words in different forms): "кола" finds "колы", "колу", etc.
  - Supports stop-word removal for both Russian and English
  - Results sorted by relevance when search is provided
  - **Cross-field AND logic (2026-02-03):** For multi-word searches, each search word must match in at least one field (tobacco.name OR brand.name OR line.name)
  - Example: "кола darkside" finds "Cola" from "Darkside", "Кола" from "Darkside", etc.
  - Example: "vanilla sebero" finds vanilla tobacco from Sebero brand

**Note:** The following filters were removed as they don't exist in the Tobacco entity: `category`, `year`, `productionStatus` (replaced with `status`), **country** (removed 2026-01-31, now uses brand's country via JOIN)

**Available sort fields:**
- `rating`: Sort by rating
- `dateAdded`: Sort by date added to database
- `name`: Sort by name
- `relevance`: Sort by relevance (automatically used when search is provided, overrides sortBy parameter)

**Pagination:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- Response includes: `data`, `meta` (total, page, limit, totalPages)

## Key Technical Decisions

### Database Choice
- **PostgreSQL 18.1**: Chosen for robust case-insensitive search and multi-language support
- ILIKE operator provides case-insensitive search for both Latin and Cyrillic characters
- UTF-8 encoding ensures proper handling of Russian and other non-Latin text
- Full-Text Search with language-specific configurations (Russian, English) for advanced search capabilities
- GIN indexes for full-text search performance (6 indexes: 3 for Russian, 3 for English)
- Docker Compose integration for easy deployment and management
- Sufficient for expected data volume (~10,000 records)
- Connection pooling for better performance under concurrent load

### ORM Choice
- **TypeORM**: TypeScript-native ORM with excellent NestJS integration
- Supports decorators for entity definitions
- Built-in migrations support
- Active community and good documentation

### Parser Strategy
- **Playwright selected**: Full browser automation, handles JavaScript-rendered content
- **Brand parser implemented** with:
  - Two-phase parsing (list pages + detail pages)
  - Infinite scroll handling with duplicate detection
  - Error handling that continues parsing on individual brand failures
  - Data normalization to Brand entity format
  - **Correct CSS selectors**: Uses class-based selectors (`.tobacco_list_item`) instead of data-testid attributes
  - **Data extraction**: Uses text pattern matching for rating (decimal), ratings count (3-5 digits), and description (long text with keywords)
- **Line parser implemented** with:
  - Two-phase parsing (brand pages + line detail pages)
  - Extracts all line data from brand detail pages (name, slug, rating, status, description)
  - Extracts additional data from line detail pages (imageUrl, ratingsCount, strengthOfficial, strengthByRatings)
  - Error handling that continues parsing on individual line failures
  - Data normalization to Line entity format
  - **Correct CSS selectors**: Uses heading-based selectors to find "Линейки" section and line items
  - **Data extraction**: Uses text pattern matching for rating (decimal), status values, and description (long text)
- **Tobacco parser implemented** with:
  - Two-phase parsing (line pages + tobacco detail pages)
  - Extracts tobacco URLs from line detail pages with infinite scroll handling
  - Extracts all 12 required fields from tobacco detail pages (name, slug, brandId, lineId, rating, ratingsCount, country, strengthOfficial, strengthByRatings, status, htreviewsId, imageUrl, description)
  - Error handling that continues parsing on individual tobacco failures
  - Data normalization to Tobacco entity format
  - **CSS selectors**: Uses pattern matching for tobacco URLs (`/tobaccos/{brand}/{line}/{tobacco}`), element queries for data extraction
  - **Data extraction**: Uses text pattern matching for rating (decimal), ratings count, and field labels (Страна, Крепость официальная, Крепость по оценкам, Статус, HtreviewsID)
- **Cron Job**: Daily execution at 2:00 AM
- **Data Persistence**: Updates existing brands/lines/tobaccos by slug/htreviewsId, creates new ones
- **Selectors verified**: Tested against actual htreviews.org HTML structure using Playwright
- **Parser Testing (2026-01-31)**: All three parsers tested successfully with PostgreSQL 18.1:
  - Brand parser: 5 brands created (Догма, Bonche, Satyr, Kraken, World Tobacco Original)
  - Line parser: 3 lines created (100% сигарный панк, Сигарный моносорт, Сигарный парфюм)
  - Tobacco parser: 3 tobaccos created (Лемон дропс, Пушкин, Малиновый компот)
- **Parser Fix (2026-01-31)**: All three parser strategies updated to include `createdAt` and `updatedAt` fields in `normalizeToEntity()` methods to satisfy PostgreSQL not-null constraints:
  - [`BrandParserStrategy.normalizeToEntity()`](src/parser/strategies/brand-parser.strategy.ts:281)
  - [`LineParserStrategy.normalizeToEntity()`](src/parser/strategies/line-parser.strategy.ts:534)
  - [`TobaccoParserStrategy.normalizeToEntity()`](src/parser/strategies/tobacco-parser.strategy.ts:485)

### Authentication
- **API Key-based**: Simple, stateless authentication
- Keys stored in database for easy management
- Middleware-based validation before route handlers
- No OAuth or JWT complexity needed

### API Key Management
- **CLI Commands**: Executed via `npm run cli -- <command>`
- Commands:
  - `create <name>` - Creates new API key with UUID v4 format
  - `delete <id>` - Deletes API key by ID with existence check
  - `list` - Lists all API keys with masked keys (first 8 + last 4 chars)
  - `stats` - Shows overall statistics (totalKeys, activeKeys, inactiveKeys, totalRequests)
  - `parse <type> --url <url>` - Parses a single brand/line/tobacco by URL (new feature 2026-01-31)
  - `parse <type> --limit <number>` - Parses multiple brands/lines/tobaccos with limit
- No limit on number of keys (despite architecture mentioning 10)
- Keys stored in plain text (not hashed)
- Request tracking per key for usage monitoring
- CLI uses NestJS ApplicationContext to access services
- **Request Count Tracking:** Guard validates API key against database and increments `requestCount` on every authenticated request (fixed 2026-01-31)
- **URL-Based Parsing (2026-01-31):**
  - Type argument: `brand`, `line`, or `tobacco` (singular)
  - `--url <url>` option: URL of the brand/line/tobacco page on htreviews.org
  - For line/tobacco parsing by URL, CLI queries database to extract brandId and lineId from slugs
  - URL formats:
    - Brand: `https://htreviews.org/tobaccos/{brand-slug}`
    - Line: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}`
    - Tobacco: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}`
  - Both `--url` and `--limit` options cannot be used together (validation enforced)

### Data Refresh
- **Cron Jobs**: Daily automatic refresh at 2:00 AM
- Parser service runs as scheduled task
- **Sequential parsing**: Brands → Lines → Tobaccos (to maintain data dependencies)
- **Incremental updates where possible**: Updates existing entities by slug/htreviewsId, creates new ones
- **Full refresh on first run or failure**: Parses all data without limits
- **Error handling**: Continue on error strategy - individual entity failures don't stop the process
- **Skip dependent steps**: If brands parsing fails, lines and tobaccos are skipped; if lines parsing fails, tobaccos are skipped
- **Manual parsing**: CLI commands support `--limit` parameter for batch parsing with limits

### Error Handling
- Global exception filter for consistent error responses
- Implemented in [`src/common/filters/http-exception-filter.ts`](src/common/filters/http-exception-filter.ts)
- Registered globally in [`src/app.module.ts`](src/app.module.ts) using `APP_FILTER` provider
- Error response format: `{ statusCode, timestamp, path, message }`
- Handles `HttpException` with proper status codes and messages
- Handles unknown exceptions with `INTERNAL_SERVER_ERROR` status
- Handles validation errors with custom status codes
- Parser failures logged but don't crash the service
- API errors return standardized JSON format
- Detailed logging for debugging with stack traces

### Health Check
- Public endpoint for monitoring and deployment verification
- Implemented using `@nestjs/terminus` package (v11.0.0)
- Database connectivity check using `TypeOrmHealthIndicator`
- Endpoint path: `/health` (GET method)
- No API key authentication required
- Response format follows Terminus standard: `{ status, info, error, details }`
- Implemented in [`src/health/health.module.ts`](src/health/health.module.ts) and [`src/health/health.controller.ts`](src/health/health.controller.ts)

### Logging
- Request logging per API key
- Error logging with stack traces
- Parser execution logs
- Structured logging format (JSON)

## Design Patterns

### Repository Pattern
- Separates data access logic from business logic
- Each entity has dedicated repository
- Services use repositories for data operations

### Guard Pattern
- API key validation implemented as NestJS guards
- Reusable across all protected endpoints
- Easy to extend for additional authentication methods
- **Guard Implementation (2026-01-31):** [`ApiKeyGuard`](src/common/guards/api-key.guard.ts) now properly validates API keys against database and increments request count on every authenticated request
- Guard injects [`ApiKeysService`](src/api-keys/api-keys.service.ts) and calls [`validateApiKey()`](src/api-keys/api-keys.service.ts:53) method
- [`ApiKeysModule`](src/api-keys/api-keys.module.ts) is global with [`@Global()`](src/api-keys/api-keys.module.ts:7) decorator for availability across all modules
- [`APP_GUARD`](src/app.module.ts:50) registered in [`AppModule`](src/app.module.ts) for proper dependency resolution

### Service Layer Pattern
- Business logic encapsulated in services
- Controllers thin, focused on HTTP concerns
- Services can be reused across multiple controllers

### Strategy Pattern (Parser)
- Different parser implementations (Playwright, Cheerio)
- Easy to switch between strategies
- Can add new parsers without modifying existing code

## Security Considerations

### API Key Storage
- Keys stored in plain text in database (not hashed)
- Never logged in plain text in CLI (masked in list command)
- Secure generation using UUID v4

### Rate Limiting
- No explicit rate limiting (per user requirement)
- Only request logging for monitoring
- Can be added later if needed

### Input Validation
- All query parameters validated
- Type checking on all inputs
- Sanitization to prevent injection attacks

### CORS
- Configured for specific client domains
- Prevents unauthorized cross-origin requests

## Performance Considerations

### Database Indexing
- Foreign keys indexed
- Frequently filtered fields indexed (rating, dateAdded)
- Composite indexes for common query patterns
- GIN indexes for full-text search performance (6 indexes: 3 for Russian, 3 for English)
  - `idx_tobaccos_name_fulltext_ru` - Russian full-text search on tobacco.name
  - `idx_brands_name_fulltext_ru` - Russian full-text search on brand.name
  - `idx_lines_name_fulltext_ru` - Russian full-text search on line.name
  - `idx_tobaccos_name_fulltext_en` - English full-text search on tobacco.name
  - `idx_brands_name_fulltext_en` - English full-text search on brand.name
  - `idx_lines_name_fulltext_en` - English full-text search on line.name

### Caching
- Consider caching frequently accessed data
- Cache TTL based on data freshness requirements
- Can be added later if performance issues arise

### Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Efficient queries with LIMIT/OFFSET

### Connection Pooling
- PostgreSQL connection pooling configured via TypeORM
- Default pool size: 10 connections
- Supports concurrent writes without blocking
- Connection reuse for better performance

## Deployment Architecture

### Docker Compose Setup
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USERNAME=postgres
      - DATABASE_PASSWORD=postgres
      - DATABASE_NAME=hookah_db
    restart: unless-stopped

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
    restart: unless-stopped

volumes:
  postgres_data:
```

### Data Persistence
- PostgreSQL data stored in Docker volume
- Survives container restarts
- Easy backup using pg_dump or volume export

### Monitoring
- Application logs output to stdout/stderr
- Docker logs capture all output
- Can be viewed with `docker-compose logs -f`

## Scalability Considerations

### Current Scale
- ~100 brands
- ~10,000 tobaccos
- ~10 clients
- Low to medium load

### Future Scaling Options
- Add Redis caching layer if needed
- Implement rate limiting if abuse detected
- Consider horizontal scaling with load balancer
- Optimize database queries with proper indexing

## Known Limitations

1. **No Real-time Updates**: Daily refresh only
2. **Manual API Key Management**: No web UI for key management
3. **No Backup Automation**: Manual backup required
4. **Limited Monitoring**: Basic logging only, no metrics dashboard


