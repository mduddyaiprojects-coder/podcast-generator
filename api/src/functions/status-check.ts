import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ContentSubmissionService } from '../services/content-submission-service';
import { ProcessingJobService } from '../services/processing-job-service';
import { DatabaseService } from '../services/database-service';
import { logger } from '../utils/logger';

/**
 * GET /api/content/{submission_id}/status
 * 
 * Retrieves the processing status of a content submission.
 * Returns detailed status information including progress, current step, and completion details.
 */
export async function statusCheckFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const submissionId = request.params.submission_id;

    // Validate submission ID format (UUID)
    if (!submissionId || !isValidUUID(submissionId)) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_SUBMISSION_ID',
          message: 'Invalid submission ID format',
          details: 'submission_id must be a valid UUID'
        }
      };
    }

    // Get submission details
    const contentService = new ContentSubmissionService();
    const submission = await contentService.getSubmission(submissionId);

    if (!submission) {
      return {
        status: 404,
        jsonBody: {
          error: 'SUBMISSION_NOT_FOUND',
          message: 'The specified submission was not found',
          details: 'submission_id does not exist'
        }
      };
    }

    // Get processing job details
    const jobService = new ProcessingJobService();
    const processingJob = await jobService.getJobBySubmissionId(submissionId);

    // Build status response
    const statusResponse = await buildStatusResponse(submission, processingJob);

    logger.info('Status check completed', {
      submissionId,
      status: statusResponse.status,
      progress: statusResponse.progress
    });

    return {
      status: 200,
      jsonBody: statusResponse
    };

  } catch (error) {
    logger.error('Status check failed:', error);
    
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

/**
 * Build the status response based on submission and processing job data
 */
async function buildStatusResponse(submission: any, processingJob: any | null) {
  const baseResponse = {
    submission_id: submission.id,
    status: submission.status,
    progress: 0,
    current_step: 'queued',
    estimated_completion: submission.estimated_completion || calculateEstimatedCompletion(submission.created_at)
  };

  // If no processing job exists, return basic status
  if (!processingJob) {
    return {
      ...baseResponse,
      status: submission.status,
      progress: submission.status === 'completed' ? 100 : 0,
      current_step: getCurrentStepFromStatus(submission.status)
    };
  }

  // Build detailed response based on processing job
  const response = {
    ...baseResponse,
    status: processingJob.status,
    progress: processingJob.progress || 0,
    current_step: getCurrentStepFromJobStatus(processingJob.status),
    estimated_completion: processingJob.estimated_completion || baseResponse.estimated_completion
  };

  // Add completion details if status is completed
  if (processingJob.status === 'completed') {
    const episode = await getEpisodeForSubmission(submission.id);
    if (episode) {
      response.episode_id = episode.id;
      response.rss_feed_url = `${process.env['API_BASE_URL'] || 'https://localhost:7071/api'}/feeds/rss.xml`;
    }
  }

  // Add error details if status is failed
  if (processingJob.status === 'failed') {
    response.error_message = processingJob.error_message || 'Processing failed';
  }

  return response;
}

/**
 * Get current processing step based on job status
 */
function getCurrentStepFromJobStatus(status: string): string {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'running':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'unknown';
  }
}

/**
 * Get current processing step based on submission status
 */
function getCurrentStepFromStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'queued';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'unknown';
  }
}

/**
 * Calculate estimated completion time
 */
function calculateEstimatedCompletion(createdAt: Date): string {
  const estimatedMinutes = 15; // Default 15 minutes
  const completionTime = new Date(createdAt.getTime() + (estimatedMinutes * 60 * 1000));
  return completionTime.toISOString();
}

/**
 * Get episode for completed submission
 */
async function getEpisodeForSubmission(submissionId: string): Promise<any | null> {
  try {
    const databaseService = new DatabaseService();
    return await databaseService.getEpisodeBySubmissionId(submissionId);
  } catch (error) {
    logger.warn('Failed to get episode for submission:', { submissionId, error });
    return null;
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Register the function
app.http('statusCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'content/{submission_id}/status',
  handler: statusCheckFunction
});