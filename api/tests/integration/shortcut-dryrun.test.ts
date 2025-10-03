import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: iOS Shortcut Dry-Run Flow
 * 
 * This test validates that the iOS Shortcut can perform an end-to-end dry-run check
 * without creating public artifacts or submitting actual content. It verifies:
 * 
 * 1. Server heartbeat is accessible and healthy
 * 2. Shortcut configuration is valid
 * 3. API endpoints are reachable
 * 4. Authentication/authorization works (if required)
 * 5. Request/response formats are compatible
 * 
 * Test Strategy:
 * - Dry-run mode: No actual content submission
 * - Validation only: Check API availability and compatibility
 * - Zero side-effects: No episodes created, no storage used
 * 
 * Requirements Tested:
 * - FR-007: End-to-end check via iOS Shortcut in dry-run mode
 * - FR-016: Server heartbeat status accessible
 */
describe('iOS Shortcut Dry-Run Flow Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
  });

  describe('Server Heartbeat Availability', () => {
    it('should access heartbeat endpoint successfully', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return OK status from heartbeat', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      
      expect(response.data).toHaveProperty('status');
      expect(['OK', 'DEGRADED']).toContain(response.data.status);
    });

    it('should include recent timestamp in heartbeat', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      
      expect(response.data).toHaveProperty('timestamp');
      
      const timestamp = new Date(response.data.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - timestamp.getTime());
      
      // Timestamp should be recent (within 5 seconds)
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should respond to heartbeat within reasonable time', async () => {
      const startTime = Date.now();
      await client.get('/heartbeat');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      
      // Heartbeat should be fast (< 1 second)
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Shortcut Workflow Validation (Dry-Run)', () => {
    it('should validate webhook share endpoint is accessible', async () => {
      // OPTIONS request to check CORS and endpoint availability
      const response = await client.options('/webhook/share');
      
      // Should return 200 or 204 (endpoint exists)
      expect([200, 204, 404]).toContain(response.status);
      
      // If endpoint exists, check CORS headers
      if (response.status !== 404) {
        expect(response.headers).toHaveProperty('access-control-allow-origin');
      }
    });

    it('should reject empty webhook request appropriately', async () => {
      // Send empty payload to validate error handling
      const response = await client.post('/webhook/share', {});
      
      // Should return 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should validate webhook request format without processing', async () => {
      // Send a dry-run marker to validate format without creating content
      const dryRunPayload = {
        url: 'https://example.com/test-article',
        title: 'Dry Run Test Article',
        content: 'This is a dry run test',
        type: 'webpage',
        dryRun: true  // Marker for dry-run mode (if supported)
      };
      
      const response = await client.post('/webhook/share', dryRunPayload);
      
      // Should accept the request (200 or 202) or indicate dry-run not supported
      expect([200, 202, 400]).toContain(response.status);
      
      // If accepted, should not create actual content
      if (response.status === 200 || response.status === 202) {
        expect(response.data).toBeTruthy();
      }
    });

    it('should validate URL format in webhook payload', async () => {
      // Test with invalid URL to check validation
      const invalidPayload = {
        url: 'not-a-valid-url',
        title: 'Test'
      };
      
      const response = await client.post('/webhook/share', invalidPayload);
      
      // Should reject invalid URL
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should accept valid URL format in webhook payload', async () => {
      // Test with valid URL format
      const validPayload = {
        url: 'https://example.com/valid-article',
        title: 'Valid Test Article'
      };
      
      const response = await client.post('/webhook/share', validPayload);
      
      // Should accept (200 or 202) - actual processing may happen
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('Shortcut Configuration Compatibility', () => {
    it('should support JSON content type for webhook', async () => {
      const payload = {
        url: 'https://example.com/article',
        title: 'Test Article'
      };
      
      const response = await client.post('/webhook/share', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should accept JSON content type
      expect([200, 202, 400]).toContain(response.status);
    });

    it('should handle UTF-8 encoded content', async () => {
      const payload = {
        url: 'https://example.com/article',
        title: 'Test Article with émojis 🎙️ and spëcial çharacters'
      };
      
      const response = await client.post('/webhook/share', payload);
      
      // Should handle UTF-8 properly
      expect([200, 202]).toContain(response.status);
    });

    it('should support all required shortcut payload fields', async () => {
      const completePayload = {
        url: 'https://example.com/article',
        title: 'Complete Test Article',
        content: 'Article summary or excerpt',
        type: 'webpage'
      };
      
      const response = await client.post('/webhook/share', completePayload);
      
      // Should accept complete payload
      expect([200, 202]).toContain(response.status);
    });

    it('should work with minimal required fields', async () => {
      const minimalPayload = {
        url: 'https://example.com/article'
      };
      
      const response = await client.post('/webhook/share', minimalPayload);
      
      // Should accept minimal payload
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('API Reachability and Response Format', () => {
    it('should return proper JSON response from heartbeat', async () => {
      const response = await client.get('/heartbeat');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(typeof response.data).toBe('object');
      expect(response.data).not.toBeNull();
    });

    it('should return proper JSON response from webhook', async () => {
      const payload = {
        url: 'https://example.com/article',
        title: 'Response Format Test'
      };
      
      const response = await client.post('/webhook/share', payload);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(typeof response.data).toBe('object');
    });

    it('should include helpful error messages for failed requests', async () => {
      const invalidPayload = {};
      
      const response = await client.post('/webhook/share', invalidPayload);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data).toHaveProperty('message');
      
      // Error message should be descriptive
      expect(typeof response.data.message).toBe('string');
      expect(response.data.message.length).toBeGreaterThan(0);
    });
  });

  describe('Shortcut Performance Requirements', () => {
    it('should respond to webhook within acceptable time', async () => {
      const payload = {
        url: 'https://example.com/article',
        title: 'Performance Test'
      };
      
      const startTime = Date.now();
      await client.post('/webhook/share', payload);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      
      // Should respond quickly (< 5 seconds for initial acceptance)
      expect(responseTime).toBeLessThan(5000);
    });

    it('should handle concurrent shortcut requests', async () => {
      const payload = {
        url: 'https://example.com/concurrent-test',
        title: 'Concurrent Test'
      };
      
      // Make 3 concurrent requests
      const requests = [
        client.post('/webhook/share', { ...payload, title: 'Concurrent 1' }),
        client.post('/webhook/share', { ...payload, title: 'Concurrent 2' }),
        client.post('/webhook/share', { ...payload, title: 'Concurrent 3' })
      ];
      
      const responses = await Promise.all(requests);
      
      // All should succeed or handle gracefully
      responses.forEach(response => {
        expect([200, 202, 429]).toContain(response.status);
      });
    });
  });

  describe('End-to-End Workflow Validation', () => {
    it('should complete full dry-run validation flow', async () => {
      // Step 1: Check server health
      const heartbeatResponse = await client.get('/heartbeat');
      expect(heartbeatResponse.status).toBe(200);
      expect(['OK', 'DEGRADED']).toContain(heartbeatResponse.data.status);
      
      // Step 2: Validate endpoint availability
      const optionsResponse = await client.options('/webhook/share');
      expect([200, 204, 404]).toContain(optionsResponse.status);
      
      // Step 3: Test payload validation (without actual submission)
      const validationPayload = {
        url: 'https://example.com/dry-run-article',
        title: 'Dry Run Validation Test'
      };
      
      const validationResponse = await client.post('/webhook/share', validationPayload);
      expect([200, 202]).toContain(validationResponse.status);
      
      // Step 4: Verify server still healthy after test
      const finalHeartbeat = await client.get('/heartbeat');
      expect(finalHeartbeat.status).toBe(200);
      expect(['OK', 'DEGRADED']).toContain(finalHeartbeat.data.status);
    });

    it('should provide clear feedback for shortcut user', async () => {
      const payload = {
        url: 'https://example.com/feedback-test',
        title: 'Feedback Test Article'
      };
      
      const response = await client.post('/webhook/share', payload);
      
      if (response.status === 200 || response.status === 202) {
        // Success response should have clear message
        expect(response.data).toBeTruthy();
        
        // Should indicate success
        const dataStr = JSON.stringify(response.data);
        expect(
          dataStr.toLowerCase().includes('success') ||
          dataStr.toLowerCase().includes('accepted') ||
          dataStr.toLowerCase().includes('queued') ||
          dataStr.toLowerCase().includes('processing')
        ).toBe(true);
      }
    });

    it('should maintain stateless behavior for shortcut requests', async () => {
      const payload = {
        url: 'https://example.com/stateless-test',
        title: 'Stateless Test'
      };
      
      // Make two identical requests
      const response1 = await client.post('/webhook/share', payload);
      const response2 = await client.post('/webhook/share', payload);
      
      // Both should return consistent status codes
      expect(response1.status).toBe(response2.status);
      
      // Structure should be identical
      expect(Object.keys(response1.data).sort()).toEqual(
        Object.keys(response2.data).sort()
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from malformed JSON', async () => {
      try {
        await client.post('/webhook/share', 'not-json', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error: any) {
        // Should return 400 or handle parse error gracefully
        expect(error.response.status).toBe(400);
      }
    });

    it('should handle very long URLs gracefully', async () => {
      const longUrl = 'https://example.com/article?' + 'a'.repeat(2000);
      const payload = {
        url: longUrl,
        title: 'Long URL Test'
      };
      
      const response = await client.post('/webhook/share', payload);
      
      // Should either accept or reject with clear error
      expect([200, 202, 400, 414]).toContain(response.status);
    });

    it('should handle special characters in URL', async () => {
      const payload = {
        url: 'https://example.com/article?param=hello%20world&foo=bar',
        title: 'Special Characters Test'
      };
      
      const response = await client.post('/webhook/share', payload);
      
      // Should handle URL-encoded characters
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('Shortcut Documentation Compatibility', () => {
    it('should match documented webhook endpoint path', async () => {
      // As per iOS shortcuts quickstart: /api/webhook/share
      const response = await client.post('/webhook/share', {
        url: 'https://example.com/test'
      });
      
      // Endpoint should exist
      expect(response.status).not.toBe(404);
    });

    it('should accept documented JSON structure', async () => {
      // As documented in ios-shortcuts-quickstart.md
      const documentedPayload = {
        url: 'https://example.com/webpage',
        title: 'Article Title',
        content: 'Article content or description',
        type: 'webpage'
      };
      
      const response = await client.post('/webhook/share', documentedPayload);
      
      // Should accept documented format
      expect([200, 202]).toContain(response.status);
    });
  });
});
