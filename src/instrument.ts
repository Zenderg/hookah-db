import * as Sentry from '@sentry/nestjs';
import dotenv from 'dotenv';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  attachStacktrace: true,
  includeLocalVariables: true,
  beforeSend(event, hint) {
    const exception = hint.originalException;
    if (
      exception &&
      typeof exception === 'object' &&
      'status' in exception &&
      typeof exception.status === 'number' &&
      exception.status >= 400 &&
      exception.status < 500
    ) {
      return null;
    }
    return event;
  },
});
