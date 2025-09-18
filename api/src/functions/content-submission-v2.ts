import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ContentSubmissionService } from '../services/content-submission-service';
import { ValidationMiddleware, CommonSchemas, withValidation } from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * POST /api/content
 * 
 * Enhanced version using validation middleware
 * This demonstrates how to use the new validation system
 */
export async function contentSubmissionFunctionV2(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Content submission request received');

    // Validate request using middleware
    const validationResult = await ValidationMiddleware.validateRequest(request, {
      body: CommonSchemas.contentSubmission
    });

    if (!validationResult.isValid) {
      return ValidationMiddleware.createValidationErrorResponse(validationResult.errors!);
    }

    // Check rate limiting (simplified - in production, use Redis or similar)
    const rateLimitExceeded = await checkRateLimit(request);
    if (rateLimitExceeded) {
      return ValidationMiddleware.createErrorResponse(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        'Maximum 10 concurrent processing jobs allowed'
      );
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
    return ValidationMiddleware.createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An internal error occurred',
      'Please try again later'
    );
  }
}

/**
 * Alternative implementation using the withValidation decorator
 */
export const contentSubmissionFunctionWithDecorator = withValidation({
  body: CommonSchemas.contentSubmission
})(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  try {
    context.log('Content submission request received');

    // Check rate limiting
    const rateLimitExceeded = await checkRateLimit(request);
    if (rateLimitExceeded) {
      return ValidationMiddleware.createErrorResponse(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        'Maximum 10 concurrent processing jobs allowed'
      );
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
    return ValidationMiddleware.createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An internal error occurred',
      'Please try again later'
    );
  }
});

/**
 * Check rate limiting (simplified implementation)
 */
async function checkRateLimit(_request: HttpRequest): Promise<boolean> {
  // Simplified rate limiting - in production, use Redis or similar
  // This is a placeholder that always returns false
  return false;
}

// Register the function
app.http('contentSubmissionV2', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'content-v2',
  handler: contentSubmissionFunctionV2
});
