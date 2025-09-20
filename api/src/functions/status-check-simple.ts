import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * GET /api/content/{submission_id}/status
 * Simple status check endpoint
 */
export async function statusCheckFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const submissionId = request.params['submission_id'];

    // Basic validation
    if (!submissionId) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'INVALID_REQUEST',
          message: 'Missing submission_id parameter'
        })
      };
    }

    // For now, return a mock status
    // In a real implementation, this would query the database
    const mockStatus = {
      submission_id: submissionId,
      status: 'processing',
      progress: 45,
      current_step: 'content_extraction',
      estimated_completion: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      episode_id: null,
      rss_feed_url: null,
      error_message: null
    };

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockStatus)
    };
  } catch (error) {
    context.error('Status check error:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred while checking status'
      })
    };
  }
}

app.http('status-check', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'content/{submission_id}/status',
  handler: statusCheckFunction
});



