import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TTSService } from '../../src/services/tts-service';
import { PodcastGenerator } from '../../src/services/podcast-generator';
import { logger } from '../../src/utils/logger';
import { cleanupApiKeySecurityService } from '../../src/services/api-key-security';
import './test-config'; // Load environment variables

/**
 * End-to-End Tests for Audio Generation
 * 
 * These tests validate the complete audio generation pipeline
 * from script to final audio file using real TTS services.
 */

describe('Audio Generation - End-to-End Tests', () => {
  let ttsService: TTSService;
  let podcastGenerator: PodcastGenerator;

  beforeAll(async () => {
    ttsService = new TTSService();
    podcastGenerator = new PodcastGenerator();
    logger.info('Audio Generation E2E: Services initialized');
  });

  afterAll(async () => {
    // Clean up API key security service timers
    cleanupApiKeySecurityService();
    
    // Clear all timers to prevent Jest from hanging
    jest.clearAllTimers();
    jest.useRealTimers();
    
    logger.info('Audio Generation E2E: Tests completed');
  });

  describe('Text-to-Speech Generation', () => {
    test('should generate audio from simple text', async () => {
      const testText = 'Welcome to the Tech Talk Podcast. Today we are discussing the future of artificial intelligence and machine learning.';
      
      const audioResult = await ttsService.generateAudio(testText);
      
      expect(audioResult).toBeDefined();
      expect(audioResult.audio_buffer).toBeDefined();
      expect(audioResult.audio_buffer.length).toBeGreaterThan(0);
      expect(audioResult.duration_seconds).toBeGreaterThan(0);
      expect(audioResult.voice_used).toBeDefined();
      expect(audioResult.file_size_bytes).toBeGreaterThan(0);

      logger.info('Simple TTS: Successfully generated audio from simple text');
    }, 30000);

    test('should generate audio with different voices', async () => {
      const testText = 'This is a test of different voices for podcast generation.';
      
      // Test with different voice options
      const voices = ['en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural'];
      
      for (const voice of voices) {
        const audioResult = await ttsService.generateAudio(testText, { voice_id: voice });
        
        expect(audioResult).toBeDefined();
        expect(audioResult.audio_buffer).toBeDefined();
        expect(audioResult.voice_used).toBe(voice);
        expect(audioResult.duration_seconds).toBeGreaterThan(0);
      }

      logger.info('Voice Variation: Successfully generated audio with different voices');
    }, 60000);

    test('should handle long text content', async () => {
      const longText = `
        Welcome to the Tech Talk Podcast, your weekly source for the latest in technology and innovation.
        
        In today's episode, we're diving deep into the world of artificial intelligence and machine learning.
        We'll explore how these technologies are transforming industries, from healthcare to finance,
        and discuss what the future holds for AI development.
        
        Our first segment covers the basics of machine learning algorithms and how they work.
        We'll explain supervised learning, unsupervised learning, and reinforcement learning
        in terms that everyone can understand.
        
        Next, we'll look at real-world applications of AI in various sectors.
        From autonomous vehicles to medical diagnosis, AI is making a significant impact
        on how we live and work.
        
        Finally, we'll discuss the ethical implications of AI development and the importance
        of responsible innovation in this rapidly evolving field.
        
        Thank you for listening to Tech Talk Podcast. Don't forget to subscribe and leave
        a review if you enjoyed today's episode.
      `;
      
      const audioResult = await ttsService.generateAudio(longText);
      
      expect(audioResult).toBeDefined();
      expect(audioResult.audio_buffer).toBeDefined();
      expect(audioResult.duration_seconds).toBeGreaterThan(10); // Should be longer than 10 seconds
      expect(audioResult.file_size_bytes).toBeGreaterThan(100000); // Should be larger than 100KB

      logger.info('Long Text: Successfully generated audio from long text content');
    }, 60000);

    test('should handle special characters and formatting', async () => {
      const specialText = `
        Welcome to Tech Talk Podcast! Today we're discussing:
        
        1. AI & Machine Learning
        2. "The Future of Technology"
        3. Data Science & Analytics
        
        We'll cover topics like:
        • Neural Networks
        • Deep Learning
        • Natural Language Processing
        
        Special characters: @#$%^&*()_+-=[]{}|;':",./<>?
        
        URLs: https://example.com and email@example.com
        
        Math: 2 + 2 = 4, 10% increase, $100 budget
      `;
      
      const audioResult = await ttsService.generateAudio(specialText);
      
      expect(audioResult).toBeDefined();
      expect(audioResult.audio_buffer).toBeDefined();
      expect(audioResult.duration_seconds).toBeGreaterThan(0);

      logger.info('Special Characters: Successfully handled special characters and formatting');
    }, 30000);
  });

  describe('Podcast Script Generation', () => {
    test('should generate complete podcast script from content', async () => {
      const content = {
        title: 'The Future of AI',
        content: `Artificial Intelligence is rapidly evolving and changing the way we work and live. 
        From machine learning algorithms to neural networks, AI technologies are becoming 
        increasingly sophisticated and capable.
        
        The applications of AI span across multiple industries, including healthcare, 
        finance, transportation, and entertainment. Each sector is finding unique ways 
        to leverage AI for improved efficiency and innovation.
        
        However, the rapid advancement of AI also brings challenges and concerns. 
        Issues around ethics, bias, job displacement, and privacy must be carefully 
        considered as we move forward with AI development.
        
        The future of AI looks promising, but it requires responsible development 
        and thoughtful implementation to ensure positive outcomes for society.`,
        url: 'https://example.com/ai-article',
        extraction_method: 'url_scraper',
        word_count: 100,
        reading_time_minutes: 1,
        language: 'en',
        quality_score: 85,
        summary: 'A comprehensive look at AI developments and their societal impact.',
        metadata: {
          wordCount: 100,
          originalUrl: 'https://example.com/ai-article'
        }
      };

      const episode = await podcastGenerator.generateEpisode(content, 'test-submission-1');
      
      expect(episode).toBeDefined();
      expect(episode.title).toBeDefined();
      expect(episode.description).toBeDefined();
      expect(episode.dialogue_script).toBeDefined();
      expect(episode.summary).toBeDefined();
      expect(episode.chapter_markers).toBeDefined();
      
      // Validate episode structure
      expect(episode.title).toContain('AI');
      expect(episode.dialogue_script).toContain('Artificial Intelligence');
      expect(episode.dialogue_script!.length).toBeGreaterThan(500);
      expect(episode.chapter_markers!.length).toBeGreaterThanOrEqual(0);

      logger.info('Script Generation: Successfully generated complete podcast script');
    }, 60000);

    test('should generate script with proper chapter markers', async () => {
      const content = {
        title: 'Machine Learning Fundamentals',
        content: `Introduction to Machine Learning
        
        Machine learning is a subset of artificial intelligence that focuses on algorithms 
        that can learn from data. It's a powerful tool for solving complex problems.
        
        Types of Machine Learning
        
        There are three main types of machine learning: supervised learning, unsupervised 
        learning, and reinforcement learning. Each has its own strengths and applications.
        
        Applications in Industry
        
        Machine learning is being used across various industries to improve processes, 
        make predictions, and automate decision-making. The potential is enormous.
        
        Future Outlook
        
        The future of machine learning looks bright, with new techniques and applications 
        being developed constantly. It's an exciting field to be part of.`,
        url: 'https://example.com/ml-article',
        extraction_method: 'url_scraper',
        word_count: 120,
        reading_time_minutes: 1,
        language: 'en',
        quality_score: 90,
        summary: 'An in-depth exploration of machine learning concepts and applications.',
        metadata: {
          wordCount: 120
        }
      };

      const episode = await podcastGenerator.generateEpisode(content, 'test-submission-2');
      
      expect(episode.chapter_markers).toBeDefined();
      expect(episode.chapter_markers!.length).toBeGreaterThan(0);
      
      // Validate chapter markers
      episode.chapter_markers!.forEach((chapter, index) => {
        expect(chapter.title).toBeDefined();
        expect(chapter.start_time).toBeDefined();
        expect(chapter.start_time).toBeGreaterThanOrEqual(0);
        if (index > 0) {
          expect(chapter.start_time).toBeGreaterThan(episode.chapter_markers?.[index - 1]?.start_time || 0);
        }
      });

      logger.info('Chapter Markers: Successfully generated script with proper chapter markers');
    }, 30000);
  });

  describe('Complete Audio Pipeline', () => {
    test('should generate complete podcast episode from content to audio', async () => {
      const content = {
        title: 'The Impact of AI on Society',
        content: `Artificial Intelligence is transforming society in profound ways. 
        From healthcare to education, AI is changing how we approach complex problems.
        
        In healthcare, AI is being used for medical diagnosis, drug discovery, and 
        personalized treatment plans. These applications have the potential to save 
        lives and improve patient outcomes.
        
        In education, AI is enabling personalized learning experiences and helping 
        educators identify students who need additional support. This technology 
        is making education more accessible and effective.
        
        However, the widespread adoption of AI also raises important questions about 
        privacy, security, and the future of work. We must address these concerns 
        as we continue to develop and deploy AI systems.
        
        The key is to ensure that AI development is guided by ethical principles 
        and that the benefits are shared equitably across society.`,
        url: 'https://example.com/ai-society',
        extraction_method: 'url_scraper',
        word_count: 150,
        reading_time_minutes: 1,
        language: 'en',
        quality_score: 88,
        summary: 'A comprehensive look at how AI is transforming society and the challenges we face.',
        metadata: {
          originalUrl: 'https://example.com/ai-impact',
          originalTitle: 'The Impact of AI on Society',
          author: 'AI Research Team',
          publishedDate: new Date(),
          wordCount: 95
        }
      };

      // Step 1: Generate episode (which includes script generation)
      const episode = await podcastGenerator.generateEpisode(content, 'test-submission-3');
      expect(episode).toBeDefined();

      // Step 2: Generate audio from the episode's dialogue script
      const audioResult = await ttsService.generateAudio(episode.dialogue_script || '');
      expect(audioResult).toBeDefined();

      // Step 3: Validate complete episode
      expect(episode.title).toBeDefined();
      expect(episode.description).toBeDefined();
      expect(episode.audio_duration).toBeGreaterThan(0);
      expect(episode.audio_size).toBeGreaterThan(0);
      expect(episode.transcript).toBeDefined();
      expect(episode.chapter_markers!.length).toBeGreaterThan(0);

      // Validate episode data
      expect(episode.title).toBeDefined();
      expect(episode.description).toBeDefined();
      expect(episode.audio_duration).toBeGreaterThan(0);
      expect(episode.audio_size).toBeGreaterThan(0);
      expect(episode.transcript).toBeDefined();
      expect(episode.chapter_markers?.length).toBeGreaterThan(0);

      logger.info('Complete Pipeline: Successfully generated complete podcast episode');
    }, 60000);

    test('should handle multiple episodes with different content types', async () => {
      const contentTypes = [
        {
          type: 'url',
          content: {
            title: 'Web Article: Cloud Computing Trends',
            content: 'Cloud computing is revolutionizing how businesses operate...',
            summary: 'A comprehensive look at cloud computing trends',
            metadata: {
              originalUrl: 'https://example.com/cloud-article',
              originalTitle: 'Web Article: Cloud Computing Trends',
              author: undefined,
              publishedDate: undefined,
              wordCount: 100
            }
          }
        },
        {
          type: 'youtube',
          content: {
            title: 'YouTube Video: Machine Learning Tutorial',
            content: 'Welcome to this machine learning tutorial...',
            summary: 'A comprehensive machine learning tutorial',
            metadata: {
              originalUrl: 'https://www.youtube.com/watch?v=test123',
              originalTitle: 'YouTube Video: Machine Learning Tutorial',
              author: 'ML Tutorials',
              publishedDate: undefined,
              wordCount: 120
            }
          }
        },
        {
          type: 'pdf',
          content: {
            title: 'PDF Document: AI Research Paper',
            content: 'This research paper explores the latest developments in AI...',
            summary: 'A comprehensive AI research paper',
            metadata: {
              originalUrl: 'https://example.com/ai-research.pdf',
              originalTitle: 'PDF Document: AI Research Paper',
              author: 'Dr. Smith',
              publishedDate: undefined,
              wordCount: 200
            }
          }
        }
      ];

      const episodes = [];

      for (const contentType of contentTypes) {
        // Generate episode (which includes script and audio generation)
        const episode = await podcastGenerator.generateEpisode(contentType.content, `test-submission-${contentType.type}`);
        
        episodes.push(episode);
      }

      expect(episodes).toHaveLength(3);
      episodes.forEach(episode => {
        expect(episode.title).toBeDefined();
        expect(episode.audio_duration).toBeGreaterThan(0);
        expect(episode.audio_size).toBeGreaterThan(0);
      });

      logger.info('Multiple Content Types: Successfully handled different content types');
    }, 90000);
  });

  describe('Audio Quality and Performance', () => {
    test('should generate high-quality audio', async () => {
      const testText = 'This is a test of audio quality for podcast generation.';
      
      const audioResult = await ttsService.generateAudio(testText);
      
      // Validate audio quality metrics
      expect(audioResult.audio_buffer).toBeDefined();
      expect(audioResult.audio_buffer.length).toBeGreaterThan(1000); // Should be substantial
      expect(audioResult.duration_seconds).toBeGreaterThan(0);
      expect(audioResult.file_size_bytes).toBeGreaterThan(1000);
      
      // Check audio format (should be MP3)
      expect(audioResult.audio_buffer[0]).toBe(0xFF); // MP3 header starts with 0xFF
      // Check for valid MP3 header (0xFF followed by valid sync bits)
      expect(audioResult.audio_buffer[1]! & 0xE0).toBe(0xE0); // Valid MP3 sync bits

      logger.info('Audio Quality: Successfully generated high-quality audio');
    }, 30000);

    test('should handle audio generation errors gracefully', async () => {
      const invalidText = ''; // Empty text should cause an error
      
      await expect(ttsService.generateAudio(invalidText))
        .rejects
        .toThrow();

      logger.info('Error Handling: Successfully handled audio generation errors');
    });

    test('should generate audio within reasonable time limits', async () => {
      const testText = 'This is a performance test for audio generation speed.';
      
      const startTime = Date.now();
      const audioResult = await ttsService.generateAudio(testText);
      const endTime = Date.now();
      
      const generationTime = endTime - startTime;
      expect(generationTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(audioResult).toBeDefined();

      logger.info(`Performance: Generated audio in ${generationTime}ms`);
    }, 15000);
  });

  describe('Audio File Management', () => {
    test('should handle different audio file sizes', async () => {
      const shortText = 'Short text.';
      const longText = 'This is a much longer text that will generate a longer audio file. '.repeat(10);
      
      const shortAudio = await ttsService.generateAudio(shortText);
      const longAudio = await ttsService.generateAudio(longText);
      
      expect(shortAudio.audio_buffer.length).toBeLessThan(longAudio.audio_buffer.length);
      expect(shortAudio.duration_seconds).toBeLessThan(longAudio.duration_seconds);
      expect(shortAudio.file_size_bytes).toBeLessThan(longAudio.file_size_bytes);

      logger.info('File Sizes: Successfully handled different audio file sizes');
    }, 30000);

    test('should generate consistent audio for same input', async () => {
      const testText = 'This is a test for audio consistency.';
      
      const audio1 = await ttsService.generateAudio(testText);
      const audio2 = await ttsService.generateAudio(testText);
      
      // Audio should be consistent (same duration, similar size)
      expect(Math.abs(audio1.duration_seconds - audio2.duration_seconds)).toBeLessThan(1); // Within 1 second
      expect(Math.abs(audio1.file_size_bytes - audio2.file_size_bytes)).toBeLessThan(1000); // Within 1KB

      logger.info('Consistency: Successfully generated consistent audio');
    }, 30000);
  });
});
