# Hookah Tobacco Database API

Self-hosted REST API для структурированного каталога кальянного табака. Проект умеет хранить бренды, линейки, табаки и вкусы в PostgreSQL, отдавать их через авторизованные endpoints и опционально импортировать данные с [htreviews.org](https://htreviews.org).

## Важная оговорка про импорт

Парсер htreviews.org — **опциональная** часть проекта. Новый self-host запуск не должен автоматически нагружать внешний сайт: используйте sample dataset для знакомства с API, а импорт включайте только осознанно, с лимитами и уважением к правилам/доступности стороннего сервиса.

## Возможности

- **Self-host API** — NestJS + PostgreSQL + Docker Compose
- **Sample dataset** — локальные демонстрационные данные без обращения к внешним сайтам
- **Опциональный парсинг** — Playwright-парсер собирает бренды, линейки, табаки и вкусы с htreviews.org
- **Полнотекстовый поиск** — PostgreSQL FTS с поддержкой русского и английского языков
- **Фильтрация и сортировка** — по стране, статусу, рейтингу, вкусам и другим параметрам
- **Пагинация** — для всех коллекций с настраиваемым лимитом
- **API-ключ аутентификация** — с трекингом использования
- **CLI** — управление ключами и ручной запуск парсинга

## Технологический стек

[NestJS](https://nestjs.com/) 11 · [PostgreSQL](https://www.postgresql.org/) 18 · [TypeORM](https://typeorm.io/) 0.3 · [Playwright](https://playwright.dev/) 1.58 · TypeScript · Docker

## Быстрый старт: готовый Docker image

Этот способ не требует локальной Node.js-сборки: Docker просто скачает готовый API image из GitHub Container Registry.

```bash
curl -fsSL -o compose.yaml https://raw.githubusercontent.com/koshmarus/hookah-db/main/deploy/compose.yaml
docker compose up -d
```

Проверить, что API поднялся:

```bash
curl http://localhost:3000/health
```

Наполнить БД демонстрационными данными и локальным API-ключом:

```bash
docker compose exec api npm run seed:sample
```

Проверить авторизованные endpoints:

```bash
curl -H "X-API-Key: local-dev-key" http://localhost:3000/brands
curl -H "X-API-Key: local-dev-key" "http://localhost:3000/tobaccos?limit=5"
```

> В `deploy/compose.yaml` daily parser cron выключен по умолчанию: `PARSER_CRON_ENABLED=false`.

## Локальная сборка через Docker

```bash
git clone <repository-url>
cd hookah-db
cp .env.example .env          # настроить при необходимости
docker compose up --build -d   # API + PostgreSQL
```

Проверить, что API поднялся:

```bash
curl http://localhost:3000/health
```

Наполнить БД демонстрационными данными и локальным API-ключом:

```bash
docker compose exec api npm run seed:sample
```

Проверить авторизованные endpoints:

```bash
curl -H "X-API-Key: local-dev-key" http://localhost:3000/brands
curl -H "X-API-Key: local-dev-key" "http://localhost:3000/tobaccos?limit=5"
```

Запустить smoke test:

```bash
npm run smoke
```

> `local-dev-key` создаётся только командой `seed sample` и предназначен для локального окружения.

## Docker images

API image публикуется в GHCR:

```text
ghcr.io/koshmarus/hookah-db
```

Теги:

| Тег | Когда публикуется | Назначение |
|-----|-------------------|------------|
| `main` | push в `main` | Последняя main-сборка |
| `sha-<commit>` | push в `main` или tag | Точная привязка к commit |
| `v0.1.0` | git tag `v0.1.0` | Релизная версия |
| `v0.1` / `v0` | git tag `v0.1.0` | Semver aliases |
| `latest` | только git tag `v*.*.*` | Последний релиз, не каждый push |

Для pinning в self-host окружении лучше использовать релизный тег:

```bash
HOOKAH_DB_API_IMAGE=ghcr.io/koshmarus/hookah-db:v0.1.0 docker compose up -d
```

Образ multi-arch: `linux/amd64` и `linux/arm64`.

## Быстрый старт: локальная разработка

```bash
git clone <repository-url>
cd hookah-db
npm install
cp .env.example .env
docker compose up -d postgres
npm run migration:run
npm run seed:sample:dev
npm run start:dev
```

API будет доступен на `http://localhost:3000`.

## API

Все endpoints (кроме `/health`) требуют API-ключ:

```bash
curl -H "X-API-Key: <key>" http://localhost:3000/brands
```

### Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/health` | Health check (публичный) |
| `GET` | `/brands` | Список брендов (фильтры: country, status, search) |
| `GET` | `/brands/:id` | Бренд по ID |
| `GET` | `/brands/:id/tobaccos` | Табаки бренда |
| `GET` | `/brands/countries` | Список стран |
| `GET` | `/brands/statuses` | Список статусов |
| `GET` | `/brands/names` | Список имён брендов |
| `GET` | `/tobaccos` | Список табаков (фильтры: brandId, lineId, rating, country, status, flavors, search) |
| `GET` | `/tobaccos/:id` | Табак по ID |
| `GET` | `/tobaccos/by-url` | Табак по URL с htreviews.org |
| `GET` | `/tobaccos/statuses` | Список статусов |
| `GET` | `/lines` | Список линеек (фильтры: brandId, search) |
| `GET` | `/lines/:id` | Линейка по ID |
| `GET` | `/lines/:id/tobaccos` | Табаки линейки |
| `GET` | `/lines/statuses` | Список статусов |
| `GET` | `/flavors` | Список всех вкусов |

### Пагинация

Все коллекции поддерживают `page`, `limit` (max 100), `sortBy`, `order`:

```bash
curl -H "X-API-Key: <key>" \
  "http://localhost:3000/tobaccos?page=1&limit=20&sortBy=rating&order=desc&search=cola"
```

```json
{
  "data": [...],
  "meta": { "total": 156, "page": 1, "limit": 20, "totalPages": 8 }
}
```

> При использовании кириллицы в query parameters используйте URL-кодирование.

## CLI

```bash
# Демо-данные для локального запуска
npm run cli -- seed sample          # sample catalog + local-dev-key

# API-ключи
npm run cli -- create "My Client"   # создать ключ
npm run cli -- list                  # список ключей
npm run cli -- delete <key-id>       # удалить ключ
npm run cli -- stats                 # статистика

# Парсинг
npm run cli -- parse brand --limit 10
npm run cli -- parse line --url "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank"
npm run cli -- parse tobacco --limit 10
```

Автоматический парсинг запускается ежедневно в 02:00 (cron), если он включён через окружение. Для нового локального запуска в `.env.example` он выключен.

## Разработка

```bash
npm test              # запуск тестов
npm run test:cov      # с покрытием
npm run lint:check    # линтинг без изменения файлов
npm run lint          # линтинг с автоисправлением
npm run format        # форматирование
npm run build         # production-сборка
npm run smoke         # smoke test поднятого API
```

### Миграции

```bash
npm run migration:show      # статус
npm run migration:run       # применить
npm run migration:revert    # откатить
```

## Переменные окружения

| Переменная | Default в коде | Пример | Описание |
|------------|----------------|--------|----------|
| `NODE_ENV` | `development` | `production` | Режим приложения |
| `PORT` | `3000` | `3000` | HTTP-порт API |
| `DATABASE_HOST` | `localhost` | `postgres` | Host PostgreSQL |
| `DATABASE_PORT` | `5432` | `5432` | Port PostgreSQL |
| `DATABASE_USERNAME` | `postgres` | `postgres` | Пользователь БД |
| `DATABASE_PASSWORD` | `postgres` | `postgres` | Пароль БД |
| `DATABASE_NAME` | `hookah_db` | `hookah_db` | Имя БД |
| `CORS_ORIGIN` | `*` | `https://example.com` | CORS origin |
| `SENTRY_DSN` | пусто | `https://...` | Sentry выключен, если пусто |
| `PARSER_CRON_ENABLED` | `true`, если не задана | `false` | Включает daily parser cron |

### Важно про `PARSER_CRON_ENABLED`

- Если переменная **не задана**, cron остаётся включённым. Это сохраняет поведение существующих production-деплоев.
- В `.env.example` стоит `PARSER_CRON_ENABLED=false`, чтобы новый self-host запуск не ходил на htreviews.org автоматически.
- В `deploy/compose.yaml` тоже стоит безопасный default `false`.
- Ручные команды `npm run cli -- parse ...` остаются доступны независимо от cron-флага.

## Troubleshooting

**API стартует, но `/brands` возвращает 401**

Создайте ключ или загрузите sample data:

```bash
docker compose exec api npm run seed:sample
curl -H "X-API-Key: local-dev-key" http://localhost:3000/brands
```

**API стартует, но данных нет**

Fresh database пустая до seed/import:

```bash
docker compose exec api npm run seed:sample
```

**PostgreSQL volume нужно пересоздать**

Команда удалит локальные данные:

```bash
docker compose down -v
docker compose up --build -d
docker compose exec api npm run seed:sample
```

**Нужно включить daily parser cron**

В `.env`:

```bash
PARSER_CRON_ENABLED=true
```

Затем перезапустите API:

```bash
docker compose up -d --force-recreate api
```

## Структура проекта

```
src/
├── brands/            # бренды
├── lines/             # линейки
├── tobaccos/          # табаки
├── flavors/           # вкусы
├── parser/strategies/ # Playwright-парсер (brand, line, tobacco)
├── api-keys/          # управление API-ключами
├── auth/              # аутентификация
├── health/            # health check
├── cli/               # CLI-команды
├── common/            # guards, middleware, dto, filters
└── migrations/        # миграции TypeORM
```

## Лицензия

[MIT](LICENSE)
