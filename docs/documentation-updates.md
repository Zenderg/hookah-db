# Documentation Update Guidelines

## When to Update Documentation

Documentation must be updated whenever changes are made to the project that affect the system's behavior, architecture, or operational procedures. Documentation should reflect the current state of the system at all times.

## Mandatory Update Triggers

### Architectural Changes

Update documentation when:

- New services or components are added to the system
- Existing services are removed or significantly refactored
- Communication patterns between services change
- Deployment architecture is modified
- Monorepository structure is reorganized

### Data Model Changes

Update documentation when:

- New entities are added to the database
- Existing entities are modified with new fields
- Relationships between entities change
- Constraints or indexes are added or removed
- Data lifecycle rules are modified

### API Changes

Update documentation when:

- New API endpoints are added
- Existing endpoints are modified (request/response structure)
- Authentication or authorization logic changes
- Rate limiting or throttling rules change
- Error response formats are modified

### Scraping Logic Changes

Update documentation when:

- New page types are added for scraping
- Data extraction logic is modified
- Error handling strategies change
- Rate limiting or retry logic is updated
- Scraping workflow is restructured
- HTML parser implementation or modification
- HTML parser implementation or modification
- Data normalization logic is added or modified
- Duplicate detection logic is added or modified

### Testing Changes

Update documentation when:

- New test categories are introduced
- Testing strategy or philosophy changes
- Coverage requirements are modified
- Testing infrastructure is significantly updated
- Example HTML files are added or removed
- Dynamic loading scenario tests are added or modified

### Operational Changes

Update documentation when:

- Deployment procedures change
- Environment configuration is modified
- Monitoring or alerting rules change
- Backup or recovery procedures are updated
- Security practices are enhanced

## Documentation Review Process

### Pre-Commit Review

Before committing code changes:

- Review all affected documentation files
- Ensure documentation accurately reflects the changes
- Update any diagrams or visual representations
- Verify that no outdated information remains

### Code Review Integration

Documentation updates should be part of the code review process:

- Reviewers must check for documentation updates
- Documentation-only changes should be reviewed separately
- Missing documentation updates should block merge
- Documentation quality is part of review criteria

### Post-Deployment Verification

After deploying changes:

- Verify documentation matches production behavior
- Update any operational procedures based on deployment experience
- Document any unexpected behaviors discovered
- Update troubleshooting guides with new issues

## Documentation Maintenance Responsibilities

### Developer Responsibilities

Every developer is responsible for:

- Updating documentation for their own code changes
- Reviewing documentation during code reviews
- Identifying outdated documentation when encountered
- Proposing improvements to documentation structure
- Maintaining clarity and accuracy of technical descriptions

### Technical Lead Responsibilities

The technical lead is responsible for:

- Ensuring documentation standards are followed
- Reviewing documentation quality during architectural discussions
- Identifying documentation gaps and assigning updates
- Maintaining documentation consistency across the project
- Facilitating documentation reviews for major changes

### Team Responsibilities

The development team collectively:

- Maintains documentation as a living resource
- Participates in documentation improvement discussions
- Shares knowledge through documentation updates
- Identifies areas needing better documentation
- Contributes to documentation during onboarding

## Documentation Quality Standards

### Clarity

Documentation must be:

- Written in clear, concise language
- Free of ambiguous terms or phrasing
- Understandable to developers unfamiliar with the codebase
- Structured logically with clear headings and sections

### Accuracy

Documentation must:

- Accurately reflect the current system state
- Contain no outdated information
- Be verified against actual implementation
- Be updated before code is merged to main branch

### Completeness

Documentation must:

- Cover all major system components
- Include all critical workflows and processes
- Describe all important configuration options
- Provide sufficient context for understanding

### Maintainability

Documentation must be:

- Organized in a logical structure
- Use consistent formatting and style
- Avoid redundancy across files
- Be easy to update without widespread changes

## Documentation Update Workflow

### Step 1: Identify Affected Documentation

Before making changes:

- Review the implementation plan for affected areas
- Identify which documentation files need updates
- Check for cross-references that may need updating
- Note any diagrams or visual representations

### Step 2: Make Documentation Updates

During development:

- Update documentation alongside code changes
- Keep documentation changes in the same commit when possible
- Use clear commit messages describing documentation updates
- Ensure updates are complete before requesting review

### Step 3: Review Documentation

During code review:

- Reviewers must check documentation accuracy
- Verify all affected files are updated
- Check for consistency across documentation
- Ensure no outdated information remains

### Step 4: Verify After Deployment

After deployment:

- Confirm documentation matches production behavior
- Update any operational procedures if needed
- Document any discovered issues or edge cases
- Share knowledge with the team

## Documentation Version Control

### Change Tracking

- All documentation changes are tracked in version control
- Commit messages should clearly describe documentation updates
- Major documentation changes should be in separate commits
- Documentation history should be preserved for reference

### Branching Strategy

- Documentation updates follow the same branching as code
- Feature branches include documentation updates
- Documentation-only changes can be in dedicated branches
- Main branch always contains current, accurate documentation

### Release Notes

- Significant documentation changes should be noted in release notes
- Breaking changes to documented behavior must be highlighted
- New documentation sections should be announced
- Deprecated documentation should be marked for removal

## Common Documentation Pitfalls

### Outdated Information

- Problem: Documentation describes old behavior
- Prevention: Always update documentation with code changes
- Detection: Regular documentation audits

### Missing Updates

- Problem: Code changes without corresponding documentation updates
- Prevention: Make documentation updates part of definition of done
- Detection: Code review process

### Inconsistent Style

- Problem: Different writing styles across documentation files
- Prevention: Follow established documentation guidelines
- Detection: Technical lead review

### Overly Detailed

- Problem: Documentation includes implementation details that change frequently
- Prevention: Focus on conceptual descriptions and architecture
- Detection: Peer review feedback

### Vague Descriptions

- Problem: Documentation lacks specific, actionable information
- Prevention: Include concrete examples and clear procedures
- Detection: User feedback and confusion

## Documentation Audits

### Regular Audits

Conduct documentation audits:

- Monthly review of all documentation files
- Check for outdated information
- Identify gaps in coverage
- Verify consistency across files

### Audit Checklist

During audits, verify:

- All major components are documented
- Documentation matches current implementation
- No conflicting information exists
- All cross-references are valid
- Examples and diagrams are accurate

### Audit Outcomes

After audits:

- Create issues for identified problems
- Prioritize updates based on impact
- Assign responsibility for updates
- Track completion of documentation improvements

## Documentation Tools and Resources

### Recommended Tools

- Markdown editors with preview capabilities
- Diagram tools for architecture visualizations
- Spell checkers for proofreading
- Version control for tracking changes

### Resources for Writers

- Style guides for technical writing
- Templates for common documentation types
- Examples of well-written documentation
- Feedback mechanisms for improvement

## Continuous Improvement

Documentation should be continuously improved based on:

- Developer feedback on clarity and usefulness
- New developer onboarding experiences
- Common questions and confusion points
- Changes in best practices or technologies
- Lessons learned from incidents or issues

## Documentation Updates for Phase 3.2 HTML Parser

This section documents the documentation updates made following the completion of Phase 3.2 HTML Parser implementation.

### Files Updated

The following documentation files were updated to reflect the HTML Parser implementation:

1. **[`docs/implementation-plan.md`](docs/implementation-plan.md:285)** - Phase 3.2 section marked as completed with comprehensive implementation notes
2. **[`docs/architecture.md`](docs/architecture.md:130)** - Added HTML Parser Component subsection with full feature documentation
3. **[`docs/testing.md`](docs/testing.md:277)** - Added comprehensive HTML Parser Testing section with all test categories
4. **[`docs/data-flows.md`](docs/data-flows.md:31)** - Updated to reference parser functions ([`parseBrandDetail()`](scraper/src/html-parser.ts:250), [`parseProductList()`](scraper/src/html-parser.ts:307), [`isProductDiscoveryComplete()`](scraper/src/html-parser.ts:511), [`parseProductDetail()`](scraper/src/html-parser.ts:421))
5. **[`docs/data-model.md`](docs/data-model.md:80)** - Added Parser Data Types section with all parser type definitions

### Implementation References

The HTML Parser implementation consists of:

- **Main Parser**: [`scraper/src/html-parser.ts`](scraper/src/html-parser.ts:1) - Core parsing functions
- **Type Definitions**: [`scraper/src/types.ts`](scraper/src/types.ts:1) - TypeScript interfaces
- **Error Handling**: [`scraper/src/parser-error.ts`](scraper/src/parser-error.ts:1) - Custom error class
- **Test Suite**: [`scraper/test/html-parser.test.ts`](scraper/test/html-parser.test.ts:1) - 92 comprehensive tests

### Key Features Documented

- Brand and product parsing functions
- HTMX pagination metadata extraction
- Completion detection logic
- Graceful error handling with context
- Utility functions for text and URL processing
- Comprehensive test coverage (91.99%, 92 tests)

## Documentation Updates for Phase 3.3 Data Normalization and Duplicate Detection

This section documents the documentation updates made following the completion of Phase 3.3 Data Normalization and Duplicate Detection implementation.

### Files Updated

The following documentation files were updated to reflect the Data Normalization and Duplicate Detection implementation:

1. **[`docs/implementation-plan.md`](docs/implementation-plan.md:351)** - Phase 3.3 section marked as completed with comprehensive implementation notes
2. **[`docs/architecture.md`](docs/architecture.md:173)** - Added Data Normalization Component subsection with full feature documentation
3. **[`docs/architecture.md`](docs/architecture.md:257)** - Added Duplicate Detection Component subsection with full feature documentation
4. **[`docs/data-flows.md`](docs/data-flows.md:31)** - Updated to include normalization and duplicate detection steps in data ingestion flow
5. **[`docs/data-model.md`](docs/data-model.md:80)** - Added Normalized Data Types section with all normalized type definitions
6. **[`docs/testing.md`](docs/testing.md:277)** - Added comprehensive Data Normalization Testing section with all test categories
7. **[`docs/testing.md`](docs/testing.md:277)** - Added comprehensive Duplicate Detection Testing section with all test categories

### Implementation References

The Data Normalization and Duplicate Detection implementation consists of:

- **Data Normalization Module**: [`scraper/src/data-normalizer.ts`](scraper/src/data-normalizer.ts:1) - Core normalization and validation functions
- **Duplicate Detection Module**: [`scraper/src/duplicate-detector.ts`](scraper/src/duplicate-detector.ts:1) - Efficient duplicate detection using Set and Map
- **Type Definitions**: [`scraper/src/types.ts`](scraper/src/types.ts:1) - TypeScript interfaces for normalized data and validation results
- **Data Normalizer Test Suite**: [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1) - 110 comprehensive tests
- **Duplicate Detector Test Suite**: [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1) - 105 comprehensive tests

### Key Features Documented

**Data Normalization:**
- Text cleaning: Removes extra whitespace and normalizes line breaks
- URL normalization: Converts relative URLs to absolute URLs and removes tracking parameters
- Slug generation: Creates URL-friendly slugs from names
- Timestamp tracking: Adds ISO 8601 scrapedAt timestamps to all data
- Data validation: Validates normalized data against business rules
- Error logging: Logs invalid data with detailed error information

**Duplicate Detection:**
- Brand-level tracking: Tracks unique brands across iterations using case-insensitive comparison
- Product-level tracking: Tracks unique products per brand across iterations
- O(1) lookup performance: Uses Set and Map data structures for efficient duplicate checking
- Query functions: Provides functions to check existence, get counts, and retrieve all tracked items
- State management: Supports clearing detector state for new scraping sessions

**Validation Rules:**
- Required fields: slug, name, sourceUrl (and brandSlug for products) must be present and non-empty
- Optional fields: description and imageUrl are optional but must be valid if present
- Length limits: MAX_TEXT_LENGTH (10000 chars), MAX_NAME_LENGTH (500 chars), MAX_URL_LENGTH (2000 chars)
- URL format: URLs must be properly formatted and valid
- Timestamp format: scrapedAt must be a valid ISO 8601 timestamp

**Integration Points:**
- HTML Parser → Normalizer: Receives raw parsed data for transformation
- Normalizer → Duplicate Detector: Provides normalized data with slugs for duplicate checking
- Normalizer → Database: Provides validated, normalized data for storage
- Normalizer → Error Logging: Logs invalid data with detailed error information
- Duplicate Detector → Scraper Orchestration: Returns duplicate status to skip or process items
- Duplicate Detector → Progress Tracking: Provides counts and queries for monitoring

### Test Coverage Results

**Data Normalizer:**
- **Total Tests**: 110
- **Pass Rate**: 100% (110/110 tests passing)
- **Code Coverage**: 96.83%
- **Test File**: [`scraper/test/data-normalizer.test.ts`](scraper/test/data-normalizer.test.ts:1)

**Duplicate Detector:**
- **Total Tests**: 105
- **Pass Rate**: 100% (105/105 tests passing)
- **Code Coverage**: 100%
- **Test File**: [`scraper/test/duplicate-detector.test.ts`](scraper/test/duplicate-detector.test.ts:1)

**Total Scraper Tests:**
- **All Tests**: 361 tests (54 HTTP client + 92 HTML parser + 110 data normalizer + 105 duplicate detector)
- **Pass Rate**: 100% (361/361 tests passing)
- **Overall Coverage**: Excellent coverage across all modules

### Test Categories Documented

**Data Normalization Tests:**
- Text normalization tests (cleanText)
- URL normalization tests (normalizeUrl)
- Slug generation tests (generateSlug)
- Slug extraction tests (extractSlugFromUrl)
- Brand data normalization tests (normalizeBrandData, normalizeBrandDetailData)
- Product data normalization tests (normalizeProductData, normalizeProductDetailData)
- Brand data validation tests (validateBrandData)
- Product data validation tests (validateProductData)
- Invalid data logging tests (logInvalidData)
- Edge cases and integration tests

**Duplicate Detection Tests:**
- Detector creation tests (createDuplicateDetector)
- Brand duplicate detection tests (addBrand, hasBrand)
- Product duplicate detection tests (addProduct, hasProduct)
- Count and query tests (getBrandCount, getProductCount, getProductCountByBrand)
- Retrieval tests (getBrands, getProducts)
- State management tests (clear)
- totalCount tests
- Empty detector tests
- Single item tests
- Multiple items tests
- Case sensitivity tests
- Brand-specific product tests

**Integration Tests:**
- End-to-end normalization flow (parse → normalize → validate)
- Duplicate detection with normalized data
- Integration with HTML parser output
- Error handling and logging flow

### Implementation Deliverables

1. Complete data normalization module with text cleaning, URL normalization, and slug generation
2. Comprehensive data validation with business rules and error reporting
3. Efficient duplicate detection using Set and Map data structures
4. TypeScript type definitions for normalized data structures and validation results
5. Comprehensive test suites (215 tests: 110 for normalizer, 105 for duplicate detector)
6. Excellent test coverage (96.83% for normalizer, 100% for duplicate detector)
7. Integration points with HTML parser, duplicate detector, and database
8. Documentation updates across all relevant documentation files

### Documentation Completeness

All documentation files have been updated to accurately reflect the Phase 3.3 implementation:

- **Implementation Plan**: Phase 3.3 marked as completed with comprehensive notes
- **Architecture**: Data Normalization and Duplicate Detection components documented with full feature descriptions
- **Data Flows**: Updated to include normalization and duplicate detection in data ingestion flow
- **Data Model**: Normalized data types added with all interfaces and validation rules
- **Testing**: Comprehensive test sections added for both data normalization and duplicate detection
- **Documentation Updates**: This section added to document all Phase 3.3 changes

### Cross-References Updated

All cross-references between documentation files have been verified and updated:

- Implementation plan references all new modules and test files
- Architecture documentation describes integration points between all components
- Data flows document the complete data ingestion pipeline with normalization and duplicate detection
- Data model includes all normalized types and validation interfaces
- Testing documentation covers all test categories with results
