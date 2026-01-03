# Environment Variables Documentation

## Overview

This document describes all environment variables used across the Hookah Tobacco Database project. All environment variables are defined in a single `.env` file at the project root.

## Required Variables

### Database

```env
DATABASE_URL=file:./dev.db
```

**Description**: Connection string for SQLite database (development) or PostgreSQL database (production).

**Examples**:
- Development (SQLite): `file:./dev.db`
- Production (PostgreSQL): `postgresql://hookah_user:secure_password@db.example.com:5432/hookah_db`

**Notes**:
- For development, SQLite is used with a file-based connection string
- For production, PostgreSQL is used with full connection string
- Connection string format: `postgresql://[user[:password]@][host][:port][/dbname]`
- SQLite format: `file:[path/to/database.db]`

---

### API Server

```env
API_PORT=3000
API_HOST=0.0.0.0
```

**Description**: API server configuration.

**API_PORT**: Port number for the API server (default: 3000)
**API_HOST**: Host address to bind to (default: 0.0.0.0 for all interfaces)

---

### Parser

```env
PARSER_BASE_URL=https://htreviews.org
PARSER_CONCURRENT_REQUESTS=3
PARSER_SCROLL_DELAY_MS=1000
PARSER_MAX_RETRIES=3
PARSER_TIMEOUT_MS=30000
```

**Description**: Parser service configuration for fetching data from htreviews.org.

**PARSER_BASE_URL**: Base URL for htreviews.org (default: https://htreviews.org)
**PARSER_CONCURRENT_REQUESTS**: Maximum number of concurrent HTTP requests (default: 3)
**PARSER_SCROLL_DELAY_MS**: Delay between scroll requests in milliseconds (default: 1000)
**PARSER_MAX_RETRIES**: Maximum number of retry attempts for failed requests (default: 3)
**PARSER_TIMEOUT_MS**: Request timeout in milliseconds (default: 30000)

**Notes**:
- Be respectful to htreviews.org server with reasonable delays
- Lower concurrent requests to avoid overwhelming the server
- Increase timeout if experiencing network issues

---

### Logging

```env
LOG_LEVEL=info
LOG_FORMAT=json
```

**Description**: Application logging configuration.

**LOG_LEVEL**: Log level - `debug`, `info`, `warn`, `error` (default: info)
**LOG_FORMAT**: Log format - `json` or `pretty` (default: json)

**Notes**:
- Use `debug` for development to see detailed logs
- Use `info` or `warn` for production to reduce log volume
- `json` format is better for log aggregation tools
- `pretty` format is more readable for console output

---

### Node Environment

```env
NODE_ENV=development
```

**Description**: Node.js environment mode.

**Values**:
- `development`: Local development with SQLite
- `production`: Production deployment with PostgreSQL

**Notes**:
- This variable is automatically set by your deployment method
- Don't set this manually in .env file

---

## Optional Variables

### Parser Schedule

```env
PARSER_CRON_SCHEDULE=0 2 * * *
```

**Description**: Cron schedule for automatic parsing (if implemented).

**Format**: Cron expression (minute hour day month weekday)

**Examples**:
- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Every Monday at midnight

**Notes**:
- This is optional and only needed if you implement scheduled parsing
- Cron jobs can be run manually instead
- Adjust schedule based on htreviews.org update frequency

---

## Example .env Files

### Development (.env.development)

```env
# Database
DATABASE_URL=file:./dev.db

# API
API_PORT=3000
API_HOST=0.0.0.0

# Parser
PARSER_BASE_URL=https://htreviews.org
PARSER_CONCURRENT_REQUESTS=2
PARSER_SCROLL_DELAY_MS=1000
PARSER_MAX_RETRIES=3
PARSER_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Node
NODE_ENV=development
```

### Production (.env.production)

```env
# Database
DATABASE_URL=postgresql://hookah_user:secure_password@db.example.com:5432/hookah_db

# API
API_PORT=3000
API_HOST=0.0.0.0

# Parser
PARSER_BASE_URL=https://htreviews.org
PARSER_CONCURRENT_REQUESTS=3
PARSER_SCROLL_DELAY_MS=1000
PARSER_MAX_RETRIES=3
PARSER_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Node
NODE_ENV=production
```

---

## Security Considerations

### Sensitive Data

1. **Never Commit .env Files**: Add `.env` to `.gitignore`
2. **Use .env.example**: Commit example files without actual values
3. **Secrets Management**: Use environment-specific secrets in production
4. **Database Credentials**: Use strong passwords and rotate regularly

### API Keys

1. **Generate Strong Keys**: Use cryptographically secure random strings
2. **Rotate Keys**: Change API keys periodically
3. **Limit Key Permissions**: Only give keys to trusted clients
4. **Monitor Usage**: Track API key usage for suspicious activity

---

## Validation

### Environment Variable Validation

The application uses [`@t3-oss/env-core`](https://env.t3.gg/) with Zod schemas for type-safe environment variable validation:

**Location**: [`packages/shared/src/config.ts`](../packages/shared/src/config.ts)

**Implementation**:
```typescript
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_HOST: z.string().default('0.0.0.0'),
    PARSER_BASE_URL: z.string().url().default('https://htreviews.org'),
    PARSER_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(3),
    PARSER_SCROLL_DELAY_MS: z.coerce.number().int().nonnegative().default(1000),
    PARSER_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
    PARSER_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  },
  runtimeEnv: process.env,
});
```

**Features**:
- Type-safe access to environment variables
- Automatic validation at startup (throws if required variables are missing or invalid)
- Default values for optional variables
- Type coercion for numeric values
- Enum validation for specific value sets

**Usage**:
```typescript
import { env, isDevelopment, apiConfig } from '@hookah-db/shared';

// Access validated environment variables
const port = env.API_PORT;

// Use convenience functions
if (isDevelopment) {
  console.log('Running in development mode');
}

// Use typed config objects
const server = fastify({ port: apiConfig.port, host: apiConfig.host });
```

**Available Exports**:
- `env` - Validated environment object
- `isDevelopment`, `isProduction`, `isTest` - Boolean helpers
- `dbConfig`, `apiConfig`, `parserConfig`, `loggingConfig`, `rateLimitConfig` - Typed config objects
- `Env`, `DbConfig`, `ApiConfig`, `ParserConfig`, `LoggingConfig`, `RateLimitConfig` - TypeScript types

---

## Default Values

If an environment variable is not set, the application uses these defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required (no default) | Database connection string |
| `API_PORT` | `3000` | API server port |
| `API_HOST` | `0.0.0.0` | Bind to all interfaces |
| `PARSER_BASE_URL` | `https://htreviews.org` | htreviews.org URL |
| `PARSER_CONCURRENT_REQUESTS` | `3` | Concurrent requests |
| `PARSER_SCROLL_DELAY_MS` | `1000` | 1 second delay |
| `PARSER_MAX_RETRIES` | `3` | Retry attempts |
| `PARSER_TIMEOUT_MS` | `30000` | 30 second timeout |
| `LOG_LEVEL` | `info` | Info level logging |
| `LOG_FORMAT` | `json` | JSON log format |
| `NODE_ENV` | `development` | Development mode |
| `RATE_LIMIT_WINDOW_MS` | `60000` | 60 second rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

---

## Common Issues

### Database Connection Failed

**Error**: `Connection refused` or `Authentication failed`

**Solutions**:
1. Check if PostgreSQL is running: `docker-compose ps`
2. Verify DATABASE_URL is correct
3. Check database credentials
4. Ensure database is accessible from Docker container

### SQLite File Not Found

**Error**: `SQLITE_CANTOPEN: unable to open database file`

**Solutions**:
1. Check that the directory for the SQLite file exists
2. Verify the DATABASE_URL path is correct
3. Ensure the application has write permissions to the directory
4. Create the directory if needed: `mkdir -p data`

### Parser Timeout

**Error**: `Request timeout after 30000ms`

**Solutions**:
1. Increase `PARSER_TIMEOUT_MS` value
2. Check network connectivity
3. Verify htreviews.org is accessible
4. Reduce `PARSER_CONCURRENT_REQUESTS` to reduce load

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solutions**:
1. Check if API server is already running: `lsof -i :3000`
2. Change `API_PORT` to a different value
3. Kill existing process: `kill -9 <PID>`

---

## Environment-Specific Configurations

### Local Development

**Purpose**: Run application locally with SQLite database.

**Setup**:
```bash
cp .env.development .env
docker-compose -f docker-compose.dev.yml up
```

**Characteristics**:
- SQLite database for simplicity
- Debug logging enabled
- Hot reload enabled
- Lower concurrent requests

### Production

**Purpose**: Deploy application with PostgreSQL database.

**Setup**:
```bash
cp .env.production .env
docker-compose up -d
```

**Characteristics**:
- PostgreSQL database for performance
- Info logging for production
- Higher concurrent requests

---

## Summary

This environment variable configuration provides:

- **Centralized Management**: All variables in one place
- **Environment-Specific**: Different configs for dev and production
- **Security**: Proper handling of sensitive data
- **Validation**: Startup validation of required variables
- **Flexibility**: Easy to adjust configuration
- **Dual-Database Support**: SQLite for development, PostgreSQL for production

For main documentation, see [`README.md`](README.md).
For implementation details, see [`implementation.md`](implementation.md).
