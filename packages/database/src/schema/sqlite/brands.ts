import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  name: text('name', { length: 255 }).notNull(),
  slug: text('slug', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url', { length: 500 }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  parsedAt: integer('parsed_at', { mode: 'timestamp' }),
}, (table) => ({
  nameIdx: index('brands_name_idx').on(table.name),
  slugIdx: index('brands_slug_idx').on(table.slug),
}));
