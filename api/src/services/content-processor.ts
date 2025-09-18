import { ContentSubmission } from '../models/content-submission';
import { FirecrawlService } from './firecrawl-service';
import { AzureOpenAIService } from './azure-openai-service';
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
  private firecrawlService: FirecrawlService;
  private azureOpenAIService: AzureOpenAIService;

  constructor() {
    this.firecrawlService = new FirecrawlService();
    this.azureOpenAIService = new AzureOpenAIService();
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
    // Use Firecrawl to extract content from URL
    const extracted = await this.firecrawlService.extractContent(url);
    
    // Use Azure OpenAI to generate summary
    const summary = await this.azureOpenAIService.generateSummary(extracted.content);

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
    // Process document content
    const summary = await this.azureOpenAIService.generateSummary(document.content);

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
