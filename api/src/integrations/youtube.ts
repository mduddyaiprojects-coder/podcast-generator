import { logger } from '../utils/logger';
import { serviceManager } from '../services/service-manager';

/**
 * YouTube Integration Module
 * 
 * Handles ingestion of YouTube videos as a content source for podcast generation.
 * This module extracts metadata, transcripts, and audio from YouTube videos.
 * 
 * Requirements:
 * - FR-004: YouTube Ingestion as Source
 *   "System MUST support ingesting YouTube links as a content source for 
 *    podcast generation. The system MUST NOT attempt to publish or update 
 *    content on YouTube as a distribution channel."
 * 
 * Note: YouTube is a SOURCE only, not a distribution/publishing target.
 */

/**
 * YouTube ingestion result containing all extracted data
 */
export interface YouTubeIngestionResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: string;
  publishedAt: string;
  thumbnailUrl: string;
  
  // Content for podcast generation
  transcript?: string;
  audioUrl?: string;
  audioFormat?: string;
  
  // Metadata
  metadata: {
    viewCount: number;
    likeCount: number;
    tags: string[];
    language?: string;
  };
  
  // Status
  extractedAt: Date;
  extractionMethod: 'youtube-api' | 'youtube-transcript-api' | 'yt-dlp' | 'stub';
}

/**
 * Options for YouTube ingestion
 */
export interface YouTubeIngestionOptions {
  includeTranscript?: boolean;
  includeAudio?: boolean;
  audioQuality?: 'high' | 'medium' | 'low';
  transcriptLanguage?: string;
}

/**
 * Ingest YouTube video as content source for podcast generation
 * 
 * This is the main entry point for YouTube ingestion (FR-004).
 * Extracts video metadata, transcript (if available), and audio URL.
 * 
 * @param videoUrl - YouTube video URL or video ID
 * @param options - Ingestion options
 * @returns Complete ingestion result for podcast pipeline
 */
export async function ingestYouTubeVideo(
  videoUrl: string,
  options: YouTubeIngestionOptions = {}
): Promise<YouTubeIngestionResult> {
  try {
    logger.info('YouTube ingestion started', { 
      videoUrl, 
      options 
    });

    // Extract video ID from URL
    const videoId = extractVideoIdFromUrl(videoUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube URL: ${videoUrl}`);
    }

    // Get video metadata using YouTube service
    const youtubeService = serviceManager.getYouTube();
    const metadata = await youtubeService.getVideoMetadata(videoId);

    logger.info('YouTube metadata extracted', {
      videoId,
      title: metadata.title.substring(0, 50),
      duration: metadata.duration
    });

    // Extract transcript if requested
    let transcript: string | undefined;
    let transcriptMethod: YouTubeIngestionResult['extractionMethod'] = 'youtube-api';
    
    if (options.includeTranscript !== false) {
      try {
        transcript = await extractTranscript(videoId, options.transcriptLanguage);
        transcriptMethod = 'youtube-transcript-api';
        logger.info('YouTube transcript extracted', {
          videoId,
          transcriptLength: transcript?.length
        });
      } catch (error) {
        logger.warn('YouTube transcript extraction failed, continuing without transcript', {
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Don't fail ingestion if transcript unavailable
      }
    }

    // Extract audio URL if requested
    let audioUrl: string | undefined;
    let audioFormat: string | undefined;
    
    if (options.includeAudio) {
      try {
        const audioInfo = await extractAudioUrl(videoId, options.audioQuality);
        audioUrl = audioInfo.url;
        audioFormat = audioInfo.format;
        logger.info('YouTube audio URL extracted', {
          videoId,
          format: audioFormat
        });
      } catch (error) {
        logger.warn('YouTube audio extraction failed', {
          videoId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue without audio URL - can be extracted later
      }
    }

    // Build ingestion result
    const result: YouTubeIngestionResult = {
      videoId,
      title: metadata.title,
      description: metadata.description,
      channelTitle: metadata.channelTitle,
      duration: metadata.duration,
      publishedAt: metadata.publishedAt,
      thumbnailUrl: metadata.thumbnailUrl,
      transcript,
      audioUrl,
      audioFormat,
      metadata: {
        viewCount: metadata.viewCount,
        likeCount: metadata.likeCount,
        tags: metadata.tags,
        language: metadata.language
      },
      extractedAt: new Date(),
      extractionMethod: transcriptMethod
    };

    logger.info('YouTube ingestion completed successfully', {
      videoId,
      hasTranscript: !!transcript,
      hasAudioUrl: !!audioUrl,
      method: result.extractionMethod
    });

    return result;

  } catch (error) {
    logger.error('YouTube ingestion failed', {
      videoUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(`YouTube ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract video ID from YouTube URL
 * Supports various YouTube URL formats
 */
export function extractVideoIdFromUrl(url: string): string | null {
  // If it's already just the video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // Standard YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract transcript from YouTube video
 * 
 * Implementation Strategy (MVP):
 * 1. Use youtube-transcript library (if available)
 * 2. Fallback to stub response for MVP
 * 
 * Future Enhancement (T025):
 * - Use YouTube Caption API
 * - Support multiple languages
 * - Handle auto-generated vs manual captions
 * 
 * @param videoId - YouTube video ID
 * @param language - Preferred transcript language (default: 'en')
 * @returns Transcript text
 */
async function extractTranscript(
  videoId: string,
  language: string = 'en'
): Promise<string> {
  logger.info('Extracting transcript from YouTube', { videoId, language });

  try {
    // MVP Implementation: Stub response
    // TODO (T025): Integrate with youtube-transcript or YouTube Caption API
    
    logger.warn('Transcript extraction using stub (MVP)', { videoId });
    
    // Return stub transcript for MVP
    return generateStubTranscript(videoId);

  } catch (error) {
    logger.error('Transcript extraction failed', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(`Failed to extract transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract audio URL from YouTube video
 * 
 * Implementation Strategy (MVP):
 * 1. Return YouTube video URL (audio can be extracted server-side)
 * 2. Future: Use yt-dlp or similar for direct audio URL
 * 
 * Note: This doesn't download audio, just provides URL for download/streaming.
 * 
 * @param videoId - YouTube video ID
 * @param quality - Audio quality preference
 * @returns Audio URL and format information
 */
async function extractAudioUrl(
  videoId: string,
  quality: 'high' | 'medium' | 'low' = 'high'
): Promise<{ url: string; format: string }> {
  logger.info('Extracting audio URL from YouTube', { videoId, quality });

  try {
    // MVP Implementation: Return YouTube video URL
    // The audio extraction will happen server-side during podcast generation
    // TODO (T026): Integrate with yt-dlp for direct audio stream URLs
    
    logger.info('Audio URL using YouTube video URL (MVP)', { videoId });
    
    return {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      format: 'youtube-video' // Indicates server-side extraction needed
    };

  } catch (error) {
    logger.error('Audio URL extraction failed', {
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(`Failed to extract audio URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate stub transcript for MVP testing
 * Returns placeholder content based on video ID
 * 
 * TODO (T025): Remove this when real transcript extraction is implemented
 */
function generateStubTranscript(videoId: string): string {
  return `[STUB TRANSCRIPT for video ${videoId}]

This is a placeholder transcript generated for MVP testing purposes.
In production, this would contain the actual transcript extracted from YouTube.

The transcript would include:
- Spoken dialogue from the video
- Timestamps for each segment
- Speaker identification (if available)
- Proper punctuation and formatting

This stub allows the podcast generation pipeline to proceed with testing
while real transcript extraction is being implemented.

Future enhancement (T025) will integrate:
- YouTube Caption API for official captions
- youtube-transcript library for auto-generated captions
- Multi-language support
- Timestamp synchronization with audio
`;
}

/**
 * Validate YouTube video is accessible and ingestible
 * 
 * Quick check before full ingestion to avoid wasted API calls.
 * 
 * @param videoUrl - YouTube video URL or ID
 * @returns true if video is valid and accessible
 */
export async function validateYouTubeVideo(videoUrl: string): Promise<boolean> {
  try {
    const videoId = extractVideoIdFromUrl(videoUrl);
    if (!videoId) {
      logger.warn('Invalid YouTube URL format', { videoUrl });
      return false;
    }

    // Quick metadata check
    const youtubeService = serviceManager.getYouTube();
    await youtubeService.getVideoMetadata(videoId);
    
    return true;

  } catch (error) {
    logger.warn('YouTube video validation failed', {
      videoUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Check if YouTube ingestion is operational
 * Used by health checks (FR-005)
 * 
 * @returns Health status and details
 */
export async function checkYouTubeIngestionHealth(): Promise<{
  status: 'OK' | 'DEGRADED' | 'FAILED';
  message: string;
  lastSuccessAt?: Date;
}> {
  try {
    logger.debug('Checking YouTube ingestion health');

    // Check YouTube service health
    const youtubeService = serviceManager.getYouTube();
    const isHealthy = await youtubeService.checkHealth();

    if (isHealthy) {
      return {
        status: 'OK',
        message: 'YouTube ingestion is operational',
        lastSuccessAt: new Date() // In production, track actual last success
      };
    } else {
      return {
        status: 'DEGRADED',
        message: 'YouTube service is not healthy'
      };
    }

  } catch (error) {
    logger.error('YouTube ingestion health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      status: 'FAILED',
      message: `YouTube ingestion health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
