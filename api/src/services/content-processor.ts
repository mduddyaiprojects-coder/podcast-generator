import { ContentSubmission } from '../models/content-submission';
import { serviceManager } from './service-manager';
import { logger } from '../utils/logger';

export interface ExtractedContent {
  title: string;
  content: string;
  summary: string;
  metadata: {
    originalUrl?: string;
    originalTitle?: string;
    author?: string | undefined;
    publishedDate?: Date | undefined;
    wordCount: number;
  };
}

export class ContentProcessor {
  constructor() {
    // Services will be lazy loaded via ServiceManager
  }

  async extractContent(submission: ContentSubmission): Promise<ExtractedContent> {
    try {
      switch (submission.content_type) {
        case 'url':
          return await this.extractFromUrl(submission.content_url);
        case 'youtube':
          return await this.extractFromYouTube(submission.content_url);
        case 'pdf':
        case 'document':
          return await this.extractFromDocument(submission.content_url);
        default:
          throw new Error('Unsupported content type');
      }
    } catch (error) {
      logger.error('Content extraction error:', error);
      throw error;
    }
  }

  private async extractFromUrl(url: string): Promise<ExtractedContent> {
    // Use Firecrawl to extract content from URL (lazy loaded)
    const firecrawl = serviceManager.getFirecrawl();
    const extracted = await firecrawl.extractContent(url);
    
    // Use Azure OpenAI to generate summary (lazy loaded)
    const azureOpenAI = serviceManager.getAzureOpenAI();
    const summary = await azureOpenAI.generateSummary(extracted.content);

    return {
      title: extracted.title,
      content: extracted.content,
      summary,
      metadata: {
        originalUrl: url,
        originalTitle: extracted.title,
        author: extracted.author,
        publishedDate: extracted.publishedDate,
        wordCount: extracted.content.split(' ').length
      }
    };
  }

  private async extractFromYouTube(_youtubeUrl: string): Promise<ExtractedContent> {
    // TODO: Implement YouTube content extraction
    // This would involve using YouTube API or a service like Firecrawl
    throw new Error('YouTube extraction not yet implemented');
  }

  private async extractFromDocument(document: any): Promise<ExtractedContent> {
    // Process document content (lazy loaded)
    const azureOpenAI = serviceManager.getAzureOpenAI();
    const summary = await azureOpenAI.generateSummary(document.content);

    return {
      title: document.title,
      content: document.content,
      summary,
      metadata: {
        originalTitle: document.title,
        wordCount: document.content.split(' ').length
      }
    };
  }
}
