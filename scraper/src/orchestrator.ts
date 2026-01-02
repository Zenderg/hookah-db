/**
 * Scraper Orchestrator Module
 *
 * Provides high-level orchestration for scraping workflows, coordinating
 * HTTP client, HTML parser, data normalizer, duplicate detector, and database
 * operations to discover and extract brand and product data.
 *
 * @module orchestrator
 */

import { URL } from 'url';

import {
  upsertBrand,
  createProduct,
  createScrapingMetadata,
  updateScrapingMetadata,
  incrementScrapingErrorCount,
  completeScrapingOperation,
  failScrapingOperation,
  searchBrandsByName,
} from '@hookah-db/database';

import { HttpClient } from './http-client.js';
import {
  parseBrandList,
  parseBrandDetail,
  parseProductList,
  parseProductDetail,
  isBrandDiscoveryComplete,
  isProductDiscoveryComplete,
} from './html-parser.js';
import {
  normalizeBrandDetailData,
  normalizeProductDetailData,
  validateBrandData,
  validateProductData,
  logInvalidData,
} from './data-normalizer.js';
import {
  createDuplicateDetector,
  addBrand,
  addProduct,
  getBrandCount,
  getProductCount,
} from './duplicate-detector.js';
import type {
  NormalizedBrand,
  NormalizedProduct,
  DuplicateDetector,
} from './types.js';

/**
 * Job status enum
 */
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Job interface for tracking processing tasks
 */
export interface Job<T = string> {
  /** Unique job identifier */
  id: string;
  /** Job data (brand slug or product slug) */
  data: T;
  /** Current job status */
  status: JobStatus;
  /** Number of retry attempts */
  retryCount: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp when job was created */
  createdAt: Date;
  /** Timestamp when job was completed (if applicable) */
  completedAt?: Date;
}

/**
 * Progress tracking interface
 */
export interface Progress {
  /** Current iteration number */
  iteration: number;
  /** Total items discovered */
  totalDiscovered: number;
  /** Total items processed */
  totalProcessed: number;
  /** Total items failed */
  totalFailed: number;
  /** Estimated total items (if known) */
  estimatedTotal?: number;
  /** Progress percentage (0-100) */
  percentage: number;
}

/**
 * Configuration options for the scraper orchestrator
 */
export interface OrchestratorConfig {
  /** Base URL for scraping (default: https://htreviews.org) */
  baseUrl?: string;
  /** Maximum concurrent brand processing (default: 1) */
  maxConcurrentBrands?: number;
  /** Maximum concurrent product processing (default: 1) */
  maxConcurrentProducts?: number;
  /** Save checkpoint every N iterations (default: 1) */
  checkpointInterval?: number;
  /** Maximum retry attempts for failed jobs (default: 3) */
  maxRetries?: number;
}

/**
 * Result of a brand discovery operation
 */
export interface BrandDiscoveryResult {
  /** Array of discovered brand slugs */
  brandSlugs: string[];
  /** Total number of brands discovered */
  totalDiscovered: number;
  /** Number of iterations performed */
  iterations: number;
}

/**
 * Result of a product discovery operation
 */
export interface ProductDiscoveryResult {
  /** Array of discovered product slugs */
  productSlugs: string[];
  /** Total number of products discovered */
  totalDiscovered: number;
  /** Number of iterations performed */
  iterations: number;
}

/**
 * Scraper Orchestrator class that coordinates all scraping workflows
 */
export class ScraperOrchestrator {
  private httpClient: HttpClient;
  private duplicateDetector: DuplicateDetector;
  private baseUrl: string;
  private maxConcurrentBrands: number;
  private maxConcurrentProducts: number;
  private checkpointInterval: number;
  private maxRetries: number;

  // Job queues
  private brandQueue: Map<string, Job<string>> = new Map();
  private productQueue: Map<string, Job<{ productSlug: string; brandSlug: string }>> = new Map();

  // Progress tracking
  private brandDiscoveryIteration: number = 0;
  private productDiscoveryIterations: Map<string, number> = new Map();
  private brandsDiscovered: number = 0;
  private brandsProcessed: number = 0;
  private productsDiscovered: number = 0;
  private productsProcessed: number = 0;
  private errorsEncountered: number = 0;

  // Metadata tracking
  private metadataId: number | null = null;
  private operationType: 'full_refresh' | 'incremental_update' = 'full_refresh';

  /**
   * Create a new ScraperOrchestrator instance
   * @param config Configuration options for orchestrator
   */
  constructor(config?: OrchestratorConfig) {
    this.baseUrl = config?.baseUrl ?? this.getStringEnv('SCRAPER_BASE_URL', 'https://htreviews.org');
    this.maxConcurrentBrands = config?.maxConcurrentBrands ?? this.getNumberEnv('SCRAPER_MAX_CONCURRENT_BRANDS', 1);
    this.maxConcurrentProducts = config?.maxConcurrentProducts ?? this.getNumberEnv('SCRAPER_MAX_CONCURRENT_PRODUCTS', 1);
    this.checkpointInterval = config?.checkpointInterval ?? this.getNumberEnv('SCRAPER_CHECKPOINT_INTERVAL', 1);
    this.maxRetries = config?.maxRetries ?? 3;

    this.httpClient = new HttpClient();
    this.duplicateDetector = createDuplicateDetector();
  }

  /**
   * Get string from environment variable
   */
  private getStringEnv(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  /**
   * Get number from environment variable
   */
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Initialize a new scraping operation with metadata tracking
   * @param operationType Type of operation (full_refresh or incremental_update)
   * @returns The ID of created metadata record
   */
  async initializeOperation(operationType: 'full_refresh' | 'incremental_update' = 'full_refresh'): Promise<number> {
    this.operationType = operationType;

    const metadata = await createScrapingMetadata({
      operation_type: operationType,
      status: 'in_progress',
      started_at: new Date(),
      brands_processed: 0,
      products_processed: 0,
      error_count: 0,
    });

    this.metadataId = metadata.id;
    console.log(`Initialized scraping operation ${metadata.id} with type: ${operationType}`);

    return metadata.id;
  }

  /**
   * Discover all brands from htreviews.org
   * @returns Result containing discovered brand slugs and discovery statistics
   */
  async discoverBrands(): Promise<BrandDiscoveryResult> {
    console.log('Starting brand discovery...');
    this.brandDiscoveryIteration = 0;
    const discoveredBrands: string[] = [];

    try {
      // Initial request to brand list page
      const brandListUrl = `${this.baseUrl}/tobaccos/brands`;
      const result = await this.httpClient.fetch(brandListUrl);

      if (!result.success || !result.content) {
        throw new Error(`Failed to fetch brand list: ${result.error?.message ?? 'Unknown error'}`);
      }

      // Parse brand list
      const parsed = parseBrandList(result.content);
      console.log(`Discovered ${parsed.brands.length} brands on page 1`);

      // Extract slugs from discovered brands
      for (const brand of parsed.brands) {
        const slug = this.extractSlugFromUrl(brand.sourceUrl);
        if (slug) {
          discoveredBrands.push(slug);
        }
      }

      this.brandDiscoveryIteration = 1;
      this.brandsDiscovered = discoveredBrands.length;

      // Check if more brands are available and iterate
      if (parsed.pagination && parsed.hasMore) {
        await this.iterativeBrandDiscovery(parsed.pagination, discoveredBrands);
      }

      console.log(`Brand discovery complete: ${discoveredBrands.length} brands discovered in ${this.brandDiscoveryIteration} iterations`);

      return {
        brandSlugs: discoveredBrands,
        totalDiscovered: discoveredBrands.length,
        iterations: this.brandDiscoveryIteration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Brand discovery failed: ${errorMessage}`);
      await this.logError('Brand discovery', errorMessage, { iteration: this.brandDiscoveryIteration });
      throw error;
    }
  }

  /**
   * Iteratively discover brands using HTMX pagination
   * @param pagination Initial pagination info
   * @param discoveredBrands Array to store discovered brand slugs
   */
  private async iterativeBrandDiscovery(
    pagination: { endpoint: string; offset: number; count: number; totalCount: number },
    discoveredBrands: string[]
  ): Promise<void> {
    let currentOffset = pagination.offset + pagination.count;
    const totalCount = pagination.totalCount;

    while (currentOffset < totalCount) {
      this.brandDiscoveryIteration++;

      // Build URL with offset parameter
      const url = new URL(pagination.endpoint);
      url.searchParams.set('offset', String(currentOffset));

      console.log(`Fetching brand page with offset ${currentOffset}...`);

      const result = await this.httpClient.fetch(url.toString());

      if (!result.success || !result.content) {
        console.warn(`Failed to fetch brand page at offset ${currentOffset}: ${result.error?.message ?? 'Unknown error'}`);
        break;
      }

      // Check if discovery is complete
      if (isBrandDiscoveryComplete(result.content)) {
        console.log('Brand discovery complete detected');
        break;
      }

      // Parse brand list
      const parsed = parseBrandList(result.content);
      console.log(`Discovered ${parsed.brands.length} brands on page ${this.brandDiscoveryIteration}`);

      // Extract slugs from discovered brands
      for (const brand of parsed.brands) {
        const slug = this.extractSlugFromUrl(brand.sourceUrl);
        if (slug && !discoveredBrands.includes(slug)) {
          discoveredBrands.push(slug);
        }
      }

      this.brandsDiscovered = discoveredBrands.length;

      // Log progress
      this.logBrandDiscoveryProgress(currentOffset, totalCount);

      // Check if more brands are available
      if (!parsed.hasMore) {
        console.log('No more brands available');
        break;
      }

      currentOffset += parsed.brands.length;

      // Save checkpoint at interval
      if (this.brandDiscoveryIteration % this.checkpointInterval === 0) {
        this.saveCheckpoint();
      }
    }
  }

  /**
   * Extract slug from URL
   * @param url URL to extract slug from
   * @returns Extracted slug or null
   */
  private extractSlugFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts.length > 0 ? pathParts[pathParts.length - 1]! : null;
    } catch (error) {
      console.warn(`Failed to extract slug from URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Log brand discovery progress
   * @param currentOffset Current offset in pagination
   * @param totalCount Total count of brands
   */
  private logBrandDiscoveryProgress(currentOffset: number, totalCount: number): void {
    const percentage = Math.round((currentOffset / totalCount) * 100);
    console.log(`Brand discovery progress: ${currentOffset}/${totalCount} (${percentage}%)`);
  }

  /**
   * Extract and store brand data
   * @param brandSlug Slug of the brand to extract
   * @returns Normalized brand data or null if extraction failed
   */
  async extractBrandData(brandSlug: string): Promise<NormalizedBrand | null> {
    console.log(`Extracting brand data for: ${brandSlug}`);

    try {
      // Fetch brand detail page
      const brandUrl = `${this.baseUrl}/tobaccos/${brandSlug}`;
      const result = await this.httpClient.fetch(brandUrl);

      if (!result.success || !result.content) {
        throw new Error(`Failed to fetch brand detail: ${result.error?.message ?? 'Unknown error'}`);
      }

      // Parse brand detail
      const parsedBrand = parseBrandDetail(result.content, brandSlug);

      // Normalize brand data
      const normalizedBrand = normalizeBrandDetailData(parsedBrand);

      // Validate brand data
      const validation = validateBrandData(normalizedBrand);
      if (!validation.isValid) {
        logInvalidData(normalizedBrand, validation.errors);
        throw new Error(`Brand data validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicates
      const isDuplicate = addBrand(this.duplicateDetector, normalizedBrand);
      if (isDuplicate) {
        console.log(`Brand ${brandSlug} is a duplicate, skipping`);
        return null;
      }

      // Store brand in database
      const dbBrand = await upsertBrand({
        name: normalizedBrand.name,
        description: normalizedBrand.description,
        image_url: normalizedBrand.imageUrl,
        source_url: normalizedBrand.sourceUrl,
      });

      this.brandsProcessed++;
      console.log(`Successfully extracted and stored brand: ${normalizedBrand.name} (ID: ${dbBrand.id})`);

      // Update metadata
      await this.updateProgress();

      return normalizedBrand;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to extract brand data for ${brandSlug}: ${errorMessage}`);
      await this.logError('Brand data extraction', errorMessage, { brandSlug });
      return null;
    }
  }

  /**
   * Discover all products for a specific brand
   * @param brandSlug Slug of the brand to discover products for
   * @returns Result containing discovered product slugs and discovery statistics
   */
  async discoverProducts(brandSlug: string): Promise<ProductDiscoveryResult> {
    console.log(`Starting product discovery for brand: ${brandSlug}`);
    this.productDiscoveryIterations.set(brandSlug, 0);
    const discoveredProducts: string[] = [];

    try {
      // Fetch brand page to discover products
      const brandUrl = `${this.baseUrl}/tobaccos/${brandSlug}`;
      const result = await this.httpClient.fetch(brandUrl);

      if (!result.success || !result.content) {
        throw new Error(`Failed to fetch brand page: ${result.error?.message ?? 'Unknown error'}`);
      }

      // Parse product list
      const parsed = parseProductList(result.content, brandSlug);
      console.log(`Discovered ${parsed.products.length} products for ${brandSlug} on page 1`);

      // Extract slugs from discovered products
      for (const product of parsed.products) {
        const slug = this.extractSlugFromUrl(product.sourceUrl);
        if (slug) {
          discoveredProducts.push(slug);
        }
      }

      this.productDiscoveryIterations.set(brandSlug, 1);
      this.productsDiscovered += discoveredProducts.length;

      // Check if more products are available and iterate
      if (parsed.pagination && parsed.hasMore) {
        await this.iterativeProductDiscovery(brandSlug, parsed.pagination, discoveredProducts);
      }

      console.log(`Product discovery complete for ${brandSlug}: ${discoveredProducts.length} products discovered`);

      return {
        productSlugs: discoveredProducts,
        totalDiscovered: discoveredProducts.length,
        iterations: this.productDiscoveryIterations.get(brandSlug) ?? 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Product discovery failed for ${brandSlug}: ${errorMessage}`);
      await this.logError('Product discovery', errorMessage, { brandSlug });
      throw error;
    }
  }

  /**
   * Iteratively discover products using HTMX pagination
   * @param brandSlug Slug of the brand
   * @param pagination Initial pagination info
   * @param discoveredProducts Array to store discovered product slugs
   */
  private async iterativeProductDiscovery(
    brandSlug: string,
    pagination: { endpoint: string; offset: number; count: number; totalCount: number },
    discoveredProducts: string[]
  ): Promise<void> {
    let currentOffset = pagination.offset + pagination.count;
    const totalCount = pagination.totalCount;
    const currentIteration = this.productDiscoveryIterations.get(brandSlug) ?? 0;

    while (currentOffset < totalCount) {
      const nextIteration = currentIteration + 1;
      this.productDiscoveryIterations.set(brandSlug, nextIteration);

      // Build URL with offset parameter
      const url = new URL(pagination.endpoint);
      url.searchParams.set('offset', String(currentOffset));

      console.log(`Fetching product page for ${brandSlug} with offset ${currentOffset}...`);

      const result = await this.httpClient.fetch(url.toString());

      if (!result.success || !result.content) {
        console.warn(`Failed to fetch product page at offset ${currentOffset}: ${result.error?.message ?? 'Unknown error'}`);
        break;
      }

      // Check if discovery is complete
      if (isProductDiscoveryComplete(result.content)) {
        console.log('Product discovery complete detected');
        break;
      }

      // Parse product list
      const parsed = parseProductList(result.content, brandSlug);
      console.log(`Discovered ${parsed.products.length} products for ${brandSlug} on page ${nextIteration}`);

      // Extract slugs from discovered products
      for (const product of parsed.products) {
        const slug = this.extractSlugFromUrl(product.sourceUrl);
        if (slug && !discoveredProducts.includes(slug)) {
          discoveredProducts.push(slug);
        }
      }

      this.productsDiscovered += parsed.products.length;

      // Log progress
      this.logProductDiscoveryProgress(brandSlug, currentOffset, totalCount);

      // Check if more products are available
      if (!parsed.hasMore) {
        console.log(`No more products available for ${brandSlug}`);
        break;
      }

      currentOffset += parsed.products.length;

      // Save checkpoint at interval
      if (nextIteration % this.checkpointInterval === 0) {
        this.saveCheckpoint();
      }
    }
  }

  /**
   * Log product discovery progress
   * @param brandSlug Slug of the brand
   * @param currentOffset Current offset in pagination
   * @param totalCount Total count of products
   */
  private logProductDiscoveryProgress(brandSlug: string, currentOffset: number, totalCount: number): void {
    const percentage = Math.round((currentOffset / totalCount) * 100);
    console.log(`Product discovery progress for ${brandSlug}: ${currentOffset}/${totalCount} (${percentage}%)`);
  }

  /**
   * Extract and store product data
   * @param productSlug Slug of the product to extract
   * @param brandSlug Slug of the brand
   * @returns Normalized product data or null if extraction failed
   */
  async extractProductData(productSlug: string, brandSlug: string): Promise<NormalizedProduct | null> {
    console.log(`Extracting product data for: ${brandSlug}/${productSlug}`);

    try {
      // Fetch product detail page
      const productUrl = `${this.baseUrl}/tobaccos/${brandSlug}/${productSlug}`;
      const result = await this.httpClient.fetch(productUrl);

      if (!result.success || !result.content) {
        throw new Error(`Failed to fetch product detail: ${result.error?.message ?? 'Unknown error'}`);
      }

      // Parse product detail
      const parsedProduct = parseProductDetail(result.content, productSlug, brandSlug);

      // Normalize product data
      const normalizedProduct = normalizeProductDetailData(parsedProduct);

      // Validate product data
      const validation = validateProductData(normalizedProduct);
      if (!validation.isValid) {
        logInvalidData(normalizedProduct, validation.errors);
        throw new Error(`Product data validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicates
      const isDuplicate = addProduct(this.duplicateDetector, normalizedProduct);
      if (isDuplicate) {
        console.log(`Product ${brandSlug}/${productSlug} is a duplicate, skipping`);
        return null;
      }

      // Get brand ID from database
      const brand = await getBrandByName(normalizedProduct.brandSlug);
      if (!brand) {
        throw new Error(`Brand ${normalizedProduct.brandSlug} not found in database`);
      }

      // Store product in database
      const dbProduct = await createProduct({
        brand_id: brand.id,
        name: normalizedProduct.name,
        description: normalizedProduct.description,
        image_url: normalizedProduct.imageUrl,
        source_url: normalizedProduct.sourceUrl,
      });

      this.productsProcessed++;
      console.log(`Successfully extracted and stored product: ${normalizedProduct.name} (ID: ${dbProduct.id})`);

      // Update metadata
      await this.updateProgress();

      return normalizedProduct;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to extract product data for ${brandSlug}/${productSlug}: ${errorMessage}`);
      await this.logError('Product data extraction', errorMessage, { productSlug, brandSlug });
      return null;
    }
  }

  /**
   * Add a brand to the processing queue
   * @param brandSlug Slug of the brand to queue
   * @returns Job ID for the queued brand
   */
  queueBrand(brandSlug: string): string {
    const jobId = `brand-${brandSlug}-${Date.now()}`;
    const job: Job<string> = {
      id: jobId,
      data: brandSlug,
      status: JobStatus.QUEUED,
      retryCount: 0,
      createdAt: new Date(),
    };
    this.brandQueue.set(jobId, job);
    console.log(`Queued brand job: ${jobId}`);
    return jobId;
  }

  /**
   * Add a product to the processing queue
   * @param productSlug Slug of the product to queue
   * @param brandSlug Slug of the brand product belongs to
   * @returns Job ID for the queued product
   */
  queueProduct(productSlug: string, brandSlug: string): string {
    const jobId = `product-${brandSlug}-${productSlug}-${Date.now()}`;
    const job: Job<{ productSlug: string; brandSlug: string }> = {
      id: jobId,
      data: { productSlug, brandSlug },
      status: JobStatus.QUEUED,
      retryCount: 0,
      createdAt: new Date(),
    };
    this.productQueue.set(jobId, job);
    console.log(`Queued product job: ${jobId}`);
    return jobId;
  }

  /**
   * Process all queued brands
   * @returns Number of brands successfully processed
   */
  async processBrandQueue(): Promise<number> {
    console.log(`Processing ${this.brandQueue.size} queued brands...`);
    let processed = 0;

    const jobs = Array.from(this.brandQueue.values());
    const concurrentLimit = Math.min(this.maxConcurrentBrands, jobs.length);

    for (let i = 0; i < jobs.length; i += concurrentLimit) {
      const batch = jobs.slice(i, i + concurrentLimit);
      await Promise.all(
        batch.map(async (job) => {
          job.status = JobStatus.PROCESSING;
          const result = await this.processBrandJob(job);
          if (result) {
            processed++;
          }
        })
      );
    }

    console.log(`Brand queue processing complete: ${processed}/${jobs.length} successful`);
    return processed;
  }

  /**
   * Process a single brand job
   * @param job Brand job to process
   * @returns True if successful, false otherwise
   */
  private async processBrandJob(job: Job<string>): Promise<boolean> {
    try {
      const brandSlug = job.data;
      const result = await this.extractBrandData(brandSlug);

      if (result) {
        job.status = JobStatus.COMPLETED;
        job.completedAt = new Date();
        return true;
      } else {
        throw new Error('Brand extraction returned null');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      job.status = JobStatus.FAILED;
      job.error = errorMessage;
      job.retryCount++;

      // Retry if under max retries
      if (job.retryCount < this.maxRetries) {
        console.log(`Retrying brand job ${job.id} (attempt ${job.retryCount}/${this.maxRetries})`);
        job.status = JobStatus.QUEUED;
        return await this.processBrandJob(job);
      }

      console.error(`Brand job ${job.id} failed after ${job.retryCount} retries: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Process all queued products
   * @returns Number of products successfully processed
   */
  async processProductQueue(): Promise<number> {
    console.log(`Processing ${this.productQueue.size} queued products...`);
    let processed = 0;

    const jobs = Array.from(this.productQueue.values());
    const concurrentLimit = Math.min(this.maxConcurrentProducts, jobs.length);

    for (let i = 0; i < jobs.length; i += concurrentLimit) {
      const batch = jobs.slice(i, i + concurrentLimit);
      await Promise.all(
        batch.map(async (job) => {
          job.status = JobStatus.PROCESSING;
          const result = await this.processProductJob(job);
          if (result) {
            processed++;
          }
        })
      );
    }

    console.log(`Product queue processing complete: ${processed}/${jobs.length} successful`);
    return processed;
  }

  /**
   * Process a single product job
   * @param job Product job to process
   * @returns True if successful, false otherwise
   */
  private async processProductJob(job: Job<{ productSlug: string; brandSlug: string }>): Promise<boolean> {
    try {
      const { productSlug, brandSlug } = job.data;
      const result = await this.extractProductData(productSlug, brandSlug);

      if (result) {
        job.status = JobStatus.COMPLETED;
        job.completedAt = new Date();
        return true;
      } else {
        throw new Error('Product extraction returned null');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      job.status = JobStatus.FAILED;
      job.error = errorMessage;
      job.retryCount++;

      // Retry if under max retries
      if (job.retryCount < this.maxRetries) {
        console.log(`Retrying product job ${job.id} (attempt ${job.retryCount}/${this.maxRetries})`);
        job.status = JobStatus.QUEUED;
        return await this.processProductJob(job);
      }

      console.error(`Product job ${job.id} failed after ${job.retryCount} retries: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get current progress statistics
   * @returns Progress object with current statistics
   */
  getProgress(): Progress {
    const totalItems = this.brandsDiscovered + this.productsDiscovered;
    const totalProcessed = this.brandsProcessed + this.productsProcessed;
    const percentage = totalItems > 0 ? Math.round((totalProcessed / totalItems) * 100) : 0;

    return {
      iteration: this.brandDiscoveryIteration,
      totalDiscovered: totalItems,
      totalProcessed,
      totalFailed: this.errorsEncountered,
      percentage,
    };
  }

  /**
   * Log detailed progress information
   */
  logProgress(): void {
    const progress = this.getProgress();
    const brandCount = getBrandCount(this.duplicateDetector);
    const productCount = getProductCount(this.duplicateDetector);

    console.log('=== Scraping Progress ===');
    console.log(`Iteration: ${progress.iteration}`);
    console.log(`Brands discovered: ${this.brandsDiscovered}`);
    console.log(`Brands processed: ${this.brandsProcessed}`);
    console.log(`Products discovered: ${this.productsDiscovered}`);
    console.log(`Products processed: ${this.productsProcessed}`);
    console.log(`Total tracked: ${brandCount} brands, ${productCount} products`);
    console.log(`Errors encountered: ${this.errorsEncountered}`);
    console.log(`Overall progress: ${progress.percentage}%`);
    console.log('=========================');
  }

  /**
   * Save a checkpoint for resumability
   */
  saveCheckpoint(): void {
    const checkpoint = {
      brandDiscoveryIteration: this.brandDiscoveryIteration,
      productDiscoveryIterations: Object.fromEntries(this.productDiscoveryIterations),
      brandsDiscovered: this.brandsDiscovered,
      brandsProcessed: this.brandsProcessed,
      productsDiscovered: this.productsDiscovered,
      productsProcessed: this.productsProcessed,
      errorsEncountered: this.errorsEncountered,
      timestamp: new Date(),
    };

    console.log('Checkpoint saved:', checkpoint);
    // In a real implementation, this would be persisted to disk or database
  }

  /**
   * Update metadata with current progress
   */
  private async updateProgress(): Promise<void> {
    if (this.metadataId === null) {
      return;
    }

    try {
      await updateScrapingMetadata(this.metadataId, {
        brands_processed: this.brandsProcessed,
        products_processed: this.productsProcessed,
      });
    } catch (error) {
      console.warn('Failed to update metadata progress:', error);
    }
  }

  /**
   * Log an error and update metadata
   * @param context Context where error occurred
   * @param errorMessage Error message
   * @param details Additional error details
   */
  private async logError(context: string, errorMessage: string, details?: Record<string, unknown>): Promise<void> {
    this.errorsEncountered++;

    const _errorDetails = JSON.stringify({
      context,
      message: errorMessage,
      details,
      timestamp: new Date().toISOString(),
    });

    console.error(`[${context}] ${errorMessage}`, details ?? '');

    if (this.metadataId !== null) {
      try {
        await incrementScrapingErrorCount(this.metadataId);
      } catch (error) {
        console.warn('Failed to increment error count in metadata:', error);
      }
    }
  }

  /**
   * Complete scraping operation successfully
   */
  async completeOperation(): Promise<void> {
    if (this.metadataId === null) {
      console.warn('No metadata ID to complete operation');
      return;
    }

    try {
      await completeScrapingOperation(this.metadataId, this.brandsProcessed, this.productsProcessed);
      console.log(`Scraping operation ${this.metadataId} completed successfully`);
    } catch (error) {
      console.error('Failed to complete operation:', error);
      throw error;
    }
  }

  /**
   * Mark scraping operation as failed
   * @param errorDetails Details about failure
   */
  async failOperation(errorDetails: string): Promise<void> {
    if (this.metadataId === null) {
      console.warn('No metadata ID to fail operation');
      return;
    }

    try {
      await failScrapingOperation(this.metadataId, errorDetails);
      console.log(`Scraping operation ${this.metadataId} marked as failed`);
    } catch (error) {
      console.error('Failed to fail operation:', error);
      throw error;
    }
  }

  /**
   * Reset orchestrator state for a new operation
   */
  reset(): void {
    this.brandQueue.clear();
    this.productQueue.clear();
    this.brandDiscoveryIteration = 0;
    this.productDiscoveryIterations.clear();
    this.brandsDiscovered = 0;
    this.brandsProcessed = 0;
    this.productsDiscovered = 0;
    this.productsProcessed = 0;
    this.errorsEncountered = 0;
    this.metadataId = null;
    this.duplicateDetector = createDuplicateDetector();
    this.httpClient.resetIterationState();
    console.log('Orchestrator state reset');
  }

  /**
   * Get statistics about the current operation
   * @returns Object containing operation statistics
   */
  getStatistics(): {
    brandsDiscovered: number;
    brandsProcessed: number;
    productsDiscovered: number;
    productsProcessed: number;
    errorsEncountered: number;
    queuedBrands: number;
    queuedProducts: number;
    trackedBrands: number;
    trackedProducts: number;
  } {
    return {
      brandsDiscovered: this.brandsDiscovered,
      brandsProcessed: this.brandsProcessed,
      productsDiscovered: this.productsDiscovered,
      productsProcessed: this.productsProcessed,
      errorsEncountered: this.errorsEncountered,
      queuedBrands: this.brandQueue.size,
      queuedProducts: this.productQueue.size,
      trackedBrands: getBrandCount(this.duplicateDetector),
      trackedProducts: getProductCount(this.duplicateDetector),
    };
  }
}

/**
 * Helper function to get a brand by name from the database
 * @param name Brand name to search for
 * @returns Brand record or null if not found
 */
async function getBrandByName(name: string): Promise<{ id: number } | null> {
  const brands = await searchBrandsByName(name, 1);
  return brands.length > 0 ? { id: brands[0]!.id } : null;
}
