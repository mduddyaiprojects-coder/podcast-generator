import { ProcessingJob, ProcessingJobData, JobStatus } from '../../src/models/processing-job';

// Mock timers to control Date.now() for testing
jest.useFakeTimers();

describe('ProcessingJob', () => {
  const validJobData: ProcessingJobData = {
    submission_id: 'sub-123'
  };

  const fullJobData: ProcessingJobData = {
    id: 'job-123',
    submission_id: 'sub-456',
    status: 'running',
    progress: 50,
    current_step: 'Generating audio',
    error_message: undefined,
    retry_count: 1,
    max_retries: 3,
    started_at: new Date('2023-01-01T10:00:00Z'),
    completed_at: undefined,
    created_at: new Date('2023-01-01T09:00:00Z'),
    updated_at: new Date('2023-01-01T10:30:00Z')
  };

  describe('constructor', () => {
    it('should create job with minimal required data', () => {
      const job = new ProcessingJob(validJobData);

      expect(job.submission_id).toBe('sub-123');
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
      expect(job.retry_count).toBe(0);
      expect(job.max_retries).toBe(3);
      expect(job.id).toBeDefined();
      expect(job.created_at).toBeInstanceOf(Date);
      expect(job.updated_at).toBeInstanceOf(Date);
    });

    it('should create job with all optional data', () => {
      const job = new ProcessingJob(fullJobData);

      expect(job.id).toBe('job-123');
      expect(job.submission_id).toBe('sub-456');
      expect(job.status).toBe('running');
      expect(job.progress).toBe(50);
      expect(job.current_step).toBe('Generating audio');
      expect(job.retry_count).toBe(1);
      expect(job.max_retries).toBe(3);
      expect(job.started_at).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should generate UUID when no ID provided', () => {
      const job = new ProcessingJob(validJobData);
      expect(job.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should set default values when not provided', () => {
      const job = new ProcessingJob(validJobData);
      const now = new Date();
      
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
      expect(job.retry_count).toBe(0);
      expect(job.max_retries).toBe(3);
      expect(job.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(job.updated_at.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  describe('validation', () => {
    it('should throw error for empty submission_id', () => {
      expect(() => new ProcessingJob({ ...validJobData, submission_id: '' }))
        .toThrow('Submission ID is required');
    });

    it('should throw error for whitespace-only submission_id', () => {
      expect(() => new ProcessingJob({ ...validJobData, submission_id: '   ' }))
        .toThrow('Submission ID is required');
    });

    it('should throw error for invalid status', () => {
      expect(() => new ProcessingJob({ ...validJobData, status: 'invalid' as JobStatus }))
        .toThrow('Invalid status: invalid. Must be one of: queued, running, completed, failed');
    });

    it('should throw error for progress less than 0', () => {
      expect(() => new ProcessingJob({ ...validJobData, progress: -1 }))
        .toThrow('Progress must be between 0 and 100');
    });

    it('should throw error for progress greater than 100', () => {
      expect(() => new ProcessingJob({ ...validJobData, progress: 101 }))
        .toThrow('Progress must be between 0 and 100');
    });

    it('should throw error for negative retry_count', () => {
      expect(() => new ProcessingJob({ ...validJobData, retry_count: -1 }))
        .toThrow('Retry count cannot be negative');
    });

    it('should throw error for negative max_retries', () => {
      expect(() => new ProcessingJob({ ...validJobData, max_retries: -1 }))
        .toThrow('Max retries cannot be negative');
    });

    it('should throw error when retry_count exceeds max_retries', () => {
      expect(() => new ProcessingJob({ 
        ...validJobData, 
        retry_count: 5, 
        max_retries: 3 
      })).toThrow('Retry count cannot exceed max retries');
    });

    it('should throw error for running status without started_at', () => {
      expect(() => new ProcessingJob({ 
        ...validJobData, 
        status: 'running'
      })).toThrow('Started timestamp is required when status is "running"');
    });

    it('should throw error for completed status without completed_at', () => {
      expect(() => new ProcessingJob({ 
        ...validJobData, 
        status: 'completed'
      })).toThrow('Completed timestamp is required when status is "completed" or "failed"');
    });

    it('should throw error for failed status without completed_at', () => {
      expect(() => new ProcessingJob({ 
        ...validJobData, 
        status: 'failed',
        error_message: 'Test error'
      })).toThrow('Completed timestamp is required when status is "completed" or "failed"');
    });

    it('should throw error for failed status without error message', () => {
      expect(() => new ProcessingJob({ 
        ...validJobData, 
        status: 'failed',
        completed_at: new Date()
      })).toThrow('Error message is required when status is "failed"');
    });

    it('should throw error when started_at is after completed_at', () => {
      const started = new Date('2023-01-01T10:00:00Z');
      const completed = new Date('2023-01-01T09:00:00Z');
      
      expect(() => new ProcessingJob({ 
        ...validJobData, 
        started_at: started,
        completed_at: completed
      })).toThrow('Started timestamp cannot be after completed timestamp');
    });

    it('should accept valid statuses', () => {
      const validStatuses: JobStatus[] = ['queued', 'running', 'completed', 'failed'];
      
      validStatuses.forEach(status => {
        const data: ProcessingJobData = {
          ...validJobData,
          status,
          ...(status === 'running' ? { started_at: new Date() } : {}),
          ...(status === 'completed' || status === 'failed' ? { 
            completed_at: new Date(),
            ...(status === 'failed' ? { error_message: 'Test error' } : {})
          } : {})
        };
        
        expect(() => new ProcessingJob(data)).not.toThrow();
      });
    });
  });

  describe('job lifecycle methods', () => {
    let job: ProcessingJob;

    beforeEach(() => {
      job = new ProcessingJob(validJobData);
      jest.advanceTimersByTime(1);
    });

    describe('start', () => {
      it('should start a queued job', () => {
        const started = job.start();

        expect(started.status).toBe('running');
        expect(started.started_at).toBeDefined();
        expect(started.updated_at).not.toEqual(job.updated_at);
        expect(started.id).toBe(job.id);
      });

      it('should throw error when starting non-queued job', () => {
        const runningJob = new ProcessingJob({
          ...validJobData,
          status: 'running',
          started_at: new Date()
        });

        expect(() => runningJob.start())
          .toThrow('Cannot start job with status: running');
      });
    });

    describe('updateProgress', () => {
      let runningJob: ProcessingJob;

      beforeEach(() => {
        runningJob = job.start();
        jest.advanceTimersByTime(1);
      });

      it('should update progress for running job', () => {
        const updated = runningJob.updateProgress(75, 'Almost done');

        expect(updated.progress).toBe(75);
        expect(updated.current_step).toBe('Almost done');
        expect(updated.updated_at).not.toEqual(runningJob.updated_at);
        expect(updated.id).toBe(runningJob.id);
      });

      it('should update progress without changing current step', () => {
        const updated = runningJob.updateProgress(50);

        expect(updated.progress).toBe(50);
        expect(updated.current_step).toBe(runningJob.current_step);
      });

      it('should throw error for invalid progress', () => {
        expect(() => runningJob.updateProgress(-1))
          .toThrow('Progress must be between 0 and 100');

        expect(() => runningJob.updateProgress(101))
          .toThrow('Progress must be between 0 and 100');
      });

      it('should throw error when updating non-running job', () => {
        expect(() => job.updateProgress(50))
          .toThrow('Cannot update progress for job with status: queued');
      });
    });

    describe('complete', () => {
      let runningJob: ProcessingJob;

      beforeEach(() => {
        runningJob = job.start();
        jest.advanceTimersByTime(1);
      });

      it('should complete a running job', () => {
        const completed = runningJob.complete();

        expect(completed.status).toBe('completed');
        expect(completed.progress).toBe(100);
        expect(completed.completed_at).toBeDefined();
        expect(completed.updated_at).not.toEqual(runningJob.updated_at);
        expect(completed.id).toBe(runningJob.id);
      });

      it('should throw error when completing non-running job', () => {
        expect(() => job.complete())
          .toThrow('Cannot complete job with status: queued');
      });
    });

    describe('fail', () => {
      let runningJob: ProcessingJob;

      beforeEach(() => {
        runningJob = job.start();
        jest.advanceTimersByTime(1);
      });

      it('should fail a running job', () => {
        const failed = runningJob.fail('Test error message');

        expect(failed.status).toBe('failed');
        expect(failed.error_message).toBe('Test error message');
        expect(failed.completed_at).toBeDefined();
        expect(failed.updated_at).not.toEqual(runningJob.updated_at);
        expect(failed.id).toBe(runningJob.id);
      });

      it('should throw error when failing non-running job', () => {
        expect(() => job.fail('Test error'))
          .toThrow('Cannot fail job with status: queued');
      });
    });

    describe('retry', () => {
      let failedJob: ProcessingJob;

      beforeEach(() => {
        failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date(),
          retry_count: 1,
          max_retries: 3
        });
        jest.advanceTimersByTime(1);
      });

      it('should retry a failed job', () => {
        const retried = failedJob.retry();

        expect(retried.status).toBe('queued');
        expect(retried.progress).toBe(0);
        expect(retried.current_step).toBeUndefined();
        expect(retried.error_message).toBeUndefined();
        expect(retried.retry_count).toBe(2);
        expect(retried.started_at).toBeUndefined();
        expect(retried.completed_at).toBeUndefined();
        expect(retried.updated_at).not.toEqual(failedJob.updated_at);
        expect(retried.id).toBe(failedJob.id);
      });

      it('should throw error when retrying non-failed job', () => {
        expect(() => job.retry())
          .toThrow('Cannot retry job with status: queued');
      });

      it('should throw error when max retries exceeded', () => {
        const maxRetriesJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date(),
          retry_count: 3,
          max_retries: 3
        });

        expect(() => maxRetriesJob.retry())
          .toThrow('Maximum retry attempts exceeded');
      });
    });
  });

  describe('utility methods', () => {
    let job: ProcessingJob;

    beforeEach(() => {
      job = new ProcessingJob(fullJobData);
    });

    describe('canRetry', () => {
      it('should return true for failed job with retries remaining', () => {
        const failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date(),
          retry_count: 1,
          max_retries: 3
        });

        expect(failedJob.canRetry()).toBe(true);
      });

      it('should return false for failed job with no retries remaining', () => {
        const failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date(),
          retry_count: 3,
          max_retries: 3
        });

        expect(failedJob.canRetry()).toBe(false);
      });

      it('should return false for non-failed job', () => {
        expect(job.canRetry()).toBe(false);
      });
    });

    describe('isTerminal', () => {
      it('should return true for completed job', () => {
        const completedJob = new ProcessingJob({
          ...validJobData,
          status: 'completed',
          completed_at: new Date()
        });

        expect(completedJob.isTerminal()).toBe(true);
      });

      it('should return true for failed job', () => {
        const failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date()
        });

        expect(failedJob.isTerminal()).toBe(true);
      });

      it('should return false for non-terminal jobs', () => {
        const queuedJob = new ProcessingJob(validJobData);
        expect(queuedJob.isTerminal()).toBe(false);
        expect(job.isTerminal()).toBe(false);
      });
    });

    describe('isRunning', () => {
      it('should return true for running job', () => {
        expect(job.isRunning()).toBe(true);
      });

      it('should return false for non-running jobs', () => {
        const queuedJob = new ProcessingJob(validJobData);
        expect(queuedJob.isRunning()).toBe(false);
      });
    });

    describe('isQueued', () => {
      it('should return true for queued job', () => {
        const queuedJob = new ProcessingJob(validJobData);
        expect(queuedJob.isQueued()).toBe(true);
      });

      it('should return false for non-queued jobs', () => {
        expect(job.isQueued()).toBe(false);
      });
    });

    describe('hasFailed', () => {
      it('should return true for failed job', () => {
        const failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date()
        });

        expect(failedJob.hasFailed()).toBe(true);
      });

      it('should return false for non-failed jobs', () => {
        expect(job.hasFailed()).toBe(false);
      });
    });

    describe('hasCompleted', () => {
      it('should return true for completed job', () => {
        const completedJob = new ProcessingJob({
          ...validJobData,
          status: 'completed',
          completed_at: new Date()
        });

        expect(completedJob.hasCompleted()).toBe(true);
      });

      it('should return false for non-completed jobs', () => {
        expect(job.hasCompleted()).toBe(false);
      });
    });

    describe('getProcessingDuration', () => {
      it('should return processing duration in milliseconds', () => {
        const started = new Date('2023-01-01T10:00:00Z');
        const completed = new Date('2023-01-01T10:05:00Z');
        
        const completedJob = new ProcessingJob({
          ...validJobData,
          status: 'completed',
          started_at: started,
          completed_at: completed
        });

        expect(completedJob.getProcessingDuration()).toBe(300000); // 5 minutes
      });

      it('should return current duration for running job', () => {
        const started = new Date();
        started.setMinutes(started.getMinutes() - 5);
        
        const runningJob = new ProcessingJob({
          ...validJobData,
          status: 'running',
          started_at: started
        });

        const duration = runningJob.getProcessingDuration();
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(600000); // Less than 10 minutes
      });

      it('should return undefined when not started', () => {
        const queuedJob = new ProcessingJob(validJobData);
        expect(queuedJob.getProcessingDuration()).toBeUndefined();
      });
    });

    describe('getProcessingDurationSeconds', () => {
      it('should return processing duration in seconds', () => {
        const started = new Date('2023-01-01T10:00:00Z');
        const completed = new Date('2023-01-01T10:05:30Z');
        
        const completedJob = new ProcessingJob({
          ...validJobData,
          status: 'completed',
          started_at: started,
          completed_at: completed
        });

        expect(completedJob.getProcessingDurationSeconds()).toBe(330); // 5.5 minutes = 330 seconds
      });
    });

    describe('getProcessingDurationMinutes', () => {
      it('should return processing duration in minutes', () => {
        const started = new Date('2023-01-01T10:00:00Z');
        const completed = new Date('2023-01-01T10:07:30Z');
        
        const completedJob = new ProcessingJob({
          ...validJobData,
          status: 'completed',
          started_at: started,
          completed_at: completed
        });

        expect(completedJob.getProcessingDurationMinutes()).toBe(7); // 7.5 minutes = 7 minutes
      });
    });

    describe('getRemainingRetries', () => {
      it('should return remaining retry attempts', () => {
        const jobWithRetries = new ProcessingJob({
          ...validJobData,
          retry_count: 1,
          max_retries: 3
        });

        expect(jobWithRetries.getRemainingRetries()).toBe(2);
      });

      it('should return 0 when no retries remaining', () => {
        const jobWithNoRetries = new ProcessingJob({
          ...validJobData,
          retry_count: 3,
          max_retries: 3
        });

        expect(jobWithNoRetries.getRemainingRetries()).toBe(0);
      });
    });

    describe('getRetryPercentage', () => {
      it('should return retry percentage', () => {
        const jobWithRetries = new ProcessingJob({
          ...validJobData,
          retry_count: 2,
          max_retries: 4
        });

        expect(jobWithRetries.getRetryPercentage()).toBe(50);
      });
    });

    describe('hasExceededRetryLimit', () => {
      it('should return true when retry limit exceeded', () => {
        const jobWithMaxRetries = new ProcessingJob({
          ...validJobData,
          retry_count: 3,
          max_retries: 3
        });

        expect(jobWithMaxRetries.hasExceededRetryLimit()).toBe(true);
      });

      it('should return false when retry limit not exceeded', () => {
        const jobWithRetries = new ProcessingJob({
          ...validJobData,
          retry_count: 2,
          max_retries: 3
        });

        expect(jobWithRetries.hasExceededRetryLimit()).toBe(false);
      });
    });

    describe('getAge', () => {
      it('should return job age in milliseconds', () => {
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 2);
        
        const oldJob = new ProcessingJob({
          ...validJobData,
          created_at: oldDate
        });

        const age = oldJob.getAge();
        expect(age).toBeGreaterThan(7000000); // More than 1.9 hours
        expect(age).toBeLessThan(7300000); // Less than 2.1 hours
      });
    });

    describe('getAgeSeconds', () => {
      it('should return job age in seconds', () => {
        const oldDate = new Date();
        oldDate.setMinutes(oldDate.getMinutes() - 5);
        
        const oldJob = new ProcessingJob({
          ...validJobData,
          created_at: oldDate
        });

        const ageSeconds = oldJob.getAgeSeconds();
        expect(ageSeconds).toBeGreaterThan(290); // More than 4.8 minutes
        expect(ageSeconds).toBeLessThan(310); // Less than 5.2 minutes
      });
    });

    describe('getAgeMinutes', () => {
      it('should return job age in minutes', () => {
        const oldDate = new Date();
        oldDate.setMinutes(oldDate.getMinutes() - 10);
        
        const oldJob = new ProcessingJob({
          ...validJobData,
          created_at: oldDate
        });

        const ageMinutes = oldJob.getAgeMinutes();
        expect(ageMinutes).toBeGreaterThan(9); // More than 9 minutes
        expect(ageMinutes).toBeLessThan(11); // Less than 11 minutes
      });
    });

    describe('getAgeHours', () => {
      it('should return job age in hours', () => {
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 3);
        
        const oldJob = new ProcessingJob({
          ...validJobData,
          created_at: oldDate
        });

        const ageHours = oldJob.getAgeHours();
        expect(ageHours).toBeGreaterThan(2); // More than 2 hours
        expect(ageHours).toBeLessThan(4); // Less than 4 hours
      });
    });

    describe('isStale', () => {
      it('should return true for stale job', () => {
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 25);
        
        const staleJob = new ProcessingJob({
          ...validJobData,
          created_at: oldDate
        });

        expect(staleJob.isStale()).toBe(true);
        expect(staleJob.isStale(24)).toBe(true);
      });

      it('should return false for fresh job', () => {
        const freshJob = new ProcessingJob(validJobData);
        expect(freshJob.isStale()).toBe(false);
        expect(freshJob.isStale(1)).toBe(false);
      });
    });

    describe('getCurrentStep', () => {
      it('should return current step when available', () => {
        expect(job.getCurrentStep()).toBe('Generating audio');
      });

      it('should return fallback when not available', () => {
        const jobWithoutStep = new ProcessingJob(validJobData);
        expect(jobWithoutStep.getCurrentStep()).toBe('Unknown');
      });
    });

    describe('getErrorMessage', () => {
      it('should return error message when available', () => {
        const failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date()
        });

        expect(failedJob.getErrorMessage()).toBe('Test error');
      });

      it('should return fallback when not available', () => {
        expect(job.getErrorMessage()).toBe('No error message available');
      });
    });

    describe('getStatusDisplay', () => {
      it('should return correct display for queued status', () => {
        const queuedJob = new ProcessingJob(validJobData);
        expect(queuedJob.getStatusDisplay()).toBe('Queued');
      });

      it('should return correct display for running status', () => {
        expect(job.getStatusDisplay()).toBe('Running (50%)');
      });

      it('should return correct display for completed status', () => {
        const completedJob = new ProcessingJob({
          ...validJobData,
          status: 'completed',
          completed_at: new Date()
        });

        expect(completedJob.getStatusDisplay()).toBe('Completed');
      });

      it('should return correct display for failed status', () => {
        const failedJob = new ProcessingJob({
          ...validJobData,
          status: 'failed',
          error_message: 'Test error',
          completed_at: new Date(),
          retry_count: 2,
          max_retries: 3
        });

        expect(failedJob.getStatusDisplay()).toBe('Failed (2/3 retries)');
      });
    });

    describe('getSummary', () => {
      it('should return job summary', () => {
        const summary = job.getSummary();

        expect(summary.id).toBe('job-123');
        expect(summary.submission_id).toBe('sub-456');
        expect(summary.status).toBe('running');
        expect(summary.progress).toBe(50);
        expect(summary.current_step).toBe('Generating audio');
        expect(summary.retry_count).toBe(1);
        expect(summary.max_retries).toBe(3);
        expect(summary.age_seconds).toBeGreaterThan(0);
        expect(summary.processing_duration_seconds).toBeGreaterThan(0);
      });
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should convert to JSON correctly', () => {
      const testJob = new ProcessingJob(fullJobData);
      const json = testJob.toJSON();

      expect(json.id).toBe('job-123');
      expect(json.submission_id).toBe('sub-456');
      expect(json.status).toBe('running');
      expect(json.progress).toBe(50);
      expect(json.current_step).toBe('Generating audio');
      expect(json.retry_count).toBe(1);
      expect(json.max_retries).toBe(3);
    });

    it('should create from JSON correctly', () => {
      const jsonData: ProcessingJobData = {
        id: 'job-456',
        submission_id: 'sub-789',
        status: 'completed',
        progress: 100,
        current_step: 'Finished',
        retry_count: 0,
        max_retries: 3,
        started_at: new Date('2023-01-01T10:00:00Z'),
        completed_at: new Date('2023-01-01T10:05:00Z'),
        created_at: new Date('2023-01-01T09:00:00Z'),
        updated_at: new Date('2023-01-01T10:05:00Z')
      };

      const job = ProcessingJob.fromJSON(jsonData);

      expect(job.id).toBe('job-456');
      expect(job.submission_id).toBe('sub-789');
      expect(job.status).toBe('completed');
      expect(job.progress).toBe(100);
      expect(job.current_step).toBe('Finished');
    });
  });

  describe('createForSubmission static method', () => {
    it('should create new job for submission', () => {
      const job = ProcessingJob.createForSubmission('sub-123');

      expect(job.submission_id).toBe('sub-123');
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
      expect(job.retry_count).toBe(0);
      expect(job.max_retries).toBe(3);
    });

    it('should create new job with custom max retries', () => {
      const job = ProcessingJob.createForSubmission('sub-123', 5);

      expect(job.submission_id).toBe('sub-123');
      expect(job.max_retries).toBe(5);
    });
  });
});