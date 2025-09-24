import { logger } from '../utils/logger';
import { ElevenLabsService } from './elevenlabs-service';
import { AzureSpeechService } from './azure-speech-service';

/**
 * TTSService
 * 
 * Handles text-to-speech conversion using ElevenLabs (primary) and Azure TTS (fallback).
 * Provides a unified interface for TTS operations with automatic fallback and retry logic.
 */

export type TTSProvider = 'elevenlabs' | 'azure';

export interface TTSConfig {
  provider: TTSProvider;
  voice_id?: string;
  voice_name?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSResult {
  audio_buffer: Buffer;
  duration_seconds: number;
  file_size_bytes: number;
  provider_used: TTSProvider;
  voice_used: string;
  metadata: {
    original_text_length: number;
    processing_time_ms: number;
    quality_score: number;
    [key: string]: any;
  };
}

export interface AudioFormat {
  format: 'mp3' | 'wav' | 'ogg';
  bitrate: number;
  sample_rate: number;
  channels: number;
}

export class TTSService {
  private elevenlabsService: ElevenLabsService;
  private azureSpeechService: AzureSpeechService;
  private defaultConfig: TTSConfig;
  private audioFormats: Record<TTSProvider, AudioFormat>;

  constructor() {
    this.elevenlabsService = new ElevenLabsService();
    this.azureSpeechService = new AzureSpeechService();
    this.defaultConfig = {
      provider: 'azure',
      voice_name: 'en-US-AriaNeural',
      language: 'en-US',
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0
    };

    this.audioFormats = {
      elevenlabs: {
        format: 'mp3',
        bitrate: 128,
        sample_rate: 44100,
        channels: 1
      },
      azure: {
        format: 'mp3',
        bitrate: 128,
        sample_rate: 22050,
        channels: 1
      }
    };
  }

  /**
   * Generate audio from text using the specified TTS provider
   */
  async generateAudio(
    text: string,
    config: Partial<TTSConfig> = {}
  ): Promise<TTSResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    // Validate input text
    if (!text || text.trim().length === 0) {
      throw new Error('Text input cannot be empty');
    }
    
    // Handle voice_id to voice_name mapping for Azure Speech
    if (config.voice_id && !config.voice_name) {
      mergedConfig.voice_name = config.voice_id;
    }

    try {
      logger.info(`Generating TTS audio for ${text.length} characters using ${mergedConfig.provider}`);

      let result: TTSResult;

      if (mergedConfig.provider === 'elevenlabs') {
        result = await this.generateWithElevenLabs(text, mergedConfig);
      } else if (mergedConfig.provider === 'azure') {
        result = await this.generateWithAzure(text, mergedConfig);
      } else {
        throw new Error(`Unsupported TTS provider: ${mergedConfig.provider}`);
      }

      const processingTime = Date.now() - startTime;
      result.metadata.processing_time_ms = processingTime;

      logger.info(`TTS generation completed in ${processingTime}ms using ${result.provider_used}`);
      return result;
    } catch (error) {
      logger.error('TTS generation failed:', error);
      
      // Don't fallback for empty text errors - these should be thrown
      if (error instanceof Error && error.message.includes('Text input cannot be empty')) {
        throw error;
      }
      
      // Try fallback provider if primary fails
      if (mergedConfig.provider === 'elevenlabs') {
        logger.info('ElevenLabs failed, trying Azure TTS fallback');
        return await this.generateWithFallback(text, 'azure', mergedConfig);
      } else if (mergedConfig.provider === 'azure') {
        logger.info('Azure TTS failed, trying ElevenLabs fallback');
        return await this.generateWithFallback(text, 'elevenlabs', mergedConfig);
      }
      
      throw error;
    }
  }

  /**
   * Generate audio with automatic provider selection and fallback
   */
  async generateAudioWithFallback(
    text: string,
    preferredProvider: TTSProvider = 'azure',
    config: Partial<TTSConfig> = {}
  ): Promise<TTSResult> {
    const mergedConfig = { ...this.defaultConfig, ...config, provider: preferredProvider };

    try {
      return await this.generateAudio(text, mergedConfig);
    } catch (error) {
      logger.warn(`Primary TTS provider ${preferredProvider} failed, trying fallback`);
      
      const fallbackProvider = preferredProvider === 'elevenlabs' ? 'azure' : 'elevenlabs';
      const fallbackConfig = { ...mergedConfig, provider: fallbackProvider as TTSProvider };
      
      return await this.generateAudio(text, fallbackConfig);
    }
  }

  /**
   * Generate audio using ElevenLabs
   */
  private async generateWithElevenLabs(text: string, config: TTSConfig): Promise<TTSResult> {
    try {
      logger.info('Generating audio with ElevenLabs');
      
      // Use ElevenLabs service to generate audio
      const audioBuffer = await this.elevenlabsService.generateAudio(text);
      
      // Calculate duration (rough estimate based on text length and speed)
      const estimatedDuration = this.estimateDuration(text, config.speed || 1.0);
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(text, 'elevenlabs');

      const result: TTSResult = {
        audio_buffer: audioBuffer,
        duration_seconds: estimatedDuration,
        file_size_bytes: audioBuffer.length,
        provider_used: 'elevenlabs',
        voice_used: config.voice_id || 'default',
        metadata: {
          original_text_length: text.length,
          processing_time_ms: 0, // Will be set by caller
          quality_score: qualityScore,
          voice_id: config.voice_id,
          language: config.language,
          speed: config.speed,
          pitch: config.pitch,
          volume: config.volume,
          audio_format: this.audioFormats.elevenlabs
        }
      };

      logger.info(`ElevenLabs TTS completed: ${result.duration_seconds}s, ${result.file_size_bytes} bytes`);
      return result;
    } catch (error) {
      logger.error('ElevenLabs TTS generation failed:', error);
      throw new Error(`ElevenLabs TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate audio using Azure TTS
   */
  private async generateWithAzure(text: string, config: TTSConfig): Promise<TTSResult> {
    try {
      logger.info('Generating audio with Azure Speech Services');
      
      // Map voice_id to voice_name for Azure Speech compatibility
      const voiceName = config.voice_name || config.voice_id || 'en-US-AriaNeural';
      
      // Use Azure Speech service to generate audio
      const azureResult = await this.azureSpeechService.generateAudio(
        text, 
        voiceName
      );
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(text, 'azure');

      const result: TTSResult = {
        audio_buffer: azureResult.audioBuffer,
        duration_seconds: azureResult.duration,
        file_size_bytes: azureResult.audioBuffer.length,
        provider_used: 'azure',
        voice_used: azureResult.voiceUsed,
        metadata: {
          original_text_length: text.length,
          processing_time_ms: 0, // Will be set by caller
          quality_score: qualityScore,
          voice_name: azureResult.voiceUsed,
          language: azureResult.language,
          speed: config.speed,
          pitch: config.pitch,
          volume: config.volume,
          audio_format: this.audioFormats.azure,
          format: azureResult.format
        }
      };

      logger.info(`Azure Speech TTS completed: ${result.duration_seconds}s, ${result.file_size_bytes} bytes`);
      return result;
    } catch (error) {
      logger.error('Azure Speech TTS generation failed:', error);
      throw new Error(`Azure Speech TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate audio with fallback provider
   */
  private async generateWithFallback(
    text: string,
    fallbackProvider: TTSProvider,
    originalConfig: TTSConfig
  ): Promise<TTSResult> {
    const fallbackConfig = { ...originalConfig, provider: fallbackProvider };
    
    try {
      return await this.generateAudio(text, fallbackConfig);
    } catch (error) {
      logger.error(`Fallback TTS provider ${fallbackProvider} also failed:`, error);
      throw new Error(`All TTS providers failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate audio duration based on text length and speed
   */
  private estimateDuration(text: string, speed: number): number {
    // Average speaking rate: 150 words per minute
    const wordsPerMinute = 150 * speed;
    const wordCount = text.split(/\s+/).length;
    const durationMinutes = wordCount / wordsPerMinute;
    return Math.max(1, Math.round(durationMinutes * 60)); // Minimum 1 second
  }

  /**
   * Calculate quality score based on text and provider
   */
  private calculateQualityScore(text: string, provider: TTSProvider): number {
    let score = 50; // Base score

    // Adjust based on text length
    if (text.length > 100) score += 10;
    if (text.length > 500) score += 10;
    if (text.length > 1000) score += 10;

    // Adjust based on text quality
    if (text.includes('.')) score += 5; // Has sentences
    if (text.includes('?')) score += 5; // Has questions
    if (text.includes('!')) score += 5; // Has exclamations
    if (text.match(/[A-Z][a-z]+/)) score += 5; // Proper capitalization

    // Adjust based on provider
    if (provider === 'elevenlabs') score += 20; // ElevenLabs is higher quality
    if (provider === 'azure') score += 15; // Azure is good quality

    return Math.min(100, Math.max(0, score));
  }


  /**
   * Get available voices for a provider
   */
  async getAvailableVoices(provider: TTSProvider): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    if (provider === 'elevenlabs') {
      return await this.getElevenLabsVoices();
    } else if (provider === 'azure') {
      return await this.getAzureVoices();
    } else {
      throw new Error(`Unsupported TTS provider: ${provider}`);
    }
  }

  /**
   * Get ElevenLabs voices
   */
  private async getElevenLabsVoices(): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    // TODO: Implement ElevenLabs voices API
    logger.warn('ElevenLabs voices API not implemented, returning mock data');
    
    return [
      { id: 'rachel', name: 'Rachel', language: 'en', gender: 'female' },
      { id: 'drew', name: 'Drew', language: 'en', gender: 'male' },
      { id: 'clyde', name: 'Clyde', language: 'en', gender: 'male' },
      { id: 'paul', name: 'Paul', language: 'en', gender: 'male' },
      { id: 'domi', name: 'Domi', language: 'en', gender: 'female' }
    ];
  }

  /**
   * Get Azure TTS voices
   */
  private async getAzureVoices(): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    try {
      return await this.azureSpeechService.getAvailableVoices();
    } catch (error) {
      logger.error('Failed to get Azure voices:', error);
      // Return fallback voices
      return [
        { id: 'en-US-AriaNeural', name: 'Aria', language: 'en-US', gender: 'female' },
        { id: 'en-US-DavisNeural', name: 'Davis', language: 'en-US', gender: 'male' },
        { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en-US', gender: 'female' },
        { id: 'en-US-GuyNeural', name: 'Guy', language: 'en-US', gender: 'male' },
        { id: 'en-US-AmberNeural', name: 'Amber', language: 'en-US', gender: 'female' }
      ];
    }
  }

  /**
   * Get recommended voice for content type
   */
  getRecommendedVoice(contentType: string, _language: string = 'en'): { provider: TTSProvider; voice_id: string } {
    const recommendations: Record<string, { provider: TTSProvider; voice_id: string }> = {
      'url': { provider: 'elevenlabs', voice_id: 'rachel' },
      'youtube': { provider: 'elevenlabs', voice_id: 'drew' },
      'pdf': { provider: 'elevenlabs', voice_id: 'clyde' },
      'document': { provider: 'elevenlabs', voice_id: 'paul' }
    };

    return recommendations[contentType] || { provider: 'elevenlabs', voice_id: 'rachel' };
  }

  /**
   * Validate TTS configuration
   */
  validateConfig(config: Partial<TTSConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.provider && !['elevenlabs', 'azure'].includes(config.provider)) {
      errors.push('Invalid TTS provider. Must be "elevenlabs" or "azure"');
    }

    if (config.speed && (config.speed < 0.5 || config.speed > 2.0)) {
      errors.push('Speed must be between 0.5 and 2.0');
    }

    if (config.pitch && (config.pitch < 0.5 || config.pitch > 2.0)) {
      errors.push('Pitch must be between 0.5 and 2.0');
    }

    if (config.volume && (config.volume < 0.1 || config.volume > 2.0)) {
      errors.push('Volume must be between 0.1 and 2.0');
    }

    if (config.language && !/^[a-z]{2}-[A-Z]{2}$/.test(config.language)) {
      errors.push('Language must be in format "en-US"');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get TTS service statistics
   */
  async getStats(): Promise<{
    elevenlabs_healthy: boolean;
    azure_healthy: boolean;
    available_voices: {
      elevenlabs: number;
      azure: number;
    };
  }> {
    const elevenlabsHealthy = await this.elevenlabsService.checkHealth();
    const azureHealthy = await this.checkAzureHealth();
    
    const elevenlabsVoices = await this.getElevenLabsVoices();
    const azureVoices = await this.getAzureVoices();

    return {
      elevenlabs_healthy: elevenlabsHealthy,
      azure_healthy: azureHealthy,
      available_voices: {
        elevenlabs: elevenlabsVoices.length,
        azure: azureVoices.length
      }
    };
  }

  /**
   * Check Azure TTS health
   */
  private async checkAzureHealth(): Promise<boolean> {
    try {
      return await this.azureSpeechService.checkHealth();
    } catch (error) {
      logger.error('Azure TTS health check failed:', error);
      return false;
    }
  }

  /**
   * Check overall TTS service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const stats = await this.getStats();
      return stats.elevenlabs_healthy || stats.azure_healthy;
    } catch (error) {
      logger.error('TTS service health check failed:', error);
      return false;
    }
  }
}
