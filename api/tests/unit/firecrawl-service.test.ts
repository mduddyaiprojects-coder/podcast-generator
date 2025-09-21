import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FirecrawlService } from '../../src/services/firecrawl-service';

// Mock the FirecrawlApp
jest.mock('@mendable/firecrawl-js', () => ({
  FirecrawlApp: jest.fn().mockImplementation(() => ({
    scrapeUrl: jest.fn(),
  })),
}));

describe('FirecrawlService', () => {
  let firecrawlService: FirecrawlService;
  let mockFirecrawlApp: any;

  beforeEach(() => {
    // Reset environment variables
    process.env['FIRECRAWL_API_KEY'] = 'test-api-key';
    process.env['FIRECRAWL_API_URL'] = 'https://api.firecrawl.dev';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked FirecrawlApp
    const { FirecrawlApp } = require('@mendable/firecrawl-js');
    mockFirecrawlApp = new FirecrawlApp();
    
    firecrawlService = new FirecrawlService();
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(firecrawlService.getConfig().apiUrl).toBe('https://api.firecrawl.dev');
      expect(firecrawlService.getHealthStatus()).toBe(true);
    });

    it('should handle missing API key', () => {
      delete process.env['FIRECRAWL_API_KEY'];
      const service = new FirecrawlService();
      expect(service.getHealthStatus()).toBe(true); // Initially healthy
    });
  });

  describe('extractContent', () => {
    it('should extract content successfully', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          metadata: {
            title: 'Test Article',
            author: 'Test Author',
            publishedTime: '2024-01-01T00:00:00Z',
            sourceURL: 'https://example.com/article'
          },
          markdown: '# Test Article\n\nThis is test content.',
          html: '<h1>Test Article</h1><p>This is test content.</p>'
        }
      };

      mockFirecrawlApp.scrapeUrl.mockResolvedValue(mockScrapeResult);

      const result = await firecrawlService.extractContent('https://example.com/article');

      expect(result).toEqual({
        title: 'Test Article',
        content: '# Test Article\n\nThis is test content.',
        author: 'Test Author',
        publishedDate: new Date('2024-01-01T00:00:00Z')
      });

      expect(mockFirecrawlApp.scrapeUrl).toHaveBeenCalledWith('https://example.com/article', {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        removeBase64Images: true,
        includeTags: ['title', 'meta', 'article', 'main'],
        excludeTags: ['nav', 'footer', 'aside', 'script', 'style']
      });
    });

    it('should handle missing API key', async () => {
      delete process.env['FIRECRAWL_API_KEY'];
      const service = new FirecrawlService();

      await expect(service.extractContent('https://example.com'))
        .rejects.toThrow('Firecrawl API key not configured');
    });

    it('should handle scraping failure', async () => {
      const mockScrapeResult = {
        success: false,
        error: 'Scraping failed'
      };

      mockFirecrawlApp.scrapeUrl.mockResolvedValue(mockScrapeResult);

      await expect(firecrawlService.extractContent('https://example.com'))
        .rejects.toThrow('Content extraction failed: Scraping failed');
    });

    it('should handle scraping exception', async () => {
      mockFirecrawlApp.scrapeUrl.mockRejectedValue(new Error('Network error'));

      await expect(firecrawlService.extractContent('https://example.com'))
        .rejects.toThrow('Content extraction failed: Network error');
    });

    it('should extract title from multiple sources', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          metadata: {
            og: {
              title: 'OG Title'
            },
            sourceURL: 'https://example.com'
          },
          markdown: 'Test content'
        }
      };

      mockFirecrawlApp.scrapeUrl.mockResolvedValue(mockScrapeResult);

      const result = await firecrawlService.extractContent('https://example.com');

      expect(result.title).toBe('OG Title');
    });

    it('should fallback to hostname for title', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          metadata: {
            sourceURL: 'https://www.example.com/article'
          },
          markdown: 'Test content'
        }
      };

      mockFirecrawlApp.scrapeUrl.mockResolvedValue(mockScrapeResult);

      const result = await firecrawlService.extractContent('https://example.com');

      expect(result.title).toBe('example.com');
    });
  });

  describe('checkHealth', () => {
    it('should return true when API is healthy', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          markdown: 'Test content'
        }
      };

      mockFirecrawlApp.scrapeUrl.mockResolvedValue(mockScrapeResult);

      const isHealthy = await firecrawlService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(mockFirecrawlApp.scrapeUrl).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],
        onlyMainContent: true
      });
    });

    it('should return false when API is unhealthy', async () => {
      const mockScrapeResult = {
        success: false,
        error: 'API error'
      };

      mockFirecrawlApp.scrapeUrl.mockResolvedValue(mockScrapeResult);

      const isHealthy = await firecrawlService.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when API throws exception', async () => {
      mockFirecrawlApp.scrapeUrl.mockRejectedValue(new Error('Network error'));

      const isHealthy = await firecrawlService.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      delete process.env['FIRECRAWL_API_KEY'];
      const service = new FirecrawlService();

      const isHealthy = await service.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      expect(firecrawlService.getHealthStatus()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return configuration without API key', () => {
      const config = firecrawlService.getConfig();
      
      expect(config).toEqual({
        apiUrl: 'https://api.firecrawl.dev'
      });
      expect(config).not.toHaveProperty('apiKey');
    });
  });
});
