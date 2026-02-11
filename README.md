# Hookah Tobacco Database API

RESTful API для структурированного доступа к данным о кальянном табаке. Автоматически парсит информацию с [htreviews.org](https://htreviews.org) и предоставляет через авторизованные endpoints.

> ~272 бренда, ~471 линейка, ~11 861 табак — с ежедневным обновлением.

## Возможности

- **Автоматический парсинг** — Playwright-парсер собирает бренды, линейки, табаки и вкусы с htreviews.org
- **Полнотекстовый поиск** — PostgreSQL FTS с поддержкой русского и английского языков
- **Фильтрация и сортировка** — по стране, статусу, рейтингу, вкусам и другим параметрам
- **Пагинация** — для всех коллекций с настраиваемым лимитом
- **API-ключ аутентификация** — с трекингом использования
- **CLI** — управление ключами и ручной запуск парсинга

## Технологический стек

[NestJS](https://nestjs.com/) 11 · [PostgreSQL](https://www.postgresql.org/) 18 · [TypeORM](https://typeorm.io/) 0.3 · [Playwright](https://playwright.dev/) 1.58 · TypeScript · Docker

## Быстрый старт

```bash
git clone <repository-url>
cd hookah-db
npm install
cp .env.example .env          # настроить при необходимости
docker-compose up -d postgres  # запуск БД
npm run start:dev              # http://localhost:3000
```

Или полное развёртывание через Docker:

```bash
docker-compose up -d           # API + PostgreSQL
```

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

Автоматический парсинг запускается ежедневно в 02:00 (cron).

## Разработка

```bash
npm test              # запуск тестов
npm run test:cov      # с покрытием
npm run lint          # линтинг
npm run format        # форматирование
```

### Миграции

```bash
npm run migration:show      # статус
npm run migration:run       # применить
npm run migration:revert    # откатить
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
