import { HttpRequest } from '@azure/functions';
import { ContentSubmission } from '../models/content-submission';
// import { PodcastEpisode } from '../models/podcast-episode';
import { ContentProcessor } from './content-processor';
import { PodcastGenerator } from './podcast-generator';
import { DatabaseService } from './database-service';
import { logger } from '../utils/logger';

export class ContentSubmissionService {
  private contentProcessor: ContentProcessor;
  private podcastGenerator: PodcastGenerator;
  private databaseService: DatabaseService;

  constructor() {
    this.contentProcessor = new ContentProcessor();
    this.podcastGenerator = new PodcastGenerator();
    this.databaseService = new DatabaseService();
  }

  async processSubmission(request: HttpRequest): Promise<{ submissionId: string; estimatedCompletion: string }> {
    try {
      // Parse request body
      const body = await request.json() as any;
      
      // Create ContentSubmission from contract format
      const submissionData = {
        content_url: body.content_url,
        content_type: body.content_type,
        user_note: body.user_note,
        status: 'pending' as const,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const submission = new ContentSubmission(submissionData);

      // Save submission to database
      const submissionId = await this.databaseService.saveSubmission(submission);

      // Process content asynchronously
      this.processContentAsync(submissionId, submission);

      // Calculate estimated completion time (15 minutes from now)
      const estimatedCompletion = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      return { 
        submissionId,
        estimatedCompletion
      };

    } catch (error) {
      logger.error('Content submission processing error:', error);
      throw error;
    }
  }

  /**
   * Get a submission by ID
   */
  async getSubmission(submissionId: string): Promise<ContentSubmission | null> {
    try {
      return await this.databaseService.getSubmission(submissionId);
    } catch (error) {
      logger.error('Failed to get submission:', error);
      return null;
    }
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(submissionId: string, status: string): Promise<void> {
    try {
      await this.databaseService.updateSubmissionStatus(submissionId, status);
      logger.info('Submission status updated', { submissionId, status });
    } catch (error) {
      logger.error('Failed to update submission status:', error);
      throw error;
    }
  }

  private async processContentAsync(submissionId: string, submission: ContentSubmission): Promise<void> {
    try {
      // Extract content
      const extractedContent = await this.contentProcessor.extractContent(submission);

      // Generate podcast episode
      const episode = await this.podcastGenerator.generateEpisode(extractedContent, submissionId);

      // Save episode to database
      await this.databaseService.saveEpisode(episode);

      // Update submission status
      await this.databaseService.updateSubmissionStatus(submissionId, 'completed');

    } catch (error) {
      logger.error('Async content processing error:', error);
      await this.databaseService.updateSubmissionStatus(submissionId, 'failed');
    }
  }
}
