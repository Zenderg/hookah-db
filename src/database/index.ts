/**
 * Database module exports
 * 
 * This module provides SQLite database integration for hookah tobacco data.
 * It offers synchronous CRUD operations for Brand and Flavor data with prepared statements
 * for security and WAL mode for performance.
 */

export { SQLiteDatabase } from './sqlite-database';
export type { DatabaseStats, IDatabase } from './types';
