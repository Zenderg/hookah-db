import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import type { Brand, Flavor } from '@hookah-db/types';
import { LoggerFactory } from '@hookah-db/utils';
import type { DatabaseStats } from './types';

/**
 * JSON reviver function to convert date strings to Date objects
 * @param key - The property key being parsed
 * @param value - The property value being parsed
 * @returns The value, converted to Date if it's a date field
 */
function dateReviver(key: string, value: any): any {
  // Check if this is a date field
  if (key === 'dateAdded') {
    // Handle null or undefined
    if (value === null || value === undefined) {
      return value;
    }
    
    // If it's already a Date object, return it
    if (value instanceof Date) {
      return value;
    }
    
    // Convert string to Date object
    const date = new Date(value);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Return original value if date is invalid
      return value;
    }
    
    return date;
  }
  
  return value;
}

/**
 * SQLiteDatabase class for managing SQLite database operations
 * Provides synchronous CRUD operations for Brand and Flavor data
 */
export class SQLiteDatabase {
  private db: Database.Database;
  private logger: ReturnType<typeof LoggerFactory.createDevelopmentLogger>;

  /**
   * Create a new SQLiteDatabase instance
   * @param dbPath - Path to SQLite database file (default: './hookah-db.db')
   */
  constructor(dbPath: string = './hookah-db.db') {
    this.logger = LoggerFactory.createDevelopmentLogger('SQLiteDatabase');
    
    try {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(dbPath);
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      
      // Initialize database schema
      this.initializeSchema();
      
      this.logger.info(`Database initialized at ${dbPath}`);
    } catch (error) {
      this.logger.error('Failed to initialize database');
      throw error;
    }
  }

  /**
   * Initialize database schema with tables and indexes
   */
  private initializeSchema(): void {
    try {
      // Create brands table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS brands (
          slug TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // Create flavors table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS flavors (
          slug TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // Create indexes for flavors
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_flavors_brand 
        ON flavors(json_extract(data, '$.brandSlug'));
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_flavors_rating 
        ON flavors(json_extract(data, '$.rating'));
      `);

      this.logger.debug('Database schema initialized');
    } catch (error) {
      this.logger.error('Failed to initialize database schema');
      throw error;
    }
  }

  /**
   * Get a brand by slug
   * @param slug - Brand slug
   * @returns Brand object or null if not found
   */
  getBrand(slug: string): Brand | null {
    try {
      const stmt = this.db.prepare('SELECT data FROM brands WHERE slug = ?');
      const row = stmt.get(slug) as { data: string } | undefined;

      if (!row) {
        return null;
      }

      return JSON.parse(row.data, dateReviver) as Brand;
    } catch (error) {
      this.logger.error(`Failed to get brand: ${slug}`);
      return null;
    }
  }

  /**
   * Save or update a brand
   * @param brand - Brand object to save
   */
  setBrand(brand: Brand): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO brands (slug, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
      `);

      stmt.run(brand.slug, JSON.stringify(brand), Date.now());
      this.logger.debug(`Brand saved: ${brand.slug}`);
    } catch (error) {
      this.logger.error(`Failed to save brand: ${brand.slug}`);
      throw error;
    }
  }

  /**
   * Get all brands
   * @returns Array of all brands
   */
  getAllBrands(): Brand[] {
    try {
      const stmt = this.db.prepare('SELECT data FROM brands ORDER BY slug');
      const rows = stmt.all() as { data: string }[];

      return rows.map(row => JSON.parse(row.data, dateReviver) as Brand);
    } catch (error) {
      this.logger.error('Failed to get all brands');
      return [];
    }
  }

  /**
   * Search brands by name or English name
   * @param searchQuery - Optional search query string
   * @returns Array of brands matching the search query
   */
  async searchBrands(searchQuery?: string): Promise<Brand[]> {
    try {
      // If no search query provided, return all brands
      if (!searchQuery || searchQuery.trim() === '') {
        return this.getAllBrands();
      }

      // Use LIKE operator to search in both name and nameEn fields
      const stmt = this.db.prepare(`
        SELECT data FROM brands 
        WHERE json_extract(data, '$.name') LIKE ? 
           OR json_extract(data, '$.nameEn') LIKE ?
        ORDER BY json_extract(data, '$.name') ASC
      `);

      const searchPattern = `%${searchQuery}%`;
      const rows = stmt.all(searchPattern, searchPattern) as { data: string }[];

      return rows.map(row => JSON.parse(row.data, dateReviver) as Brand);
    } catch (error) {
      this.logger.error(`Failed to search brands: ${searchQuery}`);
      return [];
    }
  }

  /**
   * Delete a brand by slug
   * @param slug - Brand slug to delete
   */
  deleteBrand(slug: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM brands WHERE slug = ?');
      stmt.run(slug);
      this.logger.debug(`Brand deleted: ${slug}`);
    } catch (error) {
      this.logger.error(`Failed to delete brand: ${slug}`);
      throw error;
    }
  }

  /**
   * Check if a brand exists
   * @param slug - Brand slug to check
   * @returns True if brand exists, false otherwise
   */
  brandExists(slug: string): boolean {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM brands WHERE slug = ?');
      const row = stmt.get(slug);
      return row !== undefined;
    } catch (error) {
      this.logger.error(`Failed to check brand existence: ${slug}`);
      return false;
    }
  }

  /**
   * Get a flavor by slug
   * @param slug - Flavor slug
   * @returns Flavor object or null if not found
   */
  getFlavor(slug: string): Flavor | null {
    try {
      const stmt = this.db.prepare('SELECT data FROM flavors WHERE slug = ?');
      const row = stmt.get(slug) as { data: string } | undefined;

      if (!row) {
        return null;
      }

      return JSON.parse(row.data, dateReviver) as Flavor;
    } catch (error) {
      this.logger.error(`Failed to get flavor: ${slug}`);
      return null;
    }
  }

  /**
   * Save or update a flavor
   * @param flavor - Flavor object to save
   */
  setFlavor(flavor: Flavor): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO flavors (slug, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
      `);

      stmt.run(flavor.slug, JSON.stringify(flavor), Date.now());
      this.logger.debug(`Flavor saved: ${flavor.slug}`);
    } catch (error) {
      this.logger.error(`Failed to save flavor: ${flavor.slug}`);
      throw error;
    }
  }

  /**
   * Get all flavors
   * @returns Array of all flavors
   */
  getAllFlavors(): Flavor[] {
    try {
      const stmt = this.db.prepare('SELECT data FROM flavors ORDER BY slug');
      const rows = stmt.all() as { data: string }[];

      return rows.map(row => JSON.parse(row.data, dateReviver) as Flavor);
    } catch (error) {
      this.logger.error('Failed to get all flavors');
      return [];
    }
  }

  /**
   * Search flavors by name or alternative name
   * @param searchQuery - Optional search query string
   * @returns Array of flavors matching the search query
   */
  async searchFlavors(searchQuery?: string): Promise<Flavor[]> {
    try {
      // If no search query provided, return all flavors
      if (!searchQuery || searchQuery.trim() === '') {
        return this.getAllFlavors();
      }

      // Use LIKE operator to search in both name and nameAlt fields
      const stmt = this.db.prepare(`
        SELECT data FROM flavors 
        WHERE json_extract(data, '$.name') LIKE ? 
           OR json_extract(data, '$.nameAlt') LIKE ?
        ORDER BY json_extract(data, '$.name') ASC
      `);

      const searchPattern = `%${searchQuery}%`;
      const rows = stmt.all(searchPattern, searchPattern) as { data: string }[];

      return rows.map(row => JSON.parse(row.data, dateReviver) as Flavor);
    } catch (error) {
      this.logger.error(`Failed to search flavors: ${searchQuery}`);
      return [];
    }
  }

  /**
   * Get flavors by brand slug
   * @param brandSlug - Brand slug to filter flavors
   * @returns Array of flavors for specified brand
   */
  getFlavorsByBrand(brandSlug: string): Flavor[] {
    try {
      const stmt = this.db.prepare(`
        SELECT data FROM flavors 
        WHERE json_extract(data, '$.brandSlug') = ?
        ORDER BY slug
      `);
      const rows = stmt.all(brandSlug) as { data: string }[];

      return rows.map(row => JSON.parse(row.data, dateReviver) as Flavor);
    } catch (error) {
      this.logger.error(`Failed to get flavors for brand: ${brandSlug}`);
      return [];
    }
  }

  /**
   * Delete a flavor by slug
   * @param slug - Flavor slug to delete
   */
  deleteFlavor(slug: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM flavors WHERE slug = ?');
      stmt.run(slug);
      this.logger.debug(`Flavor deleted: ${slug}`);
    } catch (error) {
      this.logger.error(`Failed to delete flavor: ${slug}`);
      throw error;
    }
  }

  /**
   * Check if a flavor exists
   * @param slug - Flavor slug to check
   * @returns True if flavor exists, false otherwise
   */
  flavorExists(slug: string): boolean {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM flavors WHERE slug = ?');
      const row = stmt.get(slug);
      return row !== undefined;
    } catch (error) {
      this.logger.error(`Failed to check flavor existence: ${slug}`);
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns Database statistics including counts and file size
   */
  getStats(): DatabaseStats {
    try {
      const brandsCount = this.db.prepare('SELECT COUNT(*) as count FROM brands').get() as { count: number };
      const flavorsCount = this.db.prepare('SELECT COUNT(*) as count FROM flavors').get() as { count: number };
      
      // Get database file size
      const dbPath = this.db.name;
      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = stats.size;
      }

      return {
        brandsCount: brandsCount.count,
        flavorsCount: flavorsCount.count,
        dbSize,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats');
      return {
        brandsCount: 0,
        flavorsCount: 0,
        dbSize: 0,
      };
    }
  }

  /**
   * Create a backup of database
   * @param backupPath - Path where backup should be saved
   */
  backup(backupPath: string): void {
    try {
      // Create backup directory if it doesn't exist
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Close database to ensure all data is flushed
      this.db.close();

      // Copy database file
      const dbPath = this.db.name;
      fs.copyFileSync(dbPath, backupPath);

      // Reopen database
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');

      this.logger.info(`Database backup created at ${backupPath}`);
    } catch (error) {
      this.logger.error(`Failed to create backup: ${backupPath}`);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    try {
      this.db.close();
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Failed to close database connection');
      throw error;
    }
  }
}
