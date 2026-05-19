import type { ConfigObject } from '@nestjs/config';

const BOOLEAN_VALUES = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
const FALSE_VALUES = ['false', '0', 'no', 'off'];

function normalizeEnvironmentValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase();
  }

  return '';
}

export interface ValidatedEnvironment extends ConfigObject {
  PORT?: number;
  DATABASE_HOST?: string;
  DATABASE_PORT?: number;
  DATABASE_USERNAME?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_NAME?: string;
  CORS_ORIGIN?: string;
  SENTRY_DSN?: string;
  PARSER_CRON_ENABLED?: string;
}

export function isParserCronEnabled(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return true;
  }

  return !FALSE_VALUES.includes(normalizeEnvironmentValue(value));
}

function parsePort(
  value: unknown,
  variableName: string,
  errors: string[],
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    errors.push(`${variableName} must be a valid TCP port`);
    return undefined;
  }

  return parsed;
}

function validateBooleanString(
  value: unknown,
  variableName: string,
  errors: string[],
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = normalizeEnvironmentValue(value);
  if (!BOOLEAN_VALUES.includes(normalized)) {
    errors.push(
      `${variableName} must be one of true, false, 1, 0, yes, no, on, off`,
    );
    return undefined;
  }

  return normalized;
}

export function validateEnvironment(
  config: ConfigObject,
): ValidatedEnvironment {
  const errors: string[] = [];
  const port = parsePort(config.PORT, 'PORT', errors);
  const databasePort = parsePort(config.DATABASE_PORT, 'DATABASE_PORT', errors);
  const parserCronEnabled = validateBooleanString(
    config.PARSER_CRON_ENABLED,
    'PARSER_CRON_ENABLED',
    errors,
  );

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return {
    ...config,
    ...(port !== undefined ? { PORT: port } : {}),
    ...(databasePort !== undefined ? { DATABASE_PORT: databasePort } : {}),
    ...(parserCronEnabled !== undefined
      ? { PARSER_CRON_ENABLED: parserCronEnabled }
      : {}),
  };
}
