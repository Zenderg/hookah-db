/**
 * Health Check Endpoint Tests
 * Tests for /health and /health/detailed endpoints
 */

import request from 'supertest';
import { createTestApp } from './test-server';
import { setupTestEnvironment, cleanupTestEnvironment } from './test-utils';

describe('Health Check Endpoints', () => {
  let app: any;

  beforeAll(() => {
    setupTestEnvironment();
    app = createTestApp();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toBeDefined();
      expect(new Date(timestamp)).toBeInstanceOf(Date);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should have minimal response body', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Should only have status and timestamp
      expect(Object.keys(response.body)).toHaveLength(2);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return 200 with detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('cache');
    });

    it('should return cache statistics', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.cache).toHaveProperty('size');
      expect(response.body.cache).toHaveProperty('keys');
      expect(response.body.cache).toHaveProperty('hits');
      expect(response.body.cache).toHaveProperty('misses');
      expect(response.body.cache).toHaveProperty('hitRate');
    });

    it('should return numeric cache statistics', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(typeof response.body.cache.size).toBe('number');
      expect(typeof response.body.cache.keys).toBe('number');
      expect(typeof response.body.cache.hits).toBe('number');
      expect(typeof response.body.cache.misses).toBe('number');
      expect(typeof response.body.cache.hitRate).toBe('number');
    });

    it('should return valid uptime', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return version string', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(typeof response.body.version).toBe('string');
      expect(response.body.version).toBeDefined();
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return hit rate between 0 and 1', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const hitRate = response.body.cache.hitRate;
      expect(hitRate).toBeGreaterThanOrEqual(0);
      expect(hitRate).toBeLessThanOrEqual(1);
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toBeDefined();
      expect(new Date(timestamp)).toBeInstanceOf(Date);
    });

    it('should return status ok when healthy', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Health Check Response Structure', () => {
    it('should have consistent response format across endpoints', async () => {
      const basicResponse = await request(app).get('/health').expect(200);
      const detailedResponse = await request(app).get('/health/detailed').expect(200);

      expect(basicResponse.body.status).toBe(detailedResponse.body.status);
      expect(basicResponse.body.timestamp).toBeDefined();
      expect(detailedResponse.body.timestamp).toBeDefined();
    });

    it('should return 200 for both endpoints', async () => {
      await request(app).get('/health').expect(200);
      await request(app).get('/health/detailed').expect(200);
    });

    it('should return JSON for both endpoints', async () => {
      await request(app).get('/health').expect('Content-Type', /json/);
      await request(app).get('/health/detailed').expect('Content-Type', /json/);
    });
  });
});
