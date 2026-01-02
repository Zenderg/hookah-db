/**
 * Data Normalization Module
 *
 * Provides functions to normalize and validate parsed data from HTML parsing.
 * Transforms raw parsed data into a clean, standardized format ready for storage.
 *
 * @module data-normalizer
 */

import { URL } from 'url';

import type {
  ParsedBrand,
  ParsedProduct,
  ParsedBrandDetail,
  ParsedProductDetail,
  NormalizedBrand,
  NormalizedProduct,
  NormalizedBrandDetail,
  NormalizedProductDetail,
  ValidationResult,
} from './types.js';

/**
 * Maximum allowed length for text fields
 */
const MAX_TEXT_LENGTH = 10000;

/**
 * Maximum allowed length for name fields
 */
const MAX_NAME_LENGTH = 500;

/**
 * Maximum allowed length for URL fields
 */
const MAX_URL_LENGTH = 2000;

/**
 * Clean text by removing extra whitespace, normalizing line breaks, and handling empty strings
 *
 * @param text - Text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }

  // Remove leading/trailing whitespace
  let cleaned = text.trim();

  // Normalize line breaks to single spaces
  cleaned = cleaned.replace(/[\r\n]+/g, ' ');

  // Remove extra whitespace (multiple spaces become single space)
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove leading/trailing whitespace again after normalization
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Normalize URL by handling relative URLs, removing unnecessary query parameters,
 * and handling malformed URLs gracefully
 *
 * @param url - URL to normalize
 * @param baseUrl - Base URL for resolving relative URLs (optional)
 * @returns Normalized absolute URL, or null if invalid
 */
export function normalizeUrl(url: string | null | undefined, baseUrl?: string): string | null {
  if (!url || url.trim() === '') {
    return null;
  }

  try {
    // If it's already an absolute URL, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      // Remove common tracking/query parameters that aren't needed
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('utm_campaign');
      urlObj.searchParams.delete('utm_term');
      urlObj.searchParams.delete('utm_content');
      urlObj.searchParams.delete('fbclid');
      urlObj.searchParams.delete('gclid');
      return urlObj.toString();
    }

    // If no base URL provided, assume it's relative to htreviews.org
    const base = baseUrl ?? 'https://htreviews.org';
    const absoluteUrl = new URL(url, base);
    
    // Remove common tracking/query parameters
    absoluteUrl.searchParams.delete('utm_source');
    absoluteUrl.searchParams.delete('utm_medium');
    absoluteUrl.searchParams.delete('utm_campaign');
    absoluteUrl.searchParams.delete('utm_term');
    absoluteUrl.searchParams.delete('utm_content');
    absoluteUrl.searchParams.delete('fbclid');
    absoluteUrl.searchParams.delete('gclid');
    
    return absoluteUrl.toString();
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`, error);
    return null;
  }
}

/**
 * Generate a slug from a name
 *
 * @param name - Name to generate slug from
 * @returns Generated slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract slug from URL
 *
 * @param url - URL to extract slug from
 * @returns Extracted slug, or null if not found
 */
function extractSlugFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Return the last path segment as the slug
    return pathParts.length > 0 ? pathParts[pathParts.length - 1]! : null;
  } catch (error) {
    console.warn(`Failed to extract slug from URL: ${url}`, error);
    return null;
  }
}

/**
 * Get current ISO 8601 timestamp
 *
 * @returns Current timestamp in ISO 8601 format
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @returns Validation error message, or null if valid
 */
function validateUrl(url: string | undefined, fieldName: string): string | null {
  if (!url) {
    return null; // URL is optional
  }

  if (url.length > MAX_URL_LENGTH) {
    return `${fieldName} exceeds maximum length of ${MAX_URL_LENGTH} characters`;
  }

  try {
    new URL(url);
    return null;
  } catch (error) {
    return `${fieldName} is not a valid URL`;
  }
}

/**
 * Validate text field
 *
 * @param value - Text value to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @param maxLength - Maximum allowed length
 * @param required - Whether the field is required
 * @returns Validation error message, or null if valid
 */
function validateTextField(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
  required: boolean
): string | null {
  if (required && (!value || value.trim() === '')) {
    return `${fieldName} is required and cannot be empty`;
  }

  if (value && value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }

  return null;
}

/**
 * Normalize brand data from parsed format to normalized format
 *
 * @param parsedBrand - Parsed brand data
 * @returns Normalized brand data
 */
export function normalizeBrandData(parsedBrand: ParsedBrand): NormalizedBrand {
  const name = cleanText(parsedBrand.name);
  const description = parsedBrand.description ? cleanText(parsedBrand.description) : undefined;
  const imageUrl = normalizeUrl(parsedBrand.imageUrl);
  const sourceUrl = normalizeUrl(parsedBrand.sourceUrl) ?? '';
  
  // Extract slug from source URL, or generate from name
  const slug = extractSlugFromUrl(sourceUrl) || generateSlug(name);

  return {
    slug,
    name,
    description,
    imageUrl: imageUrl ?? undefined,
    sourceUrl,
    scrapedAt: getCurrentTimestamp(),
  };
}

/**
 * Normalize product data from parsed format to normalized format
 *
 * @param parsedProduct - Parsed product data
 * @returns Normalized product data
 */
export function normalizeProductData(parsedProduct: ParsedProduct): NormalizedProduct {
  const name = cleanText(parsedProduct.name);
  const description = parsedProduct.description ? cleanText(parsedProduct.description) : undefined;
  const imageUrl = normalizeUrl(parsedProduct.imageUrl);
  const sourceUrl = normalizeUrl(parsedProduct.sourceUrl) ?? '';
  const brandSlug = cleanText(parsedProduct.brandSlug);
  
  // Extract slug from source URL, or generate from name
  const slug = extractSlugFromUrl(sourceUrl) || generateSlug(name);

  return {
    slug,
    name,
    description,
    imageUrl: imageUrl ?? undefined,
    sourceUrl,
    brandSlug,
    scrapedAt: getCurrentTimestamp(),
  };
}

/**
 * Normalize brand detail data from parsed format to normalized format
 *
 * @param parsedBrandDetail - Parsed brand detail data
 * @returns Normalized brand detail data
 */
export function normalizeBrandDetailData(parsedBrandDetail: ParsedBrandDetail): NormalizedBrandDetail {
  const name = cleanText(parsedBrandDetail.name);
  const description = parsedBrandDetail.description ? cleanText(parsedBrandDetail.description) : undefined;
  const imageUrl = normalizeUrl(parsedBrandDetail.imageUrl);
  const sourceUrl = normalizeUrl(parsedBrandDetail.sourceUrl) ?? '';
  
  // Extract slug from source URL, or generate from name
  const slug = extractSlugFromUrl(sourceUrl) || generateSlug(name);

  return {
    slug,
    name,
    description,
    imageUrl: imageUrl ?? undefined,
    sourceUrl,
    scrapedAt: getCurrentTimestamp(),
  };
}

/**
 * Normalize product detail data from parsed format to normalized format
 *
 * @param parsedProductDetail - Parsed product detail data
 * @returns Normalized product detail data
 */
export function normalizeProductDetailData(parsedProductDetail: ParsedProductDetail): NormalizedProductDetail {
  const name = cleanText(parsedProductDetail.name);
  const description = parsedProductDetail.description ? cleanText(parsedProductDetail.description) : undefined;
  const imageUrl = normalizeUrl(parsedProductDetail.imageUrl);
  const sourceUrl = normalizeUrl(parsedProductDetail.sourceUrl) ?? '';
  const brandSlug = cleanText(parsedProductDetail.brandSlug);
  
  // Extract slug from source URL, or generate from name
  const slug = extractSlugFromUrl(sourceUrl) || generateSlug(name);

  return {
    slug,
    name,
    description,
    imageUrl: imageUrl ?? undefined,
    sourceUrl,
    brandSlug,
    scrapedAt: getCurrentTimestamp(),
  };
}

/**
 * Validate brand data
 *
 * @param brand - Normalized brand data to validate
 * @returns Validation result with errors if any
 */
export function validateBrandData(brand: NormalizedBrand): ValidationResult {
  const errors: string[] = [];

  // Validate slug
  const slugError = validateTextField(brand.slug, 'slug', MAX_NAME_LENGTH, true);
  if (slugError) {
    errors.push(slugError);
  }

  // Validate name
  const nameError = validateTextField(brand.name, 'name', MAX_NAME_LENGTH, true);
  if (nameError) {
    errors.push(nameError);
  }

  // Validate description (optional)
  const descriptionError = validateTextField(brand.description, 'description', MAX_TEXT_LENGTH, false);
  if (descriptionError) {
    errors.push(descriptionError);
  }

  // Validate image URL (optional)
  const imageUrlError = validateUrl(brand.imageUrl, 'imageUrl');
  if (imageUrlError) {
    errors.push(imageUrlError);
  }

  // Validate source URL (required)
  const sourceUrlError = validateUrl(brand.sourceUrl, 'sourceUrl');
  if (sourceUrlError) {
    errors.push(sourceUrlError);
  }

  // Validate scrapedAt timestamp
  if (!brand.scrapedAt || isNaN(Date.parse(brand.scrapedAt))) {
    errors.push('scrapedAt must be a valid ISO 8601 timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate product data
 *
 * @param product - Normalized product data to validate
 * @returns Validation result with errors if any
 */
export function validateProductData(product: NormalizedProduct): ValidationResult {
  const errors: string[] = [];

  // Validate slug
  const slugError = validateTextField(product.slug, 'slug', MAX_NAME_LENGTH, true);
  if (slugError) {
    errors.push(slugError);
  }

  // Validate name
  const nameError = validateTextField(product.name, 'name', MAX_NAME_LENGTH, true);
  if (nameError) {
    errors.push(nameError);
  }

  // Validate description (optional)
  const descriptionError = validateTextField(product.description, 'description', MAX_TEXT_LENGTH, false);
  if (descriptionError) {
    errors.push(descriptionError);
  }

  // Validate image URL (optional)
  const imageUrlError = validateUrl(product.imageUrl, 'imageUrl');
  if (imageUrlError) {
    errors.push(imageUrlError);
  }

  // Validate source URL (required)
  const sourceUrlError = validateUrl(product.sourceUrl, 'sourceUrl');
  if (sourceUrlError) {
    errors.push(sourceUrlError);
  }

  // Validate brandSlug (required)
  const brandSlugError = validateTextField(product.brandSlug, 'brandSlug', MAX_NAME_LENGTH, true);
  if (brandSlugError) {
    errors.push(brandSlugError);
  }

  // Validate scrapedAt timestamp
  if (!product.scrapedAt || isNaN(Date.parse(product.scrapedAt))) {
    errors.push('scrapedAt must be a valid ISO 8601 timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Log invalid data with error details
 *
 * @param data - Invalid data object
 * @param errors - Array of validation error messages
 */
export function logInvalidData(data: any, errors: string[]): void {
  console.error('Invalid data detected:');
  console.error('Errors:');
  errors.forEach((error, index) => {
    console.error(`  ${index + 1}. ${error}`);
  });
  
  console.error('\nData preview:');
  try {
    // Create a preview of the data (limit to 500 characters)
    const dataPreview = JSON.stringify(data, null, 2);
    const truncatedPreview = dataPreview.length > 500
      ? dataPreview.substring(0, 500) + '\n... (truncated)'
      : dataPreview;
    console.error(truncatedPreview);
  } catch (error) {
    console.error('  [Unable to serialize data for preview]');
  }
  
  console.error('---');
}
