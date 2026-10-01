import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ENV_KEYS = [
  'PORT',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'PARSER_CRON_ENABLED',
];

function loadDataSource(): typeof import('./data-source') {
  let loaded = {} as typeof import('./data-source');
  jest.isolateModules(() => {
    loaded =
      jest.requireActual<typeof import('./data-source')>('./data-source');
  });
  return loaded;
}

describe('migration data source environment', () => {
  const originalCwd = process.cwd();
  let temporaryDirectory: string;
  let originalEnvironment: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnvironment = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    temporaryDirectory = mkdtempSync(join(tmpdir(), 'hookah-db-data-source-'));
    process.chdir(temporaryDirectory);
    jest.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(temporaryDirectory, { recursive: true, force: true });
    for (const key of ENV_KEYS) {
      const value = originalEnvironment[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('loads .env values and preserves shell variable precedence', () => {
    writeFileSync(
      join(temporaryDirectory, '.env'),
      [
        'DATABASE_HOST=127.0.0.1',
        'DATABASE_PORT=35443',
        'DATABASE_USERNAME=issue3_review_user',
        'DATABASE_PASSWORD=issue3_review_password',
        'DATABASE_NAME=issue3_review_db',
      ].join('\n'),
    );
    process.env.DATABASE_HOST = 'database-from-shell';

    const { AppDataSource } = loadDataSource();

    expect(AppDataSource.options).toMatchObject({
      host: 'database-from-shell',
      port: 35443,
      username: 'issue3_review_user',
      password: 'issue3_review_password',
      database: 'issue3_review_db',
    });
    expect(AppDataSource.isInitialized).toBe(false);
  });

  it('keeps the existing database defaults when no .env file is present', () => {
    const { AppDataSource } = loadDataSource();

    expect(AppDataSource.options).toMatchObject({
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'hookah_db',
    });
    expect(AppDataSource.isInitialized).toBe(false);
  });

  it('rejects an invalid database port before a migration can connect', () => {
    writeFileSync(
      join(temporaryDirectory, '.env'),
      'DATABASE_PORT=not-a-port\n',
    );

    expect(loadDataSource).toThrow(
      'Invalid environment configuration: DATABASE_PORT must be a valid TCP port',
    );
  });
});
