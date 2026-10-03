import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { performance } from 'node:perf_hooks';

type RequestWithTiming = Request & { requestStartedAt?: number };

function getFirstHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithTiming>();
    const { method, url, headers } = request;
    const apiKey =
      getFirstHeaderValue(headers['x-api-key']) ||
      getFirstHeaderValue(headers.authorization).replace('Bearer ', '');

    const startedAt = request.requestStartedAt ?? performance.now();
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const delay = Math.round(performance.now() - startedAt);
        this.logger.log(
          `${method} ${url} ${response.statusCode} ${delay}ms - API Key: ${apiKey?.substring(0, 8)}...`,
        );
      }),
    );
  }
}
