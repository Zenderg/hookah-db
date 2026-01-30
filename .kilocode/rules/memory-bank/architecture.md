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
│  │              SQLite Database                          │  │
│  │  - Brands                                            │  │
│  │  - Tobaccos                                          │  │
│  │  - Lines                                             │  │
│  │  - API Keys                                          │  │
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
  createdAt: Date
  updatedAt: Date
}
```

**Note**: Slug and name are now required fields. Slug is extracted from the brand detail URL (format: `/tobaccos/{slug}`) and stored for use in line and tobacco parsing. The reviewsCount and views columns have been removed as they were not being parsed or used.

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
  country: string
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
- Removed fields: nameRu, nameEn (replaced with single `name`), reviewsCount, views, category, flavorDescriptors, dateAdded, year, tier, productionStatus
- Added fields: slug, imageUrl, description
- Renamed: productionStatus → status
- Fixed: strengthByRatings type from `decimal` to `string` (critical bug)
- All fields are now required except lineId and description (nullable)
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
- Query params: `?page=1&limit=20&sortBy=rating&order=desc&country=Russia`
- Returns: Paginated list of brands
- Filtering: by country
- Sorting: by rating, name

**GET /brands/:id**
- Returns: Single brand details

**GET /brands/:id/tobaccos**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc`
- Returns: Paginated list of tobaccos for brand

### Tobaccos

**GET /tobaccos**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc&brandId=xxx&lineId=xxx&category=fruity&minRating=4&maxRating=5`
- Returns: Paginated list of tobaccos
- Filtering: by brandId, lineId, category, rating range, year, country, productionStatus
- Sorting: by rating, views, dateAdded, name

**GET /tobaccos/:id**
- Returns: Single tobacco details

### Lines

**GET /lines**
- Query params: `?page=1&limit=20&brandId=xxx`
- Returns: Paginated list of lines
- Filtering: by brandId

**GET /lines/:id**
- Returns: Single line details

**GET /lines/:id/tobaccos**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc`
- Returns: Paginated list of tobaccos for line

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

**Tobaccos** ([`src/tobaccos/dto/find-tobaccos.dto.ts`](src/tobaccos/dto/find-tobaccos.dto.ts)):
- [`FindTobaccosDto`](src/tobaccos/dto/find-tobaccos.dto.ts:5) - Extends PaginationDto with:
  - `sortBy`: 'rating' | 'views' | 'dateAdded' | 'name' (default: 'rating')
  - `order`: 'asc' | 'desc' (default: 'desc')
  - `brandId`: Optional UUID filter
  - `lineId`: Optional UUID filter
  - `category`: Optional string filter
  - `minRating`/`maxRating`: Optional number range filter (0-5)
  - `year`: Optional number filter (≥2000)
  - `country`: Optional string filter
  - `productionStatus`: Optional 'active' | 'discontinued' filter

**Lines** ([`src/lines/dto/find-lines.dto.ts`](src/lines/dto/find-lines.dto.ts)):
- [`FindLinesDto`](src/lines/dto/find-lines.dto.ts:5) - Extends PaginationDto with:
  - `brandId`: Optional UUID filter

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

### Filtering and Sorting

**Available filters:**
- `brandId`: Filter by brand UUID
- `lineId`: Filter by line UUID
- `category`: Filter by flavor category
- `minRating`, `maxRating`: Filter by rating range
- `year`: Filter by release year
- `country`: Filter by country of origin
- `productionStatus`: Filter by production status (active, discontinued)

**Available sort fields:**
- `rating`: Sort by rating
- `dateAdded`: Sort by date added to database
- `name`: Sort by name

**Pagination:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- Response includes: `data`, `meta` (total, page, limit, totalPages)

## Key Technical Decisions

### Database Choice
- **SQLite**: Chosen for simplicity and zero-configuration deployment
- Single file database, perfect for local server deployment
- Sufficient for expected data volume (~10,000 records)
- Easy backup and migration (single file copy)

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
- No limit on number of keys (despite architecture mentioning 10)
- Keys stored in plain text (not hashed)
- Request tracking per key for usage monitoring
- CLI uses NestJS ApplicationContext to access services

### Data Refresh
- **Cron Jobs**: Daily automatic refresh at 2:00 AM
- Parser service runs as scheduled task
- Incremental updates where possible
- Full refresh on first run or failure

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

### Caching
- Consider caching frequently accessed data
- Cache TTL based on data freshness requirements
- Can be added later if performance issues arise

### Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Efficient queries with LIMIT/OFFSET

### Connection Pooling
- SQLite doesn't need connection pooling
- Single connection per application instance

## Deployment Architecture

### Docker Compose Setup
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data  # SQLite database persistence
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Data Persistence
- SQLite database file stored in mounted volume
- Survives container restarts
- Easy backup by copying database file

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
- Migrate to PostgreSQL if data volume grows significantly
- Add Redis caching layer if needed
- Implement rate limiting if abuse detected
- Consider horizontal scaling with load balancer

## Known Limitations

1. **Single Database**: SQLite limits concurrent writes
2. **No Real-time Updates**: Daily refresh only
3. **Manual API Key Management**: No web UI for key management
4. **No Backup Automation**: Manual backup required
5. **Limited Monitoring**: Basic logging only, no metrics dashboard
6. **API Key Request Count Not Incrementing**: API key requestCount stays at 0 despite multiple API requests (bug logged for future fix)
7. **Brands Country Filter Issue**: Filtering by country returns empty results, possibly due to encoding issue with Cyrillic characters (bug logged for future fix)
