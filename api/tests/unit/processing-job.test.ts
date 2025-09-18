import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProcessingJob } from '../../src/models/processing-job';

describe('ProcessingJob Model', () => {
  let job: ProcessingJob;

  beforeEach(() => {
    job = new ProcessingJob({
      submission_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'queued',
      progress: 0,
      retry_count: 0,
      max_retries: 3
    });
  });

  describe('Constructor and Basic Properties', () => {
    it('should create a ProcessingJob with valid data', () => {
      expect(job.id).toBeDefined();
      expect(job.submission_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
      expect(job.retry_count).toBe(0);
      expect(job.max_retries).toBe(3);
      expect(job.created_at).toBeInstanceOf(Date);
    });

    it('should generate a valid UUID for id', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(job.id).toMatch(uuidRegex);
    });

    it('should set default values correctly', () => {
      expect(job.started_at).toBeUndefined();
      expect(job.completed_at).toBeUndefined();
      expect(job.error_message).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should validate required fields', () => {
      expect(() => new ProcessingJob({
        submission_id: '',
        status: 'queued',
        progress: 0,
        retry_count: 0,
        max_retries: 3
      })).toThrow('Submission ID is required');

      expect(() => new ProcessingJob({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid-status' as any,
        progress: 0,
        retry_count: 0,
        max_retries: 3
      })).toThrow('Invalid status');
    });

    it('should validate submission ID format', () => {
      expect(() => new ProcessingJob({
        submission_id: '',
        status: 'queued',
        progress: 0,
        retry_count: 0,
        max_retries: 3
      })).toThrow('Submission ID is required');
    });

    it('should validate progress range', () => {
      expect(() => new ProcessingJob({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'queued',
        progress: -1,
        retry_count: 0,
        max_retries: 3
      })).toThrow('Progress must be between 0 and 100');

      expect(() => new ProcessingJob({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'queued',
        progress: 101,
        retry_count: 0,
        max_retries: 3
      })).toThrow('Progress must be between 0 and 100');
    });

    it('should validate retry count', () => {
      expect(() => new ProcessingJob({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'queued',
        progress: 0,
        retry_count: -1,
        max_retries: 3
      })).toThrow('Retry count cannot be negative');
    });

    it('should validate max retries', () => {
      expect(() => new ProcessingJob({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'queued',
        progress: 0,
        retry_count: 0,
        max_retries: -1
      })).toThrow('Max retries cannot be negative');
    });
  });

  describe('State Management', () => {
    it('should start processing', () => {
      const started = job.start();
      
      expect(started.status).toBe('running');
      expect(started.started_at).toBeInstanceOf(Date);
      expect(started).not.toBe(job);
    });

    it('should update progress', () => {
      const started = job.start();
      const updated = started.updateProgress(50);
      
      expect(updated.progress).toBe(50);
      expect(updated).not.toBe(started);
    });

    it('should validate progress updates', () => {
      const started = job.start();
      expect(() => started.updateProgress(-1)).toThrow('Progress must be between 0 and 100');
      expect(() => started.updateProgress(101)).toThrow('Progress must be between 0 and 100');
    });

    it('should complete processing', () => {
      const started = job.start();
      const completed = started.complete();
      
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeInstanceOf(Date);
      expect(completed.progress).toBe(100);
    });

    it('should fail processing', () => {
      const started = job.start();
      const errorMessage = 'Processing failed';
      const failed = started.fail(errorMessage);
      
      expect(failed.status).toBe('failed');
      expect(failed.error_message).toBe(errorMessage);
      expect(failed.completed_at).toBeInstanceOf(Date);
    });

    it('should retry processing', () => {
      const started = job.start();
      const failed = started.fail('Processing failed');
      const retried = failed.retry();
      
      expect(retried.status).toBe('queued');
      expect(retried.retry_count).toBe(1);
      expect(retried.error_message).toBeUndefined();
      expect(retried.started_at).toBeUndefined();
      expect(retried.completed_at).toBeUndefined();
    });
  });

  describe('Retry Logic', () => {
    it('should check if retry is possible', () => {
      expect(job.canRetry()).toBe(false); // queued status cannot retry
      
      const started = job.start();
      const failed = started.fail('Processing failed');
      expect(failed.canRetry()).toBe(true);
      
      const retried = failed.retry();
      const startedAgain = retried.start();
      const failedAgain = startedAgain.fail('Processing failed again');
      const retriedAgain = failedAgain.retry();
      const startedThird = retriedAgain.start();
      const failedThird = startedThird.fail('Processing failed third time');
      const retriedThird = failedThird.retry();
      const startedFourth = retriedThird.start();
      const failedFourth = startedFourth.fail('Processing failed fourth time');
      
      expect(failedFourth.canRetry()).toBe(false);
    });

    it('should calculate remaining retries', () => {
      expect(job.getRemainingRetries()).toBe(3);
      
      const started = job.start();
      const failed = started.fail('Processing failed');
      const retried = failed.retry();
      expect(retried.getRemainingRetries()).toBe(2);
      
      const startedAgain = retried.start();
      const failedAgain = startedAgain.fail('Processing failed again');
      const retriedAgain = failedAgain.retry();
      expect(retriedAgain.getRemainingRetries()).toBe(1);
      
      const startedThird = retriedAgain.start();
      const failedThird = startedThird.fail('Processing failed third time');
      const retriedThird = failedThird.retry();
      expect(retriedThird.getRemainingRetries()).toBe(0);
    });

    it('should check if retry limit exceeded', () => {
      expect(job.hasExceededRetryLimit()).toBe(false);
      
      const started = job.start();
      const failed = started.fail('Processing failed');
      const retried = failed.retry();
      const startedAgain = retried.start();
      const failedAgain = startedAgain.fail('Processing failed again');
      const retriedAgain = failedAgain.retry();
      const startedThird = retriedAgain.start();
      const failedThird = startedThird.fail('Processing failed third time');
      const retriedThird = failedThird.retry();
      const startedFourth = retriedThird.start();
      const failedFourth = startedFourth.fail('Processing failed fourth time');
      
      expect(failedFourth.hasExceededRetryLimit()).toBe(true);
    });
  });

  describe('Status Checks', () => {
    it('should check if status is terminal', () => {
      expect(job.isTerminal()).toBe(false);
      
      const started = job.start();
      const completed = started.complete();
      expect(completed.isTerminal()).toBe(true);
      
      const started2 = job.start();
      const failed = started2.fail('Processing failed');
      expect(failed.isTerminal()).toBe(true);
    });

    it('should check if status is running', () => {
      expect(job.isRunning()).toBe(false);
      
      const started = job.start();
      expect(started.isRunning()).toBe(true);
    });

    it('should check if status is failed', () => {
      expect(job.hasFailed()).toBe(false);
      
      const started = job.start();
      const failed = started.fail('Processing failed');
      expect(failed.hasFailed()).toBe(true);
    });

    it('should check if status is completed', () => {
      expect(job.hasCompleted()).toBe(false);
      
      const started = job.start();
      const completed = started.complete();
      expect(completed.hasCompleted()).toBe(true);
    });
  });

  describe('Duration Calculations', () => {
    it('should calculate processing duration', () => {
      const started = job.start();
      
      // Wait a small amount to ensure duration > 0
      setTimeout(() => {
        const completed = started.complete();
        const duration = completed.getProcessingDuration();
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });

    it('should calculate job age', () => {
      const age = job.getAge();
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should check if job is stale', () => {
      expect(job.isStale()).toBe(false);
      
      // Create a job that's older than 24 hours
      const oldJob = new ProcessingJob({
        submission_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'running',
        progress: 50,
        retry_count: 0,
        max_retries: 3,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        started_at: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      });
      
      expect(oldJob.isStale()).toBe(true);
    });
  });

  describe('Summary and Display', () => {
    it('should generate job summary', () => {
      const summary = job.getSummary();
      
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('submission_id');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('progress');
      expect(summary).toHaveProperty('retry_count');
      expect(summary).toHaveProperty('max_retries');
    });

    it('should get status display', () => {
      expect(job.getStatusDisplay()).toBe('Queued');
      
      const started = job.start();
      expect(started.getStatusDisplay()).toBe('Running (0%)');
      
      const completed = started.complete();
      expect(completed.getStatusDisplay()).toBe('Completed');
      
      const started2 = job.start();
      const failed = started2.fail('Processing failed');
      expect(failed.getStatusDisplay()).toBe('Failed (0/3 retries)');
    });
  });

  describe('Static Factory Methods', () => {
    it('should create job for submission', () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const newJob = ProcessingJob.createForSubmission(submissionId);
      
      expect(newJob.submission_id).toBe(submissionId);
      expect(newJob.status).toBe('queued');
      expect(newJob.progress).toBe(0);
      expect(newJob.retry_count).toBe(0);
      expect(newJob.max_retries).toBe(3);
    });

    it('should create job with custom max retries', () => {
      const submissionId = '123e4567-e89b-12d3-a456-426614174000';
      const newJob = ProcessingJob.createForSubmission(submissionId, 5);
      
      expect(newJob.max_retries).toBe(5);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const json = job.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('submission_id');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('progress');
      expect(json).toHaveProperty('retry_count');
      expect(json).toHaveProperty('max_retries');
      expect(json).toHaveProperty('created_at');
    });

    it('should deserialize from JSON correctly', () => {
      const json = job.toJSON();
      const deserialized = ProcessingJob.fromJSON(json);
      
      expect(deserialized.id).toBe(job.id);
      expect(deserialized.submission_id).toBe(job.submission_id);
      expect(deserialized.status).toBe(job.status);
      expect(deserialized.progress).toBe(job.progress);
      expect(deserialized.retry_count).toBe(job.retry_count);
      expect(deserialized.max_retries).toBe(job.max_retries);
    });
  });

  describe('Error Handling', () => {
    it('should handle error messages', () => {
      const started = job.start();
      const errorMessage = 'Processing failed due to network error';
      const failed = started.fail(errorMessage);
      
      expect(failed.status).toBe('failed');
      expect(failed.error_message).toBe(errorMessage);
    });

    it('should clear error message on retry', () => {
      const started = job.start();
      const failed = started.fail('Processing failed');
      const retried = failed.retry();
      
      expect(retried.error_message).toBeUndefined();
    });
  });
});
