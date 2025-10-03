import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: GET /api/health/youtube
 * 
 * This test validates the contract defined in openapi.yaml for the YouTube health check endpoint.
 * Tests verify that the endpoint returns the correct structure with status, message, and lastSuccessAt fields.
 * 
 * Expected Response (200 OK):
 * {
 *   "status": "OK" | "DEGRADED" | "FAILED",
 *   "message": "string",
 *   "lastSuccessAt": "2025-01-15T12:34:56.789Z"
 * }
 */
describe('GET /api/health/youtube Contract Tests', () => {
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

  describe('Successful Health Check Response (200)', () => {
    it('should return 200 status code', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include required status field', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('status');
      expect(typeof responseData.status).toBe('string');
    });

    it('should have status as one of the allowed enum values', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      const validStatuses = ['OK', 'DEGRADED', 'FAILED'];
      expect(validStatuses).toContain(responseData.status);
    });

    it('should include required message field', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('message');
      expect(typeof responseData.message).toBe('string');
    });

    it('should have a non-empty message field', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      expect(responseData.message.length).toBeGreaterThan(0);
    });

    it('should include required lastSuccessAt field', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('lastSuccessAt');
      expect(typeof responseData.lastSuccessAt).toBe('string');
    });

    it('should have lastSuccessAt in ISO 8601 date-time format', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      // Validate ISO 8601 format (e.g., 2025-01-15T12:34:56.789Z)
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(responseData.lastSuccessAt).toMatch(iso8601Regex);
      
      // Verify it can be parsed as a valid date
      const parsedDate = new Date(responseData.lastSuccessAt);
      expect(parsedDate.toString()).not.toBe('Invalid Date');
    });

    it('should have lastSuccessAt as a valid timestamp', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      const successTime = new Date(responseData.lastSuccessAt);
      const now = new Date();
      
      // lastSuccessAt should be in the past or very recent (not future)
      expect(successTime.getTime()).toBeLessThanOrEqual(now.getTime() + 1000); // Allow 1s tolerance
      
      // Should not be too old (e.g., within the last 24 hours for a healthy system)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(successTime.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime());
    });

    it('should not include extra unexpected fields', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      const expectedKeys = ['status', 'message', 'lastSuccessAt'];
      const actualKeys = Object.keys(responseData);
      
      // Allow only the expected keys
      actualKeys.forEach(key => {
        expect(expectedKeys).toContain(key);
      });
    });

    it('should return consistent structure across multiple requests', async () => {
      const response1: AxiosResponse = await client.get('/health/youtube');
      const response2: AxiosResponse = await client.get('/health/youtube');
      
      // Both should have the same structure
      expect(Object.keys(response1.data).sort()).toEqual(Object.keys(response2.data).sort());
      
      // Both should have all required fields
      expect(response1.data).toHaveProperty('status');
      expect(response1.data).toHaveProperty('message');
      expect(response1.data).toHaveProperty('lastSuccessAt');
      
      expect(response2.data).toHaveProperty('status');
      expect(response2.data).toHaveProperty('message');
      expect(response2.data).toHaveProperty('lastSuccessAt');
    });
  });

  describe('Response Field Validation', () => {
    it('should have status field matching message context', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      // If status is OK, message should be positive/informative
      if (responseData.status === 'OK') {
        expect(responseData.message).toBeTruthy();
      }
      
      // If status is DEGRADED or FAILED, message should explain the issue
      if (responseData.status === 'DEGRADED' || responseData.status === 'FAILED') {
        expect(responseData.message.length).toBeGreaterThan(10);
      }
    });

    it('should handle different health states appropriately', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      // Regardless of status, all fields should be present and valid
      expect(['OK', 'DEGRADED', 'FAILED']).toContain(responseData.status);
      expect(typeof responseData.message).toBe('string');
      expect(responseData.message.length).toBeGreaterThan(0);
      
      // lastSuccessAt should always be a valid timestamp
      const successDate = new Date(responseData.lastSuccessAt);
      expect(successDate.toString()).not.toBe('Invalid Date');
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only accept GET requests', async () => {
      // POST should not be allowed
      try {
        await client.post('/health/youtube');
        fail('POST request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });

    it('should not accept PUT requests', async () => {
      try {
        await client.put('/health/youtube');
        fail('PUT request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });

    it('should not accept DELETE requests', async () => {
      try {
        await client.delete('/health/youtube');
        fail('DELETE request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 1 second (p95 requirement)', async () => {
      const startTime = Date.now();
      await client.get('/health/youtube');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() => client.get('/health/youtube'));
      const responses = await Promise.all(requests);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('message');
        expect(response.data).toHaveProperty('lastSuccessAt');
      });
      
      // Should complete all 10 requests in less than 3 seconds
      expect(totalTime).toBeLessThan(3000);
    });

    it('should maintain consistent response times across multiple calls', async () => {
      const responseTimes: number[] = [];
      
      // Make 5 sequential requests and measure each
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await client.get('/health/youtube');
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // Average should be well under 1 second
      expect(avgResponseTime).toBeLessThan(500);
      
      // No single request should exceed 1 second
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(1000);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle request with invalid Accept header gracefully', async () => {
      const response = await client.get('/health/youtube', {
        headers: {
          'Accept': 'text/plain'
        }
      });
      
      // Should still return 200 and JSON (health checks are critical)
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    });

    it('should be idempotent - multiple calls return same structure', async () => {
      const responses = await Promise.all([
        client.get('/health/youtube'),
        client.get('/health/youtube'),
        client.get('/health/youtube')
      ]);
      
      // All responses should have identical structure
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Object.keys(response.data).sort()).toEqual(['lastSuccessAt', 'message', 'status']);
      });
    });
  });

  describe('OpenAPI Contract Compliance', () => {
    it('should match the OpenAPI schema exactly', async () => {
      const response: AxiosResponse = await client.get('/health/youtube');
      const responseData = response.data;
      
      // Verify all required fields are present
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('lastSuccessAt');
      
      // Verify field types
      expect(typeof responseData.status).toBe('string');
      expect(typeof responseData.message).toBe('string');
      expect(typeof responseData.lastSuccessAt).toBe('string');
      
      // Verify enum constraint
      expect(['OK', 'DEGRADED', 'FAILED']).toContain(responseData.status);
      
      // Verify date-time format
      expect(responseData.lastSuccessAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
      
      // Verify no extra fields
      const keys = Object.keys(responseData);
      expect(keys.length).toBe(3);
    });
  });
});
