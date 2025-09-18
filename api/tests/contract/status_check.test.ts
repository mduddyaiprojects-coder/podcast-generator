import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: GET /api/content/{id}/status
 * 
 * This test validates the contract defined in content-submission.yaml
 * It should FAIL initially (TDD principle) until the endpoint is implemented
 */
describe('GET /api/content/{id}/status Contract Tests', () => {
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

  describe('Successful Status Retrieval (200)', () => {
    it('should return pending status for valid submission ID', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      
      const responseData = response.data;
      expect(responseData).toHaveProperty('submission_id');
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('progress');
      
      // Validate submission_id matches the requested ID
      expect(responseData.submission_id).toBe(submissionId);
      
      // Validate status is one of the allowed values
      expect(['pending', 'processing', 'completed', 'failed']).toContain(responseData.status);
      
      // Validate progress is within valid range
      expect(responseData.progress).toBeGreaterThanOrEqual(0);
      expect(responseData.progress).toBeLessThanOrEqual(100);
      
      // Validate progress is an integer
      expect(Number.isInteger(responseData.progress)).toBe(true);
    });

    it('should return processing status with progress and current step', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.status === 'processing') {
        expect(responseData).toHaveProperty('current_step');
        expect(responseData).toHaveProperty('estimated_completion');
        
        // Validate estimated_completion is a valid ISO date
        expect(new Date(responseData.estimated_completion)).toBeInstanceOf(Date);
        expect(new Date(responseData.estimated_completion).getTime()).not.toBeNaN();
      }
    });

    it('should return completed status with episode details', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.status === 'completed') {
        expect(responseData).toHaveProperty('episode_id');
        expect(responseData).toHaveProperty('rss_feed_url');
        expect(responseData).toHaveProperty('current_step');
        
        // Validate episode_id is a valid UUID
        expect(responseData.episode_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        // Validate rss_feed_url is a valid URL
        expect(() => new URL(responseData.rss_feed_url)).not.toThrow();
      }
    });

    it('should return failed status with error message', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      if (responseData.status === 'failed') {
        expect(responseData).toHaveProperty('error_message');
        expect(responseData).toHaveProperty('current_step');
        
        // Validate error_message is a non-empty string
        expect(typeof responseData.error_message).toBe('string');
        expect(responseData.error_message.length).toBeGreaterThan(0);
      }
    });

    it('should return valid response for any valid UUID format', async () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      ];

      for (const uuid of validUuids) {
        const response: AxiosResponse = await client.get(`/content/${uuid}/status`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('submission_id');
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('progress');
      }
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent submission ID', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      
      try {
        await client.get(`/content/${nonExistentId}/status`);
        fail('Expected 404 error for non-existent submission ID');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('SUBMISSION_NOT_FOUND');
      }
    });

    it('should return 404 for invalid UUID format', async () => {
      const invalidUuids = [
        'invalid-uuid',
        '123',
        'not-a-uuid-at-all',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000' // too long
      ];

      for (const invalidUuid of invalidUuids) {
        try {
          await client.get(`/content/${invalidUuid}/status`);
          fail(`Expected 404 error for invalid UUID: ${invalidUuid}`);
        } catch (error: any) {
          expect(error.response?.status).toBe(404);
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('message');
          expect(error.response?.data).toHaveProperty('details');
        }
      }
    });

    it('should return 404 for empty submission ID', async () => {
      try {
        await client.get('/content//status');
        fail('Expected 404 error for empty submission ID');
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
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      try {
        await client.get(`/content/${submissionId}/status`);
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
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return valid JSON response', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      expect(() => JSON.parse(JSON.stringify(response.data))).not.toThrow();
    });

    it('should not have additional properties in response', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      const allowedProperties = [
        'submission_id',
        'status',
        'progress',
        'current_step',
        'estimated_completion',
        'episode_id',
        'rss_feed_url',
        'error_message'
      ];
      
      const responseProperties = Object.keys(responseData);
      const unexpectedProperties = responseProperties.filter(prop => !allowedProperties.includes(prop));
      
      expect(unexpectedProperties).toHaveLength(0);
    });
  });

  describe('Status Transition Validation', () => {
    it('should maintain consistent submission_id across status checks', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Make multiple requests to the same submission
      const responses = await Promise.all([
        client.get(`/content/${submissionId}/status`),
        client.get(`/content/${submissionId}/status`),
        client.get(`/content/${submissionId}/status`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.submission_id).toBe(submissionId);
      });
    });

    it('should return progress values that make sense for each status', async () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response: AxiosResponse = await client.get(`/content/${submissionId}/status`);

      expect(response.status).toBe(200);
      
      const responseData = response.data;
      
      switch (responseData.status) {
        case 'pending':
          expect(responseData.progress).toBe(0);
          break;
        case 'processing':
          expect(responseData.progress).toBeGreaterThan(0);
          expect(responseData.progress).toBeLessThan(100);
          break;
        case 'completed':
          expect(responseData.progress).toBe(100);
          break;
        case 'failed':
          expect(responseData.progress).toBe(0);
          break;
      }
    });
  });
});

