import { logger } from '../utils/logger';

export interface WhisperConfig {
  apiKey: string;
  endpoint: string;
  apiVersion: string;
}

export interface WhisperTranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WhisperTranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestampGranularities?: ('word' | 'segment')[];
}

export class WhisperService {
  private config: WhisperConfig;
  private isHealthy: boolean = true;

  constructor() {
    this.config = {
      apiKey: process.env['AZURE_OPENAI_API_KEY'] || '',
      endpoint: process.env['AZURE_OPENAI_ENDPOINT'] || '',
      apiVersion: process.env['AZURE_OPENAI_API_VERSION'] || '2024-12-01-preview'
    };

    if (!this.config.apiKey || !this.config.endpoint) {
      logger.warn('Azure OpenAI Whisper not configured - service will not function');
      this.isHealthy = false;
    }
  }

  /**
   * Check the health of the Whisper service
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isHealthy) {
      return false;
    }
    try {
      logger.info('Whisper service health check passed');
      return true;
    } catch (error) {
      logger.error('Whisper health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Transcribe audio file using Azure OpenAI Whisper
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: WhisperTranscriptionOptions = {}
  ): Promise<WhisperTranscriptionResult> {
    if (!this.isHealthy) {
      throw new Error('Whisper service not configured or unhealthy');
    }

    try {
      logger.info('Transcribing audio with Azure OpenAI Whisper', {
        audioSize: audioBuffer.length,
        language: options.language || 'auto',
        responseFormat: options.responseFormat || 'json'
      });

      // Create FormData for file upload
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      formData.append('file', audioBlob, 'audio.mp3');
      
      // Add optional parameters
      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      if (options.responseFormat) {
        formData.append('response_format', options.responseFormat);
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      if (options.timestampGranularities) {
        options.timestampGranularities.forEach(granularity => {
          formData.append('timestamp_granularities[]', granularity);
        });
      }

      // Make API call to Azure OpenAI Whisper
      const response = await fetch(`${this.config.endpoint}/openai/deployments/whisper/audio/transcriptions?api-version=${this.config.apiVersion}`, {
        method: 'POST',
        headers: {
          'api-key': this.config.apiKey,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as any;

      logger.info('Successfully transcribed audio with Azure OpenAI Whisper', {
        textLength: result.text?.length || 0,
        language: result.language,
        duration: result.duration,
        segmentCount: result.segments?.length || 0
      });

      return {
        text: result.text || '',
        language: result.language,
        duration: result.duration,
        segments: result.segments
      };

    } catch (error) {
      logger.error('Whisper transcription failed:', error);
      this.isHealthy = false;
      throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio from file path
   */
  async transcribeAudioFile(
    filePath: string,
    options: WhisperTranscriptionOptions = {}
  ): Promise<WhisperTranscriptionResult> {
    if (!this.isHealthy) {
      throw new Error('Whisper service not configured or unhealthy');
    }

    try {
      logger.info('Transcribing audio file with Azure OpenAI Whisper', {
        filePath,
        language: options.language || 'auto'
      });

      // Read file and convert to buffer
      const fs = await import('fs');
      const audioBuffer = fs.readFileSync(filePath);

      return await this.transcribeAudio(audioBuffer, options);

    } catch (error) {
      logger.error('Whisper file transcription failed:', error);
      this.isHealthy = false;
      throw new Error(`File transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default transcription options optimized for podcast content
   */
  getDefaultPodcastOptions(): WhisperTranscriptionOptions {
    return {
      language: 'en', // English for podcast content
      responseFormat: 'verbose_json', // Get detailed results with segments
      temperature: 0.0, // Deterministic output
      timestampGranularities: ['word', 'segment'] // Get word and segment timestamps
    };
  }

  /**
   * Get configuration for different content types
   */
  getContentTypeOptions(contentType: 'podcast' | 'interview' | 'lecture' | 'meeting'): WhisperTranscriptionOptions {
    const baseOptions = this.getDefaultPodcastOptions();

    switch (contentType) {
      case 'podcast':
        return {
          ...baseOptions,
          language: 'en',
          prompt: 'This is a podcast episode. Please transcribe the spoken content accurately, maintaining natural speech patterns and proper punctuation.'
        };
      
      case 'interview':
        return {
          ...baseOptions,
          language: 'en',
          prompt: 'This is an interview. Please transcribe the conversation between the interviewer and interviewee, identifying speaker changes when possible.'
        };
      
      case 'lecture':
        return {
          ...baseOptions,
          language: 'en',
          prompt: 'This is an educational lecture. Please transcribe the content accurately, maintaining academic terminology and structure.'
        };
      
      case 'meeting':
        return {
          ...baseOptions,
          language: 'en',
          prompt: 'This is a meeting recording. Please transcribe the discussion, identifying different speakers when possible.'
        };
      
      default:
        return baseOptions;
    }
  }

  /**
   * Validate audio file for transcription
   */
  validateAudioFile(audioBuffer: Buffer): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    let isValid = true;

    if (!audioBuffer || audioBuffer.length === 0) {
      issues.push('Audio buffer is empty');
      isValid = false;
    }

    // Check file size (25MB limit for Azure OpenAI Whisper)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.length > maxSize) {
      issues.push(`Audio file too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB). Maximum size is 25MB`);
      isValid = false;
    }

    // Check minimum size (1KB)
    if (audioBuffer.length < 1024) {
      issues.push('Audio file too small (minimum 1KB)');
      isValid = false;
    }

    return { isValid, issues };
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      isHealthy: this.isHealthy,
      config: {
        apiKey: this.config.apiKey ? '***configured***' : 'NOT CONFIGURED',
        endpoint: this.config.endpoint,
        apiVersion: this.config.apiVersion
      }
    };
  }
}
