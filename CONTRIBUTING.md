# Contributing

Спасибо за интерес к проекту. Главная цель репозитория: self-host API, который можно поднять локально без обращения к сторонним сайтам.

## Локальный запуск

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run migration:run
npm run seed:sample:dev
npm run start:dev
```

Проверка:

```bash
curl http://localhost:3000/health
curl -H "X-API-Key: local-dev-key" http://localhost:3000/brands
```

## Перед PR

```bash
npm run lint:check
npm test
npm run build
```

Если меняете Docker/onboarding, дополнительно проверьте:

```bash
docker compose up --build -d
docker compose exec api npm run seed:sample
npm run smoke
```

Для pull-based compose:

```bash
docker compose -f deploy/compose.yaml config
```

## Docker images

GitHub Actions публикует API image в GHCR:

- push в `main`: `main`, `sha-<commit>`;
- tag `v*.*.*`: semver tags и `latest`;
- pull requests: build only, без push.

Не публикуйте отдельный PostgreSQL image: self-host compose должен использовать официальный `postgres` image.

## Парсер

Парсер htreviews.org должен оставаться opt-in. Не включайте aggressive defaults, не увеличивайте concurrency без необходимости и документируйте любые изменения, которые могут повысить нагрузку на внешний сайт.

## Стиль

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Схему БД меняйте только через миграции.
- Контроллеры оставляйте тонкими; бизнес-логика живёт в сервисах/репозиториях.
