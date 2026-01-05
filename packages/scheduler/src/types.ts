/**
 * Types for scheduler package
 */

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  /** Whether scheduler is enabled */
  enabled: boolean;
  /** Cron expression for brands refresh (default: "0 2 * * *") */
  brandsSchedule?: string;
  /** Cron expression for flavors refresh (default: "0 3 * * *") */
  flavorsSchedule?: string;
  /** Cron expression for all data refresh (default: "0 4 * * *") */
  allDataSchedule?: string;
  /** Timezone for scheduled tasks */
  timezone?: string;
  /** Maximum execution history entries per task (default: 100) */
  maxExecutionHistory?: number;
}

/**
 * Task status
 */
export interface TaskStatus {
  /** Task ID */
  taskId: string;
  /** Task name */
  name: string;
  /** Whether task is currently running */
  running: boolean;
  /** Whether task is enabled */
  enabled: boolean;
  /** Last run timestamp */
  lastRun?: Date;
  /** Next run timestamp */
  nextRun?: Date;
  /** Total run count */
  runCount: number;
  /** Total error count */
  errorCount: number;
}

/**
 * Scheduled task configuration
 */
export interface ScheduledTaskConfig {
  /** Task name */
  name: string;
  /** Cron expression (e.g., '0 0 * * *' for daily at midnight) */
  cronExpression: string;
  /** Task function to execute */
  task: () => Promise<void>;
  /** Whether task is enabled */
  enabled?: boolean;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  /** Task ID */
  taskId: string;
  /** Task name */
  taskName: string;
  /** Whether execution was successful */
  success: boolean;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime: Date;
  /** Duration in milliseconds */
  duration: number;
  /** Error if execution failed */
  error?: Error;
}

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  /** Whether scheduler is running */
  isRunning: boolean;
  /** Total number of scheduled tasks */
  tasksCount: number;
  /** Number of active (enabled) tasks */
  activeTasksCount: number;
  /** Total number of task executions */
  totalRuns: number;
  /** Total number of errors */
  totalErrors: number;
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  /** Scheduler uptime in milliseconds */
  uptime: number;
}

/**
 * Scheduled task interface
 */
export interface ScheduledTask {
  /** Task ID */
  taskId: string;
  /** Task name */
  name: string;
  /** Cron expression */
  cronExpression: string;
  /** Task function */
  task: () => Promise<void>;
  /** Whether task is enabled */
  enabled: boolean;
  /** Last run timestamp */
  lastRun?: Date;
  /** Next run timestamp */
  nextRun?: Date;
  /** Total run count */
  runCount: number;
  /** Total error count */
  errorCount: number;
  /** Execution history */
  executionHistory: TaskExecutionResult[];
}
