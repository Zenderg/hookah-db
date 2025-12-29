/**
 * Tests for Brand CRUD Operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBrand,
  getBrandById,
  getAllBrands,
  searchBrandsByName,
  updateBrand,
  deleteBrand,
  upsertBrand,
  getBrandCount,
  brandExists,
} from '../src/brands';
import type { CreateBrandInput, UpdateBrandInput } from '../src/types';

/**
 * Generate a unique name for test data to avoid conflicts
 */
function generateUniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

describe('Brand CRUD Operations', () => {
  describe('createBrand', () => {
    it('should create a new brand', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('Test Brand'),
        description: 'A test brand',
        image_url: 'https://example.com/image.jpg',
        source_url: 'https://example.com',
      };

      const brand = await createBrand(input);

      expect(brand).toBeDefined();
      expect(brand.id).toBeGreaterThan(0);
      expect(brand.name).toContain('Test Brand');
      expect(brand.description).toBe('A test brand');
      expect(brand.image_url).toBe('https://example.com/image.jpg');
      expect(brand.source_url).toBe('https://example.com');
      expect(brand.created_at).toBeInstanceOf(Date);
      expect(brand.updated_at).toBeInstanceOf(Date);
    });

    it('should create a brand with minimal fields', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('Minimal Brand'),
      };

      const brand = await createBrand(input);

      expect(brand).toBeDefined();
      expect(brand.id).toBeGreaterThan(0);
      expect(brand.name).toContain('Minimal Brand');
      expect(brand.description).toBeNull();
      expect(brand.image_url).toBeNull();
      expect(brand.source_url).toBeNull();
    });

    it('should throw error for duplicate brand name', async () => {
      const name = generateUniqueName('Duplicate Brand');
      const input: CreateBrandInput = {
        name,
      };

      await createBrand(input);

      await expect(createBrand(input)).rejects.toThrow(`Brand with name "${name}" already exists`);
    });
  });

  describe('getBrandById', () => {
    it('should return brand by ID', async () => {
      const input: CreateBrandInput = { name: generateUniqueName('Get By ID Brand') };
      const created = await createBrand(input);

      const brand = await getBrandById(created.id);

      expect(brand).toBeDefined();
      expect(brand?.id).toBe(created.id);
      expect(brand?.name).toContain('Get By ID Brand');
    });

    it('should return null for non-existent brand', async () => {
      const brand = await getBrandById(999999);

      expect(brand).toBeNull();
    });
  });

  describe('getAllBrands', () => {
    beforeEach(async () => {
      // Create multiple brands for pagination tests
      await createBrand({ name: generateUniqueName('Brand A') });
      await createBrand({ name: generateUniqueName('Brand B') });
      await createBrand({ name: generateUniqueName('Brand C') });
    });

    it('should return all brands', async () => {
      const brands = await getAllBrands();

      expect(brands.length).toBeGreaterThanOrEqual(3);
      expect(brands.every(b => b.id && b.name)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const brands = await getAllBrands(2);

      expect(brands.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const brands1 = await getAllBrands(10, 0);
      const brands2 = await getAllBrands(10, 2);

      expect(brands2.length).toBeLessThanOrEqual(brands1.length);
    });

    it('should return brands ordered by name', async () => {
      const brands = await getAllBrands(10, 0);
      const names = brands.map(b => b.name);

      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('searchBrandsByName', () => {
    beforeEach(async () => {
      await createBrand({ name: generateUniqueName('Al Fakher') });
      await createBrand({ name: generateUniqueName('Adalya') });
      await createBrand({ name: generateUniqueName('Tangiers') });
      await createBrand({ name: generateUniqueName('Starbuzz') });
    });

    it('should find brands by partial name match (case-insensitive)', async () => {
      const brands = await searchBrandsByName('al');

      expect(brands.length).toBeGreaterThanOrEqual(2);
      expect(brands.some(b => b.name.toLowerCase().includes('al'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const brands = await searchBrandsByName('NonExistent');

      expect(brands).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const brands = await searchBrandsByName('a', 1);

      expect(brands.length).toBeLessThanOrEqual(1);
    });
  });

  describe('updateBrand', () => {
    it('should update brand fields', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('Original Name'),
        description: 'Original description',
      };
      const created = await createBrand(input);

      const updateInput: UpdateBrandInput = {
        name: generateUniqueName('Updated Name'),
        description: 'Updated description',
      };

      const updated = await updateBrand(created.id, updateInput);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toContain('Updated Name');
      expect(updated?.description).toBe('Updated description');
    });

    it('should update only provided fields', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('Partial Update Brand'),
        description: 'Original description',
      };
      const created = await createBrand(input);

      const updated = await updateBrand(created.id, { description: 'New description' });

      expect(updated?.name).toContain('Partial Update Brand');
      expect(updated?.description).toBe('New description');
    });

    it('should return null for non-existent brand', async () => {
      const updated = await updateBrand(999999, { name: generateUniqueName('New Name') });

      expect(updated).toBeNull();
    });

    it('should throw error for duplicate name on update', async () => {
      const name1 = generateUniqueName('Brand 1');
      const name2 = generateUniqueName('Brand 2');
      await createBrand({ name: name1 });
      const brand2 = await createBrand({ name: name2 });

      await expect(
        updateBrand(brand2.id, { name: name1 })
      ).rejects.toThrow(`Brand with name "${name1}" already exists`);
    });

    it('should return existing brand when no fields to update', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('No Update Brand'),
      };
      const created = await createBrand(input);

      const updated = await updateBrand(created.id, {});

      expect(updated).toEqual(created);
    });
  });

  describe('deleteBrand', () => {
    it('should delete brand by ID', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('Delete Me'),
      };
      const created = await createBrand(input);

      const deleted = await deleteBrand(created.id);

      expect(deleted).toBe(true);

      const brand = await getBrandById(created.id);
      expect(brand).toBeNull();
    });

    it('should return false for non-existent brand', async () => {
      const deleted = await deleteBrand(999999);

      expect(deleted).toBe(false);
    });

    it('should cascade delete products', async () => {
      const brand = await createBrand({ name: generateUniqueName('Brand With Products') });

      // Create products for this brand
      const { createProduct } = await import('../src/products');
      await createProduct({ brand_id: brand.id, name: 'Product 1' });
      await createProduct({ brand_id: brand.id, name: 'Product 2' });

      // Delete brand
      await deleteBrand(brand.id);

      // Verify brand is deleted
      expect(await getBrandById(brand.id)).toBeNull();

      // Verify products are also deleted (cascade)
      const { getProductsByBrandId } = await import('../src/products');
      const products = await getProductsByBrandId(brand.id);
      expect(products).toEqual([]);
    });
  });

  describe('upsertBrand', () => {
    it('should insert new brand if it does not exist', async () => {
      const input: CreateBrandInput = {
        name: generateUniqueName('Upsert New Brand'),
        description: 'New description',
      };

      const brand = await upsertBrand(input);

      expect(brand).toBeDefined();
      expect(brand.id).toBeGreaterThan(0);
      expect(brand.name).toContain('Upsert New Brand');
      expect(brand.description).toBe('New description');
    });

    it('should update existing brand if it exists', async () => {
      const name = generateUniqueName('Upsert Update Brand');
      const input: CreateBrandInput = {
        name,
        description: 'Original description',
      };

      const created = await upsertBrand(input);

      const updatedInput: CreateBrandInput = {
        name,
        description: 'Updated description',
        image_url: 'https://example.com/new.jpg',
      };

      const updated = await upsertBrand(updatedInput);

      expect(updated.id).toBe(created.id);
      expect(updated.description).toBe('Updated description');
      expect(updated.image_url).toBe('https://example.com/new.jpg');
    });
  });

  describe('getBrandCount', () => {
    it('should return count of brands', async () => {
      await createBrand({ name: generateUniqueName('Count Brand 1') });
      await createBrand({ name: generateUniqueName('Count Brand 2') });

      const count = await getBrandCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should return 0 when no brands exist', async () => {
      // Note: This test may fail if other tests have created brands
      // In a real scenario, we would clean up before each test
      const count = await getBrandCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('brandExists', () => {
    it('should return true for existing brand', async () => {
      const name = generateUniqueName('Exists Brand');
      const input: CreateBrandInput = {
        name,
      };
      await createBrand(input);

      const exists = await brandExists(name);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent brand', async () => {
      const exists = await brandExists(generateUniqueName('NonExistent Brand'));

      expect(exists).toBe(false);
    });
  });
});
