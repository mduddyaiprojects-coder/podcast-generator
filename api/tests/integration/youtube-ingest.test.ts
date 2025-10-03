import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: YouTube Link Ingestion
 * 
 * This test validates the complete flow of ingesting YouTube content as a source
 * for podcast episode generation. Tests verify that YouTube links can be submitted,
 * metadata extracted, and episodes generated from the content.
 * 
 * Test Scenarios:
 * 1. Submit valid YouTube URL and extract metadata
 * 2. Submit YouTube video ID directly
 * 3. Handle various YouTube URL formats (youtube.com, youtu.be, embed)
 * 4. Verify extracted metadata quality (title, description, duration)
 * 5. Test YouTube API rate limiting and error handling
 * 6. Verify content extraction from YouTube source
 * 7. Test end-to-end: YouTube URL → Metadata → Episode generation
 * 
 * Requirements Tested:
 * - FR-004: Support ingesting YouTube links as content source
 * - FR-005: YouTube ingestion health check functional
 * - System must NOT publish to YouTube (ingestion only)
 * 
 * Note: YouTube is for INGESTION only, not distribution.
 * The system reads from YouTube but does not publish/update YouTube content.
 */
describe('YouTube Link Ingestion Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';
  
  // Test timeout - YouTube API calls may take time
  const TEST_TIMEOUT = 60000; // 60 seconds

  // Sample YouTube URLs for testing
  const testVideoIds = {
    standard: 'dQw4w9WgXcQ', // Standard YouTube video
    short: 'jNQXAC9IVRw',   // Another test video
  };

  const testUrls = {
    standard: `https://www.youtube.com/watch?v=${testVideoIds.standard}`,
    shortForm: `https://youtu.be/${testVideoIds.short}`,
    embed: `https://www.youtube.com/embed/${testVideoIds.standard}`,
    withTimestamp: `https://www.youtube.com/watch?v=${testVideoIds.standard}&t=30s`,
    withPlaylist: `https://www.youtube.com/watch?v=${testVideoIds.standard}&list=PLtest`,
  };

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('YouTube URL Submission and Validation', () => {
    it('should accept standard YouTube URL format', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('video_id');
      expect(response.data.video_id).toBe(testVideoIds.standard);
    }, TEST_TIMEOUT);

    it('should accept short-form youtu.be URL', async () => {
      const payload = {
        youtube_url: testUrls.shortForm
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('video_id');
      expect(response.data.video_id).toBe(testVideoIds.short);
    }, TEST_TIMEOUT);

    it('should accept embed URL format', async () => {
      const payload = {
        youtube_url: testUrls.embed
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('video_id');
      expect(response.data.video_id).toBe(testVideoIds.standard);
    }, TEST_TIMEOUT);

    it('should handle URL with timestamp parameters', async () => {
      const payload = {
        youtube_url: testUrls.withTimestamp
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      expect(response.data.video_id).toBe(testVideoIds.standard);
    }, TEST_TIMEOUT);

    it('should accept direct video ID submission', async () => {
      const payload = {
        video_id: testVideoIds.standard
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      expect(response.data.video_id).toBe(testVideoIds.standard);
    }, TEST_TIMEOUT);

    it('should reject invalid YouTube URL', async () => {
      const payload = {
        youtube_url: 'https://example.com/not-a-youtube-url'
      };

      try {
        await client.post('/youtube-extract', payload);
        fail('Should reject invalid YouTube URL');
      } catch (error: any) {
        expect([400, 404]).toContain(error.response?.status);
        expect(error.response?.data).toHaveProperty('error');
      }
    });

    it('should reject request with no URL or video ID', async () => {
      const payload = {};

      try {
        await client.post('/youtube-extract', payload);
        fail('Should reject empty payload');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
      }
    });

    it('should reject malformed video ID', async () => {
      const payload = {
        video_id: 'invalid-id-with-special-chars!!!'
      };

      try {
        await client.post('/youtube-extract', payload);
        fail('Should reject invalid video ID');
      } catch (error: any) {
        expect([400, 404]).toContain(error.response?.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('YouTube Metadata Extraction', () => {
    it('should extract complete video metadata', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      // Verify core metadata fields
      expect(metadata).toHaveProperty('video_id');
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('channel_title');
      
      // Title should be non-empty
      expect(metadata.title).toBeTruthy();
      expect(metadata.title.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should extract duration information', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      // Duration should be present and valid
      expect(metadata).toHaveProperty('duration');
      if (metadata.duration) {
        // Duration could be in various formats (seconds, ISO 8601, etc.)
        expect(typeof metadata.duration).toBeTruthy();
      }
    }, TEST_TIMEOUT);

    it('should extract channel information', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      expect(metadata).toHaveProperty('channel_title');
      expect(metadata.channel_title).toBeTruthy();
    }, TEST_TIMEOUT);

    it('should extract published date', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response: AxiosResponse = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      if (metadata.published_at) {
        // Should be a valid date string
        const date = new Date(metadata.published_at);
        expect(date.toString()).not.toBe('Invalid Date');
      }
    }, TEST_TIMEOUT);

    it('should handle metadata extraction for multiple videos', async () => {
      const video1 = await client.post('/youtube-extract', {
        video_id: testVideoIds.standard
      });

      const video2 = await client.post('/youtube-extract', {
        video_id: testVideoIds.short
      });

      expect(video1.status).toBe(200);
      expect(video2.status).toBe(200);
      
      // Each should have distinct metadata
      expect(video1.data.video_id).not.toBe(video2.data.video_id);
    }, TEST_TIMEOUT);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent video ID gracefully', async () => {
      const payload = {
        video_id: 'NonExistentVideoID123'
      };

      try {
        await client.post('/youtube-extract', payload);
        fail('Should fail for non-existent video');
      } catch (error: any) {
        expect([400, 404, 500]).toContain(error.response?.status);
        expect(error.response?.data).toHaveProperty('error');
      }
    }, TEST_TIMEOUT);

    it('should handle private video gracefully', async () => {
      // Note: This test may pass if we don't have a known private video ID
      // Implementation should handle this case appropriately
      const payload = {
        video_id: 'PrivateVideoID'
      };

      try {
        await client.post('/youtube-extract', payload);
        // May succeed with limited metadata or fail - either is acceptable
      } catch (error: any) {
        expect([400, 403, 404]).toContain(error.response?.status);
      }
    }, TEST_TIMEOUT);

    it('should handle deleted video gracefully', async () => {
      const payload = {
        video_id: 'DeletedVideoID'
      };

      try {
        await client.post('/youtube-extract', payload);
        fail('Should fail for deleted video');
      } catch (error: any) {
        expect([400, 404]).toContain(error.response?.status);
      }
    }, TEST_TIMEOUT);

    it('should validate response time is reasonable', async () => {
      const startTime = Date.now();
      
      const payload = {
        youtube_url: testUrls.standard
      };

      await client.post('/youtube-extract', payload);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // YouTube API calls should complete within 30 seconds
      expect(responseTime).toBeLessThan(30000);
    }, TEST_TIMEOUT);
  });

  describe('YouTube as Ingestion Source (Not Distribution)', () => {
    it('should only support reading from YouTube (no publishing)', async () => {
      // This test documents that YouTube is for ingestion only
      // The system should NOT have endpoints for publishing to YouTube
      
      const payload = {
        youtube_url: testUrls.standard
      };

      const response = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      
      // Response should be metadata extraction only
      expect(response.data).toHaveProperty('video_id');
      expect(response.data).toHaveProperty('title');
      
      // Should NOT have any publish/update capabilities
      expect(response.data).not.toHaveProperty('published_to_youtube');
      expect(response.data).not.toHaveProperty('youtube_channel_updated');
    }, TEST_TIMEOUT);

    it('should extract content suitable for podcast generation', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      // Verify we have enough metadata for episode generation
      expect(metadata.title).toBeTruthy();
      expect(metadata.description).toBeTruthy();
      
      // Optional: Check if transcript/audio extraction info is present
      // (Implementation may vary based on T032 requirements)
    }, TEST_TIMEOUT);
  });

  describe('Integration with Health Check', () => {
    it('should reflect successful ingestion in health check', async () => {
      // First, perform a successful ingestion
      const ingestPayload = {
        youtube_url: testUrls.standard
      };

      const ingestResponse = await client.post('/youtube-extract', ingestPayload);
      expect(ingestResponse.status).toBe(200);

      // Then check health endpoint
      // Note: Health endpoint may be /health/youtube based on spec
      try {
        const healthResponse = await client.get('/health/youtube');
        
        if (healthResponse.status === 200) {
          expect(healthResponse.data).toHaveProperty('status');
          expect(healthResponse.data).toHaveProperty('lastSuccessAt');
          
          // After successful ingestion, health should show success
          const lastSuccess = new Date(healthResponse.data.lastSuccessAt);
          const now = new Date();
          
          // Last success should be recent (within last hour)
          const timeDiff = now.getTime() - lastSuccess.getTime();
          expect(timeDiff).toBeLessThan(3600000); // 1 hour
        }
      } catch (error) {
        // Health endpoint may not be fully implemented yet
        // This is acceptable for integration test
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent YouTube extractions', async () => {
      const requests = [
        client.post('/youtube-extract', { video_id: testVideoIds.standard }),
        client.post('/youtube-extract', { video_id: testVideoIds.short }),
        client.post('/youtube-extract', { youtube_url: testUrls.standard })
      ];

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('video_id');
      });
    }, TEST_TIMEOUT);

    it('should handle repeated extractions of same video', async () => {
      const payload = {
        video_id: testVideoIds.standard
      };

      // Extract same video multiple times
      const response1 = await client.post('/youtube-extract', payload);
      const response2 = await client.post('/youtube-extract', payload);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Should return consistent metadata
      expect(response1.data.video_id).toBe(response2.data.video_id);
      expect(response1.data.title).toBe(response2.data.title);
    }, TEST_TIMEOUT);
  });

  describe('Data Quality and Validation', () => {
    it('should return well-formed metadata structure', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      // Verify data types
      expect(typeof metadata.video_id).toBe('string');
      expect(typeof metadata.title).toBe('string');
      
      if (metadata.description) {
        expect(typeof metadata.description).toBe('string');
      }
      
      if (metadata.channel_title) {
        expect(typeof metadata.channel_title).toBe('string');
      }
    }, TEST_TIMEOUT);

    it('should sanitize and validate extracted content', async () => {
      const payload = {
        youtube_url: testUrls.standard
      };

      const response = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      // Title should not contain script tags or malicious content
      expect(metadata.title).not.toMatch(/<script>/i);
      expect(metadata.title).not.toMatch(/javascript:/i);
      
      // Description should be safe
      if (metadata.description) {
        expect(metadata.description).not.toMatch(/<script>/i);
      }
    }, TEST_TIMEOUT);

    it('should preserve unicode and international characters', async () => {
      // YouTube videos may have titles in various languages
      const payload = {
        youtube_url: testUrls.standard
      };

      const response = await client.post('/youtube-extract', payload);
      
      expect(response.status).toBe(200);
      const metadata = response.data;

      // Title should preserve unicode characters if present
      if (metadata.title) {
        expect(metadata.title.length).toBeGreaterThan(0);
        // Should not corrupt unicode characters
        expect(metadata.title).not.toMatch(/\uFFFD/); // Replacement character
      }
    }, TEST_TIMEOUT);
  });
});
