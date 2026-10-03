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
- Brand and line batch parsing skips an entity when its detail-page navigation
  or extraction fails; successful entities continue through the batch.
  Single-URL brand and line parsing rejects on detail failure before catalog
  writes.
- Automatic parser cron is scheduled at 02:00 when `PARSER_CRON_ENABLED` is enabled.
- `PARSER_CRON_ENABLED` defaults to enabled in code when unset. `.env.example` and `deploy/compose.yaml` set it to false for fresh self-host installs.
- Confirm the effective environment before starting the app if parser cron behavior matters.
- Daily parsing runs brands, then lines, then tobaccos. Current progression is gated by created/updated counters, not a separate success flag.
- Per-entity save failures are continue-on-error and should not stop the whole batch.
- Batch strategies return parsed `items` and a numeric `errors` count. Daily refresh keeps processing successful items, then rejects with its stage counts when any strategy or save failed so Sentry cron reports the run as failed; a truly empty, error-free catalog resolves successfully. CLI batch parsing exits nonzero when its result contains errors.
- Parser normalizers provide `createdAt` for inserts because the schema columns have no defaults; parser updates omit that field so refreshes preserve each record's original creation time.
- `saveTobaccoWithFlavors()` resolves flavors with find-or-create logic.
- Tobacco saves require a canonical `htreviewsId` matching `^htr\d+$` with no surrounding whitespace before entity normalization or flavor/tobacco repository access. Invalid identities fail the entity save; batch parsing records the error and continues.
- Flavor parsing extracts `<a>` links whose `href` contains `?r=flavor` from tobacco pages.
- Current identity checks are specific: brands by `name`, lines by `slug + brandId`, tobaccos by `htreviewsId`. Do not describe this as generic upsert by slug.

## API Behavior

- All endpoints except `/health` require an API key.
- Accepted auth headers: `X-API-Key` or `Authorization: Bearer <key>`.
- `GET /tobaccos/:id` returns 404 with `Tobacco not found` when no record matches; repository errors remain 500.
- UUID path parameters for brand, line, and tobacco item and nested-list routes use `ParseUUIDPipe`: malformed IDs return HTTP 400 before catalog repository access, while valid but missing IDs retain their existing 404 behavior.
- A valid key used on a protected request increments its request count and updates `lastUsedAt` once; public `/health` requests do neither.
- `GET /tobaccos/by-url` validates an absolute URL under `https://htreviews.org/tobaccos/{brand}/{line}/{tobacco}` and strips query and hash components before lookup; malformed, relative, and out-of-scope URLs return HTTP 400.
- Pagination defaults to 20 and maxes at 100.
- Brand lists accept `sortBy=rating|name`; tobacco lists, including brand- and
  line-nested tobacco lists, accept `sortBy=rating|name|dateAdded`. The
  `dateAdded` API name sorts by the tobacco `createdAt` column. Both list types
  accept `order=asc|desc`; unsupported sort fields and directions return HTTP
  400 before repository access. Line and flavor lists do not accept sort
  parameters.
- Catalog list methods return an exact `total`. Tobacco pagination first selects
  distinct matching IDs and counts the filtered catalog before loading brand,
  optional line, and flavors for only the requested page.
- Tobacco search covers tobacco, brand, and line names, with their current
  slugs as an indexed auxiliary source; flavors remain an explicit filter.
  Search terms use cross-field AND logic, so each term may match any name or
  slug field while every term must match.
- Search supports Russian and English stemming, literal stopwords,
  punctuation-insensitive decimal and compound names, and joined or separated
  spellings. Deterministic transliteration and known catalog spellings count as
  strict matches. Mixed-script lookalikes are folded per token toward its
  majority alphabet. Conservative fuzzy matching supports typos. Ranking is
  strict term matches, whole-token matches, complete names or name
  combinations, prefixes, FTS relevance, the requested sort, rating count, then
  UUID. Approximate results are identified by `meta.search.matchQuality` and
  `meta.search.approximateResultIds` only when a page contains a typo or
  stopword-fallback match.
- Search pre-aggregates brand and line matches once per entity, then maps those
  matches to tobacco IDs. A shared materialized filtered-ID set supplies the
  exact total and ordered page, with relation hydration in the same read-only
  repeatable-read transaction.
- Empty whitespace means an unfiltered browse request. Nonempty input with no
  searchable terms returns no results. Search length and term count are bounded
  at both the HTTP DTO and repository boundaries.
- Flavor filtering uses AND logic: a tobacco must have every requested flavor.
  Repeated flavor names count once, and the filter is applied before counting
  and pagination with one grouped tobacco-ID subquery, without multiplying
  candidate rows.
- The complete normalization, matching, ranking, approximate-result, and
  database-index contract lives in [`search-contract.md`](search-contract.md).
- Global exception responses use `{ statusCode, timestamp, path, message }`.
