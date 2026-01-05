/**
 * Flavor Routes Tests
 * Tests for all flavor-related API endpoints
 */

import request from 'supertest';
import { createTestApp } from './test-server';
import { setupTestEnvironment, cleanupTestEnvironment } from './test-utils';

describe('Flavor Routes', () => {
  let app: any;

  beforeAll(() => {
    setupTestEnvironment();
    app = createTestApp();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('GET /api/v1/flavors', () => {
    it('should return 200 with paginated flavors', async () => {
      const response = await request(app)
        .get('/api/v1/flavors')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should return default pagination (page 1, limit 20)', async () => {
      const response = await request(app)
        .get('/api/v1/flavors')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should respect custom page parameter', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?page=2')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
    });

    it('should respect custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?limit=10')
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter flavors by brandSlug', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?brandSlug=test-brand')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter flavors by lineSlug', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?lineSlug=test-line')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter flavors by strength', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?strength=Средняя')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter flavors by tags', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?tags=Холодок')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter flavors by multiple tags', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?tags=Холодок,Фруктовый')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort flavors by rating (desc)', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?sort=rating')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort flavors by name (asc)', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?sort=name')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/v1/flavors')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return flavors with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/flavors')
        .expect(200);

      if (response.body.data.length > 0) {
        const flavor = response.body.data[0];
        expect(flavor).toHaveProperty('slug');
        expect(flavor).toHaveProperty('name');
        expect(flavor).toHaveProperty('brandSlug');
        expect(flavor).toHaveProperty('brandName');
        expect(flavor).toHaveProperty('rating');
        expect(flavor).toHaveProperty('status');
      }
    });

    it('should handle multiple filters together', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?brandSlug=test-brand&strength=Средная&tags=Холодок')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle pagination with empty results', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?page=999')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/flavors/:slug', () => {
    it('should return 200 with flavor data for valid slug', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(response.body).toHaveProperty('slug', 'test-flavor');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('brandSlug');
      expect(response.body).toHaveProperty('brandName');
      expect(response.body).toHaveProperty('rating');
    });

    it('should return 404 for non-existent flavor', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return flavor with complete structure', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(response.body).toHaveProperty('slug');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('nameAlt');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('brandSlug');
      expect(response.body).toHaveProperty('brandName');
      expect(response.body).toHaveProperty('lineSlug');
      expect(response.body).toHaveProperty('lineName');
      expect(response.body).toHaveProperty('country');
      expect(response.body).toHaveProperty('officialStrength');
      expect(response.body).toHaveProperty('userStrength');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('imageUrl');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('ratingsCount');
      expect(response.body).toHaveProperty('reviewsCount');
      expect(response.body).toHaveProperty('viewsCount');
      expect(response.body).toHaveProperty('ratingDistribution');
      expect(response.body).toHaveProperty('smokeAgainPercentage');
      expect(response.body).toHaveProperty('htreviewsId');
      expect(response.body).toHaveProperty('dateAdded');
      expect(response.body).toHaveProperty('addedBy');
    });

    it('should return rating distribution with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(response.body.ratingDistribution).toHaveProperty('count1');
      expect(response.body.ratingDistribution).toHaveProperty('count2');
      expect(response.body.ratingDistribution).toHaveProperty('count3');
      expect(response.body.ratingDistribution).toHaveProperty('count4');
      expect(response.body.ratingDistribution).toHaveProperty('count5');
    });

    it('should handle special characters in slug', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor-2')
        .expect(200);

      expect(response.body).toHaveProperty('slug');
    });
  });

  describe('POST /api/v1/flavors/refresh', () => {
    it('should return 200 with valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/flavors/refresh')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('count');
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/flavors/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('API key is required');
    });

    it('should return 403 with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/flavors/refresh')
        .set('X-API-Key', 'invalid-key')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('Invalid API key');
    });

    it('should accept any valid API key', async () => {
      await request(app)
        .post('/api/v1/flavors/refresh')
        .set('X-API-Key', 'client1-key')
        .expect(200);

      await request(app)
        .post('/api/v1/flavors/refresh')
        .set('X-API-Key', 'client2-key')
        .expect(200);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .post('/api/v1/flavors/refresh')
        .set('X-API-Key', 'test-api-key')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return refresh result with success flag', async () => {
      const response = await request(app)
        .post('/api/v1/flavors/refresh')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('Flavor Routes Error Handling', () => {
    it('should handle invalid pagination parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?page=invalid&limit=invalid')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle empty brandSlug filter', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?brandSlug=')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle empty tags filter', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?tags=')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle invalid sort parameter', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?sort=invalid')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle special characters in filters', async () => {
      const response = await request(app)
        .get('/api/v1/flavors?tags=Холодок,Фруктовый')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Flavor Data Validation', () => {
    it('should return numeric rating values', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(typeof response.body.rating).toBe('number');
      expect(typeof response.body.ratingsCount).toBe('number');
      expect(typeof response.body.reviewsCount).toBe('number');
      expect(typeof response.body.viewsCount).toBe('number');
    });

    it('should return numeric rating distribution counts', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(typeof response.body.ratingDistribution.count1).toBe('number');
      expect(typeof response.body.ratingDistribution.count2).toBe('number');
      expect(typeof response.body.ratingDistribution.count3).toBe('number');
      expect(typeof response.body.ratingDistribution.count4).toBe('number');
      expect(typeof response.body.ratingDistribution.count5).toBe('number');
    });

    it('should return array for tags', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(Array.isArray(response.body.tags)).toBe(true);
    });

    it('should return valid date for dateAdded', async () => {
      const response = await request(app)
        .get('/api/v1/flavors/test-flavor')
        .expect(200);

      expect(response.body.dateAdded).toBeDefined();
    });
  });
});
