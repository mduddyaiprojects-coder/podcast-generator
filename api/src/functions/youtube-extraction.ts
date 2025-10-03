import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ingestYouTubeVideo } from '../integrations/youtube';
import { logger } from '../utils/logger';

/**
 * POST /api/youtube-extract
 *
 * Ingests YouTube videos as content source for podcast generation.
 * Extracts metadata, transcript, and audio information.
 * 
 * Requirements:
 * - FR-004: YouTube Ingestion as Source
 */
export async function youtubeExtractionFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('YouTube extraction request received');

    const body = await request.json() as { 
      youtube_url?: string; 
      video_id?: string;
      content_type?: string;
      include_transcript?: boolean;
      include_audio?: boolean;
    };
    
    const { 
      youtube_url, 
      video_id, 
      content_type,
      include_transcript = true,
      include_audio = false 
    } = body;

    // Basic validation
    if (!youtube_url && !video_id) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_REQUEST',
          message: 'Missing required field: youtube_url or video_id'
        }
      };
    }

    // Use video URL or construct from ID
    const videoUrl = youtube_url || `https://www.youtube.com/watch?v=${video_id}`;

    context.log('Ingesting YouTube content:', { 
      videoUrl, 
      content_type,
      include_transcript,
      include_audio
    });

    // Use YouTube integration layer (FR-004)
    const result = await ingestYouTubeVideo(videoUrl, {
      includeTranscript: include_transcript,
      includeAudio: include_audio,
      audioQuality: 'high'
    });

    logger.info('YouTube ingestion completed', {
      videoId: result.videoId,
      title: result.title.substring(0, 50),
      hasTranscript: !!result.transcript,
      hasAudioUrl: !!result.audioUrl
    });

    context.log('YouTube extraction completed:', {
      video_id: result.videoId,
      title: result.title,
      duration: result.duration,
      has_transcript: !!result.transcript,
      has_audio: !!result.audioUrl
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'YouTube content ingested successfully',
        video_id: result.videoId,
        youtube_url: videoUrl,
        title: result.title,
        description: result.description,
        channel_title: result.channelTitle,
        published_at: result.publishedAt,
        duration: result.duration,
        view_count: result.metadata.viewCount,
        like_count: result.metadata.likeCount,
        thumbnail_url: result.thumbnailUrl,
        tags: result.metadata.tags,
        content_type: content_type || 'youtube_video',
        
        // Ingestion results (FR-004)
        transcript: result.transcript,
        transcript_length: result.transcript?.length,
        audio_url: result.audioUrl,
        audio_format: result.audioFormat,
        
        extracted_at: result.extractedAt.toISOString(),
        extraction_method: result.extractionMethod
      }
    };

  } catch (error) {
    context.error('YouTube extraction error:', error);
    logger.error('YouTube extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred during YouTube extraction',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
