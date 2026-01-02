# Data Model

## Core Entities

### Brand

Represents a tobacco brand or manufacturer.

**Purpose**: Groups related tobacco products under a common brand identity.

**Fields**:
- **Unique Identifier**: System-generated identifier for the brand
- **Name**: The brand name as displayed on the source website
- **Description**: Detailed description of the brand, including history or characteristics
- **Image URL**: Link to the brand's logo or representative image
- **Source URL**: The original page URL where brand data was scraped
- **Created At**: Timestamp when the brand record was first created
- **Updated At**: Timestamp when the brand record was last modified

**Relationships**:
- One-to-many with Product: A brand can have multiple products
- No parent relationships: Brands are top-level entities

### Product

Represents an individual tobacco product or flavor.

**Purpose**: Stores detailed information about specific tobacco products.

**Fields**:
- **Unique Identifier**: System-generated identifier for the product
- **Name**: The product name as displayed on the source website
- **Description**: Detailed description of the product, including flavor notes and characteristics
- **Image URL**: Link to the product's packaging or representative image
- **Source URL**: The original page URL where product data was scraped
- **Created At**: Timestamp when the product record was first created
- **Updated At**: Timestamp when the product record was last modified

**Relationships**:
- Many-to-one with Brand: Each product belongs to exactly one brand
- No child relationships: Products are leaf entities

### API Key

Represents a client authentication credential.

**Purpose**: Controls access to the API by validating client requests.

**Fields**:
- **Unique Identifier**: System-generated identifier for the key
- **Key Value**: The actual API key string used for authentication
- **Name**: Human-readable name or description of the key (e.g., client name)
- **Active Status**: Boolean flag indicating whether the key is currently valid
- **Created At**: Timestamp when the key was generated
- **Last Used At**: Timestamp of the most recent successful authentication
- **Expires At**: Optional timestamp when the key should become invalid

**Relationships**:
- No parent or child relationships: Keys are independent entities

### Scraping Metadata

Tracks information about scraping operations.

**Purpose**: Monitors the health and status of data ingestion processes.

**Fields**:
- **Unique Identifier**: System-generated identifier for the metadata record
- **Operation Type**: Type of scraping operation (full refresh, incremental update)
- **Status**: Current state of the operation (in progress, completed, failed)
- **Started At**: Timestamp when the scraping operation began
- **Completed At**: Timestamp when the scraping operation finished
- **Brands Processed**: Count of brands successfully processed
- **Products Processed**: Count of products successfully processed
- **Error Count**: Number of errors encountered during the operation
- **Error Details**: Structured information about any errors that occurred

**Relationships**:
- No parent or child relationships: Metadata records are independent

## Parser Data Types

The HTML parser ([`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1)) uses TypeScript interfaces defined in [`scraper/src/types.ts`](scraper/src/types.ts:1) to represent parsed data structures. These types ensure type safety and provide clear contracts for parser functions.

### ParsedBrand

Represents a brand extracted from the brand listing page.

**Purpose**: Temporary structure for brand data during parsing before database insertion.

**Fields**:
- **name**: The brand name as extracted from the HTML
- **slug**: URL slug for constructing the source URL
- **sourceUrl**: The complete URL to the brand's detail page

**Usage**:
- Returned by [`parseBrandList()`](scraper/src/html-parser.ts:135)
- Used to queue brands for detailed scraping
- Converted to database Brand entity after full extraction

### ParsedBrandDetail

Represents detailed brand information extracted from a brand detail page.

**Purpose**: Complete brand data including all available fields from the brand page.

**Fields**:
- **name**: The brand name (prefers English name if multiple names present)
- **description**: Optional detailed description of the brand
- **imageUrl**: Optional URL to the brand's logo or representative image
- **sourceUrl**: The complete URL to the brand's detail page

**Usage**:
- Returned by [`parseBrandDetail()`](scraper/src/html-parser.ts:250)
- Contains all fields needed for database insertion
- Handles missing optional fields gracefully

### ParsedProduct

Represents a product extracted from a brand page product list.

**Purpose**: Temporary structure for product data during parsing before database insertion.

**Fields**:
- **name**: The product name as extracted from the HTML
- **slug**: URL slug for constructing the source URL
- **sourceUrl**: The complete URL to the product's detail page

**Usage**:
- Returned by [`parseProductList()`](scraper/src/html-parser.ts:307)
- Used to queue products for detailed scraping
- Converted to database Product entity after full extraction

### ParsedProductDetail

Represents detailed product information extracted from a product detail page.

**Purpose**: Complete product data including all available fields from the product page.

**Fields**:
- **name**: The product name
- **description**: Optional detailed description of the product
- **imageUrl**: Optional URL to the product's packaging or representative image
- **sourceUrl**: The complete URL to the product's detail page

**Usage**:
- Returned by [`parseProductDetail()`](scraper/src/html-parser.ts:421)
- Contains all fields needed for database insertion
- Handles missing optional fields gracefully

### HTMXPagination

Represents pagination metadata extracted from HTMX data attributes.

**Purpose**: Provides information about pagination state and completion status.

**Fields**:
- **target**: The HTMX endpoint URL for fetching next page
- **offset**: Current offset in the paginated list
- **count**: Number of items in current page
- **totalCount**: Total number of items available across all pages

**Usage**:
- Returned by [`parseHTMXPagination()`](scraper/src/html-parser.ts:88)
- Used by completion detection functions
- Enables iterative loading with proper state tracking

**Completion Logic**:
- Discovery is complete when: `offset + count >= totalCount`
- Allows for dynamic content loading with clear completion criteria

### ParseError

Custom error class for parsing failures with detailed context.

**Purpose**: Provides actionable error information for debugging parsing issues.

**Fields**:
- **message**: Human-readable error description
- **selector**: CSS selector that failed to match (if applicable)
- **htmlPreview**: HTML snippet around the error location for debugging

**Usage**:
- Thrown by parser functions when critical parsing failures occur
- Includes context to identify the exact location of the error
- Helps developers quickly diagnose and fix parsing issues

**Implementation**: [`scraper/src/parser-error.ts`](scraper/src/parser-error.ts:1)

## Normalized Data Types

The data normalization module ([`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1)) transforms parsed data into normalized formats ready for storage. These types include validation metadata and standardized fields.

### NormalizedBrand

Represents normalized brand data ready for storage.

**Purpose**: Cleaned and validated brand data with standardized format.

**Fields**:
- **slug**: Unique slug identifier for the brand (lowercase, hyphenated)
- **name**: Cleaned brand name (whitespace normalized)
- **description**: Optional cleaned brand description
- **imageUrl**: Optional normalized image URL (absolute, tracking parameters removed)
- **sourceUrl**: Normalized source URL (absolute, tracking parameters removed)
- **scrapedAt**: ISO 8601 timestamp when data was scraped

**Usage**:
- Returned by [`normalizeBrandData()`](scraper/src/data-normalizer.ts:212)
- Validated by [`validateBrandData()`](scraper/src/data-normalizer.ts:316)
- Checked for duplicates by [`addBrand()`](scraper/src/duplicate-detector.ts:69)
- Ready for database insertion

### NormalizedProduct

Represents normalized product data ready for storage.

**Purpose**: Cleaned and validated product data with standardized format and brand association.

**Fields**:
- **slug**: Unique slug identifier for the product (lowercase, hyphenated)
- **name**: Cleaned product name (whitespace normalized)
- **description**: Optional cleaned product description
- **imageUrl**: Optional normalized image URL (absolute, tracking parameters removed)
- **sourceUrl**: Normalized source URL (absolute, tracking parameters removed)
- **brandSlug**: Brand slug for association with parent brand
- **scrapedAt**: ISO 8601 timestamp when data was scraped

**Usage**:
- Returned by [`normalizeProductData()`](scraper/src/data-normalizer.ts:237)
- Validated by [`validateProductData()`](scraper/src/data-normalizer.ts:366)
- Checked for duplicates by [`addProduct()`](scraper/src/duplicate-detector.ts:101)
- Ready for database insertion

### NormalizedBrandDetail

Represents normalized brand detail data ready for storage.

**Purpose**: Complete normalized brand data with all available fields from brand detail pages.

**Fields**:
- **slug**: Unique slug identifier for the brand (lowercase, hyphenated)
- **name**: Cleaned brand name (whitespace normalized)
- **description**: Optional cleaned brand description
- **imageUrl**: Optional normalized image URL (absolute, tracking parameters removed)
- **sourceUrl**: Normalized source URL (absolute, tracking parameters removed)
- **scrapedAt**: ISO 8601 timestamp when data was scraped

**Usage**:
- Returned by [`normalizeBrandDetailData()`](scraper/src/data-normalizer.ts:264)
- Validated by [`validateBrandData()`](scraper/src/data-normalizer.ts:316)
- Ready for database insertion

### NormalizedProductDetail

Represents normalized product detail data ready for storage.

**Purpose**: Complete normalized product data with all available fields from product detail pages and brand association.

**Fields**:
- **slug**: Unique slug identifier for the product (lowercase, hyphenated)
- **name**: Cleaned product name (whitespace normalized)
- **description**: Optional cleaned product description
- **imageUrl**: Optional normalized image URL (absolute, tracking parameters removed)
- **sourceUrl**: Normalized source URL (absolute, tracking parameters removed)
- **brandSlug**: Brand slug for association with parent brand
- **scrapedAt**: ISO 8601 timestamp when data was scraped

**Usage**:
- Returned by [`normalizeProductDetailData()`](scraper/src/data-normalizer.ts:289)
- Validated by [`validateProductData()`](scraper/src/data-normalizer.ts:366)
- Ready for database insertion

### ValidationResult

Represents the result of data validation.

**Purpose**: Provides structured validation results with specific error messages.

**Fields**:
- **isValid**: Boolean indicating whether data passed all validation rules
- **errors**: Array of validation error messages (empty if valid)

**Usage**:
- Returned by [`validateBrandData()`](scraper/src/data-normalizer.ts:316) and [`validateProductData()`](scraper/src/data-normalizer.ts:366)
- Used to determine if data should be stored or rejected
- Logged by [`logInvalidData()`](scraper/src/data-normalizer.ts:422) for debugging

### DuplicateDetector

Represents the duplicate detection state for tracking brands and products across iterations.

**Purpose**: Provides efficient duplicate detection with O(1) lookup performance.

**Fields**:
- **brands**: Set of brand slugs (case-insensitive) for O(1) duplicate checking
- **products**: Map of brand slugs to product slug sets (case-insensitive) for brand-specific duplicate checking
- **totalCount**: Total count of all items tracked (brands + products)

**Usage**:
- Created by [`createDuplicateDetector()`](scraper/src/duplicate-detector.ts:44)
- Updated by [`addBrand()`](scraper/src/duplicate-detector.ts:69) and [`addProduct()`](scraper/src/duplicate-detector.ts:101)
- Queried by [`hasBrand()`](scraper/src/duplicate-detector.ts:139), [`hasProduct()`](scraper/src/duplicate-detector.ts:159), [`getBrandCount()`](scraper/src/duplicate-detector.ts:179), [`getProductCount()`](scraper/src/duplicate-detector.ts:195), etc.
- Reset by [`clear()`](scraper/src/duplicate-detector.ts:235) for new scraping sessions

## Data Validation Rules

### Field Length Limits

- **MAX_TEXT_LENGTH**: 10000 characters for description fields
- **MAX_NAME_LENGTH**: 500 characters for name and slug fields
- **MAX_URL_LENGTH**: 2000 characters for URL fields

### Required Fields

**For Brands:**
- slug: Required, non-empty, maximum 500 characters
- name: Required, non-empty, maximum 500 characters
- sourceUrl: Required, valid URL format, maximum 2000 characters

**For Products:**
- slug: Required, non-empty, maximum 500 characters
- name: Required, non-empty, maximum 500 characters
- sourceUrl: Required, valid URL format, maximum 2000 characters
- brandSlug: Required, non-empty, maximum 500 characters

### Optional Fields

**For Brands and Products:**
- description: Optional, maximum 10000 characters if present
- imageUrl: Optional, valid URL format, maximum 2000 characters if present

### URL Validation

- Must be valid URL format
- Must not exceed MAX_URL_LENGTH (2000 characters)
- Relative URLs are converted to absolute URLs
- Tracking parameters are removed (utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid)
- Invalid URLs return null instead of throwing errors

### Timestamp Validation

- scrapedAt must be a valid ISO 8601 timestamp
- Automatically generated when normalizing data
- Invalid timestamps cause validation failure

### Slug Generation Rules

- Converted to lowercase
- Special characters removed (keeps only alphanumeric, spaces, and hyphens)
- Spaces replaced with hyphens
- Leading/trailing hyphens removed
- Multiple consecutive hyphens normalized to single hyphen
- Can be extracted from URL or generated from name

## Entity Relationships

### Brand-Product Hierarchy

```
Brand (1) ──────── (*) Product
```

- Each product must be associated with exactly one brand
- A brand can have zero or more products
- Products cannot exist without a parent brand
- Deleting a brand should cascade to delete associated products

### Independent Entities

- API Keys: Standalone entities with no relationships to other data
- Scraping Metadata: Standalone entities used for monitoring and auditing

## Data Integrity Rules

### Uniqueness Constraints

- Brand names must be unique within the system
- Product names must be unique within their parent brand
- API key values must be globally unique

### Referential Integrity

- Every product must reference a valid brand
- Orphaned products (products without brands) are not allowed

### Data Validation

- Required fields must not be null or empty
- URLs must follow valid URL formats
- Timestamps must be valid date-time values
- Active status for API keys must be boolean

## Indexing Strategy

### Performance Considerations

- Brand names indexed for fast lookup and filtering
- Product names indexed for search within brands
- API key values indexed for fast authentication
- Timestamps indexed for sorting and filtering by date
- Brand foreign key on products indexed for efficient joins

## Data Lifecycle

### Creation

- Brands and products are created during scraping operations
- API keys are created through the key management utility
- Scraping metadata is created at the start of each operation

### Updates

- Brands and products are updated when re-scraping detects changes
- API keys are updated when status changes (activation/deactivation)
- Scraping metadata is updated as operations progress

### Deletion

- Brands and products are not typically deleted but may be soft-deleted
- API keys can be revoked by setting active status to false
- Scraping metadata is retained for historical analysis

## Data Consistency

### Transaction Boundaries

- Brand creation and its initial products are created in a single transaction
- Product updates are independent operations
- API key operations are atomic

### Concurrency Control

- Scraping operations use optimistic locking to prevent conflicts
- API key validation uses read-committed isolation level
- Multiple scraping operations should not run simultaneously

## Parser Type Safety

### TypeScript Interfaces

All parser functions use strongly-typed interfaces defined in [`scraper/src/types.ts`](scraper/src/types.ts:1):

- **ParsedBrand**: Brand data from listing pages
- **ParsedBrandDetail**: Complete brand data from detail pages
- **ParsedProduct**: Product data from brand pages
- **ParsedProductDetail**: Complete product data from detail pages
- **HTMXPagination**: Pagination metadata from HTMX attributes

### Type Guarantees

- All parser functions return consistent types
- Optional fields are explicitly marked with `| undefined`
- Required fields are enforced at compile time
- Type checking prevents common parsing errors

### Error Handling

- [`ParseError`](scraper/src/parser-error.ts:12) class provides detailed error context
- Errors include selector information for debugging
- HTML preview helps identify exact failure location
- Graceful degradation for non-critical parsing failures

## Normalization Type Safety

### TypeScript Interfaces

All normalization functions use strongly-typed interfaces defined in [`scraper/src/types.ts`](scraper/src/types.ts:1):

- **NormalizedBrand**: Normalized brand data ready for storage
- **NormalizedProduct**: Normalized product data ready for storage
- **NormalizedBrandDetail**: Normalized brand detail data ready for storage
- **NormalizedProductDetail**: Normalized product detail data ready for storage
- **ValidationResult**: Validation result with isValid flag and errors array
- **DuplicateDetector**: Duplicate detection state with brands Set and products Map

### Type Guarantees

- All normalization functions return consistent normalized types
- Optional fields are explicitly marked with `| undefined`
- Required fields are enforced at compile time
- Validation results provide structured error information
- Type checking prevents common normalization errors

### Error Handling

- [`logInvalidData()`](scraper/src/data-normalizer.ts:422) provides structured error logging
- Errors include specific field names and validation failures
- Data preview is truncated to 500 characters for readability
- Invalid URLs return null instead of throwing errors

## Duplicate Detection Type Safety

### TypeScript Interfaces

All duplicate detection functions use strongly-typed interfaces defined in [`scraper/src/types.ts`](scraper/src/types.ts:1):

- **DuplicateDetector**: Interface with brands Set, products Map, and totalCount
- Case-insensitive comparison via [`normalizeSlug()`](scraper/src/duplicate-detector.ts:30)

### Type Guarantees

- All duplicate detection functions return consistent boolean results
- Brand and product slugs are normalized to lowercase for comparison
- O(1) lookup performance guaranteed by Set and Map data structures
- Total count accurately reflects all tracked items

### Error Handling

- No exceptions thrown for duplicate detection
- Graceful handling of missing brand product sets
- Clear function resets all tracking state
