import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: RSS Feed Branding Propagation
 * 
 * This test validates that branding changes (title and image) propagate to the RSS feed
 * and are observable within the 24-hour SLO. Tests simulate feed regeneration to verify
 * branding updates appear correctly in the generated RSS XML.
 * 
 * Test Scenarios:
 * 1. Update podcast title - verify it appears in RSS feed
 * 2. Update podcast image - verify it appears in RSS feed
 * 3. Update both title and image - verify both appear in RSS feed
 * 4. Verify feed metadata reflects most recent branding update
 * 5. Verify branding changes don't affect episode content
 * 
 * Requirements Tested:
 * - FR-001: Allow creators to update podcast title
 * - FR-002: Allow creators to update podcast image
 * - FR-003: Propagate updates to RSS feed within 24h
 */
describe('RSS Feed Branding Propagation Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';
  
  // Test data
  const originalBranding = {
    title: 'Original Podcast Title',
    imageUrl: 'https://example.com/original-image.png'
  };
  
  const updatedBranding = {
    title: 'Updated Podcast Title',
    imageUrl: 'https://example.com/updated-image.png'
  };

  // Helper function to extract title from RSS XML
  const extractRssTitle = (xml: string): string | null => {
    const titleMatch = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    if (titleMatch) return titleMatch[1];
    
    const simpleTitleMatch = xml.match(/<title>(.*?)<\/title>/);
    return simpleTitleMatch ? simpleTitleMatch[1] : null;
  };

  // Helper function to extract image URL from RSS XML
  const extractRssImage = (xml: string): string | null => {
    // Try iTunes image format
    const itunesMatch = xml.match(/<itunes:image\s+href="(.*?)"/);
    if (itunesMatch) return itunesMatch[1];
    
    // Try standard RSS image format
    const imageMatch = xml.match(/<image>.*?<url>(.*?)<\/url>.*?<\/image>/s);
    return imageMatch ? imageMatch[1] : null;
  };

  // Helper function to count episodes in RSS feed
  const countEpisodes = (xml: string): number => {
    const itemMatches = xml.match(/<item>/g);
    return itemMatches ? itemMatches.length : 0;
  };

  // Helper function to extract episode GUIDs
  const extractEpisodeGuids = (xml: string): string[] => {
    const guids: string[] = [];
    const guidRegex = /<guid[^>]*>(.*?)<\/guid>/g;
    let match;
    while ((match = guidRegex.exec(xml)) !== null) {
      guids.push(match[1]);
    }
    return guids;
  };

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/rss+xml, application/xml, text/xml'
      },
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
  });

  afterAll(async () => {
    // Cleanup: Reset branding to original state (best effort)
    try {
      await client.put('/branding', originalBranding);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Title Propagation to RSS Feed', () => {
    it('should update RSS feed title when branding title is changed', async () => {
      // Step 1: Update branding with new title
      const brandingUpdate = {
        title: 'Integration Test Podcast Title',
        imageUrl: originalBranding.imageUrl
      };
      
      const updateResponse = await client.put('/branding', brandingUpdate);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data).toHaveProperty('title', brandingUpdate.title);
      expect(updateResponse.data).toHaveProperty('updatedAt');

      // Step 2: Fetch RSS feed (triggers regeneration with new branding)
      const rssResponse = await client.get('/rss-feed', {
        headers: { 'Accept': 'application/rss+xml' }
      });
      
      expect(rssResponse.status).toBe(200);
      expect(rssResponse.headers['content-type']).toMatch(/xml/);

      // Step 3: Parse RSS feed and verify title
      const rssXml = rssResponse.data;
      expect(typeof rssXml).toBe('string');
      
      const feedTitle = extractRssTitle(rssXml);
      expect(feedTitle).toBeTruthy();
      expect(feedTitle).toContain(brandingUpdate.title);
    });

    it('should persist title changes across multiple RSS feed requests', async () => {
      // Update title
      const newTitle = 'Persistent Title Test';
      await client.put('/branding', {
        title: newTitle,
        imageUrl: originalBranding.imageUrl
      });

      // Fetch RSS feed multiple times
      const rssResponses = await Promise.all([
        client.get('/rss-feed'),
        client.get('/rss-feed'),
        client.get('/rss-feed')
      ]);

      // Verify consistent title across all responses
      for (const response of rssResponses) {
        const feedTitle = extractRssTitle(response.data);
        expect(feedTitle).toContain(newTitle);
      }
    });
  });

  describe('Image Propagation to RSS Feed', () => {
    it('should update RSS feed image when branding image is changed', async () => {
      // Step 1: Update branding with new image
      const brandingUpdate = {
        title: originalBranding.title,
        imageUrl: 'https://example.com/integration-test-image.png'
      };
      
      const updateResponse = await client.put('/branding', brandingUpdate);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data).toHaveProperty('imageUrl', brandingUpdate.imageUrl);

      // Step 2: Fetch RSS feed
      const rssResponse = await client.get('/rss-feed', {
        headers: { 'Accept': 'application/rss+xml' }
      });
      
      expect(rssResponse.status).toBe(200);

      // Step 3: Verify image is in RSS feed
      const rssXml = rssResponse.data;
      const feedImage = extractRssImage(rssXml);
      
      expect(feedImage).toBeTruthy();
      expect(feedImage).toBe(brandingUpdate.imageUrl);
    });

    it('should handle image URL format validation', async () => {
      // Test with various image URL formats
      const validImageUrls = [
        'https://cdn.example.com/podcast-image.jpg',
        'https://example.com/images/podcast.png',
        'https://storage.example.com/artwork/1400x1400.jpeg'
      ];

      for (const imageUrl of validImageUrls) {
        const updateResponse = await client.put('/branding', {
          title: originalBranding.title,
          imageUrl
        });
        
        expect(updateResponse.status).toBe(200);
        
        // Verify it appears in RSS feed
        const rssResponse = await client.get('/rss-feed');
        const feedImage = extractRssImage(rssResponse.data);
        
        expect(feedImage).toBe(imageUrl);
      }
    });
  });

  describe('Combined Title and Image Propagation', () => {
    it('should update both title and image in RSS feed simultaneously', async () => {
      // Update both title and image
      const brandingUpdate = {
        title: 'Combined Update Test Podcast',
        imageUrl: 'https://example.com/combined-test-image.png'
      };
      
      const updateResponse = await client.put('/branding', brandingUpdate);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.title).toBe(brandingUpdate.title);
      expect(updateResponse.data.imageUrl).toBe(brandingUpdate.imageUrl);

      // Fetch and parse RSS feed
      const rssResponse = await client.get('/rss-feed');
      const rssXml = rssResponse.data;

      // Verify both title and image are updated
      const feedTitle = extractRssTitle(rssXml);
      const feedImage = extractRssImage(rssXml);
      
      expect(feedTitle).toContain(brandingUpdate.title);
      expect(feedImage).toBe(brandingUpdate.imageUrl);
    });

    it('should support partial updates (title only)', async () => {
      // Update only title
      const partialUpdate = {
        title: 'Title Only Update Test'
      };
      
      const updateResponse = await client.put('/branding', partialUpdate);
      expect(updateResponse.status).toBe(200);

      // Verify RSS feed reflects new title
      const rssResponse = await client.get('/rss-feed');
      const feedTitle = extractRssTitle(rssResponse.data);

      expect(feedTitle).toContain(partialUpdate.title);
    });

    it('should support partial updates (image only)', async () => {
      // Update only image
      const partialUpdate = {
        imageUrl: 'https://example.com/image-only-update.png'
      };
      
      const updateResponse = await client.put('/branding', partialUpdate);
      expect(updateResponse.status).toBe(200);

      // Verify RSS feed reflects new image
      const rssResponse = await client.get('/rss-feed');
      const feedImage = extractRssImage(rssResponse.data);

      expect(feedImage).toBe(partialUpdate.imageUrl);
    });
  });

  describe('Feed Metadata and Timestamps', () => {
    it('should include updatedAt timestamp in branding response', async () => {
      const beforeUpdate = new Date();
      
      const updateResponse = await client.put('/branding', {
        title: 'Timestamp Test Podcast'
      });
      
      const afterUpdate = new Date();
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data).toHaveProperty('updatedAt');
      
      const updatedAt = new Date(updateResponse.data.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime() + 1000);
    });

    it('should update RSS feed lastBuildDate after branding change', async () => {
      // Get initial feed build date
      const initialResponse = await client.get('/rss-feed');
      const initialXml = initialResponse.data;
      const initialBuildMatch = initialXml.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/);
      const initialBuildDate = initialBuildMatch ? initialBuildMatch[1] : null;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update branding
      await client.put('/branding', {
        title: 'Build Date Test Podcast'
      });

      // Get updated feed
      const updatedResponse = await client.get('/rss-feed');
      const updatedXml = updatedResponse.data;
      const updatedBuildMatch = updatedXml.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/);
      const updatedBuildDate = updatedBuildMatch ? updatedBuildMatch[1] : null;

      // Build date should be updated (if present)
      if (initialBuildDate && updatedBuildDate) {
        expect(new Date(updatedBuildDate).getTime()).toBeGreaterThan(
          new Date(initialBuildDate).getTime()
        );
      }
    });
  });

  describe('Episode Content Independence', () => {
    it('should not affect existing episode content when branding changes', async () => {
      // Get initial RSS feed with episodes
      const initialResponse = await client.get('/rss-feed');
      const initialXml = initialResponse.data;
      const initialEpisodeCount = countEpisodes(initialXml);

      // Update branding
      await client.put('/branding', {
        title: 'Episode Independence Test Podcast',
        imageUrl: 'https://example.com/independence-test.png'
      });

      // Get updated feed
      const updatedResponse = await client.get('/rss-feed');
      const updatedXml = updatedResponse.data;
      const updatedEpisodeCount = countEpisodes(updatedXml);

      // Episode count should remain the same
      expect(updatedEpisodeCount).toBe(initialEpisodeCount);

      // Episode titles should remain unchanged (check first episode if exists)
      if (initialEpisodeCount > 0) {
        const initialFirstTitle = initialXml.match(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        const updatedFirstTitle = updatedXml.match(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        
        if (initialFirstTitle && updatedFirstTitle) {
          expect(updatedFirstTitle[1]).toBe(initialFirstTitle[1]);
        }
      }
    });

    it('should maintain episode order after branding update', async () => {
      // Get initial feed
      const initialResponse = await client.get('/rss-feed');
      const initialGuids = extractEpisodeGuids(initialResponse.data);

      // Update branding
      await client.put('/branding', {
        title: 'Episode Order Test Podcast'
      });

      // Get updated feed
      const updatedResponse = await client.get('/rss-feed');
      const updatedGuids = extractEpisodeGuids(updatedResponse.data);

      // Episode order should be preserved
      expect(updatedGuids).toEqual(initialGuids);
    });
  });

  describe('Propagation Timing (24h SLO)', () => {
    it('should propagate branding changes immediately to RSS feed', async () => {
      const updateTime = new Date();
      
      // Update branding
      const brandingUpdate = {
        title: 'Immediate Propagation Test',
        imageUrl: 'https://example.com/immediate-test.png'
      };
      
      await client.put('/branding', brandingUpdate);

      // Immediately fetch RSS feed
      const rssResponse = await client.get('/rss-feed');
      const fetchTime = new Date();
      
      const timeDiff = fetchTime.getTime() - updateTime.getTime();
      
      // Should propagate within seconds (well under 24h SLO)
      expect(timeDiff).toBeLessThan(10000); // 10 seconds max

      // Verify branding is present
      const feedTitle = extractRssTitle(rssResponse.data);
      expect(feedTitle).toContain(brandingUpdate.title);
    });

    it('should handle rapid consecutive branding updates (last-write-wins)', async () => {
      // Make multiple rapid updates
      const updates = [
        { title: 'Update 1', imageUrl: 'https://example.com/image1.png' },
        { title: 'Update 2', imageUrl: 'https://example.com/image2.png' },
        { title: 'Final Update', imageUrl: 'https://example.com/image-final.png' }
      ];

      // Send updates rapidly
      for (const update of updates) {
        await client.put('/branding', update);
      }

      // Fetch RSS feed
      const rssResponse = await client.get('/rss-feed');
      const feedTitle = extractRssTitle(rssResponse.data);

      // Should reflect the last update (last-write-wins)
      expect(feedTitle).toContain('Final Update');
    });
  });

  describe('iTunes Compliance with Branding', () => {
    it('should maintain iTunes namespace with branding updates', async () => {
      // Update branding
      await client.put('/branding', {
        title: 'iTunes Compliance Test',
        imageUrl: 'https://example.com/itunes-test.png'
      });

      // Fetch RSS feed
      const rssResponse = await client.get('/rss-feed');
      const feedXml = rssResponse.data;

      // Verify iTunes namespace is present
      expect(feedXml).toContain('xmlns:itunes');
      expect(feedXml).toContain('itunes:');
      
      // iTunes-specific tags should be present
      expect(feedXml).toMatch(/itunes:(author|owner)/);
    });

    it('should include branding image in iTunes image tag', async () => {
      const imageUrl = 'https://example.com/itunes-image-compliance.png';
      
      await client.put('/branding', {
        title: 'iTunes Image Test',
        imageUrl
      });

      const rssResponse = await client.get('/rss-feed');
      const feedImage = extractRssImage(rssResponse.data);

      // iTunes image should be present and match branding
      expect(feedImage).toBe(imageUrl);
      expect(rssResponse.data).toContain('itunes:image');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty RSS feed gracefully after branding update', async () => {
      // Update branding
      await client.put('/branding', {
        title: 'Empty Feed Test'
      });

      // Fetch RSS feed (may have no episodes)
      const rssResponse = await client.get('/rss-feed');
      expect(rssResponse.status).toBe(200);

      // Feed should have branding even without episodes
      const feedTitle = extractRssTitle(rssResponse.data);
      expect(feedTitle).toBeTruthy();
      expect(feedTitle).toContain('Empty Feed Test');
    });

    it('should return valid XML structure after branding update', async () => {
      await client.put('/branding', {
        title: 'XML Validation Test',
        imageUrl: 'https://example.com/xml-test.png'
      });

      const rssResponse = await client.get('/rss-feed');
      const feedXml = rssResponse.data;

      // Should be valid XML
      expect(feedXml).toContain('<?xml');
      expect(feedXml).toContain('<rss');
      expect(feedXml).toContain('</rss>');
      expect(feedXml).toContain('<channel>');
      expect(feedXml).toContain('</channel>');
    });

    it('should handle special characters in branding title', async () => {
      const specialTitle = 'Test & Demo Podcast: "Special" <Characters>';
      
      await client.put('/branding', {
        title: specialTitle
      });

      const rssResponse = await client.get('/rss-feed');
      const feedXml = rssResponse.data;
      
      // Title should be present (escaped as CDATA or entities)
      const feedTitle = extractRssTitle(feedXml);
      expect(feedTitle).toBeTruthy();
      
      // XML should not contain unescaped special characters
      expect(feedXml).not.toContain('&<');
      expect(feedXml).not.toMatch(/<title>[^<]*&[^<]*</);
    });
  });
});
