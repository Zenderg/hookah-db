import { isParserCronEnabled, validateEnvironment } from './env.validation';

describe('environment validation', () => {
  describe('isParserCronEnabled', () => {
    it('keeps the parser cron enabled when the variable is not set', () => {
      expect(isParserCronEnabled(undefined)).toBe(true);
    });

    it.each(['false', '0', 'no', 'off', 'FALSE'])(
      'disables the parser cron for %s',
      (value) => {
        expect(isParserCronEnabled(value)).toBe(false);
      },
    );

    it.each(['true', '1', 'yes', 'on', 'TRUE'])(
      'enables the parser cron for %s',
      (value) => {
        expect(isParserCronEnabled(value)).toBe(true);
      },
    );
  });

  describe('validateEnvironment', () => {
    it('returns normalized values for a valid local configuration', () => {
      const env = validateEnvironment({
        PORT: '3000',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_USERNAME: 'postgres',
        DATABASE_PASSWORD: 'postgres',
        DATABASE_NAME: 'hookah_db',
        PARSER_CRON_ENABLED: 'false',
      });

      expect(env.PORT).toBe(3000);
      expect(env.DATABASE_PORT).toBe(5432);
      expect(env.PARSER_CRON_ENABLED).toBe('false');
    });

    it('throws a readable error for invalid numeric values', () => {
      expect(() =>
        validateEnvironment({
          PORT: 'api',
          DATABASE_PORT: 'postgres',
        }),
      ).toThrow(
        'Invalid environment configuration: PORT must be a valid TCP port; DATABASE_PORT must be a valid TCP port',
      );
    });

    it('throws a readable error for invalid parser cron values', () => {
      expect(() =>
        validateEnvironment({
          PARSER_CRON_ENABLED: 'sometimes',
        }),
      ).toThrow(
        'Invalid environment configuration: PARSER_CRON_ENABLED must be one of true, false, 1, 0, yes, no, on, off',
      );
    });
  });
});
