import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ContentSubmissionService } from '../services/content-submission-service';
import { ValidationMiddleware, CommonSchemas, withValidation } from '../utils/validation';
import { ErrorHandler, withErrorHandling, ProcessingError, RateLimitError, ValidationError } from '../utils/error-handler';

/**
 * POST /api/content
 * 
 * Enhanced version using both validation and error handling middleware
 * This demonstrates the complete middleware system
 */
export async function contentSubmissionFunctionV3(
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
      return ErrorHandler.createValidationErrorResponse(validationResult.errors!);
    }

    // Check rate limiting
    const rateLimitExceeded = await checkRateLimit(request);
    if (rateLimitExceeded) {
      throw new RateLimitError(
        'Too many requests',
        'Maximum 10 concurrent processing jobs allowed',
        60 // retry after 60 seconds
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
    // Let the error handling middleware handle it
    throw error;
  }
}

/**
 * Alternative implementation using both decorators
 */
export const contentSubmissionFunctionWithBothDecorators = withErrorHandling({
  includeStack: false,
  logErrors: true,
  sanitizeErrors: true
})(withValidation({
  body: CommonSchemas.contentSubmission
})(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  try {
    context.log('Content submission request received');

    // Check rate limiting
    const rateLimitExceeded = await checkRateLimit(request);
    if (rateLimitExceeded) {
      throw new RateLimitError(
        'Too many requests',
        'Maximum 10 concurrent processing jobs allowed',
        60
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
    // Re-throw to let error handling middleware handle it
    throw error;
  }
}));

/**
 * Example of custom error handling for specific scenarios
 */
export async function contentSubmissionFunctionWithCustomErrors(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validate request
    const validationResult = await ValidationMiddleware.validateRequest(request, {
      body: CommonSchemas.contentSubmission
    });

    if (!validationResult.isValid) {
      return ErrorHandler.createValidationErrorResponse(validationResult.errors!);
    }

    const { content_url, content_type } = validationResult.data!.body;

    // Check rate limiting
    const rateLimitExceeded = await checkRateLimit(request);
    if (rateLimitExceeded) {
      return ErrorHandler.createRateLimitErrorResponse(
        '10 concurrent processing jobs',
        60
      );
    }

    // Simulate content type validation
    if (content_type === 'youtube' && !isValidYouTubeUrl(content_url)) {
      throw new ValidationError(
        'Invalid YouTube URL',
        'content_url',
        'INVALID_YOUTUBE_URL'
      );
    }

    // Simulate processing with potential errors
    try {
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
    } catch (processingError) {
      throw new ProcessingError(
        'Failed to process content submission',
        'content_processing'
      );
    }

  } catch (error) {
    return ErrorHandler.handleError(error, request, context, {
      includeStack: false,
      logErrors: true,
      sanitizeErrors: true
    });
  }
}

/**
 * Check rate limiting (simplified implementation)
 */
async function checkRateLimit(_request: HttpRequest): Promise<boolean> {
  // Simplified rate limiting - in production, use Redis or similar
  // This is a placeholder that always returns false
  return false;
}

/**
 * Validate YouTube URL (simplified implementation)
 */
function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}

// Register the functions
app.http('contentSubmissionV3', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'content-v3',
  handler: contentSubmissionFunctionV3
});

app.http('contentSubmissionWithDecorators', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'content-decorators',
  handler: contentSubmissionFunctionWithBothDecorators
});

app.http('contentSubmissionCustomErrors', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'content-custom-errors',
  handler: contentSubmissionFunctionWithCustomErrors
});
