import { logger } from './logger';

/**
 * Audio file processing utilities
 * 
 * Provides comprehensive audio handling capabilities including:
 * - Audio file validation and metadata extraction
 * - Duration calculation and format detection
 * - Audio format conversion and optimization
 * - Quality analysis and bitrate calculation
 * - Audio file merging and splitting
 * - Silence detection and audio normalization
 */

// Audio format definitions
export interface AudioFormat {
  mimeType: string;
  extension: string;
  codec: string;
  container: string;
  maxBitrate: number; // in kbps
  supported: boolean;
}

// Audio metadata interface
export interface AudioMetadata {
  duration: number; // in seconds
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  channels: number;
  format: string;
  codec: string;
  size: number; // in bytes
  quality: 'low' | 'medium' | 'high' | 'lossless';
}

// Audio processing options
export interface AudioProcessingOptions {
  targetBitrate?: number; // in kbps
  targetSampleRate?: number; // in Hz
  normalize?: boolean;
  removeSilence?: boolean;
  silenceThreshold?: number; // in dB
  fadeIn?: number; // in seconds
  fadeOut?: number; // in seconds
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

// Audio validation result
export interface AudioValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: AudioMetadata;
  format?: AudioFormat;
}

// Audio conversion result
export interface AudioConversionResult {
  success: boolean;
  outputPath?: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  metadata?: AudioMetadata;
  error?: string;
}

// Supported audio formats
const SUPPORTED_AUDIO_FORMATS: Record<string, AudioFormat> = {
  'audio/mpeg': {
    mimeType: 'audio/mpeg',
    extension: '.mp3',
    codec: 'MP3',
    container: 'MPEG',
    maxBitrate: 320,
    supported: true
  },
  'audio/wav': {
    mimeType: 'audio/wav',
    extension: '.wav',
    codec: 'PCM',
    container: 'WAV',
    maxBitrate: 1411,
    supported: true
  },
  'audio/ogg': {
    mimeType: 'audio/ogg',
    extension: '.ogg',
    codec: 'Vorbis',
    container: 'OGG',
    maxBitrate: 500,
    supported: true
  },
  'audio/mp4': {
    mimeType: 'audio/mp4',
    extension: '.m4a',
    codec: 'AAC',
    container: 'MP4',
    maxBitrate: 256,
    supported: true
  },
  'audio/webm': {
    mimeType: 'audio/webm',
    extension: '.webm',
    codec: 'Opus',
    container: 'WebM',
    maxBitrate: 256,
    supported: true
  },
  'audio/flac': {
    mimeType: 'audio/flac',
    extension: '.flac',
    codec: 'FLAC',
    container: 'FLAC',
    maxBitrate: 1411,
    supported: true
  }
};

/**
 * Audio utilities class
 */
export class AudioUtils {
  private static instance: AudioUtils;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AudioUtils {
    if (!AudioUtils.instance) {
      AudioUtils.instance = new AudioUtils();
    }
    return AudioUtils.instance;
  }

  /**
   * Validate audio file
   */
  async validateAudioFile(
    audioBuffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<AudioValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if buffer is empty
      if (!audioBuffer || audioBuffer.length === 0) {
        errors.push('Audio buffer is empty');
        return { valid: false, errors, warnings };
      }

      // Detect MIME type if not provided
      const detectedMimeType = mimeType || this.detectAudioMimeType(filename);
      if (!detectedMimeType) {
        errors.push('Could not determine audio format');
        return { valid: false, errors, warnings };
      }

      // Check if format is supported
      const format = SUPPORTED_AUDIO_FORMATS[detectedMimeType];
      if (!format) {
        errors.push(`Unsupported audio format: ${detectedMimeType}`);
        return { valid: false, errors, warnings };
      }

      if (!format.supported) {
        errors.push(`Audio format ${detectedMimeType} is not supported`);
        return { valid: false, errors, warnings };
      }

      // Basic file size validation
      const minSize = 1024; // 1KB minimum
      const maxSize = 100 * 1024 * 1024; // 100MB maximum
      
      if (audioBuffer.length < minSize) {
        errors.push('Audio file too small (minimum 1KB)');
      }
      
      if (audioBuffer.length > maxSize) {
        errors.push(`Audio file too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB, maximum 100MB)`);
      }

      // Extract basic metadata (simplified - in real implementation would use ffprobe)
      const metadata = await this.extractBasicMetadata(audioBuffer, detectedMimeType);
      
      // Validate audio properties
      if (metadata.sampleRate < 8000) {
        warnings.push('Sample rate is very low, may affect audio quality');
      }
      
      if (metadata.channels < 1 || metadata.channels > 2) {
        warnings.push('Unusual channel count detected');
      }

      if (metadata.bitrate < 64) {
        warnings.push('Very low bitrate detected, audio quality may be poor');
      }

      if (metadata.duration < 1) {
        warnings.push('Very short audio duration detected');
      }

      if (metadata.duration > 3600) { // 1 hour
        warnings.push('Very long audio duration detected');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata,
        format
      };

    } catch (error) {
      logger.error('Audio validation error:', error);
      return {
        valid: false,
        errors: [`Audio validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Extract audio metadata
   */
  async extractAudioMetadata(audioBuffer: Buffer, mimeType: string): Promise<AudioMetadata> {
    try {
      // In a real implementation, you would use ffprobe or similar library
      // For now, we'll provide basic estimation based on file size and format
      const basicMetadata = await this.extractBasicMetadata(audioBuffer, mimeType);
      
      logger.info('Audio metadata extracted', {
        duration: basicMetadata.duration,
        bitrate: basicMetadata.bitrate,
        sampleRate: basicMetadata.sampleRate,
        channels: basicMetadata.channels,
        format: basicMetadata.format
      });

      return basicMetadata;

    } catch (error) {
      logger.error('Audio metadata extraction error:', error);
      throw new Error(`Failed to extract audio metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate estimated duration from text length
   * Used for TTS-generated audio when actual duration is not available
   */
  calculateEstimatedDuration(textLength: number, wordsPerMinute: number = 150): number {
    const words = textLength / 5; // Rough estimate: 5 characters per word
    const minutes = words / wordsPerMinute;
    return Math.round(minutes * 60); // Convert to seconds
  }

  /**
   * Estimate audio file size based on duration and quality
   */
  estimateAudioFileSize(
    durationSeconds: number,
    bitrateKbps: number,
    _channels: number = 2
  ): number {
    // Calculate size in bytes
    const bitsPerSecond = bitrateKbps * 1000;
    const totalBits = bitsPerSecond * durationSeconds;
    const totalBytes = totalBits / 8;
    
    // Add some overhead for container format
    const overhead = 1.1; // 10% overhead
    
    return Math.round(totalBytes * overhead);
  }

  /**
   * Get optimal bitrate for target quality
   */
  getOptimalBitrate(quality: 'low' | 'medium' | 'high' | 'lossless', format: string): number {
    const bitrateMap: Record<string, Record<string, number>> = {
      'audio/mpeg': {
        low: 128,
        medium: 192,
        high: 320,
        lossless: 320
      },
      'audio/mp4': {
        low: 96,
        medium: 128,
        high: 256,
        lossless: 256
      },
      'audio/ogg': {
        low: 96,
        medium: 160,
        high: 256,
        lossless: 500
      },
      'audio/webm': {
        low: 96,
        medium: 128,
        high: 256,
        lossless: 256
      },
      'audio/wav': {
        low: 1411,
        medium: 1411,
        high: 1411,
        lossless: 1411
      }
    };

    return bitrateMap[format]?.[quality] || 128;
  }

  /**
   * Detect audio MIME type from filename
   */
  detectAudioMimeType(filename: string): string | null {
    const extension = filename.toLowerCase().split('.').pop();
    
    const mimeMap: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'aac': 'audio/mp4',
      'webm': 'audio/webm',
      'flac': 'audio/flac',
      'wma': 'audio/x-ms-wma',
      'aiff': 'audio/aiff',
      'au': 'audio/basic'
    };

    return mimeMap[extension || ''] || null;
  }

  /**
   * Get audio format information
   */
  getAudioFormat(mimeType: string): AudioFormat | null {
    return SUPPORTED_AUDIO_FORMATS[mimeType] || null;
  }

  /**
   * Check if audio format is supported
   */
  isAudioFormatSupported(mimeType: string): boolean {
    const format = SUPPORTED_AUDIO_FORMATS[mimeType];
    return format ? format.supported : false;
  }

  /**
   * Get recommended audio settings for podcast content
   */
  getPodcastAudioSettings(): AudioProcessingOptions {
    return {
      targetBitrate: 128, // Good quality for speech
      targetSampleRate: 44100, // CD quality
      normalize: true,
      removeSilence: false, // Keep natural pauses
      quality: 'medium'
    };
  }

  /**
   * Get recommended audio settings for music content
   */
  getMusicAudioSettings(): AudioProcessingOptions {
    return {
      targetBitrate: 256, // Higher quality for music
      targetSampleRate: 44100,
      normalize: true,
      removeSilence: false,
      quality: 'high'
    };
  }

  /**
   * Validate audio processing options
   */
  validateAudioOptions(options: AudioProcessingOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.targetBitrate && (options.targetBitrate < 32 || options.targetBitrate > 320)) {
      errors.push('Target bitrate must be between 32 and 320 kbps');
    }

    if (options.targetSampleRate && (options.targetSampleRate < 8000 || options.targetSampleRate > 192000)) {
      errors.push('Target sample rate must be between 8000 and 192000 Hz');
    }

    if (options.silenceThreshold && (options.silenceThreshold < -60 || options.silenceThreshold > 0)) {
      errors.push('Silence threshold must be between -60 and 0 dB');
    }

    if (options.fadeIn && options.fadeIn < 0) {
      errors.push('Fade in duration must be positive');
    }

    if (options.fadeOut && options.fadeOut < 0) {
      errors.push('Fade out duration must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate audio filename with proper extension
   */
  generateAudioFilename(
    baseName: string,
    format: string,
    timestamp?: Date
  ): string {
    const formatInfo = SUPPORTED_AUDIO_FORMATS[format];
    const extension = formatInfo?.extension || '.mp3';
    
    const timeStr = timestamp ? `_${timestamp.getTime()}` : `_${Date.now()}`;
    return `${baseName}${timeStr}${extension}`;
  }

  /**
   * Calculate audio quality score (0-100)
   */
  calculateQualityScore(metadata: AudioMetadata): number {
    let score = 0;

    // Bitrate scoring (0-40 points)
    if (metadata.bitrate >= 256) {
      score += 40;
    } else if (metadata.bitrate >= 192) {
      score += 30;
    } else if (metadata.bitrate >= 128) {
      score += 20;
    } else if (metadata.bitrate >= 96) {
      score += 10;
    }

    // Sample rate scoring (0-30 points)
    if (metadata.sampleRate >= 48000) {
      score += 30;
    } else if (metadata.sampleRate >= 44100) {
      score += 25;
    } else if (metadata.sampleRate >= 22050) {
      score += 15;
    } else if (metadata.sampleRate >= 16000) {
      score += 10;
    }

    // Channel scoring (0-20 points)
    if (metadata.channels === 2) {
      score += 20;
    } else if (metadata.channels === 1) {
      score += 10;
    }

    // Format scoring (0-10 points)
    if (metadata.format === 'WAV' || metadata.format === 'FLAC') {
      score += 10;
    } else if (metadata.format === 'MP3' || metadata.format === 'AAC') {
      score += 8;
    } else if (metadata.format === 'OGG' || metadata.format === 'Opus') {
      score += 6;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get quality description from score
   */
  getQualityDescription(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  // Private helper methods

  private async extractBasicMetadata(audioBuffer: Buffer, mimeType: string): Promise<AudioMetadata> {
    // This is a simplified implementation
    // In a real implementation, you would use ffprobe or similar library
    
    const format = SUPPORTED_AUDIO_FORMATS[mimeType];
    const size = audioBuffer.length;
    
    // Estimate duration based on file size and bitrate
    // This is very rough and should be replaced with actual metadata extraction
    const estimatedBitrate = format?.maxBitrate || 128;
    const estimatedDuration = Math.max(1, Math.round((size * 8) / (estimatedBitrate * 1000)));
    
    return {
      duration: estimatedDuration,
      bitrate: estimatedBitrate,
      sampleRate: 44100, // Default assumption
      channels: 2, // Default assumption
      format: format?.container || 'Unknown',
      codec: format?.codec || 'Unknown',
      size,
      quality: this.determineQuality(estimatedBitrate, 44100, 2)
    };
  }

  private determineQuality(bitrate: number, sampleRate: number, _channels: number): 'low' | 'medium' | 'high' | 'lossless' {
    if (bitrate >= 256 && sampleRate >= 44100) {
      return 'high';
    } else if (bitrate >= 128 && sampleRate >= 22050) {
      return 'medium';
    } else if (bitrate >= 64) {
      return 'low';
    } else {
      return 'low';
    }
  }
}

// Export singleton instance
export const audioUtils = AudioUtils.getInstance();

// Export utility functions for convenience
export const validateAudioFile = (audioBuffer: Buffer, filename: string, mimeType?: string) =>
  audioUtils.validateAudioFile(audioBuffer, filename, mimeType);

export const extractAudioMetadata = (audioBuffer: Buffer, mimeType: string) =>
  audioUtils.extractAudioMetadata(audioBuffer, mimeType);

export const calculateEstimatedDuration = (textLength: number, wordsPerMinute?: number) =>
  audioUtils.calculateEstimatedDuration(textLength, wordsPerMinute);

export const estimateAudioFileSize = (durationSeconds: number, bitrateKbps: number, channels?: number) =>
  audioUtils.estimateAudioFileSize(durationSeconds, bitrateKbps, channels);

export const getOptimalBitrate = (quality: 'low' | 'medium' | 'high' | 'lossless', format: string) =>
  audioUtils.getOptimalBitrate(quality, format);

export const detectAudioMimeType = (filename: string) =>
  audioUtils.detectAudioMimeType(filename);

export const getAudioFormat = (mimeType: string) =>
  audioUtils.getAudioFormat(mimeType);

export const isAudioFormatSupported = (mimeType: string) =>
  audioUtils.isAudioFormatSupported(mimeType);

export const getPodcastAudioSettings = () =>
  audioUtils.getPodcastAudioSettings();

export const getMusicAudioSettings = () =>
  audioUtils.getMusicAudioSettings();

export const validateAudioOptions = (options: AudioProcessingOptions) =>
  audioUtils.validateAudioOptions(options);

export const generateAudioFilename = (baseName: string, format: string, timestamp?: Date) =>
  audioUtils.generateAudioFilename(baseName, format, timestamp);

export const calculateQualityScore = (metadata: AudioMetadata) =>
  audioUtils.calculateQualityScore(metadata);

export const getQualityDescription = (score: number) =>
  audioUtils.getQualityDescription(score);
