# High-Level Architecture

## Monorepository Structure

The project is organized as a monorepository using pnpm workspaces. This approach allows multiple subprojects to coexist in a single repository while sharing dependencies and configuration.

### Workspace Configuration

The workspace is configured in `pnpm-workspace.yaml` with 5 packages:
- `backend/` - Backend API service
- `scraper/` - Data scraping service
- `database/` - Database schemas and migrations
- `shared/` - Shared utilities and types
- `scripts/` - Utility scripts including key management

### TypeScript Configuration Strategy

TypeScript is configured at two levels:

**Root Configuration (`tsconfig.json`):**
- Contains shared compiler options for all packages
- Excludes output-related settings (each package manages its own output)
- Provides common path mappings and type checking rules

**Package-Level Configuration:**
- Each package has its own `tsconfig.json` extending the root configuration
- Packages define their own output directory and build settings
- Allows for different build targets per package

### Code Quality Tools

**ESLint Configuration (`.eslintrc.cjs`):**
- Configured as CommonJS module for ES module compatibility
- Shared across all workspace packages
- Enforces consistent code style and best practices

**Prettier Configuration (`.prettierrc`):**
- Shared formatting rules across the entire project
- Applied to all TypeScript and configuration files
- Ensures consistent code formatting

## Project Components

### Backend Service

The backend service is the core component responsible for:

- **HTTP Server**: Exposes REST API endpoints for client access
- **Authentication Middleware**: Validates API keys on incoming requests
- **Data Access Layer**: Interacts with the database to retrieve tobacco data
- **Request Processing**: Handles client queries and returns structured responses

### Scraper Service

The scraper service is responsible for:

- **HTTP Client**: Fetches HTML pages from htreviews.org
- **HTML Parser**: Extracts structured data from HTML documents
- **Data Normalization**: Transforms raw scraped data into consistent formats
- **Error Handling**: Manages network failures and parsing errors

### Database

The database stores:

- **Brands**: Tobacco brand information including names, descriptions, and images
- **Products**: Individual tobacco products linked to brands
- **API Keys**: Client authentication credentials
- **Metadata**: Tracking information for scraped data

### API Key Management

A standalone utility for:

- **Key Generation**: Creates new API keys for clients
- **Key Validation**: Verifies key format and integrity
- **Key Revocation**: Disables compromised or expired keys

## Directory Organization

```
/
├── backend/          # Backend API service
│   ├── src/          # Source code
│   ├── package.json  # Package dependencies
│   └── tsconfig.json # TypeScript configuration
├── scraper/          # Data scraping service
│   ├── src/          # Source code
│   ├── package.json  # Package dependencies
│   └── tsconfig.json # TypeScript configuration
├── database/         # Database schemas and migrations
│   ├── src/          # Source code
│   ├── package.json  # Package dependencies
│   └── tsconfig.json # TypeScript configuration
├── shared/           # Shared utilities and types
│   ├── src/          # Source code
│   ├── package.json  # Package dependencies
│   └── tsconfig.json # TypeScript configuration
├── scripts/          # Utility scripts including key management
│   ├── src/          # Source code
│   ├── package.json  # Package dependencies
│   └── tsconfig.json # TypeScript configuration
├── examples/         # HTML samples for testing
├── docs/             # Project documentation
├── package.json      # Root package with shared dependencies
├── pnpm-workspace.yaml # Workspace configuration
├── tsconfig.json     # Root TypeScript configuration
├── .eslintrc.cjs     # ESLint configuration (CommonJS)
├── .prettierrc       # Prettier configuration
├── .gitignore        # Git ignore rules
├── docker-compose.dev.yml  # Development Docker Compose
├── docker-compose.prod.yml # Production Docker Compose
├── .env.dev.example  # Development environment template
└── .env.prod.example # Production environment template
```

## Deployment Architecture

### Production Environment

Production deployment uses docker-compose to orchestrate:

- **Backend Container**: Runs the API service in production mode
- **Scraper Container**: Executes scheduled scraping tasks
- **Database Container**: Persistent data storage
- **Network Configuration**: Inter-service communication

**Configuration:**
- Docker Compose file: `docker-compose.prod.yml`
- Environment variables: `.env.prod.example` (template)
- No version attribute (Docker Compose v2+)

### Development Environment

Local development uses a separate docker-compose configuration:

- **Backend Container**: Runs in watch mode with hot-reload
- **Database Container**: Local database instance
- **Volume Mounts**: Live code synchronization
- **Debug Configuration**: Enhanced logging and debugging tools

**Configuration:**
- Docker Compose file: `docker-compose.dev.yml`
- Environment variables: `.env.dev.example` (template)
- No version attribute (Docker Compose v2+)

## Configuration Management

Environment variables are defined centrally and shared across all services:

- **Database Connection**: Connection strings and credentials
- **External Service URLs**: Target URLs for scraping
- **API Settings**: Port numbers, timeouts, and limits
- **Security Settings**: Encryption keys and secrets

### Environment Templates

Two environment variable templates are provided:

**Development (`.env.dev.example`):**
- Local database connection
- Debug logging enabled
- Relaxed security settings
- Hot-reload configuration

**Production (`.env.prod.example`):**
- Production database connection
- Production logging levels
- Strict security settings
- Optimized performance settings

## Cross-Cutting Concerns

### Logging

All services implement structured logging for:

- Request tracking and debugging
- Error monitoring and alerting
- Performance metrics collection

### Error Handling

Consistent error handling across services:

- Standardized error response formats
- Graceful degradation on failures
- Retry logic for transient errors

### Testing

Comprehensive test coverage across all components:

- Unit tests for individual functions
- Integration tests for service interactions
- End-to-end tests for complete workflows
