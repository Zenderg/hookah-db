/**
 * @hookah-db/scheduler
 *
 * Scheduled task runner for hookah-db
 *
 * This package provides scheduling capabilities for automated data refresh tasks.
 */

import { Scheduler } from './scheduler';
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
 * @param config Scheduler configuration
 * @returns New Scheduler instance
 */
export function createScheduler(config?: {
  enabled?: boolean;
  brandsSchedule?: string;
  flavorsSchedule?: string;
  allDataSchedule?: string;
  timezone?: string;
  maxExecutionHistory?: number;
}): Scheduler {
  return new Scheduler({
    enabled: config?.enabled ?? true,
    brandsSchedule: config?.brandsSchedule,
    flavorsSchedule: config?.flavorsSchedule,
    allDataSchedule: config?.allDataSchedule,
    timezone: config?.timezone,
    maxExecutionHistory: config?.maxExecutionHistory
  });
}

export default Scheduler;
