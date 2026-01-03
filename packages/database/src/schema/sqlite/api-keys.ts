import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  keyHash: text('key_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  keyHashIdx: index('api_keys_key_hash_idx').on(table.keyHash),
  isActiveIdx: index('api_keys_is_active_idx').on(table.isActive),
}));
