import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import { RssFeedService } from '../../src/services/rss-feed-service';
import { DatabaseService } from '../../src/services/database-service';
import { RssGenerator } from '../../src/services/rss-generator';

// Mock dependencies
jest.mock('../../src/services/rss-generator');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const MockedRssGenerator = RssGenerator as jest.MockedClass<typeof RssGenerator>;

describe('RssFeedService', () => {
  let service: RssFeedService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockRssGenerator: jest.Mocked<RssGenerator>;

  beforeEach(() => {
    mockDatabaseService = {
      getEpisodes: jest.fn()
    } as any;

    mockRssGenerator = {
      generateRss: jest.fn()
    } as any;

    MockedDatabaseService.mockImplementation(() => mockDatabaseService);
    MockedRssGenerator.mockImplementation(() => mockRssGenerator);

    service = new RssFeedService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateRssFeed', () => {
    it('should generate RSS feed successfully', async () => {
      const mockEpisodes = [
        { id: 'episode-1', title: 'Test Episode 1' },
        { id: 'episode-2', title: 'Test Episode 2' }
      ];
      const mockRssContent = '<?xml version="1.0"?><rss>...</rss>';

      mockDatabaseService.getEpisodes.mockResolvedValue(mockEpisodes as any);
      mockRssGenerator.generateRss.mockResolvedValue(mockRssContent);

      const result = await service.generateRssFeed();

      expect(result).toBe(mockRssContent);
      expect(mockDatabaseService.getEpisodes).toHaveBeenCalledWith(50, 0);
      expect(mockRssGenerator.generateRss).toHaveBeenCalledWith(mockEpisodes as any);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDatabaseService.getEpisodes.mockRejectedValue(error);

      await expect(service.generateRssFeed()).rejects.toThrow('Database connection failed');
    });

    it('should handle RSS generation errors', async () => {
      const mockEpisodes = [{ id: 'episode-1', title: 'Test Episode 1' }];
      const error = new Error('RSS generation failed');

      mockDatabaseService.getEpisodes.mockResolvedValue(mockEpisodes as any);
      mockRssGenerator.generateRss.mockRejectedValue(error);

      await expect(service.generateRssFeed()).rejects.toThrow('RSS generation failed');
    });

    it('should generate RSS feed with feed ID parameter', async () => {
      const mockEpisodes = [{ id: 'episode-1', title: 'Test Episode 1' }];
      const mockRssContent = '<?xml version="1.0"?><rss>...</rss>';

      mockDatabaseService.getEpisodes.mockResolvedValue(mockEpisodes as any);
      mockRssGenerator.generateRss.mockResolvedValue(mockRssContent);

      const result = await service.generateRssFeed('custom-feed');

      expect(result).toBe(mockRssContent);
      expect(mockDatabaseService.getEpisodes).toHaveBeenCalledWith(50, 0);
    });
  });
});
