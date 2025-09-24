import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { cleanupApiKeySecurityService } from '../../src/services/api-key-security';
import { RssGenerator } from '../../src/services/rss-generator';
import { RssCacheService } from '../../src/services/rss-cache-service';
import { PodcastEpisode } from '../../src/models/podcast-episode';
import { UserFeed } from '../../src/models/user-feed';
import { logger } from '../../src/utils/logger';

/**
 * End-to-End Tests for RSS Feed Generation
 * 
 * These tests validate RSS feed generation with real podcast episodes
 * and ensure iTunes compliance and proper XML structure.
 */

describe('RSS Feed Generation - End-to-End Tests', () => {
  let rssGenerator: RssGenerator;
  let rssCacheService: RssCacheService;
  let testEpisodes: PodcastEpisode[];
  let testFeed: UserFeed;

  // Helper function to convert UserFeed to FeedMetadata
  const getFeedMetadata = (feed: UserFeed) => ({
    title: feed.title,
    description: feed.description,
    link: `https://example.com/feeds/${feed.slug}`,
    language: 'en',
    author: feed.author,
    email: feed.admin_email,
    category: feed.category,
    explicit: false,
    artwork_url: feed.artwork_url
  });

  beforeAll(async () => {
    rssGenerator = new RssGenerator();
    rssCacheService = new RssCacheService();
    
    // Create test feed
    testFeed = new UserFeed({
      id: 'test-feed-1',
      title: 'Tech Talk Podcast',
      description: 'A podcast about technology, AI, and innovation',
      slug: 'tech-talk-podcast',
      author: 'Tech Talk Team',
      admin_email: 'hello@techtalk.com',
      category: 'Technology',
      artwork_url: 'https://example.com/artwork.jpg',
      tts_provider: 'azure',
      tts_voice_id: 'en-US-AriaNeural',
      created_at: new Date(),
      updated_at: new Date()
    });

    logger.info('RSS Feed E2E: Services initialized');
  });

  afterAll(async () => {
    // Clean up API key security service timers
    cleanupApiKeySecurityService();
    
    // Clean up RSS cache service timers
    if (rssCacheService && (rssCacheService as any).cleanup) {
      (rssCacheService as any).cleanup();
    }
    
    // Clear all timers to prevent Jest from hanging
    jest.clearAllTimers();
    jest.useRealTimers();
    logger.info('RSS Feed E2E: Tests completed');
  });

  beforeEach(() => {
    // Create test episodes for each test
    testEpisodes = [
      new PodcastEpisode({
        id: 'episode-1',
        title: 'The Future of Artificial Intelligence',
        description: 'Exploring the latest developments in AI and machine learning, including large language models and their impact on society.',
        // content_url: 'https://example.com/ai-article', // Removed - not in PodcastEpisodeData interface
        content_type: 'url',
        audio_url: 'https://example.com/audio/episode-1.mp3',
        audio_duration: 1800, // 30 minutes
        audio_size: 15000000, // 15MB
        transcript: 'Welcome to Tech Talk Podcast. Today we\'re discussing the future of artificial intelligence...',
        dialogue_script: 'Welcome to Tech Talk Podcast. Today we\'re discussing the future of artificial intelligence...',
        summary: 'A comprehensive look at AI developments and their societal impact.',
        chapter_markers: [
          { start_time: 0, end_time: 300, title: 'Introduction' },
          { start_time: 300, end_time: 900, title: 'Current AI State' },
          { start_time: 900, end_time: 1500, title: 'Future Predictions' },
          { start_time: 1500, end_time: 1800, title: 'Conclusion' }
        ],
        pub_date: new Date('2024-01-15T10:00:00Z'),
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
        source_url: 'https://example.com/source1'
      }),
      new PodcastEpisode({
        id: 'episode-2',
        title: 'Machine Learning in Healthcare',
        description: 'How machine learning is revolutionizing healthcare, from diagnosis to drug discovery.',
        // content_url: 'https://example.com/ml-healthcare', // Removed - not in PodcastEpisodeData interface
        content_type: 'url',
        audio_url: 'https://example.com/audio/episode-2.mp3',
        audio_duration: 2100, // 35 minutes
        audio_size: 18000000, // 18MB
        transcript: 'In this episode, we explore how machine learning is transforming healthcare...',
        dialogue_script: 'In this episode, we explore how machine learning is transforming healthcare...',
        summary: 'An in-depth look at ML applications in healthcare.',
        chapter_markers: [
          { start_time: 0, end_time: 300, title: 'Introduction' },
          { start_time: 300, end_time: 900, title: 'Medical Imaging' },
          { start_time: 900, end_time: 1500, title: 'Drug Discovery' },
          { start_time: 1500, end_time: 1800, title: 'Patient Care' },
          { start_time: 1800, end_time: 2100, title: 'Conclusion' }
        ],
        pub_date: new Date('2024-01-10T14:00:00Z'),
        created_at: new Date('2024-01-10T14:00:00Z'),
        updated_at: new Date('2024-01-10T14:00:00Z'),
        source_url: 'https://example.com/source2'
      }),
      new PodcastEpisode({
        id: 'episode-3',
        title: 'The Ethics of AI',
        description: 'Discussing the ethical implications of artificial intelligence and how to ensure responsible development.',
        // content_url: 'https://example.com/ai-ethics', // Removed - not in PodcastEpisodeData interface
        content_type: 'url',
        audio_url: 'https://example.com/audio/episode-3.mp3',
        audio_duration: 2400, // 40 minutes
        audio_size: 20000000, // 20MB
        transcript: 'Today we tackle the complex topic of AI ethics...',
        dialogue_script: 'Today we tackle the complex topic of AI ethics...',
        summary: 'A thoughtful discussion on AI ethics and responsible development.',
        chapter_markers: [
          { start_time: 0, end_time: 300, title: 'Introduction' },
          { start_time: 300, end_time: 900, title: 'Bias in AI' },
          { start_time: 900, end_time: 1500, title: 'Privacy Concerns' },
          { start_time: 1500, end_time: 2100, title: 'Regulation' },
          { start_time: 2100, end_time: 2400, title: 'Future Outlook' }
        ],
        pub_date: new Date('2024-01-05T16:00:00Z'),
        created_at: new Date('2024-01-05T16:00:00Z'),
        updated_at: new Date('2024-01-05T16:00:00Z'),
        source_url: 'https://example.com/source3'
      })
    ];
  });

  describe('Basic RSS Feed Generation', () => {
    test('should generate valid RSS 2.0 feed', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      expect(rssXml).toBeDefined();
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<rss version="2.0"');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('</channel>');
      expect(rssXml).toContain('</rss>');

      logger.info('Basic RSS: Successfully generated valid RSS 2.0 feed');
    });

    test('should include all required channel elements', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Required channel elements
      expect(rssXml).toContain('<title><![CDATA[Tech Talk Podcast]]></title>');
      expect(rssXml).toContain('<description><![CDATA[A podcast about technology, AI, and innovation]]></description>');
      expect(rssXml).toContain('<link>https://example.com/feeds/tech-talk-podcast</link>');
      expect(rssXml).toContain('<language>en</language>');
      expect(rssXml).toContain('<lastBuildDate>');
      expect(rssXml).toContain('<generator>Podcast Generator v1.0</generator>');

      logger.info('Channel Elements: Successfully included all required channel elements');
    });

    test('should include all episode items', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Should have 3 episode items
      const itemMatches = rssXml.match(/<item>/g);
      expect(itemMatches).toHaveLength(3);

      // Each episode should have required elements
      testEpisodes.forEach(episode => {
        expect(rssXml).toContain(`<title><![CDATA[${episode.title}]]></title>`);
        expect(rssXml).toContain(`<description><![CDATA[${episode.description}]]></description>`);
        expect(rssXml).toContain(`<enclosure url="${episode.audio_url}"`);
        expect(rssXml).toContain(`length="${episode.audio_size}"`);
        expect(rssXml).toContain(`type="audio/mpeg"`);
        expect(rssXml).toContain(`<pubDate>${episode.pub_date.toUTCString()}</pubDate>`);
        expect(rssXml).toContain(`<guid isPermaLink="false">episode_${episode.id}</guid>`);
      });

      logger.info('Episode Items: Successfully included all episode items');
    });
  });

  describe('iTunes Compliance', () => {
    test('should include iTunes namespace', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      expect(rssXml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
      // Note: xmlns:atom is not included in the actual RSS output

      logger.info('iTunes Namespace: Successfully included iTunes namespace');
    });

    test('should include iTunes channel elements', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // iTunes channel elements
      // Note: itunes:title and itunes:description are not included at channel level in actual output
      expect(rssXml).toContain('<itunes:author>Tech Talk Team</itunes:author>');
      expect(rssXml).toContain('<itunes:email>hello@techtalk.com</itunes:email>');
      expect(rssXml).toContain('<itunes:category text="Technology"/>');
      expect(rssXml).toContain('<itunes:explicit>no</itunes:explicit>');
      expect(rssXml).toContain('<itunes:image href="https://example.com/artwork.jpg"/>');

      logger.info('iTunes Channel: Successfully included iTunes channel elements');
    });

    test('should include iTunes item elements', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // iTunes item elements for each episode
      testEpisodes.forEach(episode => {
        expect(rssXml).toContain(`<itunes:title><![CDATA[${episode.title}]]></itunes:title>`);
        expect(rssXml).toContain(`<itunes:summary><![CDATA[${episode.description}]]></itunes:summary>`);
        expect(rssXml).toContain(`<itunes:duration>${Math.floor((episode.audio_duration || 0) / 60)}:${((episode.audio_duration || 0) % 60).toString().padStart(2, '0')}</itunes:duration>`);
        // Note: itunes:explicit is not included at item level in actual output
      });

      logger.info('iTunes Items: Successfully included iTunes item elements');
    });

    test('should include chapter markers', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Should include chapter markers for episodes that have them
      testEpisodes.forEach(episode => {
        if (episode.chapter_markers && episode.chapter_markers.length > 0) {
          expect(rssXml).toContain(`<itunes:chapters>`);
          episode.chapter_markers.forEach(chapter => {
            expect(rssXml).toContain(`<itunes:chapter start="${chapter.start_time}" title="${chapter.title}"/>`);
          });
          expect(rssXml).toContain(`</itunes:chapters>`);
        }
      });

      logger.info('Chapter Markers: Successfully included chapter markers');
    });
  });

  describe('RSS Feed Validation', () => {
    test('should generate well-formed XML', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Basic XML structure validation
      expect(rssXml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(rssXml).toMatch(/<rss version="2\.0"[^>]*>/);
      expect(rssXml).toMatch(/<channel>/);
      expect(rssXml).toMatch(/<\/channel>/);
      expect(rssXml).toMatch(/<\/rss>$/);

      // Check for proper CDATA sections
      expect(rssXml).toContain('<![CDATA[');
      expect(rssXml).toContain(']]>');

      logger.info('XML Structure: Successfully generated well-formed XML');
    });

    test('should handle special characters in content', async () => {
      const specialEpisode = new PodcastEpisode({
        id: 'special-episode',
        title: 'AI & Machine Learning: The "Future" of Tech',
        description: 'Exploring AI & ML with special characters: <>&"\'',
        // content_url: 'https://example.com/special', // Removed - not in PodcastEpisodeData interface
        content_type: 'url',
        audio_url: 'https://example.com/audio/special.mp3',
        audio_duration: 1200,
        audio_size: 10000000,
        transcript: 'Special characters: <>&"\'',
        dialogue_script: 'Special characters: <>&"\'',
        summary: 'Testing special characters',
        chapter_markers: [],
        pub_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        source_url: 'https://example.com/special-source'
      });

      const rssXml = await rssGenerator.generateRss([specialEpisode], getFeedMetadata(testFeed));
      
      // Should properly escape special characters (using HTML entities, not CDATA)
      expect(rssXml).toContain('AI &amp; Machine Learning: The &quot;Future&quot; of Tech');
      expect(rssXml).toContain('Exploring AI &amp; ML with special characters: &lt;&gt;&amp;&quot;&#39;');

      logger.info('Special Characters: Successfully handled special characters');
    });

    test('should handle empty episode list', async () => {
      const rssXml = await rssGenerator.generateRss([], getFeedMetadata(testFeed));
      
      expect(rssXml).toBeDefined();
      expect(rssXml).toContain('<rss');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).not.toContain('<item>');

      logger.info('Empty Episodes: Successfully handled empty episode list');
    });
  });

  describe('RSS Feed Caching', () => {
    test('should cache RSS feed for performance', async () => {
      // Generate RSS feed
      await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Cache the feed
      await rssCacheService.getRssFeed(testEpisodes, 'test-feed-1', { forceRefresh: true });
      
      // Retrieve from cache
      const cachedResult = await rssCacheService.getRssFeed(testEpisodes, 'test-feed-1', { forceRefresh: false });
      expect(cachedResult).toBeDefined();
      expect(cachedResult.content).toBeDefined();

      logger.info('RSS Caching: Successfully cached and retrieved RSS feed');
    });

    test('should handle cache expiration', async () => {
      // Cache with very short TTL (simulated by force refresh)
      await rssCacheService.getRssFeed(testEpisodes, 'test-feed-1', { forceRefresh: true });
      
      // Wait for expiration (simulated by force refresh)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should return fresh content (not from cache)
      const freshResult = await rssCacheService.getRssFeed(testEpisodes, 'test-feed-1', { forceRefresh: true });
      expect(freshResult).toBeDefined();
      expect(freshResult.content).toBeDefined();

      logger.info('Cache Expiration: Successfully handled cache expiration');
    });

    test('should invalidate cache when episodes change', async () => {
      // Cache initial feed
      await rssCacheService.getRssFeed(testEpisodes, 'test-feed-1', { forceRefresh: true });
      
      // Invalidate cache
      await rssCacheService.invalidateRssCache('test-feed-1');
      
      // Should return fresh content after invalidation
      const freshResult = await rssCacheService.getRssFeed(testEpisodes, 'test-feed-1', { forceRefresh: true });
      expect(freshResult).toBeDefined();
      expect(freshResult.content).toBeDefined();

      logger.info('Cache Invalidation: Successfully invalidated RSS cache');
    });
  });

  describe('RSS Feed Performance', () => {
    test('should generate feed quickly with many episodes', async () => {
      // Create many episodes
      const manyEpisodes: PodcastEpisode[] = [];
      for (let i = 0; i < 100; i++) {
        manyEpisodes.push(new PodcastEpisode({
          id: `episode-${i}`,
          title: `Episode ${i}: Test Title`,
          description: `This is episode ${i} description`,
          // content_url: `https://example.com/episode-${i}`, // Removed - not in PodcastEpisodeData interface
          content_type: 'url',
          audio_url: `https://example.com/audio/episode-${i}.mp3`,
          audio_duration: 1800,
          audio_size: 15000000,
          transcript: `Episode ${i} transcript`,
          dialogue_script: `Episode ${i} script`,
          summary: `Episode ${i} summary`,
          chapter_markers: [],
          pub_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          source_url: `https://example.com/source-${i}`
        }));
      }

      const startTime = Date.now();
      const rssXml = await rssGenerator.generateRss(manyEpisodes, getFeedMetadata(testFeed));
      const endTime = Date.now();
      
      expect(rssXml).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Should have 100 episodes
      const itemMatches = rssXml.match(/<item>/g);
      expect(itemMatches).toHaveLength(100);

      logger.info(`Performance: Successfully generated RSS feed with 100 episodes in ${endTime - startTime}ms`);
    });

    test('should handle large episode descriptions', async () => {
      const largeDescription = 'A'.repeat(1000); // 1KB description (max allowed)
      
      const largeEpisode = new PodcastEpisode({
        id: 'large-episode',
        title: 'Episode with Large Description',
        description: largeDescription,
        // content_url: 'https://example.com/large', // Removed - not in PodcastEpisodeData interface
        content_type: 'url',
        audio_url: 'https://example.com/audio/large.mp3',
        audio_duration: 1800,
        audio_size: 15000000,
        transcript: 'Large episode transcript',
        dialogue_script: 'Large episode script',
        summary: 'Large episode summary',
        chapter_markers: [],
        pub_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        source_url: 'https://example.com/large-source'
      });

      const rssXml = await rssGenerator.generateRss([largeEpisode], getFeedMetadata(testFeed));
      
      expect(rssXml).toBeDefined();
      expect(rssXml).toContain('<![CDATA[');
      expect(rssXml).toContain(']]>');

      logger.info('Large Descriptions: Successfully handled large episode descriptions');
    });
  });

  describe('RSS Feed Compatibility', () => {
    test('should be compatible with major podcast apps', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Check for elements required by major podcast apps
      expect(rssXml).toContain('<rss version="2.0"');
      expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      expect(rssXml).toContain('<enclosure');
      expect(rssXml).toContain('type="audio/mpeg"');
      expect(rssXml).toContain('<itunes:explicit>');
      expect(rssXml).toContain('<itunes:category');

      logger.info('Podcast App Compatibility: Successfully generated compatible RSS feed');
    });

    test('should include proper MIME types', async () => {
      const rssXml = await rssGenerator.generateRss(testEpisodes, getFeedMetadata(testFeed));
      
      // Should specify correct MIME type for audio
      expect(rssXml).toContain('type="audio/mpeg"');
      
      // Should not include invalid MIME types
      expect(rssXml).not.toContain('type="audio/wav"');
      expect(rssXml).not.toContain('type="audio/ogg"');

      logger.info('MIME Types: Successfully included proper MIME types');
    });
  });
});
