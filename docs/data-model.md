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
