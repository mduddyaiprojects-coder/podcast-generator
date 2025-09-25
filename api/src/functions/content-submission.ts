import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { serviceManager } from '../services/service-manager';
import { logger } from '../utils/logger';

/**
 * POST /api/content
 * 
 * Content submission endpoint that processes web articles, YouTube videos, and documents
 * into podcast episodes using AI and TTS services
 */
export async function contentSubmissionFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Content submission request received');

    // Parse request body
    const body = await request.json() as { content_url?: string; content_type?: string; user_note?: string };
    const { content_url, content_type } = body;

    // Basic validation
    if (!content_url || !content_type) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_REQUEST',
          message: 'Missing required fields',
          details: 'content_url and content_type are required'
        }
      };
    }

    // Validate content type
    const validTypes = ['url', 'youtube', 'pdf', 'document'];
    if (!validTypes.includes(content_type)) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_CONTENT_TYPE',
          message: 'Unsupported content type',
          details: `content_type must be one of [${validTypes.join(', ')}]`
        }
      };
    }

    // Validate URL format
    try {
      new URL(content_url);
    } catch {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_URL',
          message: 'Invalid URL format',
          details: 'content_url must be a valid URL'
        }
      };
    }

    // Process content submission using ServiceManager
    const contentService = serviceManager.getContentSubmissionService();
    const result = await contentService.processSubmission(body);

    context.log('Content submission processed:', { 
      submissionId: result.submissionId, 
      content_url, 
      content_type 
    });

    return {
      status: 202,
      jsonBody: {
        submission_id: result.submissionId,
        status: 'pending',
        estimated_completion: result.estimatedCompletion,
        message: 'Content submitted for processing',
        content_url,
        content_type
      }
    };

  } catch (error) {
    context.log('Content submission error:', error);
    logger.error('Content submission processing error:', error);
    
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