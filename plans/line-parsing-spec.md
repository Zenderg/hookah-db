# Line Parsing Specification

## Overview
This document specifies what data should be parsed from htreviews.org for Lines (Линейки) and how it should be stored in the database.

## Data Source
Lines are parsed from **brand detail pages** on htreviews.org.

**URL Structure:**
- Brand detail page: `https://htreviews.org/tobaccos/{brand-slug}`
- Example: `https://htreviews.org/tobaccos/dogma`

## Fields to PARSE

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Line name | "Лимитированные вкусы", "Основная", "Сигарный моносорт" |
| `brandId` | UUID (FK) | Reference to brand this line belongs to | UUID from brands table |
| `description` | text (nullable) | Line description | "Вкусы, которые Догма выпускает ограниченным тиражом." |
| `imageUrl` | string (nullable) | URL of line product image | "https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp" |
| `strengthOfficial` | string (nullable) | Official strength classification | "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая", "Не указано" |
| `strengthByRatings` | string (nullable) | Strength based on user ratings | "Лёгкая", "Средне-лёгкая", "Средняя", "Средне-крепкая", "Крепкая" |
| `status` | string (nullable) | Production status | "Выпускается", "Лимитированная", "Снята с производства" |
| `rating` | number (nullable) | Overall line rating | 4.8, 4.3, 4.6 |
| `ratingsCount` | number (nullable) | Number of ratings | 154, 365, 553 |

### Fields to NOT PARSE

| Field | Reason |
|-------|--------|
| `website` | Brand-specific, not line-specific |
| `flavorsCount` | Can be calculated from tobaccos table |
| `dateAdded` | Not needed for lines |
| `reviewsCount` | Not needed for lines |
| `views` | Not needed for lines |

## Data Examples

### Example 1: Dogma - Лимитированные вкусы

```json
{
  "name": "Лимитированные вкусы",
  "brandId": "uuid-from-brands-table",
  "description": "Вкусы, которые Догма выпускает ограниченным тиражом.",
  "imageUrl": "https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp",
  "strengthOfficial": "Средне-крепкая",
  "strengthByRatings": "Средняя",
  "status": "Лимитированный",
  "rating": 4.8,
  "ratingsCount": 154
}
```

### Example 2: Dogma - Сигарный моносорт

```json
{
  "name": "Сигарный моносорт",
  "brandId": "uuid-from-brands-table",
  "description": "Компания Догма объявила своей целью стать производителем с самым большим ассортиментом качественной сигарной неароматики в мире. Догма нашла множество сигарных листов по всему свету и объединила их все в линейку \"Сигарный моносорт\". Чтобы сделать линейку более понятной для кальянных энтузиастов, на этикетках разместили не только название каждого из сортов, но и страну произрастания, крепость, год урожая и срок выдержки, а также розу вкуса — те дескрипторы, которые специалисты компании определили во время дегустации этих листов.",
  "imageUrl": "https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp",
  "strengthOfficial": "Смешанная",
  "strengthByRatings": "Средняя",
  "status": "Выпускается",
  "rating": 4.6,
  "ratingsCount": 553
}
```

### Example 3: Dogma - Догма 2019-2022

```json
{
  "name": "Догма 2019-2022",
  "brandId": "uuid-from-brands-table",
  "description": "Первая линейка табака Догма, выпускавшаяся в 2019-2022 году на бленде из сигарного листа (47%) и Вирджинии голд (53%). С 2023 года выпуск приостановлен и осуществлен переход на 100% сигарное сырье.",
  "imageUrl": "https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp",
  "strengthOfficial": "Крепкая",
  "strengthByRatings": "Средняя",
  "status": "Снята с производства",
  "rating": 4.2,
  "ratingsCount": 404
}
```

### Example 4: Bonche - Основная

```json
{
  "name": "Основная",
  "brandId": "uuid-from-brands-table",
  "description": "Основная линейка табачного бренда Bonche",
  "imageUrl": "https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp",
  "strengthOfficial": "Крепкая",
  "strengthByRatings": "Средне-крепкая",
  "status": "Выпускается",
  "rating": 4.3,
  "ratingsCount": 2035
}
```

### Example 5: Bonche - Notes (ex. 5%)

```json
{
  "name": "Notes (ex. 5%)",
  "brandId": "uuid-from-brands-table",
  "description": "Notes — профессиональный инструмент для миксологии, благодаря которому ваше любимое сочетание будет звучать по-новому. Уникальные ароматы из категорий специй, пряностей и трав, создадут гармонию в миксе, расставив акценты внутри вашего произведения.",
  "imageUrl": "https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp",
  "strengthOfficial": "Крепкая",
  "strengthByRatings": "Средняя",
  "status": "Выпускается",
  "rating": 4.6,
  "ratingsCount": 365
}
```

## Parsing Strategy

For each brand:
1. Navigate to brand detail page: `https://htreviews.org/tobaccos/{brand-slug}`
2. Locate "Линейки (X)" section
3. For each line in section extract URL slug
4. Navigate to each line detail page: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}`:
   - Extract line name
   - Extract rating (number)
   - Extract strength official (Крепость официальная)
   - Extract strength by ratings (Крепость по оценкам)
   - Extract status (Статус)
   - Extract description
   - Extract ratings count
   - Extract imageUrl

## URL Patterns

**Brand Detail Page:**
- Pattern: `https://htreviews.org/tobaccos/{brand-slug}`
- Example: `https://htreviews.org/tobaccos/dogma`

**Line Detail Page (for reference, not used for parsing):**
- Pattern: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}`
- Example: `https://htreviews.org/tobaccos/dogma/limitirovannyye-vkusy`

## Expected Scale

Based on analysis:
- ~272 brands
- Average: ~3-5 lines per brand
- **Total lines: ~800-1,400**

## Implementation Notes

### Brand Identification
When parsing lines from brand pages, need to match brand slug to brand ID in database:
1. First, parse all brands and store slug → ID mapping
2. When parsing lines, lookup brand ID by slug

### Duplicate Prevention
- Line name + brandId should be unique
- If line already exists, update data instead of creating duplicate

### Error Handling
- Skip brands that don't have a "Линейки" section
- Handle missing fields gracefully (use null for nullable fields)
- Log lines that fail to parse for manual review

### Incremental Updates
- On subsequent runs, update existing lines instead of recreating
- Check if description, rating, or counts have changed
- Update only if data has changed

## Database Schema Changes Required

### Current Line Entity
```typescript
{
  id: string (UUID)
  name: string
  brandId: string (FK)
  description: string (nullable)
  createdAt: Date
  updatedAt: Date
}
```

### Required Changes
Add following fields to `Line` entity:
```typescript
{
  // ... existing fields ...
  imageUrl: string (nullable)
  strengthOfficial: string (nullable)
  strengthByRatings: string (nullable)
  status: string (nullable)
  rating: number (nullable)
  ratingsCount: number (nullable)
}
```

### Indexes to Add
```sql
CREATE INDEX idx_lines_brand_id ON lines(brandId);
CREATE INDEX idx_lines_rating ON lines(rating);
CREATE INDEX idx_lines_status ON lines(status);
CREATE INDEX idx_lines_strength ON lines(strengthOfficial);
```

## Next Steps

1. ✅ Create migration to add new fields to Line entity
2. ✅ Implement parser for brand detail pages
3. ✅ Implement line data extraction logic
4. ✅ Add error handling and logging
5. ✅ Test with sample brands (Dogma, Bonche, etc.)
6. ✅ Run full parsing for all brands
7. ⏳ Write unit tests for parser
8. ⏳ Write integration tests

---

**IMPORTANT**: This file is temporary and should be deleted after implementation.
