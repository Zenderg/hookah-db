# Database Module Documentation

## Overview

The database module (`packages/database`) provides database schema definitions, migrations, and query helpers using Drizzle ORM. It supports both PostgreSQL (production) and SQLite (development).

## Architecture

```mermaid
graph TB
    A[Database Module] --> B[Schema Definitions]
    A --> C[Migration System]
    A --> D[Query Helpers]
    A --> E[Client Factory]
    
    B --> F[Drizzle ORM]
    C --> F
    D --> F
    E --> F
    
    F --> G[PostgreSQL]
    F --> H[SQLite]
```

## Components

### 1. Schema Definitions (`src/schema/`)

Defines database tables using Drizzle ORM. Schema is split into separate files for better organization.

**Brand Table** (`src/schema/brands.ts`):
```typescript
import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  parsedAt: timestamp('parsed_at'),
}, (table) => ({
  nameIdx: index('brands_name_idx').on(table.name),
  slugIdx: uniqueIndex('brands_slug_idx').on(table.slug),
}));
```

**Tobacco Table** (`src/schema/tobaccos.ts`):
```typescript
import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { brands } from './brands';

export const tobaccos = pgTable('tobaccos', {
  id: uuid('id').primaryKey().defaultRandom(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  parsedAt: timestamp('parsed_at'),
}, (table) => ({
  brandIdIdx: index('tobaccos_brand_id_idx').on(table.brandId),
  nameIdx: index('tobaccos_name_idx').on(table.name),
  slugIdx: uniqueIndex('tobaccos_slug_idx').on(table.slug),
}));
```

**API Keys Table** (`src/schema/api-keys.ts`):
```typescript
import { pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: text('key_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  keyHashIdx: uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
  isActiveIdx: index('api_keys_is_active_idx').on(table.isActive),
}));
```

**Schema Index** (`src/schema/index.ts`):
```typescript
export * from './brands';
export * from './tobaccos';
export * from './api-keys';
```

---

### 2. Client Factory (`src/client.ts`)

Creates database client based on environment.

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let client: ReturnType<typeof drizzle>;

if (process.env.NODE_ENV === 'production') {
  // PostgreSQL for production
  client = drizzle(process.env.DATABASE_URL!, { schema });
} else {
  // SQLite for development
  client = drizzleSqlite('./local.db', { schema });
}

export { client, schema };
```

---

### 3. Migration System

Uses Drizzle Kit for database migrations.

**Migration Configuration** (`drizzle.config.ts`):
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

**Generate Migration**:
```bash
pnpm --filter @hookah-db/database db:generate
```

**Apply Migration**:
```bash
# Development
pnpm --filter @hookah-db/database db:push

# Production
pnpm --filter @hookah-db/database db:migrate
```

**Open Drizzle Studio**:
```bash
pnpm --filter @hookah-db/database db:studio
```

---

### Migration System Configuration

The migration system is configured using Drizzle Kit v0.31.8 and supports dual-database deployment:

**Dual-Database Support**:
- **Development**: SQLite database with file-based storage (`file:./dev.db`)
- **Production**: PostgreSQL database with network connection

**Drizzle Kit Configuration** (`packages/database/src/drizzle.config.ts`):
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema',
  out: './migrations',
  dialect: 'sqlite', // Uses SQLite for development
  driver: 'better-sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

**Migration Directory Structure**:
```
packages/database/migrations/
├── 0000_bored_nebula.sql    # Initial migration
└── meta/                     # Migration metadata
    ├── _journal.json         # Migration journal
    └── 0000_snapshot.json    # Schema snapshot
```

**Available Migration Scripts**:
- `db:generate` - Generate migrations from schema changes
- `db:migrate` - Apply migrations to database
- `db:push` - Push schema directly (development only)
- `db:studio` - Open Drizzle Studio for database inspection

---

### SQLite-Specific Schemas

SQLite schemas are separate from PostgreSQL schemas due to differences in column types and constraints:

**Why Separate Schemas?**:
- PostgreSQL uses `uuid` type, SQLite uses `text` with custom functions
- PostgreSQL uses `timestamp` type, SQLite uses `text` with ISO format
- Index creation syntax differs between databases
- Foreign key constraints require different implementations

**SQLite Schema Files** (`packages/database/src/schema/sqlite/`):

**brands.ts**:
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  parsedAt: integer('parsed_at', { mode: 'timestamp' }),
}, (table) => ({
  nameIdx: sql`CREATE INDEX IF NOT EXISTS brands_name_idx ON brands(name)`,
  slugIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_idx ON brands(slug)`,
}));
```

**tobaccos.ts**:
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { brands } from './brands';

export const tobaccos = sqliteTable('tobaccos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  parsedAt: integer('parsed_at', { mode: 'timestamp' }),
}, (table) => ({
  brandIdIdx: sql`CREATE INDEX IF NOT EXISTS tobaccos_brand_id_idx ON tobaccos(brand_id)`,
  nameIdx: sql`CREATE INDEX IF NOT EXISTS tobaccos_name_idx ON tobaccos(name)`,
  slugIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS tobaccos_slug_idx ON tobaccos(slug)`,
}));
```

**api-keys.ts**:
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  keyHashIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash)`,
  isActiveIdx: sql`CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active)`,
}));
```

**index.ts**:
```typescript
export * from './brands';
export * from './tobaccos';
export * from './api-keys';
```

---

### Migration Workflow

The migration workflow follows these steps:

**1. Generate Migrations**:
```bash
pnpm --filter @hookah-db/database db:generate
```
This command:
- Compares current schema with last migration snapshot
- Generates SQL migration file in `migrations/` directory
- Creates new snapshot in `migrations/meta/` directory

**2. Apply Migrations**:
```bash
# For development (SQLite)
pnpm --filter @hookah-db/database db:migrate

# For production (PostgreSQL)
pnpm --filter @hookah-db/database db:migrate
```
This command:
- Executes all pending migrations
- Updates migration journal
- Creates/updates database schema

**3. Push Schema Directly (Development Only)**:
```bash
pnpm --filter @hookah-db/database db:push
```
This command:
- Pushes schema directly to database without migration files
- Useful for rapid development and testing
- Should NOT be used in production

**4. Open Drizzle Studio**:
```bash
pnpm --filter @hookah-db/database db:studio
```
This command:
- Opens Drizzle Studio web interface
- Allows visual inspection of database
- Supports querying and data manipulation

---

### Generated Migration Files

**Initial Migration** (`migrations/0000_bored_nebula.sql`):
```sql
-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  updated_at INTEGER,
  parsed_at INTEGER
);

-- Create tobaccos table
CREATE TABLE IF NOT EXISTS tobaccos (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  updated_at INTEGER,
  parsed_at INTEGER,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS brands_name_idx ON brands(name);
CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_idx ON brands(slug);
CREATE INDEX IF NOT EXISTS tobaccos_brand_id_idx ON tobaccos(brand_id);
CREATE INDEX IF NOT EXISTS tobaccos_name_idx ON tobaccos(name);
CREATE UNIQUE INDEX IF NOT EXISTS tobaccos_slug_idx ON tobaccos(slug);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active);
```

**Migration Metadata** (`migrations/meta/`):
- `_journal.json` - Tracks applied migrations
- `0000_snapshot.json` - Schema snapshot for migration 0000

**What the Initial Migration Creates**:
- 3 tables: `brands`, `tobaccos`, `api_keys`
- 7 indexes for query optimization
- Foreign key constraint with cascade delete
- Unique constraints on slugs and key_hash

---

### 4. Query Helpers (`src/queries.ts`)

Provides helper functions for common database operations.

**Brand Queries**:
```typescript
import { eq, desc, sql, like } from 'drizzle-orm';
import { client, schema } from './client';

export async function getAllBrands(options: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: string;
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const offset = (page - 1) * limit;
  
  let query = client.select().from(schema.brands);
  
  // Add search filter
  if (options.search) {
    query = query.where(
      like(schema.brands.name, `%${options.search}%`)
    );
  }
  
  // Add sorting
  const sortColumn = options.sort === 'name' 
    ? schema.brands.name 
    : schema.brands.parsedAt;
  const sortOrder = options.order === 'asc' 
    ? undefined 
    : desc(sortColumn);
  
  query = query.orderBy(sortOrder);
  
  // Get total count
  const [{ count }] = await client
    .select({ count: sql<number>`count(*)` })
    .from(schema.brands);
  
  // Get paginated results
  const results = await query.limit(limit).offset(offset);
  
  return {
    data: results,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

export async function getBrandBySlug(slug: string) {
  const [brand] = await client.select()
    .from(schema.brands)
    .where(eq(schema.brands.slug, slug))
    .limit(1);
  
  return brand || null;
}
```

**Tobacco Queries**:
```typescript
export async function getAllTobaccos(options: {
  page?: number;
  limit?: number;
  search?: string;
  brandSlug?: string;
  sort?: string;
  order?: string;
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const offset = (page - 1) * limit;
  
  let query = client.select().from(schema.tobaccos);
  
  // Add brand filter
  if (options.brandSlug) {
    const brand = await getBrandBySlug(options.brandSlug);
    if (!brand) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    
    query = query.where(eq(schema.tobaccos.brandId, brand.id));
  }
  
  // Add search filter
  if (options.search) {
    query = query.where(
      like(schema.tobaccos.name, `%${options.search}%`)
    );
  }
  
  // Add sorting
  const sortColumn = options.sort === 'name' 
    ? schema.tobaccos.name 
    : schema.tobaccos.parsedAt;
  const sortOrder = options.order === 'asc' 
    ? undefined 
    : desc(sortColumn);
  
  query = query.orderBy(sortOrder);
  
  // Get total count
  const [{ count }] = await client
    .select({ count: sql<number>`count(*)` })
    .from(schema.tobaccos);
  
  // Get paginated results
  const results = await query.limit(limit).offset(offset);
  
  return {
    data: results,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

export async function getTobaccoBySlug(slug: string) {
  const [tobacco] = await client.select()
    .from(schema.tobaccos)
    .where(eq(schema.tobaccos.slug, slug))
    .limit(1);
  
  return tobacco || null;
}
```

**API Key Queries**:
```typescript
export async function getApiKeyByKeyHash(keyHash: string) {
  const [apiKey] = await client.select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, keyHash))
    .limit(1);
  
  return apiKey || null;
}

export async function createApiKey(name: string, keyHash: string) {
  const [apiKey] = await client.insert(schema.apiKeys)
    .values({
      name,
      keyHash,
      isActive: true,
      createdAt: new Date(),
    })
    .returning();
  
  return apiKey;
}

export async function updateApiKeyStatus(id: string, isActive: boolean) {
  await client.update(schema.apiKeys)
    .set({ isActive })
    .where(eq(schema.apiKeys.id, id));
}

export async function deleteApiKey(id: string) {
  await client.delete(schema.apiKeys)
    .where(eq(schema.apiKeys.id, id));
}
```

---

### 5. Upsert Helpers (`src/upsert.ts`)

Provides upsert (update or insert) operations.

```typescript
import { eq } from 'drizzle-orm';
import { client, schema } from './client';

export async function upsertBrand(brand: {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}) {
  if (brand.id) {
    // Update existing brand
    await client.update(schema.brands)
      .set({
        name: brand.name,
        description: brand.description,
        imageUrl: brand.imageUrl,
        updatedAt: new Date(),
        parsedAt: new Date(),
      })
      .where(eq(schema.brands.id, brand.id));
  } else {
    // Insert new brand
    await client.insert(schema.brands)
      .values({
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        imageUrl: brand.imageUrl,
        updatedAt: new Date(),
        parsedAt: new Date(),
      });
  }
}

export async function upsertTobacco(tobacco: {
  id?: string;
  brandId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}) {
  if (tobacco.id) {
    // Update existing tobacco
    await client.update(schema.tobaccos)
      .set({
        name: tobacco.name,
        description: tobacco.description,
        imageUrl: tobacco.imageUrl,
        updatedAt: new Date(),
        parsedAt: new Date(),
      })
      .where(eq(schema.tobaccos.id, tobacco.id));
  } else {
    // Insert new tobacco
    await client.insert(schema.tobaccos)
      .values({
        brandId: tobacco.brandId,
        name: tobacco.name,
        slug: tobacco.slug,
        description: tobacco.description,
        imageUrl: tobacco.imageUrl,
        updatedAt: new Date(),
        parsedAt: new Date(),
      });
  }
}
```

---

## Database Connection

### Connection Pooling

PostgreSQL connection pooling is configured for production:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const client = drizzle(pool, { schema });
```

### Connection Health Check

```typescript
export async function checkConnection(): Promise<boolean> {
  try {
    await client.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

---

## Migrations

### Migration Files

Migrations are stored in `migrations/` directory:

```
migrations/
├── 0000_bored_nebula.sql
├── meta/
│   ├── _journal.json
│   └── 0000_snapshot.json
└── (future migrations)
```

### Migration Example

```sql
-- 0000_bored_nebula.sql

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  updated_at INTEGER,
  parsed_at INTEGER
);

-- Tobaccos table
CREATE TABLE IF NOT EXISTS tobaccos (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  updated_at INTEGER,
  parsed_at INTEGER,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS brands_name_idx ON brands(name);
CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_idx ON brands(slug);
CREATE INDEX IF NOT EXISTS tobaccos_brand_id_idx ON tobaccos(brand_id);
CREATE INDEX IF NOT EXISTS tobaccos_name_idx ON tobaccos(name);
CREATE UNIQUE INDEX IF NOT EXISTS tobaccos_slug_idx ON tobaccos(slug);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active);
```

---

## Testing

### Unit Tests

Test database queries and helpers:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { client, schema } from './client';
import { getAllBrands, getBrandBySlug } from './queries';

describe('Database Queries', () => {
  let testBrandId: string;
  
  beforeAll(async () => {
    // Insert test data
    const [brand] = await client.insert(schema.brands)
      .values({
        name: 'Test Brand',
        slug: 'test-brand',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        updatedAt: new Date(),
        parsedAt: new Date(),
      })
      .returning();
    
    testBrandId = brand.id;
  });
  
  afterAll(async () => {
    // Clean up test data
    await client.delete(schema.brands)
      .where(eq(schema.brands.id, testBrandId));
  });
  
  it('should get all brands', async () => {
    const result = await getAllBrands({ page: 1, limit: 10 });
    
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Test Brand');
    expect(result.pagination.total).toBe(1);
  });
  
  it('should get brand by slug', async () => {
    const brand = await getBrandBySlug('test-brand');
    
    expect(brand).not.toBeNull();
    expect(brand.name).toBe('Test Brand');
  });
  
  it('should return null for non-existent brand', async () => {
    const brand = await getBrandBySlug('non-existent');
    
    expect(brand).toBeNull();
  });
});
```

### Integration Tests

Test database with real data:

```typescript
describe('Database Integration', () => {
  it('should handle concurrent queries', async () => {
    const promises = [
      getAllBrands({ page: 1, limit: 10 }),
      getAllBrands({ page: 2, limit: 10 }),
      getAllBrands({ page: 3, limit: 10 }),
    ];
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
```

---

## Configuration

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hookah_db
NODE_ENV=development
```

### Config File

```typescript
// packages/database/src/config.ts
export const dbConfig = {
  url: process.env.DATABASE_URL,
  env: process.env.NODE_ENV || 'development',
  pool: {
    min: 2,
    max: 20,
  },
};
```

---

## Performance Considerations

### Query Optimization

1. **Use Indexes**: All WHERE clauses use indexed columns
2. **Limit Results**: Always use LIMIT to prevent large result sets
3. **Select Only Needed**: Don't use SELECT *
4. **Use JOINs**: Instead of multiple queries
5. **Connection Pooling**: Reuse database connections

### Batch Operations

```typescript
export async function upsertBrandsBatch(brands: Array<BrandInput>) {
  // Process in batches of 100
  const batchSize = 100;
  
  for (let i = 0; i < brands.length; i += batchSize) {
    const batch = brands.slice(i, i + batchSize);
    await Promise.all(batch.map(brand => upsertBrand(brand)));
  }
}
```

---

## Error Handling

### Database Errors

```typescript
export class DatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handleDatabaseError(error: unknown): never {
  if (error instanceof Error) {
    throw new DatabaseError('Database operation failed', error);
  }
  
  throw new DatabaseError('Unknown database error');
}
```

### Transaction Support

```typescript
export async function transaction<T>(
  callback: (tx: typeof client) => Promise<T>
): Promise<T> {
  return client.transaction(async (tx) => {
    return await callback(tx);
  });
}
```

---

## Summary

The database module provides:

- **Schema Definitions**: Clear table definitions with Drizzle ORM
- **Migration System**: Versioned database migrations with dual-database support
- **Query Helpers**: Reusable database query functions
- **Upsert Operations**: Update or insert data easily
- **Type Safety**: Full TypeScript support
- **Multi-Database**: PostgreSQL and SQLite support
- **Migration Workflow**: Generate, apply, and manage migrations
- **SQLite-Specific Schemas**: Separate schemas for SQLite compatibility

For API module documentation, see [`api.md`](api.md).
For parser module documentation, see [`parser.md`](parser.md).
