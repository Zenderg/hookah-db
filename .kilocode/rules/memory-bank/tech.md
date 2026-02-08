# Technology Stack

## Core Technologies

### Backend Framework
- **NestJS**: Progressive Node.js framework for building efficient, scalable applications
- Version: 11.1.12 (latest stable as of 2026-01-26)
- Rationale: Excellent TypeScript support, modular architecture, built-in dependency injection

### Package Manager
- **npm**: Node Package Manager
- Version: Latest stable
- Rationale: Standard package manager for Node.js projects

### Database
- **PostgreSQL 18.1**: Advanced open-source relational database
- Version: 18.1 (latest stable as of 2026-01-31)
- Rationale: Robust case-insensitive search with ILIKE, UTF-8 encoding for multi-language support, connection pooling, Docker Compose integration

### ORM
- **TypeORM**: TypeScript ORM for Node.js
- Version: 0.3.28 (latest stable)
- Rationale: TypeScript-native, excellent NestJS integration, decorator-based entity definitions

### Parser
- **Playwright**: Full browser automation, handles JavaScript-rendered content
- Version: 1.58.0
- **Status**: Implemented for Brand, Line, and Tobacco parsers
- **Decision**: Playwright selected over Cheerio for JavaScript-rendered content support

### Containerization
- **Docker**: Container platform
- **Docker Compose**: Multi-container orchestration
- Version: Latest stable
- Rationale: Consistent deployment, easy local server setup

## Development Tools

### Language
- **TypeScript**: JavaScript with static typing
- Version: Latest stable
- Rationale: Type safety, better developer experience, NestJS native support

### Testing
- **Jest**: JavaScript testing framework (included with NestJS)
- Version: Latest stable
- Rationale: Built-in NestJS support, comprehensive testing capabilities

### Code Quality
- **ESLint**: JavaScript/TypeScript linter
- **Prettier**: Code formatter
- Rationale: Consistent code style, catch errors early

## Dependencies

### Core Dependencies
- `@nestjs/common`: Core NestJS decorators and utilities (v11.1.12)
- `@nestjs/core`: NestJS core framework (v11.1.12)
- `@nestjs/platform-express`: Express platform adapter (v11.1.12)
- `@nestjs/typeorm`: TypeORM integration for NestJS (v11.0.0)
- `@nestjs/schedule`: Task scheduling (cron jobs) (v6.1.0)
- `@nestjs/config`: Configuration management (v4.0.0)
- `@nestjs/terminus`: Health check integration (v11.0.0)
- `typeorm`: ORM library (v0.3.28)
- `pg`: PostgreSQL database driver (latest stable) - **MIGRATED FROM sqlite3**
- `class-validator`: Request validation (v0.14.3)
- `class-transformer`: Object transformation (v0.5.1)
- `uuid`: UUID generation (v13.0.0)

### Parser Dependencies
- `playwright`: Browser automation (v1.58.0)
- Rationale: Handles JavaScript-rendered content, reliable scraping
- **Status**: Implemented for Brand, Line, and Tobacco parsers

### CLI Dependencies
- `commander`: CLI command framework (v14.0.0)
- Rationale: Easy CLI command creation for API key management

### Development Dependencies
- `@types/node`: TypeScript definitions for Node.js
- `@types/uuid`: TypeScript definitions for UUID
- `typescript`: TypeScript compiler
- `jest`: Testing framework
- `@nestjs/testing`: NestJS testing utilities
- `eslint`: Linter
- `prettier`: Code formatter

### Database Migrations
- `1706328000000-InitialSchema.ts`: Initial database schema (brands, lines, tobaccos, api_keys)
- `1738572000000-AddFullTextSearch.ts`: Added full-text search indexes for tobaccos
- `1738606800000-AddMultiLanguageFullTextSearch.ts`: Added multi-language full-text search (Russian + English)
- `1738700000000-AddFlavors.ts`: Added flavors table and many-to-many relationship with tobaccos

## Development Setup

### Prerequisites
- Node.js (LTS version)
- npm (comes with Node.js)
- Docker and Docker Compose
- Git

### Local Development
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables (if any)
4. Run development server: `npm run start:dev`
5. Run tests: `npm test`

### Docker Development
1. Start PostgreSQL service: `docker-compose up -d postgres`
2. Build and start all services: `docker-compose up -d`
3. View logs: `docker-compose logs -f`
4. Stop services: `docker-compose down`
5. View PostgreSQL logs: `docker-compose logs -f postgres`

## Environment Configuration

### Environment Variables
- `NODE_ENV`: Development/Production
- `PORT`: API port (default: 3000)
- `DATABASE_HOST`: PostgreSQL host (default: localhost)
- `DATABASE_PORT`: PostgreSQL port (default: 5432)
- `DATABASE_USERNAME`: PostgreSQL username (default: postgres)
- `DATABASE_PASSWORD`: PostgreSQL password (default: postgres)
- `DATABASE_NAME`: PostgreSQL database name (default: hookah_db)

### Configuration Management
- Use `@nestjs/config` for environment-based configuration
- Separate configs for development and production
- Sensitive data stored in environment variables, not committed to git

## Operational Constraints

### Deployment Environment
- Target: Local server via Docker Compose
- No cloud deployment required
- Single server deployment

### Performance Constraints
- Expected load: Low to medium (~10 clients)
- No specific performance requirements defined
- PostgreSQL sufficient for current scale

### Security Constraints
- API key authentication only
- No OAuth or JWT complexity
- No rate limiting (only request logging)
- No limit on number of API keys

### Scalability Constraints
- Single database instance (PostgreSQL)
- No horizontal scaling required
- No caching layer initially
- Can be enhanced later if needed

## Code Style Guidelines

### TypeScript Style
- Use strict type checking
- Prefer interfaces over types for object shapes
- Use decorators for NestJS components
- Follow NestJS best practices

### Naming Conventions
- Classes: PascalCase (e.g., `BrandsService`)
- Methods: camelCase (e.g., `findAllBrands`)
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case (e.g., `brands.service.ts`)

### File Organization
- Feature-based module structure
- Each module has its own directory
- Shared code in `common/` directory
- Clear separation of concerns (controllers, services, repositories)

## Git Workflow

### Branching Strategy
- `main`: Production code
- `develop`: Development branch
- Feature branches: `feature/feature-name`
- Bugfix branches: `bugfix/bug-description`

### Commit Message Format
- Conventional Commits format
- Examples:
  - `feat: add brand filtering endpoint`
  - `fix: resolve pagination issue`
  - `docs: update API documentation`

## Testing Strategy

### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Focus on business logic

### Integration Tests
- Test API endpoints
- Test database operations
- Use test database (separate from production)

### E2E Tests
- Test complete user flows
- Test parser functionality
- Test scheduled tasks

## Logging Strategy

### Log Levels
- ERROR: Critical errors
- WARN: Warning messages
- INFO: General information
- DEBUG: Detailed debugging information

### Log Format
- Structured JSON logging
- Include: timestamp, level, message, context, requestId
- Separate logs per module/service

### Log Rotation
- Configure log rotation in production
- Keep logs for 30 days
- Archive old logs

## Monitoring and Observability

### Health Checks
- `/health` endpoint for service health
- Database connection check
- Parser status check

### Metrics
- Request count per endpoint
- Request duration
- Error rate
- API key usage statistics

### Alerts
- Parser failures
- Database connection issues
- High error rates

## Backup and Recovery

### Database Backup
- PostgreSQL database backup using pg_dump
- Scheduled daily backups
- Manual backup before major changes
- Docker volume `postgres_data` provides automatic data persistence

### Recovery Procedure
- Stop service: `docker-compose down`
- Restore database from backup using pg_restore or psql
- Restart service: `docker-compose up -d`
- Verify data integrity

## Documentation

### API Documentation
- OpenAPI/Swagger specification
- Auto-generated from NestJS decorators
- Available at `/api` endpoint

### Code Documentation
- JSDoc comments for complex functions
- README files for each module
- Inline comments for non-obvious logic

### Deployment Documentation
- Docker Compose setup guide
- Environment configuration guide
- Troubleshooting guide

### User Documentation
- Comprehensive README.md in Russian
- Quick start guide for users
- API endpoint documentation with curl examples
- CLI command documentation
- Docker deployment instructions
- Development workflow documentation
