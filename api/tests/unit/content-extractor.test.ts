import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ContentExtractor, ExtractedContent, YouTubeVideoInfo, DocumentInfo } from '../../src/services/content-extractor';
import { ContentSubmission, ContentType } from '../../src/models/content-submission';
import { FirecrawlService } from '../../src/services/firecrawl-service';
import { AzureOpenAIService } from '../../src/services/azure-openai-service';

// Mock the dependencies
jest.mock('../../src/services/firecrawl-service');
jest.mock('../../src/services/azure-openai-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Configure Jest to force exit
jest.setTimeout(10000);

describe('ContentExtractor', () => {
  let contentExtractor: ContentExtractor;
  let mockFirecrawlService: jest.Mocked<FirecrawlService>;
  let mockAzureOpenAIService: jest.Mocked<AzureOpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockFirecrawlService = new FirecrawlService() as jest.Mocked<FirecrawlService>;
    mockAzureOpenAIService = new AzureOpenAIService() as jest.Mocked<AzureOpenAIService>;
    
    // Mock the constructor dependencies
    (FirecrawlService as jest.MockedClass<typeof FirecrawlService>).mockImplementation(() => mockFirecrawlService);
    (AzureOpenAIService as jest.MockedClass<typeof AzureOpenAIService>).mockImplementation(() => mockAzureOpenAIService);
    
    contentExtractor = new ContentExtractor();
  });

  afterEach(() => {
    // Clear all timers to prevent Jest from hanging
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Force cleanup of any remaining handles
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(() => {
    // Clean up any remaining timers
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Force exit after a short delay
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  describe('extractContent', () => {
    it('should extract content from URL successfully', async () => {
      const submission = new ContentSubmission({
        id: 'test-submission-1',
        content_type: 'url' as ContentType,
        content_url: 'https://example.com/article',
        status: 'pending'
      });

      const mockFirecrawlResult = {
        title: 'Test Article',
        content: 'This is a test article content with multiple sentences. It has enough content to test word counting and reading time calculation.',
        author: 'Test Author',
        publishedDate: new Date('2024-01-01'),
        metadata: {}
      };

      mockFirecrawlService.extractContent.mockResolvedValue(mockFirecrawlResult);
      
      // Mock the detectLanguage method
      const detectLanguageSpy = jest.spyOn(contentExtractor as any, 'detectLanguage').mockResolvedValue('en');

      const result = await contentExtractor.extractContent(submission);

      expect(result).toMatchObject({
        title: 'Test Article',
        content: 'This is a test article content with multiple sentences. It has enough content to test word counting and reading time calculation.',
        author: 'Test Author',
        published_date: '2024-01-01T00:00:00.000Z',
        word_count: expect.any(Number),
        reading_time: expect.any(Number),
        language: 'en',
        extraction_method: 'firecrawl',
        extraction_quality: expect.any(Number),
        metadata: expect.objectContaining({
          original_url: 'https://example.com/article',
          extraction_timestamp: expect.any(String),
          firecrawl_metadata: mockFirecrawlResult
        })
      });

      expect(mockFirecrawlService.extractContent).toHaveBeenCalledWith('https://example.com/article');
      expect(detectLanguageSpy).toHaveBeenCalledWith(mockFirecrawlResult.content);
    });

    it('should extract content from YouTube video successfully', async () => {
      const submission = new ContentSubmission({
        id: 'test-submission-2',
        content_type: 'youtube' as ContentType,
        content_url: 'https://www.youtube.com/watch?v=test123',
        status: 'pending'
      });

      const mockYouTubeInfo: YouTubeVideoInfo = {
        title: 'Test YouTube Video',
        description: 'This is a test YouTube video description with enough content for testing.',
        duration: 300,
        author: 'Test YouTuber',
        published_date: '2024-01-01',
        thumbnail_url: 'https://example.com/thumb.jpg',
        transcript: 'This is the transcript of the YouTube video with multiple sentences for testing.'
      };

      // Mock the private methods by accessing them through the class
      const extractYouTubeVideoIdSpy = jest.spyOn(contentExtractor as any, 'extractYouTubeVideoId').mockReturnValue('test123');
      const getYouTubeVideoInfoSpy = jest.spyOn(contentExtractor as any, 'getYouTubeVideoInfo').mockResolvedValue(mockYouTubeInfo);
      const getYouTubeTranscriptSpy = jest.spyOn(contentExtractor as any, 'getYouTubeTranscript').mockResolvedValue(mockYouTubeInfo.transcript);
      
      // Mock the detectLanguage method
      jest.spyOn(contentExtractor as any, 'detectLanguage').mockResolvedValue('en');

      const result = await contentExtractor.extractContent(submission);

      expect(result).toMatchObject({
        title: 'Test YouTube Video',
        content: expect.stringContaining('This is the transcript of the YouTube video'),
        author: 'Test YouTuber',
        published_date: '2024-01-01',
        word_count: expect.any(Number),
        reading_time: expect.any(Number),
        language: 'en',
        extraction_method: 'youtube_api',
        extraction_quality: expect.any(Number),
        metadata: expect.objectContaining({
          youtube_url: 'https://www.youtube.com/watch?v=test123',
          youtube_video_id: 'test123',
          extraction_timestamp: expect.any(String),
          has_transcript: true,
          duration: 300,
          thumbnail_url: 'https://example.com/thumb.jpg'
        })
      });

      expect(extractYouTubeVideoIdSpy).toHaveBeenCalledWith('https://www.youtube.com/watch?v=test123');
      expect(getYouTubeVideoInfoSpy).toHaveBeenCalledWith('test123');
      expect(getYouTubeTranscriptSpy).toHaveBeenCalledWith('test123');
    });

    it('should extract content from PDF successfully', async () => {
      const submission = new ContentSubmission({
        id: 'test-submission-3',
        content_type: 'pdf' as ContentType,
        content_url: 'https://example.com/document.pdf',
        status: 'pending'
      });

      const mockDocumentInfo: DocumentInfo = {
        title: 'Test PDF Document',
        content: 'This is the content extracted from a PDF document with multiple paragraphs and sentences for testing purposes.',
        page_count: 5,
        file_type: 'pdf',
        file_size: 1024000,
        author: 'PDF Author',
        created_date: '2024-01-01'
      };

      const extractFromPdfSpy = jest.spyOn(contentExtractor as any, 'extractFromPdf').mockResolvedValue({
        title: mockDocumentInfo.title,
        content: mockDocumentInfo.content,
        author: mockDocumentInfo.author,
        published_date: mockDocumentInfo.created_date,
        word_count: 20,
        reading_time: 1,
        language: 'en',
        extraction_method: 'pdf',
        extraction_quality: 85,
        metadata: {
          original_url: 'https://example.com/document.pdf',
          extraction_timestamp: expect.any(String),
          document_metadata: mockDocumentInfo
        }
      });

      const result = await contentExtractor.extractContent(submission);

      expect(result).toMatchObject({
        title: 'Test PDF Document',
        content: 'This is the content extracted from a PDF document with multiple paragraphs and sentences for testing purposes.',
        author: 'PDF Author',
        published_date: '2024-01-01',
        word_count: 20,
        reading_time: 1,
        language: 'en',
        extraction_method: 'pdf',
        extraction_quality: 85
      });

      expect(extractFromPdfSpy).toHaveBeenCalledWith('https://example.com/document.pdf');
    });

    it('should throw error for unsupported content type', async () => {
      // Create a submission with invalid content type by bypassing validation
      const submissionData = {
        id: 'test-submission-4',
        content_type: 'unsupported' as any,
        content_url: 'https://example.com/file.unsupported',
        status: 'pending' as any
      };
      const submission = Object.create(ContentSubmission.prototype);
      Object.assign(submission, submissionData);

      await expect(contentExtractor.extractContent(submission)).rejects.toThrow('Unsupported content type: unsupported');
    });

    it('should handle extraction errors gracefully', async () => {
      const submission = new ContentSubmission({
        id: 'test-submission-5',
        content_type: 'url' as ContentType,
        content_url: 'https://invalid-url.com',
        status: 'pending'
      });

      mockFirecrawlService.extractContent.mockRejectedValue(new Error('Network error'));

      await expect(contentExtractor.extractContent(submission)).rejects.toThrow('Failed to extract content from URL: Network error');
    });
  });

  describe('toContentSubmissionMetadata', () => {
    it('should convert ExtractedContent to ContentSubmissionMetadata', () => {
      const extractedContent: ExtractedContent = {
        title: 'Test Article',
        content: 'Test content',
        author: 'Test Author',
        published_date: '2024-01-01T00:00:00.000Z',
        word_count: 100,
        reading_time: 5,
        language: 'en',
        extraction_method: 'firecrawl',
        extraction_quality: 85,
        metadata: { test: 'data' }
      };

      const result = contentExtractor.toContentSubmissionMetadata(extractedContent);

      expect(result).toEqual({
        title: 'Test Article',
        author: 'Test Author',
        published_date: '2024-01-01T00:00:00.000Z',
        word_count: 100,
        reading_time: 5,
        language: 'en',
        extraction_method: 'firecrawl',
        extraction_quality: 85
      });
    });
  });

  describe('checkHealth', () => {
    it('should return true when all services are healthy', async () => {
      mockFirecrawlService.checkHealth.mockResolvedValue(true);
      mockAzureOpenAIService.checkHealth.mockResolvedValue(true);

      const result = await contentExtractor.checkHealth();

      expect(result).toBe(true);
      expect(mockFirecrawlService.checkHealth).toHaveBeenCalled();
      expect(mockAzureOpenAIService.checkHealth).toHaveBeenCalled();
    });

    it('should return false when Firecrawl service is unhealthy', async () => {
      mockFirecrawlService.checkHealth.mockResolvedValue(false);
      mockAzureOpenAIService.checkHealth.mockResolvedValue(true);

      const result = await contentExtractor.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false when Azure OpenAI service is unhealthy', async () => {
      mockFirecrawlService.checkHealth.mockResolvedValue(true);
      mockAzureOpenAIService.checkHealth.mockResolvedValue(false);

      const result = await contentExtractor.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false when health check throws error', async () => {
      mockFirecrawlService.checkHealth.mockRejectedValue(new Error('Health check failed'));

      const result = await contentExtractor.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('private methods', () => {
    describe('calculateWordCount', () => {
      it('should calculate word count correctly', () => {
        const content = 'This is a test sentence with multiple words for counting.';
        const wordCount = (contentExtractor as any).calculateWordCount(content);
        expect(wordCount).toBe(10);
      });

      it('should handle empty content', () => {
        const wordCount = (contentExtractor as any).calculateWordCount('');
        expect(wordCount).toBe(0);
      });

      it('should handle content with extra whitespace', () => {
        const content = '  This   is   a   test   with   extra   spaces.  ';
        const wordCount = (contentExtractor as any).calculateWordCount(content);
        expect(wordCount).toBe(7);
      });
    });

    describe('calculateReadingTime', () => {
      it('should calculate reading time correctly', () => {
        const wordCount = 300; // 300 words
        const readingTime = (contentExtractor as any).calculateReadingTime(wordCount);
        expect(readingTime).toBe(2); // 300 words / 150 WPM = 2 minutes
      });

      it('should round up to minimum 1 minute', () => {
        const wordCount = 50; // 50 words
        const readingTime = (contentExtractor as any).calculateReadingTime(wordCount);
        expect(readingTime).toBe(1); // Minimum 1 minute
      });
    });

    describe('assessExtractionQuality', () => {
      it('should assess quality based on content length and structure', () => {
        const content = 'This is a well-structured article with multiple paragraphs.\n\nIt has proper sentences and punctuation!';
        const wordCount = 20;
        const quality = (contentExtractor as any).assessExtractionQuality(content, wordCount);
        
        expect(quality).toBeGreaterThan(50);
        expect(quality).toBeLessThanOrEqual(100);
      });

      it('should return base quality for short content', () => {
        const content = 'Short';
        const wordCount = 1;
        const quality = (contentExtractor as any).assessExtractionQuality(content, wordCount);
        
        expect(quality).toBe(55); // Base quality + some adjustments
      });
    });

    describe('extractTitleFromUrl', () => {
      it('should extract title from URL with filename', () => {
        const url = 'https://example.com/articles/my-article-title.html';
        const title = (contentExtractor as any).extractTitleFromUrl(url);
        expect(title).toBe('my article title');
      });

      it('should return hostname for URL without filename', () => {
        const url = 'https://example.com/';
        const title = (contentExtractor as any).extractTitleFromUrl(url);
        expect(title).toBe('example.com');
      });

      it('should handle invalid URL gracefully', () => {
        const url = 'invalid-url';
        const title = (contentExtractor as any).extractTitleFromUrl(url);
        expect(title).toBe('Untitled Content');
      });
    });

    describe('getFileTypeFromUrl', () => {
      it('should extract file type from URL', () => {
        const url = 'https://example.com/document.pdf';
        const fileType = (contentExtractor as any).getFileTypeFromUrl(url);
        expect(fileType).toBe('pdf');
      });

      it('should return path for URL without extension', () => {
        const url = 'https://example.com/page';
        const fileType = (contentExtractor as any).getFileTypeFromUrl(url);
        expect(fileType).toBe('/page');
      });

      it('should handle invalid URL gracefully', () => {
        const url = 'invalid-url';
        const fileType = (contentExtractor as any).getFileTypeFromUrl(url);
        expect(fileType).toBe('unknown');
      });
    });
  });
});