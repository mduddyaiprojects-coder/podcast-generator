// Lazy imports to prevent circular dependencies and reduce startup memory
import { logger } from '../utils/logger';

/**
 * Service Manager - Singleton pattern for all services
 * Ensures only one instance of each service exists to prevent memory issues
 */
export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, any> = new Map();

  private constructor() {
    logger.info('ServiceManager initialized - services will be lazy loaded');
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * Get Azure OpenAI service (singleton)
   */
  public getAzureOpenAI(): any {
    if (!this.services.has('azureOpenAI')) {
      logger.info('Creating Azure OpenAI service instance');
      const { AzureOpenAIService } = require('./azure-openai-service');
      this.services.set('azureOpenAI', new AzureOpenAIService());
    }
    return this.services.get('azureOpenAI');
  }

  /**
   * Get ElevenLabs service (singleton)
   */
  public getElevenLabs(): any {
    if (!this.services.has('elevenLabs')) {
      logger.info('Creating ElevenLabs service instance');
      const { ElevenLabsService } = require('./elevenlabs-service');
      this.services.set('elevenLabs', new ElevenLabsService());
    }
    return this.services.get('elevenLabs');
  }

  /**
   * Get Firecrawl service (singleton)
   */
  public getFirecrawl(): any {
    if (!this.services.has('firecrawl')) {
      logger.info('Creating Firecrawl service instance');
      const { FirecrawlService } = require('./firecrawl-service');
      this.services.set('firecrawl', new FirecrawlService());
    }
    return this.services.get('firecrawl');
  }

  /**
   * Get YouTube service (singleton)
   */
  public getYouTube(): any {
    if (!this.services.has('youtube')) {
      logger.info('Creating YouTube service instance');
      const { YouTubeService } = require('./youtube-service');
      this.services.set('youtube', new YouTubeService());
    }
    return this.services.get('youtube');
  }

  /**
   * Get Azure Speech service (singleton)
   */
  public getAzureSpeech(): any {
    if (!this.services.has('azureSpeech')) {
      logger.info('Creating Azure Speech service instance');
      const { AzureSpeechService } = require('./azure-speech-service');
      this.services.set('azureSpeech', new AzureSpeechService());
    }
    return this.services.get('azureSpeech');
  }

  /**
   * Get Storage service (singleton)
   */
  public getStorage(): any {
    if (!this.services.has('storage')) {
      logger.info('Creating Storage service instance');
      const { StorageService } = require('./storage-service');
      const config = {
        connectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'] || '',
        containerName: process.env['AZURE_STORAGE_CONTAINER_NAME'] || 'podcast-audio',
        cdnBaseUrl: process.env['CDN_BASE_URL']
      };
      this.services.set('storage', new StorageService(config));
    }
    return this.services.get('storage');
  }

  /**
   * Get TTS service (singleton)
   */
  public getTTS(): any {
    if (!this.services.has('tts')) {
      logger.info('Creating TTS service instance');
      const { TTSService } = require('./tts-service');
      this.services.set('tts', new TTSService());
    }
    return this.services.get('tts');
  }

  /**
   * Get Content Processor service (singleton)
   */
  public getContentProcessor(): any {
    if (!this.services.has('contentProcessor')) {
      logger.info('Creating Content Processor service instance');
      const { ContentProcessor } = require('./content-processor');
      this.services.set('contentProcessor', new ContentProcessor());
    }
    return this.services.get('contentProcessor');
  }

  /**
   * Get Podcast Generator service (singleton)
   */
  public getPodcastGenerator(): any {
    if (!this.services.has('podcastGenerator')) {
      logger.info('Creating Podcast Generator service instance');
      const { PodcastGenerator } = require('./podcast-generator');
      this.services.set('podcastGenerator', new PodcastGenerator());
    }
    return this.services.get('podcastGenerator');
  }

  /**
   * Get RSS Generator service (singleton)
   */
  public getRssGenerator(): any {
    if (!this.services.has('rssGenerator')) {
      logger.info('Creating RSS Generator service instance');
      const { RssGenerator } = require('./rss-generator');
      this.services.set('rssGenerator', new RssGenerator());
    }
    return this.services.get('rssGenerator');
  }

  /**
   * Get service count for debugging
   */
  public getServiceCount(): number {
    return this.services.size;
  }

  /**
   * Get list of loaded services for debugging
   */
  public getLoadedServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get CDN Cache Management service (singleton)
   */
  public getCdnCacheManagement(): any {
    if (!this.services.has('cdnCacheManagement')) {
      logger.info('Creating CdnCacheManagement service instance');
      const { CdnCacheManagementService } = require('./cdn-cache-management');
      this.services.set('cdnCacheManagement', new CdnCacheManagementService());
    }
    return this.services.get('cdnCacheManagement');
  }

  /**
   * Get Content Submission service (singleton)
   */
  public getContentSubmissionService(): any {
    if (!this.services.has('contentSubmissionService')) {
      logger.info('Creating ContentSubmissionService service instance');
      const { ContentSubmissionService } = require('./content-submission-service');
      this.services.set('contentSubmissionService', new ContentSubmissionService());
    }
    return this.services.get('contentSubmissionService');
  }

  /**
   * Clear all services (for testing)
   */
  public clearServices(): void {
    logger.info('Clearing all service instances');
    this.services.clear();
  }
}

// Export singleton instance
export const serviceManager = ServiceManager.getInstance();
