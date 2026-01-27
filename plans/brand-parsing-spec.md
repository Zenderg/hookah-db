# Brand Parsing Specification

## Overview
This document specifies the data requirements for parsing brand information from htreviews.org.

## URL Structure

### Brand Categories
The website divides brands into two categories:

1. **Best Brands** (Лучшие)
   - URL: `https://htreviews.org/tobaccos/brands?r=position&s=rating&d=desc`
   - Contains: ~54 brands
   - Brands with highest ratings and most reviews

2. **All Other Brands** (Все остальные)
   - URL: `https://htreviews.org/tobaccos/brands?r=others&s=rating&d=desc`
   - Contains: ~218+ brands
   - Brands with fewer reviews or lower ratings

**Total brands**: ~272+ (54 + 218+)

### Pagination
- **Infinite Scroll**: Both categories use infinite scroll loading
- **Loading mechanism**: Brands are loaded dynamically as user scrolls down
- **No traditional pagination**: No page numbers or "next/previous" buttons

## Data Fields

### Fields to PARSE (Required)

| Field | Type | Source | Description | Example |
|-------|------|--------|-------------|---------|
| `name` | string | List page or Detail page | Brand name (original as shown on site) | "Догма", "Lezzet", "Tangiers" |
| `country` | string | List page or Detail page | Country of origin | "Россия", "США", "ОАЭ", "Не указано" |
| `rating` | number | List page or Detail page | Average rating (0-5) | 4.5, 5.0, 4.3 |
| `ratingsCount` | number | List page or Detail page | Number of ratings | 3266, 1, 1121 |
| `description` | string | Detail page | Brand description text | "Бренд табака для кальяна на основе сигарного табачного листа..." |
| `logoUrl` | string | Detail page | URL to brand logo image | "https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp" |

### Fields to NOT PARSE (Excluded)

| Field | Reason |
|-------|--------|
| `website` | Not required per user requirements |
| `yearFounded` | Not required per user requirements |
| `status` | Not required per user requirements |
| `dateAdded` | Not required per user requirements |
| `reviewsCount` | Not required per user requirements |
| `views` | Not required per user requirements |

## Data Structure Examples

### Example 1: Dogma (Best Brand)
```json
{
  "name": "Догма",
  "country": "Россия",
  "rating": 4.5,
  "ratingsCount": 3266,
  "description": "Бренд табака для кальяна на основе сигарного табачного листа. Известен нетривиальными ароматами и безароматическими блендами. Варится тайным обществом кальянных мастеров в г. Ижевск на собственном производстве.",
  "logoUrl": "https://htreviews.org/uploads/objects/1/ec550455706323552dfe1ebf9218111db8735d9d.webp"
}
```

### Example 2: Lezzet (Other Brand)
```json
{
  "name": "Lezzet",
  "country": "Россия",
  "rating": 5.0,
  "ratingsCount": 1,
  "description": "Безникотиновая смесь смесь для кальяна",
  "logoUrl": "https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp"
}
```

### Example 3: Tangiers (Best Brand)
```json
{
  "name": "Tangiers",
  "country": "США",
  "rating": 4.3,
  "ratingsCount": 1121,
  "description": "Легендарный американский табак для кальяна. Один из первых табаков на листе Берли. Наиболее популярная линейка - Noir, имеет довольно высокую крепость.",
  "logoUrl": "https://htreviews.org/uploads/objects/1/ec550455706323552dfe1ebf9218111db8735d9d.webp"
}
```

## Parsing Strategy

### Phase 1: Parse Brand List Pages
1. Navigate to `https://htreviews.org/tobaccos/brands` (Best Brands)
2. Extract basic data from list items:
   - Brand name
   - Country
   - Rating
   - Ratings count
   - Brand detail page URL
3. Scroll down to trigger infinite scroll
4. Repeat until no new brands load
5. Navigate to `https://htreviews.org/tobaccos/brands?r=others` (All Other Brands)
6. Repeat steps 2-4

### Phase 2: Parse Brand Detail Pages
For each brand:
1. Navigate to brand detail page (URL from Phase 1)
2. Extract:
   - Logo URL (from `<img>` tag with alt="[brand name]"`)
   - Full description
3. Combine with data from Phase 1

### Infinite Scroll Implementation
- Use Playwright's `page.evaluate()` to scroll to bottom
- Wait for new content to load (use `page.waitForSelector()` or timeout)
- Repeat until no new brands appear
- Track loaded brands by URL or name to avoid duplicates

## HTML Structure Reference

### List Page Brand Item
```html
<div class="brand-item">
  <a href="/tobaccos/[brand-slug]">
    <img src="[logo-url]" alt="[brand-name]">
  </a>
  <a href="/tobaccos/[brand-slug]">
    <span>[brand-name]</span>
    <span>[country]</span>
  </a>
  <div class="stats">
    <span>[rating]</span>
    <span>[ratings-count]</span>
    <span>[reviews-count]</span>
    <span>[views]</span>
  </div>
  <p>[description]</p>
</div>
```

### Detail Page Structure
```html
<div class="brand-header">
  <img src="[logo-url]" alt="[brand-name]">
  <h1>[brand-name]</h1>
  <p>[description]</p>
  <div class="info">
    <div><label>Сайт</label><span>[website]</span></div>
    <div><label>Страна</label><span>[country]</span></div>
    <div><label>Год основания</label><span>[year-founded]</span></div>
    <div><label>Статус</label><span>[status]</span></div>
    <div><label>Добавлен на сайт</label><span>[date-added]</span></div>
  </div>
  <div class="rating">
    <img src="[rating-star-image]">
    <span>[rating]</span>
    <span>[ratings-count]</span>
    <span>[reviews-count]</span>
    <span>[views]</span>
  </div>
</div>
```

## Data Normalization

### Rating
- Type: `number`
- Range: 0-5
- Format: Decimal with one digit (e.g., 4.5, 5.0, 4.3)

### Ratings Count
- Type: `number`
- Format: Integer (e.g., 3266, 1, 1121)

### Country
- Type: `string`
- Values: As shown on site (e.g., "Россия", "США", "ОАЭ", "Не указано")
- No translation required

### Logo URL
- Type: `string`
- Format: Full URL starting with `https://htreviews.org/uploads/objects/1/`
- File extension: `.webp`
- Example: `https://htreviews.org/uploads/objects/1/4ac4bcdca8022589f5acc8791c83ab93a8ab5af1.webp`

### Description
- Type: `string`
- Format: Plain text (no HTML)
- Length: Variable (short to long descriptions)

## Implementation Notes

### Playwright Configuration
```javascript
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
await page.goto('https://htreviews.org/tobaccos/brands');
```

### Infinite Scroll Handler
```javascript
async function scrollUntilNoNewContent(page, selector) {
  let previousCount = 0;
  let currentCount = 0;
  let noNewContentCount = 0;
  const maxNoNewContent = 3; // Stop after 3 consecutive scrolls with no new content

  while (noNewContentCount < maxNoNewContent) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000); // Wait for content to load

    currentCount = await page.$$eval(selector, elements => elements.length);

    if (currentCount === previousCount) {
      noNewContentCount++;
    } else {
      noNewContentCount = 0;
      previousCount = currentCount;
    }
  }
}
```

### Brand Item Selector
```javascript
const brandItems = await page.$$('[data-brand-item]'); // Adjust selector based on actual HTML
```

### Logo URL Extraction
```javascript
const logoUrl = await page.evaluate(() => {
  const logoImg = document.querySelector('img[alt="[brand-name]"]');
  return logoImg ? logoImg.src : null;
});
```

## Validation Rules

### Required Fields
All 6 fields (name, country, rating, ratingsCount, description, logoUrl) are required.

### Data Quality Checks
- `rating`: Must be between 0 and 5
- `ratingsCount`: Must be >= 0
- `country`: Must not be empty
- `name`: Must not be empty
- `logoUrl`: Must be a valid URL starting with `https://htreviews.org/`

### Duplicate Detection
- Check for duplicate brand names
- Check for duplicate logo URLs
- Skip or update existing brands based on configuration

## Error Handling

### Missing Data
- If logo URL is missing: Set to null or default placeholder
- If description is missing: Set to empty string
- If rating is missing: Set to null
- Log all missing data for manual review

### Network Errors
- Retry failed requests (up to 3 times)
- Implement exponential backoff
- Log all network errors

### Parsing Errors
- Log brand URL and error details
- Continue with next brand on error
- Generate error report after parsing completes

## Performance Considerations

### Rate Limiting
- Add delays between page navigations (1-2 seconds)
- Respect server load

### Memory Management
- Process brands in batches (e.g., 50 at a time)
- Clear page content after processing each brand

### Caching
- Cache brand detail pages if needed for re-parsing
- Store parsed data incrementally to database

## Testing

### Test Cases
1. Parse a brand from "Лучшие" category
2. Parse a brand from "Все остальные" category
3. Verify infinite scroll loads all brands
4. Test with brand that has "Не указано" country
5. Test with brand that has rating of 5.0
6. Test with brand that has only 1 rating

### Expected Output
- Total brands parsed: ~272+
- All required fields present
- No duplicate brands
- All logo URLs valid

## Next Steps

1. Implement parser using Playwright
2. Update Brand entity to include `logoUrl` field
3. Create migration for new field
4. Implement parsing logic in ParserService
5. Add error handling and logging
6. Test with sample brands
7. Run full parsing
8. Validate results
