import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import { ProcessingJobService } from '../../src/services/processing-job-service';
import { DatabaseService } from '../../src/services/database-service';
import { ProcessingJob } from '../../src/models/processing-job';

// Mock DatabaseService
const MockedDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('ProcessingJobService', () => {
  let service: ProcessingJobService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    mockDatabaseService = {
      saveProcessingJob: jest.fn(),
      getProcessingJob: jest.fn(),
      getProcessingJobBySubmissionId: jest.fn(),
      getProcessingJobsBySubmissionId: jest.fn(),
      getProcessingJobsByStatus: jest.fn(),
      getStaleProcessingJobs: jest.fn(),
      cleanupOldProcessingJobs: jest.fn(),
      getProcessingJobStatistics: jest.fn()
    } as any;

    // Mock the DatabaseService constructor
    MockedDatabaseService.mockImplementation(() => mockDatabaseService);
    
    service = new ProcessingJobService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createJob', () => {
    it('should create a processing job successfully', async () => {
      const submissionId = 'test-submission-id';
      const mockJob = {
        id: 'job-123',
        submission_id: submissionId,
        status: 'pending'
      } as any;

      mockDatabaseService.saveProcessingJob.mockResolvedValue(undefined);

      // Mock ProcessingJob.createForSubmission
      jest.spyOn(ProcessingJob, 'createForSubmission').mockReturnValue(mockJob);

      const result = await service.createJob(submissionId);

      expect(result).toEqual(mockJob);
      expect(mockDatabaseService.saveProcessingJob).toHaveBeenCalledWith(mockJob);
    });

    it('should handle errors during job creation', async () => {
      const submissionId = 'test-submission-id';
      const error = new Error('Database error');

      mockDatabaseService.saveProcessingJob.mockRejectedValue(error);

      await expect(service.createJob(submissionId)).rejects.toThrow('Job creation failed: Database error');
    });
  });

  describe('getJob', () => {
    it('should get a job by ID', async () => {
      const jobId = 'job-123';
      const mockJob = { id: jobId } as ProcessingJob;

      mockDatabaseService.getProcessingJob.mockResolvedValue(mockJob);

      const result = await service.getJob(jobId);

      expect(result).toEqual(mockJob);
      expect(mockDatabaseService.getProcessingJob).toHaveBeenCalledWith(jobId);
    });

    it('should return null on error', async () => {
      const jobId = 'job-123';
      const error = new Error('Database error');

      mockDatabaseService.getProcessingJob.mockRejectedValue(error);

      const result = await service.getJob(jobId);

      expect(result).toBeNull();
    });
  });

  describe('getJobBySubmissionId', () => {
    it('should get a job by submission ID', async () => {
      const submissionId = 'submission-123';
      const mockJob = { submission_id: submissionId } as ProcessingJob;

      mockDatabaseService.getProcessingJobBySubmissionId.mockResolvedValue(mockJob);

      const result = await service.getJobBySubmissionId(submissionId);

      expect(result).toEqual(mockJob);
      expect(mockDatabaseService.getProcessingJobBySubmissionId).toHaveBeenCalledWith(submissionId);
    });
  });

  describe('updateProgress', () => {
    it('should update job progress', async () => {
      const jobId = 'job-123';
      const progress = 50;
      const currentStep = 'processing';
      const mockJob = { id: jobId, updateProgress: jest.fn() } as any;
      const updatedJob = { id: jobId, progress, currentStep } as any;

      mockDatabaseService.getProcessingJob.mockResolvedValue(mockJob);
      mockJob.updateProgress.mockReturnValue(updatedJob);
      mockDatabaseService.saveProcessingJob.mockResolvedValue(undefined);

      const result = await service.updateProgress(jobId, progress, currentStep);

      expect(result).toEqual(updatedJob);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(progress, currentStep);
      expect(mockDatabaseService.saveProcessingJob).toHaveBeenCalledWith(updatedJob);
    });

    it('should return null if job not found', async () => {
      const jobId = 'job-123';

      mockDatabaseService.getProcessingJob.mockResolvedValue(null);

      const result = await service.updateProgress(jobId, 50);

      expect(result).toBeNull();
    });
  });

  describe('completeJob', () => {
    it('should complete a job', async () => {
      const jobId = 'job-123';
      const result = { episodeId: 'episode-123' };
      const mockJob = { id: jobId, submission_id: 'sub-123', complete: jest.fn() } as any;
      const completedJob = { id: jobId, status: 'completed' } as ProcessingJob;

      mockDatabaseService.getProcessingJob.mockResolvedValue(mockJob);
      mockJob.complete.mockReturnValue(completedJob);
      mockDatabaseService.saveProcessingJob.mockResolvedValue(undefined);

      const jobResult = await service.completeJob(jobId, result);

      expect(jobResult).toEqual(completedJob);
      expect(mockJob.complete).toHaveBeenCalledWith(result);
      expect(mockDatabaseService.saveProcessingJob).toHaveBeenCalledWith(completedJob);
    });
  });

  describe('failJob', () => {
    it('should fail a job', async () => {
      const jobId = 'job-123';
      const errorMessage = 'Processing failed';
      const errorDetails = { code: 'ERROR_001' };
      const mockJob = { id: jobId, submission_id: 'sub-123', fail: jest.fn() } as any;
      const failedJob = { id: jobId, status: 'failed' } as ProcessingJob;

      mockDatabaseService.getProcessingJob.mockResolvedValue(mockJob);
      mockJob.fail.mockReturnValue(failedJob);
      mockDatabaseService.saveProcessingJob.mockResolvedValue(undefined);

      const result = await service.failJob(jobId, errorMessage, errorDetails);

      expect(result).toEqual(failedJob);
      expect(mockJob.fail).toHaveBeenCalledWith(errorMessage, errorDetails);
      expect(mockDatabaseService.saveProcessingJob).toHaveBeenCalledWith(failedJob);
    });
  });

  describe('retryJob', () => {
    it('should retry a job', async () => {
      const jobId = 'job-123';
      const mockJob = { id: jobId, submission_id: 'sub-123', retry: jest.fn() } as any;
      const retriedJob = { id: jobId, retry_count: 1 } as ProcessingJob;

      mockDatabaseService.getProcessingJob.mockResolvedValue(mockJob);
      mockJob.retry.mockReturnValue(retriedJob);
      mockDatabaseService.saveProcessingJob.mockResolvedValue(undefined);

      const result = await service.retryJob(jobId);

      expect(result).toEqual(retriedJob);
      expect(mockJob.retry).toHaveBeenCalled();
      expect(mockDatabaseService.saveProcessingJob).toHaveBeenCalledWith(retriedJob);
    });
  });

  describe('getJobStatistics', () => {
    it('should get job statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 10,
        running: 5,
        completed: 80,
        failed: 5
      };

      mockDatabaseService.getProcessingJobStatistics.mockResolvedValue(mockStats);

      const result = await service.getJobStatistics();

      expect(result).toEqual(mockStats);
      expect(mockDatabaseService.getProcessingJobStatistics).toHaveBeenCalled();
    });

    it('should return default stats on error', async () => {
      mockDatabaseService.getProcessingJobStatistics.mockRejectedValue(new Error('Database error'));

      const result = await service.getJobStatistics();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0
      });
    });
  });
});
