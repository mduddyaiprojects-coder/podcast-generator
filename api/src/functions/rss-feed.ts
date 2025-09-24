import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';
import { RssGenerator } from '../services/rss-generator';
import { logger } from '../utils/logger';

/**
 * GET /api/feeds/{slug}/rss.xml
 * 
 * Generates and returns the RSS feed for the podcast with caching and performance optimization.
 * Since we're using a single public feed, the slug parameter is ignored.
 */
export async function rssFeedFunction(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    const feedSlug = request.params['slug'];

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

    logger.info('RSS feed request received', { feedSlug });

    // Parse query parameters for cache options
    const options = parseRssOptions(request);
    
    // Initialize services
    const databaseService = new DatabaseService();

    // Get episodes from database
    const episodes = await databaseService.getEpisodes(
      options.maxEpisodes || 100,
      0
    );

    // Get global feed metadata from database
    const globalFeedResult = await databaseService['executeQuery'](async (client) => {
      return await client.query('SELECT * FROM global_feed WHERE id = $1', ['00000000-0000-0000-0000-000000000000']);
    });
    const globalFeed = globalFeedResult.rows[0];

    // Generate RSS feed with database metadata
    const rssGenerator = new RssGenerator();
    const rssContent = await rssGenerator.generateRss(episodes, {
      title: globalFeed?.title || 'AI Podcast Generator',
      description: globalFeed?.description || 'AI-generated podcast episodes from web content, YouTube videos, and documents',
      link: 'https://podcast-gen-api.azurewebsites.net',
      language: 'en-us',
      author: globalFeed?.author || 'AI Podcast Generator',
      email: globalFeed?.admin_email || 'admin@podcast-gen-api.azurewebsites.net',
      category: globalFeed?.category || 'Technology',
      explicit: false,
      artwork_url: globalFeed?.artwork_url || undefined
    });
    
    const rssResult = {
      content: rssContent,
      fromCache: false,
      responseTime: Date.now() - startTime,
      etag: `"${Date.now()}"`,
      lastModified: new Date()
    };

    // Set appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'ETag': rssResult.etag,
      'Last-Modified': rssResult.lastModified.toUTCString(),
      'X-Response-Time': `${rssResult.responseTime}ms`
    };

    logger.info('RSS feed generated successfully', {
      feedSlug,
      episodeCount: episodes.length,
      fromCache: rssResult.fromCache,
      responseTime: rssResult.responseTime,
      contentLength: rssResult.content.length
    });

    return {
      status: 200,
      headers,
      body: rssResult.content
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('RSS feed generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      feedSlug: request.params['slug']
    });

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime}ms`
      },
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate RSS feed',
        details: 'Please try again later'
      }
    };
  }
}

function isValidFeedSlug(slug: string): boolean {
  // Allow alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

function parseRssOptions(request: HttpRequest): {
  includeChapters?: boolean;
  includeTranscript?: boolean;
  maxEpisodes?: number;
  sortOrder?: 'newest' | 'oldest';
  compression?: boolean;
} {
  const query = request.query;
  
  return {
    includeChapters: query.get('chapters') === 'true',
    includeTranscript: query.get('transcript') === 'true',
    maxEpisodes: query.get('limit') ? parseInt(query.get('limit')!, 10) : undefined,
    sortOrder: query.get('sort') === 'oldest' ? 'oldest' : 'newest',
    compression: query.get('compress') !== 'false'
  };
}