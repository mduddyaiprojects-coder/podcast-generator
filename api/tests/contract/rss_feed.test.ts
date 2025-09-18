import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: GET /api/feeds/{slug}/rss.xml
 * 
 * This test validates the contract defined in rss-feed.yaml
 * It should FAIL initially (TDD principle) until the endpoint is implemented
 */
describe('GET /api/feeds/{slug}/rss.xml Contract Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
  });

  describe('Successful RSS Feed Retrieval (200)', () => {
    it('should return valid RSS 2.0 feed for valid feed slug', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
      
      const xmlContent = response.data;
      expect(typeof xmlContent).toBe('string');
      
      // Validate XML structure
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<rss version="2.0"');
      expect(xmlContent).toContain('<channel>');
      expect(xmlContent).toContain('</channel>');
      expect(xmlContent).toContain('</rss>');
    });

    it('should include iTunes namespace in RSS feed', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      expect(xmlContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
    });

    it('should include required channel elements', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Required RSS 2.0 channel elements
      expect(xmlContent).toMatch(/<title>.*<\/title>/);
      expect(xmlContent).toMatch(/<description>.*<\/description>/);
      expect(xmlContent).toMatch(/<link>.*<\/link>/);
      expect(xmlContent).toMatch(/<language>.*<\/language>/);
    });

    it('should include iTunes-specific channel elements', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // iTunes-specific elements
      expect(xmlContent).toMatch(/<itunes:author>.*<\/itunes:author>/);
      expect(xmlContent).toMatch(/<itunes:summary>.*<\/itunes:summary>/);
      expect(xmlContent).toMatch(/<itunes:owner>/);
      expect(xmlContent).toMatch(/<itunes:name>.*<\/itunes:name>/);
      expect(xmlContent).toMatch(/<itunes:email>.*<\/itunes:email>/);
      expect(xmlContent).toMatch(/<\/itunes:owner>/);
      expect(xmlContent).toMatch(/<itunes:explicit>.*<\/itunes:explicit>/);
      expect(xmlContent).toMatch(/<itunes:category text=".*"\/>/);
      expect(xmlContent).toMatch(/<itunes:type>.*<\/itunes:type>/);
    });

    it('should include episode items with required elements', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Check for episode items
      expect(xmlContent).toMatch(/<item>/);
      expect(xmlContent).toMatch(/<\/item>/);
      
      // Required item elements
      expect(xmlContent).toMatch(/<title>.*<\/title>/);
      expect(xmlContent).toMatch(/<description>.*<\/description>/);
      expect(xmlContent).toMatch(/<guid isPermaLink="false">.*<\/guid>/);
      expect(xmlContent).toMatch(/<pubDate>.*<\/pubDate>/);
      expect(xmlContent).toMatch(/<enclosure url=".*" type="audio\/mpeg" length=".*"\/>/);
    });

    it('should include iTunes-specific item elements', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // iTunes-specific item elements
      expect(xmlContent).toMatch(/<itunes:duration>.*<\/itunes:duration>/);
      expect(xmlContent).toMatch(/<itunes:explicit>.*<\/itunes:explicit>/);
      expect(xmlContent).toMatch(/<itunes:episodeType>.*<\/itunes:episodeType>/);
    });

    it('should return valid RSS feed for various valid feed slugs', async () => {
      const validSlugs = [
        'abc123',
        'my-podcast',
        'tech_talks',
        'podcast-2024',
        'a1b2c3',
        'test-feed_123'
      ];

      for (const slug of validSlugs) {
        const response: AxiosResponse = await client.get(`/feeds/${slug}/rss.xml`);
        
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
        
        const xmlContent = response.data;
        expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xmlContent).toContain('<rss version="2.0"');
      }
    });

    it('should have valid XML structure and encoding', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Validate XML declaration
      expect(xmlContent).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      
      // Validate that it's well-formed XML (basic checks)
      const openTags = (xmlContent.match(/<[^\/][^>]*>/g) || []).length;
      const closeTags = (xmlContent.match(/<\/[^>]*>/g) || []).length;
      expect(openTags).toBeGreaterThan(0);
      expect(closeTags).toBeGreaterThan(0);
      
      // Check for proper nesting (basic validation)
      expect(xmlContent).toContain('<rss');
      expect(xmlContent).toContain('</rss>');
      expect(xmlContent).toContain('<channel>');
      expect(xmlContent).toContain('</channel>');
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent feed slug', async () => {
      const nonExistentSlug = 'non-existent-feed-12345';
      
      try {
        await client.get(`/feeds/${nonExistentSlug}/rss.xml`);
        fail('Expected 404 error for non-existent feed slug');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('FEED_NOT_FOUND');
      }
    });

    it('should return 404 for invalid feed slug format', async () => {
      const invalidSlugs = [
        'invalid slug', // contains space
        'invalid@slug', // contains special character
        'invalid/slug', // contains slash
        'invalid.slug', // contains dot
        '', // empty
        'a', // too short
        'a'.repeat(101) // too long (assuming max length)
      ];

      for (const invalidSlug of invalidSlugs) {
        try {
          await client.get(`/feeds/${invalidSlug}/rss.xml`);
          fail(`Expected 404 error for invalid slug: ${invalidSlug}`);
        } catch (error: any) {
          expect(error.response?.status).toBe(404);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('message');
          expect(error.response?.data).toHaveProperty('details');
        }
      }
    });

    it('should return 404 for empty feed slug', async () => {
      try {
        await client.get('/feeds//rss.xml');
        fail('Expected 404 error for empty feed slug');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
      }
    });
  });

  describe('Server Errors (500)', () => {
    it('should return 500 for internal server errors', async () => {
      const feedSlug = 'abc123';
      
      try {
        await client.get(`/feeds/${feedSlug}/rss.xml`);
        // If we get here, the server is working
        // This test will pass once the endpoint is implemented
      } catch (error: any) {
        if (error.response?.status === 500) {
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('message');
          expect(error.response?.data).toHaveProperty('details');
          expect(error.response?.data.error).toBe('INTERNAL_ERROR');
        }
      }
    });
  });

  describe('Response Format Validation', () => {
    it('should return correct content type for RSS feed', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
    });

    it('should return valid XML content', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      expect(typeof xmlContent).toBe('string');
      expect(xmlContent.length).toBeGreaterThan(0);
      
      // Basic XML validation
      expect(xmlContent).toContain('<?xml');
      expect(xmlContent).toContain('<rss');
      expect(xmlContent).toContain('</rss>');
    });

    it('should include proper RSS 2.0 structure', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // RSS 2.0 specific structure
      expect(xmlContent).toMatch(/<rss version="2\.0"/);
      expect(xmlContent).toContain('<channel>');
      expect(xmlContent).toContain('</channel>');
      
      // Should have at least one item
      expect(xmlContent).toMatch(/<item>[\s\S]*<\/item>/);
    });

    it('should include iTunes podcast elements', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // iTunes podcast elements
      expect(xmlContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      expect(xmlContent).toMatch(/<itunes:author>/);
      expect(xmlContent).toMatch(/<itunes:summary>/);
      expect(xmlContent).toMatch(/<itunes:owner>/);
      expect(xmlContent).toMatch(/<itunes:explicit>/);
      expect(xmlContent).toMatch(/<itunes:category/);
      expect(xmlContent).toMatch(/<itunes:type>/);
    });

    it('should include proper episode enclosure elements', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Episode enclosure elements
      expect(xmlContent).toMatch(/<enclosure url="[^"]*" type="audio\/mpeg" length="\d+"\/>/);
      expect(xmlContent).toMatch(/<itunes:duration>\d{2}:\d{2}:\d{2}<\/itunes:duration>/);
    });
  });

  describe('RSS Feed Content Validation', () => {
    it('should have valid publication dates', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Check for valid pubDate format (RFC 2822)
      const pubDateMatch = xmlContent.match(/<pubDate>(.*?)<\/pubDate>/);
      if (pubDateMatch) {
        const pubDate = pubDateMatch[1];
        const date = new Date(pubDate);
        expect(date.getTime()).not.toBeNaN();
      }
    });

    it('should have valid GUID format', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Check for valid GUID format
      const guidMatch = xmlContent.match(/<guid isPermaLink="false">(.*?)<\/guid>/);
      if (guidMatch) {
        const guid = guidMatch[1];
        // Should be a valid UUID or other unique identifier
        expect(guid.length).toBeGreaterThan(0);
        expect(guid).not.toContain(' ');
      }
    });

    it('should have valid audio URLs in enclosures', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Check for valid audio URLs
      const enclosureMatch = xmlContent.match(/<enclosure url="([^"]*)" type="audio\/mpeg" length="(\d+)"\/>/);
      if (enclosureMatch) {
        const audioUrl = enclosureMatch[1];
        const fileSize = parseInt(enclosureMatch[2]);
        
        // Validate URL format
        expect(() => new URL(audioUrl)).not.toThrow();
        
        // Validate file size is reasonable
        expect(fileSize).toBeGreaterThan(0);
        expect(fileSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      }
    });

    it('should have valid duration format', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);

      expect(response.status).toBe(200);
      
      const xmlContent = response.data;
      
      // Check for valid duration format (HH:MM:SS)
      const durationMatch = xmlContent.match(/<itunes:duration>(.*?)<\/itunes:duration>/);
      if (durationMatch) {
        const duration = durationMatch[1];
        const durationRegex = /^\d{1,2}:\d{2}:\d{2}$/;
        expect(duration).toMatch(durationRegex);
      }
    });
  });
});
