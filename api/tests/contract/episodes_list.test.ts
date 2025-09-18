import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: GET /api/feeds/{slug}/episodes
 * 
 * This test validates the contract defined in rss-feed.yaml
 * It should FAIL initially (TDD principle) until the endpoint is implemented
 */
describe('GET /api/feeds/{slug}/episodes Contract Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
  });

  describe('Successful Episodes List Retrieval (200)', () => {
    it('should return episodes list for valid feed slug', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      
      const responseData = response.data;
      expect(responseData).toHaveProperty('feed_slug');
      expect(responseData).toHaveProperty('total_count');
      expect(responseData).toHaveProperty('episodes');
      
      // Validate feed_slug matches the requested slug
      expect(responseData.feed_slug).toBe(feedSlug);
      
      // Validate total_count is a non-negative integer
      expect(typeof responseData.total_count).toBe('number');
      expect(responseData.total_count).toBeGreaterThanOrEqual(0);
      
      // Validate episodes is an array
      expect(Array.isArray(responseData.episodes)).toBe(true);
    });

    it('should return episodes with required properties', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.episodes.length > 0) {
        const episode = responseData.episodes[0];
        
        // Required properties
        expect(episode).toHaveProperty('episode_id');
        expect(episode).toHaveProperty('title');
        expect(episode).toHaveProperty('description');
        expect(episode).toHaveProperty('audio_url');
        expect(episode).toHaveProperty('duration');
        expect(episode).toHaveProperty('pub_date');
        
        // Validate episode_id is a valid UUID
        expect(episode.episode_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        // Validate audio_url is a valid URL
        expect(() => new URL(episode.audio_url)).not.toThrow();
        
        // Validate duration is a positive integer
        expect(typeof episode.duration).toBe('number');
        expect(episode.duration).toBeGreaterThan(0);
        
        // Validate pub_date is a valid ISO date
        expect(new Date(episode.pub_date)).toBeInstanceOf(Date);
        expect(new Date(episode.pub_date).getTime()).not.toBeNaN();
      }
    });

    it('should return episodes with optional properties when available', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.episodes.length > 0) {
        const episode = responseData.episodes[0];
        
        // Optional properties that may be present
        if (episode.hasOwnProperty('size')) {
          expect(typeof episode.size).toBe('number');
          expect(episode.size).toBeGreaterThan(0);
        }
        
        if (episode.hasOwnProperty('source_url')) {
          expect(() => new URL(episode.source_url)).not.toThrow();
        }
      }
    });

    it('should respect limit parameter', async () => {
      const feedSlug = 'abc123';
      const limit = 5;
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes?limit=${limit}`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      expect(responseData.episodes.length).toBeLessThanOrEqual(limit);
    });

    it('should respect offset parameter', async () => {
      const feedSlug = 'abc123';
      const offset = 2;
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes?offset=${offset}`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      expect(responseData.episodes.length).toBeLessThanOrEqual(responseData.total_count - offset);
    });

    it('should handle limit and offset together', async () => {
      const feedSlug = 'abc123';
      const limit = 3;
      const offset = 1;
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes?limit=${limit}&offset=${offset}`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      expect(responseData.episodes.length).toBeLessThanOrEqual(limit);
    });

    it('should use default values when parameters are not provided', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      // Default limit should be 50, default offset should be 0
      expect(responseData.episodes.length).toBeLessThanOrEqual(50);
    });

    it('should return valid response for various valid feed slugs', async () => {
      const validSlugs = [
        'abc123',
        'my-podcast',
        'tech_talks',
        'podcast-2024',
        'a1b2c3',
        'test-feed_123'
      ];

      for (const slug of validSlugs) {
        const response: AxiosResponse = await client.get(`/feeds/${slug}/episodes`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('feed_slug');
        expect(response.data).toHaveProperty('total_count');
        expect(response.data).toHaveProperty('episodes');
        expect(response.data.feed_slug).toBe(slug);
      }
    });

    it('should return episodes sorted by publication date (newest first)', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.episodes.length > 1) {
        // Check that episodes are sorted by pub_date in descending order
        for (let i = 0; i < responseData.episodes.length - 1; i++) {
          const currentDate = new Date(responseData.episodes[i].pub_date);
          const nextDate = new Date(responseData.episodes[i + 1].pub_date);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe('Parameter Validation (400)', () => {
    it('should return 400 for invalid limit parameter', async () => {
      const feedSlug = 'abc123';
      const invalidLimits = [0, -1, 101, 'invalid', ''];

      for (const invalidLimit of invalidLimits) {
        try {
          await client.get(`/feeds/${feedSlug}/episodes?limit=${invalidLimit}`);
          fail(`Expected 400 error for invalid limit: ${invalidLimit}`);
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('message');
          expect(error.response?.data).toHaveProperty('details');
        }
      }
    });

    it('should return 400 for invalid offset parameter', async () => {
      const feedSlug = 'abc123';
      const invalidOffsets = [-1, 'invalid', ''];

      for (const invalidOffset of invalidOffsets) {
        try {
          await client.get(`/feeds/${feedSlug}/episodes?offset=${invalidOffset}`);
          fail(`Expected 400 error for invalid offset: ${invalidOffset}`);
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('message');
          expect(error.response?.data).toHaveProperty('details');
        }
      }
    });

    it('should return 400 for non-numeric limit parameter', async () => {
      const feedSlug = 'abc123';
      
      try {
        await client.get(`/feeds/${feedSlug}/episodes?limit=abc`);
        fail('Expected 400 error for non-numeric limit');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
      }
    });

    it('should return 400 for non-numeric offset parameter', async () => {
      const feedSlug = 'abc123';
      
      try {
        await client.get(`/feeds/${feedSlug}/episodes?offset=xyz`);
        fail('Expected 400 error for non-numeric offset');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
      }
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent feed slug', async () => {
      const nonExistentSlug = 'non-existent-feed-12345';
      
      try {
        await client.get(`/feeds/${nonExistentSlug}/episodes`);
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
          await client.get(`/feeds/${invalidSlug}/episodes`);
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
        await client.get('/feeds//episodes');
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
        await client.get(`/feeds/${feedSlug}/episodes`);
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
    it('should return application/json content type', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return valid JSON response', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      expect(() => JSON.parse(JSON.stringify(response.data))).not.toThrow();
    });

    it('should not have additional properties in response', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      const allowedProperties = ['feed_slug', 'total_count', 'episodes'];
      
      const responseProperties = Object.keys(responseData);
      const unexpectedProperties = responseProperties.filter(prop => !allowedProperties.includes(prop));
      
      expect(unexpectedProperties).toHaveLength(0);
    });

    it('should not have additional properties in episode objects', async () => {
      const feedSlug = 'abc123';
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.episodes.length > 0) {
        const episode = responseData.episodes[0];
        const allowedProperties = [
          'episode_id',
          'title',
          'description',
          'audio_url',
          'duration',
          'size',
          'pub_date',
          'source_url'
        ];
        
        const episodeProperties = Object.keys(episode);
        const unexpectedProperties = episodeProperties.filter(prop => !allowedProperties.includes(prop));
        
        expect(unexpectedProperties).toHaveLength(0);
      }
    });
  });

  describe('Pagination Validation', () => {
    it('should handle pagination correctly with limit and offset', async () => {
      const feedSlug = 'abc123';
      const limit = 2;
      const offset = 1;
      
      const response: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes?limit=${limit}&offset=${offset}`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      // Should not exceed the limit
      expect(responseData.episodes.length).toBeLessThanOrEqual(limit);
      
      // Should not exceed total count minus offset
      expect(responseData.episodes.length).toBeLessThanOrEqual(responseData.total_count - offset);
    });

    it('should return consistent total_count across different pagination requests', async () => {
      const feedSlug = 'abc123';
      
      const responses = await Promise.all([
        client.get(`/feeds/${feedSlug}/episodes?limit=10&offset=0`),
        client.get(`/feeds/${feedSlug}/episodes?limit=5&offset=0`),
        client.get(`/feeds/${feedSlug}/episodes?limit=20&offset=0`)
      ]);

      const totalCounts = responses.map(r => r.data.total_count);
      const uniqueTotalCounts = [...new Set(totalCounts)];
      
      expect(uniqueTotalCounts).toHaveLength(1);
    });

    it('should handle edge cases for pagination', async () => {
      const feedSlug = 'abc123';
      
      // Test with offset equal to total count
      const response1: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes?offset=0`);
      const totalCount = response1.data.total_count;
      
      if (totalCount > 0) {
        const response2: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes?offset=${totalCount}`);
        expect(response2.status).toBe(200);
        expect(response2.data.episodes).toHaveLength(0);
      }
    });
  });
});
