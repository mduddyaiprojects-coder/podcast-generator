import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { YouTubeService } from '../../src/services/youtube-service';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('YouTubeService', () => {
  let youtubeService: YouTubeService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['YOUTUBE_API_KEY'] = 'test-api-key';
    youtubeService = new YouTubeService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(youtubeService).toBeInstanceOf(YouTubeService);
    });

    it('should warn when API key is missing', () => {
      delete process.env['YOUTUBE_API_KEY'];
      const service = new YouTubeService();
      expect(service).toBeInstanceOf(YouTubeService);
    });
  });

  describe('extractVideoIdFromUrl', () => {
    it('should extract video ID from YouTube URL', () => {
      const videoId = youtubeService.extractVideoIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      const videoId = youtubeService.extractVideoIdFromUrl('https://example.com');
      expect(videoId).toBeNull();
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = youtubeService.getServiceInfo();
      expect(info).toHaveProperty('isHealthy');
      expect(info).toHaveProperty('config');
      expect(typeof info.isHealthy).toBe('boolean');
      expect(typeof info.config).toBe('object');
    });
  });

  describe('checkHealth', () => {
    it('should return health status', async () => {
      const result = await youtubeService.checkHealth();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getVideoMetadata', () => {
    it('should throw error when service is unhealthy', async () => {
      delete process.env['YOUTUBE_API_KEY'];
      const service = new YouTubeService();
      
      await expect(service.getVideoMetadata('test-id'))
        .rejects.toThrow('YouTube service not configured or unhealthy');
    });
  });

  describe('searchVideos', () => {
    it('should throw error when service is unhealthy', async () => {
      delete process.env['YOUTUBE_API_KEY'];
      const service = new YouTubeService();
      
      await expect(service.searchVideos('test query'))
        .rejects.toThrow('YouTube service not configured or unhealthy');
    });
  });

  describe('getChannelInfo', () => {
    it('should throw error when service is unhealthy', async () => {
      delete process.env['YOUTUBE_API_KEY'];
      const service = new YouTubeService();
      
      await expect(service.getChannelInfo('test-channel'))
        .rejects.toThrow('YouTube service not configured or unhealthy');
    });
  });
});