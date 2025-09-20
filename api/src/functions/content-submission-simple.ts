import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * POST /api/content
 * Simple content submission endpoint
 */
export async function contentSubmissionFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as any;
    const { content_url, content_type } = body;

    // Basic validation
    if (!content_url || !content_type) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'INVALID_REQUEST',
          message: 'Missing required fields: content_url and content_type'
        })
      };
    }

    // Generate a simple submission ID
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate estimated completion (15 minutes from now)
    const estimatedCompletion = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionId,
        status: 'pending',
        estimated_completion: estimatedCompletion,
        message: 'Content submission received and queued for processing'
      })
    };
  } catch (error) {
    context.error('Content submission error:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred while processing your request'
      })
    };
  }
}

app.http('content-submission', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'content',
  handler: contentSubmissionFunction
});



