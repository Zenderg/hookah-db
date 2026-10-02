import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { BrandsController } from './brands/brands.controller';
import { BrandsService } from './brands/brands.service';
import { HttpExceptionFilter } from './common/filters/http-exception-filter';
import { LinesController } from './lines/lines.controller';
import { LinesService } from './lines/lines.service';
import { TobaccosController } from './tobaccos/tobaccos.controller';
import { TobaccosService } from './tobaccos/tobaccos.service';

const brandId = '00000000-0000-4000-8000-000000000001';
const brandFindAll = jest.fn().mockResolvedValue({ data: [], meta: {} });
const findTobaccosByBrand = jest.fn().mockResolvedValue({ data: [], meta: {} });
const findTobaccosByLine = jest.fn().mockResolvedValue({ data: [], meta: {} });
const tobaccoFindAll = jest.fn().mockResolvedValue({ data: [], meta: {} });

const endpoints = [
  {
    label: 'brands',
    path: '/brands',
    service: brandFindAll,
  },
  {
    label: 'tobaccos',
    path: '/tobaccos',
    service: tobaccoFindAll,
  },
  {
    label: 'tobaccos by brand',
    path: `/brands/${brandId}/tobaccos`,
    service: findTobaccosByBrand,
  },
  {
    label: 'tobaccos by line',
    path: `/lines/${brandId}/tobaccos`,
    service: findTobaccosByLine,
  },
];

const validSorts = [
  ['brand rating descending', '/brands?sortBy=rating&order=desc'],
  ['brand name ascending', '/brands?sortBy=name&order=asc'],
  ['tobacco rating ascending', '/tobaccos?sortBy=rating&order=asc'],
  ['tobacco name descending', '/tobaccos?sortBy=name&order=desc'],
  ['tobacco dateAdded ascending', '/tobaccos?sortBy=dateAdded&order=asc'],
  [
    'nested tobacco dateAdded descending',
    `/brands/${brandId}/tobaccos?sortBy=dateAdded&order=desc`,
  ],
  [
    'line tobacco name ascending',
    `/lines/${brandId}/tobaccos?sortBy=name&order=asc`,
  ],
  ['default sorts', '/tobaccos'],
  ['brand default sort', '/brands'],
] as const;

const invalidSorts = [
  ['nonexistent views sort', '?sortBy=views'],
  ['unknown sort', '?sortBy=unsupported'],
  ['inherited object property', '?sortBy=toString'],
  ['repeated sort field', '?sortBy=name&sortBy=rating'],
  ['invalid order', '?order=desc%2Cunsupported'],
] as const;

function expectNoCatalogCalls(): void {
  expect(brandFindAll).not.toHaveBeenCalled();
  expect(findTobaccosByBrand).not.toHaveBeenCalled();
  expect(findTobaccosByLine).not.toHaveBeenCalled();
  expect(tobaccoFindAll).not.toHaveBeenCalled();
}

describe('catalog sort query validation', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BrandsController, LinesController, TobaccosController],
      providers: [
        {
          provide: BrandsService,
          useValue: {
            findAll: brandFindAll,
            findTobaccosByBrand,
          },
        },
        {
          provide: LinesService,
          useValue: { findTobaccosByLine },
        },
        {
          provide: TobaccosService,
          useValue: { findAll: tobaccoFindAll },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(validSorts)('%s is accepted', async (_label, path) => {
    await request(app.getHttpServer()).get(path).expect(200);
    const requestPath = path.split('?')[0];
    expect(
      endpoints.find((endpoint) => endpoint.path === requestPath)?.service,
    ).toHaveBeenCalledTimes(1);
  });

  it.each(endpoints)(
    '%s rejects invalid sort input before service access',
    async (endpoint) => {
      for (const [, query] of invalidSorts) {
        jest.clearAllMocks();
        await request(app.getHttpServer())
          .get(`${endpoint.path}${query}`)
          .expect(400);
        expectNoCatalogCalls();
      }
    },
  );
});
