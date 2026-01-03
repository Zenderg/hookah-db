# Technology Stack

## Core Technologies

### Runtime & Language
- **Node.js**: JavaScript runtime for server-side execution
- **TypeScript**: Superset of JavaScript for type safety and better developer experience

### Package Management
- **pnpm**: Fast, disk space efficient package manager (preferred over npm/yarn)

### Web Scraping
- **Cheerio**: Fast, flexible, and lean implementation of core jQuery for server-side HTML parsing
- **axios** or **node-fetch**: HTTP client for fetching HTML pages from htreviews.org

### API Framework (Decision Pending)
**Options under consideration**:
- **Express.js**: Mature, widely-used, extensive middleware ecosystem
- **Fastify**: High performance, schema-based validation, lower overhead

**Decision criteria**:
- Performance requirements
- Middleware availability
- Community support
- Learning curve

### Authentication & Security
- **API Key Middleware**: Custom middleware for X-API-Key header validation
- **Helmet**: Security headers for Express.js
- **Rate Limiting**: 
  - **express-rate-limit** (if using Express)
  - **@fastify/rate-limit** (if using Fastify)

### Caching
**Primary (In-Memory)**:
- **Node-cache** or **lru-cache**: Simple in-memory caching for development/small deployments

**Optional (Production)**:
- **Redis**: Distributed caching for production environments with multiple instances
- **ioredis**: High-performance Redis client for Node.js

### Data Validation
- **Zod**: TypeScript-first schema validation for API requests/responses
- **Joi** (alternative): Object schema validation

### Utilities
- **date-fns**: Modern date utility library
- **lodash**: Utility library for data manipulation (optional, may use native JS methods)

### Testing
- **Jest**: JavaScript testing framework with built-in assertions, mocking, and coverage
- **Supertest**: HTTP assertion library for testing Node.js HTTP servers
- **ts-node**: TypeScript execution environment for testing

### Development Tools
- **ts-node**: TypeScript execution and REPL
- **nodemon**: Automatically restart server on file changes during development
- **eslint**: Linting utility for JavaScript/TypeScript
- **prettier**: Code formatter

### Documentation
- **Swagger/OpenAPI**: API specification and documentation
- **swagger-jsdoc**: Generate Swagger spec from JSDoc comments
- **swagger-ui-express**: Serve Swagger UI for interactive API documentation

## Development Setup

### Prerequisites
- Node.js (LTS version recommended, e.g., 22.x or 24.x)
- pnpm (install via `npm install -g pnpm`)
- Git

### Initial Setup Commands
```bash
# Initialize project
pnpm init

# Install TypeScript
pnpm add -D typescript @types/node

# Install dependencies
pnpm add cheerio axios express
pnpm add -D @types/express

# Install development tools
pnpm add -D nodemon ts-node jest @types/jest ts-jest supertest
```

### TypeScript Configuration
- **tsconfig.json**: TypeScript compiler configuration
- **Strict mode**: Enabled for maximum type safety
- **Target**: ES2024 or newer
- **Module system**: CommonJS or ESNext (depending on Node.js version)

## Project Structure

### Directory Organization
```
src/
├── api/              # API layer
├── cache/            # Caching implementations
├── models/           # TypeScript interfaces/types
├── parser/           # Data parsing logic
├── scraper/          # Web scraping logic
├── services/         # Business logic
└── utils/            # Utility functions
```

### Build Process
- **Development**: Use `ts-node` for direct TypeScript execution
- **Production**: Compile TypeScript to JavaScript using `tsc`
- **Watch mode**: `nodemon` with `ts-node` for development

## Technical Constraints

### Performance Requirements
- API response time: <200ms (average)
- Cache hit rate: >90%
- Scraping interval: At least 24 hours between full scrapes

### Scalability Considerations
- Support up to 10 authorized API clients
- Handle 100+ brands with 10,000+ flavors
- Rate limiting: ~100 requests/minute per client

### Resource Limits
- Memory usage: <500MB for in-memory cache
- Network bandwidth: Minimal (only scraping htreviews.org)
- CPU usage: Low (scraping is I/O bound)

### External Dependencies
- **htreviews.org**: Must be respectful of server resources
  - Implement delays between requests
  - Respect robots.txt
  - Cache responses aggressively
  - Handle rate limiting gracefully

## Tool Usage Patterns

### Web Scraping
- Use Cheerio for HTML parsing
- Implement retry logic for failed requests
- Add user-agent headers to identify scraper
- Parse incrementally (brands → lines → flavors)

### Error Handling
- Try-catch blocks around all I/O operations
- Graceful degradation when scraping fails
- Log errors with appropriate severity levels
- Return cached data when fresh data unavailable

### Caching Strategy
- Cache brand and flavor data separately
- Implement TTL (Time To Live) for cache entries
- Invalidate cache on successful scrape
- Fallback to stale cache if scrape fails

### API Design
- RESTful conventions for endpoints
- Consistent JSON response format
- Proper HTTP status codes
- Pagination for large datasets
- Filtering and sorting capabilities

## Environment Variables

### Required Variables
- `PORT`: Server port (default: 3000)
- `HTREVIEWS_BASE_URL`: Base URL for htreviews.org (default: https://htreviews.org)
- `CACHE_TTL`: Cache time-to-live in seconds (default: 86400)

### Optional Variables
- `REDIS_URL`: Redis connection string (if using Redis)
- `RATE_LIMIT_WINDOW`: Rate limit time window in milliseconds (default: 60000)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)
- `LOG_LEVEL`: Logging level (default: info)

### API Keys
- Store in `.env` file (not committed to git)
- Format: `API_KEY_<CLIENT_NAME>=<key>`
- Example: `API_KEY_CLIENT1=abc123def456`

## Deployment Considerations

### Development
- Use `nodemon` for hot-reloading
- Run with `ts-node` for TypeScript support
- Local caching (in-memory)

### Production
- Compile TypeScript to JavaScript
- Use process manager (PM2, systemd)
- Consider Redis for distributed caching
- Implement proper logging (winston, pino)
- Set up health check endpoints
- Configure reverse proxy (nginx, Apache)

### Monitoring
- Track API response times
- Monitor cache hit rates
- Log scraping errors
- Track rate limit violations
- Monitor server resources (CPU, memory, disk)
