import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: RSS Feed Generation
 * 
 * This test validates the complete RSS feed generation process including
 * feed creation, episode addition, iTunes compliance, and feed consistency.
 * It should FAIL initially (TDD principle) until the RSS generation is implemented.
 */
describe('RSS Feed Generation Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000, // Longer timeout for integration tests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/rss+xml, application/xml, text/xml'
      }
    });
  });

  describe('RSS Feed Creation and Management', () => {
    it('should create and maintain RSS feed with multiple episodes', async () => {
      // Step 1: Submit multiple pieces of content to create episodes
      const submissions = [
        {
          content_url: 'https://example.com/tech-article-1',
          content_type: 'url',
          user_note: 'First tech article about AI'
        },
        {
          content_url: 'https://example.com/tech-article-2',
          content_type: 'url',
          user_note: 'Second tech article about machine learning'
        },
        {
          content_url: 'https://www.youtube.com/watch?v=example123',
          content_type: 'youtube',
          user_note: 'Great tutorial video'
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
      const feedSlug = submissionResponses[0]?.data?.feed_slug || 'default-feed';

      // Step 2: Wait for all submissions to complete
      const maxWaitTime = 60000; // 60 seconds
      const checkInterval = 3000; // 3 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const allCompleted = await Promise.all(
          submissionIds.map(async (submissionId) => {
            try {
              const statusResponse = await client.get(`/content/${submissionId}/status`);
              return statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed';
            } catch (error) {
              return false;
            }
          })
        );

        if (allCompleted.every(completed => completed)) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Step 3: Verify RSS feed is generated and accessible
      const rssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
      
      expect(rssResponse.status).toBe(200);
      expect(rssResponse.headers['content-type']).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
      
      const rssContent = rssResponse.data;
      expect(typeof rssContent).toBe('string');
      expect(rssContent.length).toBeGreaterThan(0);

      // Step 4: Validate RSS feed structure
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssContent).toContain('<rss version="2.0"');
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('</channel>');
      expect(rssContent).toContain('</rss>');

      // Step 5: Validate iTunes namespace
      expect(rssContent).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');

      // Step 6: Count episodes in RSS feed
      const episodeMatches = rssContent.match(/<item>/g);
      const episodeCount = episodeMatches ? episodeMatches.length : 0;
      expect(episodeCount).toBeGreaterThan(0);

      // Step 7: Verify episodes list matches RSS feed
      const episodesResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/episodes`);
      
      expect(episodesResponse.status).toBe(200);
      expect(episodesResponse.data.episodes.length).toBe(episodeCount);
    }, 120000); // 2 minute timeout

    it('should generate valid iTunes-compliant RSS feed', async () => {
      // Submit content to generate feed
      const submissionRequest = {
        content_url: 'https://example.com/itunes-test-article',
        content_type: 'url',
        user_note: 'iTunes compliance test'
      };

      const submissionResponse = await client.post('/content', submissionRequest);
      const submissionId = submissionResponse.data.submission_id;
      const feedSlug = submissionResponse.data.feed_slug || 'default-feed';

      // Wait for completion
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const statusResponse = await client.get(`/content/${submissionId}/status`);
          if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
            finalStatus = statusResponse.data;
            break;
          }
        } catch (error) {
          // Continue waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (finalStatus && finalStatus.status === 'completed') {
        // Get RSS feed
        const rssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
        
        expect(rssResponse.status).toBe(200);
        const rssContent = rssResponse.data;

        // Validate iTunes-specific elements
        expect(rssContent).toMatch(/<itunes:author>.*<\/itunes:author>/);
        expect(rssContent).toMatch(/<itunes:summary>.*<\/itunes:summary>/);
        expect(rssContent).toMatch(/<itunes:owner>/);
        expect(rssContent).toMatch(/<itunes:name>.*<\/itunes:name>/);
        expect(rssContent).toMatch(/<itunes:email>.*<\/itunes:email>/);
        expect(rssContent).toMatch(/<\/itunes:owner>/);
        expect(rssContent).toMatch(/<itunes:explicit>.*<\/itunes:explicit>/);
        expect(rssContent).toMatch(/<itunes:category text=".*"\/>/);
        expect(rssContent).toMatch(/<itunes:type>.*<\/itunes:type>/);

        // Validate episode iTunes elements
        expect(rssContent).toMatch(/<itunes:duration>.*<\/itunes:duration>/);
        expect(rssContent).toMatch(/<itunes:episodeType>.*<\/itunes:episodeType>/);
      }
    }, 60000);

    it('should maintain RSS feed consistency across updates', async () => {
      const feedSlug = 'consistency-test-feed';

      // Submit first episode
      const firstSubmission = {
        content_url: 'https://example.com/first-episode',
        content_type: 'url',
        user_note: 'First episode'
      };

      const firstResponse = await client.post('/content', firstSubmission);
      const firstSubmissionId = firstResponse.data.submission_id;

      // Wait for first episode to complete
      let firstCompleted = false;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime && !firstCompleted) {
        try {
          const statusResponse = await client.get(`/content/${firstSubmissionId}/status`);
          if (statusResponse.data.status === 'completed') {
            firstCompleted = true;
          }
        } catch (error) {
          // Continue waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (firstCompleted) {
        // Get initial RSS feed
        const initialRssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
        expect(initialRssResponse.status).toBe(200);
        
        const initialRssContent = initialRssResponse.data;
        const initialEpisodeCount = (initialRssContent.match(/<item>/g) || []).length;

        // Submit second episode
        const secondSubmission = {
          content_url: 'https://example.com/second-episode',
          content_type: 'url',
          user_note: 'Second episode'
        };

        const secondResponse = await client.post('/content', secondSubmission);
        const secondSubmissionId = secondResponse.data.submission_id;

        // Wait for second episode to complete
        let secondCompleted = false;
        const secondStartTime = Date.now();

        while (Date.now() - secondStartTime < maxWaitTime && !secondCompleted) {
          try {
            const statusResponse = await client.get(`/content/${secondSubmissionId}/status`);
            if (statusResponse.data.status === 'completed') {
              secondCompleted = true;
            }
          } catch (error) {
            // Continue waiting
          }
          
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        if (secondCompleted) {
          // Get updated RSS feed
          const updatedRssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
          expect(updatedRssResponse.status).toBe(200);
          
          const updatedRssContent = updatedRssResponse.data;
          const updatedEpisodeCount = (updatedRssContent.match(/<item>/g) || []).length;

          // Verify episode count increased
          expect(updatedEpisodeCount).toBeGreaterThan(initialEpisodeCount);

          // Verify feed structure is still valid
          expect(updatedRssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(updatedRssContent).toContain('<rss version="2.0"');
          expect(updatedRssContent).toContain('<channel>');
          expect(updatedRssContent).toContain('</channel>');
          expect(updatedRssContent).toContain('</rss>');
        }
      }
    }, 120000);
  });

  describe('RSS Feed Content Validation', () => {
    it('should generate valid episode metadata in RSS feed', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/metadata-test',
        content_type: 'url',
        user_note: 'Metadata validation test'
      };

      const submissionResponse = await client.post('/content', submissionRequest);
      const submissionId = submissionResponse.data.submission_id;
      const feedSlug = submissionResponse.data.feed_slug || 'default-feed';

      // Wait for completion
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const statusResponse = await client.get(`/content/${submissionId}/status`);
          if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
            finalStatus = statusResponse.data;
            break;
          }
        } catch (error) {
          // Continue waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (finalStatus && finalStatus.status === 'completed') {
        // Get RSS feed
        const rssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
        
        expect(rssResponse.status).toBe(200);
        const rssContent = rssResponse.data;

        // Validate episode metadata
        expect(rssContent).toMatch(/<title>.*<\/title>/);
        expect(rssContent).toMatch(/<description>.*<\/description>/);
        expect(rssContent).toMatch(/<guid isPermaLink="false">.*<\/guid>/);
        expect(rssContent).toMatch(/<pubDate>.*<\/pubDate>/);
        expect(rssContent).toMatch(/<enclosure url=".*" type="audio\/mpeg" length=".*"\/>/);

        // Validate publication date format
        const pubDateMatch = rssContent.match(/<pubDate>(.*?)<\/pubDate>/);
        if (pubDateMatch) {
          const pubDate = pubDateMatch[1];
          const date = new Date(pubDate);
          expect(date.getTime()).not.toBeNaN();
        }

        // Validate GUID format
        const guidMatch = rssContent.match(/<guid isPermaLink="false">(.*?)<\/guid>/);
        if (guidMatch) {
          const guid = guidMatch[1];
          expect(guid.length).toBeGreaterThan(0);
          expect(guid).not.toContain(' ');
        }

        // Validate audio URL format
        const enclosureMatch = rssContent.match(/<enclosure url="([^"]*)" type="audio\/mpeg" length="(\d+)"\/>/);
        if (enclosureMatch) {
          const audioUrl = enclosureMatch[1];
          const fileSize = parseInt(enclosureMatch[2]);
          
          expect(() => new URL(audioUrl)).not.toThrow();
          expect(fileSize).toBeGreaterThan(0);
        }
      }
    }, 60000);

    it('should generate proper channel metadata', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/channel-metadata-test',
        content_type: 'url',
        user_note: 'Channel metadata test'
      };

      const submissionResponse = await client.post('/content', submissionRequest);
      const feedSlug = submissionResponse.data.feed_slug || 'default-feed';

      // Wait for completion
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const statusResponse = await client.get(`/content/${submissionResponse.data.submission_id}/status`);
          if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
            finalStatus = statusResponse.data;
            break;
          }
        } catch (error) {
          // Continue waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (finalStatus && finalStatus.status === 'completed') {
        // Get RSS feed
        const rssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
        
        expect(rssResponse.status).toBe(200);
        const rssContent = rssResponse.data;

        // Validate channel metadata
        expect(rssContent).toMatch(/<title>.*<\/title>/);
        expect(rssContent).toMatch(/<description>.*<\/description>/);
        expect(rssContent).toMatch(/<link>.*<\/link>/);
        expect(rssContent).toMatch(/<language>.*<\/language>/);
        expect(rssContent).toMatch(/<copyright>.*<\/copyright>/);

        // Validate link is a valid URL
        const linkMatch = rssContent.match(/<link>(.*?)<\/link>/);
        if (linkMatch) {
          const link = linkMatch[1];
          expect(() => new URL(link)).not.toThrow();
        }
      }
    }, 60000);
  });

  describe('RSS Feed Performance and Caching', () => {
    it('should handle concurrent RSS feed requests efficiently', async () => {
      const feedSlug = 'performance-test-feed';

      // Submit content to create feed
      const submissionRequest = {
        content_url: 'https://example.com/performance-test',
        content_type: 'url',
        user_note: 'Performance test'
      };

      const submissionResponse = await client.post('/content', submissionRequest);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for completion
      let finalStatus = null;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const statusResponse = await client.get(`/content/${submissionId}/status`);
          if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
            finalStatus = statusResponse.data;
            break;
          }
        } catch (error) {
          // Continue waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (finalStatus && finalStatus.status === 'completed') {
        // Make concurrent RSS feed requests
        const concurrentRequests = Array.from({ length: 10 }, () => 
          client.get(`/feeds/${feedSlug}/rss.xml`)
        );

        const startTime = Date.now();
        const responses = await Promise.all(concurrentRequests);
        const endTime = Date.now();

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.headers['content-type']).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
        });

        // Performance check - should complete within reasonable time
        const totalTime = endTime - startTime;
        expect(totalTime).toBeLessThan(5000); // Less than 5 seconds for 10 concurrent requests

        // All responses should have identical content
        const rssContents = responses.map(response => response.data);
        const firstContent = rssContents[0];
        rssContents.forEach(content => {
          expect(content).toBe(firstContent);
        });
      }
    }, 90000);

    it('should maintain RSS feed consistency during updates', async () => {
      const feedSlug = 'consistency-update-test';

      // Submit initial content
      const initialSubmission = {
        content_url: 'https://example.com/initial-episode',
        content_type: 'url',
        user_note: 'Initial episode'
      };

      const initialResponse = await client.post('/content', initialSubmission);
      const initialSubmissionId = initialResponse.data.submission_id;

      // Wait for initial completion
      let initialCompleted = false;
      const maxWaitTime = 30000;
      const checkInterval = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime && !initialCompleted) {
        try {
          const statusResponse = await client.get(`/content/${initialSubmissionId}/status`);
          if (statusResponse.data.status === 'completed') {
            initialCompleted = true;
          }
        } catch (error) {
          // Continue waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      if (initialCompleted) {
        // Get initial RSS feed
        const initialRssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
        expect(initialRssResponse.status).toBe(200);
        
        const initialRssContent = initialRssResponse.data;
        const initialEpisodeCount = (initialRssContent.match(/<item>/g) || []).length;

        // Submit additional content
        const additionalSubmission = {
          content_url: 'https://example.com/additional-episode',
          content_type: 'url',
          user_note: 'Additional episode'
        };

        const additionalResponse = await client.post('/content', additionalSubmission);
        const additionalSubmissionId = additionalResponse.data.submission_id;

        // Wait for additional completion
        let additionalCompleted = false;
        const additionalStartTime = Date.now();

        while (Date.now() - additionalStartTime < maxWaitTime && !additionalCompleted) {
          try {
            const statusResponse = await client.get(`/content/${additionalSubmissionId}/status`);
            if (statusResponse.data.status === 'completed') {
              additionalCompleted = true;
            }
          } catch (error) {
            // Continue waiting
          }
          
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        if (additionalCompleted) {
          // Get updated RSS feed
          const updatedRssResponse: AxiosResponse = await client.get(`/feeds/${feedSlug}/rss.xml`);
          expect(updatedRssResponse.status).toBe(200);
          
          const updatedRssContent = updatedRssResponse.data;
          const updatedEpisodeCount = (updatedRssContent.match(/<item>/g) || []).length;

          // Verify episode count increased
          expect(updatedEpisodeCount).toBeGreaterThan(initialEpisodeCount);

          // Verify feed structure remains valid
          expect(updatedRssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(updatedRssContent).toContain('<rss version="2.0"');
          expect(updatedRssContent).toContain('<channel>');
          expect(updatedRssContent).toContain('</channel>');
          expect(updatedRssContent).toContain('</rss>');
        }
      }
    }, 120000);
  });

  describe('RSS Feed Error Handling', () => {
    it('should handle non-existent feed gracefully', async () => {
      const nonExistentFeedSlug = 'non-existent-feed-12345';
      
      try {
        await client.get(`/feeds/${nonExistentFeedSlug}/rss.xml`);
        fail('Expected 404 error for non-existent feed');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data.error).toBe('FEED_NOT_FOUND');
      }
    });

    it('should handle invalid feed slug format', async () => {
      const invalidFeedSlugs = [
        'invalid slug', // contains space
        'invalid@slug', // contains special character
        'invalid/slug', // contains slash
        'invalid.slug', // contains dot
        '', // empty
        'a', // too short
        'a'.repeat(101) // too long
      ];

      for (const invalidSlug of invalidFeedSlugs) {
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
  });
});
