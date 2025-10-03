import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { logger } from '../utils/logger';
import { BrandingService } from '../services/branding-service';

/**
 * Branding service instance
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
 * Branding GET Function
 * 
 * Retrieves current podcast branding (title and image).
 * Returns default branding if not yet configured.
 * 
 * Response (200 OK):
 * {
 *   "title": "string",
 *   "imageUrl": "string",
 *   "updatedAt": "2025-09-30T12:34:56.789Z"
 * }
 */
export async function brandingGetFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestStartTime = Date.now();
  
  try {
    context.log('Branding GET function processing request');
    
    logger.info('Branding get request received', {
      requestId: context.invocationId,
      timestamp: new Date().toISOString()
    });

    // Get current branding from blob storage
    const brandingService = getBrandingService();
    const branding = await brandingService.getBranding();

    const responseTime = Date.now() - requestStartTime;

    logger.info('Branding retrieved successfully', {
      requestId: context.invocationId,
      title: branding.title,
      updatedAt: branding.updatedAt.toISOString(),
      responseTime
    });

    // Return current branding
    return {
      status: 200,
      jsonBody: {
        title: branding.title,
        imageUrl: branding.imageUrl,
        updatedAt: branding.updatedAt.toISOString()
      }
    };

  } catch (error) {
    const responseTime = Date.now() - requestStartTime;
    context.error('Branding get error:', error);
    
    logger.error('Branding get failed', {
      requestId: context.invocationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime
    });

    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve branding'
      }
    };
  }
}
