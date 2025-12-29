# High-Level Architecture

## Monorepository Structure

The project is organized as a monorepository using pnpm workspaces. This approach allows multiple subprojects to coexist in a single repository while sharing dependencies and configuration.

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
├── scraper/          # Data scraping service
├── database/         # Database schemas and migrations
├── shared/           # Shared utilities and types
├── examples/         # HTML samples for testing
├── scripts/          # Utility scripts including key management
└── docs/             # Project documentation
```

## Deployment Architecture

### Production Environment

Production deployment uses docker-compose to orchestrate:

- **Backend Container**: Runs the API service in production mode
- **Scraper Container**: Executes scheduled scraping tasks
- **Database Container**: Persistent data storage
- **Network Configuration**: Inter-service communication

### Development Environment

Local development uses a separate docker-compose configuration:

- **Backend Container**: Runs in watch mode with hot-reload
- **Database Container**: Local database instance
- **Volume Mounts**: Live code synchronization
- **Debug Configuration**: Enhanced logging and debugging tools

## Configuration Management

Environment variables are defined centrally and shared across all services:

- **Database Connection**: Connection strings and credentials
- **External Service URLs**: Target URLs for scraping
- **API Settings**: Port numbers, timeouts, and limits
- **Security Settings**: Encryption keys and secrets

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
