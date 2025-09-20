import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function statusCheckFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const submissionId = request.params['id'];

    if (!submissionId) {
      return {
        status: 400,
        jsonBody: {
          error: 'MISSING_SUBMISSION_ID',
          message: 'Submission ID is required',
          details: 'Please provide a valid submission ID'
        }
      };
    }

    context.log('Status check request received for submission:', submissionId);

    // For now, return a mock status without database dependency
    const status = generateMockStatus(submissionId);

    return {
      status: 200,
      jsonBody: {
        submission_id: submissionId,
        status: status.status,
        progress: status.progress,
        message: status.message,
        created_at: status.created_at,
        updated_at: status.updated_at,
        estimated_completion: status.estimated_completion
      }
    };

  } catch (error) {
    context.log('Status check error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve status',
        details: 'Please try again later'
      }
    };
  }
}

function generateMockStatus(_submissionId: string) {
  // Generate a mock status based on submission ID
  const now = new Date();
  const created = new Date(now.getTime() - Math.random() * 30 * 60 * 1000); // Random time within last 30 minutes
  
  const statuses = ['pending', 'processing', 'completed', 'failed'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  let progress = 0;
  let message = '';
  
  switch (status) {
    case 'pending':
      progress = 10;
      message = 'Content is queued for processing';
      break;
    case 'processing':
      progress = Math.floor(Math.random() * 80) + 20; // 20-100%
      message = 'Content is being processed';
      break;
    case 'completed':
      progress = 100;
      message = 'Processing completed successfully';
      break;
    case 'failed':
      progress = 0;
      message = 'Processing failed';
      break;
  }
  
  return {
    status,
    progress,
    message,
    created_at: created.toISOString(),
    updated_at: now.toISOString(),
    estimated_completion: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  };
}