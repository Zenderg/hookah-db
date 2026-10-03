import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { performance } from 'node:perf_hooks';
import { lastValueFrom, of } from 'rxjs';
import { ApiKey } from '../../api-keys/api-keys.entity';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { LoggingInterceptor } from './logging.interceptor';

jest.mock('uuid', () => ({ v4: () => 'test-api-key' }));

describe('LoggingInterceptor request timing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes API key validation time and never logs the complete key', async () => {
    const apiKey = 'full-secret-api-key-value';
    const request = {
      method: 'GET',
      url: '/tobaccos',
      headers: { 'x-api-key': apiKey },
    };
    const response = { statusCode: 200 };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const validateApiKey = jest.fn().mockResolvedValue({
      id: 'api-key-id',
      key: apiKey,
      name: 'Test',
      isActive: true,
      requestCount: 1,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ApiKey);
    const apiKeysService = {
      validateApiKey,
    } as unknown as ApiKeysService;
    const logger = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(175);

    const httpContext = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    const guard = new ApiKeyGuard(reflector, apiKeysService);
    await expect(guard.canActivate(httpContext)).resolves.toBe(true);
    await lastValueFrom(
      new LoggingInterceptor().intercept(httpContext, {
        handle: () => of('ok'),
      }),
    );

    const logMessage = logger.mock.calls[0][0] as string;
    expect(logMessage).toContain('GET /tobaccos 200 75ms');
    expect(logMessage).toContain('API Key: full-sec...');
    expect(logMessage).not.toContain(apiKey);
    expect(validateApiKey).toHaveBeenCalledWith(apiKey);
  });
});
