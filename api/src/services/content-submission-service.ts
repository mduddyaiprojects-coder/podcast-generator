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

  async processSubmission(request: HttpRequest): Promise<{ submissionId: string }> {
    try {
      // Parse request body
      const body = await request.json();
      const submission = new ContentSubmission(body as any);

      // Save submission to database
      const submissionId = await this.databaseService.saveSubmission(submission);

      // Process content asynchronously
      this.processContentAsync(submissionId, submission);

      return { submissionId };

    } catch (error) {
      logger.error('Content submission processing error:', error);
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
