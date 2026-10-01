import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import request from 'supertest';
import type { Server } from 'node:http';
import { ApiKeysService } from './api-keys/api-keys.service';
import { ApiKeysRepository } from './api-keys/api-keys.repository';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BrandsController } from './brands/brands.controller';
import { BrandsService } from './brands/brands.service';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { FlavorsController } from './flavors/flavors.controller';
import { FlavorsService } from './flavors/flavors.service';
import { HealthController } from './health/health.controller';
import { LinesController } from './lines/lines.controller';
import { LinesService } from './lines/lines.service';
import { TobaccosController } from './tobaccos/tobaccos.controller';
import { TobaccosService } from './tobaccos/tobaccos.service';

jest.mock('uuid', () => ({ v4: () => 'test-api-key' }));

const fixtureId = '00000000-0000-4000-8000-000000000001';
const catalogRoutes = [
  '/',
  '/brands',
  '/brands/countries',
  '/brands/statuses',
  '/brands/names',
  `/brands/${fixtureId}`,
  `/brands/${fixtureId}/tobaccos`,
  '/lines',
  '/lines/statuses',
  `/lines/${fixtureId}`,
  `/lines/${fixtureId}/tobaccos`,
  '/tobaccos',
  '/tobaccos/statuses',
  '/tobaccos/by-url?url=https%3A%2F%2Fhtreviews.org%2Ftobaccos%2Fdemo-clouds%2Fclassic-mix%2Fapple-mint',
  `/tobaccos/${fixtureId}`,
  '/flavors',
];

describe('catalog API key access', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AppController,
        HealthController,
        BrandsController,
        LinesController,
        TobaccosController,
        FlavorsController,
      ],
      providers: [
        AppService,
        ApiKeyGuard,
        ApiKeysService,
        {
          provide: APP_GUARD,
          useClass: ApiKeyGuard,
        },
        {
          provide: ApiKeysRepository,
          useValue: {
            findOneByKey: jest.fn((key: string) =>
              Promise.resolve(
                key === 'active-key'
                  ? { id: 'active-key', key, isActive: true }
                  : key === 'inactive-key'
                    ? { id: 'inactive-key', key, isActive: false }
                    : null,
              ),
            ),
            incrementRequestCount: jest.fn().mockResolvedValue(undefined),
            updateLastUsed: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: BrandsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            getCountries: jest.fn().mockResolvedValue([]),
            getStatuses: jest.fn().mockResolvedValue([]),
            getNames: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({}),
            findTobaccosByBrand: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: LinesService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            getStatuses: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({}),
            findTobaccosByLine: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: TobaccosService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            getStatuses: jest.fn().mockResolvedValue([]),
            findByUrl: jest.fn().mockResolvedValue({}),
            findOne: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: FlavorsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: HealthCheckService,
          useValue: { check: jest.fn().mockResolvedValue({ status: 'ok' }) },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: { pingCheck: jest.fn() },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(catalogRoutes)('%s rejects requests without a key', async (route) => {
    await request(app.getHttpServer()).get(route).expect(401);
  });

  it.each(catalogRoutes)('%s rejects an invalid key', async (route) => {
    await request(app.getHttpServer())
      .get(route)
      .set('X-API-Key', 'invalid-key')
      .expect(401);
  });

  it.each(catalogRoutes)('%s rejects an inactive key', async (route) => {
    await request(app.getHttpServer())
      .get(route)
      .set('X-API-Key', 'inactive-key')
      .expect(401);
  });

  it.each(catalogRoutes)('%s accepts an active X-API-Key', async (route) => {
    await request(app.getHttpServer())
      .get(route)
      .set('X-API-Key', 'active-key')
      .expect(200);
  });

  it.each(catalogRoutes)('%s accepts an active Bearer key', async (route) => {
    await request(app.getHttpServer())
      .get(route)
      .set('Authorization', 'Bearer active-key')
      .expect(200);
  });

  it.each([undefined, 'invalid-key', 'inactive-key'])(
    'keeps the health endpoint public for key %s',
    async (key) => {
      const health = request(app.getHttpServer()).get('/health');
      if (key) {
        health.set('X-API-Key', key);
      }
      await health.expect(200);
    },
  );
});
