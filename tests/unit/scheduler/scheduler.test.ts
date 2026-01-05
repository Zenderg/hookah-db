/**
 * Unit tests for Scheduler
 *
 * Tests Scheduler functionality including:
 * - Constructor and initialization
 * - Lifecycle methods (start, stop)
 * - Task management (schedule, unschedule, enable, disable)
 * - Task execution and error handling
 * - Statistics and monitoring
 * - Execution history management
 * - Default task scheduling
 * - Edge cases and error scenarios
 */

import { Scheduler } from '@hookah-db/scheduler';

// ============================================================================
// Test Suite
// ============================================================================

describe('Scheduler', () => {
  let scheduler: Scheduler;
  let mockTask: () => Promise<void>;

  beforeEach(() => {
    // Clear all mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Create mock task
    mockTask = jest.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;

    // Create scheduler with default config
    scheduler = new Scheduler({
      enabled: true,
      brandsSchedule: '0 2 * * *',
      flavorsSchedule: '0 3 * * *',
      allDataSchedule: '0 4 * * *',
      timezone: 'UTC',
      maxExecutionHistory: 100
    });
  });

  afterEach(() => {
    // Stop scheduler and clear all timers
    scheduler.stop();
    jest.clearAllTimers();
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should create scheduler with default config', () => {
      const defaultScheduler = new Scheduler({ enabled: true });

      const config = defaultScheduler.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.brandsSchedule).toBe('0 2 * * *');
      expect(config.flavorsSchedule).toBe('0 3 * * *');
      expect(config.allDataSchedule).toBe('0 4 * * *');
      expect(config.timezone).toBe('UTC');
      expect(config.maxExecutionHistory).toBe(100);
    });

    it('should create scheduler with custom config', () => {
      const customScheduler = new Scheduler({
        enabled: false,
        brandsSchedule: '0 1 * * *',
        flavorsSchedule: '0 2 * * *',
        allDataSchedule: '0 3 * * *',
        timezone: 'Europe/Moscow',
        maxExecutionHistory: 50
      });

      const config = customScheduler.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.brandsSchedule).toBe('0 1 * * *');
      expect(config.flavorsSchedule).toBe('0 2 * * *');
      expect(config.allDataSchedule).toBe('0 3 * * *');
      expect(config.timezone).toBe('Europe/Moscow');
      expect(config.maxExecutionHistory).toBe(50);
    });

    it('should use default values for undefined config properties', () => {
      const partialConfigScheduler = new Scheduler({
        enabled: true,
        timezone: 'America/New_York'
      });

      const config = partialConfigScheduler.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.brandsSchedule).toBe('0 2 * * *');
      expect(config.flavorsSchedule).toBe('0 3 * * *');
      expect(config.allDataSchedule).toBe('0 4 * * *');
      expect(config.timezone).toBe('America/New_York');
      expect(config.maxExecutionHistory).toBe(100);
    });

    it('should initialize with empty tasks map', () => {
      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(0);
    });

    it('should initialize with isRunning false', () => {
      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(false);
    });

    it('should initialize with zero task ID counter', () => {
      // Schedule a task and check ID format
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      expect(taskId).toMatch(/^task-1-\d+$/);
    });
  });

  // ============================================================================
  // Lifecycle Methods Tests
  // ============================================================================

  describe('start()', () => {
    it('should start scheduler successfully', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();

      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(true);
    });

    it('should throw error when already started', async () => {
      await scheduler.start();

      await expect(scheduler.start()).rejects.toThrow('Scheduler is already running');
    });

    it('should not start when disabled in config', async () => {
      const disabledScheduler = new Scheduler({ enabled: false });
      const taskId = disabledScheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await disabledScheduler.start();

      const stats = disabledScheduler.getStats();
      expect(stats.isRunning).toBe(false);

      const taskStatus = disabledScheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(false);
    });

    it('should start all enabled tasks', async () => {
      const task1Id = scheduler.scheduleJob({
        name: 'task-1',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      const task2Id = scheduler.scheduleJob({
        name: 'task-2',
        cronExpression: '0 1 * * *',
        task: mockTask,
        enabled: true
      });

      const task3Id = scheduler.scheduleJob({
        name: 'task-3',
        cronExpression: '0 2 * * *',
        task: mockTask,
        enabled: false
      });

      await scheduler.start();

      const task1Status = scheduler.getJobStatus(task1Id);
      const task2Status = scheduler.getJobStatus(task2Id);
      const task3Status = scheduler.getJobStatus(task3Id);

      expect(task1Status?.running).toBe(true);
      expect(task2Status?.running).toBe(true);
      expect(task3Status?.running).toBe(false);
    });

    it('should log start messages', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await scheduler.start();

      expect(consoleLogSpy).toHaveBeenCalledWith('[Scheduler] Starting scheduler...');
      expect(consoleLogSpy).toHaveBeenCalledWith('[Scheduler] Timezone: UTC');

      consoleLogSpy.mockRestore();
    });
  });

  describe('stop()', () => {
    it('should stop scheduler gracefully', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();
      await scheduler.stop();

      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(false);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(false);
    });

    it('should stop all running tasks', async () => {
      const task1Id = scheduler.scheduleJob({
        name: 'task-1',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task2Id = scheduler.scheduleJob({
        name: 'task-2',
        cronExpression: '0 1 * * *',
        task: mockTask
      });

      await scheduler.start();
      await scheduler.stop();

      const task1Status = scheduler.getJobStatus(task1Id);
      const task2Status = scheduler.getJobStatus(task2Id);

      expect(task1Status?.running).toBe(false);
      expect(task2Status?.running).toBe(false);
    });

    it('should not throw error when already stopped', async () => {
      await expect(scheduler.stop()).resolves.not.toThrow();
    });

    it('should log stop messages', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();
      await scheduler.stop();

      expect(consoleLogSpy).toHaveBeenCalledWith('[Scheduler] Stopping scheduler...');
      expect(consoleLogSpy).toHaveBeenCalledWith('[Scheduler] Scheduler stopped successfully');

      consoleLogSpy.mockRestore();
    });
  });

  describe('restart', () => {
    it('should restart scheduler successfully', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();
      await scheduler.stop();
      await scheduler.start();

      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(true);
    });
  });

  // ============================================================================
  // Task Management Tests
  // ============================================================================

  describe('scheduleJob()', () => {
    it('should schedule a new job', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      expect(taskId).toMatch(/^task-\d+-\d+$/);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].name).toBe('test-task');
      expect(allTasks[0].cronExpression).toBe('0 0 * * *');
      expect(allTasks[0].enabled).toBe(true);
    });

    it('should schedule multiple jobs', () => {
      const task1Id = scheduler.scheduleJob({
        name: 'task-1',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task2Id = scheduler.scheduleJob({
        name: 'task-2',
        cronExpression: '0 1 * * *',
        task: mockTask
      });

      const task3Id = scheduler.scheduleJob({
        name: 'task-3',
        cronExpression: '0 2 * * *',
        task: mockTask
      });

      expect(task1Id).not.toBe(task2Id);
      expect(task2Id).not.toBe(task3Id);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(3);
    });

    it('should throw error for duplicate task name', () => {
      scheduler.scheduleJob({
        name: 'duplicate-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      expect(() => {
        scheduler.scheduleJob({
          name: 'duplicate-task',
          cronExpression: '0 1 * * *',
          task: mockTask
        });
      }).toThrow('Task with name \'duplicate-task\' already exists');
    });

    it('should throw error for invalid cron expression', () => {
      expect(() => {
        scheduler.scheduleJob({
          name: 'invalid-task',
          cronExpression: 'invalid-cron',
          task: mockTask
        });
      }).toThrow('Invalid cron expression: invalid-cron');
    });

    it('should accept valid cron expressions', () => {
      const validExpressions = [
        '0 0 * * *',      // Daily at midnight
        '*/5 * * * *',    // Every 5 minutes
        '0 9-17 * * 1-5', // Every hour from 9am to 5pm on weekdays
        '0 0 1 * *',      // First day of every month
        '0 0 * * 0',      // Every Sunday
      ];

      validExpressions.forEach(expression => {
        expect(() => {
          scheduler.scheduleJob({
            name: `task-${expression}`,
            cronExpression: expression,
            task: mockTask
          });
        }).not.toThrow();
      });
    });

    it('should schedule job with enabled false', () => {
      const taskId = scheduler.scheduleJob({
        name: 'disabled-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: false
      });

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);
      expect(taskStatus?.running).toBe(false);
    });

    it('should start job if scheduler is running', async () => {
      await scheduler.start();

      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(true);
    });

    it('should not start job if scheduler is running but task is disabled', async () => {
      await scheduler.start();

      const taskId = scheduler.scheduleJob({
        name: 'disabled-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: false
      });

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(false);
    });

    it('should log schedule message', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Task \'test-task\'')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('scheduled with expression: 0 0 * * *')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('unscheduleJob()', () => {
    it('should unschedule a job', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const result = scheduler.unscheduleJob(taskId);

      expect(result).toBe(true);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(0);
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.unscheduleJob('non-existent-task-id');

      expect(result).toBe(false);
    });

    it('should stop running job before removing', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();

      const result = scheduler.unscheduleJob(taskId);

      expect(result).toBe(true);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(0);
    });

    it('should log unschedule message', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      scheduler.unscheduleJob(taskId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Scheduler] Task \'test-task\' unscheduled'
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('enableJob()', () => {
    it('should enable a disabled job', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: false
      });

      const result = scheduler.enableJob(taskId);

      expect(result).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(true);
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.enableJob('non-existent-task-id');

      expect(result).toBe(false);
    });

    it('should start job if scheduler is running', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: false
      });

      await scheduler.start();

      const result = scheduler.enableJob(taskId);

      expect(result).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(true);
    });

    it('should not change job if already enabled', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      const result = scheduler.enableJob(taskId);

      expect(result).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(true);
    });

    it('should log enable message', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: false
      });

      scheduler.enableJob(taskId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Scheduler] Task \'test-task\' enabled'
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('disableJob()', () => {
    it('should disable an enabled job', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      const result = scheduler.disableJob(taskId);

      expect(result).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.disableJob('non-existent-task-id');

      expect(result).toBe(false);
    });

    it('should stop job if running', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      await scheduler.start();

      const result = scheduler.disableJob(taskId);

      expect(result).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);
      expect(taskStatus?.running).toBe(false);
    });

    it('should not change job if already disabled', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: false
      });

      const result = scheduler.disableJob(taskId);

      expect(result).toBe(true);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);
    });

    it('should log disable message', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      scheduler.disableJob(taskId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Scheduler] Task \'test-task\' disabled'
      );

      consoleLogSpy.mockRestore();
    });
  });

  // ============================================================================
  // Task Execution Tests
  // ============================================================================

  describe('Task Execution', () => {
    it('should execute task successfully', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      // Manually trigger task execution
      const task = scheduler.getTask(taskId);
      if (task) {
        await task.task();
      }

      expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('should handle task execution errors', async () => {
      const errorTask = jest.fn().mockRejectedValue(new Error('Task failed')) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'error-task',
        cronExpression: '0 0 * * *',
        task: errorTask
      });

      // Manually trigger task execution
      const task = scheduler.getTask(taskId);
      if (task) {
        try {
          await task.task();
        } catch (error) {
          // Expected to throw
        }
      }

      expect(errorTask).toHaveBeenCalledTimes(1);
    });

    it('should track execution history', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      // Execute task multiple times
      const task = scheduler.getTask(taskId);
      if (task) {
        await task.task();
        await task.task();
        await task.task();
      }

      const history = scheduler.getExecutionHistory(taskId);
      expect(history).toHaveLength(3);
    });

    it('should limit execution history', () => {
      const limitedScheduler = new Scheduler({
        enabled: true,
        maxExecutionHistory: 5
      });

      const taskId = limitedScheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      // Add more history entries than limit
      const task = limitedScheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 10; i++) {
          task.executionHistory.push({
            taskId,
            taskName: 'test-task',
            success: true,
            startTime: new Date(),
            endTime: new Date(),
            duration: 100
          });
        }
      }

      const history = limitedScheduler.getExecutionHistory(taskId);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should calculate average execution time', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      // Execute tasks with different durations
      const task = scheduler.getTask(taskId);
      if (task) {
        task.executionHistory.push(
          { taskId, taskName: 'test-task', success: true, startTime: new Date(), endTime: new Date(), duration: 100 },
          { taskId, taskName: 'test-task', success: true, startTime: new Date(), endTime: new Date(), duration: 200 },
          { taskId, taskName: 'test-task', success: true, startTime: new Date(), endTime: new Date(), duration: 300 }
        );
      }

      const stats = scheduler.getStats();
      expect(stats.averageExecutionTime).toBe(200);
    });

    it('should track error count', async () => {
      const errorTask = jest.fn().mockRejectedValue(new Error('Task failed')) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'error-task',
        cronExpression: '0 0 * * *',
        task: errorTask
      });

      // Execute task multiple times
      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 3; i++) {
          try {
            await task.task();
          } catch (error) {
            // Expected to throw
          }
        }
      }

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.errorCount).toBe(3);
    });

    it('should handle task that throws error', async () => {
      const throwingTask = jest.fn().mockImplementation(() => {
        throw new Error('Task threw error');
      }) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'throwing-task',
        cronExpression: '0 0 * * *',
        task: throwingTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        try {
          await task.task();
        } catch (error) {
          // Expected to throw
        }
      }

      expect(throwingTask).toHaveBeenCalledTimes(1);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.errorCount).toBe(1);
    });

    it('should handle task that rejects promise', async () => {
      const rejectingTask = jest.fn().mockRejectedValue(new Error('Task rejected')) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'rejecting-task',
        cronExpression: '0 0 * * *',
        task: rejectingTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        try {
          await task.task();
        } catch (error) {
          // Expected to throw
        }
      }

      expect(rejectingTask).toHaveBeenCalledTimes(1);

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.errorCount).toBe(1);
    });
  });

  // ============================================================================
  // Statistics and Monitoring Tests
  // ============================================================================

  describe('getStats()', () => {
    it('should return correct stats for new scheduler', () => {
      const stats = scheduler.getStats();

      expect(stats.isRunning).toBe(false);
      expect(stats.tasksCount).toBe(0);
      expect(stats.activeTasksCount).toBe(0);
      expect(stats.totalRuns).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.uptime).toBe(0);
    });

    it('should track total executions', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 5; i++) {
          await task.task();
        }
      }

      const stats = scheduler.getStats();
      expect(stats.totalRuns).toBe(5);
    });

    it('should track total errors', async () => {
      const errorTask = jest.fn().mockRejectedValue(new Error('Task failed')) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'error-task',
        cronExpression: '0 0 * * *',
        task: errorTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 3; i++) {
          try {
            await task.task();
          } catch (error) {
            // Expected to throw
          }
        }
      }

      const stats = scheduler.getStats();
      expect(stats.totalErrors).toBe(3);
    });

    it('should calculate uptime', async () => {
      await scheduler.start();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = scheduler.getStats();
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should return zero uptime when not running', () => {
      const stats = scheduler.getStats();
      expect(stats.uptime).toBe(0);
    });

    it('should count active tasks', () => {
      scheduler.scheduleJob({
        name: 'enabled-task-1',
        cronExpression: '0 0 * * *',
        task: mockTask,
        enabled: true
      });

      scheduler.scheduleJob({
        name: 'enabled-task-2',
        cronExpression: '0 1 * * *',
        task: mockTask,
        enabled: true
      });

      scheduler.scheduleJob({
        name: 'disabled-task',
        cronExpression: '0 2 * * *',
        task: mockTask,
        enabled: false
      });

      const stats = scheduler.getStats();
      expect(stats.tasksCount).toBe(3);
      expect(stats.activeTasksCount).toBe(2);
    });
  });

  describe('getJobStatus()', () => {
    it('should return job status for existing task', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const status = scheduler.getJobStatus(taskId);

      expect(status).not.toBeNull();
      expect(status?.taskId).toBe(taskId);
      expect(status?.name).toBe('test-task');
      expect(status?.running).toBe(false);
      expect(status?.enabled).toBe(true);
      expect(status?.runCount).toBe(0);
      expect(status?.errorCount).toBe(0);
    });

    it('should return null for non-existent task', () => {
      const status = scheduler.getJobStatus('non-existent-task-id');

      expect(status).toBeNull();
    });

    it('should return last run timestamp', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        await task.task();
      }

      const status = scheduler.getJobStatus(taskId);
      expect(status?.lastRun).toBeInstanceOf(Date);
    });

    it('should return correct running status after start', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();

      const status = scheduler.getJobStatus(taskId);
      expect(status?.running).toBe(true);
    });

    it('should return correct running status after stop', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      await scheduler.start();
      await scheduler.stop();

      const status = scheduler.getJobStatus(taskId);
      expect(status?.running).toBe(false);
    });
  });

  // ============================================================================
  // Execution History Tests
  // ============================================================================

  describe('getExecutionHistory()', () => {
    it('should return execution history for task', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        await task.task();
        await task.task();
        await task.task();
      }

      const history = scheduler.getExecutionHistory(taskId);
      expect(history).toHaveLength(3);
    });

    it('should return empty array for non-existent task', () => {
      const history = scheduler.getExecutionHistory('non-existent-task-id');

      expect(history).toEqual([]);
    });

    it('should limit execution history with limit parameter', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 10; i++) {
          await task.task();
        }
      }

      const history = scheduler.getExecutionHistory(taskId, 5);
      expect(history).toHaveLength(5);
    });

    it('should return all history when limit is not specified', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 5; i++) {
          await task.task();
        }
      }

      const history = scheduler.getExecutionHistory(taskId);
      expect(history).toHaveLength(5);
    });

    it('should return most recent entries when limited', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 10; i++) {
          await task.task();
        }
      }

      const history = scheduler.getExecutionHistory(taskId, 3);
      expect(history).toHaveLength(3);

      // Check that we got last 3 entries
      const allHistory = scheduler.getExecutionHistory(taskId);
      expect(history[0]).toEqual(allHistory[7]);
      expect(history[1]).toEqual(allHistory[8]);
      expect(history[2]).toEqual(allHistory[9]);
    });
  });

  describe('clearExecutionHistory()', () => {
    it('should clear execution history for task', async () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        for (let i = 0; i < 5; i++) {
          await task.task();
        }
      }

      scheduler.clearExecutionHistory(taskId);

      const history = scheduler.getExecutionHistory(taskId);
      expect(history).toHaveLength(0);
    });

    it('should not throw for non-existent task', () => {
      expect(() => {
        scheduler.clearExecutionHistory('non-existent-task-id');
      }).not.toThrow();
    });

    it('should log clear message', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        task.executionHistory.push({
          taskId,
          taskName: 'test-task',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
          duration: 100
        });
      }

      scheduler.clearExecutionHistory(taskId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Cleared')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('execution history entries')
      );

      consoleLogSpy.mockRestore();
    });
  });

  // ============================================================================
  // Default Task Scheduling Tests
  // ============================================================================

  describe('scheduleBrandsRefresh()', () => {
    it('should schedule brands refresh task', () => {
      const taskId = scheduler.scheduleBrandsRefresh(mockTask);

      expect(taskId).toMatch(/^task-\d+-\d+$/);

      const task = scheduler.getTask(taskId);
      expect(task?.name).toBe('brands-refresh');
      expect(task?.cronExpression).toBe('0 2 * * *');
      expect(task?.enabled).toBe(true);
    });

    it('should use custom brands schedule from config', () => {
      const customScheduler = new Scheduler({
        enabled: true,
        brandsSchedule: '0 1 * * *'
      });

      const taskId = customScheduler.scheduleBrandsRefresh(mockTask);

      const task = customScheduler.getTask(taskId);
      expect(task?.cronExpression).toBe('0 1 * * *');
    });
  });

  describe('scheduleFlavorsRefresh()', () => {
    it('should schedule flavors refresh task', () => {
      const taskId = scheduler.scheduleFlavorsRefresh(mockTask);

      expect(taskId).toMatch(/^task-\d+-\d+$/);

      const task = scheduler.getTask(taskId);
      expect(task?.name).toBe('flavors-refresh');
      expect(task?.cronExpression).toBe('0 3 * * *');
      expect(task?.enabled).toBe(true);
    });

    it('should use custom flavors schedule from config', () => {
      const customScheduler = new Scheduler({
        enabled: true,
        flavorsSchedule: '0 2 * * *'
      });

      const taskId = customScheduler.scheduleFlavorsRefresh(mockTask);

      const task = customScheduler.getTask(taskId);
      expect(task?.cronExpression).toBe('0 2 * * *');
    });
  });

  describe('scheduleAllDataRefresh()', () => {
    it('should schedule all data refresh task', () => {
      const taskId = scheduler.scheduleAllDataRefresh(mockTask);

      expect(taskId).toMatch(/^task-\d+-\d+$/);

      const task = scheduler.getTask(taskId);
      expect(task?.name).toBe('all-data-refresh');
      expect(task?.cronExpression).toBe('0 4 * * *');
      expect(task?.enabled).toBe(true);
    });

    it('should use custom all data schedule from config', () => {
      const customScheduler = new Scheduler({
        enabled: true,
        allDataSchedule: '0 3 * * *'
      });

      const taskId = customScheduler.scheduleAllDataRefresh(mockTask);

      const task = customScheduler.getTask(taskId);
      expect(task?.cronExpression).toBe('0 3 * * *');
    });
  });

  describe('scheduleDefaultRefreshTasks()', () => {
    it('should schedule all default refresh tasks', () => {
      const result = scheduler.scheduleDefaultRefreshTasks(mockTask);

      expect(result).toHaveProperty('brandsTaskId');
      expect(result).toHaveProperty('flavorsTaskId');
      expect(result).toHaveProperty('allDataTaskId');

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(3);

      const taskNames = allTasks.map(t => t.name);
      expect(taskNames).toContain('brands-refresh');
      expect(taskNames).toContain('flavors-refresh');
      expect(taskNames).toContain('all-data-refresh');
    });

    it('should log schedule message', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      scheduler.scheduleDefaultRefreshTasks(mockTask);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Scheduler] All default refresh tasks scheduled'
      );

      consoleLogSpy.mockRestore();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle concurrent job scheduling', () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(
            scheduler.scheduleJob({
              name: `concurrent-task-${i}`,
              cronExpression: '0 0 * * *',
              task: mockTask
            })
          )
        );
      }

      const taskIds = Promise.all(promises);

      expect(taskIds).resolves.toHaveLength(10);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(10);
    });

    it('should handle rapid start/stop', async () => {
      await scheduler.start();
      await scheduler.stop();
      await scheduler.start();
      await scheduler.stop();
      await scheduler.start();

      const stats = scheduler.getStats();
      expect(stats.isRunning).toBe(true);
    });

    it('should handle invalid task ID in getJobStatus', () => {
      const status = scheduler.getJobStatus('');
      expect(status).toBeNull();
    });

    it('should handle invalid task ID in getExecutionHistory', () => {
      const history = scheduler.getExecutionHistory('');
      expect(history).toEqual([]);
    });

    it('should handle invalid task ID in clearExecutionHistory', () => {
      expect(() => {
        scheduler.clearExecutionHistory('');
      }).not.toThrow();
    });

    it('should handle invalid task ID in unscheduleJob', () => {
      const result = scheduler.unscheduleJob('');
      expect(result).toBe(false);
    });

    it('should handle invalid task ID in enableJob', () => {
      const result = scheduler.enableJob('');
      expect(result).toBe(false);
    });

    it('should handle invalid task ID in disableJob', () => {
      const result = scheduler.disableJob('');
      expect(result).toBe(false);
    });

    it('should handle task with very long name', () => {
      const longName = 'a'.repeat(1000);

      const taskId = scheduler.scheduleJob({
        name: longName,
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      expect(task?.name).toBe(longName);
    });

    it('should handle task with special characters in name', () => {
      const specialName = 'task-with-special-chars-!@#$%^&*()';

      const taskId = scheduler.scheduleJob({
        name: specialName,
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      expect(task?.name).toBe(specialName);
    });

    it('should handle task with empty execution history', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const history = scheduler.getExecutionHistory(taskId);
      expect(history).toHaveLength(0);
    });

    it('should handle task with zero duration', async () => {
      const instantTask = jest.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'instant-task',
        cronExpression: '0 0 * * *',
        task: instantTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        await task.task();
      }

      const history = scheduler.getExecutionHistory(taskId);
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle task with very long duration', async () => {
      const slowTask = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10))
      ) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleJob({
        name: 'slow-task',
        cronExpression: '0 0 * * *',
        task: slowTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        await task.task();
      }

      const history = scheduler.getExecutionHistory(taskId);
      expect(history[0].duration).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Utility Methods Tests
  // ============================================================================

  describe('getConfig()', () => {
    it('should return copy of config', () => {
      const config = scheduler.getConfig();

      expect(config).toEqual({
        enabled: true,
        brandsSchedule: '0 2 * * *',
        flavorsSchedule: '0 3 * * *',
        allDataSchedule: '0 4 * * *',
        timezone: 'UTC',
        maxExecutionHistory: 100
      });
    });

    it('should not return reference to internal config', () => {
      const config = scheduler.getConfig();
      config.enabled = false;

      const newConfig = scheduler.getConfig();
      expect(newConfig.enabled).toBe(true);
    });
  });

  describe('getAllTasks()', () => {
    it('should return all tasks', () => {
      scheduler.scheduleJob({
        name: 'task-1',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      scheduler.scheduleJob({
        name: 'task-2',
        cronExpression: '0 1 * * *',
        task: mockTask
      });

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(2);
    });

    it('should return empty array when no tasks', () => {
      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toEqual([]);
    });

    it('should return copies of tasks', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const allTasks = scheduler.getAllTasks();
      allTasks[0].enabled = false;

      const task = scheduler.getTask(taskId);
      expect(task?.enabled).toBe(true);
    });
  });

  describe('getTask()', () => {
    it('should return task by ID', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);

      expect(task).not.toBeUndefined();
      expect(task?.taskId).toBe(taskId);
      expect(task?.name).toBe('test-task');
    });

    it('should return undefined for non-existent task', () => {
      const task = scheduler.getTask('non-existent-task-id');

      expect(task).toBeUndefined();
    });

    it('should return copy of task', () => {
      const taskId = scheduler.scheduleJob({
        name: 'test-task',
        cronExpression: '0 0 * * *',
        task: mockTask
      });

      const task = scheduler.getTask(taskId);
      if (task) {
        task.enabled = false;
      }

      const newTask = scheduler.getTask(taskId);
      expect(newTask?.enabled).toBe(true);
    });
  });
});
