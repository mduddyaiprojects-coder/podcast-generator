import { v4 as uuidv4 } from 'uuid';

/**
 * ProcessingJob Model
 * 
 * Represents a background processing job for content conversion.
 * Matches the data model specification in /specs/001-feature-podcast-generator/data-model.md
 */

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ProcessingJobData {
  id?: string;
  submission_id: string;
  status?: JobStatus;
  progress?: number; // 0-100
  current_step?: string;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
  started_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class ProcessingJob {
  public readonly id: string;
  public readonly submission_id: string;
  public readonly status: JobStatus;
  public readonly progress: number;
  public readonly current_step?: string;
  public readonly error_message?: string;
  public readonly retry_count: number;
  public readonly max_retries: number;
  public readonly started_at?: Date;
  public readonly completed_at?: Date;
  public readonly created_at: Date;
  public readonly updated_at: Date;

  constructor(data: ProcessingJobData) {
    this.id = data.id || this.generateId();
    this.submission_id = data.submission_id;
    this.status = data.status || 'queued';
    this.progress = data.progress || 0;
    this.current_step = data.current_step;
    this.error_message = data.error_message;
    this.retry_count = data.retry_count || 0;
    this.max_retries = data.max_retries || 3;
    this.started_at = data.started_at;
    this.completed_at = data.completed_at;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();

    this.validate();
  }

  private generateId(): string {
    return uuidv4();
  }

  private validate(): void {
    // Validate submission_id
    if (!this.submission_id || this.submission_id.trim().length === 0) {
      throw new Error('Submission ID is required');
    }

    // Validate status
    const validStatuses: JobStatus[] = ['queued', 'running', 'completed', 'failed'];
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate progress
    if (this.progress < 0 || this.progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    // Validate retry_count
    if (this.retry_count < 0) {
      throw new Error('Retry count cannot be negative');
    }

    // Validate max_retries
    if (this.max_retries < 0) {
      throw new Error('Max retries cannot be negative');
    }

    // Validate retry_count doesn't exceed max_retries
    if (this.retry_count > this.max_retries) {
      throw new Error('Retry count cannot exceed max retries');
    }

    // Validate started_at is required when status is 'running'
    if (this.status === 'running' && !this.started_at) {
      throw new Error('Started timestamp is required when status is "running"');
    }

    // Validate completed_at is required when status is 'completed' or 'failed'
    if ((this.status === 'completed' || this.status === 'failed') && !this.completed_at) {
      throw new Error('Completed timestamp is required when status is "completed" or "failed"');
    }

    // Validate error_message is present when status is 'failed'
    if (this.status === 'failed' && (!this.error_message || this.error_message.trim().length === 0)) {
      throw new Error('Error message is required when status is "failed"');
    }

    // Validate timestamps
    if (this.started_at && this.completed_at && this.started_at > this.completed_at) {
      throw new Error('Started timestamp cannot be after completed timestamp');
    }
  }

  /**
   * Start the job
   */
  public start(): ProcessingJob {
    if (this.status !== 'queued') {
      throw new Error(`Cannot start job with status: ${this.status}`);
    }

    const updatedData: ProcessingJobData = {
      id: this.id,
      submission_id: this.submission_id,
      status: 'running',
      progress: this.progress,
      current_step: this.current_step,
      error_message: this.error_message,
      retry_count: this.retry_count,
      max_retries: this.max_retries,
      started_at: new Date(),
      completed_at: this.completed_at,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new ProcessingJob(updatedData);
  }

  /**
   * Update progress
   */
  public updateProgress(progress: number, currentStep?: string): ProcessingJob {
    if (this.status !== 'running') {
      throw new Error(`Cannot update progress for job with status: ${this.status}`);
    }

    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const updatedData: ProcessingJobData = {
      id: this.id,
      submission_id: this.submission_id,
      status: this.status,
      progress: progress,
      current_step: currentStep || this.current_step,
      error_message: this.error_message,
      retry_count: this.retry_count,
      max_retries: this.max_retries,
      started_at: this.started_at,
      completed_at: this.completed_at,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new ProcessingJob(updatedData);
  }

  /**
   * Complete the job successfully
   */
  public complete(): ProcessingJob {
    if (this.status !== 'running') {
      throw new Error(`Cannot complete job with status: ${this.status}`);
    }

    const updatedData: ProcessingJobData = {
      id: this.id,
      submission_id: this.submission_id,
      status: 'completed',
      progress: 100,
      current_step: this.current_step,
      error_message: this.error_message,
      retry_count: this.retry_count,
      max_retries: this.max_retries,
      started_at: this.started_at,
      completed_at: new Date(),
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new ProcessingJob(updatedData);
  }

  /**
   * Fail the job
   */
  public fail(errorMessage: string): ProcessingJob {
    if (this.status !== 'running') {
      throw new Error(`Cannot fail job with status: ${this.status}`);
    }

    const updatedData: ProcessingJobData = {
      id: this.id,
      submission_id: this.submission_id,
      status: 'failed',
      progress: this.progress,
      current_step: this.current_step,
      error_message: errorMessage,
      retry_count: this.retry_count,
      max_retries: this.max_retries,
      started_at: this.started_at,
      completed_at: new Date(),
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new ProcessingJob(updatedData);
  }

  /**
   * Retry the job
   */
  public retry(): ProcessingJob {
    if (this.status !== 'failed') {
      throw new Error(`Cannot retry job with status: ${this.status}`);
    }

    if (this.retry_count >= this.max_retries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    const updatedData: ProcessingJobData = {
      id: this.id,
      submission_id: this.submission_id,
      status: 'queued',
      progress: 0,
      current_step: undefined,
      error_message: undefined,
      retry_count: this.retry_count + 1,
      max_retries: this.max_retries,
      started_at: undefined,
      completed_at: undefined,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new ProcessingJob(updatedData);
  }

  /**
   * Check if the job can be retried
   */
  public canRetry(): boolean {
    return this.status === 'failed' && this.retry_count < this.max_retries;
  }

  /**
   * Check if the job is in a terminal state
   */
  public isTerminal(): boolean {
    return this.status === 'completed' || this.status === 'failed';
  }

  /**
   * Check if the job is currently running
   */
  public isRunning(): boolean {
    return this.status === 'running';
  }

  /**
   * Check if the job is queued
   */
  public isQueued(): boolean {
    return this.status === 'queued';
  }

  /**
   * Check if the job has failed
   */
  public hasFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * Check if the job has completed successfully
   */
  public hasCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Get the processing duration in milliseconds
   */
  public getProcessingDuration(): number | undefined {
    if (!this.started_at) {
      return undefined;
    }

    const endTime = this.completed_at || new Date();
    return endTime.getTime() - this.started_at.getTime();
  }

  /**
   * Get the processing duration in seconds
   */
  public getProcessingDurationSeconds(): number | undefined {
    const duration = this.getProcessingDuration();
    return duration ? Math.floor(duration / 1000) : undefined;
  }

  /**
   * Get the processing duration in minutes
   */
  public getProcessingDurationMinutes(): number | undefined {
    const duration = this.getProcessingDurationSeconds();
    return duration ? Math.floor(duration / 60) : undefined;
  }

  /**
   * Get the remaining retry attempts
   */
  public getRemainingRetries(): number {
    return Math.max(0, this.max_retries - this.retry_count);
  }

  /**
   * Get the retry percentage
   */
  public getRetryPercentage(): number {
    return (this.retry_count / this.max_retries) * 100;
  }

  /**
   * Check if the job has exceeded retry limit
   */
  public hasExceededRetryLimit(): boolean {
    return this.retry_count >= this.max_retries;
  }

  /**
   * Get the job age in milliseconds
   */
  public getAge(): number {
    const now = new Date();
    return now.getTime() - this.created_at.getTime();
  }

  /**
   * Get the job age in seconds
   */
  public getAgeSeconds(): number {
    return Math.floor(this.getAge() / 1000);
  }

  /**
   * Get the job age in minutes
   */
  public getAgeMinutes(): number {
    return Math.floor(this.getAgeSeconds() / 60);
  }

  /**
   * Get the job age in hours
   */
  public getAgeHours(): number {
    return Math.floor(this.getAgeMinutes() / 60);
  }

  /**
   * Check if the job is stale (older than specified hours)
   */
  public isStale(maxAgeHours: number = 24): boolean {
    return this.getAgeHours() > maxAgeHours;
  }

  /**
   * Get the current step or fallback
   */
  public getCurrentStep(): string {
    return this.current_step || 'Unknown';
  }

  /**
   * Get the error message or fallback
   */
  public getErrorMessage(): string {
    return this.error_message || 'No error message available';
  }

  /**
   * Get a human-readable status
   */
  public getStatusDisplay(): string {
    switch (this.status) {
      case 'queued':
        return 'Queued';
      case 'running':
        return `Running (${this.progress}%)`;
      case 'completed':
        return 'Completed';
      case 'failed':
        return `Failed (${this.retry_count}/${this.max_retries} retries)`;
      default:
        return 'Unknown';
    }
  }

  /**
   * Get job summary for logging
   */
  public getSummary(): {
    id: string;
    submission_id: string;
    status: JobStatus;
    progress: number;
    current_step?: string;
    retry_count: number;
    max_retries: number;
    age_seconds: number;
    processing_duration_seconds?: number;
  } {
    return {
      id: this.id,
      submission_id: this.submission_id,
      status: this.status,
      progress: this.progress,
      current_step: this.current_step,
      retry_count: this.retry_count,
      max_retries: this.max_retries,
      age_seconds: this.getAgeSeconds(),
      processing_duration_seconds: this.getProcessingDurationSeconds()
    };
  }

  /**
   * Convert to plain object for database storage
   */
  public toJSON(): ProcessingJobData {
    return {
      id: this.id,
      submission_id: this.submission_id,
      status: this.status,
      progress: this.progress,
      current_step: this.current_step,
      error_message: this.error_message,
      retry_count: this.retry_count,
      max_retries: this.max_retries,
      started_at: this.started_at,
      completed_at: this.completed_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from plain object (database retrieval)
   */
  public static fromJSON(data: ProcessingJobData): ProcessingJob {
    return new ProcessingJob(data);
  }

  /**
   * Create a new job for a submission
   */
  public static createForSubmission(
    submissionId: string,
    maxRetries: number = 3
  ): ProcessingJob {
    const data: ProcessingJobData = {
      submission_id: submissionId,
      status: 'queued',
      progress: 0,
      retry_count: 0,
      max_retries: maxRetries
    };

    return new ProcessingJob(data);
  }
}
