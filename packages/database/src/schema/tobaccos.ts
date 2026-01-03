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
