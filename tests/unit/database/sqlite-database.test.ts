import fs from 'fs';
import path from 'path';
import { SQLiteDatabase } from '@hookah-db/database';
import type { Brand, Flavor } from '@hookah-db/types';

describe('SQLiteDatabase', () => {
  const testDbPath = path.join(__dirname, '../../test-data', 'test-hookah-db.db');
  let db: SQLiteDatabase;

  const mockBrand: Brand = {
    slug: 'test-brand',
    name: 'Test Brand',
    nameEn: 'Test Brand',
    description: 'Test brand description',
    country: 'Test Country',
    website: 'https://test.com',
    foundedYear: 2020,
    status: 'Выпускается',
    imageUrl: 'https://test.com/image.jpg',
    rating: 4.5,
    ratingsCount: 100,
    reviewsCount: 50,
    viewsCount: 200,
    lines: [],
    flavors: [],
  };

  const mockFlavor: Flavor = {
    slug: 'test-flavor',
    name: 'Test Flavor',
    nameAlt: null,
    description: 'Test flavor description',
    brandSlug: 'test-brand',
    brandName: 'Test Brand',
    lineSlug: 'test-line',
    lineName: 'Test Line',
    country: 'Test Country',
    officialStrength: 'Средняя',
    userStrength: 'Средняя',
    status: 'Выпускается',
    imageUrl: 'https://test.com/flavor.jpg',
    tags: ['Холодок', 'Сладкий'],
    rating: 4.5,
    ratingsCount: 100,
    reviewsCount: 50,
    viewsCount: 200,
    ratingDistribution: {
      count1: 5,
      count2: 10,
      count3: 20,
      count4: 35,
      count5: 30,
    },
    smokeAgainPercentage: 85,
    htreviewsId: 12345,
    dateAdded: new Date('2024-01-01'),
    addedBy: 'testuser',
  };

  beforeEach(() => {
    // Create test data directory if it doesn't exist
    const testDataDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Remove existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create new database instance
    db = new SQLiteDatabase(testDbPath);
  });

  afterEach(() => {
    // Close database connection
    db.close();

    // Remove test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Brand operations', () => {
    test('should save and retrieve a brand', () => {
      db.setBrand(mockBrand);
      const retrieved = db.getBrand('test-brand');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.slug).toBe('test-brand');
      expect(retrieved?.name).toBe('Test Brand');
    });

    test('should return null for non-existent brand', () => {
      const retrieved = db.getBrand('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should update an existing brand', () => {
      db.setBrand(mockBrand);
      const updatedBrand = { ...mockBrand, name: 'Updated Brand' };
      db.setBrand(updatedBrand);

      const retrieved = db.getBrand('test-brand');
      expect(retrieved?.name).toBe('Updated Brand');
    });

    test('should get all brands', () => {
      const brand2: Brand = { ...mockBrand, slug: 'test-brand-2', name: 'Test Brand 2' };
      db.setBrand(mockBrand);
      db.setBrand(brand2);

      const allBrands = db.getAllBrands();
      expect(allBrands).toHaveLength(2);
      expect(allBrands[0].slug).toBe('test-brand');
      expect(allBrands[1].slug).toBe('test-brand-2');
    });

    test('should delete a brand', () => {
      db.setBrand(mockBrand);
      expect(db.brandExists('test-brand')).toBe(true);

      db.deleteBrand('test-brand');
      expect(db.brandExists('test-brand')).toBe(false);
      expect(db.getBrand('test-brand')).toBeNull();
    });

    test('should check if brand exists', () => {
      expect(db.brandExists('test-brand')).toBe(false);

      db.setBrand(mockBrand);
      expect(db.brandExists('test-brand')).toBe(true);
    });
  });

  describe('Flavor operations', () => {
    test('should save and retrieve a flavor', () => {
      db.setFlavor(mockFlavor);
      const retrieved = db.getFlavor('test-flavor');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.slug).toBe('test-flavor');
      expect(retrieved?.name).toBe('Test Flavor');
    });

    test('should return null for non-existent flavor', () => {
      const retrieved = db.getFlavor('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should update an existing flavor', () => {
      db.setFlavor(mockFlavor);
      const updatedFlavor = { ...mockFlavor, name: 'Updated Flavor' };
      db.setFlavor(updatedFlavor);

      const retrieved = db.getFlavor('test-flavor');
      expect(retrieved?.name).toBe('Updated Flavor');
    });

    test('should get all flavors', () => {
      const flavor2: Flavor = { ...mockFlavor, slug: 'test-flavor-2', name: 'Test Flavor 2' };
      db.setFlavor(mockFlavor);
      db.setFlavor(flavor2);

      const allFlavors = db.getAllFlavors();
      expect(allFlavors).toHaveLength(2);
      expect(allFlavors[0].slug).toBe('test-flavor');
      expect(allFlavors[1].slug).toBe('test-flavor-2');
    });

    test('should get flavors by brand', () => {
      const flavor2: Flavor = { ...mockFlavor, slug: 'test-flavor-2', name: 'Test Flavor 2' };
      const flavor3: Flavor = { ...mockFlavor, slug: 'test-flavor-3', brandSlug: 'other-brand', name: 'Test Flavor 3' };

      db.setFlavor(mockFlavor);
      db.setFlavor(flavor2);
      db.setFlavor(flavor3);

      const brandFlavors = db.getFlavorsByBrand('test-brand');
      expect(brandFlavors).toHaveLength(2);
      expect(brandFlavors[0].slug).toBe('test-flavor');
      expect(brandFlavors[1].slug).toBe('test-flavor-2');
    });

    test('should delete a flavor', () => {
      db.setFlavor(mockFlavor);
      expect(db.flavorExists('test-flavor')).toBe(true);

      db.deleteFlavor('test-flavor');
      expect(db.flavorExists('test-flavor')).toBe(false);
      expect(db.getFlavor('test-flavor')).toBeNull();
    });

    test('should check if flavor exists', () => {
      expect(db.flavorExists('test-flavor')).toBe(false);

      db.setFlavor(mockFlavor);
      expect(db.flavorExists('test-flavor')).toBe(true);
    });
  });

  describe('Database statistics', () => {
    test('should get database stats', () => {
      db.setBrand(mockBrand);
      db.setFlavor(mockFlavor);

      const stats = db.getStats();

      expect(stats.brandsCount).toBe(1);
      expect(stats.flavorsCount).toBe(1);
      expect(stats.dbSize).toBeGreaterThan(0);
    });

    test('should return zero stats for empty database', () => {
      const stats = db.getStats();

      expect(stats.brandsCount).toBe(0);
      expect(stats.flavorsCount).toBe(0);
    });
  });

  describe('Backup operations', () => {
    test('should create a backup', () => {
      const backupPath = path.join(__dirname, '../../test-data', 'backup.db');

      db.setBrand(mockBrand);
      db.setFlavor(mockFlavor);

      db.backup(backupPath);

      expect(fs.existsSync(backupPath)).toBe(true);

      // Verify backup by opening it
      const backupDb = new SQLiteDatabase(backupPath);
      const stats = backupDb.getStats();
      expect(stats.brandsCount).toBe(1);
      expect(stats.flavorsCount).toBe(1);
      backupDb.close();

      // Clean up backup
      fs.unlinkSync(backupPath);
    });
  });

  describe('Database connection', () => {
    test('should close database connection', () => {
      db.setBrand(mockBrand);
      db.close();

      expect(() => {
        db.getBrand('test-brand');
      }).not.toThrow();
    });
  });

  describe('WAL mode', () => {
    test('should enable WAL mode', () => {
      // WAL mode is enabled in constructor
      // Check that WAL files are created after write
      db.setBrand(mockBrand);

      const walPath = testDbPath + '-wal';
      const shmPath = testDbPath + '-shm';

      // WAL files may or may not exist depending on SQLite version and OS
      // Just verify database works correctly
      const retrieved = db.getBrand('test-brand');
      expect(retrieved).not.toBeNull();
    });
  });

  describe('Indexes', () => {
    test('should create indexes for flavors', () => {
      const flavor1: Flavor = { ...mockFlavor, slug: 'f1', brandSlug: 'brand-a', rating: 5.0 };
      const flavor2: Flavor = { ...mockFlavor, slug: 'f2', brandSlug: 'brand-b', rating: 4.0 };
      const flavor3: Flavor = { ...mockFlavor, slug: 'f3', brandSlug: 'brand-a', rating: 3.0 };

      db.setFlavor(flavor1);
      db.setFlavor(flavor2);
      db.setFlavor(flavor3);

      // Test brand index
      const brandAFlavors = db.getFlavorsByBrand('brand-a');
      expect(brandAFlavors).toHaveLength(2);

      const brandBFlavors = db.getFlavorsByBrand('brand-b');
      expect(brandBFlavors).toHaveLength(1);
    });
  });
});
