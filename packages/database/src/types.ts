/**
 * Database statistics interface
 */
export interface DatabaseStats {
  /** Number of brands in the database */
  brandsCount: number;
  /** Number of flavors in the database */
  flavorsCount: number;
  /** Size of the database file in bytes */
  dbSize: number;
}

/**
 * Database interface defining all database operations
 */
export interface IDatabase {
  // Brand operations
  getBrand(slug: string): any | null;
  setBrand(brand: any): void;
  getAllBrands(): any[];
  deleteBrand(slug: string): void;
  brandExists(slug: string): boolean;
  searchBrands(searchQuery?: string): Promise<any[]>;

  // Flavor operations
  getFlavor(slug: string): any | null;
  setFlavor(flavor: any): void;
  getAllFlavors(): any[];
  getFlavorsByBrand(brandSlug: string): any[];
  deleteFlavor(slug: string): void;
  flavorExists(slug: string): boolean;
  searchFlavors(searchQuery?: string): Promise<any[]>;

  // Database operations
  getStats(): DatabaseStats;
  backup(backupPath: string): void;
  close(): void;
}
