import { logger } from '../utils/logger';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface AzureSpeechConfig {
  subscriptionKey: string;
  region: string;
  voiceName?: string;
  language?: string;
  outputFormat?: string;
}

export interface AzureSpeechResult {
  audioBuffer: Buffer;
  duration: number;
  voiceUsed: string;
  language: string;
  format: string;
}

export class AzureSpeechService {
  private config: AzureSpeechConfig;
  private isHealthy: boolean = true;

  constructor() {
    this.config = {
      subscriptionKey: process.env['AZURE_SPEECH_KEY'] || '',
      region: process.env['AZURE_SPEECH_REGION'] || 'eastus',
      voiceName: process.env['AZURE_SPEECH_VOICE'] || 'en-US-AriaNeural',
      language: process.env['AZURE_SPEECH_LANGUAGE'] || 'en-US',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    };

    if (!this.config.subscriptionKey) {
      logger.warn('Azure Speech not configured - service will not function');
      this.isHealthy = false;
    }
  }

  /**
   * Generate audio from text using Azure Speech Services
   */
  async generateAudio(text: string, voiceName?: string): Promise<AzureSpeechResult> {
    if (!this.isHealthy) {
      throw new Error('Azure Speech service not configured or unhealthy');
    }

    // Validate input text
    if (!text || text.trim().length === 0) {
      throw new Error('Text input cannot be empty');
    }

    try {
      logger.info('Generating audio with Azure Speech Services', {
        textLength: text.length,
        voiceName: voiceName || this.config.voiceName,
        language: this.config.language
      });

      const speechConfig = sdk.SpeechConfig.fromSubscription(
        this.config.subscriptionKey,
        this.config.region
      );

      // Set voice
      const voice = voiceName || this.config.voiceName || 'en-US-AriaNeural';
      speechConfig.speechSynthesisVoiceName = voice;
      // Use lower quality audio to reduce memory usage
      speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      // Create synthesizer
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        synthesizer.speakTextAsync(
          text,
          (result) => {
            const processingTime = Date.now() - startTime;
            
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              logger.info('Azure Speech synthesis completed successfully', {
                duration: result.audioData.byteLength,
                processingTimeMs: processingTime,
                voiceUsed: voice
              });

              // Convert ArrayBuffer to Buffer
              const audioBuffer = Buffer.from(result.audioData);
              
              // Estimate duration (rough calculation)
              const estimatedDuration = this.estimateDuration(text);

              // Clean up synthesizer
              synthesizer.close();

              resolve({
                audioBuffer,
                duration: estimatedDuration,
                voiceUsed: voice,
                language: this.config.language || 'en-US',
                format: 'mp3'
              });
            } else {
              logger.error('Azure Speech synthesis failed', {
                reason: result.reason,
                errorDetails: result.errorDetails
              });
              synthesizer.close(); // Ensure cleanup
              reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
            }
          },
          (error) => {
            logger.error('Azure Speech synthesis error:', error);
            reject(new Error(`Speech synthesis error: ${error}`));
          }
        );
      });
    } catch (error) {
      logger.error('Azure Speech generation failed:', error);
      this.isHealthy = false;
      throw new Error(`Azure Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices for a specific language
   */
  async getAvailableVoices(language?: string): Promise<Array<{ id: string; name: string; language: string; gender: string; style?: string }>> {
    // Azure Speech has many voices, return a curated list
    const voices = [
      // English (US) - Female
      { id: 'en-US-AriaNeural', name: 'Aria', language: 'en-US', gender: 'female', style: 'friendly' },
      { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en-US', gender: 'female', style: 'assistant' },
      { id: 'en-US-AmberNeural', name: 'Amber', language: 'en-US', gender: 'female', style: 'warm' },
      { id: 'en-US-AshleyNeural', name: 'Ashley', language: 'en-US', gender: 'female', style: 'calm' },
      { id: 'en-US-BrandonNeural', name: 'Brandon', language: 'en-US', gender: 'male', style: 'friendly' },
      { id: 'en-US-ChristopherNeural', name: 'Christopher', language: 'en-US', gender: 'male', style: 'calm' },
      { id: 'en-US-DavisNeural', name: 'Davis', language: 'en-US', gender: 'male', style: 'friendly' },
      { id: 'en-US-GuyNeural', name: 'Guy', language: 'en-US', gender: 'male', style: 'conversational' },
      { id: 'en-US-JasonNeural', name: 'Jason', language: 'en-US', gender: 'male', style: 'friendly' },
      { id: 'en-US-RyanNeural', name: 'Ryan', language: 'en-US', gender: 'male', style: 'conversational' },
      
      // English (UK) - Female
      { id: 'en-GB-SoniaNeural', name: 'Sonia', language: 'en-GB', gender: 'female', style: 'friendly' },
      { id: 'en-GB-LibbyNeural', name: 'Libby', language: 'en-GB', gender: 'female', style: 'warm' },
      
      // English (UK) - Male
      { id: 'en-GB-RyanNeural', name: 'Ryan', language: 'en-GB', gender: 'male', style: 'friendly' },
      { id: 'en-GB-ThomasNeural', name: 'Thomas', language: 'en-GB', gender: 'male', style: 'calm' },
    ];

    if (language) {
      return voices.filter(voice => voice.language.startsWith(language));
    }

    return voices;
  }

  /**
   * Check if the service is healthy
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isHealthy) {
      return false;
    }

    try {
      // Try a simple synthesis to test connectivity
      await this.generateAudio('Test', 'en-US-AriaNeural');
      return true;
    } catch (error) {
      logger.error('Azure Speech health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): AzureSpeechConfig {
    return { ...this.config };
  }

  /**
   * Estimate audio duration based on text length
   */
  private estimateDuration(text: string): number {
    // Average speaking rate: 150 words per minute
    const wordCount = text.split(/\s+/).length;
    const durationMinutes = wordCount / 150;
    return Math.max(1, Math.round(durationMinutes * 60)); // Minimum 1 second
  }

  /**
   * Get recommended voice for content type
   */
  getRecommendedVoice(contentType: string, language: string = 'en-US'): string {
    const recommendations: Record<string, string> = {
      'url': 'en-US-AriaNeural',      // Friendly, good for articles
      'youtube': 'en-US-DavisNeural', // Conversational, good for videos
      'pdf': 'en-US-JennyNeural',     // Assistant-like, good for documents
      'document': 'en-US-GuyNeural'   // Conversational, good for documents
    };

    const baseVoice = recommendations[contentType] || 'en-US-AriaNeural';
    
    // Adjust for language if needed
    if (language.startsWith('en-GB')) {
      return baseVoice.replace('en-US', 'en-GB');
    }
    
    return baseVoice;
  }
}
