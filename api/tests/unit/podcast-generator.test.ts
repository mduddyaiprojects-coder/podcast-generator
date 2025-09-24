import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PodcastGenerator } from '../../src/services/podcast-generator';

// Mock dependencies
jest.mock('../../src/services/azure-openai-service');
jest.mock('../../src/services/elevenlabs-service');
jest.mock('../../src/services/storage-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('PodcastGenerator', () => {
  let podcastGenerator: PodcastGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    podcastGenerator = new PodcastGenerator();
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
    it('should initialize without errors', () => {
      expect(podcastGenerator).toBeInstanceOf(PodcastGenerator);
    });
  });

  describe('generateEpisode', () => {
    it('should generate podcast episode', async () => {
      const mockContent = {
        title: 'Test Episode',
        content: 'Test content',
        summary: 'Test summary',
        metadata: {
          originalUrl: 'https://example.com',
          originalTitle: 'Test Title',
          author: 'Test Author',
          publishedDate: new Date(),
          wordCount: 100
        }
      };

      const episode = await podcastGenerator.generateEpisode(mockContent, 'test-submission-id');
      
      expect(episode).toHaveProperty('id');
      expect(episode).toHaveProperty('title');
      expect(episode).toHaveProperty('description');
      expect(episode).toHaveProperty('source_url');
      expect(episode).toHaveProperty('content_type');
      expect(episode).toHaveProperty('audio_url');
      expect(episode).toHaveProperty('audio_duration');
      expect(episode).toHaveProperty('pub_date');
      expect(episode).toHaveProperty('submission_id');
    });
  });
});
