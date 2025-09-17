import { ExtractedContent } from './content-processor';
import { PodcastEpisode } from '../models/podcast-episode';
import { AzureOpenAIService } from './azure-openai-service';
import { ElevenLabsService } from './elevenlabs-service';
import { StorageService } from './storage-service';
import { logger } from '../utils/logger';

export class PodcastGenerator {
  private azureOpenAIService: AzureOpenAIService;
  private elevenLabsService: ElevenLabsService;
  private storageService: StorageService;

  constructor() {
    this.azureOpenAIService = new AzureOpenAIService();
    this.elevenLabsService = new ElevenLabsService();
    this.storageService = new StorageService();
  }

  async generateEpisode(content: ExtractedContent, submissionId: string): Promise<PodcastEpisode> {
    try {
      // Generate podcast script using Azure OpenAI
      const script = await this.azureOpenAIService.generatePodcastScript(content);

      // Generate audio using ElevenLabs
      const audioBuffer = await this.elevenLabsService.generateAudio(script);

      // Upload audio to storage
      const audioUrl = await this.storageService.uploadAudio(audioBuffer, submissionId);

      // Calculate duration (estimate)
      const duration = this.estimateDuration(script);

      // Create episode
      const episode = new PodcastEpisode({
        id: this.generateEpisodeId(),
        title: content.title,
        description: content.summary,
        audioUrl,
        duration,
        publishedAt: new Date(),
        submissionId,
        metadata: {
          originalUrl: content.metadata.originalUrl,
          originalTitle: content.metadata.originalTitle,
          author: content.metadata.author,
          tags: this.generateTags(content)
        }
      });

      return episode;

    } catch (error) {
      logger.error('Podcast generation error:', error);
      throw error;
    }
  }

  private generateEpisodeId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateDuration(script: string): number {
    // Estimate 150 words per minute for podcast speech
    const wordCount = script.split(' ').length;
    return Math.ceil((wordCount / 150) * 60);
  }

  private generateTags(content: ExtractedContent): string[] {
    const tags = ['podcast', 'ai-generated'];
    
    if (content.metadata.originalUrl) {
      tags.push('web-content');
    }
    
    if (content.metadata.author) {
      tags.push('author-content');
    }

    return tags;
  }
}
