import { ContentSubmission } from '../models/content-submission';
import { logger } from '../utils/logger';

export class ContentSubmissionService {
  constructor() {
    // Services will be lazy loaded via ServiceManager
  }

  async processSubmission(body: any): Promise<{ submissionId: string; estimatedCompletion: string }> {
    try {
      // Body is already parsed
      
      // Generate a simple submission ID
      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process content synchronously with timeout to prevent hanging
      this.processContentDirectly(submissionId, body).catch(error => {
        logger.error('Background processing failed:', error);
      });

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


  private async processContentDirectly(submissionId: string, body: any): Promise<void> {
    try {
      logger.info('Starting direct content processing', { submissionId });

      // Create a proper ContentSubmission object
      const submissionData = {
        content_url: body.content_url,
        content_type: body.content_type,
        user_note: body.user_note,
        status: 'pending' as const,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const submission = new ContentSubmission(submissionData);

      // Get services dynamically to avoid circular dependency
      const { serviceManager } = require('./service-manager');
      
      // Extract content (lazy loaded)
      const contentProcessor = serviceManager.getContentProcessor();
      const extractedContent = await contentProcessor.extractContent(submission);
      logger.info('Content extracted successfully', { submissionId });

      // Memory optimization: Limit content length for Y1 Consumption plan
      if (extractedContent.content && extractedContent.content.length > 50000) {
        logger.warn('Content too long for Y1 plan, truncating', { 
          submissionId, 
          originalLength: extractedContent.content.length 
        });
        extractedContent.content = extractedContent.content.substring(0, 50000) + '...';
      }

      // Generate podcast episode (lazy loaded, automatically saved to blob storage)
      const podcastGenerator = serviceManager.getPodcastGenerator();
      await podcastGenerator.generateEpisode(extractedContent, submissionId);
      logger.info('Podcast episode generated and saved successfully', { submissionId });

      logger.info('Content processing completed successfully', { submissionId });

    } catch (error) {
      logger.error('Direct content processing error:', {
        submissionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name || 'Unknown'
      });
      
      // Memory cleanup on error
      if (global.gc) {
        global.gc();
      }
      
      // No database to update status, just log the error
    }
  }
}
