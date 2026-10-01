import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { ApiKeysRepository } from '../api-keys/api-keys.repository';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { HttpExceptionFilter } from '../common/filters/http-exception-filter';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { TobaccosController } from './tobaccos.controller';
import { TobaccosService } from './tobaccos.service';

jest.mock('uuid', () => ({ v4: () => 'test-api-key' }));

describe('GET /tobaccos/by-url validation', () => {
  let app: INestApplication<Server>;
  const findByUrl = jest.fn();
  const apiKeysRepository = {
    findOneByKey: jest.fn((key: string) =>
      Promise.resolve(
        key === 'active-key' ? { id: 'active-key', key, isActive: true } : null,
      ),
    ),
    incrementRequestCount: jest.fn().mockResolvedValue(undefined),
    updateLastUsed: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TobaccosController],
      providers: [
        ApiKeyGuard,
        ApiKeysService,
        {
          provide: APP_GUARD,
          useClass: ApiKeyGuard,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
        {
          provide: ApiKeysRepository,
          useValue: apiKeysRepository,
        },
        {
          provide: TobaccosService,
          useValue: { findByUrl },
        },
      ],
    }).compile();

    app = module.createNestApplication();
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
    findByUrl.mockResolvedValue({ id: 'apple-mint-id', slug: 'apple-mint' });
  });

  it.each([
    ['malformed', 'not-a-url'],
    ['empty', ''],
    ['relative', '/tobaccos/apple-mint'],
  ])(
    'returns HTTP 400 for %s URL without calling the service',
    async (_label, url) => {
      const response = await request(app.getHttpServer())
        .get('/tobaccos/by-url')
        .query({ url })
        .set('X-API-Key', 'active-key')
        .expect(400);

      expect(response.body).toMatchObject({ statusCode: 400 });
      const responseBody = response.body as { message: string[] };
      expect(responseBody.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('url must be a URL address'),
        ]),
      );
      expect(findByUrl).not.toHaveBeenCalled();
    },
  );

  it.each([
    'https://example.com/tobaccos/demo-clouds/classic-mix/apple-mint',
    'https://htreviews.org/brands/demo-clouds',
  ])(
    'keeps rejecting URLs outside the accepted domain/path: %s',
    async (url) => {
      await request(app.getHttpServer())
        .get('/tobaccos/by-url')
        .query({ url })
        .set('X-API-Key', 'active-key')
        .expect(400);

      expect(findByUrl).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'canonical URL',
      'https://htreviews.org/tobaccos/demo-clouds/classic-mix/apple-mint',
    ],
    [
      'URL with query and hash',
      'https://htreviews.org/tobaccos/demo-clouds/classic-mix/apple-mint?campaign=qa#review',
    ],
  ])('looks up the normalized %s', async (_label, url) => {
    const response = await request(app.getHttpServer())
      .get('/tobaccos/by-url')
      .query({ url })
      .set('X-API-Key', 'active-key')
      .expect(200);

    expect(findByUrl).toHaveBeenCalledWith(
      'https://htreviews.org/tobaccos/demo-clouds/classic-mix/apple-mint',
    );
    expect(response.body).toEqual({ id: 'apple-mint-id', slug: 'apple-mint' });
  });

  it('requires a valid API key before URL validation', async () => {
    await request(app.getHttpServer())
      .get('/tobaccos/by-url')
      .query({ url: 'not-a-url' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/tobaccos/by-url')
      .query({ url: 'not-a-url' })
      .set('X-API-Key', 'invalid-key')
      .expect(401);

    expect(findByUrl).not.toHaveBeenCalled();
  });
});
