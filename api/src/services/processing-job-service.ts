import { ProcessingJob } from '../models/processing-job';
import { DatabaseService } from './database-service';
import { logger } from '../utils/logger';

/**
 * ProcessingJobService
 * 
 * Manages processing jobs for content submissions.
 * Handles job creation, status updates, and retrieval.
 */
export class ProcessingJobService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Create a new processing job for a submission
   */
  async createJob(submissionId: string): Promise<ProcessingJob> {
    try {
      const job = ProcessingJob.createForSubmission(submissionId);
      await this.databaseService.saveProcessingJob(job);
      
      logger.info('Processing job created', {
        jobId: job.id,
        submissionId,
        status: job.status
      });

      return job;
    } catch (error) {
      logger.error('Failed to create processing job:', error);
      throw new Error(`Job creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a processing job by ID
   */
  async getJob(jobId: string): Promise<ProcessingJob | null> {
    try {
      return await this.databaseService.getProcessingJob(jobId);
    } catch (error) {
      logger.error('Failed to get processing job:', error);
      return null;
    }
  }

  /**
   * Get a processing job by submission ID
   */
  async getJobBySubmissionId(submissionId: string): Promise<ProcessingJob | null> {
    try {
      return await this.databaseService.getProcessingJobBySubmissionId(submissionId);
    } catch (error) {
      logger.error('Failed to get processing job by submission ID:', error);
      return null;
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number, currentStep?: string): Promise<ProcessingJob | null> {
    try {
      const job = await this.databaseService.getProcessingJob(jobId);
      if (!job) {
        return null;
      }

      const updatedJob = job.updateProgress(progress, currentStep);
      await this.databaseService.saveProcessingJob(updatedJob);

      logger.info('Job progress updated', {
        jobId,
        progress,
        currentStep
      });

      return updatedJob;
    } catch (error) {
      logger.error('Failed to update job progress:', error);
      return null;
    }
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result?: any): Promise<ProcessingJob | null> {
    try {
      const job = await this.databaseService.getProcessingJob(jobId);
      if (!job) {
        return null;
      }

      const completedJob = job.complete(result);
      await this.databaseService.saveProcessingJob(completedJob);

      logger.info('Job completed', {
        jobId,
        submissionId: job.submission_id
      });

      return completedJob;
    } catch (error) {
      logger.error('Failed to complete job:', error);
      return null;
    }
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, errorMessage: string, errorDetails?: any): Promise<ProcessingJob | null> {
    try {
      const job = await this.databaseService.getProcessingJob(jobId);
      if (!job) {
        return null;
      }

      const failedJob = job.fail(errorMessage, errorDetails);
      await this.databaseService.saveProcessingJob(failedJob);

      logger.error('Job failed', {
        jobId,
        submissionId: job.submission_id,
        errorMessage
      });

      return failedJob;
    } catch (error) {
      logger.error('Failed to mark job as failed:', error);
      return null;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<ProcessingJob | null> {
    try {
      const job = await this.databaseService.getProcessingJob(jobId);
      if (!job) {
        return null;
      }

      const retriedJob = job.retry();
      await this.databaseService.saveProcessingJob(retriedJob);

      logger.info('Job retried', {
        jobId,
        submissionId: job.submission_id,
        retryCount: retriedJob.retry_count
      });

      return retriedJob;
    } catch (error) {
      logger.error('Failed to retry job:', error);
      return null;
    }
  }

  /**
   * Get all jobs for a submission
   */
  async getJobsForSubmission(submissionId: string): Promise<ProcessingJob[]> {
    try {
      return await this.databaseService.getProcessingJobsBySubmissionId(submissionId);
    } catch (error) {
      logger.error('Failed to get jobs for submission:', error);
      return [];
    }
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: string): Promise<ProcessingJob[]> {
    try {
      return await this.databaseService.getProcessingJobsByStatus(status);
    } catch (error) {
      logger.error('Failed to get jobs by status:', error);
      return [];
    }
  }

  /**
   * Get stale jobs (older than specified hours)
   */
  async getStaleJobs(olderThanHours: number = 24): Promise<ProcessingJob[]> {
    try {
      return await this.databaseService.getStaleProcessingJobs(olderThanHours);
    } catch (error) {
      logger.error('Failed to get stale jobs:', error);
      return [];
    }
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    try {
      return await this.databaseService.cleanupOldProcessingJobs(olderThanDays);
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
      return 0;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    try {
      const stats = await this.databaseService.getProcessingJobStatistics();
      return {
        total: stats.total || 0,
        pending: stats.pending || 0,
        running: stats.running || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0
      };
    } catch (error) {
      logger.error('Failed to get job statistics:', error);
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0
      };
    }
  }
}
