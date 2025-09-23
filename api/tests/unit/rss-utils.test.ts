import { describe, it, expect } from '@jest/globals';
import { RssUtils } from '../../src/utils/rss-utils';

describe('RssUtils', () => {
  describe('iTunes Category Validation', () => {
    it('should validate valid iTunes categories', () => {
      const validCategories = ['Technology', 'Arts', 'Business', 'Comedy'];
      
      for (const category of validCategories) {
        const result = RssUtils.validateiTunesCategory(category);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject invalid iTunes categories', () => {
      const invalidCategories = ['InvalidCategory', 'Random', 'Test'];
      
      for (const category of invalidCategories) {
        const result = RssUtils.validateiTunesCategory(category);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid iTunes category');
      }
    });

    it('should validate valid subcategories', () => {
      const validSubcategories = [
        { category: 'Technology', subcategory: 'Gadgets' },
        { category: 'Arts', subcategory: 'Design' },
        { category: 'Business', subcategory: 'Careers' }
      ];
      
      for (const { category, subcategory } of validSubcategories) {
        const result = RssUtils.validateiTunesCategory(category, subcategory);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid subcategories', () => {
      const invalidSubcategories = [
        { category: 'Technology', subcategory: 'InvalidSub' },
        { category: 'Arts', subcategory: 'Random' }
      ];
      
      for (const { category, subcategory } of invalidSubcategories) {
        const result = RssUtils.validateiTunesCategory(category, subcategory);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid iTunes subcategory');
      }
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration correctly for iTunes', () => {
      expect(RssUtils.formatDurationForiTunes(0)).toBe('0:00');
      expect(RssUtils.formatDurationForiTunes(30)).toBe('0:30');
      expect(RssUtils.formatDurationForiTunes(90)).toBe('1:30');
      expect(RssUtils.formatDurationForiTunes(3661)).toBe('1:01:01');
      expect(RssUtils.formatDurationForiTunes(7200)).toBe('2:00:00');
    });
  });

  describe('Explicit Flag Formatting', () => {
    it('should format explicit flag correctly', () => {
      expect(RssUtils.formatExplicitForiTunes(true)).toBe('yes');
      expect(RssUtils.formatExplicitForiTunes(false)).toBe('no');
    });
  });

  describe('iTunes Owner Validation', () => {
    it('should validate valid iTunes owner', () => {
      const validOwner = {
        name: 'Test Author',
        email: 'test@example.com'
      };
      
      const result = RssUtils.validateiTunesOwner(validOwner);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid iTunes owner', () => {
      const invalidOwners = [
        { name: '', email: 'test@example.com' },
        { name: 'Test Author', email: '' },
        { name: 'Test Author', email: 'invalid-email' },
        { name: 'A'.repeat(256), email: 'test@example.com' }
      ];
      
      for (const owner of invalidOwners) {
        const result = RssUtils.validateiTunesOwner(owner);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('iTunes Image Validation', () => {
    it('should validate valid iTunes image', () => {
      const validImages = [
        { href: 'https://example.com/image.jpg' },
        { href: 'https://example.com/image.png' },
        { href: 'https://example.com/image.jpeg' }
      ];
      
      for (const image of validImages) {
        const result = RssUtils.validateiTunesImage(image);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject invalid iTunes image', () => {
      const invalidImages = [
        { href: '' },
        { href: 'invalid-url' },
        { href: 'https://example.com/image.gif' },
        { href: 'https://example.com/image.bmp' }
      ];
      
      for (const image of invalidImages) {
        const result = RssUtils.validateiTunesImage(image);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('iTunes Category XML Generation', () => {
    it('should generate category XML without subcategory', () => {
      const xml = RssUtils.generateiTunesCategoryXML('Technology');
      expect(xml).toBe('<itunes:category text="Technology"/>');
    });

    it('should generate category XML with subcategory', () => {
      const xml = RssUtils.generateiTunesCategoryXML('Technology', 'Gadgets');
      expect(xml).toContain('<itunes:category text="Technology">');
      expect(xml).toContain('<itunes:category text="Gadgets"/>');
    });

    it('should throw error for invalid category', () => {
      expect(() => {
        RssUtils.generateiTunesCategoryXML('InvalidCategory');
      }).toThrow('Invalid iTunes category');
    });
  });

  describe('iTunes Owner XML Generation', () => {
    it('should generate owner XML', () => {
      const owner = { name: 'Test Author', email: 'test@example.com' };
      const xml = RssUtils.generateiTunesOwnerXML(owner);
      
      expect(xml).toContain('<itunes:owner>');
      expect(xml).toContain('<itunes:name>Test Author</itunes:name>');
      expect(xml).toContain('<itunes:email>test@example.com</itunes:email>');
      expect(xml).toContain('</itunes:owner>');
    });

    it('should throw error for invalid owner', () => {
      const invalidOwner = { name: '', email: 'test@example.com' };
      
      expect(() => {
        RssUtils.generateiTunesOwnerXML(invalidOwner);
      }).toThrow('Invalid iTunes owner');
    });
  });

  describe('iTunes Image XML Generation', () => {
    it('should generate image XML', () => {
      const image = { href: 'https://example.com/image.jpg' };
      const xml = RssUtils.generateiTunesImageXML(image);
      
      expect(xml).toBe('<itunes:image href="https://example.com/image.jpg"/>');
    });

    it('should throw error for invalid image', () => {
      const invalidImage = { href: 'invalid-url' };
      
      expect(() => {
        RssUtils.generateiTunesImageXML(invalidImage);
      }).toThrow('Invalid iTunes image');
    });
  });

  describe('iTunes Compliance Check', () => {
    it('should check iTunes compliance', () => {
      const validRss = `<?xml version="1.0" encoding="UTF-8"?>
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
    <itunes:owner>
      <itunes:name>Test Author</itunes:name>
      <itunes:email>test@example.com</itunes:email>
    </itunes:owner>
    <itunes:type>episodic</itunes:type>
    <item>
      <title>Test Episode</title>
      <description>Test Episode Description</description>
      <link>https://example.com/episode</link>
      <guid>test-episode-1</guid>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <itunes:title>Test Episode</itunes:title>
      <itunes:summary>Test Episode Description</itunes:summary>
      <itunes:duration>5:00</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
    </item>
  </channel>
</rss>`;

      const result = RssUtils.checkiTunesCompliance(validRss);
      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing iTunes elements', () => {
      const invalidRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Podcast</title>
    <description>Test Description</description>
    <link>https://example.com</link>
    <language>en-us</language>
  </channel>
</rss>`;

      const result = RssUtils.checkiTunesCompliance(invalidRss);
      expect(result.compliant).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('iTunes Compliance Score', () => {
    it('should calculate compliance score', () => {
      const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
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
    <itunes:owner>
      <itunes:name>Test Author</itunes:name>
      <itunes:email>test@example.com</itunes:email>
    </itunes:owner>
    <itunes:type>episodic</itunes:type>
  </channel>
</rss>`;

      const score = RssUtils.getiTunesComplianceScore(rssContent);
      expect(score.score).toBeGreaterThan(0);
      expect(score.maxScore).toBeGreaterThan(0);
      expect(score.percentage).toBeGreaterThan(0);
      expect(score.percentage).toBeLessThanOrEqual(100);
      expect(score.details).toBeDefined();
    });
  });

  describe('Namespace Generation', () => {
    it('should generate iTunes namespace', () => {
      const namespace = RssUtils.generateiTunesNamespace();
      expect(namespace).toBe('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
    });

    it('should generate content namespace', () => {
      const namespace = RssUtils.generateContentNamespace();
      expect(namespace).toBe('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    });
  });
});
