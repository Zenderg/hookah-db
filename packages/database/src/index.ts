// ============================================
// Schema Exports
// ============================================

export * from './schema';

// ============================================
// Database Client Exports
// ============================================

export { getDb, closeDb } from './client';
export type { DrizzleDB, Transaction } from './client';

// ============================================
// Query Helpers Exports
// ============================================

export {
  buildFilters,
  paginateQuery,
  withTransaction,
  prepareQuery,
  combineAndFilters,
  combineOrFilters,
} from './query-helpers';

export type {
  WhereClause,
  FilterOperator,
  FilterCondition,
} from './query-helpers';
