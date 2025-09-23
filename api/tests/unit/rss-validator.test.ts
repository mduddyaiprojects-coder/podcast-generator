import { describe, it, expect } from '@jest/globals';
import { RssValidator } from '../../src/utils/rss-validator';

describe('RssValidator', () => {
  const validRssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[Test Podcast]]></title>
    <description><![CDATA[Test Description]]></description>
    <link>https://example.com</link>
    <language>en-us</language>
    <lastBuildDate>Mon, 01 Jan 2024 00:00:00 GMT</lastBuildDate>
    <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
    <generator>Test Generator</generator>
    <managingEditor>test@example.com</managingEditor>
    <webMaster>test@example.com</webMaster>
    <itunes:author>Test Author</itunes:author>
    <itunes:summary><![CDATA[Test Summary]]></itunes:summary>
    <itunes:owner>
      <itunes:name>Test Author</itunes:name>
      <itunes:email>test@example.com</itunes:email>
    </itunes:owner>
    <itunes:explicit>no</itunes:explicit>
    <itunes:category text="Technology"/>
    <itunes:type>episodic</itunes:type>
    <itunes:image href="https://example.com/image.jpg"/>
    <item>
      <title><![CDATA[Test Episode]]></title>
      <description><![CDATA[Test Episode Description]]></description>
      <link>https://example.com/episode</link>
      <guid isPermaLink="false">test-episode-1</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" length="1024000"/>
      <itunes:title><![CDATA[Test Episode]]></itunes:title>
      <itunes:summary><![CDATA[Test Episode Description]]></itunes:summary>
      <itunes:duration>5:00</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
    </item>
  </channel>
</rss>`;

  const invalidRssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Podcast</title>
  </channel>
</rss>`;

  describe('RSS Feed Validation', () => {
    it('should validate valid RSS feed', () => {
      const result = RssValidator.validateRssFeed(validRssContent);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThan(0);
    });

    it('should detect errors in invalid RSS feed', () => {
      const result = RssValidator.validateRssFeed(invalidRssContent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate with custom options', () => {
      const result = RssValidator.validateRssFeed(validRssContent, {
        checkiTunesCompliance: true,
        checkContentQuality: true,
        checkPerformance: true,
        maxEpisodes: 50,
        maxTitleLength: 200,
        maxDescriptionLength: 3000
      });
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Quick Validation', () => {
    it('should perform quick validation on valid RSS', () => {
      const result = RssValidator.quickValidate(validRssContent);
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect issues in invalid RSS', () => {
      const result = RssValidator.quickValidate(invalidRssContent);
      
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('iTunes Requirements Validation', () => {
    it('should validate iTunes requirements', () => {
      const result = RssValidator.validateiTunesRequirements(validRssContent);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing iTunes elements', () => {
      const result = RssValidator.validateiTunesRequirements(invalidRssContent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Summary', () => {
    it('should generate validation summary', () => {
      const result = RssValidator.validateRssFeed(validRssContent);
      const summary = RssValidator.getValidationSummary(result);
      
      expect(summary).toContain('RSS Feed Validation');
      expect(summary).toContain('VALID');
      expect(summary).toContain('Score:');
    });

    it('should generate summary for invalid feed', () => {
      const result = RssValidator.validateRssFeed(invalidRssContent);
      const summary = RssValidator.getValidationSummary(result);
      
      expect(summary).toContain('RSS Feed Validation');
      expect(summary).toContain('INVALID');
      expect(summary).toContain('Errors');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty RSS content', () => {
      const result = RssValidator.validateRssFeed('');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle malformed XML', () => {
      const malformedXml = '<rss version="2.0"><channel><title>Test</title></channel>';
      const result = RssValidator.validateRssFeed(malformedXml);
      
      expect(result.valid).toBe(false);
    });

    it('should handle RSS with no episodes', () => {
      const rssWithoutEpisodes = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Test Podcast</title>
    <description>Test Description</description>
    <link>https://example.com</link>
    <language>en-us</language>
    <itunes:author>Test Author</itunes:author>
    <itunes:summary>Test Summary</itunes:summary>
    <itunes:explicit>no</itunes:explicit>
    <itunes:category text="Technology"/>
  </channel>
</rss>`;

      const result = RssValidator.validateRssFeed(rssWithoutEpisodes);
      expect(result.warnings).toContainEqual(expect.stringContaining('No episodes found'));
    });

    it('should handle RSS with very long content', () => {
      const longTitle = 'A'.repeat(300);
      const longDescription = 'B'.repeat(5000);
      
      const rssWithLongContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title><![CDATA[${longTitle}]]></title>
    <description><![CDATA[${longDescription}]]></description>
    <link>https://example.com</link>
    <language>en-us</language>
    <itunes:author>Test Author</itunes:author>
    <itunes:summary>Test Summary</itunes:summary>
    <itunes:explicit>no</itunes:explicit>
    <itunes:category text="Technology"/>
    <item>
      <title><![CDATA[${longTitle}]]></title>
      <description><![CDATA[${longDescription}]]></description>
      <link>https://example.com/episode</link>
      <guid>test-episode-1</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <itunes:title><![CDATA[${longTitle}]]></itunes:title>
      <itunes:summary><![CDATA[${longDescription}]]></itunes:summary>
      <itunes:duration>5:00</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
    </item>
  </channel>
</rss>`;

      const result = RssValidator.validateRssFeed(rssWithLongContent, {
        maxTitleLength: 255,
        maxDescriptionLength: 4000
      });
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
