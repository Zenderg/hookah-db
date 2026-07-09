# Development Reference

Purpose: this document is the source of truth for developer commands, checks,
migrations, and test mechanics. Agent workflow rules belong in `../AGENTS.md`.
Product scope belongs in `project-scope.md`. Stable architecture and runtime
contracts belong in `architecture.md`. Human-facing quick start instructions
belong in `../README.md` and `../CONTRIBUTING.md`.

## Runtime

Use Docker Compose when running the application:

```bash
npm install
docker compose up --build -d
docker compose up -d postgres
```

For agents, do not use `npm run start`, `npm run start:dev`, or
`npm run start:prod` for application startup unless the user explicitly
overrides the Docker Compose rule.

## Checks

```bash
npm test
npm run lint:check
npm run build
npm run smoke
```

All tests should pass before a commit when feasible. `npm run smoke` expects a
running API.

## Migrations

```bash
npm run migration:generate -- src/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run migration:show
```

- Migration files live in `src/migrations/` and use timestamp-prefixed names.
- Never set `synchronize: true`.
- The app config has `migrationsRun: true`; account for that when changing startup or deployment behavior.

## Testing Mechanics

- Prefer targeted tests for project behavior, business logic, parser boundaries, repositories, DTO validation, and integration edges.
- Do not test NestJS, TypeORM, Playwright, or other third-party framework behavior directly.
- Mocks and stubs for external dependencies are acceptable.
- Repository tests use mock QueryBuilder objects. Include all chain methods when creating these mocks: `leftJoin`, `leftJoinAndSelect`, `select`, `addSelect`, `where`, `andWhere`, `orderBy`, `skip`, `take`, `setParameter`, `getManyAndCount`, `getRawMany`, `getOne`.
- When changing select or ranking strategy, update assertions that distinguish `select` from `addSelect`.

## Dependencies

Before installing or updating dependencies, verify the latest stable version. If
the latest stable version is not suitable, document why in the relevant change,
issue, pull request, or focused documentation.
