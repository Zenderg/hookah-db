/**
 * Scheduler - Scheduled task runner for hookah-db
 *
 * This module provides main Scheduler class for managing
 * automated data refresh tasks using node-cron.
 * Works directly with SQLite database and DataService for data persistence.
 */

import type { ScheduledTask as CronTask } from 'node-cron';
import cron from 'node-cron';
import type {
  SchedulerConfig,
  TaskStatus,
  ScheduledTaskConfig,
  TaskExecutionResult,
  SchedulerStats,
  ScheduledTask as ScheduledTaskInterface
} from './types';
import { LoggerFactory } from '@hookah-db/utils';
import type { DataService } from '@hookah-db/services';
import type { SQLiteDatabase } from '@hookah-db/database';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scheduler');

/**
 * Internal task wrapper that includes cron task instance and running status
 */
interface InternalScheduledTask {
  /** Unique task identifier */
  taskId: string;
  /** Task name */
  name: string;
  /** Cron expression for scheduling */
  cronExpression: string;
  /** Task function to execute */
  task: () => Promise<void>;
  /** Whether task is enabled */
  enabled: boolean;
  /** Total number of successful runs */
  runCount: number;
  /** Total number of errors */
  errorCount: number;
  /** Execution history */
  executionHistory: TaskExecutionResult[];
  /** Last run timestamp */
  lastRun?: Date;
  /** Cron task instance from node-cron */
  cronTask: CronTask;
  /** Whether task is currently running (scheduled) */
  isRunning: boolean;
}

/**
 * Scheduler class for managing scheduled tasks
 *
 * This class provides a centralized way to schedule and manage
 * periodic data refresh operations, ensuring that SQLite database
 * stays up-to-date with minimal manual intervention.
 */
export class Scheduler {
  private tasks: Map<string, InternalScheduledTask>;
  private config: SchedulerConfig;
  private isRunning: boolean;
  private startTime: Date;
  private taskIdCounter: number;

  /**
   * Create a new Scheduler instance
   *
   * @param dataService DataService for data operations
   * @param _db SQLiteDatabase for persistent storage (stored for future use)
   * @param config Scheduler configuration
   */
  constructor(
    private dataService: DataService,
    private _db: SQLiteDatabase, // Stored for future use, available via getDatabase()
    config: SchedulerConfig
  ) {
    this.tasks = new Map();
    this.config = {
      enabled: config.enabled ?? true,
      brandsSchedule: config.brandsSchedule ?? '0 2 * * *',
      flavorsSchedule: config.flavorsSchedule ?? '0 3 * * *',
      allDataSchedule: config.allDataSchedule ?? '0 4 * * *',
      timezone: config.timezone ?? 'UTC',
      maxExecutionHistory: config.maxExecutionHistory ?? 100
    };
    this.isRunning = false;
    this.startTime = new Date();
    this.taskIdCounter = 0;
  }

  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================

  /**
   * Start scheduler and begin executing scheduled tasks
   *
   * Initializes all configured cron tasks and starts their execution.
   * Only starts if scheduler is enabled in configuration.
   *
   * @throws Error if scheduler is already running
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scheduler is already running');
    }

    if (!this.config.enabled) {
      logger.info('Scheduler is disabled in configuration' as any);
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();

    logger.info('Starting scheduler', { timezone: this.config.timezone } as any);

    // Start all enabled tasks
    let startedCount = 0;
    this.tasks.forEach((task) => {
      if (task.enabled) {
        task.cronTask.start();
        task.isRunning = true;
        startedCount++;
        logger.info('Task started', { 
          taskName: task.name, 
          taskId: task.taskId 
        } as any);
      }
    });

    logger.info('Started tasks', { count: startedCount } as any);
  }

  /**
   * Stop scheduler and cancel all scheduled tasks
   *
   * Gracefully stops all cron tasks and clears task registry.
   * This should be called during application shutdown.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.info('Scheduler is not running' as any);
      return;
    }

    logger.info('Stopping scheduler' as any);

    // Stop all tasks
    let stoppedCount = 0;
    this.tasks.forEach((task) => {
      if (task.isRunning) {
        task.cronTask.stop();
        task.isRunning = false;
        stoppedCount++;
        logger.info('Task stopped', { 
          taskName: task.name, 
          taskId: task.taskId 
        } as any);
      }
    });

    this.isRunning = false;
    logger.info('Stopped tasks', { count: stoppedCount } as any);
    logger.info('Scheduler stopped successfully' as any);
  }

  // ==========================================================================
  // Task Management
  // ==========================================================================

  /**
   * Schedule a new task
   *
   * @param config Task configuration
   * @returns Task ID
   * @throws Error if task name already exists or cron expression is invalid
   */
  scheduleJob(config: ScheduledTaskConfig): string {
    const taskId = this.generateTaskId();

    // Check for duplicate task name
    for (const task of this.tasks.values()) {
      if (task.name === config.name) {
        throw new Error(`Task with name '${config.name}' already exists (ID: ${task.taskId})`);
      }
    }

    // Validate cron expression
    if (!cron.validate(config.cronExpression)) {
      throw new Error(`Invalid cron expression: ${config.cronExpression}`);
    }

    const enabled = config.enabled ?? true;

    // Create cron task wrapper
    const cronTask = cron.schedule(
      config.cronExpression,
      () => this.executeTask(taskId, config.name, config.task),
      {
        scheduled: false,
        timezone: this.config.timezone
      }
    );

    const task: InternalScheduledTask = {
      taskId,
      name: config.name,
      cronExpression: config.cronExpression,
      task: config.task,
      enabled,
      runCount: 0,
      errorCount: 0,
      executionHistory: [],
      cronTask,
      isRunning: false
    };

    this.tasks.set(taskId, task);

    // Start task if enabled and scheduler is running
    if (enabled && this.isRunning) {
      cronTask.start();
      task.isRunning = true;
    }

    logger.info('Task scheduled', { 
      taskName: config.name, 
      taskId, 
      cronExpression: config.cronExpression 
    } as any);

    return taskId;
  }

  /**
   * Unschedule and remove a task
   *
   * @param taskId Task ID to remove
   * @returns true if task was found and removed, false otherwise
   */
  unscheduleJob(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.info('Task not found', { taskId } as any);
      return false;
    }

    // Stop cron task
    if (task.isRunning) {
      task.cronTask.stop();
    }

    this.tasks.delete(taskId);
    logger.info('Task unscheduled', { 
      taskName: task.name, 
      taskId 
    } as any);
    return true;
  }

  /**
   * Enable a scheduled task
   *
   * @param taskId Task ID to enable
   * @returns true if task was enabled, false if not found
   */
  enableJob(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.info('Task not found', { taskId } as any);
      return false;
    }

    if (!task.enabled) {
      task.enabled = true;

      // Start cron task if scheduler is running
      if (this.isRunning && !task.isRunning) {
        task.cronTask.start();
        task.isRunning = true;
      }

      logger.info('Task enabled', { 
        taskName: task.name, 
        taskId 
      } as any);
    }

    return true;
  }

  /**
   * Disable a scheduled task
   *
   * @param taskId Task ID to disable
   * @returns true if task was disabled, false if not found
   */
  disableJob(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.info('Task not found', { taskId } as any);
      return false;
    }

    if (task.enabled) {
      task.enabled = false;

      // Stop cron task if it's running
      if (task.isRunning) {
        task.cronTask.stop();
        task.isRunning = false;
      }

      logger.info('Task disabled', { 
        taskName: task.name, 
        taskId 
      } as any);
    }

    return true;
  }

  // ==========================================================================
  // DataService Integration Methods
  // ==========================================================================

  /**
   * Schedule brands data refresh task
   *
   * Creates a scheduled task to refresh brand data using configured
   * brandsSchedule cron expression. Uses dataService.refreshBrands()
   * to update data in SQLite database.
   *
   * @returns Task ID
   */
  scheduleBrandsRefresh(): string {
    const refreshTask = async () => {
      logger.info('Starting scheduled brands refresh');
      try {
        const result = await this.dataService.refreshBrands();
        if (result.success) {
          logger.info('Scheduled brands refresh completed successfully', {
            brandsCount: result.brandsCount
          } as any);
        } else {
          logger.error('Scheduled brands refresh failed', {
            error: result.error
          } as any);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during scheduled brands refresh', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        } as any);
        throw error;
      }
    };

    return this.scheduleJob({
      name: 'brands-refresh',
      cronExpression: this.config.brandsSchedule ?? '0 2 * * *',
      task: refreshTask,
      enabled: true
    });
  }

  /**
   * Schedule flavors data refresh task
   *
   * Creates a scheduled task to refresh flavor data using configured
   * flavorsSchedule cron expression. Uses dataService.refreshFlavors()
   * to update data in SQLite database.
   *
   * @returns Task ID
   */
  scheduleFlavorsRefresh(): string {
    const refreshTask = async () => {
      logger.info('Starting scheduled flavors refresh');
      try {
        const result = await this.dataService.refreshFlavors();
        if (result.success) {
          logger.info('Scheduled flavors refresh completed successfully', {
            flavorsCount: result.flavorsCount
          } as any);
        } else {
          logger.error('Scheduled flavors refresh failed', {
            error: result.error
          } as any);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during scheduled flavors refresh', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        } as any);
        throw error;
      }
    };

    return this.scheduleJob({
      name: 'flavors-refresh',
      cronExpression: this.config.flavorsSchedule ?? '0 3 * * *',
      task: refreshTask,
      enabled: true
    });
  }

  /**
   * Schedule all data refresh task
   *
   * Creates a scheduled task to refresh all data using configured
   * allDataSchedule cron expression. Uses dataService.refreshAllData()
   * to update data in SQLite database.
   *
   * @returns Task ID
   */
  scheduleAllDataRefresh(): string {
    const refreshTask = async () => {
      logger.info('Starting scheduled all data refresh');
      try {
        const result = await this.dataService.refreshAllData();
        if (result.success) {
          logger.info('Scheduled all data refresh completed successfully', {
            brandsCount: result.brandsCount,
            flavorsCount: result.flavorsCount
          } as any);
        } else {
          logger.error('Scheduled all data refresh failed', {
            error: result.error
          } as any);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during scheduled all data refresh', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        } as any);
        throw error;
      }
    };

    return this.scheduleJob({
      name: 'all-data-refresh',
      cronExpression: this.config.allDataSchedule ?? '0 4 * * *',
      task: refreshTask,
      enabled: true
    });
  }

  /**
   * Schedule all default data refresh tasks
   *
   * Convenience method to schedule all three default refresh tasks
   * (brands, flavors, and all data) in one call.
   *
   * @returns Object containing task IDs for all scheduled tasks
   */
  scheduleDefaultRefreshTasks(): {
    brandsTaskId: string;
    flavorsTaskId: string;
    allDataTaskId: string;
  } {
    const brandsTaskId = this.scheduleBrandsRefresh();
    const flavorsTaskId = this.scheduleFlavorsRefresh();
    const allDataTaskId = this.scheduleAllDataRefresh();

    logger.info('All default refresh tasks scheduled' as any);

    return {
      brandsTaskId,
      flavorsTaskId,
      allDataTaskId
    };
  }

  // ==========================================================================
  // Task Execution
  // ==========================================================================

  /**
   * Execute a scheduled task with error handling and logging
   *
   * @param taskId Task ID
   * @param taskName Task name
   * @param task Task function to execute
   */
  private async executeTask(
    taskId: string,
    taskName: string,
    task: () => Promise<void>
  ): Promise<void> {
    const scheduledTask = this.tasks.get(taskId);
    if (!scheduledTask || !scheduledTask.enabled) {
      return;
    }

    const startTime = new Date();
    logger.info('Starting task', { 
      taskName, 
      taskId, 
      startTime: startTime.toISOString() 
    } as any);

    try {
      await task();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update task statistics
      scheduledTask.lastRun = startTime;
      scheduledTask.runCount++;

      // Record execution result
      const result: TaskExecutionResult = {
        taskId,
        taskName,
        success: true,
        startTime,
        endTime,
        duration
      };

      scheduledTask.executionHistory.push(result);
      this.trimExecutionHistory(scheduledTask);

      logger.info('Task completed successfully', { 
        taskName, 
        taskId, 
        duration 
      } as any);
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update task statistics
      scheduledTask.lastRun = startTime;
      scheduledTask.errorCount++;

      // Record execution result
      const result: TaskExecutionResult = {
        taskId,
        taskName,
        success: false,
        startTime,
        endTime,
        duration,
        error: error instanceof Error ? error : new Error(String(error))
      };

      scheduledTask.executionHistory.push(result);
      this.trimExecutionHistory(scheduledTask);

      logger.error('Task failed', { 
        taskName, 
        taskId, 
        duration, 
        error 
      } as any);
    }
  }

  /**
   * Trim execution history to prevent memory leaks
   *
   * @param task Task to trim history for
   */
  private trimExecutionHistory(task: InternalScheduledTask): void {
    const maxHistory = this.config.maxExecutionHistory ?? 100;
    if (task.executionHistory.length > maxHistory) {
      task.executionHistory = task.executionHistory.slice(-maxHistory);
    }
  }

  // ==========================================================================
  // Statistics and Monitoring
  // ==========================================================================

  /**
   * Get scheduler statistics
   *
   * @returns Current scheduler statistics
   */
  getStats(): SchedulerStats {
    const tasksArray = Array.from(this.tasks.values());

    const totalRuns = tasksArray.reduce((sum, task) => sum + task.runCount, 0);
    const totalErrors = tasksArray.reduce((sum, task) => sum + task.errorCount, 0);

    const activeTasksCount = tasksArray.filter(task => task.enabled).length;

    const allExecutionResults = tasksArray.flatMap(task => task.executionHistory);
    const successfulExecutions = allExecutionResults.filter(result => result.success);

    const averageExecutionTime = successfulExecutions.length > 0
      ? successfulExecutions.reduce((sum, result) => sum + result.duration, 0) /
        successfulExecutions.length
      : 0;

    return {
      isRunning: this.isRunning,
      tasksCount: this.tasks.size,
      activeTasksCount,
      totalRuns,
      totalErrors,
      averageExecutionTime,
      uptime: this.isRunning ? Date.now() - this.startTime.getTime() : 0
    };
  }

  /**
   * Get task status
   *
   * @param taskId Task ID
   * @returns Task status or null if not found
   */
  getJobStatus(taskId: string): TaskStatus | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      taskId: task.taskId,
      name: task.name,
      running: task.isRunning,
      enabled: task.enabled,
      lastRun: task.lastRun,
      nextRun: undefined, // node-cron doesn't provide next run time
      runCount: task.runCount,
      errorCount: task.errorCount
    };
  }

  /**
   * Get execution history for a specific task
   *
   * @param taskId Task ID
   * @param limit Maximum number of entries to return (default: all)
   * @returns Array of execution results
   */
  getExecutionHistory(taskId: string, limit?: number): TaskExecutionResult[] {
    const task = this.tasks.get(taskId);
    if (!task) {
      return [];
    }

    const history = [...task.executionHistory];

    if (limit !== undefined && limit > 0) {
      return history.slice(-limit);
    }

    return history;
  }

  /**
   * Clear execution history for a specific task
   *
   * @param taskId Task ID
   */
  clearExecutionHistory(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.info('Task not found', { taskId } as any);
      return;
    }

    const clearedCount = task.executionHistory.length;
    task.executionHistory = [];
    logger.info('Cleared execution history', { 
      taskName: task.name, 
      taskId, 
      count: clearedCount 
    } as any);
  }

  /**
   * Get all scheduled tasks
   *
   * @returns Array of all scheduled tasks
   */
  getAllTasks(): ScheduledTaskInterface[] {
    return Array.from(this.tasks.values()).map(task => ({
      taskId: task.taskId,
      name: task.name,
      cronExpression: task.cronExpression,
      task: task.task,
      enabled: task.enabled,
      lastRun: task.lastRun,
      nextRun: undefined,
      runCount: task.runCount,
      errorCount: task.errorCount,
      executionHistory: [...task.executionHistory]
    }));
  }

  /**
   * Get a specific task by ID
   *
   * @param taskId Task ID
   * @returns Task object or undefined if not found
   */
  getTask(taskId: string): ScheduledTaskInterface | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    return {
      taskId: task.taskId,
      name: task.name,
      cronExpression: task.cronExpression,
      task: task.task,
      enabled: task.enabled,
      lastRun: task.lastRun,
      nextRun: undefined,
      runCount: task.runCount,
      errorCount: task.errorCount,
      executionHistory: [...task.executionHistory]
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get database instance (for future use)
   *
   * @returns SQLiteDatabase instance
   */
  getDatabase(): SQLiteDatabase {
    return this._db;
  }

  /**
   * Generate a unique task ID
   *
   * @returns Unique task ID
   */
  private generateTaskId(): string {
    return `task-${++this.taskIdCounter}-${Date.now()}`;
  }

  /**
   * Get configuration
   *
   * @returns Current scheduler configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }
}
