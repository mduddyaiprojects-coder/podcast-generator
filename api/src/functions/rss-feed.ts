import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { RssFeedService } from '../services/rss-feed-service';
import { logger } from '../utils/logger';

export async function rssFeedFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const feedId = request.params['feedId'];
    context.log(`RSS feed request for feedId: ${feedId}`);

    const rssService = new RssFeedService();
    const rssContent = await rssService.generateRssFeed(feedId);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      },
      body: rssContent
    };

  } catch (error) {
    logger.error('RSS feed generation error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: 'Failed to generate RSS feed'
      }
    };
  }
}
