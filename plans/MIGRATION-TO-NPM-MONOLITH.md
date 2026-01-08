# План миграции с pnpm Monorepo на npm Monolith

## Обзор

**Цель**: Упростить архитектуру проекта, перейдя от pnpm workspaces + Turborepo к обычному npm с монолитной структурой.

**Текущая архитектура**:
- pnpm workspaces (11 пакетов)
- Turborepo для оркестрации сборки
- Отдельные пакеты: apps/api, apps/cli, packages/types, packages/utils, packages/scraper, packages/parser, packages/cache, packages/database, packages/services, packages/scheduler, packages/config, packages/tsconfig

**Новая архитектура**:
- npm (без workspaces)
- Монолитная структура (единый проект)
- Все модули в src/ директории
- Прямые импорты вместо @hookah-db/*

---

## Преимущества миграции

### ✅ Плюсы
1. **Простота**: Единый package.json, меньше конфигурационных файлов
2. **Понятность**: Линейная структура, без workspace:* зависимостей
3. **Меньше зависимостей**: Нет pnpm, Turborepo, @changesets/cli
4. **Быстрый старт**: npm install вместо pnpm install
5. **Упрощенный Docker**: Проще Dockerfile без Turborepo
6. **Легче для новичков**: Стандартная структура Node.js проекта

### ❌ Минусы
1. **Меньшая модульность**: Все в одном месте
2. **Больше импортов**: Длинные относительные пути
3. **Труднее тестирование**: Нельзя тестировать пакеты изолированно
4. **Нет shared пакетов**: Если понадобится CLI, придется дублировать код

---

## Новая структура проекта

```
hookah-db/
├── src/                        # Весь исходный код
│   ├── types/                  # TypeScript типы
│   │   ├── brand.ts
│   │   ├── flavor.ts
│   │   ├── line.ts
│   │   ├── rating.ts
│   │   ├── query-params.ts
│   │   ├── log-levels.ts
│   │   ├── log-metadata.ts
│   │   ├── logger-config.ts
│   │   └── index.ts
│   ├── utils/                  # Утилиты и логгер
│   │   ├── logger.ts
│   │   ├── logger-factory.ts
│   │   └── index.ts
│   ├── scraper/                # Web scraper
│   │   ├── http-client.ts
│   │   ├── html-parser.ts
│   │   ├── scraper.ts
│   │   ├── brand-scraper.ts
│   │   ├── brand-details-scraper.ts
│   │   ├── flavor-details-scraper.ts
│   │   ├── brand-id-extractor.ts
│   │   ├── api-flavor-extractor.ts
│   │   ├── flavor-url-parser.ts
│   │   ├── api-response-validator.ts
│   │   └── index.ts
│   ├── parser/                 # Data parser
│   │   └── index.ts
│   ├── cache/                  # In-memory cache
│   │   ├── types.ts
│   │   ├── in-memory-cache.ts
│   │   ├── cache-factory.ts
│   │   └── index.ts
│   ├── database/               # SQLite database
│   │   ├── types.ts
│   │   ├── sqlite-database.ts
│   │   └── index.ts
│   ├── services/               # Business logic
│   │   ├── brand-service.ts
│   │   ├── flavor-service.ts
│   │   ├── data-service.ts
│   │   └── index.ts
│   ├── scheduler/              # Cron scheduler
│   │   ├── types.ts
│   │   ├── scheduler.ts
│   │   └── index.ts
│   ├── middleware/             # Express middleware
│   │   ├── auth-middleware.ts
│   │   ├── rate-limit-middleware.ts
│   │   ├── error-handler-middleware.ts
│   │   ├── logging-middleware.ts
│   │   ├── request-logging-middleware.ts
│   │   ├── response-logging-middleware.ts
│   │   └── index.ts
│   ├── controllers/             # API controllers
│   │   ├── brand-controller.ts
│   │   ├── flavor-controller.ts
│   │   ├── health-controller.ts
│   │   └── index.ts
│   ├── routes/                 # API routes
│   │   ├── brand-routes.ts
│   │   ├── flavor-routes.ts
│   │   ├── index.ts
│   │   └── health-routes.ts
│   ├── swagger.ts              # Swagger configuration
│   └── server.ts              # Express server
├── tests/                      # Тесты
│   ├── setup.ts
│   ├── unit/
│   │   ├── scraper/
│   │   ├── cache/
│   │   ├── database/
│   │   ├── services/
│   │   ├── scheduler/
│   │   ├── utils/
│   │   ├── middleware/
│   │   ├── controllers/
│   │   └── routes/
│   └── integration/
│       ├── scraper.test.ts
│       └── flavor-data-flow.test.ts
├── dist/                       # Скомпилированный JavaScript
├── logs/                       # Логи
├── data/                       # Данные (если нужно)
├── examples/                   # Примеры HTML
├── docs/                       # Документация
├── .env.example                # Пример переменных окружения
├── .gitignore                  # Git ignore
├── .dockerignore               # Docker ignore
├── Dockerfile                  # Docker конфигурация
├── docker-compose.yml          # Docker Compose конфигурация
├── jest.config.js             # Jest конфигурация
├── tsconfig.json             # TypeScript конфигурация
├── package.json              # Единый package.json
└── README.md                # Документация
```

---

## Этапы миграции

### Этап 1: Создание новой структуры каталогов

#### 1.1. Создать корневую src/ директорию
```bash
mkdir -p src/{types,utils,scraper,parser,cache,database,services,scheduler,middleware,controllers,routes}
```

#### 1.2. Переместить файлы из packages/ в src/

**Типы** (packages/types/src/ → src/types/):
- brand.ts
- flavor.ts
- line.ts
- rating.ts
- query-params.ts
- log-levels.ts
- log-metadata.ts
- logger-config.ts
- index.ts

**Утилиты** (packages/utils/src/ → src/utils/):
- logger.ts
- logger-factory.ts
- index.ts

**Scraper** (packages/scraper/src/ → src/scraper/):
- http-client.ts
- html-parser.ts
- scraper.ts
- brand-scraper.ts
- brand-details-scraper.ts
- flavor-details-scraper.ts
- brand-id-extractor.ts
- api-flavor-extractor.ts
- flavor-url-parser.ts
- api-response-validator.ts
- index.ts

**Parser** (packages/parser/src/ → src/parser/):
- index.ts

**Cache** (packages/cache/src/ → src/cache/):
- types.ts
- in-memory-cache.ts
- cache-factory.ts
- index.ts

**Database** (packages/database/src/ → src/database/):
- types.ts
- sqlite-database.ts
- index.ts

**Services** (packages/services/src/ → src/services/):
- brand-service.ts
- flavor-service.ts
- data-service.ts
- index.ts

**Scheduler** (packages/scheduler/src/ → src/scheduler/):
- types.ts
- scheduler.ts
- index.ts

#### 1.3. Переместить API файлы из apps/api/src/ в src/

**Middleware** (apps/api/src/middleware/ → src/middleware/):
- auth-middleware.ts
- rate-limit-middleware.ts
- error-handler-middleware.ts
- logging-middleware.ts
- request-logging-middleware.ts
- response-logging-middleware.ts
- index.ts

**Controllers** (apps/api/src/controllers/ → src/controllers/):
- brand-controller.ts
- flavor-controller.ts
- health-controller.ts
- index.ts

**Routes** (apps/api/src/routes/ → src/routes/):
- brand-routes.ts
- flavor-routes.ts
- index.ts

**Server files** (apps/api/src/ → src/):
- server.ts
- swagger.ts

---

### Этап 2: Обновление импортов

#### 2.1. Заменить импорты @hookah-db/* на относительные пути

**Правила замены**:

| Старый импорт | Новый импорт |
|---------------|--------------|
| `@hookah-db/types` | `../types` |
| `@hookah-db/utils` | `../utils` |
| `@hookah-db/scraper` | `../scraper` |
| `@hookah-db/parser` | `../parser` |
| `@hookah-db/cache` | `../cache` |
| `@hookah-db/database` | `../database` |
| `@hookah-db/services` | `../services` |
| `@hookah-db/scheduler` | `../scheduler` |

**Примеры**:

```typescript
// Было (packages/services/src/brand-service.ts)
import { Brand, Flavor } from '@hookah-db/types';
import { IDatabase } from '@hookah-db/database';
import { ICache } from '@hookah-db/cache';

// Стало (src/services/brand-service.ts)
import { Brand, Flavor } from '../types';
import { IDatabase } from '../database';
import { ICache } from '../cache';
```

```typescript
// Было (apps/api/src/controllers/brand-controller.ts)
import { BrandService } from '@hookah-db/services';
import { BrandQueryParams } from '@hookah-db/types';

// Стало (src/controllers/brand-controller.ts)
import { BrandService } from '../services';
import { BrandQueryParams } from '../types';
```

#### 2.2. Файлы для обновления импортов

**Scraper модули** (src/scraper/):
- scraper.ts
- brand-scraper.ts
- brand-details-scraper.ts
- flavor-details-scraper.ts
- api-flavor-extractor.ts

**Parser модули** (src/parser/):
- index.ts

**Cache модули** (src/cache/):
- in-memory-cache.ts
- cache-factory.ts

**Database модули** (src/database/):
- sqlite-database.ts

**Services модули** (src/services/):
- brand-service.ts
- flavor-service.ts
- data-service.ts

**Scheduler модули** (src/scheduler/):
- scheduler.ts

**Middleware модули** (src/middleware/):
- auth-middleware.ts
- rate-limit-middleware.ts
- error-handler-middleware.ts
- logging-middleware.ts
- request-logging-middleware.ts
- response-logging-middleware.ts

**Controllers модули** (src/controllers/):
- brand-controller.ts
- flavor-controller.ts
- health-controller.ts

**Routes модули** (src/routes/):
- brand-routes.ts
- flavor-routes.ts

**Server файлы**:
- src/server.ts
- src/swagger.ts

---

### Этап 3: Создание единого package.json

#### 3.1. Объединить все зависимости из package.json файлов

**Источники**:
- root/package.json
- apps/api/package.json
- apps/cli/package.json
- packages/types/package.json
- packages/utils/package.json
- packages/scraper/package.json
- packages/parser/package.json
- packages/cache/package.json
- packages/database/package.json
- packages/services/package.json
- packages/scheduler/package.json

#### 3.2. Структура нового package.json

```json
{
  "name": "hookah-db",
  "version": "1.0.0",
  "description": "Hookah Tobacco Database API - centralized data service for hookah tobacco brands and flavors",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "hookah",
    "tobacco",
    "api",
    "scraper",
    "database"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^5.2.1",
    "cheerio": "^1.1.2",
    "axios": "^1.13.2",
    "better-sqlite3": "^9.0.0",
    "node-cache": "^5.1.2",
    "node-cron": "^3.0.3",
    "winston": "^3.19.0",
    "winston-daily-rotate-file": "^5.0.0",
    "uuid": "^9.0.1",
    "express-rate-limit": "^7.5.0",
    "swagger-ui-express": "^5.0.1",
    "swagger-jsdoc": "^6.2.8",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^25.0.3",
    "@types/express": "^5.0.6",
    "@types/jest": "^30.0.0",
    "@types/supertest": "^6.0.3",
    "@types/winston": "^2.4.4",
    "@types/uuid": "^9.0.8",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.7",
    "@types/express-rate-limit": "^7.1.0",
    "@types/node-cron": "^3.0.11",
    "@types/node-cache": "^4.2.5",
    "ts-node": "^10.9.2",
    "nodemon": "^3.1.11",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.6",
    "supertest": "^7.1.4"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 3.3. Удалить workspace:* зависимости

Все `"@hookah-db/*": "workspace:*"` должны быть удалены из dependencies.

---

### Этап 4: Обновление TypeScript конфигурации

#### 4.1. Обновить tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
```

#### 4.2. Обновить jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

---

### Этап 5: Обновление Docker конфигурации

#### 5.1. Обновить Dockerfile

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from build stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
```

**Изменения**:
- Заменено `pnpm` на `npm`
- Удалены Turborepo команды
- Упрощен build процесс
- Изменен путь к server.js: `apps/api/dist/server.js` → `dist/server.js`

#### 5.2. Обновить docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hookah-db-api
    ports:
      - "3000:3000"
    volumes:
      - hookah-db-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
      - DATABASE_PATH=/app/data/hookah-db.db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - hookah-db-network

volumes:
  hookah-db-data:
    driver: local

networks:
  hookah-db-network:
    driver: bridge
```

**Изменения**:
- Упрощена конфигурация
- Изменен путь к базе данных

---

### Этап 6: Обновление тестов

#### 6.1. Обновить импорты в тестах

**Правила замены**:

| Старый импорт | Новый импорт |
|---------------|--------------|
| `@hookah-db/types` | `../../src/types` |
| `@hookah-db/utils` | `../../src/utils` |
| `@hookah-db/scraper` | `../../src/scraper` |
| `@hookah-db/parser` | `../../src/parser` |
| `@hookah-db/cache` | `../../src/cache` |
| `@hookah-db/database` | `../../src/database` |
| `@hookah-db/services` | `../../src/services` |
| `@hookah-db/scheduler` | `../../src/scheduler` |

#### 6.2. Обновить файлы тестов

**Unit тесты** (tests/unit/):
- scraper/*.test.ts
- cache/*.test.ts
- database/*.test.ts
- services/*.test.ts
- scheduler/*.test.ts
- utils/*.test.ts
- middleware/*.test.ts
- controllers/*.test.ts
- routes/*.test.ts

**Integration тесты** (tests/integration/):
- scraper.test.ts
- flavor-data-flow.test.ts

---

### Этап 7: Удаление старых файлов и директорий

#### 7.1. Удалить pnpm и Turborepo файлы

```bash
rm -f pnpm-lock.yaml
rm -f pnpm-workspace.yaml
rm -f turbo.json
rm -f .npmrc
```

#### 7.2. Удалить старые директории

```bash
rm -rf apps/
rm -rf packages/
rm -rf packages/tsconfig/
```

#### 7.3. Удалить старые Docker файлы

```bash
rm -f docker-compose.dev.yaml
rm -f docker-compose.prod.yaml
rm -f tsconfig.docker.json
```

#### 7.4. Удалить старые package.json файлы

```bash
rm -f apps/*/package.json
rm -f apps/*/tsconfig.json
rm -f packages/*/package.json
rm -f packages/*/tsconfig.json
```

---

### Этап 8: Обновление документации

#### 8.1. Обновить README.md

**Изменения**:
- Заменить все упоминания pnpm на npm
- Обновить команды установки и запуска
- Обновить структуру проекта
- Обновить инструкции по Docker

**Новые команды**:
```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка проекта
npm run build

# Запуск в продакшн
npm run start

# Запуск тестов
npm test

# Проверка типов
npm run type-check
```

#### 8.2. Обновить .env.example

Убедиться, что все переменные окружения актуальны.

#### 8.3. Обновить docs/LOGGING.md

Заменить все упоминания pnpm на npm.

---

### Этап 9: Тестирование

#### 9.1. Локальное тестирование

```bash
# Установка зависимостей
npm install

# Проверка типов
npm run type-check

# Сборка проекта
npm run build

# Запуск тестов
npm test

# Запуск в режиме разработки
npm run dev
```

#### 9.2. Docker тестирование

```bash
# Сборка Docker образа
docker-compose build

# Запуск контейнеров
docker-compose up -d

# Проверка логов
docker-compose logs -f

# Проверка health endpoint
curl http://localhost:3000/health

# Проверка API endpoints
curl http://localhost:3000/api-docs
```

#### 9.3. Проверка всех функций

- ✅ API endpoints работают
- ✅ Scraper работает
- ✅ Database работает
- ✅ Cache работает
- ✅ Scheduler работает
- ✅ Logging работает
- ✅ Все тесты проходят

---

### Этап 10: Финализация

#### 10.1. Обновить .gitignore

Убедиться, что следующие директории игнорируются:
```
node_modules/
dist/
logs/
*.log
.env
coverage/
.DS_Store
```

#### 10.2. Создать .nvmrc (опционально)

```
22
```

---

## Проверочный список (Checklist)

### Во время миграции
- [ ] Создана новая структура src/
- [ ] Все файлы перемещены из packages/ и apps/ в src/
- [ ] Все импорты @hookah-db/* заменены на относительные пути
- [ ] Создан единый package.json
- [ ] Обновлен tsconfig.json
- [ ] Обновлен jest.config.js
- [ ] Обновлен Dockerfile
- [ ] Обновлен docker-compose.yml
- [ ] Обновлены все тесты
- [ ] Удалены старые файлы (pnpm-lock.yaml, turbo.json, etc.)
- [ ] Удалены старые директории (apps/, packages/)
- [ ] Обновлена документация

### После миграции
- [ ] npm install проходит без ошибок
- [ ] npm run type-check проходит без ошибок
- [ ] npm run build проходит без ошибок
- [ ] npm test проходит без ошибок (все тесты)
- [ ] npm run dev запускается без ошибок
- [ ] Docker образ собирается без ошибок
- [ ] Docker контейнер запускается без ошибок
- [ ] Health endpoint возвращает 200 OK
- [ ] API endpoints работают корректно
- [ ] Scraper работает корректно
- [ ] Database работает корректно
- [ ] Cache работает корректно
- [ ] Scheduler работает корректно
- [ ] Logging работает корректно
- [ ] Swagger UI доступен
- [ ] Все функции работают как раньше

---

## Потенциальные проблемы и решения

### Проблема 1: Длинные относительные пути

**Симптом**: Импорты типа `import { X } from '../../../types'`

**Решение**: Использовать path aliases в tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@types/*": ["types/*"],
      "@utils/*": ["utils/*"],
      "@scraper/*": ["scraper/*"],
      "@cache/*": ["cache/*"],
      "@database/*": ["database/*"],
      "@services/*": ["services/*"],
      "@scheduler/*": ["scheduler/*"],
      "@middleware/*": ["middleware/*"],
      "@controllers/*": ["controllers/*"],
      "@routes/*": ["routes/*"]
    }
  }
}
```

### Проблема 2: Circular dependencies

**Симптом**: Ошибка при сборке из-за циклических зависимостей

**Решение**: Рефакторинг кода для устранения циклических зависимостей

### Проблема 3: Тесты не находят модули

**Симптом**: Ошибка "Cannot find module" при запуске тестов

**Решение**: Обновить moduleNameMapper в jest.config.js

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

### Проблема 4: Docker build не находит файлы

**Симптом**: Ошибка при сборке Docker образа

**Решение**: Проверить .dockerignore и убедиться, что нужные файлы не игнорируются

### Проблема 5: TypeScript не компилируется

**Симптом**: Ошибка при запуске `npm run build`

**Решение**: Проверить все импорты и убедиться, что пути правильные

---

## Время на миграцию

Ориентировочное время выполнения:

| Этап | Время |
|-------|-------|
| Этап 1: Создание структуры | 15 минут |
| Этап 2: Обновление импортов | 60-90 минут |
| Этап 3: package.json | 20 минут |
| Этап 4: TypeScript конфигурация | 15 минут |
| Этап 5: Docker конфигурация | 20 минут |
| Этап 6: Обновление тестов | 60-90 минут |
| Этап 7: Удаление старых файлов | 10 минут |
| Этап 8: Обновление документации | 30 минут |
| Этап 9: Тестирование | 60-90 минут |
| Этап 10: Финализация | 10 минут |
| **ИТОГО** | **3.5-5.5 часов** |

---

## Резюме

Миграция с pnpm monorepo на npm monolith упростит архитектуру проекта, сделает его более понятным и легким для поддержки. Основные изменения:

1. **Единая структура**: Все файлы в src/ директории
2. **Относительные импорты**: Вместо @hookah-db/* используются относительные пути
3. **Единый package.json**: Все зависимости в одном файле
4. **Упрощенный Docker**: Нет Turborepo, только npm
5. **Меньше конфигурации**: Нет pnpm-workspace.yaml, turbo.json

После миграции проект будет работать так же, как раньше, но с более простой архитектурой.
