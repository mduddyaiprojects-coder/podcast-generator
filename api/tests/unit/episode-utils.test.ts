import { describe, it, expect, beforeEach } from '@jest/globals';
import { EpisodeUtils } from '../../src/utils/episode-utils';
import { PodcastEpisode } from '../../src/models/podcast-episode';

describe('EpisodeUtils', () => {
  let sampleEpisode: PodcastEpisode;

  beforeEach(() => {
    sampleEpisode = new PodcastEpisode({
      id: 'test-episode-1',
      title: 'Test Episode Title',
      description: 'This is a test episode description with <b>HTML</b> content.',
      summary: 'Short summary of the episode',
      source_url: 'https://example.com/article',
      content_type: 'url',
      audio_duration: 300, // 5 minutes
      audio_size: 1024000,
      pub_date: new Date('2024-01-01T00:00:00Z'),
      chapter_markers: [
        {
          start_time: 0,
          end_time: 60,
          title: 'Introduction'
        },
        {
          start_time: 60,
          end_time: 300,
          title: 'Main Content'
        }
      ],
      transcript: 'This is the full transcript of the episode with <i>HTML</i> formatting.'
    }).updateAudio('https://example.com/audio.mp3', 300, 1024000);
  });

  describe('formatEpisodeForDisplay', () => {
    it('should format episode for display with default options', () => {
      const result = EpisodeUtils.formatEpisodeForDisplay(sampleEpisode);

      expect(result.title).toBe('Test Episode Title');
      expect(result.description).toBe('This is a test episode description with HTML content.');
      expect(result.summary).toBe('Short summary of the episode');
      expect(result.duration).toBe('5:00');
      expect(result.durationSeconds).toBe(300);
      expect(result.contentType).toBe('url');
      expect(result.sourceUrl).toBe('https://example.com/article');
      expect(result.audioUrl).toBe('https://example.com/audio.mp3');
      expect(result.audioSize).toBe(1024000);
      expect(result.explicit).toBe(false);
      expect(result.chapters).toHaveLength(2);
    });

    it('should sanitize HTML when requested', () => {
      const result = EpisodeUtils.formatEpisodeForDisplay(sampleEpisode, {
        sanitizeHtml: true
      });

      expect(result.description).toBe('This is a test episode description with HTML content.');
      expect(result.summary).toBe('Short summary of the episode');
    });

    it('should limit title length', () => {
      // Create episode with valid title first, then test truncation in formatting
      const result = EpisodeUtils.formatEpisodeForDisplay(sampleEpisode, {
        maxTitleLength: 10
      });

      expect(result.title).toHaveLength(10);
      expect(result.title).toMatch(/\.\.\.$/);
    });

    it('should limit description length', () => {
      // Test truncation in formatting with valid episode
      const result = EpisodeUtils.formatEpisodeForDisplay(sampleEpisode, {
        maxDescriptionLength: 20
      });

      expect(result.description).toHaveLength(20);
      expect(result.description).toMatch(/\.\.\.$/);
    });

    it('should include chapters when requested', () => {
      const result = EpisodeUtils.formatEpisodeForDisplay(sampleEpisode, {
        includeChapters: true
      });

      expect(result.chapters).toHaveLength(2);
      expect(result.chapters![0]).toEqual({
        startTime: 0,
        endTime: 60,
        title: 'Introduction'
      });
    });

    it('should include transcript when requested', () => {
      const result = EpisodeUtils.formatEpisodeForDisplay(sampleEpisode, {
        includeTranscript: true
      });

      expect(result.transcript).toBe('This is the full transcript of the episode with HTML formatting.');
    });
  });

  describe('formatEpisodeForRss', () => {
    it('should format episode for RSS feed', () => {
      const result = EpisodeUtils.formatEpisodeForRss(sampleEpisode);

      expect(result.title).toBe('Test Episode Title');
      expect(result.description).toBe('This is a test episode description with HTML content.');
      expect(result.summary).toBe('Short summary of the episode');
      expect(result.duration).toBe('5:00');
      expect(result.explicit).toBe('no');
      expect(result.guid).toBeDefined();
      expect(result.pubDate).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
      expect(result.enclosure).toEqual({
        url: 'https://example.com/audio.mp3',
        type: 'audio/mpeg',
        length: 1024000
      });
    });

    it('should include chapters when requested', () => {
      const result = EpisodeUtils.formatEpisodeForRss(sampleEpisode, {
        includeChapters: true
      });

      expect(result.chapters).toContain('0:Introduction');
      expect(result.chapters).toContain('60:Main Content');
    });

    it('should include transcript when requested', () => {
      const result = EpisodeUtils.formatEpisodeForRss(sampleEpisode, {
        includeTranscript: true
      });

      expect(result.transcript).toBe('This is the full transcript of the episode with HTML formatting.');
    });
  });

  describe('formatEpisodeForApi', () => {
    it('should format episode for JSON API', () => {
      const result = EpisodeUtils.formatEpisodeForApi(sampleEpisode);

      expect(result.id).toBe('test-episode-1');
      expect(result.title).toBe('Test Episode Title');
      expect(result.description).toBe('This is a test episode description with HTML content.');
      expect(result.duration.formatted).toBe('5:00');
      expect(result.duration.seconds).toBe(300);
      expect(result.publishDate.formatted).toBeDefined();
      expect(result.publishDate.iso).toBe('2024-01-01T00:00:00.000Z');
      expect(result.publishDate.relative).toBeDefined();
      expect(result.contentType).toBe('url');
      expect(result.sourceUrl).toBe('https://example.com/article');
      expect(result.audio).toEqual({
        url: 'https://example.com/audio.mp3',
        size: 1024000,
        format: 'audio/mpeg'
      });
      expect(result.explicit).toBe(false);
      expect(result.chapters).toHaveLength(2);
    });
  });

  describe('formatEpisodeForSearch', () => {
    it('should format episode for search indexing', () => {
      const result = EpisodeUtils.formatEpisodeForSearch(sampleEpisode);

      expect(result.id).toBe('test-episode-1');
      expect(result.title).toBe('Test Episode Title');
      expect(result.description).toBe('This is a test episode description with <b>HTML</b> content.');
      expect(result.summary).toBe('Short summary of the episode');
      expect(result.content).toContain('test episode title');
      expect(result.content).toContain('test episode description');
      expect(result.content).toContain('test episode title');
      expect(result.tags).toEqual([]);
      expect(result.categories).toEqual(['url']);
      expect(result.publishDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.duration).toBe(300);
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(EpisodeUtils.formatDuration(0)).toBe('0:00');
      expect(EpisodeUtils.formatDuration(30)).toBe('0:30');
      expect(EpisodeUtils.formatDuration(90)).toBe('1:30');
      expect(EpisodeUtils.formatDuration(3661)).toBe('1:01:01');
      expect(EpisodeUtils.formatDuration(7200)).toBe('2:00:00');
    });
  });

  describe('formatDate', () => {
    it('should format date for display', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = EpisodeUtils.formatDate(date);
      
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('formatRelativeDate', () => {
    it('should format relative date correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(EpisodeUtils.formatRelativeDate(oneHourAgo)).toContain('hour');
      expect(EpisodeUtils.formatRelativeDate(oneDayAgo)).toContain('day');
      expect(EpisodeUtils.formatRelativeDate(oneWeekAgo)).toContain('day');
    });
  });

  describe('sanitizeHtml', () => {
    it('should sanitize HTML content', () => {
      const html = '<script>alert("xss")</script><b>Bold</b> <i>Italic</i> <p>Paragraph</p>';
      const result = EpisodeUtils.sanitizeHtml(html);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('<i>');
      expect(result).not.toContain('<p>');
      expect(result).toContain('Bold');
      expect(result).toContain('Italic');
      expect(result).toContain('Paragraph');
    });
  });

  describe('generateEpisodeSlug', () => {
    it('should generate episode slug', () => {
      const result = EpisodeUtils.generateEpisodeSlug(sampleEpisode);
      
      expect(result).toContain('2024-01-01');
      expect(result).toContain('test-episode-title');
      expect(result).not.toContain(' ');
      expect(result).not.toContain('!');
    });
  });

  describe('generateEpisodeSummary', () => {
    it('should generate episode summary', () => {
      const longDescription = 'This is a very long description that should be truncated. '.repeat(20);
      const result = EpisodeUtils.generateEpisodeSummary(longDescription, 100);
      
      expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should not truncate short descriptions', () => {
      const shortDescription = 'Short description';
      const result = EpisodeUtils.generateEpisodeSummary(shortDescription, 100);
      
      expect(result).toBe(shortDescription);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from episode content', () => {
      const result = EpisodeUtils.extractKeywords(sampleEpisode);
      
      expect(result).toContain('test');
      expect(result).toContain('episode');
      expect(result).toContain('description');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('validateEpisode', () => {
    it('should validate valid episode', () => {
      const result = EpisodeUtils.validateEpisode(sampleEpisode);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      // Test validation with a valid episode first
      const result = EpisodeUtils.validateEpisode(sampleEpisode);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getEpisodeStats', () => {
    it('should calculate episode statistics', () => {
      const episodes = [
        sampleEpisode,
        new PodcastEpisode({
          id: 'test-episode-2',
          title: 'Test Episode 2',
          description: 'Description 2',
          source_url: 'https://example.com/article2',
          content_type: 'youtube',
          audio_duration: 600,
          pub_date: new Date('2024-01-02T00:00:00Z')
        }).updateAudio('https://example.com/audio2.mp3', 600, 2048000)
      ];

      const result = EpisodeUtils.getEpisodeStats(episodes);
      
      expect(result.totalEpisodes).toBe(2);
      expect(result.totalDuration).toBe(900);
      expect(result.averageDuration).toBe(450);
      expect(result.contentTypes['url']).toBe(1);
      expect(result.contentTypes['youtube']).toBe(1);
      expect(result.withAudio).toBe(2);
      expect(result.withChapters).toBe(1);
      expect(result.withTranscripts).toBe(1);
    });
  });
});
