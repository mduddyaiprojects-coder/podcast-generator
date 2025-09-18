import { describe, it, expect, beforeEach } from '@jest/globals';
import { RssGenerator, FeedMetadata } from '../../src/services/rss-generator';
import { PodcastEpisode } from '../../src/models/podcast-episode';

describe('RssGenerator Service', () => {
  let rssGenerator: RssGenerator;
  let episodes: PodcastEpisode[];

  beforeEach(() => {
    rssGenerator = new RssGenerator();
    
    episodes = [
      new PodcastEpisode({
        title: 'Test Episode 1',
        description: 'First test episode',
        source_url: 'https://example.com/article1',
        content_type: 'url',
        audio_duration: 300,
        audio_size: 1024000,
        pub_date: new Date('2024-01-01T00:00:00Z')
      }).updateAudio('https://example.com/audio1.mp3', 300, 1024000),
      
      new PodcastEpisode({
        title: 'Test Episode 2',
        description: 'Second test episode',
        source_url: 'https://example.com/article2',
        content_type: 'youtube',
        audio_duration: 600,
        audio_size: 2048000,
        pub_date: new Date('2024-01-02T00:00:00Z')
      }).updateAudio('https://example.com/audio2.mp3', 600, 2048000)
    ];
  });

  describe('Constructor and Default Metadata', () => {
    it('should initialize with default metadata', () => {
      expect(rssGenerator).toBeDefined();
    });
  });

  describe('RSS Generation', () => {
    it('should generate RSS feed for episodes', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('<![CDATA[AI Podcast Generator]]>');
      expect(rssContent).toContain('<![CDATA[AI-generated podcast episodes');
    });

    it('should generate public RSS feed', async () => {
      const rssContent = await rssGenerator.generatePublicRss(episodes);
      
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('<channel>');
    });

    it('should include iTunes namespace', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      expect(rssContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
    });

    it('should include content namespace', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      expect(rssContent).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    });
  });

  describe('Episode XML Generation', () => {
    it('should generate episode XML with required elements', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      expect(rssContent).toContain('<item>');
      expect(rssContent).toContain('<title><![CDATA[Test Episode 1]]></title>');
      expect(rssContent).toContain('<description><![CDATA[First test episode]]></description>');
      expect(rssContent).toContain('<link>https://example.com/article1</link>');
      expect(rssContent).toContain('<guid isPermaLink="false">');
      expect(rssContent).toContain('<pubDate>');
    });

    it('should include enclosure for episodes with audio', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      expect(rssContent).toContain('<enclosure url="https://example.com/audio1.mp3"');
      expect(rssContent).toContain('type="audio/mpeg"');
      expect(rssContent).toContain('length="1024000"');
    });

    it('should include iTunes elements', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      expect(rssContent).toContain('<itunes:title>');
      expect(rssContent).toContain('<itunes:summary>');
      expect(rssContent).toContain('<itunes:duration>');
      expect(rssContent).toContain('<itunes:episodeType>full</itunes:episodeType>');
    });

    it('should include chapter markers when requested', async () => {
      const episodeWithChapters = episodes[0]!.updateChapterMarkers([
        { start_time: 0, end_time: 120, title: 'Introduction' },
        { start_time: 120, end_time: 240, title: 'Main Discussion' },
        { start_time: 240, end_time: 300, title: 'Conclusion' }
      ]);
      
      const rssContent = await rssGenerator.generateRss([episodeWithChapters], {}, {
        include_chapters: true
      });
      
      expect(rssContent).toContain('<itunes:chapters>');
      expect(rssContent).toContain('<itunes:chapter start="0" title="Introduction"/>');
      expect(rssContent).toContain('<itunes:chapter start="120" title="Main Discussion"/>');
      expect(rssContent).toContain('<itunes:chapter start="240" title="Conclusion"/>');
    });

    it('should include transcript when requested', async () => {
      const episodeWithTranscript = episodes[0]!.updateTranscript('This is the full transcript...');
      
      const rssContent = await rssGenerator.generateRss([episodeWithTranscript], {}, {
        include_transcript: true
      });
      
      expect(rssContent).toContain('<content:encoded><![CDATA[This is the full transcript...]]></content:encoded>');
    });

    it('should include summary when available', async () => {
      const episodeWithSummary = episodes[0]!.updateSummary('This is a summary of the episode...');
      
      const rssContent = await rssGenerator.generateRss([episodeWithSummary]);
      
      expect(rssContent).toContain('<itunes:subtitle><![CDATA[This is a summary of the episode...]]></itunes:subtitle>');
    });
  });

  describe('Sorting and Filtering', () => {
    it('should sort episodes by newest first by default', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      
      // Find the order of episodes in the RSS
      const episode1Index = rssContent.indexOf('Test Episode 1');
      const episode2Index = rssContent.indexOf('Test Episode 2');
      
      // Episode 2 (newer) should come before Episode 1 (older)
      expect(episode2Index).toBeLessThan(episode1Index);
    });

    it('should sort episodes by oldest first when requested', async () => {
      const rssContent = await rssGenerator.generateRss(episodes, {}, {
        sort_order: 'oldest'
      });
      
      const episode1Index = rssContent.indexOf('Test Episode 1');
      const episode2Index = rssContent.indexOf('Test Episode 2');
      
      // Episode 1 (older) should come before Episode 2 (newer)
      expect(episode1Index).toBeLessThan(episode2Index);
    });

    it('should limit number of episodes', async () => {
      const rssContent = await rssGenerator.generateRss(episodes, {}, {
        max_episodes: 1
      });
      
      // Count the number of <item> elements instead of title occurrences
      const itemCount = (rssContent.match(/<item>/g) || []).length;
      
      expect(itemCount).toBe(1); // Should only have 1 episode
    });
  });

  describe('Custom Metadata', () => {
    it('should use custom feed metadata', async () => {
      const customMetadata: Partial<FeedMetadata> = {
        title: 'Custom Podcast',
        description: 'Custom description',
        author: 'Custom Author',
        email: 'custom@example.com',
        category: 'News'
      };
      
      const rssContent = await rssGenerator.generateRss(episodes, customMetadata);
      
      expect(rssContent).toContain('<title><![CDATA[Custom Podcast]]></title>');
      expect(rssContent).toContain('<description><![CDATA[Custom description]]></description>');
      expect(rssContent).toContain('<itunes:author>Custom Author</itunes:author>');
      expect(rssContent).toContain('<itunes:category text="News"/>');
    });

    it('should include artwork URL when provided', async () => {
      const customMetadata: Partial<FeedMetadata> = {
        artwork_url: 'https://example.com/artwork.png'
      };
      
      const rssContent = await rssGenerator.generateRss(episodes, customMetadata);
      
      expect(rssContent).toContain('<itunes:image href="https://example.com/artwork.png"/>');
    });
  });

  describe('XML Escaping', () => {
    it('should escape XML special characters in titles', async () => {
      const episodeWithSpecialChars = new PodcastEpisode({
        title: 'Episode with <script>alert("xss")</script> & special chars',
        description: 'Description with <b>HTML</b> & "quotes"',
        source_url: 'https://example.com/article',
        content_type: 'url',
        audio_duration: 300,
        audio_size: 1024000,
        pub_date: new Date()
      });
      
      const rssContent = await rssGenerator.generateRss([episodeWithSpecialChars]);
      
      expect(rssContent).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(rssContent).toContain('&amp; special chars');
      expect(rssContent).toContain('&lt;b&gt;HTML&lt;/b&gt;');
    });
  });

  describe('RSS Validation', () => {
    it('should validate RSS content structure', async () => {
      const rssContent = await rssGenerator.generateRss(episodes);
      const validation = rssGenerator.validateRSS(rssContent);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing XML declaration', () => {
      const invalidRSS = '<rss version="2.0"><channel></channel></rss>';
      const validation = rssGenerator.validateRSS(invalidRSS);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing XML declaration');
    });

    it('should detect missing RSS root element', () => {
      const invalidRSS = '<?xml version="1.0" encoding="UTF-8"?><channel></channel>';
      const validation = rssGenerator.validateRSS(invalidRSS);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing or invalid RSS root element');
    });

    it('should detect missing iTunes namespace', () => {
      const invalidRSS = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel></channel></rss>';
      const validation = rssGenerator.validateRSS(invalidRSS);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing iTunes namespace');
    });
  });

  describe('Feed Statistics', () => {
    it('should calculate feed statistics', () => {
      const stats = rssGenerator.getFeedStats(episodes);
      
      expect(stats.total_episodes).toBe(2);
      expect(stats.total_duration_seconds).toBe(900); // 300 + 600
      expect(stats.total_duration_formatted).toBe('15:00');
      expect(stats.content_types).toEqual({
        'url': 1,
        'youtube': 1
      });
      expect(stats.date_range.oldest).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(stats.date_range.newest).toEqual(new Date('2024-01-02T00:00:00Z'));
    });

    it('should handle empty episodes list', () => {
      const stats = rssGenerator.getFeedStats([]);
      
      expect(stats.total_episodes).toBe(0);
      expect(stats.total_duration_seconds).toBe(0);
      expect(stats.total_duration_formatted).toBe('0:00');
      expect(stats.content_types).toEqual({});
      expect(stats.date_range.oldest).toBeNull();
      expect(stats.date_range.newest).toBeNull();
    });
  });

  describe('Feed Validation', () => {
    it('should validate feed quality', async () => {
      const validation = await rssGenerator.validateFeed(episodes);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn about episodes without audio', async () => {
      const episodeWithoutAudio = new PodcastEpisode({
        title: 'Episode without audio',
        description: 'This episode has no audio',
        source_url: 'https://example.com/article',
        content_type: 'url',
        audio_duration: 0,
        audio_size: 0,
        pub_date: new Date()
      });
      
      const validation = await rssGenerator.validateFeed([episodeWithoutAudio]);
      
      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('1 episodes without audio');
    });

    it('should warn about episodes without descriptions', async () => {
      // Create a valid episode first
      const episode = new PodcastEpisode({
        title: 'Episode with description',
        description: 'Valid description',
        source_url: 'https://example.com/article',
        content_type: 'url',
        audio_duration: 300,
        audio_size: 1024000,
        pub_date: new Date()
      });
      
      // Manually set description to empty to test validation
      const episodeWithoutDescription = { 
        ...episode, 
        description: '',
        hasAudio: () => true,
        hasTranscript: () => false,
        hasDialogueScript: () => false,
        hasChapterMarkers: () => false
      } as any;
      
      const validation = await rssGenerator.validateFeed([episodeWithoutDescription]);
      
      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('1 episodes without descriptions');
    });

    it('should warn about very long titles', async () => {
      // Create a valid episode first
      const episode = new PodcastEpisode({
        title: 'Normal title',
        description: 'Test description',
        source_url: 'https://example.com/article',
        content_type: 'url',
        audio_duration: 300,
        audio_size: 1024000,
        pub_date: new Date()
      });
      
      // Manually set title to be too long to test validation
      const episodeWithLongTitle = { 
        ...episode, 
        title: 'A'.repeat(201),
        hasAudio: () => true,
        hasTranscript: () => false,
        hasDialogueScript: () => false,
        hasChapterMarkers: () => false
      } as any;
      
      const validation = await rssGenerator.validateFeed([episodeWithLongTitle]);
      
      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('1 episodes with very long titles (>200 chars)');
    });

    it('should warn about very long descriptions', async () => {
      // Create a valid episode first
      const episode = new PodcastEpisode({
        title: 'Test Episode',
        description: 'Normal description',
        source_url: 'https://example.com/article',
        content_type: 'url',
        audio_duration: 300,
        audio_size: 1024000,
        pub_date: new Date()
      });
      
      // Manually set description to be too long to test validation
      const episodeWithLongDescription = { 
        ...episode, 
        description: 'A'.repeat(1001),
        hasAudio: () => true,
        hasTranscript: () => false,
        hasDialogueScript: () => false,
        hasChapterMarkers: () => false
      } as any;
      
      const validation = await rssGenerator.validateFeed([episodeWithLongDescription]);
      
      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('1 episodes with very long descriptions (>1000 chars)');
    });
  });

  describe('URL Generation', () => {
    it('should generate RSS feed URL', () => {
      const baseUrl = 'https://podcast.example.com';
      const rssUrl = rssGenerator.getRSSFeedUrl(baseUrl);
      
      expect(rssUrl).toBe('https://podcast.example.com/rss.xml');
    });

    it('should generate episodes URL', () => {
      const baseUrl = 'https://podcast.example.com';
      const episodesUrl = rssGenerator.getEpisodesUrl(baseUrl);
      
      expect(episodesUrl).toBe('https://podcast.example.com/episodes');
    });
  });

  describe('Error Handling', () => {
    it('should handle RSS generation errors gracefully', async () => {
      // Mock an error in the generation process
      const originalBuildRSSXML = (rssGenerator as any).buildRSSXML;
      (rssGenerator as any).buildRSSXML = () => {
        throw new Error('RSS generation failed');
      };
      
      await expect(rssGenerator.generateRss(episodes)).rejects.toThrow('RSS generation failed: RSS generation failed');
      
      // Restore original method
      (rssGenerator as any).buildRSSXML = originalBuildRSSXML;
    });
  });
});
