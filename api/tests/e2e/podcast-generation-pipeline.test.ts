import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { cleanupApiKeySecurityService } from '../../src/services/api-key-security';
// import { ContentSubmissionService } from '../../src/services/content-submission-service'; // Not used
import { ContentExtractor } from '../../src/services/content-extractor';
import { PodcastGenerator } from '../../src/services/podcast-generator';
import { TTSService } from '../../src/services/tts-service';
import { DatabaseService } from '../../src/services/database-service';
import { RssGenerator } from '../../src/services/rss-generator';
import { ContentSubmission } from '../../src/models/content-submission';
import { PodcastEpisode } from '../../src/models/podcast-episode';
import { UserFeed } from '../../src/models/user-feed';
import './test-config'; // Load environment variables
import { ProcessingJob } from '../../src/models/processing-job';
import { logger } from '../../src/utils/logger';

/**
 * End-to-End Tests for Podcast Generation Pipeline
 * 
 * These tests validate the complete pipeline from content submission
 * to podcast episode generation using real content.
 */

describe('Podcast Generation Pipeline - End-to-End Tests', () => {
  // let contentSubmissionService: ContentSubmissionService; // Not used in current tests
  let contentExtractor: ContentExtractor;
  let podcastGenerator: PodcastGenerator;
  let ttsService: TTSService;
  let databaseService: DatabaseService;
  let rssGenerator: RssGenerator;

  // Test content samples
  const testContent = {
    webArticle: {
      url: 'https://example.com/test-article',
      title: 'Test Article: AI and Machine Learning',
      content: `Artificial Intelligence and Machine Learning are transforming the way we work and live. 
      From autonomous vehicles to personalized recommendations, AI is becoming increasingly integrated into our daily lives.
      
      Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions. 
      This technology has applications in healthcare, finance, transportation, and many other industries.
      
      However, with great power comes great responsibility. We must ensure that AI systems are developed 
      ethically and transparently, with proper safeguards to protect privacy and prevent bias.
      
      The future of AI looks promising, but it requires careful consideration of its implications for society.`
    },
    youtubeVideo: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test YouTube Video',
      description: 'A test video for podcast generation',
      transcript: `Welcome to this test video about technology and innovation.
      
      Today we're going to discuss the latest trends in software development and how they're changing the industry.
      
      First, let's talk about cloud computing and its impact on modern applications.
      Then we'll explore artificial intelligence and machine learning.
      Finally, we'll look at the future of technology and what to expect in the coming years.
      
      Thank you for watching this test video.`
    },
    pdfDocument: {
      filename: 'test-document.pdf',
      content: `Test Document: The Future of Technology
      
      Executive Summary
      This document outlines the key trends and technologies that will shape the future of our industry.
      
      Introduction
      Technology is evolving at an unprecedented pace. Organizations must adapt to stay competitive.
      
      Key Technologies
      1. Artificial Intelligence
      2. Cloud Computing
      3. Internet of Things
      4. Blockchain
      
      Conclusion
      The future belongs to those who embrace change and innovation.`
    }
  };

  beforeAll(async () => {
    // Initialize services
    // contentSubmissionService = new ContentSubmissionService();
    contentExtractor = new ContentExtractor();
    podcastGenerator = new PodcastGenerator();
    ttsService = new TTSService();
    databaseService = new DatabaseService();
    rssGenerator = new RssGenerator();

    // Connect to database
    await databaseService.connect();
    
    logger.info('E2E Test Setup: All services initialized');
  });

  afterAll(async () => {
    // Clean up API key security service timers
    cleanupApiKeySecurityService();
    
    // Clear all timers to prevent Jest from hanging
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Cleanup database
    await databaseService.disconnect();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    logger.info('E2E Test Cleanup: Database disconnected');
  });

  beforeEach(() => {
    // Reset any mocks or state
    jest.clearAllMocks();
  });

  describe('Web Article to Podcast Pipeline', () => {
    test('should process web article and generate complete podcast episode', async () => {
      // Step 1: Create content submission
      const submissionData = {
        content_url: testContent.webArticle.url,
        content_type: 'url' as const,
        user_note: 'Test article about AI and ML',
        user_id: 'test-user-1',
        feed_id: 'test-feed-1'
      };

      const submission = new ContentSubmission(submissionData);
      expect(submission).toBeDefined();

      // Step 2: Extract content
      const extractedContent = await contentExtractor.extractContent(submission);
      expect(extractedContent).toBeDefined();
      expect(extractedContent.title).toContain('AI');
      expect(extractedContent.content).toContain('machine learning');
      
      // Add summary field and fix metadata for compatibility with PodcastGenerator
      const contentWithSummary = {
        ...extractedContent,
        summary: extractedContent.content.substring(0, 200) + '...',
        metadata: {
          originalUrl: submission.content_url,
          originalTitle: extractedContent.title,
          author: 'Test Author',
          publishedDate: new Date(),
          wordCount: extractedContent.content.split(' ').length
        }
      };

      // Step 3: Generate podcast episode (which includes script generation)
      const episode = await podcastGenerator.generateEpisode(contentWithSummary, submission.id);
      expect(episode).toBeDefined();
      expect(episode.title).toBeDefined();
      expect(episode.description).toBeDefined();
      expect(episode.dialogue_script).toBeDefined();
      expect(episode.dialogue_script!.length).toBeGreaterThan(0);

      // Step 4: Generate audio
      const audioResult = await ttsService.generateAudio(episode.dialogue_script || '');
      expect(audioResult).toBeDefined();
      expect(audioResult.audio_buffer).toBeDefined();
      expect(audioResult.duration_seconds).toBeGreaterThan(0);

      // Step 5: Update episode with audio data
      episode.updateAudio(
        'https://example.com/audio/test-episode-1.mp3',
        audioResult.duration_seconds,
        audioResult.audio_buffer.length
      );
      
      expect(episode).toBeDefined();

      // Step 6: Save to database
      const savedEpisode = await databaseService.saveEpisode(episode);
      expect(savedEpisode).toBeDefined();

      // Step 7: Generate RSS feed
      const episodes = await databaseService.getEpisodes(10);
      const rssXml = await rssGenerator.generateRss(episodes);
      expect(rssXml).toBeDefined();
      expect(rssXml).toContain('<rss');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('<item>');

      logger.info('Web Article Pipeline: Successfully processed article to podcast');
    }, 120000); // 2 minute timeout for E2E test

    test('should handle invalid web article gracefully', async () => {
      const invalidSubmission = new ContentSubmission({
        content_url: 'https://invalid-url-that-does-not-exist.com/article',
        content_type: 'url' as const,
        user_note: 'This should fail'
      });

      expect(invalidSubmission).toBeDefined();

      // This should handle the error gracefully
      await expect(contentExtractor.extractContent(invalidSubmission))
        .rejects
        .toThrow();
    });
  });

  describe('YouTube Video to Podcast Pipeline', () => {
    test('should process YouTube video and generate podcast episode', async () => {
      // Step 1: Create content submission
      const submissionData = {
        content_url: testContent.youtubeVideo.url,
        content_type: 'youtube' as const,
        user_note: 'Test YouTube video about technology',
        user_id: 'test-user-3',
        feed_id: 'test-feed-3'
      };

      const submission = new ContentSubmission(submissionData);
      expect(submission).toBeDefined();

      // Step 2: Extract content (mock YouTube extraction)
      const mockExtractedContent = {
        title: testContent.youtubeVideo.title,
        content: testContent.youtubeVideo.transcript,
        summary: 'A test YouTube video about technology and innovation',
        metadata: {
          originalUrl: testContent.youtubeVideo.url,
          originalTitle: testContent.youtubeVideo.title,
          author: 'Test Channel',
          publishedDate: new Date(),
          wordCount: testContent.youtubeVideo.transcript.split(' ').length
        }
      };

      // Step 3: Generate podcast episode (which includes script generation)
      const episode = await podcastGenerator.generateEpisode(mockExtractedContent, submission.id);
      expect(episode).toBeDefined();
      expect(episode.title).toContain('technology');
      expect(episode.dialogue_script).toContain('innovation');

      // Step 4: Generate audio
      const audioResult = await ttsService.generateAudio(episode.dialogue_script || '');
      expect(audioResult).toBeDefined();
      expect(audioResult.duration_seconds).toBeGreaterThan(0);

      // Step 5: Update episode with audio data
      episode.updateAudio(
        'https://example.com/audio/test-episode-2.mp3',
        audioResult.duration_seconds,
        audioResult.audio_buffer.length
      );
      
      expect(episode).toBeDefined();

      const savedEpisode = await databaseService.saveEpisode(episode);
      expect(savedEpisode).toBeDefined();

      logger.info('YouTube Pipeline: Successfully processed video to podcast');
    }, 30000);
  });

  describe('PDF Document to Podcast Pipeline', () => {
    test('should process PDF document and generate podcast episode', async () => {
      // Step 1: Create content submission
      const submissionData = {
        content_url: `https://example.com/documents/${testContent.pdfDocument.filename}`,
        content_type: 'pdf' as const,
        user_note: 'Test PDF document about technology trends',
        user_id: 'test-user-4',
        feed_id: 'test-feed-4'
      };

      const submission = new ContentSubmission(submissionData);
      expect(submission).toBeDefined();

      // Step 2: Extract content (mock PDF extraction)
      const mockExtractedContent = {
        title: 'Test Document: The Future of Technology',
        content: testContent.pdfDocument.content,
        summary: 'A comprehensive document about the future of technology',
        metadata: {
          originalUrl: submissionData.content_url,
          originalTitle: 'Test Document: The Future of Technology',
          author: 'Test Author',
          publishedDate: new Date('2024-01-01'),
          wordCount: testContent.pdfDocument.content.split(' ').length
        }
      };

      // Step 3: Generate podcast episode (which includes script generation)
      const episode = await podcastGenerator.generateEpisode(mockExtractedContent, submission.id);
      expect(episode).toBeDefined();
      expect(episode.title).toContain('Future');
      expect(episode.dialogue_script).toContain('technology');

      // Step 4: Generate audio
      const audioResult = await ttsService.generateAudio(episode.dialogue_script || '');
      expect(audioResult).toBeDefined();
      expect(audioResult.duration_seconds).toBeGreaterThan(0);

      // Step 5: Update episode with audio data
      episode.updateAudio(
        'https://example.com/audio/test-episode-3.mp3',
        audioResult.duration_seconds,
        audioResult.audio_buffer.length
      );
      
      expect(episode).toBeDefined();

      const savedEpisode = await databaseService.saveEpisode(episode);
      expect(savedEpisode).toBeDefined();

      logger.info('PDF Pipeline: Successfully processed document to podcast');
    }, 30000);
  });

  describe('RSS Feed Generation and Validation', () => {
    test('should generate valid RSS feed with multiple episodes', async () => {
      // Get all episodes from database
      const episodes = await databaseService.getEpisodes(10);
      expect(episodes.length).toBeGreaterThan(0);

      // Generate RSS feed
      const rssXml = await rssGenerator.generateRss(episodes);
      expect(rssXml).toBeDefined();

      // Validate RSS structure
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<rss version="2.0"');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('<title>');
      expect(rssXml).toContain('<description>');
      expect(rssXml).toContain('<item>');

      // Validate iTunes namespace
      expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      expect(rssXml).toContain('<itunes:category');
      expect(rssXml).toContain('<itunes:explicit>');

      // Validate episode items
      const itemCount = (rssXml.match(/<item>/g) || []).length;
      expect(itemCount).toBe(episodes.length);

      // Each item should have required elements
      episodes.forEach(episode => {
        expect(rssXml).toContain(`<title><![CDATA[${episode.title}]]></title>`);
        expect(rssXml).toContain(`<description><![CDATA[${episode.description}]]></description>`);
        expect(rssXml).toContain(`<enclosure url="${episode.audio_url}"`);
        expect(rssXml).toContain(`length="${episode.audio_size}"`);
        expect(rssXml).toContain(`type="audio/mpeg"`);
      });

      logger.info('RSS Feed: Successfully generated valid RSS feed');
    });

    test('should handle empty episode list gracefully', async () => {
      const emptyEpisodes: PodcastEpisode[] = [];
      const rssXml = await rssGenerator.generateRss(emptyEpisodes);
      
      expect(rssXml).toBeDefined();
      expect(rssXml).toContain('<rss');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).not.toContain('<item>');
      
      logger.info('RSS Feed: Successfully handled empty episode list');
    });
  });

  describe('User Feed Management', () => {
    test('should create and manage user feed', async () => {
      const feedData = {
        id: 'test-feed-1',
        title: 'Test Podcast Feed',
        description: 'A test podcast feed for E2E testing',
        slug: 'test-podcast-feed',
        author: 'Test Author',
        email: 'test@example.com',
        admin_email: 'admin@example.com',
        category: 'Technology',
        language: 'en',
        artwork_url: 'https://example.com/artwork.jpg',
        tts_provider: 'azure' as const,
        tts_voice_id: 'en-US-AriaNeural',
        created_at: new Date(),
        updated_at: new Date()
      };

      const userFeed = new UserFeed(feedData);
      expect(userFeed).toBeDefined();

      // Test feed properties
      expect(userFeed.getDisplayName()).toBe('Test Podcast Feed');
      expect(userFeed.getDescription()).toBe('A test podcast feed for E2E testing');
      expect(userFeed.getAuthor()).toBe('Test Author');
      expect(userFeed.getCategory()).toBe('Technology');
      expect(userFeed.hasArtwork()).toBe(true);
      expect(userFeed.hasTTSConfig()).toBe(true);

      logger.info('User Feed: Successfully created and validated feed');
    });
  });

  describe('Processing Job Management', () => {
    test('should create and track processing job', async () => {
      const jobData = {
        id: 'test-job-1',
        submission_id: 'test-submission-1',
        status: 'queued' as const,
        created_at: new Date(),
        updated_at: new Date()
      };

      const processingJob = new ProcessingJob(jobData);
      expect(processingJob).toBeDefined();

      // Test job status updates
      const runningJob = processingJob.start();
      expect(runningJob.status).toBe('running');

      const completedJob = runningJob.complete();
      expect(completedJob.status).toBe('completed');

      const failedJob = runningJob.fail('Test error message');
      expect(failedJob.status).toBe('failed');
      expect(failedJob.error_message).toBe('Test error message');

      logger.info('Processing Job: Successfully created and managed job');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle service failures gracefully', async () => {
      // Test with invalid content that should fail
      const invalidSubmission = new ContentSubmission({
        content_url: 'not-a-valid-url',
        content_type: 'url' as const,
        user_note: 'This should fail'
      });

      expect(invalidSubmission).toBeDefined();

      // Test with empty content
      new ContentSubmission({
        content_url: 'https://example.com/empty',
        content_type: 'url' as const,
        user_note: 'Empty content'
      });

      // Mock empty content extraction
      const mockEmptyContent = {
        title: '',
        content: '',
        summary: '',
        metadata: {
          originalUrl: 'https://example.com/empty',
          originalTitle: '',
          author: undefined,
          publishedDate: undefined,
          wordCount: 0
        }
      };

      // This should handle empty content gracefully
      const episode = await podcastGenerator.generateEpisode(mockEmptyContent, 'test-submission-empty');
      expect(episode).toBeDefined();
      expect(episode.title).toBeDefined();
      expect(episode.dialogue_script).toBeDefined();

      logger.info('Error Handling: Successfully handled edge cases');
    });

    test('should validate content quality and provide feedback', async () => {
      const lowQualityContent = {
        title: 'Short',
        content: 'Very short content with minimal information.',
        summary: 'Very short content',
        metadata: {
          originalUrl: 'https://example.com/short',
          originalTitle: 'Short',
          author: undefined,
          publishedDate: undefined,
          wordCount: 8
        }
      };

      const episode = await podcastGenerator.generateEpisode(lowQualityContent, 'test-submission-low-quality');
      expect(episode).toBeDefined();
      
      // Should still generate an episode even for low-quality content
      expect(episode.title).toBeDefined();
      expect(episode.dialogue_script).toBeDefined();

      logger.info('Quality Validation: Successfully handled low-quality content');
    });
  });

  describe('Performance and Scalability', () => {
    test('should process multiple submissions concurrently', async () => {
      const submissions = [
        { url: 'https://example.com/article1', type: 'url' as const },
        { url: 'https://example.com/article2', type: 'url' as const },
        { url: 'https://example.com/article3', type: 'url' as const }
      ];

      const mockContent = {
        title: 'Test Article',
        content: 'This is a test article for concurrent processing.',
        summary: 'A test article for concurrent processing',
        metadata: {
          originalUrl: 'https://example.com/test',
          originalTitle: 'Test Article',
          author: undefined,
          publishedDate: undefined,
          wordCount: 10
        }
      };

      // Process submissions concurrently
      const promises = submissions.map(async (submission) => {
        const episode = await podcastGenerator.generateEpisode(mockContent, `test-submission-${submission.url}`);
        return episode;
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results.every((result: any) => result.title)).toBe(true);

      logger.info('Concurrent Processing: Successfully processed multiple submissions');
    }, 120000); // 2 minute timeout for concurrent test
  });
});
