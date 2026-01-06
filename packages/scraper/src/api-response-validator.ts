/**
 * API Response Validator
 * 
 * Validates API response structure and data integrity for
 * htreviews.org API responses.
 */

import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('scraper');

// ============================================================================
// API Response Validator Implementation
// ============================================================================

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors (if any) */
  errors: string[];
}

/**
 * API Response Validator Class
 * 
 * Validates API response structure and data integrity.
 */
export class ApiResponseValidator {
  /**
   * Validate API response structure
   * 
   * @param response API response data
   * @returns Validation result
   */
  validateResponse(response: any): ValidationResult {
    const errors: string[] = [];
    
    try {
      // Check if response is an array
      if (!this.isArray(response)) {
        errors.push('Response is not an array');
        logger.debug('API response validation failed: not an array', { 
          responseType: typeof response 
        } as any);
        return { isValid: false, errors };
      }

      // Validate each flavor object in array
      for (let i = 0; i < response.length; i++) {
        const flavorResult = this.validateFlavorObject(response[i]);
        
        if (!flavorResult.isValid) {
          errors.push(`Flavor at index ${i}: ${flavorResult.errors.join(', ')}`);
        }
      }

      const isValid = errors.length === 0;
      
      if (isValid) {
        logger.debug('API response validation passed', { 
          itemCount: response.length 
        } as any);
      } else {
        logger.warn('API response validation failed', { 
          itemCount: response.length,
          errorCount: errors.length,
          errors 
        } as any);
      }
      
      return { isValid, errors };
    } catch (error) {
      const errorMessage = `Exception during validation: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMessage);
      logger.error('API response validation exception', { error } as any);
      return { isValid: false, errors };
    }
  }

  /**
   * Validate flavor object structure
   * 
   * @param flavor Flavor object from API response
   * @returns Validation result
   */
  validateFlavorObject(flavor: any): ValidationResult {
    const errors: string[] = [];
    
    // Check if flavor is an object
    if (typeof flavor !== 'object' || flavor === null) {
      errors.push('Flavor is not an object');
      return { isValid: false, errors };
    }

    // Check for required properties
    if (!this.hasRequiredProperties(flavor)) {
      errors.push('Missing required properties (url or slug)');
    }

    // Validate URL format if present
    if (flavor.url && typeof flavor.url === 'string') {
      if (!this.isValidFlavorUrl(flavor.url)) {
        errors.push(`Invalid URL format: ${flavor.url}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if response is an array
   * 
   * @param response API response data
   * @returns True if array
   */
  private isArray(response: any): boolean {
    return Array.isArray(response);
  }

  /**
   * Check if flavor object has required properties
   * 
   * @param flavor Flavor object
   * @returns True if has required properties
   */
  private hasRequiredProperties(flavor: any): boolean {
    // At least one of url or slug should be present
    return !!(flavor.url || flavor.slug);
  }

  /**
   * Validate flavor URL format
   * 
   * @param url Flavor URL
   * @returns True if valid
   */
  private isValidFlavorUrl(url: string): boolean {
    // URL should start with /tobaccos/
    return url.startsWith('/tobaccos/');
  }
}

// ============================================================================
// Exports
// ============================================================================

export default ApiResponseValidator;
