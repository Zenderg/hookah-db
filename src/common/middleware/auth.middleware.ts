import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface ApiKeyRequest extends Request {
  apiKey?: string;
}

function getFirstHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: ApiKeyRequest, res: Response, next: NextFunction): void {
    const apiKey =
      getFirstHeaderValue(req.headers['x-api-key']) ||
      getFirstHeaderValue(req.headers.authorization).replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // TODO: Validate API key against database
    // Attach API key to request for use in guards/services
    req.apiKey = apiKey;

    next();
  }
}
