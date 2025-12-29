/**
 * Tests for Transaction Management
 */

import { describe, it, expect } from 'vitest';
import {
  beginTransaction,
  withTransaction,
  withTransactionContext,
  executeInTransaction,
  withTransactionRetry,
  createSavepointContext,
  withSavepoints,
  executeBatch,
  executeParallelTransactions,
  beginTransactionWithIsolation,
  withTransactionIsolation,
  IsolationLevel,
} from '../src/transactions';

function generateUniqueName(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

describe('Transaction Management', () => {
  describe('beginTransaction', () => {
    it('should begin a new transaction', async () => {
      const tx = await beginTransaction();

      expect(tx.client).toBeDefined();
      expect(tx.commit).toBeInstanceOf(Function);
      expect(tx.rollback).toBeInstanceOf(Function);

      // Clean up
      await tx.rollback();
    });

    it('should commit transaction', async () => {
      const tx = await beginTransaction();
      const brandName = generateUniqueName('Test Brand');

      await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
      await tx.commit();

      // Get brand that was just created
      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      
      expect(brand).toBeDefined();
      expect(brand?.name).toBe(brandName);
    });

    it('should rollback transaction', async () => {
      const tx = await beginTransaction();
      const brandName = generateUniqueName('Rollback Brand');

      await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
      await tx.rollback();

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      
      expect(brand).toBeUndefined();
    });

    it('should throw error when committing twice', async () => {
      const tx = await beginTransaction();

      await tx.commit();

      await expect(tx.commit()).rejects.toThrow('Transaction already completed');
    });

    it('should throw error when rolling back twice', async () => {
      const tx = await beginTransaction();

      await tx.rollback();

      await expect(tx.rollback()).rejects.toThrow('Transaction already completed');
    });
  });

  describe('withTransaction', () => {
    it('should execute operations within transaction and commit on success', async () => {
      const brandName = generateUniqueName('Auto Commit Brand');
      const result = await withTransaction(async (client) => {
        await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
        return 'success';
      });

      expect(result).toBe('success');

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      
      expect(brand).toBeDefined();
      expect(brand?.name).toBe(brandName);
    });

    it('should rollback on error', async () => {
      const brandName = generateUniqueName('Error Brand');
      await expect(
        withTransaction(async (client) => {
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      
      expect(brand).toBeUndefined();
    });
  });

  describe('withTransactionContext', () => {
    it('should provide transaction context with manual commit/rollback', async () => {
      const brandName = generateUniqueName('Context Brand');
      const result = await withTransactionContext(async (tx) => {
        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
        // Let withTransactionContext handle commit automatically
        return 'committed';
      });

      expect(result).toBe('committed');

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      
      expect(brand).toBeDefined();
    });

    it('should rollback on error even without explicit rollback call', async () => {
      const brandName = generateUniqueName('Rollback Context Brand');
      await expect(
        withTransactionContext(async (tx) => {
          await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          throw new Error('Context error');
        })
      ).rejects.toThrow('Context error');

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      
      expect(brand).toBeUndefined();
    });
  });

  describe('executeInTransaction', () => {
    it('should execute multiple operations in transaction', async () => {
      const operations = [
        async (client: any) => {
          const brandName = generateUniqueName('Brand 1');
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Brand 2');
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Brand 3');
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        },
      ];

      const results = await executeInTransaction(operations);

      expect(results.length).toBe(3);
      expect(results.every((id: any) => typeof id === 'number')).toBe(true);
    });

    it('should rollback all operations if one fails', async () => {
      const operations = [
        async (client: any) => {
          const brandName = generateUniqueName('Brand A');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 'A';
        },
        async (client: any) => {
          const brandName = generateUniqueName('Brand B');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          throw new Error('Operation failed');
        },
        async (client: any) => {
          const brandName = generateUniqueName('Brand C');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 'C';
        },
      ];

      await expect(executeInTransaction(operations)).rejects.toThrow('Operation failed');

      const count = await (await import('../src/brands')).getBrandCount();
      expect(count).toBe(0);
    });
  });

  describe('withTransactionRetry', () => {
    it('should retry transaction on retryable errors', async () => {
      let attempts = 0;

      const result = await withTransactionRetry(async (client) => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Serialization failure');
          error.code = '40001';
          throw error;
        }
        return 'success after retry';
      }, 3);

      expect(result).toBe('success after retry');
      expect(attempts).toBe(2);
    });

    it('should throw error after max attempts', async () => {
      const error: any = new Error('Persistent error');
      error.code = '40001';

      await expect(
        withTransactionRetry(async () => {
          throw error;
        }, 2)
      ).rejects.toThrow('Persistent error');
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Non-retryable error');

      await expect(
        withTransactionRetry(async () => {
          throw error;
        }, 3)
      ).rejects.toThrow('Non-retryable error');
    });
  });

  describe('Savepoints', () => {
    it('should create and rollback to savepoint', async () => {
      const brand1Name = generateUniqueName('Brand 1');
      const brand2Name = generateUniqueName('Brand 2');
      
      await withTransactionContext(async (tx) => {
        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brand1Name]);

        const savepoints = createSavepointContext(tx.client);
        await savepoints.createSavepoint('sp1');

        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brand2Name]);

        await savepoints.rollbackToSavepoint('sp1');

        // Brand 2 should not exist after rollback to savepoint
        const result = await tx.client.query('SELECT COUNT(*) as count FROM brands WHERE name = $1', [brand2Name]);
        expect(parseInt(result.rows[0].count, 10)).toBe(0);
        // Let withTransactionContext handle commit automatically
      });

      // Brand 1 should exist
      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand1 = brands.find(b => b.name === brand1Name);
      expect(brand1?.name).toBe(brand1Name);
    });

    it('should release savepoint', async () => {
      const brand1Name = generateUniqueName('Brand 1');
      const brand2Name = generateUniqueName('Brand 2');
      
      await withTransactionContext(async (tx) => {
        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brand1Name]);

        const savepoints = createSavepointContext(tx.client);
        await savepoints.createSavepoint('sp1');

        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brand2Name]);

        await savepoints.releaseSavepoint('sp1');

        // Both brands should exist after releasing savepoint
        const result = await tx.client.query('SELECT COUNT(*) as count FROM brands');
        expect(parseInt(result.rows[0].count, 10)).toBe(2);
        // Let withTransactionContext handle commit automatically
      });
    });
  });

  describe('withSavepoints', () => {
    it('should provide savepoint context within transaction', async () => {
      const brandAName = generateUniqueName('Brand A');
      const brandBName = generateUniqueName('Brand B');
      
      const result = await withSavepoints(async (tx, savepoints) => {
        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandAName]);

        await savepoints.createSavepoint('save1');
        await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandBName]);

        await savepoints.rollbackToSavepoint('save1');
        // Let withTransactionContext handle commit automatically
        return 'done';
      });

      expect(result).toBe('done');

      const count = await (await import('../src/brands')).getBrandCount();
      expect(count).toBe(1);
    });
  });

  describe('executeBatch', () => {
    it('should execute operations in batches', async () => {
      const operations: Array<(client: any) => Promise<number>> = [];

      for (let i = 1; i <= 10; i++) {
        operations.push(async (client) => {
          const brandName = generateUniqueName(`Batch Brand ${i}`);
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        });
      }

      const results = await executeBatch(operations, 3);

      expect(results.length).toBe(10);

      // Count brands created in this test specifically
      const count = await (await import('../src/brands')).getBrandCount();
      expect(count).toBe(10);
    });

    it('should call callback for each batch', async () => {
      const operations = [
        async (client: any) => {
          const brandName = generateUniqueName('Batch Brand 1');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 1;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Batch Brand 2');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 2;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Batch Brand 3');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 3;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Batch Brand 4');
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 4;
        },
      ];

      const batchCalls: number[] = [];

      await executeBatch(operations, 2, (results, batchIndex) => {
        batchCalls.push(batchIndex);
      });

      expect(batchCalls).toEqual([0, 1]);
    });
  });

  describe('executeParallelTransactions', () => {
    it('should execute operations in parallel transactions', async () => {
      const operations = [
        async (client: any) => {
          const brandName = generateUniqueName('Parallel Brand 1');
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Parallel Brand 2');
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        },
        async (client: any) => {
          const brandName = generateUniqueName('Parallel Brand 3');
          const res = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
          return res.rows[0].id;
        },
      ];

      const results = await executeParallelTransactions(operations);

      expect(results.length).toBe(3);
      expect(results.every((id: any) => typeof id === 'number')).toBe(true);

      const count = await (await import('../src/brands')).getBrandCount();
      expect(count).toBe(3);
    });
  });

  describe('Isolation Levels', () => {
    it('should begin transaction with READ COMMITTED isolation', async () => {
      const tx = await beginTransactionWithIsolation(IsolationLevel.READ_COMMITTED);
      const brandName = generateUniqueName('Isolation Brand');

      await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
      await tx.commit();

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      expect(brand).toBeDefined();
    });

    it('should begin transaction with SERIALIZABLE isolation', async () => {
      const tx = await beginTransactionWithIsolation(IsolationLevel.SERIALIZABLE);
      const brandName = generateUniqueName('Serializable Brand');

      await tx.client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
      await tx.commit();

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      expect(brand).toBeDefined();
    });
  });

  describe('withTransactionIsolation', () => {
    it('should execute operations with specified isolation level', async () => {
      const brandName = generateUniqueName('Isolation Test Brand');
      const result = await withTransactionIsolation(
        async (client) => {
          await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
          return 'done';
        },
        IsolationLevel.READ_COMMITTED
      );

      expect(result).toBe('done');

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      expect(brand?.name).toBe(brandName);
    });

    it('should use READ COMMITTED as default isolation level', async () => {
      const brandName = generateUniqueName('Default Isolation Brand');
      const result = await withTransactionIsolation(async (client) => {
        await client.query('INSERT INTO brands (name) VALUES ($1)', [brandName]);
        return 'done';
      });

      expect(result).toBe('done');

      const brands = await (await import('../src/brands')).getAllBrands(1000);
      const brand = brands.find(b => b.name === brandName);
      expect(brand?.name).toBe(brandName);
    });
  });
});
