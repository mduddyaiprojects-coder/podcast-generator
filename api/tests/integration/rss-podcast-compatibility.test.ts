import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { RssValidator } from '../../src/utils/rss-validator';
import { RssUtils } from '../../src/utils/rss-utils';

/**
 * RSS Feed Podcast App Compatibility Tests
 * 
 * Tests RSS feed compatibility with various podcast apps and platforms:
 * - Apple Podcasts (iTunes)
 * - Spotify
 * - Google Podcasts
 * - Overcast
 * - Pocket Casts
 * - Generic RSS readers
 */

describe('RSS Feed Podcast App Compatibility', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'PodcastGenerator-Test/1.0'
      }
    });
  });

  describe('Apple Podcasts (iTunes) Compatibility', () => {
    it('should be compatible with Apple Podcasts requirements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Validate iTunes compliance
      const itunesCompliance = RssUtils.checkiTunesCompliance(rssContent);
      expect(itunesCompliance.compliant).toBe(true);
      expect(itunesCompliance.issues).toHaveLength(0);

      // Check required iTunes elements
      expect(rssContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      expect(rssContent).toContain('<itunes:author>');
      expect(rssContent).toContain('<itunes:summary>');
      expect(rssContent).toContain('<itunes:explicit>');
      expect(rssContent).toContain('<itunes:category');
      expect(rssContent).toContain('<itunes:owner>');
      expect(rssContent).toContain('<itunes:type>');
    });

    it('should have valid iTunes category', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Extract iTunes category
      const categoryMatch = rssContent.match(/<itunes:category text="([^"]+)"/);
      expect(categoryMatch).toBeTruthy();
      
      if (categoryMatch) {
        const category = categoryMatch[1];
        const validation = RssUtils.validateiTunesCategory(category);
        expect(validation.valid).toBe(true);
      }
    });

    it('should have valid iTunes owner information', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Extract iTunes owner
      const ownerMatch = rssContent.match(/<itunes:owner>[\s\S]*?<itunes:name>([^<]+)<\/itunes:name>[\s\S]*?<itunes:email>([^<]+)<\/itunes:email>[\s\S]*?<\/itunes:owner>/);
      expect(ownerMatch).toBeTruthy();
      
      if (ownerMatch) {
        const [, name, email] = ownerMatch;
        const validation = RssUtils.validateiTunesOwner({ name, email });
        expect(validation.valid).toBe(true);
      }
    });

    it('should have valid iTunes image', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check for iTunes image
      const imageMatch = rssContent.match(/<itunes:image href="([^"]+)"/);
      if (imageMatch) {
        const imageUrl = imageMatch[1];
        const validation = RssUtils.validateiTunesImage({ href: imageUrl });
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Spotify Compatibility', () => {
    it('should be compatible with Spotify requirements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Spotify requires standard RSS 2.0 elements
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('<title>');
      expect(rssContent).toContain('<description>');
      expect(rssContent).toContain('<link>');
      expect(rssContent).toContain('<language>');

      // Check for episodes
      expect(rssContent).toContain('<item>');
    });

    it('should have valid episode enclosures for audio', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check for enclosure elements
      const enclosureMatches = rssContent.match(/<enclosure[^>]*>/g);
      expect(enclosureMatches).toBeTruthy();
      
      if (enclosureMatches) {
        for (const enclosure of enclosureMatches) {
          expect(enclosure).toMatch(/url="[^"]+"/);
          expect(enclosure).toMatch(/type="audio\/[^"]+"/);
          expect(enclosure).toMatch(/length="\d+"/);
        }
      }
    });
  });

  describe('Google Podcasts Compatibility', () => {
    it('should be compatible with Google Podcasts requirements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Google Podcasts requires standard RSS elements
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('<item>');

      // Check for proper encoding
      expect(rssContent).toContain('encoding="UTF-8"');
    });

    it('should have valid episode metadata', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Extract episode items
      const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g);
      expect(itemMatches).toBeTruthy();
      
      if (itemMatches) {
        for (const item of itemMatches) {
          expect(item).toContain('<title>');
          expect(item).toContain('<description>');
          expect(item).toContain('<link>');
          expect(item).toContain('<guid>');
          expect(item).toContain('<pubDate>');
        }
      }
    });
  });

  describe('Overcast Compatibility', () => {
    it('should be compatible with Overcast requirements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Overcast requires iTunes namespace
      expect(rssContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');

      // Check for iTunes episode elements
      const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g);
      if (itemMatches) {
        for (const item of itemMatches) {
          expect(item).toContain('<itunes:title>');
          expect(item).toContain('<itunes:summary>');
          expect(item).toContain('<itunes:duration>');
          expect(item).toContain('<itunes:explicit>');
        }
      }
    });

    it('should have valid duration format', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check duration format (HH:MM:SS or MM:SS)
      const durationMatches = rssContent.match(/<itunes:duration>([^<]+)<\/itunes:duration>/g);
      if (durationMatches) {
        for (const duration of durationMatches) {
          const durationValue = duration.replace(/<\/?itunes:duration>/g, '');
          expect(durationValue).toMatch(/^(\d{1,2}:)?\d{1,2}:\d{2}$/);
        }
      }
    });
  });

  describe('Pocket Casts Compatibility', () => {
    it('should be compatible with Pocket Casts requirements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Pocket Casts requires standard RSS with iTunes elements
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('xmlns:itunes=');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('<item>');
    });

    it('should have valid episode GUIDs', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check for unique GUIDs
      const guidMatches = rssContent.match(/<guid[^>]*>([^<]+)<\/guid>/g);
      if (guidMatches) {
        const guids = guidMatches.map(match => 
          match.replace(/<guid[^>]*>([^<]+)<\/guid>/, '$1')
        );
        const uniqueGuids = new Set(guids);
        expect(guids.length).toBe(uniqueGuids.size);
      }
    });
  });

  describe('Generic RSS Reader Compatibility', () => {
    it('should be valid RSS 2.0 feed', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Validate RSS structure
      const validation = RssValidator.quickValidate(rssContent);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should have proper XML structure', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check XML declaration
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      
      // Check RSS root element
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('</rss>');
      
      // Check channel element
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('</channel>');
    });

    it('should have required channel elements', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      const requiredElements = [
        'title', 'description', 'link', 'language', 'lastBuildDate', 'generator'
      ];

      for (const element of requiredElements) {
        expect(rssContent).toContain(`<${element}>`);
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      const response = await client.get('/feeds/default/rss.xml');
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should include proper cache headers', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      
      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['etag']).toBeDefined();
      expect(response.headers['last-modified']).toBeDefined();
    });

    it('should support conditional requests', async () => {
      // First request
      const firstResponse = await client.get('/feeds/default/rss.xml');
      const etag = firstResponse.headers['etag'];
      const lastModified = firstResponse.headers['last-modified'];

      expect(firstResponse.status).toBe(200);

      // Second request with If-None-Match
      const secondResponse = await client.get('/feeds/default/rss.xml', {
        headers: {
          'If-None-Match': etag
        }
      });

      // Should return 304 Not Modified
      expect(secondResponse.status).toBe(304);
    });
  });

  describe('Content Validation', () => {
    it('should have valid episode content', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Extract episodes
      const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g);
      expect(itemMatches).toBeTruthy();
      
      if (itemMatches && itemMatches.length > 0) {
        for (const item of itemMatches) {
          // Check for non-empty title
          const titleMatch = item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
          if (titleMatch) {
            expect(titleMatch[1].trim().length).toBeGreaterThan(0);
          }

          // Check for non-empty description
          const descMatch = item.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/);
          if (descMatch) {
            expect(descMatch[1].trim().length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should have valid publication dates', async () => {
      const response = await client.get('/feeds/default/rss.xml');
      const rssContent = response.data;

      // Check channel pubDate
      const channelPubDateMatch = rssContent.match(/<pubDate>([^<]+)<\/pubDate>/);
      if (channelPubDateMatch) {
        const pubDate = new Date(channelPubDateMatch[1]);
        expect(pubDate.getTime()).not.toBeNaN();
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

  describe('Error Handling', () => {
    it('should handle invalid feed slug gracefully', async () => {
      try {
        await client.get('/feeds/invalid-slug-with-special-chars!/rss.xml');
        fail('Should have returned 400 error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('INVALID_FEED_SLUG');
      }
    });

    it('should handle missing feed slug gracefully', async () => {
      try {
        await client.get('/feeds//rss.xml');
        fail('Should have returned 400 error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
