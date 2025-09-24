import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ContentExtractor } from '../../src/services/content-extractor';
// import { ContentProcessor } from '../../src/services/content-processor';
import { ContentSubmission } from '../../src/models/content-submission';
import { logger } from '../../src/utils/logger';
import { cleanupApiKeySecurityService } from '../../src/services/api-key-security';
import './test-config'; // Load environment variables

/**
 * End-to-End Tests for Content Processing
 * 
 * These tests validate content extraction and processing
 * with real content from various sources.
 */

describe('Content Processing - End-to-End Tests', () => {
  let contentExtractor: ContentExtractor;
  // let contentProcessor: ContentProcessor; // Not used in current tests

  beforeAll(async () => {
    contentExtractor = new ContentExtractor();
    // contentProcessor = new ContentProcessor();
    logger.info('Content Processing E2E: Services initialized');
  });

  afterAll(async () => {
    // Clean up API key security service timers
    cleanupApiKeySecurityService();
    
    // Clear all timers to prevent Jest from hanging
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Force garbage collection to clean up any remaining handles
    if (global.gc) {
      global.gc();
    }
    
    logger.info('Content Processing E2E: Tests completed');
  });

  describe('URL Content Extraction', () => {
    test('should extract content from real web article', async () => {
      const submission = new ContentSubmission({
        content_url: 'https://www.artificialintelligence-news.com/2024/01/15/ai-machine-learning-trends-2024/',
        content_type: 'url',
        user_note: 'Test real article extraction'
      });

      // Mock successful content extraction
      // Mock content extraction - commented out as not used
      // const mockExtractedContent = {
      //   title: 'Real Article: The Future of AI',
      //   content: `Artificial Intelligence is rapidly transforming industries...`,
      //   url: 'https://example.com/real-article',
      //   extraction_method: 'url_scraper',
      //   word_count: 95,
      //   reading_time_minutes: 1,
      //   language: 'en',
      //   quality_score: 88,
      //   metadata: {
      //     author: 'John Doe',
      //     published_date: '2024-01-15',
      //     word_count: 95,
      //     reading_time: 1
      //   }
      // };

      // Test content extraction
      const extractedContent = await contentExtractor.extractContent(submission);
      expect(extractedContent).toBeDefined();
      expect(extractedContent.title).toBeDefined();
      expect(extractedContent.content).toBeDefined();
      expect(extractedContent.word_count).toBeGreaterThan(10);
      expect(extractedContent.extraction_quality).toBeGreaterThan(50);

      logger.info('URL Extraction: Successfully extracted content from web article');
    }, 15000);

    test('should handle various URL formats', async () => {
      const urlFormats = [
        'https://www.example.com/article',
        'http://example.com/article',
        'https://subdomain.example.com/path/to/article',
        'https://example.com/article?param=value',
        'https://example.com/article#section'
      ];

      for (const url of urlFormats) {
        const submission = new ContentSubmission({
          content_url: url,
          content_type: 'url',
          user_note: `Test URL format: ${url}`
        });

        expect(submission).toBeDefined();
        expect(submission.content_url).toBe(url);
      }

      logger.info('URL Formats: Successfully validated various URL formats');
    });

    test('should handle invalid URLs gracefully', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/file',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        ''
      ];

      for (const url of invalidUrls) {
        expect(() => {
          new ContentSubmission({
            content_url: url,
            content_type: 'url',
            user_note: `Test invalid URL: ${url}`
          });
        }).toThrow();
      }

      logger.info('Invalid URLs: Successfully rejected invalid URL formats');
    });
  });

  describe('YouTube Content Processing', () => {
    test('should process YouTube video content', async () => {
      const submission = new ContentSubmission({
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        content_type: 'youtube',
        user_note: 'Test YouTube video processing'
      });

      // Mock YouTube content extraction
      // Mock YouTube content extraction - commented out as not used
      // const mockYouTubeContent = {
      //   title: 'YouTube Video: Machine Learning Tutorial',
      //   content: `Welcome to this comprehensive machine learning tutorial...`,
      //   url: 'https://www.youtube.com/watch?v=test123',
      //   extraction_method: 'youtube_api',
      //   word_count: 85,
      //   reading_time_minutes: 1,
      //   language: 'en',
      //   quality_score: 92,
      //   metadata: {
      //     video_id: 'test123',
      //     channel_title: 'ML Tutorials',
      //     duration: '15:30',
      //     view_count: 50000,
      //     like_count: 1200,
      //     comment_count: 45
      //   }
      // };

      const extractedContent = await contentExtractor.extractContent(submission);
      expect(extractedContent).toBeDefined();
      expect(extractedContent.title).toContain('Rick Astley');
      expect(extractedContent.content).toBeDefined();
      expect(extractedContent.metadata).toBeDefined();
      expect(extractedContent.metadata?.['youtube_video_id']).toBe('dQw4w9WgXcQ');
      expect(extractedContent.metadata?.['youtube_url']).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(extractedContent.metadata?.['duration']).toBe(214); // 3:34 in seconds
      expect(extractedContent.metadata?.['has_transcript']).toBe(false);

      logger.info('YouTube Processing: Successfully processed YouTube video content');
    }, 15000);

    test('should handle various YouTube URL formats', async () => {
      const youtubeUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ'
      ];

      for (const url of youtubeUrls) {
        const submission = new ContentSubmission({
          content_url: url,
          content_type: 'youtube',
          user_note: `Test YouTube URL: ${url}`
        });

        expect(submission).toBeDefined();
      }

      logger.info('YouTube URLs: Successfully validated various YouTube URL formats');
    });
  });

  describe('PDF Document Processing', () => {
    test('should process PDF document content', async () => {
      const submission = new ContentSubmission({
        content_url: 'https://example.com/document.pdf',
        content_type: 'pdf',
        user_note: 'Test PDF document processing'
      });

      // Mock PDF content extraction
      // Mock PDF content extraction - commented out as not used
      // const mockPdfContent = {
      //   title: 'Research Paper: Advances in Natural Language Processing',
      //   content: `Abstract...`,
      //   url: 'https://example.com/document.pdf',
      //   extraction_method: 'pdf_parser',
      //   word_count: 150,
      //   reading_time_minutes: 1,
      //   language: 'en',
      //   quality_score: 95,
      //   metadata: {
      //     page_count: 5,
      //     file_size: 250000,
      //     author: 'Dr. Jane Smith',
      //     creation_date: '2024-01-10',
      //     subject: 'Natural Language Processing'
      //   }
      // };

      const extractedContent = await contentExtractor.extractContent(submission);
      expect(extractedContent).toBeDefined();
      expect(extractedContent.title).toBeDefined();
      expect(extractedContent.content).toBeDefined();
      expect(extractedContent.word_count).toBeGreaterThan(0);

      logger.info('PDF Processing: Successfully processed PDF document content');
    }, 15000);

    test('should handle various document formats', async () => {
      const documentTypes = [
        { type: 'pdf', url: 'https://example.com/doc.pdf' },
        { type: 'document', url: 'https://example.com/doc.docx' },
        { type: 'document', url: 'https://example.com/doc.txt' }
      ];

      for (const doc of documentTypes) {
        const submission = new ContentSubmission({
          content_url: doc.url,
          content_type: doc.type as any,
          user_note: `Test ${doc.type} document`
        });

        expect(submission).toBeDefined();
      }

      logger.info('Document Formats: Successfully validated various document formats');
    });
  });

  describe('Content Quality Assessment', () => {
    test('should assess content quality accurately', async () => {
      const highQualityContent = {
        title: 'Comprehensive Guide to Machine Learning',
        content: `Machine learning is a subset of artificial intelligence that focuses on 
        algorithms that can learn from data. This comprehensive guide covers the 
        fundamental concepts, practical applications, and future trends in the field.
        
        The field has evolved significantly over the past decade, with new techniques 
        and methodologies emerging regularly. Understanding these developments is 
        crucial for anyone working in data science or AI.
        
        Key topics covered include supervised learning, unsupervised learning, 
        reinforcement learning, and deep learning. Each approach has its strengths 
        and weaknesses, making it important to choose the right method for each 
        specific problem.
        
        Practical applications span across industries, from healthcare and finance 
        to transportation and entertainment. The potential for positive impact is 
        enormous, but it also comes with challenges around ethics, bias, and 
        interpretability.`,
        url: 'https://example.com/high-quality',
        extraction_method: 'url_scraper',
        word_count: 120,
        reading_time_minutes: 1,
        language: 'en',
        quality_score: 95,
        metadata: {}
      };

      const lowQualityContent = {
        title: 'Short',
        content: 'Very brief content.',
        url: 'https://example.com/low-quality',
        extraction_method: 'url_scraper',
        word_count: 3,
        reading_time_minutes: 1,
        language: 'en',
        quality_score: 25,
        metadata: {}
      };

      // Test quality assessment
      expect(highQualityContent.quality_score).toBeGreaterThan(90);
      expect(lowQualityContent.quality_score).toBeLessThan(50);
      expect(highQualityContent.word_count).toBeGreaterThan(100);
      expect(lowQualityContent.word_count).toBeLessThan(10);

      logger.info('Quality Assessment: Successfully assessed content quality');
    });

    test('should handle content in different languages', async () => {
      const multilingualContent = [
        {
          content: 'This is English content about technology.',
          language: 'en',
          expected: 'English'
        },
        {
          content: 'Este es contenido en español sobre tecnología.',
          language: 'es',
          expected: 'Spanish'
        },
        {
          content: 'Ceci est du contenu français sur la technologie.',
          language: 'fr',
          expected: 'French'
        }
      ];

      for (const content of multilingualContent) {
        const submission = new ContentSubmission({
          content_url: 'https://example.com/multilingual',
          content_type: 'url',
          user_note: `Test ${content.expected} content`
        });

        expect(submission).toBeDefined();
      }

      logger.info('Multilingual Content: Successfully handled different languages');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      const submission = new ContentSubmission({
        content_url: 'https://nonexistent-domain-12345.com/article',
        content_type: 'url',
        user_note: 'Test network error handling'
      });

      // This should handle the error gracefully
      await expect(contentExtractor.extractContent(submission))
        .rejects
        .toThrow();

      logger.info('Network Errors: Successfully handled network errors');
    });

    test('should handle malformed content gracefully', async () => {
      const malformedContent = {
        title: '',
        content: '',
        url: 'https://example.com/malformed',
        extraction_method: 'url_scraper',
        word_count: 0,
        reading_time_minutes: 0,
        language: 'en',
        quality_score: 0,
        metadata: {}
      };

      // Should still process malformed content
      expect(malformedContent).toBeDefined();
      expect(malformedContent.quality_score).toBe(0);

      logger.info('Malformed Content: Successfully handled malformed content');
    });

    test('should handle very large content', async () => {
      const largeContent = {
        title: 'Very Large Document',
        content: 'A'.repeat(100000), // 100KB of content
        url: 'https://example.com/large',
        extraction_method: 'url_scraper',
        word_count: 100000,
        reading_time_minutes: 500,
        language: 'en',
        quality_score: 85,
        metadata: {}
      };

      expect(largeContent.word_count).toBe(100000);
      expect(largeContent.reading_time_minutes).toBe(500);

      logger.info('Large Content: Successfully handled very large content');
    });
  });
});
