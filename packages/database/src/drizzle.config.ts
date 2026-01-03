import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/sqlite/index.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
