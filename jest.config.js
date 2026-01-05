module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/**/*.ts',
    'apps/**/*.ts',
    '!packages/**/*.d.ts',
    '!apps/**/*.d.ts',
    '!packages/**/dist/**',
    '!apps/**/dist/**',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Map packages to their source directories
    '^@hookah-db/(types|utils|scraper|parser|cache|services|config|tsconfig)$': '<rootDir>/packages/$1/src',
    // Map API app controllers and routes to their source directories
    '^@hookah-db/api/(controllers|routes|middleware)$': '<rootDir>/apps/api/src/$1',
    // Map API server specifically
    '^@hookah-db/api/server$': '<rootDir>/apps/api/src/server',
    // Map CLI app to its source directory
    '^@hookah-db/cli/(.*)$': '<rootDir>/apps/cli/src/$1',
  },
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
