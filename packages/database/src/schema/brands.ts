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
