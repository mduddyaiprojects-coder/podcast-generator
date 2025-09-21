import { logger } from '../utils/logger';

export interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface TTSOptions {
  voiceId?: string;
  voiceName?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
  language?: string;
  outputFormat?: string;
}

export interface TTSResult {
  audioPath: string;
  voiceUsed: string;
  duration?: number;
  fileSize?: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  category: string;
  description?: string;
  fineTuningStatus?: string;
}

export class ElevenLabsService {
  private config: ElevenLabsConfig;
  private isHealthy: boolean = true;

  constructor() {
    this.config = {
      apiKey: process.env['ELEVENLABS_API_KEY'] || '',
      baseUrl: process.env['ELEVENLABS_BASE_URL'] || 'https://api.elevenlabs.io'
    };

    if (!this.config.apiKey) {
      logger.warn('ElevenLabs API key not configured - service will not function');
      this.isHealthy = false;
    }
  }

  /**
   * Check if the ElevenLabs service is healthy and configured
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isHealthy) {
      return false;
    }

    try {
      // We can't directly call the MCP tools from here, but we can validate configuration
      logger.info('ElevenLabs service health check passed');
      return true;
    } catch (error) {
      logger.error('ElevenLabs health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Generate speech from text using ElevenLabs
   * Note: This method is designed to work with the MCP server integration
   * The actual TTS generation will be handled by the MCP tools in the Azure Functions
   */
  async generateSpeech(
    text: string, 
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    if (!this.isHealthy) {
      throw new Error('ElevenLabs service not configured or unhealthy');
    }

    try {
      logger.info('Generating speech with ElevenLabs', {
        textLength: text.length,
        voiceName: options.voiceName || 'default',
        modelId: options.modelId || 'eleven_multilingual_v2'
      });

      // This method will be called from Azure Functions that have access to MCP tools
      // The actual implementation will use the MCP tools in the function handlers
      throw new Error('This method should be called from Azure Functions with MCP access');
    } catch (error) {
      logger.error('ElevenLabs speech generation failed:', error);
      this.isHealthy = false;
      throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate audio from text using ElevenLabs
   * This is the method expected by the existing TTS service integration
   */
  async generateAudio(
    text: string,
    options: TTSOptions = {}
  ): Promise<Buffer> {
    if (!this.isHealthy) {
      throw new Error('ElevenLabs service not configured or unhealthy');
    }

    try {
      logger.info('Generating audio with ElevenLabs', {
        textLength: text.length,
        voiceName: options.voiceName || 'default',
        modelId: options.modelId || 'eleven_multilingual_v2'
      });

      // This method will be called from Azure Functions that have access to MCP tools
      // The actual implementation will use the MCP tools in the function handlers
      throw new Error('This method should be called from Azure Functions with MCP access');
    } catch (error) {
      logger.error('ElevenLabs audio generation failed:', error);
      this.isHealthy = false;
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices
   * Note: This method is designed to work with the MCP server integration
   */
  async getVoices(): Promise<VoiceInfo[]> {
    if (!this.isHealthy) {
      throw new Error('ElevenLabs service not configured or unhealthy');
    }

    try {
      logger.info('Fetching available voices from ElevenLabs');
      
      // This method will be called from Azure Functions that have access to MCP tools
      // The actual implementation will use the MCP tools in the function handlers
      throw new Error('This method should be called from Azure Functions with MCP access');
    } catch (error) {
      logger.error('ElevenLabs voice fetching failed:', error);
      this.isHealthy = false;
      throw new Error(`Voice fetching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for voices by name or description
   */
  async searchVoices(query: string): Promise<VoiceInfo[]> {
    if (!this.isHealthy) {
      throw new Error('ElevenLabs service not configured or unhealthy');
    }

    try {
      logger.info('Searching voices with ElevenLabs', { query });
      
      // This method will be called from Azure Functions that have access to MCP tools
      // The actual implementation will use the MCP tools in the function handlers
      throw new Error('This method should be called from Azure Functions with MCP access');
    } catch (error) {
      logger.error('ElevenLabs voice search failed:', error);
      this.isHealthy = false;
      throw new Error(`Voice search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default TTS options optimized for podcast generation
   */
  getDefaultPodcastOptions(): TTSOptions {
    return {
      voiceName: 'Adam', // Professional, clear voice
      modelId: 'eleven_multilingual_v2', // High quality multilingual model
      stability: 0.5, // Balanced stability for natural speech
      similarityBoost: 0.75, // Good voice consistency
      style: 0.0, // Neutral style for podcast content
      useSpeakerBoost: true, // Enhanced voice clarity
      speed: 1.0, // Normal speaking speed
      language: 'en', // English
      outputFormat: 'mp3_44100_128' // High quality MP3
    };
  }

  /**
   * Get configuration for different podcast styles
   */
  getPodcastStyleOptions(style: 'news' | 'conversational' | 'dramatic' | 'educational'): TTSOptions {
    const baseOptions = this.getDefaultPodcastOptions();

    switch (style) {
      case 'news':
        return {
          ...baseOptions,
          voiceName: 'Adam',
          stability: 0.6,
          speed: 1.1,
          style: 0.1
        };
      
      case 'conversational':
        return {
          ...baseOptions,
          voiceName: 'Bella',
          stability: 0.4,
          speed: 0.9,
          style: 0.2
        };
      
      case 'dramatic':
        return {
          ...baseOptions,
          voiceName: 'Antoni',
          stability: 0.3,
          speed: 0.8,
          style: 0.4
        };
      
      case 'educational':
        return {
          ...baseOptions,
          voiceName: 'Elli',
          stability: 0.7,
          speed: 0.95,
          style: 0.0
        };
      
      default:
        return baseOptions;
    }
  }

  /**
   * Validate text for TTS generation
   */
  validateText(text: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!text || text.trim().length === 0) {
      issues.push('Text cannot be empty');
    }

    if (text.length > 5000) {
      issues.push('Text is too long (max 5000 characters)');
    }

    if (text.length < 10) {
      issues.push('Text is too short (min 10 characters)');
    }

    // Check for potentially problematic characters
    const problematicChars = /[^\w\s.,!?;:'"()-]/g;
    const matches = text.match(problematicChars);
    if (matches && matches.length > 0) {
      issues.push(`Text contains potentially problematic characters: ${matches.slice(0, 5).join(', ')}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get service status and configuration info
   */
  getServiceInfo(): { isHealthy: boolean; config: Partial<ElevenLabsConfig> } {
    return {
      isHealthy: this.isHealthy,
      config: {
        apiKey: this.config.apiKey ? '***configured***' : 'not configured',
        baseUrl: this.config.baseUrl
      }
    };
  }
}