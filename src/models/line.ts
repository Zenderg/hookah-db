/**
 * Product line data model
 * Represents a collection of tobacco flavors under a specific line
 */
export interface Line {
  slug: string;
  name: string;
  description: string | null;
  strength: string | null;
  status: string;
  flavorsCount: number;
  rating: number;
  brandSlug: string;
}
