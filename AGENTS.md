# AGENTS.md

Hookah tobacco database API — парсит данные с htreviews.org и предоставляет через REST API.
Масштаб: ~272 бренда, ~471 линейка, ~11 861 табак.

## Tech stack

- NestJS 11, TypeORM 0.3, PostgreSQL 18, Playwright 1.58, TypeScript (ES2023, strictNullChecks)
- Jest 30, ESLint 9, Prettier
- `synchronize: false` — все изменения схемы только через миграции
- Database в Docker-контейнере с production-like данными

## Build & run

```bash
npm install                   # установка зависимостей
docker-compose up -d postgres # запуск БД
npm run start:dev             # dev-режим с hot reload
npm run build                 # сборка
npm run start:prod            # production
```

## Testing

- Запуск: `npm test`
- Все тесты должны проходить перед любым коммитом
- Тесты используют mock QueryBuilder — при создании моков включать все чейн-методы: `leftJoin`, `leftJoinAndSelect`, `select`, `addSelect`, `where`, `andWhere`, `orderBy`, `skip`, `take`, `setParameter`, `getManyAndCount`, `getRawMany`, `getOne`
- При изменении select-стратегии обновлять assertions в тестах (например, `addSelect` vs `select`)
- Тесты только для кода проекта — не тестировать фреймворки и сторонние библиотеки
- Тестировать: бизнес-логику, поведение проекта, интеграционные границы
- Моки и стабы для внешних зависимостей допускаются

## Migrations

```bash
npm run migration:generate -- src/migrations/<Name>  # генерация
npm run migration:run                                  # применение
npm run migration:revert                               # откат
npm run migration:show                                 # статус
```

Файлы миграций в `src/migrations/` с timestamp-префиксами. Не использовать `synchronize: true`.

## Architecture

### Entities & relations

- **Brand** → has many Lines, has many Tobaccos
- **Line** → belongs to Brand, has many Tobaccos
- **Tobacco** → belongs to Brand and Line, many-to-many with Flavors (junction table `tobacco_flavors`)
  - У табака нет поля `country` — страна определяется через JOIN с Brand
- **Flavor** → many-to-many with Tobaccos (unique name)
- **ApiKey** — API-ключи для аутентификации (plain text, UUID v4)

### Module structure

Каждый модуль: `entity`, `controller`, `service`, `repository`. Путь: `src/<module>/`.

```
src/
├── brands/          # бренды
├── lines/           # линейки
├── tobaccos/        # табаки
├── flavors/         # вкусы
├── parser/          # Playwright-парсер
│   └── strategies/  # brand, line, tobacco стратегии
├── auth/            # API key guard
├── api-keys/        # управление ключами (глобальный модуль)
├── health/          # health check (публичный, без auth)
├── cli/             # CLI-команды (parse, api-keys) на Commander.js
├── common/          # guards, middleware, decorators, interceptors, filters, dto
└── migrations/      # миграции TypeORM
```

### Parser

- Playwright-based, 3 стратегии: brand, line, tobacco
- Cron ежедневно в 02:00: brands → lines → tobaccos (последовательно, зависимости данных)
- Если парсинг brands упал — lines и tobaccos пропускаются
- `saveTobaccoWithFlavors()` — find-or-create логика для вкусов
- Парсинг вкусов: извлечение `<a>` ссылок с `?r=flavor` в href со страницы табака
- Инкрементальные обновления: upsert по slug/htreviewsId
- Error handling: continue-on-error — падение одной сущности не останавливает процесс

### API

- REST с API key auth (header `X-API-Key` или `Authorization: Bearer`)
- Пагинация (default 20, max 100), фильтрация, сортировка
- Full-text search с PostgreSQL FTS (русский + английский конфигурации, 6 GIN-индексов)
- Поиск табаков: cross-field AND логика (каждое слово должно матчиться хотя бы в одном поле: tobacco.name / brand.name / line.name)
- Prefix search + bonus-based ranking (exact match +100, prefix tobacco +50, prefix brand/line +30)
- Фильтр по вкусам: AND логика — табак должен иметь ВСЕ указанные вкусы
- Global exception filter: `{ statusCode, timestamp, path, message }`

### Design patterns

- **Repository pattern** — отделение data access от бизнес-логики
- **Guard pattern** — API key validation через NestJS guard (`ApiKeysModule` глобальный с `@Global()`)
- **Strategy pattern** — парсер с разными стратегиями
- Контроллеры тонкие, бизнес-логика в сервисах

## Code style

- Lint: `npm run lint` (ESLint 9 + Prettier)
- Format: `npm run format`
- Классы: PascalCase (`BrandsService`)
- Методы/переменные: camelCase (`findAllBrands`)
- Константы: UPPER_SNAKE_CASE
- Файлы: kebab-case (`brands.service.ts`)
- Предпочитать interfaces над types для object shapes

## Git workflow

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## Dependency management

- Перед установкой любой зависимости проверить последнюю стабильную версию
- Не использовать дефолтные или устаревшие версии из примеров
- Если последняя версия не подходит — задокументировать причину

## Explicitly excluded

Следующие фичи намеренно НЕ реализуются:
- User accounts, OAuth, JWT
- User reviews, ratings submission, social features
- Admin panel, web UI
- Payment processing, real-time updates
- Multi-tenancy, advanced analytics
- Email notifications
- Rate limiting (только логирование запросов)
- Автоматическое резервное копирование (только Docker volumes)
