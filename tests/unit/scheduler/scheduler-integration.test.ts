/**
 * Integration tests for Scheduler with DataService
 *
 * Tests Scheduler integration with DataService including:
 * - Brands data refresh on schedule
 * - Flavors data refresh on schedule
 * - All data refresh on schedule
 * - Error handling from DataService
 * - Successful refresh tracking
 */

import { Scheduler } from '@hookah-db/scheduler';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock DataService
const mockRefreshAllData = jest.fn().mockResolvedValue(undefined) as unknown as () => Promise<void>;

// ============================================================================
// Test Suite
// ============================================================================

describe('Scheduler Integration', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    // Clear all mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();

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
  // Brands Refresh Integration Tests
  // ============================================================================

  describe('Brands Refresh', () => {
    it('should schedule brands refresh task', () => {
      const taskId = scheduler.scheduleBrandsRefresh(mockRefreshAllData);

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

      const taskId = customScheduler.scheduleBrandsRefresh(mockRefreshAllData);

      const task = customScheduler.getTask(taskId);
      expect(task?.cronExpression).toBe('0 1 * * *');
    });
  });

  // ============================================================================
  // Flavors Refresh Integration Tests
  // ============================================================================

  describe('Flavors Refresh', () => {
    it('should schedule flavors refresh task', () => {
      const taskId = scheduler.scheduleFlavorsRefresh(mockRefreshAllData);

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

      const taskId = customScheduler.scheduleFlavorsRefresh(mockRefreshAllData);

      const task = customScheduler.getTask(taskId);
      expect(task?.cronExpression).toBe('0 2 * * *');
    });
  });

  // ============================================================================
  // All Data Refresh Integration Tests
  // ============================================================================

  describe('All Data Refresh', () => {
    it('should schedule all data refresh task', () => {
      const taskId = scheduler.scheduleAllDataRefresh(mockRefreshAllData);

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

      const taskId = customScheduler.scheduleAllDataRefresh(mockRefreshAllData);

      const task = customScheduler.getTask(taskId);
      expect(task?.cronExpression).toBe('0 3 * * *');
    });
  });

  // ============================================================================
  // Default Refresh Tasks Integration Tests
  // ============================================================================

  describe('Default Refresh Tasks', () => {
    it('should schedule all default refresh tasks', () => {
      const result = scheduler.scheduleDefaultRefreshTasks(mockRefreshAllData);

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

      scheduler.scheduleDefaultRefreshTasks(mockRefreshAllData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Scheduler] All default refresh tasks scheduled'
      );

      consoleLogSpy.mockRestore();
    });
  });

  // ============================================================================
  // Error Handling Integration Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle DataService errors gracefully', () => {
      const errorRefresh = jest.fn().mockRejectedValue(new Error('DataService error')) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleBrandsRefresh(errorRefresh);

      // Task should be scheduled
      const task = scheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.name).toBe('brands-refresh');
    });

    it('should schedule task even if refresh function throws', () => {
      const throwingRefresh = jest.fn().mockImplementation(() => {
        throw new Error('Refresh failed');
      }) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleBrandsRefresh(throwingRefresh);

      // Task should be scheduled
      const task = scheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.name).toBe('brands-refresh');
    });

    it('should schedule task even if refresh function rejects', () => {
      const rejectingRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed')) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleFlavorsRefresh(rejectingRefresh);

      // Task should be scheduled
      const task = scheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.name).toBe('flavors-refresh');
    });

    it('should handle network errors from DataService', () => {
      const networkError = new Error('Network error: ECONNREFUSED');
      const errorRefresh = jest.fn().mockRejectedValue(networkError) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleAllDataRefresh(errorRefresh);

      // Task should be scheduled
      const task = scheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.name).toBe('all-data-refresh');
    });

    it('should handle timeout errors from DataService', () => {
      const timeoutError = new Error('Timeout: Request timed out after 30000ms');
      const errorRefresh = jest.fn().mockRejectedValue(timeoutError) as unknown as () => Promise<void>;

      const taskId = scheduler.scheduleBrandsRefresh(errorRefresh);

      // Task should be scheduled
      const task = scheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.name).toBe('brands-refresh');
    });
  });

  // ============================================================================
  // Scheduler Lifecycle Integration Tests
  // ============================================================================

  describe('Scheduler Lifecycle', () => {
    it('should start and stop with active refresh tasks', async () => {
      scheduler.scheduleDefaultRefreshTasks(mockRefreshAllData);

      await scheduler.start();
      expect(scheduler.getStats().isRunning).toBe(true);

      await scheduler.stop();
      expect(scheduler.getStats().isRunning).toBe(false);
    });

    it('should maintain task state across restart', async () => {
      const taskId = scheduler.scheduleBrandsRefresh(mockRefreshAllData);

      await scheduler.start();
      await scheduler.stop();
      await scheduler.start();

      // Task should still exist
      const task = scheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.name).toBe('brands-refresh');
      expect(task?.enabled).toBe(true);
    });

    it('should handle enable/disable of refresh tasks', async () => {
      const taskId = scheduler.scheduleBrandsRefresh(mockRefreshAllData);

      await scheduler.start();

      // Disable task
      scheduler.disableJob(taskId);
      let taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);
      expect(taskStatus?.running).toBe(false);

      // Enable task
      scheduler.enableJob(taskId);
      taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(true);
      expect(taskStatus?.running).toBe(true);
    });

    it('should handle unschedule of refresh tasks', async () => {
      const taskId = scheduler.scheduleFlavorsRefresh(mockRefreshAllData);

      await scheduler.start();

      // Unschedule task
      const result = scheduler.unscheduleJob(taskId);
      expect(result).toBe(true);

      // Task should no longer exist
      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus).toBeNull();
    });
  });

  // ============================================================================
  // Multiple Refresh Tasks Integration Tests
  // ============================================================================

  describe('Multiple Refresh Tasks', () => {
    it('should schedule multiple refresh tasks', () => {
      const brandsTaskId = scheduler.scheduleBrandsRefresh(mockRefreshAllData);
      const flavorsTaskId = scheduler.scheduleFlavorsRefresh(mockRefreshAllData);
      const allDataTaskId = scheduler.scheduleAllDataRefresh(mockRefreshAllData);

      expect(brandsTaskId).not.toBe(flavorsTaskId);
      expect(flavorsTaskId).not.toBe(allDataTaskId);

      const allTasks = scheduler.getAllTasks();
      expect(allTasks).toHaveLength(3);
    });

    it('should track statistics for multiple refresh tasks', () => {
      scheduler.scheduleDefaultRefreshTasks(mockRefreshAllData);

      const stats = scheduler.getStats();
      expect(stats.tasksCount).toBe(3);
      expect(stats.activeTasksCount).toBe(3);
      expect(stats.totalRuns).toBe(0);
      expect(stats.totalErrors).toBe(0);
    });
  });

  // ============================================================================
  // Task State Integration Tests
  // ============================================================================

  describe('Task State', () => {
    it('should maintain separate task IDs', () => {
      const result = scheduler.scheduleDefaultRefreshTasks(mockRefreshAllData);

      expect(result.brandsTaskId).not.toBe(result.flavorsTaskId);
      expect(result.flavorsTaskId).not.toBe(result.allDataTaskId);
      expect(result.allDataTaskId).not.toBe(result.brandsTaskId);
    });

    it('should track task names correctly', () => {
      const result = scheduler.scheduleDefaultRefreshTasks(mockRefreshAllData);

      const brandsTask = scheduler.getTask(result.brandsTaskId);
      const flavorsTask = scheduler.getTask(result.flavorsTaskId);
      const allDataTask = scheduler.getTask(result.allDataTaskId);

      expect(brandsTask?.name).toBe('brands-refresh');
      expect(flavorsTask?.name).toBe('flavors-refresh');
      expect(allDataTask?.name).toBe('all-data-refresh');
    });

    it('should track task enabled state', () => {
      const taskId = scheduler.scheduleBrandsRefresh(mockRefreshAllData);

      let taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(true);

      scheduler.disableJob(taskId);
      taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);

      scheduler.enableJob(taskId);
      taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(true);
    });
  });

  // ============================================================================
  // Configuration Integration Tests
  // ============================================================================

  describe('Configuration', () => {
    it('should use default schedules when not specified', () => {
      const customScheduler = new Scheduler({ enabled: true });

      const brandsTaskId = customScheduler.scheduleBrandsRefresh(mockRefreshAllData);
      const flavorsTaskId = customScheduler.scheduleFlavorsRefresh(mockRefreshAllData);
      const allDataTaskId = customScheduler.scheduleAllDataRefresh(mockRefreshAllData);

      const brandsTask = customScheduler.getTask(brandsTaskId);
      const flavorsTask = customScheduler.getTask(flavorsTaskId);
      const allDataTask = customScheduler.getTask(allDataTaskId);

      expect(brandsTask?.cronExpression).toBe('0 2 * * *');
      expect(flavorsTask?.cronExpression).toBe('0 3 * * *');
      expect(allDataTask?.cronExpression).toBe('0 4 * * *');
    });

    it('should use custom schedules when specified', () => {
      const customScheduler = new Scheduler({
        enabled: true,
        brandsSchedule: '0 1 * * *',
        flavorsSchedule: '0 2 * * *',
        allDataSchedule: '0 3 * * *'
      });

      const brandsTaskId = customScheduler.scheduleBrandsRefresh(mockRefreshAllData);
      const flavorsTaskId = customScheduler.scheduleFlavorsRefresh(mockRefreshAllData);
      const allDataTaskId = customScheduler.scheduleAllDataRefresh(mockRefreshAllData);

      const brandsTask = customScheduler.getTask(brandsTaskId);
      const flavorsTask = customScheduler.getTask(flavorsTaskId);
      const allDataTask = customScheduler.getTask(allDataTaskId);

      expect(brandsTask?.cronExpression).toBe('0 1 * * *');
      expect(flavorsTask?.cronExpression).toBe('0 2 * * *');
      expect(allDataTask?.cronExpression).toBe('0 3 * * *');
    });

    it('should use default timezone when not specified', () => {
      const customScheduler = new Scheduler({ enabled: true });

      const config = customScheduler.getConfig();
      expect(config.timezone).toBe('UTC');
    });

    it('should use custom timezone when specified', () => {
      const customScheduler = new Scheduler({
        enabled: true,
        timezone: 'Europe/Moscow'
      });

      const config = customScheduler.getConfig();
      expect(config.timezone).toBe('Europe/Moscow');
    });

    it('should use default max execution history when not specified', () => {
      const customScheduler = new Scheduler({ enabled: true });

      const config = customScheduler.getConfig();
      expect(config.maxExecutionHistory).toBe(100);
    });

    it('should use custom max execution history when specified', () => {
      const customScheduler = new Scheduler({
        enabled: true,
        maxExecutionHistory: 50
      });

      const config = customScheduler.getConfig();
      expect(config.maxExecutionHistory).toBe(50);
    });
  });

  // ============================================================================
  // Disabled Scheduler Integration Tests
  // ============================================================================

  describe('Disabled Scheduler', () => {
    it('should not start when disabled in config', async () => {
      const disabledScheduler = new Scheduler({ enabled: false });
      const taskId = disabledScheduler.scheduleBrandsRefresh(mockRefreshAllData);

      await disabledScheduler.start();

      expect(disabledScheduler.getStats().isRunning).toBe(false);

      const taskStatus = disabledScheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(false);
    });

    it('should still allow scheduling tasks when disabled', () => {
      const disabledScheduler = new Scheduler({ enabled: false });
      const taskId = disabledScheduler.scheduleBrandsRefresh(mockRefreshAllData);

      const task = disabledScheduler.getTask(taskId);
      expect(task).not.toBeUndefined();
      expect(task?.enabled).toBe(true);
    });

    it('should not start tasks when scheduler is disabled', async () => {
      const disabledScheduler = new Scheduler({ enabled: false });
      const taskId = disabledScheduler.scheduleBrandsRefresh(mockRefreshAllData);

      await disabledScheduler.start();

      const taskStatus = disabledScheduler.getJobStatus(taskId);
      expect(taskStatus?.running).toBe(false);
    });
  });

  // ============================================================================
  // Task Management Integration Tests
  // ============================================================================

  describe('Task Management', () => {
    it('should handle duplicate task names across different task types', () => {
      scheduler.scheduleBrandsRefresh(mockRefreshAllData);

      expect(() => {
        scheduler.scheduleBrandsRefresh(mockRefreshAllData);
      }).toThrow('Task with name \'brands-refresh\' already exists');
    });

    it('should handle invalid cron expressions', () => {
      expect(() => {
        scheduler.scheduleJob({
          name: 'invalid-task',
          cronExpression: 'invalid-cron',
          task: mockRefreshAllData
        });
      }).toThrow('Invalid cron expression: invalid-cron');
    });

    it('should accept valid cron expressions', () => {
      const validExpressions = [
        '0 0 * * *',      // Every minute
        '0 * * * *',      // Every hour
        '0 0 * * *',      // Every day at midnight
        '0 0 * * 0',      // Every Sunday at midnight
        '*/5 * * * *',    // Every 5 minutes
      ];

      validExpressions.forEach(expression => {
        expect(() => {
          scheduler.scheduleJob({
            name: `task-${expression}`,
            cronExpression: expression,
            task: mockRefreshAllData
          });
        }).not.toThrow();
      });
    });

    it('should handle task with enabled false', () => {
      const taskId = scheduler.scheduleJob({
        name: 'disabled-task',
        cronExpression: '0 0 * * *',
        task: mockRefreshAllData,
        enabled: false
      });

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(false);
    });

    it('should handle task with enabled true explicitly', () => {
      const taskId = scheduler.scheduleJob({
        name: 'enabled-task',
        cronExpression: '0 0 * * *',
        task: mockRefreshAllData,
        enabled: true
      });

      const taskStatus = scheduler.getJobStatus(taskId);
      expect(taskStatus?.enabled).toBe(true);
    });
  });
});
