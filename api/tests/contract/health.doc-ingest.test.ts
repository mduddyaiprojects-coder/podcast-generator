import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: GET /api/health/doc-ingest
 * 
 * This test validates the contract defined in openapi.yaml for the document ingestion health check endpoint.
 * Tests verify that the endpoint returns the correct structure with status, message, and lastSuccessAt fields.
 * 
 * Expected Response (200 OK):
 * {
 *   "status": "OK" | "DEGRADED" | "FAILED",
 *   "message": "string",
 *   "lastSuccessAt": "2025-01-15T12:34:56.789Z"
 * }
 */
describe('GET /api/health/doc-ingest Contract Tests', () => {
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
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include required status field', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('status');
      expect(typeof responseData.status).toBe('string');
    });

    it('should have status as one of the allowed enum values', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      const validStatuses = ['OK', 'DEGRADED', 'FAILED'];
      expect(validStatuses).toContain(responseData.status);
    });

    it('should include required message field', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('message');
      expect(typeof responseData.message).toBe('string');
    });

    it('should have a non-empty message', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      expect(responseData.message.length).toBeGreaterThan(0);
    });

    it('should include required lastSuccessAt field', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('lastSuccessAt');
      expect(typeof responseData.lastSuccessAt).toBe('string');
    });

    it('should have lastSuccessAt in ISO 8601 date-time format', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      // Validate ISO 8601 format (e.g., 2025-01-15T12:34:56.789Z)
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(responseData.lastSuccessAt).toMatch(iso8601Regex);
      
      // Verify it can be parsed as a valid date
      const parsedDate = new Date(responseData.lastSuccessAt);
      expect(parsedDate.toString()).not.toBe('Invalid Date');
    });

    it('should have lastSuccessAt representing a valid timestamp', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      const lastSuccessTime = new Date(responseData.lastSuccessAt);
      const now = new Date();
      
      // lastSuccessAt should not be in the future
      expect(lastSuccessTime.getTime()).toBeLessThanOrEqual(now.getTime());
      
      // lastSuccessAt should be within reasonable past (e.g., last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      expect(lastSuccessTime.getTime()).toBeGreaterThan(thirtyDaysAgo.getTime());
    });

    it('should not include extra unexpected fields', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      const expectedKeys = ['status', 'message', 'lastSuccessAt'];
      const actualKeys = Object.keys(responseData);
      
      // Allow only the expected keys
      actualKeys.forEach(key => {
        expect(expectedKeys).toContain(key);
      });
    });

    it('should return consistent structure across multiple requests', async () => {
      const response1: AxiosResponse = await client.get('/health/doc-ingest');
      const response2: AxiosResponse = await client.get('/health/doc-ingest');
      
      // Both should have the same structure
      expect(Object.keys(response1.data).sort()).toEqual(Object.keys(response2.data).sort());
      
      // Status and message should be consistent (assuming system state doesn't change)
      expect(response1.data.status).toBe(response2.data.status);
      expect(response1.data.message).toBe(response2.data.message);
    });
  });

  describe('Health Status Scenarios', () => {
    it('should return OK status when document ingestion is healthy', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      // Current implementation returns OK by default
      expect(responseData.status).toBe('OK');
      expect(responseData.message).toBeTruthy();
    });

    it('should provide meaningful message for health status', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      // Message should contain relevant information about document ingestion
      const message = responseData.message.toLowerCase();
      expect(
        message.includes('document') || 
        message.includes('ingest') || 
        message.includes('health') ||
        message.includes('ok') ||
        message.includes('success')
      ).toBe(true);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only accept GET requests', async () => {
      // POST should not be allowed
      try {
        await client.post('/health/doc-ingest');
        fail('POST request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });

    it('should not accept PUT requests', async () => {
      try {
        await client.put('/health/doc-ingest');
        fail('PUT request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });

    it('should not accept DELETE requests', async () => {
      try {
        await client.delete('/health/doc-ingest');
        fail('DELETE request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 1 second', async () => {
      const startTime = Date.now();
      await client.get('/health/doc-ingest');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() => client.get('/health/doc-ingest'));
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

    it('should maintain consistent response time across requests', async () => {
      const responseTimes: number[] = [];
      
      // Make 5 sequential requests and measure response time
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await client.get('/health/doc-ingest');
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }
      
      // Calculate average and standard deviation
      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // All response times should be reasonably consistent (within 500ms of average)
      responseTimes.forEach(time => {
        expect(Math.abs(time - average)).toBeLessThan(500);
      });
    });
  });

  describe('Reliability and Availability', () => {
    it('should be available and not return error status codes', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      
      // Should not return 5xx errors
      expect(response.status).toBeLessThan(500);
    });

    it('should handle rapid successive requests without degradation', async () => {
      // Make 20 rapid requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(client.get('/health/doc-ingest'));
      }
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.status).toMatch(/^(OK|DEGRADED|FAILED)$/);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data type consistency across all fields', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      // Verify all fields have correct types
      expect(typeof responseData.status).toBe('string');
      expect(typeof responseData.message).toBe('string');
      expect(typeof responseData.lastSuccessAt).toBe('string');
    });

    it('should provide valid date that can be used in calculations', async () => {
      const response: AxiosResponse = await client.get('/health/doc-ingest');
      const responseData = response.data;
      
      const lastSuccess = new Date(responseData.lastSuccessAt);
      const now = new Date();
      
      // Should be able to calculate time difference
      const timeDiff = now.getTime() - lastSuccess.getTime();
      expect(typeof timeDiff).toBe('number');
      expect(timeDiff).toBeGreaterThanOrEqual(0);
    });
  });
});
