/**
 * ESLint Configuration for Hookah-DB Monorepo
 * 
 * This configuration enforces consistent code style across all packages
 * and includes TypeScript-specific rules for better type safety.
 */

const path = require('path');

module.exports = {
  root: true,
  
  // Parser configuration
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  
  // Environment settings
  env: {
    node: true,
    es2022: true,
  },
  
  // Extend recommended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  
  // Plugins
  plugins: ['@typescript-eslint', 'import'],
  
  // Rules
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'off', // Disabled: requires parserServices
    '@typescript-eslint/no-misused-promises': 'off', // Disabled: requires parserServices
    '@typescript-eslint/await-thenable': 'off', // Disabled: requires parserServices
    '@typescript-eslint/no-unnecessary-type-assertion': 'off', // Disabled: requires parserServices
    
    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'off', // Disabled for .js extensions in ESM
    'import/no-cycle': 'warn',
    'import/no-duplicates': 'error',
    
    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
  
  // Ignore patterns
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
    'build/',
  ],
  
  // Settings
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
};
