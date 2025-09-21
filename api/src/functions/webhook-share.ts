import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ErrorHandler } from '../utils/error-handler';
import { DatabaseService } from '../services/database-service';
import { ContentSubmission } from '../models/content-submission';

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
        let { url, title, type } = body;

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

    // Clean and validate URL format
    let cleanUrl = url.trim();
    
    // Basic URL cleaning - remove common artifacts
    cleanUrl = cleanUrl.replace(/SpeckitSpeckit/g, '');
    cleanUrl = cleanUrl.replace(/Speckit/g, '');
    
    // Extract the first valid URL if multiple are concatenated
    // Look for the first complete URL pattern
    const urlMatches = cleanUrl.match(/https?:\/\/[^\s]+/g);
    if (urlMatches && urlMatches.length > 0) {
      // Take the first complete URL
      cleanUrl = urlMatches[0];
    }
    
    // Additional cleaning for concatenated URLs
    // If we have something like "https://examplehttps://realurl.com"
    // Extract the real URL part by finding the second https://
    const doubleUrlMatch = cleanUrl.match(/https?:\/\/[^h]*https?:\/\/(.+)/);
    if (doubleUrlMatch) {
      cleanUrl = 'https://' + doubleUrlMatch[1];
    }
    
    // Validate URL format
    try {
      const parsedUrl = new URL(cleanUrl);
      // Additional validation - must have proper protocol and hostname
      if (!parsedUrl.protocol.startsWith('http') || !parsedUrl.hostname.includes('.')) {
        throw new Error('Invalid URL format');
      }
      url = cleanUrl; // Use the cleaned URL
    } catch (urlError) {
      context.log('URL validation error:', urlError);
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_URL',
          message: 'Invalid URL format',
          details: 'The provided URL is not valid or could not be cleaned',
          original_url: url,
          cleaned_url: cleanUrl
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

        // Create content submission and save to database
        const submission = new ContentSubmission({
          content_url: url,
          content_type: contentType as any,
          user_note: title ? `Shared: ${title}` : undefined,
          status: 'pending'
        });

        const db = new DatabaseService();
        await db.connect();
        
        try {
          const submissionId = await db.saveSubmission(submission);
          const estimatedCompletion = new Date(Date.now() + 15 * 60 * 1000).toISOString();

          // Generate RSS feed URL (using the submission ID as feed slug)
          const rssFeedUrl = `https://podcast-gen-api.azurewebsites.net/api/feeds/${submissionId}/rss.xml`;

          context.log('Webhook processed successfully:', {
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
              message: 'Content added to your podcast feed successfully!',
              rss_feed_url: rssFeedUrl,
              estimated_completion: estimatedCompletion,
              content_type: contentType,
              title: title || 'Shared Content'
            }
          };
        } finally {
          await db.disconnect();
        }

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
