import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { ApiKeysService } from './api-keys/api-keys.service';
import { BrandsController } from './brands/brands.controller';
import { BrandsRepository } from './brands/brands.repository';
import { BrandsService } from './brands/brands.service';
import { HttpExceptionFilter } from './common/filters/http-exception-filter';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { LinesController } from './lines/lines.controller';
import { LinesRepository } from './lines/lines.repository';
import { LinesService } from './lines/lines.service';
import { TobaccosController } from './tobaccos/tobaccos.controller';
import { TobaccosRepository } from './tobaccos/tobaccos.repository';
import { TobaccosService } from './tobaccos/tobaccos.service';

jest.mock('./api-keys/api-keys.service', () => ({
  ApiKeysService: class ApiKeysService {},
}));

const existingId = '00000000-0000-4000-8000-000000000001';
const missingId = '00000000-0000-4000-8000-000000000099';
const malformedRoutes = [
  '/brands/not-a-uuid',
  '/lines/not-a-uuid',
  '/tobaccos/not-a-uuid',
  '/brands/not-a-uuid/tobaccos',
  '/lines/not-a-uuid/tobaccos',
];
const existingRoutes = [
  `/brands/${existingId}`,
  `/lines/${existingId}`,
  `/tobaccos/${existingId}`,
  `/brands/${existingId}/tobaccos`,
  `/lines/${existingId}/tobaccos`,
];
const missingRoutes = [
  `/brands/${missingId}`,
  `/lines/${missingId}`,
  `/tobaccos/${missingId}`,
  `/brands/${missingId}/tobaccos`,
  `/lines/${missingId}/tobaccos`,
];

const brandsRepository = {
  findOne: jest.fn(),
  getCountries: jest.fn().mockResolvedValue([]),
  getStatuses: jest.fn().mockResolvedValue([]),
  getNames: jest.fn().mockResolvedValue([]),
};
const linesRepository = {
  findOne: jest.fn(),
  getStatuses: jest.fn().mockResolvedValue([]),
};
const tobaccosRepository = {
  findOne: jest.fn(),
  findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  getStatuses: jest.fn().mockResolvedValue([]),
};

function expectNoCatalogRepositoryCalls() {
  expect(brandsRepository.findOne).not.toHaveBeenCalled();
  expect(linesRepository.findOne).not.toHaveBeenCalled();
  expect(tobaccosRepository.findOne).not.toHaveBeenCalled();
  expect(tobaccosRepository.findAll).not.toHaveBeenCalled();
}

describe('catalog UUID path validation', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BrandsController, LinesController, TobaccosController],
      providers: [
        BrandsService,
        LinesService,
        TobaccosService,
        {
          provide: BrandsRepository,
          useValue: brandsRepository,
        },
        {
          provide: LinesRepository,
          useValue: linesRepository,
        },
        {
          provide: TobaccosRepository,
          useValue: tobaccosRepository,
        },
        {
          provide: APP_GUARD,
          useClass: ApiKeyGuard,
        },
        {
          provide: ApiKeysService,
          useValue: {
            validateApiKey: jest.fn((key: string) =>
              Promise.resolve(
                key === 'active-key' ? { id: 'key-id', isActive: true } : null,
              ),
            ),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(malformedRoutes)(
    '%s rejects malformed UUIDs before reaching catalog repositories',
    async (route) => {
      const response = await request(app.getHttpServer())
        .get(route)
        .set('X-API-Key', 'active-key')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        path: route,
      });
      expectNoCatalogRepositoryCalls();
    },
  );

  it.each(existingRoutes)(
    '%s passes valid UUIDs to the real service',
    async (route) => {
      brandsRepository.findOne.mockResolvedValue({ id: existingId });
      linesRepository.findOne.mockResolvedValue({ id: existingId });
      tobaccosRepository.findOne.mockResolvedValue({ id: existingId });

      await request(app.getHttpServer())
        .get(route)
        .set('X-API-Key', 'active-key')
        .expect(200);

      const pathId = existingId;
      if (route.startsWith('/brands/')) {
        expect(brandsRepository.findOne).toHaveBeenCalledWith(pathId);
      } else if (route.startsWith('/lines/')) {
        expect(linesRepository.findOne).toHaveBeenCalledWith(pathId);
      } else {
        expect(tobaccosRepository.findOne).toHaveBeenCalledWith(pathId);
      }
    },
  );

  it.each(missingRoutes)(
    '%s preserves valid-but-missing UUID 404s',
    async (route) => {
      brandsRepository.findOne.mockResolvedValue(null);
      linesRepository.findOne.mockResolvedValue(null);
      tobaccosRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(route)
        .set('X-API-Key', 'active-key')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        path: route,
      });
    },
  );

  it('keeps API key authorization ahead of UUID validation', async () => {
    await request(app.getHttpServer()).get('/brands/not-a-uuid').expect(401);
    expectNoCatalogRepositoryCalls();
  });
});
