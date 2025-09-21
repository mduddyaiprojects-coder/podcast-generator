import { logger } from '../utils/logger';

export interface YouTubeConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
  tags: string[];
  categoryId: string;
  language?: string;
  defaultAudioLanguage?: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface YouTubeChannelInfo {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  customUrl?: string;
  thumbnailUrl: string;
}

export class YouTubeService {
  private config: YouTubeConfig;
  private isHealthy: boolean = true;

  constructor() {
    this.config = {
      apiKey: process.env['YOUTUBE_API_KEY'] || '',
      baseUrl: process.env['YOUTUBE_BASE_URL'] || 'https://www.googleapis.com/youtube/v3'
    };

    if (!this.config.apiKey) {
      logger.warn('YouTube API key not configured - service will not function');
      this.isHealthy = false;
    }
  }

  /**
   * Check if the YouTube service is healthy and configured
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isHealthy) {
      return false;
    }

    try {
      // Test API connectivity with a simple search
      const response = await fetch(`${this.config.baseUrl}/search?part=snippet&q=test&type=video&maxResults=1&key=${this.config.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      logger.info('YouTube service health check passed');
      return true;
    } catch (error) {
      logger.error('YouTube health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get video metadata by video ID
   */
  async getVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    if (!this.isHealthy) {
      throw new Error('YouTube service not configured or unhealthy');
    }

    try {
      logger.info('Fetching video metadata from YouTube', { videoId });

      const response = await fetch(
        `${this.config.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${this.config.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { items: any[] };

      if (!data.items || data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const video = data.items[0];
      const snippet = video.snippet;
      const statistics = video.statistics;
      const contentDetails = video.contentDetails;

      const metadata: YouTubeVideoMetadata = {
        videoId: videoId,
        title: snippet.title,
        description: snippet.description,
        channelTitle: snippet.channelTitle,
        channelId: snippet.channelId,
        publishedAt: snippet.publishedAt,
        duration: this.parseDuration(contentDetails.duration),
        viewCount: parseInt(statistics.viewCount || '0'),
        likeCount: parseInt(statistics.likeCount || '0'),
        commentCount: parseInt(statistics.commentCount || '0'),
        thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        tags: snippet.tags || [],
        categoryId: snippet.categoryId,
        language: snippet.defaultLanguage,
        defaultAudioLanguage: snippet.defaultAudioLanguage
      };

      logger.info('Successfully fetched video metadata from YouTube', {
        videoId,
        title: metadata.title.substring(0, 50),
        duration: metadata.duration,
        viewCount: metadata.viewCount
      });

      return metadata;

    } catch (error) {
      logger.error('YouTube video metadata fetching failed:', error);
      this.isHealthy = false;
      throw new Error(`Video metadata fetching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for videos
   */
  async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
    if (!this.isHealthy) {
      throw new Error('YouTube service not configured or unhealthy');
    }

    try {
      logger.info('Searching videos on YouTube', { query, maxResults });

      const response = await fetch(
        `${this.config.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${this.config.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { items: any[] };

      const results: YouTubeSearchResult[] = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || ''
      }));

      logger.info('Successfully searched videos on YouTube', {
        query,
        resultCount: results.length
      });

      return results;

    } catch (error) {
      logger.error('YouTube video search failed:', error);
      this.isHealthy = false;
      throw new Error(`Video search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelId: string): Promise<YouTubeChannelInfo> {
    if (!this.isHealthy) {
      throw new Error('YouTube service not configured or unhealthy');
    }

    try {
      logger.info('Fetching channel information from YouTube', { channelId });

      const response = await fetch(
        `${this.config.baseUrl}/channels?part=snippet,statistics&id=${channelId}&key=${this.config.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { items: any[] };

      if (!data.items || data.items.length === 0) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const channel = data.items[0];
      const snippet = channel.snippet;
      const statistics = channel.statistics;

      const channelInfo: YouTubeChannelInfo = {
        channelId: channelId,
        title: snippet.title,
        description: snippet.description,
        subscriberCount: parseInt(statistics.subscriberCount || '0'),
        videoCount: parseInt(statistics.videoCount || '0'),
        viewCount: parseInt(statistics.viewCount || '0'),
        customUrl: snippet.customUrl,
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || ''
      };

      logger.info('Successfully fetched channel information from YouTube', {
        channelId,
        title: channelInfo.title,
        subscriberCount: channelInfo.subscriberCount
      });

      return channelInfo;

    } catch (error) {
      logger.error('YouTube channel information fetching failed:', error);
      this.isHealthy = false;
      throw new Error(`Channel information fetching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoIdFromUrl(url: string): string | null {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] || null : null;
  }

  /**
   * Parse YouTube duration format (PT1H2M3S) to readable format (1:02:03)
   */
  private parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get service status and configuration info
   */
  getServiceInfo(): { isHealthy: boolean; config: Partial<YouTubeConfig> } {
    return {
      isHealthy: this.isHealthy,
      config: {
        apiKey: this.config.apiKey ? '***configured***' : 'not configured',
        baseUrl: this.config.baseUrl
      }
    };
  }
}
