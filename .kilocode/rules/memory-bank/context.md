# Project Context

## Current State

**Project Phase**: Development

The project has been restructured as a monorepo using pnpm workspaces and Turborepo. The repository now contains:
- Example HTML files from htreviews.org for reference (brands listing, brand detail page, flavor detail page)
- Complete monorepo structure with `.kilocode` configuration
- Development environment fully configured with TypeScript, Express.js, and all dependencies
- Workspace configuration files ([`pnpm-workspace.yaml`](pnpm-workspace.yaml:1), [`turbo.json`](turbo.json:1), [`.npmrc`](.npmrc:1))
- Root package configuration ([`package.json`](package.json:1))
- Root TypeScript configuration ([`tsconfig.json`](tsconfig.json:1))
- Git ignore rules ([`.gitignore`](.gitignore:1))
- Application packages in [`apps/`](apps/) directory (api, cli)
- Shared packages in [`packages/`](packages/) directory (types, utils, scraper, parser, cache, services, config, tsconfig)
- Complete data models in [`packages/types/src/`](packages/types/src/) directory

## Recent Changes

- **Monorepo Migration** (2026-01-04):
  - Migrated from single-package structure to monorepo using pnpm workspaces
  - Added Turborepo for build orchestration and caching
  - Added @changesets/cli for version management
  - Restructured codebase into apps/ and packages/ directories
  - Created workspace configuration files: [`pnpm-workspace.yaml`](pnpm-workspace.yaml:1), [`turbo.json`](turbo.json:1), [`.npmrc`](.npmrc:1)
  - Set up package naming convention: @hookah-db/* for all packages
  - Configured workspace:* protocol for internal dependencies
  - Organized packages by dependency layer (utility, core, business, application)

- **Data Models Implementation** (2026-01-03):
  - Created [`packages/types/src/rating.ts`](packages/types/src/rating.ts) - RatingDistribution interface for rating statistics
  - Created [`packages/types/src/line.ts`](packages/types/src/line.ts) - Line interface for tobacco product lines
  - Created [`packages/types/src/flavor.ts`](packages/types/src/flavor.ts) - Flavor interface with comprehensive flavor data
  - Created [`packages/types/src/brand.ts`](packages/types/src/brand.ts) - Brand interface with complete brand information
  - All models include TypeScript interfaces with detailed property definitions based on htreviews.org HTML structure analysis

- **Development Environment Setup** (2026-01-03):
  - Initialized pnpm project with [`package.json`](package.json:1)
  - Installed TypeScript (5.9.3) and type definitions
  - Installed core dependencies: cheerio (1.1.2), axios (1.13.2), express (5.2.1)
  - Installed development tools: nodemon (3.1.11), ts-node (10.9.2), jest (30.2.0), ts-jest (29.4.6), supertest (7.1.4)
  - Created [`tsconfig.json`](tsconfig.json:1) with strict mode, ES2024 target, CommonJS modules
  - Created [`.gitignore`](.gitignore:1) for node_modules, dist, .env, logs, coverage
  - Established complete project directory structure
  - Created application entry points: [`apps/api/src/server.ts`](apps/api/src/server.ts:1), [`apps/cli/src/index.ts`](apps/cli/src/index.ts:1)

- Initial project setup
- Created example HTML files to understand htreviews.org structure
- Initialized memory bank

## Next Steps

1. **Implement web scraper**: Create scraper to fetch and parse htreviews.org HTML
2. **Build API server**: Set up Express server with REST endpoints
3. **Implement caching**: Add caching layer (in-memory or Redis)
4. **Add authentication**: Implement API key middleware
5. **Write tests**: Create unit and integration tests
6. **Documentation**: Write API documentation

## Technical Decisions Made

- **API Framework**: Express.js (selected for mature ecosystem and extensive middleware)
- **HTTP Client**: axios (selected for reliable HTTP requests)
- **Package Manager**: pnpm (fast, disk space efficient)
- **Monorepo**: pnpm workspaces + Turborepo (efficient build orchestration and caching)
- **Version Management**: @changesets/cli (for versioning and changelog generation)

## Technical Decisions Pending

- **Caching Solution**: In-memory vs Redis (to be decided)
- **Database**: Whether to use persistent storage or just cache
- **Scraping Strategy**: How frequently to scrape htreviews.org
- **Rate Limiting**: Implementation approach for API rate limiting

## Key Considerations

- Must be respectful of htreviews.org's server resources
- Need to handle potential HTML structure changes on htreviews.org
- Should provide robust error handling for scraping failures
- Must maintain data consistency between scrapes
- Need to implement proper attribution to htreviews.org
- Monorepo structure requires careful dependency management
- Workspace protocol (workspace:*) must be used for internal dependencies
