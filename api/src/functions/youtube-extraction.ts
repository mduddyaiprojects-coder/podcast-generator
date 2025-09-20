import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

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

    // TODO: Implement actual YouTube Data API integration
    // For now, return mock data
    context.log('YouTube Data API integration not implemented, using mock data');
    
    const mockMetadata = generateMockYouTubeMetadata(extractedVideoId!, youtube_url || undefined, content_type);

    context.log('YouTube extraction completed:', {
      video_id: extractedVideoId,
      title: mockMetadata.title,
      duration: mockMetadata.duration,
      view_count: mockMetadata.view_count
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'YouTube metadata extracted successfully',
        video_id: extractedVideoId,
        youtube_url: youtube_url,
        title: mockMetadata.title,
        description: mockMetadata.description,
        channel_title: mockMetadata.channel_title,
        channel_id: mockMetadata.channel_id,
        published_at: mockMetadata.published_at,
        duration: mockMetadata.duration,
        view_count: mockMetadata.view_count,
        like_count: mockMetadata.like_count,
        comment_count: mockMetadata.comment_count,
        thumbnail_url: mockMetadata.thumbnail_url,
        tags: mockMetadata.tags,
        category_id: mockMetadata.category_id,
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

/**
 * Generate mock YouTube metadata for testing
 */
function generateMockYouTubeMetadata(videoId: string, youtubeUrl?: string | null, contentType?: string) {
  const now = new Date();
  const publishedAt = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date within last year
  
  return {
    video_id: videoId,
    youtube_url: youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`,
    title: `Sample YouTube Video ${videoId.substring(0, 6)}`,
    description: 'This is a sample YouTube video description for testing purposes. It contains some example text to demonstrate the metadata extraction functionality.',
    channel_title: 'Sample Channel',
    channel_id: 'UC' + Math.random().toString(36).substr(2, 22),
    published_at: publishedAt.toISOString(),
    duration: formatDuration(Math.floor(Math.random() * 3600) + 60), // 1-60 minutes
    view_count: Math.floor(Math.random() * 1000000) + 1000,
    like_count: Math.floor(Math.random() * 10000) + 100,
    comment_count: Math.floor(Math.random() * 1000) + 10,
    thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    tags: ['sample', 'test', 'youtube', 'video', 'metadata'],
    category_id: '22', // People & Blogs
    content_type: contentType || 'youtube_video'
  };
}

/**
 * Format duration from seconds to HH:MM:SS or MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
