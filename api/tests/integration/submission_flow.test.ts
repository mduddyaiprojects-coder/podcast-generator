import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: Content Submission Flow
 * 
 * This test validates the complete end-to-end flow from content submission
 * to RSS feed generation. It should FAIL initially (TDD principle) until
 * the complete flow is implemented.
 */
describe('Content Submission Flow Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000, // Longer timeout for integration tests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  });

  describe('Complete Content Submission Flow', () => {
    it('should complete full flow from URL submission to RSS feed generation', async () => {
      // Step 1: Submit content
      const submissionRequest = {
        content_url: 'https://example.com/tech-article',
        content_type: 'url',
        user_note: 'Interesting tech article about AI'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      
      const submissionId = submissionResponse.data.submission_id;
      const feedSlug = submissionResponse.data.feed_slug || 'default-feed';

      // Step 2: Check initial status (should be pending)
      const initialStatusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(initialStatusResponse.status).toBe(200);
      expect(initialStatusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing']).toContain(initialStatusResponse.data.status);
      expect(initialStatusResponse.data.progress).toBeGreaterThanOrEqual(0);

      // Step 3: Wait for processing to complete (with timeout)
      let finalStatus = null;
      const maxWaitTime = 30000; // 30 seconds
      const checkInterval = 2000; // 2 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Step 4: Verify completion
      expect(finalStatus).not.toBeNull();
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus.progress).toBe(100);
      expect(finalStatus).toHaveProperty('episode_id');
      expect(finalStatus).toHaveProperty('rss_feed_url');

      // Step 5: Verify RSS feed is accessible
      const rssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
      
      expect(rssResponse.status).toBe(200);
      expect(rssResponse.headers['content-type']).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
      
      const rssContent = rssResponse.data;
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('</channel>');
      expect(rssContent).toContain('</rss>');

      // Step 6: Verify episode appears in episodes list
      const episodesResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);
      
      expect(episodesResponse.status).toBe(200);
      expect(episodesResponse.data).toHaveProperty('episodes');
      expect(episodesResponse.data.episodes.length).toBeGreaterThan(0);
      
      const episode = episodesResponse.data.episodes.find((ep: any) => ep.episode_id === finalStatus.episode_id);
      expect(episode).toBeDefined();
      expect(episode.title).toBeDefined();
      expect(episode.description).toBeDefined();
      expect(episode.audio_url).toBeDefined();
    }, 60000); // 60 second timeout for this test

    it('should handle YouTube video submission flow', async () => {
      // Step 1: Submit YouTube content
      const submissionRequest = {
        content_url: 'https://www.youtube.com/watch?v=example123',
        content_type: 'youtube',
        user_note: 'Great tutorial video'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Step 2: Monitor processing status
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Step 3: Verify completion
      expect(finalStatus).not.toBeNull();
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus).toHaveProperty('episode_id');
    }, 60000);

    it('should handle PDF document submission flow', async () => {
      // Step 1: Submit PDF content
      const submissionRequest = {
        content_url: 'https://example.com/research-paper.pdf',
        content_type: 'pdf',
        user_note: 'Research paper on machine learning'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Step 2: Monitor processing status
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Step 3: Verify completion
      expect(finalStatus).not.toBeNull();
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus).toHaveProperty('episode_id');
    }, 60000);
  });

  describe('Error Handling in Submission Flow', () => {
    it('should handle failed content processing gracefully', async () => {
      // Step 1: Submit content that will likely fail
      const submissionRequest = {
        content_url: 'https://invalid-url-that-will-fail.com',
        content_type: 'url',
        user_note: 'This should fail'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Step 2: Monitor processing status
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Step 3: Verify failure is handled properly
      if (finalStatus && finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus.error_message).toBeDefined();
        expect(finalStatus.error_message.length).toBeGreaterThan(0);
      }
    }, 60000);

    it('should handle invalid content type submission', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/article',
        content_type: 'invalid_type',
        user_note: 'This should fail validation'
      };

      try {
        await client.post('/content', submissionRequest);
        fail('Expected 400 error for invalid content type');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
      }
    });

    it('should handle missing required fields', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/article'
        // Missing content_type
      };

      try {
        await client.post('/content', submissionRequest);
        fail('Expected 400 error for missing content_type');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
      }
    });
  });

  describe('Multiple Submissions Flow', () => {
    it('should handle multiple concurrent submissions', async () => {
      const submissions = [
        {
          content_url: 'https://example.com/article1',
          content_type: 'url',
          user_note: 'First article'
        },
        {
          content_url: 'https://example.com/article2',
          content_type: 'url',
          user_note: 'Second article'
        },
        {
          content_url: 'https://example.com/article3',
          content_type: 'url',
          user_note: 'Third article'
        }
      ];

      // Submit all content
      const submissionPromises = submissions.map(submission => 
        client.post('/content', submission)
      );

      const submissionResponses = await Promise.all(submissionPromises);

      // Verify all submissions were accepted
      submissionResponses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.data).toHaveProperty('submission_id');
      });

      const submissionIds = submissionResponses.map(response => response.data.submission_id);

      // Monitor all submissions
      const statusPromises = submissionIds.map(async (submissionId) => {
        let finalStatus = null;
        const maxWaitTime = 30000;
        const checkInterval = 2000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
          
          if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
            finalStatus = statusResponse.data;
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        return finalStatus;
      });

      const finalStatuses = await Promise.all(statusPromises);

      // Verify at least some submissions completed successfully
      const completedSubmissions = finalStatuses.filter(status => status && status.status === 'completed');
      expect(completedSubmissions.length).toBeGreaterThan(0);
    }, 90000); // 90 second timeout for concurrent submissions
  });

  describe('RSS Feed Consistency', () => {
    it('should maintain RSS feed consistency across multiple episodes', async () => {
      // Submit multiple pieces of content
      const submissions = [
        {
          content_url: 'https://example.com/article1',
          content_type: 'url',
          user_note: 'First article'
        },
        {
          content_url: 'https://example.com/article2',
          content_type: 'url',
          user_note: 'Second article'
        }
      ];

      const submissionIds = [];
      for (const submission of submissions) {
        const response = await client.post('/content', submission);
        submissionIds.push(response.data.submission_id);
      }

      // Wait for all submissions to complete
      const maxWaitTime = 60000;
      const checkInterval = 3000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const allCompleted = await Promise.all(
          submissionIds.map(async (submissionId) => {
            const statusResponse = await client.get(`/content/${submissionId}/status`);
            return statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed';
          })
        );

        if (allCompleted.every(completed => completed)) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Get the feed slug from the first completed submission
      const firstStatusResponse = await client.get(`/content/${submissionIds[0]}/status`);
      const feedSlug = firstStatusResponse.data.feed_slug || 'default-feed';

      // Verify RSS feed contains all episodes
      const rssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
      
      expect(rssResponse.status).toBe(200);
      const rssContent = rssResponse.data;
      
      // Count episode items in RSS feed
      const episodeMatches = rssContent.match(/<item>/g);
      const episodeCount = episodeMatches ? episodeMatches.length : 0;
      
      expect(episodeCount).toBeGreaterThan(0);

      // Verify episodes list matches RSS feed
      const episodesResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);
      
      expect(episodesResponse.status).toBe(200);
      expect(episodesResponse.data.episodes.length).toBe(episodeCount);
    }, 120000); // 2 minute timeout for this complex test
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid successive submissions', async () => {
      const rapidSubmissions = Array.from({ length: 5 }, (_, i) => ({
        content_url: `https://example.com/rapid-article-${i}`,
        content_type: 'url',
        user_note: `Rapid submission ${i}`
      }));

      // Submit all content rapidly
      const submissionPromises = rapidSubmissions.map(submission => 
        client.post('/content', submission)
      );

      const submissionResponses = await Promise.all(submissionPromises);

      // All should be accepted (or rate limited appropriately)
      submissionResponses.forEach(response => {
        expect([202, 429]).toContain(response.status);
      });

      // Count successful submissions
      const successfulSubmissions = submissionResponses.filter(response => response.status === 202);
      expect(successfulSubmissions.length).toBeGreaterThan(0);
    });

    it('should maintain data consistency during concurrent access', async () => {
      // Submit content
      const submissionRequest = {
        content_url: 'https://example.com/concurrent-test',
        content_type: 'url',
        user_note: 'Concurrent access test'
      };

      const submissionResponse = await client.post('/content', submissionRequest);
      const submissionId = submissionResponse.data.submission_id;

      // Make concurrent status checks
      const concurrentChecks = Array.from({ length: 10 }, () => 
        client.get(`/content/${submissionId}/status`)
      );

      const statusResponses = await Promise.all(concurrentChecks);

      // All responses should be consistent
      statusResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.submission_id).toBe(submissionId);
        expect(['pending', 'processing', 'completed', 'failed']).toContain(response.data.status);
      });
    });
  });
});
