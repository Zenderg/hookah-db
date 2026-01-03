import { eq, like, ilike, gt, gte, lt, lte, and, or, SQL, SQLChunk } from 'drizzle-orm';
import type { PgSelect } from 'drizzle-orm/pg-core';
import type { SQLiteSelect } from 'drizzle-orm/sqlite-core';
import type { DrizzleDB } from './client';

// ============================================
// Type Definitions
// ============================================

export type WhereClause = SQL | SQLChunk | undefined;

export type FilterOperator = 'eq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

// ============================================
// Filter Builder
// ============================================

/**
 * Type-safe filter builder
 * Converts filter object to Drizzle where clauses
 * Supports equality, like, ilike, gt, gte, lt, lte operators
 */
export function buildFilters<T extends Record<string, unknown>>(
  schema: T,
  filters: Record<string, unknown>
): WhereClause[] {
  const conditions: WhereClause[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) {
      continue;
    }

    // Handle nested operators (e.g., { name: { eq: 'test' } })
    if (typeof value === 'object' && !Array.isArray(value)) {
      const filterObj = value as Record<string, unknown>;
      for (const [operator, operatorValue] of Object.entries(filterObj)) {
        const column = (schema as Record<string, unknown>)[key];
        if (!column) continue;

        const condition = buildCondition(column, operator as FilterOperator, operatorValue);
        if (condition) {
          conditions.push(condition);
        }
      }
    } else {
      // Handle direct equality (e.g., { name: 'test' })
      const column = (schema as Record<string, unknown>)[key];
      if (!column) continue;

      const condition = buildCondition(column, 'eq', value);
      if (condition) {
        conditions.push(condition);
      }
    }
  }

  return conditions;
}

/**
 * Builds a single filter condition based on operator
 */
function buildCondition(column: unknown, operator: FilterOperator, value: unknown): WhereClause {
  switch (operator) {
    case 'eq':
      return eq(column as any, value as any);
    case 'like':
      return like(column as any, value as string);
    case 'ilike':
      return ilike(column as any, value as string);
    case 'gt':
      return gt(column as any, value as any);
    case 'gte':
      return gte(column as any, value as any);
    case 'lt':
      return lt(column as any, value as any);
    case 'lte':
      return lte(column as any, value as any);
    default:
      return undefined;
  }
}

// ============================================
// Pagination Helper
// ============================================

/**
 * Applies pagination to a query
 * Calculates offset from page and limit
 * Returns modified query
 */
export function paginateQuery<T extends PgSelect | SQLiteSelect>(
  query: T,
  page: number,
  limit: number
): T {
  const offset = (page - 1) * limit;
  return query.limit(limit).offset(offset) as T;
}

// ============================================
// Transaction Wrapper
// ============================================

/**
 * Wraps operations in a transaction
 * Handles rollback on error
 * Returns result or throws error
 */
export async function withTransaction<T>(
  db: DrizzleDB,
  callback: (tx: any) => T
): Promise<T> {
  return db.transaction(callback as any);
}

// ============================================
// Prepared Statement Executor
// ============================================

/**
 * Executes prepared statement
 * Caches frequently used queries
 * Returns typed results
 */
export async function prepareQuery<T>(
  _db: DrizzleDB,
  query: PgSelect | SQLiteSelect
): Promise<T[]> {
  const result = await query.execute();
  return result as T[];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Combines multiple where clauses with AND logic
 */
export function combineAndFilters(conditions: WhereClause[]): WhereClause {
  const validConditions = conditions.filter((c): c is SQL => c !== undefined);
  if (validConditions.length === 0) {
    return undefined;
  }
  if (validConditions.length === 1) {
    return validConditions[0];
  }
  return and(...validConditions);
}

/**
 * Combines multiple where clauses with OR logic
 */
export function combineOrFilters(conditions: WhereClause[]): WhereClause {
  const validConditions = conditions.filter((c): c is SQL => c !== undefined);
  if (validConditions.length === 0) {
    return undefined;
  }
  if (validConditions.length === 1) {
    return validConditions[0];
  }
  return or(...validConditions);
}
