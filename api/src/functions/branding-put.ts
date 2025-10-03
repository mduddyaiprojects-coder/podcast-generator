import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { logger } from '../utils/logger';
import { BrandingService, PodcastBranding } from '../services/branding-service';
import Joi from 'joi';
import { ValidationMiddleware } from '../utils/validation-middleware';

/**
 * Branding Update Request
 * Both fields are optional - allows partial updates
 */
interface BrandingUpdateRequest {
  title?: string;
  imageUrl?: string;
}



/**
 * T024: Joi validation schema for branding updates
 * Enforces Apple Podcasts image constraints and security requirements
 */
const brandingUpdateSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title cannot exceed 500 characters'
    }),
  imageUrl: Joi.string()
    .uri({ scheme: ['https'] })
    .pattern(/\.(jpg|jpeg|png)$/i)
    .max(2048)
    .optional()
    .messages({
      'string.uri': 'Image URL must be a valid HTTPS URL',
      'string.pattern.base': 'Image URL must end with .jpg, .jpeg, or .png',
      'string.max': 'Image URL cannot exceed 2048 characters'
    })
}).min(1).messages({
  'object.min': 'Request must include at least one field (title or imageUrl)'
});

/**
 * Branding service instance for blob storage persistence (T022)
 */
let brandingServiceInstance: BrandingService | null = null;

/**
 * Get or create branding service instance
 */
function getBrandingService(): BrandingService {
  if (!brandingServiceInstance) {
    brandingServiceInstance = new BrandingService();
  }
  return brandingServiceInstance;
}

/**
 * T024: Perform security checks on image URL
 * Sanitizes and validates URLs to prevent security issues
 */
function performSecurityChecks(imageUrl: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const url = new URL(imageUrl);

    // Must use HTTPS protocol
    if (url.protocol !== 'https:') {
      errors.push('Image URL must use HTTPS protocol for security');
    }

    // Check for suspicious patterns
    // Prevent localhost/private IPs
    const hostname = url.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^0\.0\.0\.0$/,
      /^\[::\]$/,
      /^::1$/
    ];

    if (privatePatterns.some(pattern => pattern.test(hostname))) {
      errors.push('Image URL cannot point to private/local network addresses');
    }

    // Check for valid file extension
    const pathname = url.pathname.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));

    if (!hasValidExtension) {
      errors.push('Image must be JPEG or PNG format (.jpg, .jpeg, or .png)');
    }

    // Prevent data URLs and javascript pseudo-protocol
    if (imageUrl.toLowerCase().startsWith('data:') || 
        imageUrl.toLowerCase().startsWith('javascript:')) {
      errors.push('Image URL cannot use data or javascript protocols');
    }

    // Check URL length for DoS protection
    if (imageUrl.length > 2048) {
      errors.push('Image URL exceeds maximum length of 2048 characters');
    }

  } catch (error) {
    errors.push('Image URL must be a valid URL');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Branding PUT Function
 * 
 * Updates podcast branding (title and/or image).
 * Implements Apple Podcasts image constraints and Last-Write-Wins policy.
 * Persists to Azure Blob Storage (T022 - Feature 002).
 * 
 * Requirements:
 * - FR-001: Allow creators to update podcast title
 * - FR-002: Allow creators to set podcast image (Apple Podcasts constraints)
 * - FR-015: Record when branding changes occur for accountability
 * - FR-017: Apply last-write-wins policy for concurrent updates
 * - T022: Persist branding changes in blob storage
 * - T023: Enhanced logging and telemetry
 * - T024: Security validation with joi, URL sanitization, content-type limits
 * 
 * Apple Podcasts Image Constraints (FR-002):
 * - Square aspect ratio (1:1)
 * - Dimensions: 1400x1400 to 3000x3000 pixels
 * - Format: JPEG or PNG
 * - Color space: RGB
 * 
 * Note: Image dimension/format validation requires downloading the image.
 * For MVP, we validate URL format. Full validation should be added in T024.
 * 
 * Request Body (both optional):
 * {
 *   "title"?: "string",
 *   "imageUrl"?: "string"
 * }
 * 
 * Response (200 OK):
 * {
 *   "title": "string",
 *   "imageUrl": "string",
 *   "updatedAt": "2025-09-30T12:34:56.789Z"
 * }
 */
export async function brandingPutFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestStartTime = Date.now();
  
  try {
    context.log('Branding PUT function processing request');
    
    // T023: Log request with telemetry
    logger.info('Branding update request received', {
      requestId: context.invocationId,
      timestamp: new Date().toISOString(),
      contentType: request.headers.get('content-type')
    });

    // T024: Validate Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseTime = Date.now() - requestStartTime;
      logger.warn('Invalid Content-Type for branding update', {
        requestId: context.invocationId,
        contentType,
        responseTime
      });
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json'
        }
      };
    }

    // Parse and validate request body with Joi (T024)
    const validationResult = await ValidationMiddleware.validateRequest(request, {
      body: brandingUpdateSchema
    });

    if (!validationResult.isValid) {
      const responseTime = Date.now() - requestStartTime;
      // T023: Log validation failures with details
      logger.warn('Branding update validation failed', {
        requestId: context.invocationId,
        errors: validationResult.errors,
        responseTime
      });
      return ValidationMiddleware.createValidationErrorResponse(validationResult.errors!);
    }

    const body = validationResult.data!.body as BrandingUpdateRequest;

    // T024: Additional security checks for imageUrl
    if (body.imageUrl) {
      const urlSecurityCheck = performSecurityChecks(body.imageUrl);
      if (!urlSecurityCheck.valid) {
        const responseTime = Date.now() - requestStartTime;
        logger.warn('Image URL failed security checks', {
          requestId: context.invocationId,
          imageUrl: body.imageUrl,
          errors: urlSecurityCheck.errors,
          responseTime
        });
        return {
          status: 400,
          jsonBody: {
            error: 'SECURITY_ERROR',
            message: urlSecurityCheck.errors.join('; ')
          }
        };
      }
    }

    // Apply update with LWW policy (FR-017) and persist to database (T022)
    const updated = await applyBrandingUpdate(body, context);

    const responseTime = Date.now() - requestStartTime;

    // T023: Enhanced audit logging (FR-015)
    logger.info('Branding updated successfully', {
      requestId: context.invocationId,
      title: updated.title,
      imageUrl: updated.imageUrl,
      updatedAt: updated.updatedAt.toISOString(),
      responseTime,
      changes: {
        titleChanged: body.title !== undefined,
        imageChanged: body.imageUrl !== undefined
      }
    });

    // Return updated branding
    return {
      status: 200,
      jsonBody: {
        title: updated.title,
        imageUrl: updated.imageUrl,
        updatedAt: updated.updatedAt.toISOString()
      }
    };

  } catch (error) {
    const responseTime = Date.now() - requestStartTime;
    context.error('Branding update error:', error);
    
    // T023: Enhanced error logging with full context
    logger.error('Branding update failed', {
      requestId: context.invocationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime
    });

    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to update branding'
      }
    };
  }
}

/**
 * Apply branding update with Last-Write-Wins (LWW) policy
 * Persists to blob storage using BrandingService (T022)
 * 
 * LWW Policy (FR-017):
 * - Each update gets a new timestamp
 * - Latest timestamp wins for concurrent updates
 * - BrandingService ensures consistency
 */
async function applyBrandingUpdate(
  update: BrandingUpdateRequest,
  context: InvocationContext
): Promise<PodcastBranding> {
  const brandingService = getBrandingService();

  try {
    // Update branding in blob storage
    // BrandingService will handle timestamp and LWW policy
    const updated = await brandingService.updateBranding({
      title: update.title,
      imageUrl: update.imageUrl
    });

    context.log('Branding persisted to blob storage (LWW policy applied)', {
      title: updated.title,
      imageUrl: updated.imageUrl,
      timestamp: updated.updatedAt.toISOString()
    });

    return updated;
  } catch (error) {
    context.error('Failed to persist branding to blob storage:', error);
    logger.error('Blob storage branding update failed', { error });
    throw error;
  }
}

/**
 * Get current branding from blob storage
 * Used by RSS generator and other services (FR-003)
 */
export async function getCurrentBranding(): Promise<PodcastBranding> {
  const brandingService = getBrandingService();
  
  try {
    const branding = await brandingService.getBranding();
    return branding;
  } catch (error) {
    logger.error('Failed to get branding from blob storage, using defaults', { error });
    // BrandingService already returns defaults on error, but handle just in case
    return {
      title: 'My Podcast',
      imageUrl: 'https://via.placeholder.com/3000x3000.png',
      updatedAt: new Date()
    };
  }
}

/**
 * Reset branding to default (for testing)
 * This should not exist in production - only for test isolation
 */
export async function resetBrandingForTesting(): Promise<void> {
  const brandingService = getBrandingService();
  
  try {
    await brandingService.resetBranding();
  } catch (error) {
    logger.error('Failed to reset branding for testing', { error });
    throw error;
  }
}

