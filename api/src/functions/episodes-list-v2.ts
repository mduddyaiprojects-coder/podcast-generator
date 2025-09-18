import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';
import { ValidationMiddleware, CommonSchemas, withValidation } from '../utils/validation';
import { logger } from '../utils/logger';
import Joi from 'joi';

/**
 * GET /api/feeds/{feed_slug}/episodes
 * 
 * Enhanced version using validation middleware
 * Demonstrates query parameter and path parameter validation
 */
export async function episodesListFunctionV2(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Validate request using middleware
    const validationResult = await ValidationMiddleware.validateRequest(request, {
      params: Joi.object({
        feed_slug: CommonSchemas.feedSlug
      }),
      query: CommonSchemas.pagination
    });

    if (!validationResult.isValid) {
      return ValidationMiddleware.createValidationErrorResponse(validationResult.errors!);
    }

    const { feed_slug } = validationResult.data!.params;
    const { limit, offset } = validationResult.data!.query;

    // Get episodes from database
    const databaseService = new DatabaseService();
    const episodes = await databaseService.getEpisodes(limit, offset);
    const totalCount = await databaseService.getEpisodeCount();

    if (!episodes || episodes.length === 0) {
      return ValidationMiddleware.createErrorResponse(
        404,
        'FEED_NOT_FOUND',
        'No episodes found for this feed',
        'The feed exists but contains no episodes'
      );
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
      feed_slug,
      total_count: totalCount,
      episodes: episodeSummaries
    };

    logger.info('Episodes list retrieved successfully', {
      feedSlug: feed_slug,
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
    return ValidationMiddleware.createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An internal error occurred',
      'Please try again later'
    );
  }
}

/**
 * Alternative implementation using the withValidation decorator
 */
export const episodesListFunctionWithDecorator = withValidation({
  params: Joi.object({
    feed_slug: CommonSchemas.feedSlug
  }),
  query: CommonSchemas.pagination
})(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  try {
    const { feed_slug } = request.validatedData.params;
    const { limit, offset } = request.validatedData.query;

    // Get episodes from database
    const databaseService = new DatabaseService();
    const episodes = await databaseService.getEpisodes(limit, offset);
    const totalCount = await databaseService.getEpisodeCount();

    if (!episodes || episodes.length === 0) {
      return ValidationMiddleware.createErrorResponse(
        404,
        'FEED_NOT_FOUND',
        'No episodes found for this feed',
        'The feed exists but contains no episodes'
      );
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
      feed_slug,
      total_count: totalCount,
      episodes: episodeSummaries
    };

    logger.info('Episodes list retrieved successfully', {
      feedSlug: feed_slug,
      episodeCount: episodes.length,
      totalCount,
      limit,
      offset
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      },
      jsonBody: response
    };

  } catch (error) {
    logger.error('Episodes list retrieval failed:', error);
    return ValidationMiddleware.createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An internal error occurred',
      'Please try again later'
    );
  }
});

// Register the function
app.http('episodesListV2', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feeds/{feed_slug}/episodes-v2',
  handler: episodesListFunctionV2
});
