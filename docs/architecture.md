# Architecture Reference

Purpose: this document is the source of truth for stable technical architecture,
module boundaries, entities, parser behavior, and API contracts. Agent workflow
rules belong in `../AGENTS.md`. Developer commands belong in `development.md`.
Product scope and non-goals belong in `project-scope.md`. Human-facing usage
belongs in `../README.md`.

## Stack

- NestJS 11
- TypeORM 0.3
- PostgreSQL 18
- Playwright 1.58
- TypeScript ES2023 with `strictNullChecks`
- Jest 30
- ESLint 9
- Prettier

`synchronize: false` is mandatory. Schema changes must be represented by
TypeORM migrations.

## Modules

Main modules live under `src/<module>/`:

- `brands`
- `lines`
- `tobaccos`
- `flavors`
- `parser`
- `api-keys`
- `health`
- `cli`
- `common`
- `migrations`

Catalog modules follow the local pattern of entity, controller, service, and
repository files. Controllers should stay thin. Put business logic in services
and data access in repositories.

`ApiKeysModule` is global and provides API-key validation for `ApiKeyGuard`.
`HealthModule` is public via the `@Public()` decorator.

`common/` contains shared guards, middleware, decorators, interceptors, filters,
DTOs, and utilities.

## Entities

- `Brand` has many lines and tobaccos. It owns `country`.
- `Line` belongs to a brand and has many tobaccos.
- `Tobacco` belongs to a brand and optionally a line. It has no `country`; country filtering joins through `Brand`.
- `Tobacco` has a many-to-many relation with `Flavor` through `tobacco_flavors`.
- `Flavor.name` is unique.
- `ApiKey` stores plain-text UUID v4 keys with active state and usage counters.

## Parser

- The parser is Playwright-based with brand, line, and tobacco strategies.
- Automatic parser cron is scheduled at 02:00 when `PARSER_CRON_ENABLED` is enabled.
- `PARSER_CRON_ENABLED` defaults to enabled in code when unset. `.env.example` and `deploy/compose.yaml` set it to false for fresh self-host installs.
- Confirm the effective environment before starting the app if parser cron behavior matters.
- Daily parsing runs brands, then lines, then tobaccos. Current progression is gated by created/updated counters, not a separate success flag.
- Per-entity save failures are continue-on-error and should not stop the whole batch.
- `saveTobaccoWithFlavors()` resolves flavors with find-or-create logic.
- Flavor parsing extracts `<a>` links whose `href` contains `?r=flavor` from tobacco pages.
- Current identity checks are specific: brands by `name`, lines by `slug + brandId`, tobaccos by `htreviewsId`. Do not describe this as generic upsert by slug.

## API Behavior

- All endpoints except `/health` require an API key.
- Accepted auth headers: `X-API-Key` or `Authorization: Bearer <key>`.
- Pagination defaults to 20 and maxes at 100.
- Tobacco search uses PostgreSQL FTS with Russian and English configurations across `tobacco.name`, `brand.name`, and `line.name`.
- Multi-word tobacco search uses cross-field AND logic: every word must match at least one searched field.
- Search ranking includes exact match bonus +100, tobacco prefix bonus +50, and brand/line prefix bonus +30.
- Flavor filtering uses AND logic: a tobacco must have every requested flavor.
- Global exception responses use `{ statusCode, timestamp, path, message }`.
