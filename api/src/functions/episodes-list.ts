import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';
import { logger } from '../utils/logger';

/**
 * GET /api/feeds/{feed_slug}/episodes
 * 
 * Returns a paginated list of episodes in the podcast feed.
 * Since we're using a single public feed, the feed_slug parameter is ignored.
 */
export async function episodesListFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const feedSlug = request.params.feed_slug;
    const limit = parseInt(request.query.get('limit') || '50');
    const offset = parseInt(request.query.get('offset') || '0');

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

    // Validate query parameters
    if (limit < 1 || limit > 100) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_LIMIT',
          message: 'Invalid limit parameter',
          details: 'limit must be between 1 and 100'
        }
      };
    }

    if (offset < 0) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_OFFSET',
          message: 'Invalid offset parameter',
          details: 'offset must be 0 or greater'
        }
      };
    }

    // Get episodes from database
    const databaseService = new DatabaseService();
    const episodes = await databaseService.getEpisodes(limit, offset);
    const totalCount = await databaseService.getEpisodeCount();

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

    // Convert episodes to API response format
    const episodeSummaries = episodes.map(episode => ({
      episode_id: episode.id,
      title: episode.title,
      description: episode.description,
      audio_url: episode.audio_url,
      duration: episode.audio_duration,
      size: episode.audio_size,
      pub_date: episode.pub_date?.toISOString(),
      source_url: episode.source_url
    }));

    const response = {
      feed_slug: feedSlug,
      total_count: totalCount,
      episodes: episodeSummaries
    };

    logger.info('Episodes list retrieved successfully', {
      feedSlug,
      episodeCount: episodes.length,
      totalCount,
      limit,
      offset
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // 1 minute cache
      },
      jsonBody: response
    };

  } catch (error) {
    logger.error('Episodes list retrieval failed:', error);
    
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
app.http('episodesList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feeds/{feed_slug}/episodes',
  handler: episodesListFunction
});
