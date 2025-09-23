import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { RssCacheService } from '../services/rss-cache-service';
import { DatabaseService } from '../services/database-service';
import { logger } from '../utils/logger';

/**
 * GET /api/feeds/{slug}/rss.xml
 * 
 * Generates and returns the RSS feed for the podcast with caching and performance optimization.
 * Since we're using a single public feed, the slug parameter is ignored.
 */
export async function rssFeedFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
    const rssCacheService = new RssCacheService();
    const databaseService = new DatabaseService();

    // Get episodes from database
    const episodes = await databaseService.getEpisodes({
      limit: options.maxEpisodes || 100,
      sortBy: 'pub_date',
      sortOrder: options.sortOrder || 'desc'
    });

    // Get RSS feed with caching
    const rssResult = await rssCacheService.getRssFeed(episodes, feedSlug, options);

    // Set appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'ETag': rssResult.etag,
      'Last-Modified': rssResult.lastModified.toUTCString(),
      'X-Cache': rssResult.fromCache ? 'HIT' : 'MISS',
      'X-Response-Time': `${rssResult.responseTime}ms`
    };

    // Add compression headers if content is compressed
    if (options.compression !== false) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }

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