# Database Module

The Database module provides a type-safe, environment-aware database abstraction layer using Drizzle ORM. It supports both PostgreSQL (production) and SQLite (development) databases with automatic schema migration and connection pooling.

## Table of Contents

- [Architecture](#architecture)
- [Environment Configuration](#environment-configuration)
- [Database Connection](#database-connection)
- [Schema Definition](#schema-definition)
- [Client Factory](#client-factory)
- [Query Helpers](#query-helpers)
- [Usage Examples](#usage-examples)
- [Type Exports](#type-exports)
- [Migrations](#migrations)
- [Testing](#testing)
- [Summary](#summary)

---

## Architecture

```
packages/database/
├── src/
│   ├── schema/              # Database schema definitions
│   │   ├── index.ts         # PostgreSQL schema
│   │   ├── api-keys.ts      # API keys table
│   │   ├── brands.ts        # Brands table
│   │   └── tobaccos.ts      # Tobaccos table
│   ├── schema/sqlite/       # SQLite schema (dialect-specific)
│   │   ├── index.ts
│   │   ├── api-keys.ts
│   │   ├── brands.ts
│   │   └── tobaccos.ts
│   ├── client.ts            # Database client factory
│   │   ├── getDb()          # Get database instance (singleton)
│   │   ├── closeDb()        # Close database connection
│   │   ├── getDatabaseType() # Detect database type
│   │   ├── createPostgresClient() # PostgreSQL client
│   │   └── createSqliteClient()   # SQLite client
│   ├── query-helpers.ts     # Query helper functions
│   │   ├── buildFilters()   # Type-safe filter builder
│   │   ├── paginateQuery()  # Pagination helper
│   │   ├── withTransaction() # Transaction wrapper
│   │   ├── prepareQuery()   # Prepared statement executor
│   │   ├── combineAndFilters() # AND logic combiner
│   │   └── combineOrFilters()  # OR logic combiner
│   └── index.ts             # Main exports
├── migrations/              # Database migrations
│   ├── 0000_bored_nebula.sql
│   └── meta/
│       ├── _journal.json
│       └── 0000_snapshot.json
├── drizzle.config.ts        # Drizzle ORM configuration
└── package.json
```

---

## Environment Configuration

The database module uses environment variables to determine which database to use and how to connect:

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development` | No |
| `DATABASE_URL` | Database connection string | - | Yes |

### Database Selection Logic

The database type is automatically detected based on environment configuration:

- **SQLite** is used when:
  - `NODE_ENV` is set to `development`, OR
  - `DATABASE_URL` contains `'sqlite'` in the connection string

- **PostgreSQL** is used when:
  - `NODE_ENV` is set to `production` (or any non-development value), AND
  - `DATABASE_URL` does not contain `'sqlite'`

This allows seamless switching between development (SQLite) and production (PostgreSQL) environments without code changes.

### Example Environment Configurations

**Development (SQLite):**
```env
NODE_ENV=development
DATABASE_URL=file:./dev.db
```

**Production (PostgreSQL):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/hookah_db
```

**Explicit SQLite (any environment):**
```env
NODE_ENV=production
DATABASE_URL=file:./prod.db
```

---

## Database Connection

### Connection Pooling (PostgreSQL)

PostgreSQL uses a connection pool with the following configuration:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `max` | 20 | Maximum number of connections in the pool |
| `idleTimeoutMillis` | 30000 (30s) | Time before idle connections are closed |
| `connectionTimeoutMillis` | 2000 (2s) | Time to wait for a connection |
| `statement_timeout` | 30000 (30s) | Maximum time for a statement to execute |
| `query_timeout` | 30000 (30s) | Maximum time for a query to execute |

### Single Connection (SQLite)

SQLite uses a single connection without pooling, as it's designed for single-process access and doesn't benefit from connection pooling.

### Connection Lifecycle

1. **Initialization**: The first call to [`getDb()`](packages/database/src/client.ts:48) creates the connection
2. **Reuse**: Subsequent calls return the cached instance (singleton pattern)
3. **Cleanup**: Call [`closeDb()`](packages/database/src/client.ts:92) to close the connection and clear the cache

---

## Schema Definition

The database schema is defined using Drizzle ORM with TypeScript types for type safety.

### Tables

#### API Keys Table

```typescript
// packages/database/src/schema/api-keys.ts
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Fields:**
- `id`: Primary key (UUID)
- `key`: API key string (unique)
- `name`: Human-readable name
- `isActive`: Whether the key is active
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Brands Table

```typescript
// packages/database/src/schema/brands.ts
export const brands = pgTable('brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Fields:**
- `id`: Primary key (UUID)
- `name`: Brand name
- `slug`: URL-friendly identifier (unique)
- `description`: Brand description
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Tobaccos Table

```typescript
// packages/database/src/schema/tobaccos.ts
export const tobaccos = pgTable('tobaccos', {
  id: text('id').primaryKey(),
  brandId: text('brand_id').notNull().references(() => brands.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  strength: integer('strength'),
  flavorProfile: text('flavor_profile'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Fields:**
- `id`: Primary key (UUID)
- `brandId`: Foreign key to brands table
- `name`: Tobacco name
- `slug`: URL-friendly identifier (unique)
- `description`: Tobacco description
- `strength`: Strength rating (1-10)
- `flavorProfile`: Flavor profile description
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### SQLite Schema

The SQLite schema mirrors the PostgreSQL schema but uses SQLite-specific data types and operators. All table definitions are in [`packages/database/src/schema/sqlite/`](packages/database/src/schema/sqlite/).

---

## Client Factory

The client factory provides a singleton pattern for database connections with automatic environment detection.

### Functions

#### `getDb()`

Gets or creates the database client instance using the singleton pattern.

**Signature:**
```typescript
export function getDb(): DrizzleDB
```

**Returns:**
- `DrizzleDB`: The database instance (PostgreSQL or SQLite)

**Behavior:**
- Returns cached instance on subsequent calls
- Automatically detects database type based on environment
- Creates appropriate client (PostgreSQL or SQLite)

**Example:**
```typescript
import { getDb } from '@hookah-db/database';

// Get database instance
const db = getDb();

// Use it in queries
const result = await db.select().from(brands);
```

#### `closeDb()`

Closes the database connection and clears the cached instance.

**Signature:**
```typescript
export function closeDb(): void
```

**Behavior:**
- Sets the cached instance to `null`
- Does not explicitly close connections (PostgreSQL pool handles this)
- Useful for testing or cleanup

**Example:**
```typescript
import { getDb, closeDb } from '@hookah-db/database';

// Use database
const db = getDb();
// ... perform operations ...

// Cleanup
closeDb();
```

#### `getDatabaseType()` (Internal)

Determines the database type based on environment configuration.

**Signature:**
```typescript
function getDatabaseType(): 'postgresql' | 'sqlite'
```

**Logic:**
```typescript
function getDatabaseType(): 'postgresql' | 'sqlite' {
  const databaseUrl = env.DATABASE_URL.toLowerCase();
  const nodeEnv = env.NODE_ENV;

  // SQLite for development or if DATABASE_URL contains 'sqlite'
  if (nodeEnv === 'development' || databaseUrl.includes('sqlite')) {
    return 'sqlite';
  }

  // PostgreSQL for production
  return 'postgresql';
}
```

#### `createPostgresClient()` (Internal)

Creates a PostgreSQL database client with connection pooling.

**Signature:**
```typescript
function createPostgresClient(): DrizzleDB
```

**Configuration:**
```typescript
const poolConfig: PoolConfig = {
  max: 20,                          // Max connections
  idleTimeoutMillis: 30000,         // 30s idle timeout
  connectionTimeoutMillis: 2000,    // 2s connection timeout
  statement_timeout: 30000,         // 30s statement timeout
  query_timeout: 30000,             // 30s query timeout
};
```

#### `createSqliteClient()` (Internal)

Creates a SQLite database client (single connection, no pooling).

**Signature:**
```typescript
function createSqliteClient(): DrizzleDB
```

**Behavior:**
- Creates a single connection using `better-sqlite3`
- No pooling (SQLite doesn't benefit from it)
- Strips `file:` prefix from `DATABASE_URL`

---

## Query Helpers

Query helpers provide reusable functions for common database operations, improving code consistency and reducing boilerplate.

### `buildFilters()`

Type-safe filter builder that converts filter objects to Drizzle where clauses.

**Signature:**
```typescript
export function buildFilters<T extends Record<string, unknown>>(
  schema: T,
  filters: Record<string, unknown>
): WhereClause[]
```

**Parameters:**
- `schema`: The table schema object (e.g., `brands`)
- `filters`: Filter object with field names as keys

**Returns:**
- `WhereClause[]`: Array of Drizzle where conditions

**Supported Operators:**
- `eq`: Equality (default for direct values)
- `like`: Case-sensitive LIKE
- `ilike`: Case-insensitive LIKE
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal

**Usage Examples:**

**Direct equality:**
```typescript
import { getDb, buildFilters, combineAndFilters } from '@hookah-db/database';
import { brands } from '@hookah-db/database';

const db = getDb();

// Simple equality filter
const filters = buildFilters(brands, { name: 'Al Fakher' });
const condition = combineAndFilters(filters);

const result = await db.select().from(brands).where(condition);
```

**Operator-based filtering:**
```typescript
// Multiple operators
const filters = buildFilters(brands, {
  name: { ilike: '%al%' },
  createdAt: { gte: new Date('2024-01-01') }
});
const condition = combineAndFilters(filters);

const result = await db.select().from(brands).where(condition);
```

**Type Safety:**
- Schema types are enforced at compile time
- Invalid field names will cause TypeScript errors
- Operator values are type-checked

### `paginateQuery()`

Applies pagination to a query by calculating offset from page and limit.

**Signature:**
```typescript
export function paginateQuery<T extends PgSelect | SQLiteSelect>(
  query: T,
  page: number,
  limit: number
): T
```

**Parameters:**
- `query`: The Drizzle query object
- `page`: Page number (1-based)
- `limit`: Number of items per page

**Returns:**
- `T`: The modified query with `.limit()` and `.offset()` applied

**Example:**
```typescript
import { getDb, paginateQuery } from '@hookah-db/database';
import { brands } from '@hookah-db/database';

const db = getDb();

// Get page 2 with 10 items per page
const query = db.select().from(brands);
const paginatedQuery = paginateQuery(query, 2, 10);

const result = await paginatedQuery;
// Returns items 11-20
```

### `withTransaction()`

Wraps operations in a transaction with automatic rollback on error.

**Signature:**
```typescript
export async function withTransaction<T>(
  db: DrizzleDB,
  callback: (tx: any) => T
): Promise<T>
```

**Parameters:**
- `db`: Database instance
- `callback`: Async function containing transaction operations

**Returns:**
- `Promise<T>`: Result of the callback function

**Behavior:**
- Automatically commits on success
- Automatically rolls back on error
- Throws error on failure

**Example:**
```typescript
import { getDb, withTransaction } from '@hookah-db/database';
import { brands, tobaccos } from '@hookah-db/database';

const db = getDb();

try {
  await withTransaction(db, async (tx) => {
    // Insert brand
    const [brand] = await tx.insert(brands).values({
      id: generateId(),
      name: 'New Brand',
      slug: 'new-brand',
    }).returning();

    // Insert tobacco (will rollback if this fails)
    await tx.insert(tobaccos).values({
      id: generateId(),
      brandId: brand.id,
      name: 'New Tobacco',
      slug: 'new-tobacco',
    });
  });
  
  console.log('Transaction committed');
} catch (error) {
  console.log('Transaction rolled back:', error);
}
```

### `prepareQuery()`

Executes a prepared statement for query caching and type safety.

**Signature:**
```typescript
export async function prepareQuery<T>(
  _db: DrizzleDB,
  query: PgSelect | SQLiteSelect
): Promise<T[]>
```

**Parameters:**
- `_db`: Database instance (currently unused, reserved for future caching)
- `query`: The Drizzle query object

**Returns:**
- `Promise<T[]>`: Typed query results

**Example:**
```typescript
import { getDb, prepareQuery } from '@hookah-db/database';
import { brands } from '@hookah-db/database';

const db = getDb();

const query = db.select().from(brands).where(eq(brands.name, 'Al Fakher'));
const result = await prepareQuery<typeof brands.$inferSelect[]>(db, query);
```

### `combineAndFilters()`

Combines multiple where clauses with AND logic.

**Signature:**
```typescript
export function combineAndFilters(conditions: WhereClause[]): WhereClause
```

**Parameters:**
- `conditions`: Array of where clauses

**Returns:**
- `WhereClause`: Combined condition (or `undefined` if empty)

**Behavior:**
- Returns `undefined` if no conditions
- Returns single condition if only one
- Returns `and(...conditions)` if multiple

**Example:**
```typescript
import { buildFilters, combineAndFilters } from '@hookah-db/database';
import { brands } from '@hookah-db/database';

const filters = buildFilters(brands, {
  name: { ilike: '%al%' },
  isActive: true
});

const condition = combineAndFilters(filters);
// Result: and(ilike(brands.name, '%al%'), eq(brands.isActive, true))
```

### `combineOrFilters()`

Combines multiple where clauses with OR logic.

**Signature:**
```typescript
export function combineOrFilters(conditions: WhereClause[]): WhereClause
```

**Parameters:**
- `conditions`: Array of where clauses

**Returns:**
- `WhereClause`: Combined condition (or `undefined` if empty)

**Behavior:**
- Returns `undefined` if no conditions
- Returns single condition if only one
- Returns `or(...conditions)` if multiple

**Example:**
```typescript
import { buildFilters, combineOrFilters } from '@hookah-db/database';
import { tobaccos } from '@hookah-db/database';

const filters = buildFilters(tobaccos, {
  name: { ilike: '%mint%' },
  flavorProfile: { ilike: '%fresh%' }
});

const condition = combineOrFilters(filters);
// Result: or(ilike(tobaccos.name, '%mint%'), ilike(tobaccos.flavorProfile, '%fresh%'))
```

---

## Usage Examples

### Basic Queries with Filters

```typescript
import { getDb, buildFilters, combineAndFilters } from '@hookah-db/database';
import { brands, tobaccos } from '@hookah-db/database';

const db = getDb();

// Simple filter
const filters = buildFilters(brands, { name: 'Al Fakher' });
const condition = combineAndFilters(filters);

const result = await db
  .select()
  .from(brands)
  .where(condition);
```

### Advanced Filtering with Multiple Conditions

```typescript
import { getDb, buildFilters, combineAndFilters } from '@hookah-db/database';
import { tobaccos } from '@hookah-db/database';

const db = getDb();

// Multiple filters with different operators
const filters = buildFilters(tobaccos, {
  strength: { gte: 5 },
  flavorProfile: { ilike: '%fruit%' },
  createdAt: { gte: new Date('2024-01-01') }
});

const condition = combineAndFilters(filters);

const result = await db
  .select()
  .from(tobaccos)
  .where(condition)
  .orderBy(tobaccos.name);
```

### Transaction Usage

```typescript
import { getDb, withTransaction } from '@hookah-db/database';
import { brands, tobaccos } from '@hookah-db/database';

const db = getDb();

await withTransaction(db, async (tx) => {
  // Create brand
  const [brand] = await tx.insert(brands).values({
    id: generateId(),
    name: 'New Brand',
    slug: 'new-brand',
  }).returning();

  // Create tobacco
  await tx.insert(tobaccos).values({
    id: generateId(),
    brandId: brand.id,
    name: 'New Tobacco',
    slug: 'new-tobacco',
    strength: 5,
  });

  // Both operations will be committed together
  // If any fails, both will be rolled back
});
```

### Pagination

```typescript
import { getDb, paginateQuery } from '@hookah-db/database';
import { brands } from '@hookah-db/database';

const db = getDb();

const page = 1;
const limit = 10;

const query = db.select().from(brands);
const paginatedQuery = paginateQuery(query, page, limit);

const results = await paginatedQuery;
```

### Environment-Specific Database Selection

```typescript
import { getDb } from '@hookah-db/database';
import { brands } from '@hookah-db/database';

// Works with both SQLite (dev) and PostgreSQL (prod)
const db = getDb();

// No code changes needed - environment determines database type
const result = await db.select().from(brands);
```

### Combining AND and OR Filters

```typescript
import { getDb, buildFilters, combineAndFilters, combineOrFilters } from '@hookah-db/database';
import { tobaccos } from '@hookah-db/database';

const db = getDb();

// (strength >= 5 AND strength <= 7) OR (flavorProfile LIKE '%mint%')
const strengthFilters = buildFilters(tobaccos, {
  strength: { gte: 5, lte: 7 }
});

const flavorFilters = buildFilters(tobaccos, {
  flavorProfile: { ilike: '%mint%' }
});

const condition = combineOrFilters([
  combineAndFilters(strengthFilters),
  combineAndFilters(flavorFilters)
]);

const result = await db.select().from(tobaccos).where(condition);
```

---

## Type Exports

The database module exports the following types for use in your application:

### Core Types

| Type | Description | Source |
|------|-------------|--------|
| `DrizzleDB` | Database instance type (PostgreSQL or SQLite) | [`client.ts`](packages/database/src/client.ts:13) |
| `Transaction` | Transaction type for transaction callbacks | [`client.ts`](packages/database/src/client.ts:16) |
| `WhereClause` | Where clause type (SQL or SQLChunk) | [`query-helpers.ts`](packages/database/src/query-helpers.ts:10) |
| `FilterOperator` | Filter operator type (eq, like, ilike, gt, gte, lt, lte) | [`query-helpers.ts`](packages/database/src/query-helpers.ts:12) |
| `FilterCondition` | Filter condition interface | [`query-helpers.ts`](packages/database/src/query-helpers.ts:14) |

### Schema Types

Each table exports inferred types for rows and insert values:

| Type | Description | Example |
|------|-------------|---------|
| `Brands` | Brands table schema | `import { brands } from '@hookah-db/database'` |
| `Tobaccos` | Tobaccos table schema | `import { tobaccos } from '@hookah-db/database'` |
| `ApiKeys` | API keys table schema | `import { apiKeys } from '@hookah-db/database'` |

### Inferred Types

Use `$inferSelect` and `$inferInsert` for type-safe operations:

```typescript
import { brands } from '@hookah-db/database';

// Infer row type
type Brand = typeof brands.$inferSelect;
// { id: string, name: string, slug: string, ... }

// Infer insert type
type NewBrand = typeof brands.$inferInsert;
// { id?: string, name: string, slug: string, ... }
```

---

## Migrations

Database migrations are managed using Drizzle Kit.

### Running Migrations

```bash
# Generate migration from schema changes
pnpm --filter @hookah-db/database db:generate

# Push schema to database (dev only)
pnpm --filter @hookah-db/database db:push

# Apply migrations
pnpm --filter @hookah-db/database db:migrate

# Open Drizzle Studio (interactive database UI)
pnpm --filter @hookah-db/database db:studio
```

### Migration Files

Migrations are stored in [`packages/database/migrations/`](packages/database/migrations/):

- `0000_bored_nebula.sql`: Initial schema migration
- `meta/_journal.json`: Migration journal
- `meta/0000_snapshot.json`: Schema snapshot

---

## Testing

When testing, use the `closeDb()` function to reset the database state between tests:

```typescript
import { getDb, closeDb } from '@hookah-db/database';

describe('Database Tests', () => {
  beforeEach(() => {
    closeDb(); // Reset connection
  });

  afterEach(() => {
    closeDb(); // Cleanup
  });

  it('should query brands', async () => {
    const db = getDb();
    const result = await db.select().from(brands);
    expect(result).toBeDefined();
  });
});
```

---

## Summary

The Database module provides:

- **Type-Safe Schema**: Drizzle ORM with full TypeScript support
- **Environment-Aware Database**: Automatic switching between SQLite (dev) and PostgreSQL (prod)
- **Connection Pooling**: Optimized PostgreSQL connection management (max 20 connections, 30s idle timeout)
- **Database Client Factory**: Singleton pattern with [`getDb()`](packages/database/src/client.ts:48) and [`closeDb()`](packages/database/src/client.ts:92)
- **Query Helper Functions**: Reusable helpers for common operations:
  - [`buildFilters()`](packages/database/src/query-helpers.ts:29) - Type-safe filter builder
  - [`paginateQuery()`](packages/database/src/query-helpers.ts:100) - Pagination helper
  - [`withTransaction()`](packages/database/src/query-helpers.ts:118) - Transaction wrapper
  - [`prepareQuery()`](packages/database/src/query-helpers.ts:134) - Prepared statement executor
  - [`combineAndFilters()`](packages/database/src/query-helpers.ts:149) - AND logic combiner
  - [`combineOrFilters()`](packages/database/src/query-helpers.ts:163) - OR logic combiner
- **Type Exports**: Comprehensive type exports for type safety
- **Migration Support**: Drizzle Kit for schema migrations
- **Easy Testing**: Simple connection reset with `closeDb()`

The module is designed to be simple, type-safe, and environment-agnostic, allowing developers to focus on business logic rather than database management.
