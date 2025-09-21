import { logger } from '../utils/logger';
import { ServiceError, ErrorType, ErrorSeverity } from '../utils/error-handling';
import { RetryUtil } from '../utils/retry';
import { timeoutManager } from '../utils/timeout';

/**
 * Fallback strategy configuration
 */
export interface FallbackStrategy {
  name: string;
  priority: number;
  condition: (error: ServiceError) => boolean;
  action: () => Promise<any>;
  timeoutMs?: number;
}

/**
 * Fallback service for handling service failures
 */
export class FallbackService {
  private strategies: Map<string, FallbackStrategy[]> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default fallback strategies for all services
   */
  private initializeDefaultStrategies(): void {
    // Azure OpenAI fallback strategies
    this.addStrategies('azure-openai', [
      {
        name: 'cached_response',
        priority: 1,
        condition: (error) => error.type === ErrorType.SERVICE_UNAVAILABLE,
        action: () => this.getCachedResponse('azure-openai', 'summary'),
        timeoutMs: 5000
      },
      {
        name: 'simplified_prompt',
        priority: 2,
        condition: (error) => error.type === ErrorType.TIMEOUT_ERROR,
        action: () => this.generateSimplifiedResponse('summary'),
        timeoutMs: 10000
      }
    ]);

    // ElevenLabs fallback strategies
    this.addStrategies('elevenlabs', [
      {
        name: 'cached_audio',
        priority: 1,
        condition: (error) => error.type === ErrorType.SERVICE_UNAVAILABLE,
        action: () => this.getCachedAudio('default'),
        timeoutMs: 5000
      },
      {
        name: 'text_response',
        priority: 2,
        condition: (error) => error.type === ErrorType.TIMEOUT_ERROR,
        action: () => this.generateTextResponse('TTS generation temporarily unavailable'),
        timeoutMs: 2000
      }
    ]);

    // Firecrawl fallback strategies
    this.addStrategies('firecrawl', [
      {
        name: 'basic_scraping',
        priority: 1,
        condition: (error) => error.type === ErrorType.SERVICE_UNAVAILABLE,
        action: () => this.basicWebScraping(),
        timeoutMs: 15000
      },
      {
        name: 'placeholder_content',
        priority: 2,
        condition: (error) => error.type === ErrorType.TIMEOUT_ERROR,
        action: () => this.generatePlaceholderContent(),
        timeoutMs: 2000
      }
    ]);

    // YouTube fallback strategies
    this.addStrategies('youtube', [
      {
        name: 'cached_metadata',
        priority: 1,
        condition: (error) => error.type === ErrorType.SERVICE_UNAVAILABLE,
        action: () => this.getCachedYouTubeMetadata(),
        timeoutMs: 5000
      },
      {
        name: 'basic_metadata',
        priority: 2,
        condition: (error) => error.type === ErrorType.TIMEOUT_ERROR,
        action: () => this.generateBasicYouTubeMetadata(),
        timeoutMs: 2000
      }
    ]);

    // Whisper fallback strategies
    this.addStrategies('whisper', [
      {
        name: 'cached_transcription',
        priority: 1,
        condition: (error) => error.type === ErrorType.SERVICE_UNAVAILABLE,
        action: () => this.getCachedTranscription(),
        timeoutMs: 5000
      },
      {
        name: 'placeholder_transcription',
        priority: 2,
        condition: (error) => error.type === ErrorType.TIMEOUT_ERROR,
        action: () => this.generatePlaceholderTranscription(),
        timeoutMs: 2000
      }
    ]);
  }

  /**
   * Add fallback strategies for a service
   */
  addStrategies(service: string, strategies: FallbackStrategy[]): void {
    if (!this.strategies.has(service)) {
      this.strategies.set(service, []);
    }
    
    const existingStrategies = this.strategies.get(service)!;
    existingStrategies.push(...strategies);
    existingStrategies.sort((a, b) => a.priority - b.priority);
    
    logger.info(`Added ${strategies.length} fallback strategies for ${service}`, {
      service,
      totalStrategies: existingStrategies.length
    });
  }

  /**
   * Execute fallback strategies for a service error
   */
  async executeFallback(service: string, error: ServiceError): Promise<any> {
    const strategies = this.strategies.get(service) || [];
    const applicableStrategies = strategies.filter(strategy => strategy.condition(error));

    if (applicableStrategies.length === 0) {
      throw new ServiceError(
        `No fallback strategies available for ${service}`,
        ErrorType.INTERNAL_ERROR,
        ErrorSeverity.HIGH,
        service,
        { context: { originalError: error.message } }
      );
    }

    logger.info(`Executing fallback strategies for ${service}`, {
      service,
      availableStrategies: applicableStrategies.length,
      errorType: error.type
    });

    // Try strategies in priority order
    for (const strategy of applicableStrategies) {
      try {
        const result = await this.executeStrategy(strategy, service);
        logger.info(`Fallback strategy succeeded for ${service}`, {
          service,
          strategy: strategy.name,
          priority: strategy.priority
        });
        return result;
      } catch (strategyError) {
        logger.warn(`Fallback strategy failed for ${service}`, {
          service,
          strategy: strategy.name,
          priority: strategy.priority,
          error: strategyError instanceof Error ? strategyError.message : 'Unknown error'
        });
      }
    }

    throw new ServiceError(
      `All fallback strategies failed for ${service}`,
      ErrorType.INTERNAL_ERROR,
      ErrorSeverity.CRITICAL,
      service,
      { context: { originalError: error.message } }
    );
  }

  /**
   * Execute a specific fallback strategy
   */
  private async executeStrategy(strategy: FallbackStrategy, service: string): Promise<any> {
    const operation = async () => {
      if (strategy.timeoutMs) {
        return timeoutManager.executeWithTimeout(
          strategy.action,
          service,
          strategy.timeoutMs
        );
      }
      return strategy.action();
    };

    return RetryUtil.execute(operation, {
      maxAttempts: 2,
      baseDelayMs: 1000,
      retryCondition: (error) => error.type !== ErrorType.CONFIGURATION_ERROR
    });
  }

  /**
   * Get cached response for a service
   */
  private async getCachedResponse(service: string, operation: string): Promise<any> {
    // In a real implementation, this would check a cache
    logger.info(`Attempting to get cached response for ${service}.${operation}`);
    
    // Simulate cache miss
    throw new Error('Cache miss');
  }

  /**
   * Generate simplified response for AI services
   */
  private async generateSimplifiedResponse(operation: string): Promise<any> {
    const responses: Record<string, any> = {
      summary: {
        text: 'Content summary temporarily unavailable due to service issues. Please try again later.'
      },
      script: {
        text: 'Podcast script generation temporarily unavailable due to service issues. Please try again later.'
      }
    };

    return responses[operation] || { text: 'Service temporarily unavailable' };
  }

  /**
   * Get cached audio for TTS services
   */
  private async getCachedAudio(voiceType: string): Promise<any> {
    logger.info(`Attempting to get cached audio for voice type: ${voiceType}`);
    
    // Simulate cache miss
    throw new Error('No cached audio available');
  }

  /**
   * Generate text response instead of audio
   */
  private async generateTextResponse(message: string): Promise<any> {
    return {
      message,
      type: 'text_fallback',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Basic web scraping fallback
   */
  private async basicWebScraping(): Promise<any> {
    return {
      title: 'Content extraction temporarily unavailable',
      content: 'The requested content could not be extracted at this time. Please try again later.',
      url: 'fallback',
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Generate placeholder content
   */
  private async generatePlaceholderContent(): Promise<any> {
    return {
      title: 'Content temporarily unavailable',
      content: 'The requested content is temporarily unavailable. Please try again later.',
      url: 'placeholder',
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Get cached YouTube metadata
   */
  private async getCachedYouTubeMetadata(): Promise<any> {
    logger.info('Attempting to get cached YouTube metadata');
    
    // Simulate cache miss
    throw new Error('No cached metadata available');
  }

  /**
   * Generate basic YouTube metadata
   */
  private async generateBasicYouTubeMetadata(): Promise<any> {
    return {
      title: 'Video metadata temporarily unavailable',
      description: 'Video information is temporarily unavailable. Please try again later.',
      channelTitle: 'Unknown',
      viewCount: 0,
      likeCount: 0,
      duration: '0:00',
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Get cached transcription
   */
  private async getCachedTranscription(): Promise<any> {
    logger.info('Attempting to get cached transcription');
    
    // Simulate cache miss
    throw new Error('No cached transcription available');
  }

  /**
   * Generate placeholder transcription
   */
  private async generatePlaceholderTranscription(): Promise<any> {
    return {
      text: 'Transcription temporarily unavailable. Please try again later.',
      language: 'en',
      duration: 0,
      segments: []
    };
  }

  /**
   * Get available fallback strategies for a service
   */
  getStrategies(service: string): FallbackStrategy[] {
    return this.strategies.get(service) || [];
  }

  /**
   * Check if fallback strategies are available for a service
   */
  hasFallbacks(service: string): boolean {
    const strategies = this.strategies.get(service) || [];
    return strategies.length > 0;
  }

  /**
   * Get fallback statistics
   */
  getFallbackStats(): Record<string, { strategyCount: number; services: string[] }> {
    const stats: Record<string, { strategyCount: number; services: string[] }> = {};
    
    for (const [service, strategies] of this.strategies) {
      for (const strategy of strategies) {
        if (!stats[strategy.name]) {
          stats[strategy.name] = { strategyCount: 0, services: [] };
        }
        stats[strategy.name]!.strategyCount++;
        if (!stats[strategy.name]!.services.includes(service)) {
          stats[strategy.name]!.services.push(service);
        }
      }
    }
    
    return stats;
  }
}

// Export singleton instance
export const fallbackService = new FallbackService();
