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

PostgreSQL stays on the Compose network by default and is not published on the host. For database administration, open a `psql` session inside the container:

```bash
docker compose exec postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Host-run migration or seed commands need a local TCP connection. Opt in to a loopback-only port mapping with the development override (set `POSTGRES_PORT` if host port 5432 is occupied):

```bash
POSTGRES_PORT=35445 docker compose -f docker-compose.yaml -f docker-compose.local.yaml up -d postgres
DATABASE_HOST=127.0.0.1 DATABASE_PORT=35445 npm run migration:show
```

The override binds only `127.0.0.1`; it is not loaded by ordinary `docker compose` commands. Pass the matching `DATABASE_PORT` explicitly to host-run commands when using a non-default port.

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
- Migration commands load `.env` from the current working directory. Exported
  shell variables take precedence, and the same environment validation used by
  the app rejects invalid database ports before a migration starts.
- The migration CLI runs on the host and connects to `localhost:5432` by
  default. Start PostgreSQL with `docker-compose.local.yaml` first when running
  migrations locally; when changing the published host port, pass the same
  value as `DATABASE_PORT` to the CLI command.
- Never set `synchronize: true`.
- The app config has `migrationsRun: true`; account for that when changing startup or deployment behavior.

## Testing Mechanics

- Prefer targeted tests for project behavior, business logic, parser boundaries, repositories, DTO validation, and integration edges.
- Do not test NestJS, TypeORM, Playwright, or other third-party framework behavior directly.
- Mocks and stubs for external dependencies are acceptable.
- Repository tests use mock QueryBuilder objects. Include all chain methods when creating these mocks: `leftJoin`, `leftJoinAndSelect`, `select`, `addSelect`, `where`, `andWhere`, `orderBy`, `skip`, `take`, `setParameter`, `getManyAndCount`, `getRawMany`, `getOne`.
- When changing select or ranking strategy, update assertions that distinguish `select` from `addSelect`.
- `src/tobaccos/tobaccos.repository.postgres.spec.ts` checks search behavior against a real PostgreSQL server. It is skipped unless `POSTGRES_SEARCH_TESTS=true`; when enabled, it creates a uniquely named schema, loads its fixtures there, and drops that schema afterward. The database user needs permission to create and drop schemas.

Run the PostgreSQL repository regression against a local Compose database with:

```bash
POSTGRES_PORT=35445 docker compose -f docker-compose.yaml -f docker-compose.local.yaml up -d postgres
POSTGRES_SEARCH_TESTS=true DATABASE_HOST=127.0.0.1 DATABASE_PORT=35445 npm test -- --runInBand tobaccos.repository.postgres.spec.ts
```

CI enables this spec against its PostgreSQL service. The isolated test schema means the database can also contain application or sample data without the spec changing it.

## Dependencies

Before installing or updating dependencies, verify the latest stable version. If
the latest stable version is not suitable, document why in the relevant change,
issue, pull request, or focused documentation.
