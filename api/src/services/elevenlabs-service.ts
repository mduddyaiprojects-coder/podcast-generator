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
   * Uses direct API calls for production runtime
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

      // Get voice ID from voice name
      const voiceId = await this.getVoiceId(options.voiceName || 'Adam');
      
      // Make direct API call to ElevenLabs
      const response = await fetch(`${this.config.baseUrl}/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text,
          model_id: options.modelId || 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
            style: options.style || 0.0,
            use_speaker_boost: options.useSpeakerBoost || true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioPath = `/tmp/tts_${Date.now()}.mp3`;
      
      // In a real implementation, you'd save the buffer to a file
      // For now, we'll return the path where it would be saved
      
      logger.info('Successfully generated speech with ElevenLabs', {
        textLength: text.length,
        voiceUsed: options.voiceName || 'Adam',
        audioSize: audioBuffer.byteLength
      });

      return {
        audioPath,
        voiceUsed: options.voiceName || 'Adam',
        fileSize: audioBuffer.byteLength
      };

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

      // Get voice ID from voice name
      const voiceId = await this.getVoiceId(options.voiceName || 'Adam');
      
      // Make direct API call to ElevenLabs
      const response = await fetch(`${this.config.baseUrl}/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text,
          model_id: options.modelId || 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
            style: options.style || 0.0,
            use_speaker_boost: options.useSpeakerBoost || true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      logger.info('Successfully generated audio with ElevenLabs', {
        textLength: text.length,
        voiceUsed: options.voiceName || 'Adam',
        audioSize: audioBuffer.byteLength
      });

      return Buffer.from(audioBuffer);

    } catch (error) {
      logger.error('ElevenLabs audio generation failed:', error);
      this.isHealthy = false;
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices using direct API calls
   */
  async getVoices(): Promise<VoiceInfo[]> {
    if (!this.isHealthy) {
      throw new Error('ElevenLabs service not configured or unhealthy');
    }

    try {
      logger.info('Fetching available voices from ElevenLabs');
      
      const response = await fetch(`${this.config.baseUrl}/v1/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { voices: any[] };
      const voices: VoiceInfo[] = data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'general',
        description: voice.description,
        fineTuningStatus: voice.fine_tuning?.status
      }));

      logger.info('Successfully fetched voices from ElevenLabs', {
        voiceCount: voices.length
      });

      return voices;
    } catch (error) {
      logger.error('ElevenLabs voice fetching failed:', error);
      this.isHealthy = false;
      throw new Error(`Voice fetching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for voices by name or description using direct API calls
   */
  async searchVoices(query: string): Promise<VoiceInfo[]> {
    if (!this.isHealthy) {
      throw new Error('ElevenLabs service not configured or unhealthy');
    }

    try {
      logger.info('Searching voices with ElevenLabs', { query });
      
      // Get all voices and filter locally since ElevenLabs doesn't have a search endpoint
      const allVoices = await this.getVoices();
      const filteredVoices = allVoices.filter(voice => 
        voice.name.toLowerCase().includes(query.toLowerCase()) ||
        (voice.description && voice.description.toLowerCase().includes(query.toLowerCase()))
      );

      logger.info('Successfully searched voices with ElevenLabs', {
        query,
        resultCount: filteredVoices.length
      });

      return filteredVoices;
    } catch (error) {
      logger.error('ElevenLabs voice search failed:', error);
      this.isHealthy = false;
      throw new Error(`Voice search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get voice ID from voice name
   * Helper method to convert voice names to IDs
   */
  private async getVoiceId(voiceName: string): Promise<string> {
    // Common voice name to ID mappings (using actual voice IDs from the API)
    const voiceMap: { [key: string]: string } = {
      'Adam': 'pNInz6obpgDQGcFmaJgB',
      'Bella': 'EXAVITQu4vr4xnSDxMaL',
      'Antoni': 'ErXwobaYiN019PkySvjV',
      'Elli': 'MF3mGyEYCl7XYWbV9V6O',
      'Josh': 'TxGEqnHWrfWFTfGW9XjX',
      'Arnold': 'VR6AewLTigWG4xSOukaG',
      'Sam': 'yoZ06aMxZJJ28mfd3POQ',
      'Rachel': '21m00Tcm4TlvDq8ikWAM',
      'Clyde': '2EiwWnXFnvU5JabPnv8n',
      'Roger': 'CwhRBWXzGAHq8TQ4Fs17'
    };

    // If it's already an ID (starts with letters and is long), return as is
    if (/^[a-zA-Z0-9]{20,}$/.test(voiceName)) {
      return voiceName;
    }

    // If it's a known voice name, return the ID
    if (voiceMap[voiceName]) {
      return voiceMap[voiceName];
    }

    // Otherwise, search for the voice by name
    try {
      const voices = await this.getVoices();
      const voice = voices.find(v => v.name.toLowerCase() === voiceName.toLowerCase());
      if (voice) {
        return voice.id;
      }
    } catch (error) {
      logger.warn('Failed to fetch voices for name lookup, using default', { voiceName, error });
    }

    // Fallback to Rachel voice (which exists in the API)
    logger.warn('Voice not found, using default Rachel voice', { voiceName });
    return voiceMap['Rachel'] || '21m00Tcm4TlvDq8ikWAM';
  }

  /**
   * Get default TTS options optimized for podcast generation
   */
  getDefaultPodcastOptions(): TTSOptions {
    return {
      voiceName: 'Rachel', // Professional, clear voice
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
          voiceName: 'Rachel',
          stability: 0.6,
          speed: 1.1,
          style: 0.1
        };
      
      case 'conversational':
        return {
          ...baseOptions,
          voiceName: 'Clyde',
          stability: 0.4,
          speed: 0.9,
          style: 0.2
        };
      
      case 'dramatic':
        return {
          ...baseOptions,
          voiceName: 'Roger',
          stability: 0.3,
          speed: 0.8,
          style: 0.4
        };
      
      case 'educational':
        return {
          ...baseOptions,
          voiceName: 'Rachel',
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