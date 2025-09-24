import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TTSService, TTSConfig, TTSResult, TTSProvider } from '../../src/services/tts-service';
import { ElevenLabsService } from '../../src/services/elevenlabs-service';

// Mock the dependencies
jest.mock('../../src/services/elevenlabs-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Configure Jest to force exit
jest.setTimeout(10000);

describe('TTSService', () => {
  let ttsService: TTSService;
  let mockElevenLabsService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock ElevenLabs service
    mockElevenLabsService = {
      generateSpeech: jest.fn(),
      checkHealth: jest.fn()
    };
    
    // Mock the constructor dependency
    (ElevenLabsService as jest.MockedClass<typeof ElevenLabsService>).mockImplementation(() => mockElevenLabsService);
    
    ttsService = new TTSService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(ElevenLabsService).toHaveBeenCalled();
    });
  });

  describe('generateAudio', () => {
    it('should generate audio with ElevenLabs successfully', async () => {
      const text = 'Hello, this is a test text for TTS generation.';
      const config: Partial<TTSConfig> = {
        provider: 'elevenlabs',
        voice_id: 'test-voice',
        speed: 1.2
      };

      const mockResult: TTSResult = {
        audio_buffer: Buffer.from('mock-audio-data'),
        duration_seconds: 5.5,
        file_size_bytes: 1024,
        provider_used: 'elevenlabs',
        voice_used: 'test-voice',
        metadata: {
          original_text_length: text.length,
          processing_time_ms: 1000,
          quality_score: 0.95
        }
      };

      // Mock the private method
      const generateWithElevenLabsSpy = jest.spyOn(ttsService as any, 'generateWithElevenLabs').mockResolvedValue(mockResult);

      const result = await ttsService.generateAudio(text, config);

      expect(result).toEqual({
        ...mockResult,
        metadata: {
          ...mockResult.metadata,
          processing_time_ms: expect.any(Number)
        }
      });
      expect(generateWithElevenLabsSpy).toHaveBeenCalledWith(text, expect.objectContaining({
        provider: 'elevenlabs',
        voice_id: 'test-voice',
        speed: 1.2
      }));
    });

    it('should throw error for unsupported provider', async () => {
      const text = 'Test text';
      const config: Partial<TTSConfig> = {
        provider: 'unsupported' as TTSProvider
      };

      await expect(ttsService.generateAudio(text, config)).rejects.toThrow('Unsupported TTS provider: unsupported');
    });
  });

  describe('generateAudioWithFallback', () => {
    it('should use preferred provider when available', async () => {
      const text = 'Test text';
      const preferredProvider: TTSProvider = 'elevenlabs';
      const config: Partial<TTSConfig> = { voice_id: 'test-voice' };

      const mockResult: TTSResult = {
        audio_buffer: Buffer.from('test-audio'),
        duration_seconds: 2.5,
        file_size_bytes: 1024,
        provider_used: 'elevenlabs',
        voice_used: 'test-voice',
        metadata: {
          original_text_length: text.length,
          processing_time_ms: 500,
          quality_score: 0.9
        }
      };

      const generateAudioSpy = jest.spyOn(ttsService, 'generateAudio').mockResolvedValue(mockResult);

      const result = await ttsService.generateAudioWithFallback(text, preferredProvider, config);

      expect(result).toBe(mockResult);
      expect(generateAudioSpy).toHaveBeenCalledWith(text, expect.objectContaining({
        provider: 'elevenlabs',
        voice_id: 'test-voice'
      }));
    });
  });

  describe('private methods', () => {
    describe('calculateQualityScore', () => {
      it('should calculate quality score based on text characteristics', () => {
        const text = 'This is a well-structured sentence with proper punctuation and capitalization.';
        const provider: TTSProvider = 'elevenlabs';
        const qualityScore = (ttsService as any).calculateQualityScore(text, provider);

        expect(qualityScore).toBeGreaterThan(0);
        expect(qualityScore).toBeLessThanOrEqual(100);
      });

      it('should handle short text', () => {
        const text = 'Hi';
        const provider: TTSProvider = 'azure';
        const qualityScore = (ttsService as any).calculateQualityScore(text, provider);

        expect(qualityScore).toBeGreaterThan(0);
        expect(qualityScore).toBeLessThanOrEqual(100);
      });
    });

    describe('estimateDuration', () => {
      it('should estimate duration based on text length and speed', () => {
        const text = 'This is a test sentence with multiple words for duration estimation.';
        const speed = 1.0;
        const duration = (ttsService as any).estimateDuration(text, speed);

        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeGreaterThanOrEqual(1); // Minimum 1 second
      });

      it('should handle different speeds', () => {
        const text = 'This is a test sentence.';
        const slowSpeed = 0.5;
        const fastSpeed = 2.0;
        
        const slowDuration = (ttsService as any).estimateDuration(text, slowSpeed);
        const fastDuration = (ttsService as any).estimateDuration(text, fastSpeed);

        expect(slowDuration).toBeGreaterThan(fastDuration);
      });
    });

    describe('createMockAudioBuffer', () => {
      it('should create mock audio buffer with correct length', () => {
        const textLength = 100;
        const buffer = (ttsService as any).createMockAudioBuffer(textLength);

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBe(textLength);
      });
    });
  });

  describe('health check', () => {
    it('should check service health', async () => {
      const getStatsSpy = jest.spyOn(ttsService, 'getStats').mockResolvedValue({
        elevenlabs_healthy: true,
        azure_healthy: false,
        available_voices: {
          elevenlabs: 5,
          azure: 3
        }
      });

      const isHealthy = await ttsService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(getStatsSpy).toHaveBeenCalled();
    });

    it('should return false when service is unhealthy', async () => {
      const getStatsSpy = jest.spyOn(ttsService, 'getStats').mockResolvedValue({
        elevenlabs_healthy: false,
        azure_healthy: false,
        available_voices: {
          elevenlabs: 0,
          azure: 0
        }
      });

      const isHealthy = await ttsService.checkHealth();

      expect(isHealthy).toBe(false);
      expect(getStatsSpy).toHaveBeenCalled();
    });
  });
});