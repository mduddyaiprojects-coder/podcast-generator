import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';

/**
 * GET /api/feeds/{slug}/episodes
 * 
 * Returns a paginated list of episodes in the podcast feed.
 * Since we're using a single public feed, the slug parameter is ignored.
 */
export async function episodesListFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const feedSlug = request.params['slug'];
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

    context.log('Episodes list request received for slug:', feedSlug, 'limit:', limit, 'offset:', offset);

    // Get episodes from database
    const databaseService = new DatabaseService();
    const episodes = await databaseService.getEpisodes(limit, offset);
    
    // Convert episodes to the expected format
    const formattedEpisodes = episodes.map(episode => ({
      id: episode.id,
      title: episode.title,
      description: episode.description,
      audioUrl: episode.audio_url,
      duration: episode.getFormattedDuration(),
      publishedAt: episode.pub_date.toISOString(),
      slug: episode.id // Using ID as slug for now
    }));

    return {
      status: 200,
      jsonBody: {
        episodes: formattedEpisodes,
        pagination: {
          limit,
          offset,
          total: episodes.length,
          hasMore: episodes.length === limit
        },
        feed: {
          slug: feedSlug,
          title: 'AI Podcast Generator',
          description: 'AI-generated podcast episodes from web content, YouTube videos, and documents'
        }
      }
    };

  } catch (error) {
    context.log('Episodes list error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve episodes',
        details: 'Please try again later'
      }
    };
  }
}

function isValidFeedSlug(slug: string): boolean {
  // Allow alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

// Removed generateSampleEpisodes function - now using real database data