/**
 * Brand Routes Tests
 * Tests for all brand-related API endpoints
 */

import request from 'supertest';
import { createTestApp } from './test-server';
import { setupTestEnvironment, cleanupTestEnvironment } from './test-utils';

describe('Brand Routes', () => {
  let app: any;

  beforeAll(() => {
    setupTestEnvironment();
    app = createTestApp();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('GET /api/v1/brands', () => {
    it('should return 200 with paginated brands', async () => {
      const response = await request(app)
        .get('/api/v1/brands')
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
        .get('/api/v1/brands')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should respect custom page parameter', async () => {
      const response = await request(app)
        .get('/api/v1/brands?page=2')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
    });

    it('should respect custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/brands?limit=10')
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter brands by country', async () => {
      const response = await request(app)
        .get('/api/v1/brands?country=Россия')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort brands by rating (desc)', async () => {
      const response = await request(app)
        .get('/api/v1/brands?sort=rating')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should sort brands by name (asc)', async () => {
      const response = await request(app)
        .get('/api/v1/brands?sort=name')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/v1/brands')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return brands with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/brands')
        .expect(200);

      if (response.body.data.length > 0) {
        const brand = response.body.data[0];
        expect(brand).toHaveProperty('slug');
        expect(brand).toHaveProperty('name');
        expect(brand).toHaveProperty('nameEn');
        expect(brand).toHaveProperty('country');
        expect(brand).toHaveProperty('rating');
        expect(brand).toHaveProperty('status');
      }
    });

    it('should handle pagination with empty results', async () => {
      const response = await request(app)
        .get('/api/v1/brands?page=999')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/brands/:slug', () => {
    it('should return 200 with brand data for valid slug', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand')
        .expect(200);

      expect(response.body).toHaveProperty('slug', 'test-brand');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('nameEn');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('country');
      expect(response.body).toHaveProperty('rating');
    });

    it('should return 404 for non-existent brand', async () => {
      const response = await request(app)
        .get('/api/v1/brands/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return brand with complete structure', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand')
        .expect(200);

      expect(response.body).toHaveProperty('slug');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('nameEn');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('country');
      expect(response.body).toHaveProperty('website');
      expect(response.body).toHaveProperty('foundedYear');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('imageUrl');
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('ratingsCount');
      expect(response.body).toHaveProperty('reviewsCount');
      expect(response.body).toHaveProperty('viewsCount');
      expect(response.body).toHaveProperty('lines');
      expect(response.body).toHaveProperty('flavors');
    });

    it('should handle special characters in slug', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand-2')
        .expect(200);

      expect(response.body).toHaveProperty('slug');
    });
  });

  describe('GET /api/v1/brands/:brandSlug/flavors', () => {
    it('should return 200 with flavors for brand', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand/flavors')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return paginated flavors', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand/flavors')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should respect custom pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand/flavors?page=2&limit=10')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should return flavors with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand/flavors')
        .expect(200);

      if (response.body.data.length > 0) {
        const flavor = response.body.data[0];
        expect(flavor).toHaveProperty('slug');
        expect(flavor).toHaveProperty('name');
        expect(flavor).toHaveProperty('brandSlug');
        expect(flavor).toHaveProperty('brandName');
        expect(flavor).toHaveProperty('rating');
      }
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/v1/brands/test-brand/flavors')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('POST /api/v1/brands/refresh', () => {
    it('should return 200 with valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/brands/refresh')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('count');
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/brands/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('API key is required');
    });

    it('should return 403 with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/brands/refresh')
        .set('X-API-Key', 'invalid-key')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('Invalid API key');
    });

    it('should accept any valid API key', async () => {
      await request(app)
        .post('/api/v1/brands/refresh')
        .set('X-API-Key', 'client1-key')
        .expect(200);

      await request(app)
        .post('/api/v1/brands/refresh')
        .set('X-API-Key', 'client2-key')
        .expect(200);
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .post('/api/v1/brands/refresh')
        .set('X-API-Key', 'test-api-key')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return refresh result with success flag', async () => {
      const response = await request(app)
        .post('/api/v1/brands/refresh')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('Brand Routes Error Handling', () => {
    it('should handle invalid pagination parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/brands?page=invalid&limit=invalid')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle empty country filter', async () => {
      const response = await request(app)
        .get('/api/v1/brands?country=')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle invalid sort parameter', async () => {
      const response = await request(app)
        .get('/api/v1/brands?sort=invalid')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});
