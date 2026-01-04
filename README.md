# Hookah Tobacco Database API

A centralized data service that aggregates and provides structured information about hookah tobacco brands and flavors from htreviews.org.

## Monorepo Structure

This project uses a monorepo structure with pnpm workspaces and Turborepo for efficient development and building.

### Structure

```
hookah-db/
├── apps/                    # Applications
│   ├── api/               # REST API server
│   └── cli/               # CLI tool
├── packages/                # Shared packages
│   ├── types/              # TypeScript types and interfaces
│   ├── utils/              # Utility functions
│   ├── scraper/            # Web scraping logic
│   ├── parser/             # HTML parsing logic
│   ├── cache/              # Caching implementations
│   ├── services/           # Business logic
│   ├── config/             # Shared configuration
│   └── tsconfig/           # TypeScript configurations
├── examples/                # Example HTML files
└── .kilocode/             # Kilo Code configuration
```

### Packages

- **@hookah-db/types**: Shared TypeScript types and interfaces
- **@hookah-db/utils**: Utility functions
- **@hookah-db/scraper**: Web scraping logic for htreviews.org
- **@hookah-db/parser**: HTML parsing with Cheerio
- **@hookah-db/cache**: Caching layer (in-memory/Redis)
- **@hookah-db/services**: Business logic orchestration
- **@hookah-db/config**: Shared configuration presets
- **@hookah-db/tsconfig**: Shared TypeScript configurations

### Applications

- **@hookah-db/api**: REST API server (Express.js)
- **@hookah-db/cli**: CLI tool for data management

## Getting Started

### Prerequisites

- Node.js (LTS version)
- pnpm (install via `npm install -g pnpm`)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run API in development
pnpm --filter @hookah-db/api dev

# Run CLI
pnpm --filter @hookah-db/cli dev
```

## Available Scripts

- `pnpm build` - Build all packages and applications
- `pnpm dev` - Run all packages in development mode
- `pnpm test` - Run all tests
- `pnpm type-check` - Type-check all packages
- `pnpm lint` - Lint all packages
- `pnpm clean` - Clean all build artifacts

## Development

### Building a specific package

```bash
pnpm --filter @hookah-db/types build
```

### Running a specific application

```bash
pnpm --filter @hookah-db/api dev
```

### Adding dependencies

```bash
# Add to a specific package
pnpm --filter @hookah-db/scraper add axios

# Add as dev dependency
pnpm --filter @hookah-db/scraper add -D @types/axios
```

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Web Scraping**: Cheerio, axios
- **API Framework**: Express.js
- **Testing**: Jest, Supertest

## License

ISC
