import { RatingDistribution } from './rating';

/**
 * Flavor data model
 * Represents a single hookah tobacco flavor with all its properties
 */
export interface Flavor {
  slug: string;
  name: string;
  nameAlt: string | null;
  description: string;
  brandSlug: string;
  brandName: string;
  lineSlug: string | null;
  lineName: string | null;
  country: string;
  officialStrength: string | null;
  userStrength: string | null;
  status: string;
  imageUrl: string | null;
  tags: string[];
  rating: number;
  ratingsCount: number;
  reviewsCount: number;
  viewsCount: number;
  ratingDistribution: RatingDistribution;
  smokeAgainPercentage: number;
  htreviewsId: number;
  dateAdded: Date;
  addedBy: string;
}
