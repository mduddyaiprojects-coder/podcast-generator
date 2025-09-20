import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

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

    // For now, return a simple episodes list without database dependency
    const episodes = generateSampleEpisodes(limit, offset);

    return {
      status: 200,
      jsonBody: {
        episodes,
        pagination: {
          limit,
          offset,
          total: 1, // Sample total
          hasMore: false
        },
        feed: {
          slug: feedSlug,
          title: 'Podcast Generator',
          description: 'AI-generated podcast episodes'
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

function generateSampleEpisodes(limit: number, offset: number) {
  // Generate sample episodes for testing
  const episodes = [];
  const now = new Date();
  
  for (let i = 0; i < Math.min(limit, 3); i++) {
    const episodeDate = new Date(now.getTime() - (i + offset) * 24 * 60 * 60 * 1000);
    episodes.push({
      id: `episode-${i + offset + 1}`,
      title: `Sample Episode ${i + offset + 1}`,
      description: `This is a sample episode ${i + offset + 1} for testing purposes.`,
      audioUrl: `https://podcast-generator.example.com/audio/episode-${i + offset + 1}.mp3`,
      duration: '00:05:00',
      publishedAt: episodeDate.toISOString(),
      slug: `sample-episode-${i + offset + 1}`
    });
  }
  
  return episodes;
}