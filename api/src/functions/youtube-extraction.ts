import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { serviceManager } from '../services/service-manager';

/**
 * POST /api/youtube-extract
 *
 * Extracts video metadata from YouTube URLs using YouTube Data API.
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
    };
    
    const { youtube_url, video_id, content_type } = body;

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

    // Extract video ID if not provided
    let extractedVideoId = video_id;
    if (!extractedVideoId && youtube_url) {
      extractedVideoId = extractVideoIdFromUrl(youtube_url);
      if (!extractedVideoId) {
        return {
          status: 400,
          jsonBody: {
            error: 'INVALID_YOUTUBE_URL',
            message: 'Invalid YouTube URL format'
          }
        };
      }
    }

    context.log('Extracting YouTube metadata:', { 
      video_id: extractedVideoId, 
      youtube_url, 
      content_type 
    });

    // Use YouTube service to get real metadata (using ServiceManager)
    const youtubeService = serviceManager.getYouTube();
    const metadata = await youtubeService.getVideoMetadata(extractedVideoId!);

    context.log('YouTube extraction completed:', {
      video_id: extractedVideoId,
      title: metadata.title,
      duration: metadata.duration,
      view_count: metadata.viewCount
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'YouTube metadata extracted successfully',
        video_id: extractedVideoId,
        youtube_url: youtube_url,
        title: metadata.title,
        description: metadata.description,
        channel_title: metadata.channelTitle,
        channel_id: metadata.channelId,
        published_at: metadata.publishedAt,
        duration: metadata.duration,
        view_count: metadata.viewCount,
        like_count: metadata.likeCount,
        comment_count: metadata.commentCount,
        thumbnail_url: metadata.thumbnailUrl,
        tags: metadata.tags,
        category_id: metadata.categoryId,
        content_type: content_type || 'youtube_video',
        extracted_at: new Date().toISOString()
      }
    };

  } catch (error) {
    context.error('YouTube extraction error:', error);
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

/**
 * Extract video ID from YouTube URL
 */
function extractVideoIdFromUrl(url: string): string | undefined {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : undefined;
}
