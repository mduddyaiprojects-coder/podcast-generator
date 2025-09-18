import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { RSSGenerator } from '../services/rss-generator';
import { DatabaseService } from '../services/database-service';
import { logger } from '../utils/logger';

/**
 * GET /api/feeds/{feed_slug}/rss.xml
 * 
 * Generates and returns the RSS feed for the podcast.
 * Since we're using a single public feed, the feed_slug parameter is ignored.
 */
export async function rssFeedFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const feedSlug = request.params.feed_slug;

    // Validate feed slug format
    if (!feedSlug || !isValidFeedSlug(feedSlug)) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_FEED_SLUG',
          message: 'Invalid feed slug format',
          details: 'feed_slug must contain only alphanumeric characters, hyphens, and underscores'
        }
      };
    }

    // Get episodes from database
    const databaseService = new DatabaseService();
    const episodes = await databaseService.getEpisodes();

    if (!episodes || episodes.length === 0) {
      return {
        status: 404,
        jsonBody: {
          error: 'FEED_NOT_FOUND',
          message: 'No episodes found for this feed',
          details: 'The feed exists but contains no episodes'
        }
      };
    }

    // Generate RSS feed
    const rssGenerator = new RSSGenerator();
    const rssContent = await rssGenerator.generateRss(episodes);

    logger.info('RSS feed generated successfully', {
      feedSlug,
      episodeCount: episodes.length
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache
      },
      body: rssContent
    };

  } catch (error) {
    logger.error('RSS feed generation failed:', error);
    
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
 * Validate feed slug format
 */
function isValidFeedSlug(slug: string): boolean {
  const slugRegex = /^[a-zA-Z0-9-_]+$/;
  return slugRegex.test(slug);
}

// Register the function
app.http('rssFeed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feeds/{feed_slug}/rss.xml',
  handler: rssFeedFunction
});