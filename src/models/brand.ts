import { Line } from './line';
import { Flavor } from './flavor';

/**
 * Brand data model
 * Represents a hookah tobacco brand with all its properties
 */
export interface Brand {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  country: string;
  website: string | null;
  foundedYear: number | null;
  status: string;
  imageUrl: string | null;
  rating: number;
  ratingsCount: number;
  reviewsCount: number;
  viewsCount: number;
  lines: Line[];
  flavors: Flavor[];
}
