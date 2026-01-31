import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { ApiKey } from '../../api-keys/api-keys.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RequestWithApiKey {
  apiKey?: ApiKey;
  headers: {
    'x-api-key'?: string;
    authorization?: string;
  };
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const apiKey =
      request.headers['x-api-key'] ||
      request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate API key against database and increment request count
    const validatedApiKey = await this.apiKeysService.validateApiKey(apiKey);

    if (!validatedApiKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // Attach validated API key to request for potential use in controllers
    request.apiKey = validatedApiKey;

    return true;
  }
}
