import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ContentSubmissionService } from '../services/content-submission-service';
import { validateContentSubmission } from '../utils/validation';
import { logger } from '../utils/logger';

export async function contentSubmissionFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Content submission request received');

    // Validate request
    const validationResult = await validateContentSubmission(request);
    if (!validationResult.isValid) {
      const errorCode = validationResult.errors?.some(e => e.includes('content_url')) ? 'INVALID_URL' : 'INVALID_CONTENT_TYPE';
      return {
        status: 400,
        jsonBody: {
          error: errorCode,
          message: errorCode === 'INVALID_URL' ? 'The provided URL is not valid' : 'Unsupported content type',
          details: validationResult.errors?.join(', ')
        }
      };
    }

    // Check rate limiting (simplified - in production, use Redis or similar)
    const rateLimitExceeded = await checkRateLimit(request);
    if (rateLimitExceeded) {
      return {
        status: 429,
        jsonBody: {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: 'Maximum 10 concurrent processing jobs allowed'
        }
      };
    }

    // Process content submission
    const contentService = new ContentSubmissionService();
    const result = await contentService.processSubmission(request);

    return {
      status: 202,
      jsonBody: {
        submission_id: result.submissionId,
        status: 'pending',
        estimated_completion: result.estimatedCompletion,
        message: 'Content submitted for processing'
      }
    };

  } catch (error) {
    logger.error('Content submission error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: 'Please try again later'
      }
    };
  }
}

// Simplified rate limiting check (in production, use Redis or similar)
async function checkRateLimit(_request: HttpRequest): Promise<boolean> {
  // For now, always return false (no rate limiting)
  // In production, implement proper rate limiting based on IP or user
  return false;
}
