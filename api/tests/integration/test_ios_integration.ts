import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: iOS Share Sheet Integration
 * 
 * This test validates the iOS Share Sheet integration flow including
 * content sharing from iOS apps, Share Sheet extension functionality,
 * and iOS Shortcuts automation. It should FAIL initially (TDD principle)
 * until the iOS integration is implemented.
 */
describe('iOS Share Sheet Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000, // Longer timeout for integration tests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'iOS ShareSheet/1.0 (iPhone; iOS 17.0; Scale/3.0)'
      }
    });
  });

  describe('iOS Share Sheet Content Submission', () => {
    it('should handle URL sharing from iOS Share Sheet', async () => {
      // Simulate iOS Share Sheet URL sharing
      const shareRequest = {
        content_url: 'https://example.com/ios-shared-article',
        content_type: 'url',
        user_note: 'Shared from iOS Safari',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      expect(submissionResponse.data).toHaveProperty('feed_slug');
      
      const submissionId = submissionResponse.data.submission_id;
      const feedSlug = submissionResponse.data.feed_slug;

      // Verify initial status
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing']).toContain(statusResponse.data.status);
      expect(statusResponse.data.source).toBe('ios_share_sheet');
    }, 30000);

    it('should handle YouTube video sharing from iOS Share Sheet', async () => {
      // Simulate iOS Share Sheet YouTube sharing
      const shareRequest = {
        content_url: 'https://www.youtube.com/watch?v=ios-shared-video',
        content_type: 'youtube',
        user_note: 'Shared from iOS YouTube app',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'YouTube',
          share_extension_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      
      const submissionId = submissionResponse.data.submission_id;

      // Verify processing status
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing']).toContain(statusResponse.data.status);
      expect(statusResponse.data.source).toBe('ios_share_sheet');
    }, 30000);

    it('should handle document sharing from iOS Files app', async () => {
      // Simulate iOS Files app document sharing
      const shareRequest = {
        content_url: 'https://example.com/ios-shared-document.pdf',
        content_type: 'pdf',
        user_note: 'Shared from iOS Files app',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Files',
          share_extension_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      
      const submissionId = submissionResponse.data.submission_id;

      // Verify processing status
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing']).toContain(statusResponse.data.status);
      expect(statusResponse.data.source).toBe('ios_share_sheet');
    }, 30000);

    it('should handle text sharing from iOS Notes app', async () => {
      // Simulate iOS Notes app text sharing
      const shareRequest = {
        content_url: 'https://example.com/ios-shared-text',
        content_type: 'text',
        user_note: 'Shared text from iOS Notes app',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Notes',
          share_extension_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      
      const submissionId = submissionResponse.data.submission_id;

      // Verify processing status
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing']).toContain(statusResponse.data.status);
      expect(statusResponse.data.source).toBe('ios_share_sheet');
    }, 30000);
  });

  describe('iOS Share Sheet Error Handling', () => {
    it('should handle invalid content from iOS Share Sheet', async () => {
      const invalidShareRequest = {
        content_url: 'invalid-url',
        content_type: 'url',
        user_note: 'Invalid content from iOS',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
      };

      try {
        await client.post('/content', invalidShareRequest);
        fail('Expected 400 error for invalid content URL');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
      }
    });

    it('should handle missing device info from iOS Share Sheet', async () => {
      const shareRequest = {
        content_url: 'https://example.com/ios-shared-article',
        content_type: 'url',
        user_note: 'Shared from iOS without device info',
        source: 'ios_share_sheet'
        // Missing device_info
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      // Should still work but with default device info
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
    });

    it('should handle iOS Share Sheet timeout gracefully', async () => {
      const shareRequest = {
        content_url: 'https://example.com/ios-shared-article',
        content_type: 'url',
        user_note: 'Shared from iOS with timeout',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Verify status endpoint works even if processing takes time
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing', 'completed', 'failed']).toContain(statusResponse.data.status);
    });
  });

  describe('iOS Shortcuts Integration', () => {
    it('should handle iOS Shortcuts automation workflow', async () => {
      // Simulate iOS Shortcuts automation
      const shortcutsRequest = {
        content_url: 'https://example.com/shortcuts-automated-article',
        content_type: 'url',
        user_note: 'Automated via iOS Shortcuts',
        source: 'ios_shortcuts',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Shortcuts',
          shortcut_name: 'SendToPodcast',
          shortcut_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shortcutsRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      
      const submissionId = submissionResponse.data.submission_id;

      // Verify processing status
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.submission_id).toBe(submissionId);
      expect(['pending', 'processing']).toContain(statusResponse.data.status);
      expect(statusResponse.data.source).toBe('ios_shortcuts');
    }, 30000);

    it('should handle batch content submission from iOS Shortcuts', async () => {
      // Simulate batch submission from iOS Shortcuts
      const batchRequest = {
        content_urls: [
          'https://example.com/shortcuts-batch-1',
          'https://example.com/shortcuts-batch-2',
          'https://example.com/shortcuts-batch-3'
        ],
        content_type: 'url',
        user_note: 'Batch submission via iOS Shortcuts',
        source: 'ios_shortcuts',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Shortcuts',
          shortcut_name: 'BatchSendToPodcast',
          shortcut_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content/batch', batchRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_ids');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      expect(Array.isArray(submissionResponse.data.submission_ids)).toBe(true);
      expect(submissionResponse.data.submission_ids.length).toBe(3);
    }, 30000);
  });

  describe('iOS Share Sheet UI Integration', () => {
    it('should provide iOS Share Sheet specific response format', async () => {
      const shareRequest = {
        content_url: 'https://example.com/ios-ui-test',
        content_type: 'url',
        user_note: 'iOS UI test',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
      };

      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      expect(submissionResponse.data).toHaveProperty('feed_slug');
      expect(submissionResponse.data).toHaveProperty('rss_feed_url');
      expect(submissionResponse.data).toHaveProperty('podcast_apps');
      
      // Verify iOS-specific response format
      expect(submissionResponse.data.podcast_apps).toHaveProperty('apple_podcasts');
      expect(submissionResponse.data.podcast_apps).toHaveProperty('overcast');
      expect(submissionResponse.data.podcast_apps).toHaveProperty('spotify');
      
      expect(submissionResponse.data.podcast_apps.apple_podcasts).toHaveProperty('url');
      expect(submissionResponse.data.podcast_apps.overcast).toHaveProperty('url');
      expect(submissionResponse.data.podcast_apps.spotify).toHaveProperty('url');
    });

    it('should handle iOS Share Sheet cancellation', async () => {
      // Simulate iOS Share Sheet cancellation
      const cancelRequest = {
        submission_id: 'test-submission-id',
        action: 'cancel',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
      };

      try {
        await client.post('/content/cancel', cancelRequest);
        fail('Expected 404 error for non-existent submission');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
      }
    });
  });

  describe('iOS Share Sheet Performance', () => {
    it('should handle rapid iOS Share Sheet submissions', async () => {
      const rapidSubmissions = Array.from({ length: 5 }, (_, i) => ({
        content_url: `https://example.com/ios-rapid-${i}`,
        content_type: 'url',
        user_note: `Rapid iOS submission ${i}`,
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
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

    it('should maintain iOS Share Sheet responsiveness', async () => {
      const shareRequest = {
        content_url: 'https://example.com/ios-responsiveness-test',
        content_type: 'url',
        user_note: 'iOS responsiveness test',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        }
      };

      const startTime = Date.now();
      const submissionResponse: AxiosResponse = await client.post('/content', shareRequest);
      const endTime = Date.now();

      expect(submissionResponse.status).toBe(202);
      
      // iOS Share Sheet should respond quickly (under 2 seconds)
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('iOS Share Sheet Security', () => {
    it('should validate iOS Share Sheet requests securely', async () => {
      const maliciousRequest = {
        content_url: 'https://example.com/malicious-content',
        content_type: 'url',
        user_note: 'Malicious content from iOS',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        },
        // Attempt to inject malicious data
        malicious_field: '<script>alert("xss")</script>'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', maliciousRequest);
      
      // Should still process the request but sanitize the data
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      
      // Verify malicious data is not reflected in response
      expect(JSON.stringify(submissionResponse.data)).not.toContain('<script>');
    });

    it('should handle iOS Share Sheet authentication', async () => {
      // Test with valid iOS Share Sheet authentication
      const authenticatedRequest = {
        content_url: 'https://example.com/authenticated-ios-content',
        content_type: 'url',
        user_note: 'Authenticated iOS content',
        source: 'ios_share_sheet',
        device_info: {
          platform: 'iOS',
          version: '17.0',
          app: 'Safari',
          share_extension_version: '1.0.0'
        },
        auth_token: 'valid-ios-auth-token'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', authenticatedRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
    });
  });
});
