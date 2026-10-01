import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception-filter';
import { TobaccosController } from './tobaccos.controller';
import { TobaccosRepository } from './tobaccos.repository';
import { TobaccosService } from './tobaccos.service';
import { Tobacco } from './tobaccos.entity';

jest.mock('../api-keys/api-keys.service', () => ({
  ApiKeysService: class ApiKeysService {},
}));

describe('GET /tobaccos/:id', () => {
  let app: INestApplication<Server>;
  const repository = {
    findOne: jest.fn(),
  };

  const tobacco = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    slug: 'apple-mint',
    name: 'Apple Mint',
  } as Tobacco;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TobaccosController],
      providers: [
        TobaccosService,
        ApiKeyGuard,
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
        {
          provide: TobaccosRepository,
          useValue: repository,
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
    repository.findOne.mockReset();
  });

  it('returns 404 when the repository has no matching tobacco', async () => {
    repository.findOne.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get('/tobaccos/00000000-0000-4000-8000-000000000099')
      .set('X-API-Key', 'active-key')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: 'Tobacco not found',
      path: '/tobaccos/00000000-0000-4000-8000-000000000099',
    });
  });

  it('returns the requested tobacco when it exists', async () => {
    repository.findOne.mockResolvedValue(tobacco);

    const response = await request(app.getHttpServer())
      .get(`/tobaccos/${tobacco.id}`)
      .set('X-API-Key', 'active-key')
      .expect(200);

    expect(response.body).toMatchObject({
      id: tobacco.id,
      slug: 'apple-mint',
    });
  });

  it('keeps repository failures as HTTP 500', async () => {
    repository.findOne.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app.getHttpServer())
      .get(`/tobaccos/${tobacco.id}`)
      .set('X-API-Key', 'active-key')
      .expect(500);

    expect(response.body).toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
      path: `/tobaccos/${tobacco.id}`,
    });
  });
});
