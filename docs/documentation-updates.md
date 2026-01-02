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

### Testing Changes

Update documentation when:

- New test categories are introduced
- Testing strategy or philosophy changes
- Coverage requirements are modified
- Test infrastructure is significantly updated
- Example HTML files are added or removed

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

Documentation must:

- Be organized in a logical structure
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
- Update operational procedures if needed
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
2. **[`docs/architecture.md`](docs/architecture.md:129)** - Added HTML Parser Component subsection with full feature documentation
3. **[`docs/testing.md`](docs/testing.md:276)** - Added comprehensive HTML Parser Testing section with all test categories
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
