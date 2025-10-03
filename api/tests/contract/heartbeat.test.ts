import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: GET /api/heartbeat
 * 
 * This test validates the contract defined in openapi.yaml for the heartbeat endpoint.
 * Tests verify that the endpoint returns the correct structure with status and timestamp fields.
 * 
 * Expected Response (200 OK):
 * {
 *   "status": "OK" | "DEGRADED" | "FAILED",
 *   "timestamp": "2025-01-15T12:34:56.789Z"
 * }
 */
describe('GET /api/heartbeat Contract Tests', () => {
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

  describe('Successful Heartbeat Response (200)', () => {
    it('should return 200 status code', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include required status field', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('status');
      expect(typeof responseData.status).toBe('string');
    });

    it('should have status as one of the allowed enum values', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      const responseData = response.data;
      
      const validStatuses = ['OK', 'DEGRADED', 'FAILED'];
      expect(validStatuses).toContain(responseData.status);
    });

    it('should include required timestamp field', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      const responseData = response.data;
      
      expect(responseData).toHaveProperty('timestamp');
      expect(typeof responseData.timestamp).toBe('string');
    });

    it('should have timestamp in ISO 8601 date-time format', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      const responseData = response.data;
      
      // Validate ISO 8601 format (e.g., 2025-01-15T12:34:56.789Z)
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(responseData.timestamp).toMatch(iso8601Regex);
      
      // Verify it can be parsed as a valid date
      const parsedDate = new Date(responseData.timestamp);
      expect(parsedDate.toString()).not.toBe('Invalid Date');
    });

    it('should have timestamp representing a recent time', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      const responseData = response.data;
      
      const responseTime = new Date(responseData.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - responseTime.getTime());
      
      // Timestamp should be within 5 seconds of current time
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should not include extra unexpected fields', async () => {
      const response: AxiosResponse = await client.get('/heartbeat');
      const responseData = response.data;
      
      const expectedKeys = ['status', 'timestamp'];
      const actualKeys = Object.keys(responseData);
      
      // Allow only the expected keys
      actualKeys.forEach(key => {
        expect(expectedKeys).toContain(key);
      });
    });

    it('should return consistent structure across multiple requests', async () => {
      const response1: AxiosResponse = await client.get('/heartbeat');
      const response2: AxiosResponse = await client.get('/heartbeat');
      
      // Both should have the same structure
      expect(Object.keys(response1.data).sort()).toEqual(Object.keys(response2.data).sort());
      
      // Status should be consistent (assuming system state doesn't change)
      expect(response1.data.status).toBe(response2.data.status);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only accept GET requests', async () => {
      // POST should not be allowed
      try {
        await client.post('/heartbeat');
        fail('POST request should not be allowed');
      } catch (error: any) {
        expect([404, 405]).toContain(error.response?.status);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 1 second', async () => {
      const startTime = Date.now();
      await client.get('/heartbeat');
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() => client.get('/heartbeat'));
      const responses = await Promise.all(requests);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete all 10 requests in less than 3 seconds
      expect(totalTime).toBeLessThan(3000);
    });
  });
});
