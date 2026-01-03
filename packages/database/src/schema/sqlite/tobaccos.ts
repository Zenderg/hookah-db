import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { brands } from './brands';

export const tobaccos = sqliteTable('tobaccos', {
  id: text('id').primaryKey(),
  brandId: text('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: text('name', { length: 255 }).notNull(),
  slug: text('slug', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url', { length: 500 }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  parsedAt: integer('parsed_at', { mode: 'timestamp' }),
}, (table) => ({
  brandIdIdx: index('tobaccos_brand_id_idx').on(table.brandId),
  nameIdx: index('tobaccos_name_idx').on(table.name),
  slugIdx: index('tobaccos_slug_idx').on(table.slug),
}));
