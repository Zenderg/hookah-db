/**
 * Tests for Product CRUD Operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProduct,
  getProductById,
  getProductsByBrandId,
  getAllProducts,
  searchProductsByName,
  updateProduct,
  deleteProduct,
  upsertProduct,
  getProductCount,
  getProductCountByBrandId,
  productExists,
} from '../src/products';
import { createBrand, deleteBrand } from '../src/brands';
import type { CreateProductInput, UpdateProductInput } from '../src/types';

/**
 * Generate a unique name for test data to avoid conflicts
 */
function generateUniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

describe('Product CRUD Operations', () => {
  let testBrandId: number;

  beforeEach(async () => {
    const brand = await createBrand({ name: generateUniqueName('Test Brand for Products') });
    testBrandId = brand.id;
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Test Product'),
        description: 'A test product',
        image_url: 'https://example.com/product.jpg',
        source_url: 'https://example.com/product',
      };

      const product = await createProduct(input);

      expect(product).toBeDefined();
      expect(product.id).toBeGreaterThan(0);
      expect(product.brand_id).toBe(testBrandId);
      expect(product.name).toContain('Test Product');
      expect(product.description).toBe('A test product');
      expect(product.image_url).toBe('https://example.com/product.jpg');
      expect(product.source_url).toBe('https://example.com/product');
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });

    it('should create a product with minimal fields', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Minimal Product'),
      };

      const product = await createProduct(input);

      expect(product).toBeDefined();
      expect(product.id).toBeGreaterThan(0);
      expect(product.brand_id).toBe(testBrandId);
      expect(product.name).toContain('Minimal Product');
      expect(product.description).toBeNull();
      expect(product.image_url).toBeNull();
      expect(product.source_url).toBeNull();
    });

    it('should throw error for non-existent brand', async () => {
      const input: CreateProductInput = {
        brand_id: 999999,
        name: generateUniqueName('Invalid Product'),
      };

      await expect(createProduct(input)).rejects.toThrow('Brand with ID 999999 does not exist');
    });

    it('should throw error for duplicate product name within brand', async () => {
      const name = generateUniqueName('Duplicate Product');
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name,
      };

      await createProduct(input);

      await expect(createProduct(input)).rejects.toThrow(
        `Product with name "${name}" already exists`
      );
    });
  });

  describe('getProductById', () => {
    it('should return product by ID', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Get By ID Product'),
      };
      const created = await createProduct(input);

      const product = await getProductById(created.id);

      expect(product).toBeDefined();
      expect(product?.id).toBe(created.id);
      expect(product?.name).toContain('Get By ID Product');
      expect(product?.brand_id).toBe(testBrandId);
    });

    it('should return null for non-existent product', async () => {
      const product = await getProductById(999999);

      expect(product).toBeNull();
    });
  });

  describe('getProductsByBrandId', () => {
    beforeEach(async () => {
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Product A') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Product B') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Product C') });
    });

    it('should return all products for a brand', async () => {
      const products = await getProductsByBrandId(testBrandId);

      expect(products.length).toBeGreaterThanOrEqual(3);
      expect(products.every(p => p.brand_id === testBrandId)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const products = await getProductsByBrandId(testBrandId, 2);

      expect(products.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset parameter', async () => {
      const products1 = await getProductsByBrandId(testBrandId, 10, 0);
      const products2 = await getProductsByBrandId(testBrandId, 10, 2);

      expect(products2.length).toBeLessThanOrEqual(products1.length);
    });

    it('should return products ordered by name', async () => {
      const products = await getProductsByBrandId(testBrandId);
      const names = products.map(p => p.name);

      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('getAllProducts', () => {
    beforeEach(async () => {
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Product 1') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Product 2') });
    });

    it('should return all products', async () => {
      const products = await getAllProducts();

      expect(products.length).toBeGreaterThanOrEqual(2);
      expect(products.every(p => p.id && p.name && p.brand_id)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const products = await getAllProducts(1);

      expect(products.length).toBeLessThanOrEqual(1);
    });

    it('should respect offset parameter', async () => {
      const products1 = await getAllProducts(10, 0);
      const products2 = await getAllProducts(10, 1);

      expect(products2.length).toBeLessThanOrEqual(products1.length);
    });
  });

  describe('searchProductsByName', () => {
    beforeEach(async () => {
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Mint Flavor') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Apple Mint') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Watermelon') });
    });

    it('should find products by partial name match (case-insensitive)', async () => {
      const products = await searchProductsByName('Mint');

      expect(products.length).toBeGreaterThanOrEqual(2);
      expect(products.some(p => p.name.toLowerCase().includes('mint'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const products = await searchProductsByName('NonExistent');

      expect(products).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const products = await searchProductsByName('Mint', 1);

      expect(products.length).toBeLessThanOrEqual(1);
    });
  });

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Original Product Name'),
      };
      const created = await createProduct(input);

      const updateInput: UpdateProductInput = {
        name: generateUniqueName('Updated Product Name'),
        description: 'Updated description',
      };

      const updated = await updateProduct(created.id, updateInput);

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toContain('Updated Product Name');
      expect(updated?.description).toBe('Updated description');
    });

    it('should update only provided fields', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Partial Update Product'),
        description: 'Original description',
      };
      const created = await createProduct(input);

      const updated = await updateProduct(created.id, { description: 'New description' });

      expect(updated?.name).toContain('Partial Update Product');
      expect(updated?.description).toBe('New description');
    });

    it('should return null for non-existent product', async () => {
      const updated = await updateProduct(999999, { name: generateUniqueName('New Name') });

      expect(updated).toBeNull();
    });

    it('should throw error for duplicate name within brand', async () => {
      const name1 = generateUniqueName('Product 1');
      const name2 = generateUniqueName('Product 2');
      await createProduct({ brand_id: testBrandId, name: name1 });
      const product2 = await createProduct({ brand_id: testBrandId, name: name2 });

      await expect(
        updateProduct(product2.id, { name: name1 })
      ).rejects.toThrow(`Product with name "${name1}" already exists`);
    });

    it('should throw error for invalid brand_id', async () => {
      const product = await createProduct({ brand_id: testBrandId, name: generateUniqueName('Test Product') });

      await expect(
        updateProduct(product.id, { brand_id: 999999 })
      ).rejects.toThrow('Brand with ID 999999 does not exist');
    });

    it('should return existing product when no fields to update', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('No Update Product'),
      };
      const created = await createProduct(input);

      const updated = await updateProduct(created.id, {});

      expect(updated).toEqual(created);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product by ID', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Delete Me'),
      };
      const created = await createProduct(input);

      const deleted = await deleteProduct(created.id);

      expect(deleted).toBe(true);

      const product = await getProductById(created.id);
      expect(product).toBeNull();
    });

    it('should return false for non-existent product', async () => {
      const deleted = await deleteProduct(999999);

      expect(deleted).toBe(false);
    });
  });

  describe('upsertProduct', () => {
    it('should insert new product if it does not exist', async () => {
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name: generateUniqueName('Upsert New Product'),
        description: 'New description',
      };

      const product = await upsertProduct(input);

      expect(product).toBeDefined();
      expect(product.id).toBeGreaterThan(0);
      expect(product.name).toContain('Upsert New Product');
      expect(product.description).toBe('New description');
    });

    it('should update existing product if it exists', async () => {
      const name = generateUniqueName('Upsert Update Product');
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name,
        description: 'Original description',
      };

      const created = await upsertProduct(input);

      const updatedInput: CreateProductInput = {
        brand_id: testBrandId,
        name,
        description: 'Updated description',
        image_url: 'https://example.com/new.jpg',
      };

      const updated = await upsertProduct(updatedInput);

      expect(updated.id).toBe(created.id);
      expect(updated.description).toBe('Updated description');
      expect(updated.image_url).toBe('https://example.com/new.jpg');
    });

    it('should throw error for non-existent brand', async () => {
      const input: CreateProductInput = {
        brand_id: 999999,
        name: generateUniqueName('Invalid Product'),
      };

      await expect(upsertProduct(input)).rejects.toThrow('Brand with ID 999999 does not exist');
    });
  });

  describe('getProductCount', () => {
    it('should return count of products', async () => {
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Count Product 1') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Count Product 2') });

      const count = await getProductCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getProductCountByBrandId', () => {
    it('should return count of products for a brand', async () => {
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Brand Count Product 1') });
      await createProduct({ brand_id: testBrandId, name: generateUniqueName('Brand Count Product 2') });

      const count = await getProductCountByBrandId(testBrandId);

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should return 0 for brand with no products', async () => {
      const brand = await createBrand({ name: generateUniqueName('Empty Brand') });
      const count = await getProductCountByBrandId(brand.id);

      expect(count).toBe(0);
    });
  });

  describe('productExists', () => {
    it('should return true for existing product', async () => {
      const name = generateUniqueName('Exists Product');
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name,
      };
      await createProduct(input);

      const exists = await productExists(testBrandId, name);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent product', async () => {
      const exists = await productExists(testBrandId, generateUniqueName('NonExistent Product'));

      expect(exists).toBe(false);
    });

    it('should return false for wrong brand', async () => {
      const name = generateUniqueName('Brand Check Product');
      const input: CreateProductInput = {
        brand_id: testBrandId,
        name,
      };
      await createProduct(input);

      const exists = await productExists(999999, name);

      expect(exists).toBe(false);
    });
  });
});
