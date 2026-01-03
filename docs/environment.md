# Environment Variables Documentation

## Overview

This document describes all environment variables used across the Hookah Tobacco Database project. All environment variables are defined in a single `.env` file at the project root.

## Required Variables

### Database

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hookah_db
```

**Description**: Connection string for PostgreSQL database (production) or SQLite file path (development).

**Examples**:
- Production: `postgresql://hookah_user:secure_password@db.example.com:5432/hookah_db`
- Development: `./local.db`

**Notes**:
- For development, SQLite is used with a local file path
- For production, PostgreSQL is used with full connection string
- Connection string format: `postgresql://[user[:password]@][host][:port][/dbname]`

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
DATABASE_URL=./local.db

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

The application validates environment variables on startup:

```typescript
function validateEnv() {
  const required = [
    'DATABASE_URL',
    'API_PORT',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate numeric values
  if (process.env.API_PORT) {
    const port = parseInt(process.env.API_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('API_PORT must be a valid port number (1-65535)');
    }
  }
  
  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
    throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }
}
```

---

## Default Values

If an environment variable is not set, the application uses these defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `./local.db` | SQLite database file |
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

---

## Common Issues

### Database Connection Failed

**Error**: `Connection refused` or `Authentication failed`

**Solutions**:
1. Check if PostgreSQL is running: `docker-compose ps`
2. Verify DATABASE_URL is correct
3. Check database credentials
4. Ensure database is accessible from Docker container

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

For main documentation, see [`README.md`](README.md).
For implementation details, see [`implementation.md`](implementation.md).
