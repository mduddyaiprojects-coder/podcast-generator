import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ErrorHandler } from '../utils/error-handler';

/**
 * POST /api/webhook/share
 * 
 * Webhook endpoint for iOS Shortcuts and other integrations
 * Accepts shared content and processes it into the podcast feed
 * 
 * Expected payload from iOS Shortcuts:
 * {
 *   "url": "https://example.com/article",
 *   "title": "Article Title",
 *   "content": "Article content or description",
 *   "type": "webpage" // optional, will be auto-detected
 * }
 */
export async function webhookShareFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Webhook share request received');

    // Parse the request body
    const body = await request.json() as {
      url?: string;
      title?: string;
      content?: string;
      type?: string;
    };
    const { url, title, type } = body;

    // Validate required fields
    if (!url) {
      return {
        status: 400,
        jsonBody: {
          error: 'MISSING_URL',
          message: 'URL is required',
          details: 'The "url" field must be provided'
        }
      };
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      context.log('URL validation error:', urlError);
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_URL',
          message: 'Invalid URL format',
          details: 'The provided URL is not valid'
        }
      };
    }

    // Auto-detect content type based on URL
    let contentType = type || 'url';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      contentType = 'youtube';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      contentType = 'twitter';
    } else if (url.includes('reddit.com')) {
      contentType = 'reddit';
    }

    // For now, generate a submission ID and return success
    // TODO: Connect to actual content processing pipeline when database is ready
    const submissionId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const estimatedCompletion = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Generate RSS feed URL (using the submission ID as feed slug)
    const rssFeedUrl = `https://podcast-gen-api.azurewebsites.net/api/feeds/${submissionId}/rss.xml`;

    context.log('Webhook processed successfully (placeholder):', { 
      submissionId, 
      url, 
      contentType, 
      title 
    });

    // Return success response optimized for iOS Shortcuts
    return {
      status: 200,
      jsonBody: {
        success: true,
        submission_id: submissionId,
        message: 'Content added to your podcast feed (processing will be enabled soon)',
        rss_feed_url: rssFeedUrl,
        estimated_completion: estimatedCompletion,
        content_type: contentType,
        title: title || 'Shared Content'
      }
    };

  } catch (error) {
    context.log('Webhook share error:', error);
    return ErrorHandler.handleError(error, request, context, {
      includeStack: false,
      logErrors: true,
      sanitizeErrors: true
    });
  }
}

// Function is exported above in the function declaration
