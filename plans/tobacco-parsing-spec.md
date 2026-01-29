# Tobacco Parsing Specification

## Overview

This document specifies how to parse tobacco (Табаки) data from htreviews.org for the hookah tobacco database API.

**IMPORTANT**: Files in `plans/` directory are temporary and should be deleted after implementation.

## Data Source

- **Website**: htreviews.org
- **Expected scale**: ~11,861 tobaccos total
- **Data location**: Tobacco detail pages
- **URL structure**:
  - Tobacco detail page: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}`
  - Line detail page (list of tobaccos): `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}`

## Tobacco Detail Page Structure

Tobacco data is parsed from individual tobacco detail pages. Each page contains comprehensive information about a single tobacco product.

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Tobacco Image (URL)                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Name - e.g., "Темный шоколад"                 │  │
│  │  Description - e.g., "Вкус темного шоколада."    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Brand: Bonche (link)                             │  │
│  │  Line: Основная (link)                            │  │
│  │  Country: Россия                                  │  │
│  │  Strength Official: Крепкая                        │  │
│  │  Strength By Ratings: Средне-крепкая               │  │
│  │  Status: Выпускается                             │  │
│  │  HtreviewsID: htr96739                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Rating: 4.7                                    │  │
│  │  Ratings: 174                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Fields to PARSE (12 total)

### 1. name (string)
**Purpose**: Tobacco name as displayed on the website (can be Russian or English)
**Location**: Heading element (H1)
**Examples**:
- "Темный шоколад" (Russian name)
- "Dark Chocolate" (English name)
- "Банан желтый" (Russian name)
- "New Year 2026" (English name)

**Note**: Parse name exactly as it appears on the website, regardless of language.

### 2. brandId (string, FK)
**Purpose**: Foreign key to brands table
**Location**: Brand link in tobacco details
**Mapping**: Extract brand slug from URL and map to brand.id
**Examples**:
- Brand link: `https://htreviews.org/tobaccos/bonche` → brandId = UUID of "Bonche"
- Brand link: `https://htreviews.org/tobaccos/dogma` → brandId = UUID of "Догма"

### 3. lineId (string, FK, nullable)
**Purpose**: Foreign key to lines table
**Location**: Line link in tobacco details
**Mapping**: Extract line slug from URL and map to line.id
**Examples**:
- Line link: `https://htreviews.org/tobaccos/bonche/main` → lineId = UUID of "Основная"
- Line link: `https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank` → lineId = UUID of "100% сигарный панк"

**Note**: Some tobaccos may not belong to a line (lineId = null).

### 4. rating (decimal, 0-5 scale)
**Purpose**: Average rating from all user reviews
**Location**: Large rating number in rating box
**Examples**:
- 4.7 (Dark Chocolate)
- 4.4 (Банан желтый)
- 5.0 (perfect rating)

### 5. ratingsCount (number)
**Purpose**: Total number of ratings submitted
**Location**: Second number in rating box (after rating)
**Examples**:
- 174 (Dark Chocolate)
- 64 (Банан желтый)
- 1 (new tobacco with single rating)

### 6. country (string)
**Purpose**: Country of origin
**Location**: Country field in tobacco details
**Examples**:
- "Россия" (Russia)
- "Германия" (Germany)
- "США" (USA)
- "Турция" (Turkey)

### 7. strengthOfficial (string, nullable)
**Purpose**: Official strength rating from manufacturer
**Location**: "Крепость официальная" field
**Possible values**:
- "Лёгкая" (Light)
- "Средне-лёгкая" (Medium-light)
- "Средняя" (Medium)
- "Средне-крепкая" (Medium-strong)
- "Крепкая" (Strong)
- "Не указано" (Not specified)
- null (field not present)

**Examples**:
- "Крепкая" (Dark Chocolate)
- "Средне-крепкая" (Банан желтый)
- "Средняя" (some tobaccos)
- null (if not specified)

### 8. strengthByRatings (string, nullable)
**Purpose**: Strength rating based on user reviews
**Location**: "Крепость по оценкам" field
**Possible values**:
- "Лёгкая" (Light)
- "Средне-лёгкая" (Medium-light)
- "Средняя" (Medium)
- "Средне-крепкая" (Medium-strong)
- "Крепкая" (Strong)
- "Не указано" (Not specified)
- null (field not present)

**Examples**:
- "Средне-крепкая" (Dark Chocolate)
- "Средняя" (Банан желтый)
- "Крепкая" (strong tobacco)
- null (if not enough ratings)

**⚠️ CRITICAL ISSUE**: The current entity defines this field as `decimal` but the website stores it as STRING. This is a bug that must be fixed before implementation.

### 9. status (string, nullable)
**Purpose**: Current production status
**Location**: "Статус" field
**Possible values**:
- "Выпускается" (In production)
- "Лимитированная" (Limited edition)
- "Снята с производства" (Discontinued)
- null (field not present)

**Examples**:
- "Выпускается" (Dark Chocolate)
- "Выпускается" (Банан желтый)
- "Лимитированная" (limited edition tobacco)
- "Снята с производства" (discontinued tobacco)

### 10. htreviewsId (string, unique)
**Purpose**: Unique identifier from htreviews.org
**Location**: "HtreviewsID" field
**Format**: "htr" prefix + numeric ID
**Examples**:
- "htr96739" (Dark Chocolate)
- "htr198516" (Банан желтый)
- "htr12345" (example)

**Note**: This field must be unique in the database.

### 11. imageUrl (string)
**Purpose**: URL of tobacco product image
**Location**: Tobacco image element
**Parsing**: Extract image src attribute
**Examples**:
- `https://htreviews.org/uploads/objects/1/b92b3dc00c4d985b47225ce428bd84912b5a0f7f.webp`
- `https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp`
- `https://htreviews.org/uploads/objects/1/abc123def456.webp`

**Note**: Images are typically in `.webp` format and hosted on `htreviews.org/uploads/objects/1/`.

### 12. description (text)
**Purpose**: Detailed description of the tobacco
**Location**: Description text below name
**Examples**:
- "Вкус темного шоколада." (Dark Chocolate - short description)
- "Какой мы хотели сделать банан? — Без травянистой ноты, которая часто мешает получить удовольствие от банановых вкусов; — Без перегруза — не химозный, не душный, не «десерт из пластика»; — Только чистый, мягкий, сливочный банан. В меру сладкий и максимально натуральный; — С изюминкой: через 10–15 минут он слегка вяжет, создавая эффект плотности и тела — будто бы вкус сам подсказывает: «здесь можно остаться надолго»." (Банан желтый - long description)
- "Новый год, новый вкус. Ваниль, карамель, мята." (New Year 2026)

**Note**: Description can be short or long, depending on the tobacco.

## Fields to NOT PARSE

### 1. reviewsCount (number)
**Reason**: Not required per user requirements
**Status**: Field exists in entity but should be removed

### 2. views (number)
**Reason**: Not required per user requirements
**Status**: Field exists in entity but should be removed

### 3. category (string)
**Reason**: Not required per user requirements
**Status**: Field exists in entity but should be removed

### 4. flavorDescriptors (string array)
**Reason**: Not required per user requirements
**Status**: Field exists in entity but should be removed

### 5. dateAdded (Date)
**Reason**: Not required per user requirements
**Status**: Field exists in entity but should be removed

### 6. year (number)
**Reason**: Not available on htreviews.org tobacco detail pages
**Status**: Field exists in entity but has no data source

### 7. tier (string)
**Reason**: Not available on htreviews.org tobacco detail pages
**Status**: Field exists in entity but has no data source

### 8. addedBy (user)
**Reason**: Field exists on website ("Добавил") but not in entity
**Status**: Not included in current database schema
**Examples**:
- "AlexeyV" (user who added Банан желтый)
- Other usernames

## Entity Changes Required

### Fields to Remove from Entity

1. **nameRu** (string) - Replace with single `name` field
2. **nameEn** (string) - Replace with single `name` field
3. **reviewsCount** (number) - Not required
4. **views** (number) - Not required
5. **category** (string) - Not required
6. **productionStatus** (string) - Replace with `status`
7. **flavorDescriptors** (string array) - Not required
8. **dateAdded** (Date) - Not required
9. **year** (number) - No data source
10. **tier** (string) - No data source

## Parsing Strategy

### Phase 1: Get Line Data
1. Use already parsed brands and lines data
2. For each line, navigate to line detail page: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}`
3. Extract list URLs of tobaccos from line page

### Phase 2: Parse Tobacco Detail Pages
For each tobacco:
1. Navigate to tobacco detail page: `https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}`
2. Extract all 12 fields listed above
3. Map brandId from brand slug (lookup in brands table)
4. Map lineId from line slug (lookup in lines table)
5. Save to database

### Data Validation
- Ensure htreviewsId is unique (skip duplicates)
- Parse image URL correctly (extract src attribute)
- Handle null values for optional fields
- Map brandId and lineId correctly (must exist in respective tables)

## Data Examples

### Example 1: Dark Chocolate (Bonche - Основная)
```json
{
  "name": "Dark Chocolate",
  "brandId": "uuid-of-bonche",
  "lineId": "uuid-of-osnovnaya",
  "rating": 4.7,
  "ratingsCount": 174,
  "country": "Россия",
  "strengthOfficial": "Крепкая",
  "strengthByRatings": "Средне-крепкая",
  "status": "Выпускается",
  "htreviewsId": "htr96739",
  "imageUrl": "https://htreviews.org/uploads/objects/7/a9607cb15acb3e5b450e926741a77154.webp",
  "description": "Вкус темного шоколада."
}
```

### Example 2: Банан желтый (Dogma - 100% сигарный панк)
```json
{
  "name": "Банан желтый",
  "brandId": "uuid-of-dogma",
  "lineId": "uuid-of-100-sigarnyy-pank",
  "rating": 4.4,
  "ratingsCount": 64,
  "country": "Россия",
  "strengthOfficial": "Средне-крепкая",
  "strengthByRatings": "Средняя",
  "status": "Выпускается",
  "htreviewsId": "htr198516",
  "imageUrl": "https://htreviews.org/uploads/objects/6/65e072106e2daf1480016bed729de884.webp",
  "description": "Какой мы хотели сделать банан? — Без травянистой ноты, которая часто мешает получить удовольствие от банановых вкусов; — Без перегруза — не химозный, не душный, не «десерт из пластика»; — Только чистый, мягкий, сливочный банан. В меру сладкий и максимально натуральный; — С изюминкой: через 10–15 минут он слегка вяжет, создавая эффект плотности и тела — будто бы вкус сам подсказывает: «здесь можно остаться надолго»."
}
```

### Example 3: New Year 2026 (Bonche - Основная)
```json
{
  "name": "New Year 2026",
  "brandId": "uuid-of-bonche",
  "lineId": "uuid-of-osnovnaya",
  "rating": 3.3,
  "ratingsCount": 12,
  "country": "Россия",
  "strengthOfficial": "Средняя",
  "strengthByRatings": "Средне-крепкая",
  "status": "Лимитированный",
  "htreviewsId": "htr199139",
  "imageUrl": "https://htreviews.org/uploads/objects/7/f1f2a808eb82f0c217f80a9f4125d242.webp",
  "description": "Сочетание какао, сладкого кленового сиропа и тёплой пряной корицы создаёт уютный и праздничный аромат. Сладость кленового сиропа плавно переплетается с шоколадными оттенками какао, а корица добавляет завершённую пряную ноту, делая композицию насыщенной и сбалансированной."
}
```

## Implementation Notes

1. **Parsing Order**: Parse brands first, then lines, then tobaccos (dependencies)
2. **Foreign Key Mapping**: Must lookup brandId and lineId from parsed data
3. **Unique Constraint**: htreviewsId must be unique (enforce in database)
4. **Null Handling**: Many fields are nullable, handle gracefully
5. **Image URL Parsing**: Extract src attribute from image element
6. **String vs Number**: strengthByRatings is STRING, not decimal (fix entity first)
7. **Name Language**: Parse name exactly as it appears on website (Russian or English)
