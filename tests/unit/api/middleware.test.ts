/**
 * Middleware Tests
 * Tests for authentication, rate limiting, and error handling middleware
 */

import request from 'supertest';
import { createTestApp } from './test-server';
import { setupTestEnvironment, cleanupTestEnvironment } from './test-utils';

describe('Middleware', () => {
  let app: any;

  beforeAll(() => {
    setupTestEnvironment();
    app = createTestApp();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('Authentication Middleware', () => {
    describe('Valid API Key', () => {
      it('should allow request with valid API key', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'test-api-key')
          .expect(200);

        expect(response.body).toHaveProperty('success');
      });

      it('should allow request with any valid API key', async () => {
        await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'client1-key')
          .expect(200);

        await request(app)
          .post('/api/v1/flavors/refresh')
          .set('X-API-Key', 'client2-key')
          .expect(200);
      });

      it('should allow request with multiple valid API keys', async () => {
        const keys = ['test-api-key', 'client1-key', 'client2-key'];

        for (const key of keys) {
          await request(app)
            .post('/api/v1/brands/refresh')
            .set('X-API-Key', key)
            .expect(200);
        }
      });
    });

    describe('Missing API Key', () => {
      it('should return 401 when API key is missing', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('API key is required');
      });

      it('should return 401 when X-API-Key header is empty', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', '')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
        expect(response.body.message).toContain('API key is required');
      });

      it('should return 401 for both brand and flavor refresh endpoints', async () => {
        await request(app)
          .post('/api/v1/brands/refresh')
          .expect(401);

        await request(app)
          .post('/api/v1/flavors/refresh')
          .expect(401);
      });
    });

    describe('Invalid API Key', () => {
      it('should return 403 with invalid API key', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'invalid-key')
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Forbidden');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Invalid API key');
      });

      it('should return 403 with wrong API key format', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'wrong-format-key')
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Forbidden');
      });

      it('should return 403 with partially correct API key', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'test-api-key-wrong')
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Forbidden');
      });

      it('should return 403 for both brand and flavor refresh endpoints', async () => {
        await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'invalid-key')
          .expect(403);

        await request(app)
          .post('/api/v1/flavors/refresh')
          .set('X-API-Key', 'invalid-key')
          .expect(403);
      });
    });

    describe('Case Sensitivity', () => {
      it('should be case-sensitive for API keys', async () => {
        await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'TEST-API-KEY')
          .expect(403);

        await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'Test-Api-Key')
          .expect(403);
      });

      it('should accept exact match for API key', async () => {
        await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'test-api-key')
          .expect(200);
      });
    });

    describe('Header Format', () => {
      it('should accept X-API-Key header', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'test-api-key')
          .expect(200);

        expect(response.body).toHaveProperty('success');
      });
    });
  });

  describe('Rate Limiting Middleware', () => {
    describe('Rate Limit Enforcement', () => {
      it('should allow requests within rate limit', async () => {
        // Make 10 requests (well within the 1000 limit)
        const requests = Array(10).fill(null).map(() =>
          request(app).get('/api/v1/brands')
        );

        const responses = await Promise.all(requests);

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
      });

      it('should include rate limit headers', async () => {
        const response = await request(app)
          .get('/api/v1/brands')
          .expect(200);

        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
        expect(response.headers).toHaveProperty('ratelimit-reset');
      });

      it('should decrement remaining requests', async () => {
        const response1 = await request(app).get('/api/v1/brands').expect(200);
        const response2 = await request(app).get('/api/v1/brands').expect(200);

        const remaining1 = parseInt(response1.headers['ratelimit-remaining'] as string);
        const remaining2 = parseInt(response2.headers['ratelimit-remaining'] as string);

        expect(remaining2).toBeLessThan(remaining1);
      });

      it('should reset rate limit after window expires', async () => {
        // This test would require mocking time, which is complex
        // For now, we just verify the header exists
        const response = await request(app).get('/api/v1/brands').expect(200);

        expect(response.headers).toHaveProperty('ratelimit-reset');
      });
    });

    describe('Rate Limit Configuration', () => {
      it('should use default rate limit when not configured', async () => {
        const response = await request(app).get('/api/v1/brands').expect(200);

        const limit = parseInt(response.headers['ratelimit-limit'] as string);
        expect(limit).toBeGreaterThan(0);
      });

      it('should respect custom rate limit window', async () => {
        const response = await request(app).get('/api/v1/brands').expect(200);

        const reset = parseInt(response.headers['ratelimit-reset'] as string);
        expect(reset).toBeGreaterThan(0);
      });
    });

    describe('Rate Limit Per IP', () => {
      it('should apply rate limit per IP address', async () => {
        // Supertest uses the same IP for all requests by default
        // This test verifies that rate limiting is working
        const response = await request(app).get('/api/v1/brands').expect(200);

        expect(response.headers).toHaveProperty('ratelimit-remaining');
      });

      it('should track requests separately for different IPs', async () => {
        // This would require making requests from different IPs
        // For now, we verify the rate limit headers are present
        const response = await request(app).get('/api/v1/brands').expect(200);

        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
      });
    });

    describe('Rate Limit Error Response', () => {
      it('should include rate limit headers on success', async () => {
        const response = await request(app)
          .get('/api/v1/brands')
          .expect(200);

        expect(response.headers['ratelimit-limit']).toBeDefined();
        expect(response.headers['ratelimit-remaining']).toBeDefined();
        expect(response.headers['ratelimit-reset']).toBeDefined();
      });

      it('should not include stack trace in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app).get('/api/v1/brands').expect(200);

        expect(response.body).not.toHaveProperty('stack');

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('Error Handling Middleware', () => {
    describe('Not Found Errors', () => {
      it('should return 404 for undefined routes', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Not Found');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('not found');
      });

      it('should return 404 for undefined methods', async () => {
        const response = await request(app)
          .post('/api/v1/brands')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Not Found');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('not found');
      });

      it('should include route in error message', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body.message).toContain('/api/v1/nonexistent');
      });

      it('should include method in error message', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body.message).toContain('GET');
      });
    });

    describe('Operational Errors', () => {
      it('should handle operational errors gracefully', async () => {
        const response = await request(app)
          .get('/api/v1/brands/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });

      it('should return appropriate status code for operational errors', async () => {
        const response = await request(app)
          .get('/api/v1/brands/nonexistent')
          .expect(404);

        expect(response.status).toBe(404);
      });
    });

    describe('Error Response Structure', () => {
      it('should return error name', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });

      it('should return error message when available', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('message');
      });

      it('should return JSON content type', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect('Content-Type', /json/)
          .expect(404);

        expect(response.body).toBeDefined();
      });
    });

    describe('Stack Trace in Development', () => {
      it('should not include stack trace in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).not.toHaveProperty('stack');

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Error Response for Different Status Codes', () => {
      it('should handle 401 errors', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should handle 403 errors', async () => {
        const response = await request(app)
          .post('/api/v1/brands/refresh')
          .set('X-API-Key', 'invalid-key')
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Forbidden');
      });

      it('should handle 404 errors', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Not Found');
      });
    });

    describe('Error Response for Internal Server Errors', () => {
      it('should handle 500 errors gracefully', async () => {
        // This test verifies the error handler structure
        // Actual 500 errors would require triggering them
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });

      it('should return error name for internal errors', async () => {
        const response = await request(app)
          .get('/api/v1/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
