import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { RssValidator } from '../../src/utils/rss-validator';
import { RssUtils } from '../../src/utils/rss-utils';

/**
 * iTunes Validation Tests
 * 
 * Comprehensive validation against Apple's iTunes/Podcasts Connect requirements:
 * - Required elements and attributes
 * - Valid values and formats
 * - Content guidelines
 * - Technical specifications
 */

describe('iTunes RSS Feed Validation', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'PodcastGenerator-iTunes-Validation/1.0'
      }
    });
  });

  describe('Required iTunes Elements', () => {
    it('should have all required iTunes channel elements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const requiredElements = [
        'itunes:author',
        'itunes:summary',
        'itunes:explicit',
        'itunes:category',
        'itunes:owner'
      ];

      for (const element of requiredElements) {
        expect(rssContent).toContain(`<${element}>`);
      }
    });

    it('should have valid iTunes namespace declaration', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      expect(rssContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
    });

    it('should have iTunes type element', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      expect(rssContent).toContain('<itunes:type>');
      
      // Should be either 'episodic' or 'serial'
      const typeMatch = rssContent.match(/<itunes:type>([^<]+)<\/itunes:type>/);
      expect(typeMatch).toBeTruthy();
      expect(['episodic', 'serial']).toContain(typeMatch![1]);
    });
  });

  describe('iTunes Author and Owner', () => {
    it('should have valid iTunes author', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const authorMatch = rssContent.match(/<itunes:author>([^<]+)<\/itunes:author>/);
      expect(authorMatch).toBeTruthy();
      
      const author = authorMatch![1];
      expect(author.trim().length).toBeGreaterThan(0);
      expect(author.length).toBeLessThanOrEqual(255);
    });

    it('should have valid iTunes owner with name and email', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const ownerMatch = rssContent.match(/<itunes:owner>[\s\S]*?<itunes:name>([^<]+)<\/itunes:name>[\s\S]*?<itunes:email>([^<]+)<\/itunes:email>[\s\S]*?<\/itunes:owner>/);
      expect(ownerMatch).toBeTruthy();
      
      const [, name, email] = ownerMatch!;
      
      // Validate owner name
      expect(name.trim().length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(255);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  describe('iTunes Category Validation', () => {
    it('should have valid iTunes category', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const categoryMatch = rssContent.match(/<itunes:category text="([^"]+)"/);
      expect(categoryMatch).toBeTruthy();
      
      const category = categoryMatch![1];
      const validation = RssUtils.validateiTunesCategory(category);
      expect(validation.valid).toBe(true);
    });

    it('should have valid iTunes subcategory if provided', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check for subcategory
      const subcategoryMatch = rssContent.match(/<itunes:category text="([^"]+)">[\s\S]*?<itunes:category text="([^"]+)"/);
      if (subcategoryMatch) {
        const [, category, subcategory] = subcategoryMatch;
        const validation = RssUtils.validateiTunesCategory(category, subcategory);
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('iTunes Image Validation', () => {
    it('should have valid iTunes image if provided', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const imageMatch = rssContent.match(/<itunes:image href="([^"]+)"/);
      if (imageMatch) {
        const imageUrl = imageMatch[1];
        const validation = RssUtils.validateiTunesImage({ href: imageUrl });
        expect(validation.valid).toBe(true);
      }
    });

    it('should have proper image format if provided', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const imageMatch = rssContent.match(/<itunes:image href="([^"]+)"/);
      if (imageMatch) {
        const imageUrl = imageMatch[1];
        const validExtensions = ['.jpg', '.jpeg', '.png'];
        const hasValidExtension = validExtensions.some(ext => 
          imageUrl.toLowerCase().endsWith(ext)
        );
        expect(hasValidExtension).toBe(true);
      }
    });
  });

  describe('iTunes Episode Elements', () => {
    it('should have required iTunes episode elements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g);
      expect(itemMatches).toBeTruthy();
      
      if (itemMatches && itemMatches.length > 0) {
        for (const item of itemMatches) {
          const requiredEpisodeElements = [
            'itunes:title',
            'itunes:summary',
            'itunes:duration',
            'itunes:explicit',
            'itunes:episodeType'
          ];

          for (const element of requiredEpisodeElements) {
            expect(item).toContain(`<${element}>`);
          }
        }
      }
    });

    it('should have valid iTunes duration format', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const durationMatches = rssContent.match(/<itunes:duration>([^<]+)<\/itunes:duration>/g);
      if (durationMatches) {
        for (const duration of durationMatches) {
          const durationValue = duration.replace(/<\/?itunes:duration>/g, '');
          // Should match HH:MM:SS or MM:SS format
          expect(durationValue).toMatch(/^(\d{1,2}:)?\d{1,2}:\d{2}$/);
        }
      }
    });

    it('should have valid iTunes explicit values', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const explicitMatches = rssContent.match(/<itunes:explicit>([^<]+)<\/itunes:explicit>/g);
      if (explicitMatches) {
        for (const explicit of explicitMatches) {
          const explicitValue = explicit.replace(/<\/?itunes:explicit>/g, '');
          expect(['yes', 'no', 'clean']).toContain(explicitValue);
        }
      }
    });

    it('should have valid iTunes episode type', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const episodeTypeMatches = rssContent.match(/<itunes:episodeType>([^<]+)<\/itunes:episodeType>/g);
      if (episodeTypeMatches) {
        for (const episodeType of episodeTypeMatches) {
          const typeValue = episodeType.replace(/<\/?itunes:episodeType>/g, '');
          expect(['full', 'trailer', 'bonus']).toContain(typeValue);
        }
      }
    });
  });

  describe('Content Guidelines', () => {
    it('should have appropriate title lengths', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check channel title
      const channelTitleMatch = rssContent.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
      if (channelTitleMatch) {
        const title = channelTitleMatch[1];
        expect(title.length).toBeLessThanOrEqual(255);
      }

      // Check episode titles
      const episodeTitleMatches = rssContent.match(/<itunes:title><!\[CDATA\[([^\]]+)\]\]><\/itunes:title>/g);
      if (episodeTitleMatches) {
        for (const title of episodeTitleMatches) {
          const titleValue = title.replace(/<itunes:title><!\[CDATA\[([^\]]+)\]\]><\/itunes:title>/, '$1');
          expect(titleValue.length).toBeLessThanOrEqual(255);
        }
      }
    });

    it('should have appropriate description lengths', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check channel description
      const channelDescMatch = rssContent.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/);
      if (channelDescMatch) {
        const description = channelDescMatch[1];
        expect(description.length).toBeLessThanOrEqual(4000);
      }

      // Check episode descriptions
      const episodeDescMatches = rssContent.match(/<itunes:summary><!\[CDATA\[([^\]]+)\]\]><\/itunes:summary>/g);
      if (episodeDescMatches) {
        for (const desc of episodeDescMatches) {
          const descValue = desc.replace(/<itunes:summary><!\[CDATA\[([^\]]+)\]\]><\/itunes:summary>/, '$1');
          expect(descValue.length).toBeLessThanOrEqual(4000);
        }
      }
    });

    it('should have non-empty titles and descriptions', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check channel elements
      const channelTitleMatch = rssContent.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
      if (channelTitleMatch) {
        expect(channelTitleMatch[1].trim().length).toBeGreaterThan(0);
      }

      const channelDescMatch = rssContent.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/);
      if (channelDescMatch) {
        expect(channelDescMatch[1].trim().length).toBeGreaterThan(0);
      }

      // Check episode elements
      const episodeTitleMatches = rssContent.match(/<itunes:title><!\[CDATA\[([^\]]+)\]\]><\/itunes:title>/g);
      if (episodeTitleMatches) {
        for (const title of episodeTitleMatches) {
          const titleValue = title.replace(/<itunes:title><!\[CDATA\[([^\]]+)\]\]><\/itunes:title>/, '$1');
          expect(titleValue.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Technical Specifications', () => {
    it('should have valid XML structure', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check XML declaration
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      
      // Check RSS version
      expect(rssContent).toContain('<rss version="2.0"');
      
      // Check proper closing tags
      expect(rssContent).toContain('</rss>');
      expect(rssContent).toContain('</channel>');
    });

    it('should have proper character encoding', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      
      expect(response.headers['content-type']).toMatch(/charset=utf-8/i);
    });

    it('should have valid publication dates', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check channel lastBuildDate
      const lastBuildDateMatch = rssContent.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
      if (lastBuildDateMatch) {
        const lastBuildDate = new Date(lastBuildDateMatch[1]);
        expect(lastBuildDate.getTime()).not.toBeNaN();
      }

      // Check episode pubDates
      const episodePubDateMatches = rssContent.match(/<item>[\s\S]*?<pubDate>([^<]+)<\/pubDate>[\s\S]*?<\/item>/g);
      if (episodePubDateMatches) {
        for (const match of episodePubDateMatches) {
          const pubDateMatch = match.match(/<pubDate>([^<]+)<\/pubDate>/);
          if (pubDateMatch) {
            const pubDate = new Date(pubDateMatch[1]);
            expect(pubDate.getTime()).not.toBeNaN();
          }
        }
      }
    });
  });

  describe('Comprehensive iTunes Validation', () => {
    it('should pass comprehensive iTunes validation', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Use the comprehensive validator
      const validation = RssValidator.validateiTunesRequirements(rssContent);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have high iTunes compliance score', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const complianceScore = RssUtils.getiTunesComplianceScore(rssContent);
      expect(complianceScore.percentage).toBeGreaterThanOrEqual(80); // At least 80% compliance
    });

    it('should pass iTunes namespace validation', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const itunesCompliance = RssUtils.checkiTunesCompliance(rssContent);
      expect(itunesCompliance.compliant).toBe(true);
      expect(itunesCompliance.issues).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle special characters in content', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check for proper XML escaping
      expect(rssContent).not.toContain('&amp;amp;'); // Double escaping
      expect(rssContent).not.toContain('&lt;'); // Unescaped less than
      expect(rssContent).not.toContain('&gt;'); // Unescaped greater than
    });

    it('should handle empty or missing optional elements gracefully', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Feed should still be valid even if some optional elements are missing
      const validation = RssValidator.quickValidate(rssContent);
      expect(validation.valid).toBe(true);
    });

    it('should maintain valid RSS structure with iTunes elements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Should have both standard RSS and iTunes elements
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('xmlns:itunes=');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('<item>');
    });
  });

  describe('Performance and Optimization', () => {
    it('should respond within iTunes submission time limits', async () => {
      const startTime = Date.now();
      const response = await client.get('/feeds/default/rss.xml');
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
    });

    it('should have reasonable feed size', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const contentLength = response.data.length;

      // Feed should not be excessively large
      expect(contentLength).toBeLessThan(1024 * 1024); // Less than 1MB
    });

    it('should include proper cache headers for iTunes crawler', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      
      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['last-modified']).toBeDefined();
      expect(response.headers['etag']).toBeDefined();
    });
  });
});
