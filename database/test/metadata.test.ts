/**
 * Tests for Scraping Metadata CRUD Operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createScrapingMetadata,
  getScrapingMetadataById,
  getRecentScrapingOperations,
  getScrapingOperationsByStatus,
  getScrapingOperationsByType,
  getAllScrapingOperations,
  updateScrapingMetadata,
  deleteScrapingMetadata,
  completeScrapingOperation,
  failScrapingOperation,
  incrementScrapingErrorCount,
  getScrapingMetadataCount,
  getScrapingMetadataCountByStatus,
  getScrapingMetadataCountByType,
  getMostRecentScrapingOperation,
  getInProgressScrapingOperations,
  getFailedScrapingOperations,
} from '../src/metadata';
import type { CreateScrapingMetadataInput, UpdateScrapingMetadataInput } from '../src/types';

describe('Scraping Metadata CRUD Operations', () => {
  describe('createScrapingMetadata', () => {
    it('should create a new scraping metadata record', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        status: 'in_progress',
        started_at: new Date(),
        brands_processed: 0,
        products_processed: 0,
        error_count: 0,
      };

      const metadata = await createScrapingMetadata(input);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBeGreaterThan(0);
      expect(metadata.operation_type).toBe('full_refresh');
      expect(metadata.status).toBe('in_progress');
      expect(metadata.brands_processed).toBe(0);
      expect(metadata.products_processed).toBe(0);
      expect(metadata.error_count).toBe(0);
      expect(metadata.started_at).toBeInstanceOf(Date);
      expect(metadata.completed_at).toBeNull();
    });

    it('should create metadata with minimal fields', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'incremental_update',
      };

      const metadata = await createScrapingMetadata(input);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBeGreaterThan(0);
      expect(metadata.operation_type).toBe('incremental_update');
      expect(metadata.status).toBe('in_progress'); // default
      expect(metadata.brands_processed).toBe(0); // default
      expect(metadata.products_processed).toBe(0); // default
      expect(metadata.error_count).toBe(0); // default
    });
  });

  describe('getScrapingMetadataById', () => {
    it('should return metadata by ID', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
      };
      const created = await createScrapingMetadata(input);

      const metadata = await getScrapingMetadataById(created.id);

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe(created.id);
      expect(metadata?.operation_type).toBe('full_refresh');
    });

    it('should return null for non-existent metadata', async () => {
      const metadata = await getScrapingMetadataById(999999);

      expect(metadata).toBeNull();
    });
  });

  describe('getRecentScrapingOperations', () => {
    beforeEach(async () => {
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        status: 'completed',
        started_at: new Date(Date.now() - 3600000), // 1 hour ago
      });
      await createScrapingMetadata({
        operation_type: 'incremental_update',
        status: 'in_progress',
        started_at: new Date(Date.now() - 1800000), // 30 minutes ago
      });
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        status: 'failed',
        started_at: new Date(Date.now() - 900000), // 15 minutes ago
      });
    });

    it('should return recent operations ordered by started_at DESC', async () => {
      const operations = await getRecentScrapingOperations();

      expect(operations.length).toBeGreaterThanOrEqual(3);
      const timestamps = operations.map(op => op.started_at.getTime());
      const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sortedTimestamps);
    });

    it('should respect limit parameter', async () => {
      const operations = await getRecentScrapingOperations(2);

      expect(operations.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const operations1 = await getRecentScrapingOperations(10, 0);
      const operations2 = await getRecentScrapingOperations(10, 2);

      expect(operations2.length).toBeLessThanOrEqual(operations1.length);
    });
  });

  describe('getScrapingOperationsByStatus', () => {
    beforeEach(async () => {
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        status: 'in_progress',
      });
      await createScrapingMetadata({
        operation_type: 'incremental_update',
        status: 'in_progress',
      });
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        status: 'completed',
      });
      await createScrapingMetadata({
        operation_type: 'incremental_update',
        status: 'failed',
      });
    });

    it('should return operations with specific status', async () => {
      const inProgress = await getScrapingOperationsByStatus('in_progress');

      expect(inProgress.length).toBeGreaterThanOrEqual(2);
      expect(inProgress.every(op => op.status === 'in_progress')).toBe(true);
    });

    it('should return completed operations', async () => {
      const completed = await getScrapingOperationsByStatus('completed');

      expect(completed.length).toBeGreaterThanOrEqual(1);
      expect(completed.every(op => op.status === 'completed')).toBe(true);
    });

    it('should return failed operations', async () => {
      const failed = await getScrapingOperationsByStatus('failed');

      expect(failed.length).toBeGreaterThanOrEqual(1);
      expect(failed.every(op => op.status === 'failed')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const operations = await getScrapingOperationsByStatus('in_progress', 1);

      expect(operations.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getScrapingOperationsByType', () => {
    beforeEach(async () => {
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        status: 'completed',
      });
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        status: 'in_progress',
      });
      await createScrapingMetadata({
        operation_type: 'incremental_update',
        status: 'completed',
      });
    });

    it('should return operations with specific type', async () => {
      const fullRefresh = await getScrapingOperationsByType('full_refresh');

      expect(fullRefresh.length).toBeGreaterThanOrEqual(2);
      expect(fullRefresh.every(op => op.operation_type === 'full_refresh')).toBe(true);
    });

    it('should return incremental update operations', async () => {
      const incremental = await getScrapingOperationsByType('incremental_update');

      expect(incremental.length).toBeGreaterThanOrEqual(1);
      expect(incremental.every(op => op.operation_type === 'incremental_update')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const operations = await getScrapingOperationsByType('full_refresh', 1);

      expect(operations.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getAllScrapingOperations', () => {
    beforeEach(async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'completed' });
      await createScrapingMetadata({ operation_type: 'incremental_update', status: 'in_progress' });
    });

    it('should return all operations', async () => {
      const operations = await getAllScrapingOperations();

      expect(operations.length).toBeGreaterThanOrEqual(2);
      expect(operations.every(op => op.id && op.operation_type && op.status)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const operations = await getAllScrapingOperations(1);

      expect(operations.length).toBeLessThanOrEqual(1);
    });

    it('should respect offset parameter', async () => {
      const operations1 = await getAllScrapingOperations(10, 0);
      const operations2 = await getAllScrapingOperations(10, 1);

      expect(operations2.length).toBeLessThanOrEqual(operations1.length);
    });
  });

  describe('updateScrapingMetadata', () => {
    it('should update metadata fields', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        status: 'in_progress',
      };
      const created = await createScrapingMetadata(input);

      const updateInput: UpdateScrapingMetadataInput = {
        status: 'completed',
        completed_at: new Date(),
        brands_processed: 10,
        products_processed: 100,
      };

      const updated = await updateScrapingMetadata(created.id, updateInput);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completed_at).toBeInstanceOf(Date);
      expect(updated?.brands_processed).toBe(10);
      expect(updated?.products_processed).toBe(100);
    });

    it('should update only provided fields', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        status: 'in_progress',
        brands_processed: 5,
      };
      const created = await createScrapingMetadata(input);

      const updated = await updateScrapingMetadata(created.id, { brands_processed: 10 });

      expect(updated?.status).toBe('in_progress'); // unchanged
      expect(updated?.brands_processed).toBe(10);
    });

    it('should return null for non-existent metadata', async () => {
      const updated = await updateScrapingMetadata(999999, { status: 'completed' });

      expect(updated).toBeNull();
    });

    it('should return existing metadata when no fields to update', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
      };
      const created = await createScrapingMetadata(input);

      const updated = await updateScrapingMetadata(created.id, {});

      expect(updated).toEqual(created);
    });
  });

  describe('deleteScrapingMetadata', () => {
    it('should delete metadata by ID', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
      };
      const created = await createScrapingMetadata(input);

      const deleted = await deleteScrapingMetadata(created.id);

      expect(deleted).toBe(true);

      const metadata = await getScrapingMetadataById(created.id);
      expect(metadata).toBeNull();
    });

    it('should return false for non-existent metadata', async () => {
      const deleted = await deleteScrapingMetadata(999999);

      expect(deleted).toBe(false);
    });
  });

  describe('completeScrapingOperation', () => {
    it('should mark operation as completed', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        status: 'in_progress',
      };
      const created = await createScrapingMetadata(input);

      const completed = await completeScrapingOperation(created.id, 15, 150);

      expect(completed).toBeDefined();
      expect(completed?.status).toBe('completed');
      expect(completed?.completed_at).toBeInstanceOf(Date);
      expect(completed?.brands_processed).toBe(15);
      expect(completed?.products_processed).toBe(150);
    });

    it('should return null for non-existent metadata', async () => {
      const completed = await completeScrapingOperation(999999, 10, 100);

      expect(completed).toBeNull();
    });
  });

  describe('failScrapingOperation', () => {
    it('should mark operation as failed', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        status: 'in_progress',
      };
      const created = await createScrapingMetadata(input);

      const failed = await failScrapingOperation(created.id, 'Connection timeout');

      expect(failed).toBeDefined();
      expect(failed?.status).toBe('failed');
      expect(failed?.completed_at).toBeInstanceOf(Date);
      expect(failed?.error_details).toBe('Connection timeout');
    });

    it('should return null for non-existent metadata', async () => {
      const failed = await failScrapingOperation(999999, 'Test error');

      expect(failed).toBeNull();
    });
  });

  describe('incrementScrapingErrorCount', () => {
    it('should increment error count by 1 (default)', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        error_count: 2,
      };
      const created = await createScrapingMetadata(input);

      const updated = await incrementScrapingErrorCount(created.id);

      expect(updated).toBeDefined();
      expect(updated?.error_count).toBe(3);
    });

    it('should increment error count by custom amount', async () => {
      const input: CreateScrapingMetadataInput = {
        operation_type: 'full_refresh',
        error_count: 5,
      };
      const created = await createScrapingMetadata(input);

      const updated = await incrementScrapingErrorCount(created.id, 3);

      expect(updated).toBeDefined();
      expect(updated?.error_count).toBe(8);
    });

    it('should return null for non-existent metadata', async () => {
      const updated = await incrementScrapingErrorCount(999999);

      expect(updated).toBeNull();
    });
  });

  describe('getScrapingMetadataCount', () => {
    it('should return count of operations', async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh' });
      await createScrapingMetadata({ operation_type: 'incremental_update' });

      const count = await getScrapingMetadataCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getScrapingMetadataCountByStatus', () => {
    beforeEach(async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'in_progress' });
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'in_progress' });
      await createScrapingMetadata({ operation_type: 'incremental_update', status: 'completed' });
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'failed' });
    });

    it('should return count by status', async () => {
      const inProgressCount = await getScrapingMetadataCountByStatus('in_progress');
      const completedCount = await getScrapingMetadataCountByStatus('completed');
      const failedCount = await getScrapingMetadataCountByStatus('failed');

      expect(inProgressCount).toBeGreaterThanOrEqual(2);
      expect(completedCount).toBeGreaterThanOrEqual(1);
      expect(failedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getScrapingMetadataCountByType', () => {
    beforeEach(async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'completed' });
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'in_progress' });
      await createScrapingMetadata({ operation_type: 'incremental_update', status: 'completed' });
    });

    it('should return count by operation type', async () => {
      const fullRefreshCount = await getScrapingMetadataCountByType('full_refresh');
      const incrementalCount = await getScrapingMetadataCountByType('incremental_update');

      expect(fullRefreshCount).toBeGreaterThanOrEqual(2);
      expect(incrementalCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getMostRecentScrapingOperation', () => {
    it('should return the most recent operation', async () => {
      await createScrapingMetadata({
        operation_type: 'full_refresh',
        started_at: new Date(Date.now() - 3600000),
      });

      const recent = await createScrapingMetadata({
        operation_type: 'incremental_update',
        started_at: new Date(),
      });

      const mostRecent = await getMostRecentScrapingOperation();

      expect(mostRecent).toBeDefined();
      expect(mostRecent?.id).toBe(recent.id);
      expect(mostRecent?.operation_type).toBe('incremental_update');
    });

    it('should return null when no operations exist', async () => {
      // Clean up all operations
      const allOps = await getAllScrapingOperations();
      for (const op of allOps) {
        await deleteScrapingMetadata(op.id);
      }

      const mostRecent = await getMostRecentScrapingOperation();

      expect(mostRecent).toBeNull();
    });
  });

  describe('getInProgressScrapingOperations', () => {
    it('should return all in-progress operations', async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'in_progress' });
      await createScrapingMetadata({ operation_type: 'incremental_update', status: 'in_progress' });
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'completed' });

      const inProgress = await getInProgressScrapingOperations();

      expect(inProgress.length).toBeGreaterThanOrEqual(2);
      expect(inProgress.every(op => op.status === 'in_progress')).toBe(true);
    });
  });

  describe('getFailedScrapingOperations', () => {
    it('should return failed operations with limit', async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'failed' });
      await createScrapingMetadata({ operation_type: 'incremental_update', status: 'failed' });
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'completed' });

      const failed = await getFailedScrapingOperations(10);

      expect(failed.length).toBeGreaterThanOrEqual(2);
      expect(failed.every(op => op.status === 'failed')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      await createScrapingMetadata({ operation_type: 'full_refresh', status: 'failed' });
      await createScrapingMetadata({ operation_type: 'incremental_update', status: 'failed' });

      const failed = await getFailedScrapingOperations(1);

      expect(failed.length).toBeLessThanOrEqual(1);
    });
  });
});
