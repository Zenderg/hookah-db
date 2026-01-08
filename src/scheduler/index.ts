/**
 * Scheduler module
 *
 * Scheduled task runner for hookah-db
 *
 * This module provides scheduling capabilities for automated data refresh tasks.
 */

import { Scheduler } from './scheduler';
import { DataService } from '../services';
import type { SQLiteDatabase } from '../database';

export { Scheduler } from './scheduler';
export type {
  SchedulerConfig,
  TaskStatus,
  ScheduledTaskConfig,
  TaskExecutionResult,
  SchedulerStats,
  ScheduledTask
} from './types';

/**
 * Create a new Scheduler instance
 *
 * @param dataService DataService for data operations
 * @param db SQLiteDatabase for persistent storage
 * @param config Scheduler configuration
 * @returns New Scheduler instance
 */
export function createScheduler(
  dataService: InstanceType<typeof DataService>,
  db: SQLiteDatabase,
  config?: {
    enabled?: boolean;
    brandsSchedule?: string;
    flavorsSchedule?: string;
    allDataSchedule?: string;
    timezone?: string;
    maxExecutionHistory?: number;
  }
): Scheduler {
  return new Scheduler(
    dataService,
    db,
    {
      enabled: config?.enabled ?? true,
      brandsSchedule: config?.brandsSchedule,
      flavorsSchedule: config?.flavorsSchedule,
      allDataSchedule: config?.allDataSchedule,
      timezone: config?.timezone,
      maxExecutionHistory: config?.maxExecutionHistory
    }
  );
}

export default Scheduler;
