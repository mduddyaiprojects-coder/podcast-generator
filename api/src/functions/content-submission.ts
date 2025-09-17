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
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request',
          details: validationResult.errors
        }
      };
    }

    // Process content submission
    const contentService = new ContentSubmissionService();
    const result = await contentService.processSubmission(request);

    return {
      status: 202,
      jsonBody: {
        message: 'Content submitted for processing',
        submissionId: result.submissionId,
        estimatedProcessingTime: '15 minutes'
      }
    };

  } catch (error) {
    logger.error('Content submission error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: 'Failed to process content submission'
      }
    };
  }
}
