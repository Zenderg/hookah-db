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
```

## Data Model

### Brand Entity

```typescript
{
  id: string (UUID)
  name: string
  country: string
  rating: number
  ratingsCount: number
  reviewsCount: number
  views: number
  description: string
  createdAt: Date
  updatedAt: Date
}
```

### Tobacco Entity

```typescript
{
  id: string (UUID)
  nameRu: string
  nameEn: string
  brandId: string (FK)
  lineId: string (FK, nullable)
  rating: number
  ratingsCount: number
  reviewsCount: number
  views: number
  category: string
  year: number
  country: string
  strengthOfficial: string
  strengthUser: number
  tier: string
  flavorDescriptors: string[]
  productionStatus: string
  htreviewsId: string
  dateAdded: Date
  createdAt: Date
  updatedAt: Date
}
```

### Line Entity

```typescript
{
  id: string (UUID)
  name: string
  brandId: string (FK)
  description: string
  createdAt: Date
  updatedAt: Date
}
```

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

### Brands

**GET /brands**
- Query params: `?page=1&limit=20&sortBy=rating&order=desc&country=Russia`
- Returns: Paginated list of brands
- Filtering: by country
- Sorting: by rating, views, name

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
  - `sortBy`: 'rating' | 'views' | 'name' (default: 'rating')
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
- `views`: Sort by view count
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
- **Decision pending**: Playwright vs Cheerio
- Playwright: Full browser automation, handles JavaScript-rendered content
- Cheerio: Fast, lightweight, HTML parsing only
- Final choice depends on htreviews.org page structure

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
- Frequently filtered fields indexed (rating, views, dateAdded)
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
