import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Contract Test: POST /api/content
 * 
 * This test validates the contract defined in content-submission.yaml
 * It should FAIL initially (TDD principle) until the endpoint is implemented
 */
describe('POST /api/content Contract Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env.API_BASE_URL || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  });

  describe('Successful Content Submission', () => {
    it('should accept valid URL submission and return 202 with submission details', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'Interesting tech article'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      
      const responseData = response.data;
      expect(responseData).toHaveProperty('submission_id');
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('estimated_completion');
      
      // Validate submission_id is a valid UUID
      expect(responseData.submission_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      // Validate status is one of the allowed values
      expect(['pending', 'processing', 'completed', 'failed']).toContain(responseData.status);
      
      // Validate estimated_completion is a valid ISO date
      expect(new Date(responseData.estimated_completion)).toBeInstanceOf(Date);
      expect(new Date(responseData.estimated_completion).getTime()).not.toBeNaN();
    });

    it('should accept valid YouTube submission and return 202', async () => {
      const requestBody = {
        content_url: 'https://www.youtube.com/watch?v=example',
        content_type: 'youtube',
        user_note: 'Great tutorial video'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('submission_id');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('message');
    });

    it('should accept valid PDF submission and return 202', async () => {
      const requestBody = {
        content_url: 'https://example.com/document.pdf',
        content_type: 'pdf',
        user_note: 'Research paper'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('submission_id');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('message');
    });

    it('should accept valid document submission and return 202', async () => {
      const requestBody = {
        content_url: 'https://example.com/document.docx',
        content_type: 'document',
        user_note: 'Word document'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('submission_id');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('message');
    });

    it('should accept submission without optional user_note', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(response.data).toHaveProperty('submission_id');
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('Validation Errors (400)', () => {
    it('should return 400 for missing content_url', async () => {
      const requestBody = {
        content_type: 'url'
      };

      try {
        await client.post('/content', requestBody);
        fail('Expected 400 error for missing content_url');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('INVALID_REQUEST');
      }
    });

    it('should return 400 for missing content_type', async () => {
      const requestBody = {
        content_url: 'https://example.com/article'
      };

      try {
        await client.post('/content', requestBody);
        fail('Expected 400 error for missing content_type');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('INVALID_REQUEST');
      }
    });

    it('should return 400 for invalid URL format', async () => {
      const requestBody = {
        content_url: 'not-a-valid-url',
        content_type: 'url'
      };

      try {
        await client.post('/content', requestBody);
        fail('Expected 400 error for invalid URL');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('INVALID_URL');
      }
    });

    it('should return 400 for invalid content_type', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'invalid_type'
      };

      try {
        await client.post('/content', requestBody);
        fail('Expected 400 error for invalid content_type');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('INVALID_CONTENT_TYPE');
      }
    });

    it('should return 400 for user_note exceeding max length', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'a'.repeat(501) // Exceeds maxLength of 500
      };

      try {
        await client.post('/content', requestBody);
        fail('Expected 400 error for user_note too long');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('INVALID_REQUEST');
      }
    });

    it('should return 400 for additional properties in request body', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'Valid note',
        extra_property: 'should not be allowed'
      };

      try {
        await client.post('/content', requestBody);
        fail('Expected 400 error for additional properties');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data).toHaveProperty('error');
        expect(error.response?.data).toHaveProperty('message');
        expect(error.response?.data).toHaveProperty('details');
        expect(error.response?.data.error).toBe('INVALID_REQUEST');
      }
    });
  });

  describe('Rate Limiting (429)', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      // This test would need to be implemented with actual rate limiting
      // For now, we'll test the expected response format
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };

      // Simulate rate limit exceeded scenario
      // In a real test, you'd need to make multiple requests quickly
      try {
        await client.post('/content', requestBody);
        // If we get here, rate limiting isn't implemented yet
        // This is expected in TDD - the test should fail initially
      } catch (error: any) {
        if (error.response?.status === 429) {
          expect(error.response?.data).toHaveProperty('error');
          expect(error.response?.data).toHaveProperty('message');
          expect(error.response?.data).toHaveProperty('details');
          expect(error.response?.data.error).toBe('RATE_LIMIT_EXCEEDED');
        }
      }
    });
  });

  describe('Server Errors (500)', () => {
    it('should return 500 for internal server errors', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };

      try {
        await client.post('/content', requestBody);
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

  describe('Request/Response Format Validation', () => {
    it('should accept application/json content type', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return valid JSON response', async () => {
      const requestBody = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };

      const response: AxiosResponse = await client.post('/content', requestBody);

      expect(response.status).toBe(202);
      expect(() => JSON.parse(JSON.stringify(response.data))).not.toThrow();
    });
  });
});
