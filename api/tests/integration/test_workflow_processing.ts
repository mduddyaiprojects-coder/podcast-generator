import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: n8n Workflow Processing
 * 
 * This test validates the n8n workflow processing integration including
 * content processing workflows, YouTube extraction, document processing,
 * TTS generation, and error handling workflows. It should FAIL initially
 * (TDD principle) until the n8n workflow integration is implemented.
 */
describe('n8n Workflow Processing Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';
  const n8nBaseURL = process.env['N8N_BASE_URL'] || 'http://localhost:5678';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 60000, // Longer timeout for workflow processing
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  });

  describe('Content Processing Workflow', () => {
    it('should trigger content processing workflow for URL content', async () => {
      // Submit content that should trigger n8n workflow
      const submissionRequest = {
        content_url: 'https://example.com/workflow-test-article',
        content_type: 'url',
        user_note: 'Test article for n8n workflow processing',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      expect(submissionResponse.data).toHaveProperty('submission_id');
      expect(submissionResponse.data).toHaveProperty('status');
      expect(submissionResponse.data).toHaveProperty('message');
      
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing to complete
      let finalStatus = null;
      const maxWaitTime = 120000; // 2 minutes for workflow processing
      const checkInterval = 5000; // 5 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify workflow processing completed
      expect(finalStatus).not.toBeNull();
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus).toHaveProperty('episode_id');
      expect(finalStatus).toHaveProperty('rss_feed_url');
      expect(finalStatus).toHaveProperty('workflow_execution_id');
    }, 180000); // 3 minute timeout

    it('should handle workflow processing errors gracefully', async () => {
      // Submit content that will likely cause workflow errors
      const submissionRequest = {
        content_url: 'https://invalid-workflow-test-url.com',
        content_type: 'url',
        user_note: 'Test article that should cause workflow errors',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing to complete or fail
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify error handling
      if (finalStatus && finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus.error_message).toBeDefined();
        expect(finalStatus.error_message.length).toBeGreaterThan(0);
      }
    }, 180000);
  });

  describe('YouTube Extraction Workflow', () => {
    it('should process YouTube content through extraction workflow', async () => {
      const submissionRequest = {
        content_url: 'https://www.youtube.com/watch?v=workflow-test-video',
        content_type: 'youtube',
        user_note: 'Test YouTube video for extraction workflow',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for YouTube extraction workflow to complete
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify YouTube extraction workflow completed
      expect(finalStatus).not.toBeNull();
      if (finalStatus.status === 'completed') {
        expect(finalStatus).toHaveProperty('episode_id');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus).toHaveProperty('extracted_content');
        expect(finalStatus.extracted_content).toHaveProperty('title');
        expect(finalStatus.extracted_content).toHaveProperty('description');
        expect(finalStatus.extracted_content).toHaveProperty('duration');
      }
    }, 180000);

    it('should handle YouTube extraction workflow errors', async () => {
      const submissionRequest = {
        content_url: 'https://www.youtube.com/watch?v=invalid-video-id',
        content_type: 'youtube',
        user_note: 'Test invalid YouTube video for error handling',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify error handling
      if (finalStatus && finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus.error_message).toContain('YouTube');
      }
    }, 180000);
  });

  describe('Document Processing Workflow', () => {
    it('should process PDF documents through document workflow', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/workflow-test-document.pdf',
        content_type: 'pdf',
        user_note: 'Test PDF document for processing workflow',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for document processing workflow to complete
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify document processing workflow completed
      expect(finalStatus).not.toBeNull();
      if (finalStatus.status === 'completed') {
        expect(finalStatus).toHaveProperty('episode_id');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus).toHaveProperty('extracted_content');
        expect(finalStatus.extracted_content).toHaveProperty('text_content');
        expect(finalStatus.extracted_content).toHaveProperty('page_count');
      }
    }, 180000);

    it('should handle document processing workflow errors', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/invalid-document.xyz',
        content_type: 'pdf',
        user_note: 'Test invalid document for error handling',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify error handling
      if (finalStatus && finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus.error_message).toContain('document');
      }
    }, 180000);
  });

  describe('TTS Generation Workflow', () => {
    it('should process content through TTS generation workflow', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/tts-workflow-test',
        content_type: 'url',
        user_note: 'Test content for TTS generation workflow',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for TTS generation workflow to complete
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify TTS generation workflow completed
      expect(finalStatus).not.toBeNull();
      if (finalStatus.status === 'completed') {
        expect(finalStatus).toHaveProperty('episode_id');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus).toHaveProperty('audio_url');
        expect(finalStatus).toHaveProperty('audio_duration');
        expect(finalStatus.audio_url).toMatch(/^https?:\/\/.+/);
        expect(finalStatus.audio_duration).toBeGreaterThan(0);
      }
    }, 180000);

    it('should handle TTS generation workflow errors', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/tts-error-test',
        content_type: 'url',
        user_note: 'Test content that should cause TTS errors',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify error handling
      if (finalStatus && finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus.error_message).toContain('TTS');
      }
    }, 180000);
  });

  describe('Error Handling Workflow', () => {
    it('should trigger error handling workflow for failed processing', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/error-handling-test',
        content_type: 'url',
        user_note: 'Test content for error handling workflow',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for processing (may succeed or fail)
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify error handling workflow was triggered if needed
      expect(finalStatus).not.toBeNull();
      expect(finalStatus).toHaveProperty('workflow_execution_id');
      
      if (finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus).toHaveProperty('error_handling_workflow_id');
      }
    }, 180000);

    it('should handle workflow execution failures gracefully', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/workflow-failure-test',
        content_type: 'url',
        user_note: 'Test content that should cause workflow failure',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing
      let finalStatus = null;
      const maxWaitTime = 120000;
      const checkInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'failed') {
          finalStatus = statusResponse.data;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Verify graceful failure handling
      expect(finalStatus).not.toBeNull();
      expect(['completed', 'failed']).toContain(finalStatus.status);
      
      if (finalStatus.status === 'failed') {
        expect(finalStatus).toHaveProperty('error_message');
        expect(finalStatus).toHaveProperty('workflow_execution_id');
        expect(finalStatus.error_message).toBeDefined();
        expect(finalStatus.error_message.length).toBeGreaterThan(0);
      }
    }, 180000);
  });

  describe('Workflow Monitoring and Status', () => {
    it('should provide workflow execution status', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/workflow-status-test',
        content_type: 'url',
        user_note: 'Test content for workflow status monitoring',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Check status during processing
      const statusResponse: AxiosResponse = await client.get(`/content/${submissionId}/status`);
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data).toHaveProperty('submission_id');
      expect(statusResponse.data).toHaveProperty('status');
      expect(statusResponse.data).toHaveProperty('progress');
      expect(statusResponse.data).toHaveProperty('workflow_execution_id');
      
      // Verify workflow execution ID format
      expect(statusResponse.data.workflow_execution_id).toMatch(/^[a-f0-9-]+$/);
    });

    it('should handle workflow timeout scenarios', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/workflow-timeout-test',
        content_type: 'url',
        user_note: 'Test content for workflow timeout handling',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Wait for workflow processing with shorter timeout
      let finalStatus = null;
      const maxWaitTime = 30000; // 30 seconds
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

      // Verify timeout handling
      if (finalStatus) {
        expect(['completed', 'failed']).toContain(finalStatus.status);
        expect(finalStatus).toHaveProperty('workflow_execution_id');
      }
    }, 60000);
  });

  describe('Workflow Performance and Reliability', () => {
    it('should handle concurrent workflow processing', async () => {
      const concurrentSubmissions = Array.from({ length: 3 }, (_, i) => ({
        content_url: `https://example.com/concurrent-workflow-${i}`,
        content_type: 'url',
        user_note: `Concurrent workflow test ${i}`,
        source: 'api_test'
      }));

      // Submit all content concurrently
      const submissionPromises = concurrentSubmissions.map(submission => 
        client.post('/content', submission)
      );

      const submissionResponses = await Promise.all(submissionPromises);

      // All should be accepted
      submissionResponses.forEach(response => {
        expect(response.status).toBe(202);
        expect(response.data).toHaveProperty('submission_id');
      });

      const submissionIds = submissionResponses.map(response => response.data.submission_id);

      // Wait for all workflows to complete
      const workflowPromises = submissionIds.map(async (submissionId) => {
        let finalStatus = null;
        const maxWaitTime = 120000;
        const checkInterval = 5000;
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

      const finalStatuses = await Promise.all(workflowPromises);

      // Verify at least some workflows completed successfully
      const completedWorkflows = finalStatuses.filter(status => status && status.status === 'completed');
      expect(completedWorkflows.length).toBeGreaterThan(0);
    }, 300000); // 5 minute timeout for concurrent workflows

    it('should maintain workflow data consistency', async () => {
      const submissionRequest = {
        content_url: 'https://example.com/workflow-consistency-test',
        content_type: 'url',
        user_note: 'Test content for workflow consistency',
        source: 'api_test'
      };

      const submissionResponse: AxiosResponse = await client.post('/content', submissionRequest);
      
      expect(submissionResponse.status).toBe(202);
      const submissionId = submissionResponse.data.submission_id;

      // Make concurrent status checks
      const concurrentChecks = Array.from({ length: 5 }, () => 
        client.get(`/content/${submissionId}/status`)
      );

      const statusResponses = await Promise.all(concurrentChecks);

      // All responses should be consistent
      statusResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.submission_id).toBe(submissionId);
        expect(['pending', 'processing', 'completed', 'failed']).toContain(response.data.status);
        expect(response.data).toHaveProperty('workflow_execution_id');
      });
    });
  });
});
