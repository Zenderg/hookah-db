# Architecture

## System Architecture

The system follows a modular architecture with clear separation of concerns:

```mermaid
graph TB
    subgraph "External Sources"
        A[htreviews.org]
    end
    
    subgraph "Data Layer"
        B[Web Scraper]
        C[Data Parser]
        D[Cache Layer]
    end
    
    subgraph "API Layer"
        E[API Server]
        F[Authentication Middleware]
        G[Rate Limiting Middleware]
    end
    
    subgraph "Clients"
        H[Authorized API Clients]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    F --> E
    G --> E
    E --> H
    
    style A fill:#e1f5ff
    style H fill:#c8e6c9
```

## Source Code Structure

```
hookah-db/
├── apps/                  # Application packages
│   ├── api/               # REST API server
│   │   ├── src/
│   │   │   ├── server.ts  # Express server setup
│   │   │   ├── routes/    # API route definitions
│   │   │   ├── middleware/# Express middleware
│   │   │   └── controllers/# Request handlers
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/               # CLI application
│       ├── src/
│       │   └── index.ts   # CLI entry point
│       ├── package.json
│       └── tsconfig.json
├── packages/              # Shared packages
│   ├── types/             # TypeScript interfaces and types
│   │   ├── src/
│   │   │   ├── brand.ts   # Brand interface
│   │   │   ├── flavor.ts  # Flavor interface
│   │   │   ├── line.ts    # Line interface
│   │   │   ├── rating.ts  # RatingDistribution interface
│   │   │   └── index.ts   # Type exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── scraper/           # Web scraping module
│   │   ├── src/
│   │   │   └── index.ts   # Main scraper entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── parser/            # Data parsing and transformation
│   │   ├── src/
│   │   │   └── index.ts   # Data parser entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cache/             # Caching layer
│   │   ├── src/
│   │   │   └── index.ts   # Cache interface and implementations
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── services/          # Business logic
│   │   ├── src/
│   │   │   └── index.ts   # Service orchestration
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── utils/             # Utility functions
│   │   ├── src/
│   │   │   └── index.ts   # Utility functions
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── config/            # Shared configuration
│   │   └── package.json
│   └── tsconfig/          # Shared TypeScript configurations
│       ├── base.json      # Base TypeScript config
│       ├── node.json      # Node.js TypeScript config
│       └── package.json
├── examples/              # Example HTML files for reference
│   ├── htreviews.org_tobaccos_brands.html
│   ├── htreviews.org_tobaccos_sarma.html
│   └── htreviews.org_tobaccos_sarma_klassicheskaya_zima.html
├── tests/                 # Test files
│   ├── unit/
│   └── integration/
├── .kilocode/             # Kilo Code configuration
│   └── rules/
│       └── memory-bank/   # Memory bank files
├── pnpm-workspace.yaml    # pnpm workspace configuration
├── turbo.json             # Turborepo configuration
├── .npmrc                 # npm/pnpm configuration
├── package.json           # Root package.json
├── tsconfig.json          # Root TypeScript config
└── README.md
```

## Key Technical Decisions

### Data Models

Based on HTML structure analysis, the following data models are identified:

**Brand Model**:
- `slug`: Unique identifier (e.g., "sarma")
- `name`: Display name (e.g., "Сарма")
- `nameEn`: English name (e.g., "Sarma")
- `description`: Brand description
- `country`: Country of origin (e.g., "Россия")
- `website`: Official website URL
- `foundedYear`: Year of foundation
- `status`: Production status ("Выпускается", "Снят с производства")
- `imageUrl`: Brand logo URL
- `rating`: Average rating (1-5)
- `ratingsCount`: Number of ratings
- `reviewsCount`: Number of reviews
- `viewsCount`: Number of views
- `lines`: Array of Line objects
- `flavors`: Array of Flavor objects

**Line Model**:
- `slug`: Unique identifier (e.g., "klassicheskaya")
- `name`: Display name (e.g., "Классическая")
- `description`: Line description
- `strength`: Strength level (e.g., "Средняя", "Лёгкая", "Крепкая")
- `status`: Production status
- `flavorsCount`: Number of flavors in line
- `rating`: Average rating
- `brandSlug`: Parent brand slug

**Flavor Model**:
- `slug`: Unique identifier (e.g., "zima")
- `name`: Display name (e.g., "Зима")
- `nameAlt`: Alternative name (if any)
- `description`: Flavor description
- `brandSlug`: Parent brand slug
- `brandName`: Parent brand name
- `lineSlug`: Parent line slug
- `lineName`: Parent line name
- `country`: Country of origin
- `officialStrength`: Official strength level
- `userStrength`: User-rated strength level
- `status`: Production status
- `imageUrl`: Flavor image URL
- `tags`: Array of flavor tags (e.g., "Холодок")
- `rating`: Average rating (1-5)
- `ratingsCount`: Number of ratings
- `reviewsCount`: Number of reviews
- `viewsCount`: Number of views
- `ratingDistribution`: Distribution of ratings by score
- `smokeAgainPercentage`: Percentage who would smoke again
- `htreviewsId`: Internal HTReviews ID
- `dateAdded`: Date added to HTReviews
- `addedBy`: User who added the flavor

### Scraping Strategy

1. **Brand Discovery**: Scrape `/tobaccos/brands` page to discover all brands
2. **Brand Details**: For each brand, scrape brand detail page to get brand info and lines
3. **Flavor Discovery**: From brand pages, discover all flavors
4. **Flavor Details**: For each flavor, scrape flavor detail page to get complete data
5. **Incremental Updates**: Track last scrape timestamp to only update changed data

### Caching Strategy

- **In-Memory Cache**: Store frequently accessed data in memory for fast access
- **TTL**: Set appropriate time-to-live for cached data (e.g., 24 hours)
- **Cache Invalidation**: Invalidate cache when fresh data is scraped
- **Optional Redis**: For production, use Redis for distributed caching

### API Design

RESTful API with JSON responses:

```
GET /api/v1/brands
  Query params: page, limit, country, sort

GET /api/v1/brands/:slug
  Returns: Full brand details with lines and flavors

GET /api/v1/flavors
  Query params: page, limit, brandSlug, lineSlug, strength, tags, sort

GET /api/v1/flavors/:slug
  Returns: Full flavor details with reviews

GET /api/v1/brands/:brandSlug/flavors
  Query params: page, limit, lineSlug, sort

GET /health
  Returns: Health check status
```

### Authentication

- **API Keys**: Simple API key-based authentication
- **Header**: `X-API-Key: <key>`
- **Environment**: Store API keys in environment variables
- **Rate Limiting**: Per-key rate limits (e.g., 100 requests/minute)

## Component Relationships

```mermaid
graph LR
    Scraper[@hookah-db/scraper] --> Parser[@hookah-db/parser]
    Parser --> Types[@hookah-db/types]
    Parser --> Cache[@hookah-db/cache]
    Cache --> Services[@hookah-db/services]
    Services --> Controllers[API Controllers]
    Controllers --> Routes[API Routes]
    Routes --> Server[@hookah-db/api]
    Auth[Auth Middleware] --> Server
    RateLimit[Rate Limit Middleware] --> Server
```

## Critical Implementation Paths

1. **Scraping Path**: Fetch HTML → Parse with Cheerio → Extract data → Validate → Store in cache
2. **API Request Path**: Auth check → Rate limit check → Cache lookup → Return data or 404
3. **Cache Update Path**: Scrape complete data → Validate → Update cache → Set TTL

## Design Patterns

- **Repository Pattern**: Data access layer abstracts cache implementation
- **Factory Pattern**: Parser factory for different page types
- **Middleware Pattern**: Express/Fastify middleware for cross-cutting concerns
- **Strategy Pattern**: Different caching strategies (in-memory vs Redis)
- **Monorepo Pattern**: Shared packages organized by dependency layer

## Package Dependency Layers

```
Application Layer
├── @hookah-db/api (depends on: services, utils, config)
└── @hookah-db/cli (depends on: services, utils, config)

Business Layer
└── @hookah-db/services (depends on: scraper, parser, cache, types, utils)

Core Layer
├── @hookah-db/scraper (depends on: types, utils, config)
├── @hookah-db/parser (depends on: types, utils, config)
└── @hookah-db/cache (depends on: types, utils, config)

Utility Layer
├── @hookah-db/types (no dependencies)
├── @hookah-db/utils (depends on: types)
├── @hookah-db/config (no dependencies)
└── @hookah-db/tsconfig (no dependencies)
```
