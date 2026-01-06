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
