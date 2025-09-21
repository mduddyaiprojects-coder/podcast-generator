import { describe, it, expect, beforeEach } from '@jest/globals';
import { ElevenLabsService } from '../../src/services/elevenlabs-service';

describe('ElevenLabsService', () => {
  let elevenLabsService: ElevenLabsService;

  beforeEach(() => {
    // Reset environment variables
    process.env['ELEVENLABS_API_KEY'] = 'test-api-key';
    process.env['ELEVENLABS_BASE_URL'] = 'https://api.elevenlabs.io';
    
    elevenLabsService = new ElevenLabsService();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(elevenLabsService).toBeDefined();
    });

    it('should mark service as unhealthy when API key is missing', () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const service = new ElevenLabsService();
      
      // The service should be marked as unhealthy
      expect(service.getServiceInfo().isHealthy).toBe(false);
    });

    it('should use default base URL when not provided', () => {
      delete process.env['ELEVENLABS_BASE_URL'];
      const service = new ElevenLabsService();
      
      expect(service.getServiceInfo().config.baseUrl).toBe('https://api.elevenlabs.io');
    });
  });

  describe('checkHealth', () => {
    it('should return true when service is healthy', async () => {
      const isHealthy = await elevenLabsService.checkHealth();
      expect(isHealthy).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const service = new ElevenLabsService();
      
      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('generateSpeech', () => {
    it('should throw error when service is unhealthy', async () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const service = new ElevenLabsService();
      
      await expect(service.generateSpeech('test text')).rejects.toThrow('ElevenLabs service not configured or unhealthy');
    });

    it('should throw error indicating MCP access is required', async () => {
      await expect(elevenLabsService.generateSpeech('test text')).rejects.toThrow('This method should be called from Azure Functions with MCP access');
    });
  });

  describe('getVoices', () => {
    it('should throw error when service is unhealthy', async () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const service = new ElevenLabsService();
      
      await expect(service.getVoices()).rejects.toThrow('ElevenLabs service not configured or unhealthy');
    });

    it('should throw error indicating MCP access is required', async () => {
      await expect(elevenLabsService.getVoices()).rejects.toThrow('This method should be called from Azure Functions with MCP access');
    });
  });

  describe('searchVoices', () => {
    it('should throw error when service is unhealthy', async () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const service = new ElevenLabsService();
      
      await expect(service.searchVoices('test')).rejects.toThrow('ElevenLabs service not configured or unhealthy');
    });

    it('should throw error indicating MCP access is required', async () => {
      await expect(elevenLabsService.searchVoices('test')).rejects.toThrow('This method should be called from Azure Functions with MCP access');
    });
  });

  describe('getDefaultPodcastOptions', () => {
    it('should return optimized options for podcast generation', () => {
      const options = elevenLabsService.getDefaultPodcastOptions();
      
      expect(options).toEqual({
        voiceName: 'Adam',
        modelId: 'eleven_multilingual_v2',
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
        speed: 1.0,
        language: 'en',
        outputFormat: 'mp3_44100_128'
      });
    });
  });

  describe('getPodcastStyleOptions', () => {
    it('should return news style options', () => {
      const options = elevenLabsService.getPodcastStyleOptions('news');
      
      expect(options.voiceName).toBe('Adam');
      expect(options.stability).toBe(0.6);
      expect(options.speed).toBe(1.1);
      expect(options.style).toBe(0.1);
    });

    it('should return conversational style options', () => {
      const options = elevenLabsService.getPodcastStyleOptions('conversational');
      
      expect(options.voiceName).toBe('Bella');
      expect(options.stability).toBe(0.4);
      expect(options.speed).toBe(0.9);
      expect(options.style).toBe(0.2);
    });

    it('should return dramatic style options', () => {
      const options = elevenLabsService.getPodcastStyleOptions('dramatic');
      
      expect(options.voiceName).toBe('Antoni');
      expect(options.stability).toBe(0.3);
      expect(options.speed).toBe(0.8);
      expect(options.style).toBe(0.4);
    });

    it('should return educational style options', () => {
      const options = elevenLabsService.getPodcastStyleOptions('educational');
      
      expect(options.voiceName).toBe('Elli');
      expect(options.stability).toBe(0.7);
      expect(options.speed).toBe(0.95);
      expect(options.style).toBe(0.0);
    });
  });

  describe('validateText', () => {
    it('should validate empty text', () => {
      const result = elevenLabsService.validateText('');
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Text cannot be empty');
    });

    it('should validate text that is too short', () => {
      const result = elevenLabsService.validateText('Hi');
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Text is too short (min 10 characters)');
    });

    it('should validate text that is too long', () => {
      const longText = 'a'.repeat(5001);
      const result = elevenLabsService.validateText(longText);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Text is too long (max 5000 characters)');
    });

    it('should validate text with problematic characters', () => {
      const result = elevenLabsService.validateText('Hello @#$% world!');
      
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.includes('problematic characters'))).toBe(true);
    });

    it('should validate good text', () => {
      const result = elevenLabsService.validateText('This is a good podcast script for testing.');
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = elevenLabsService.getServiceInfo();
      
      expect(info.isHealthy).toBe(true);
      expect(info.config.apiKey).toBe('***configured***');
      expect(info.config.baseUrl).toBe('https://api.elevenlabs.io');
    });

    it('should return unhealthy status when API key is missing', () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const service = new ElevenLabsService();
      const info = service.getServiceInfo();
      
      expect(info.isHealthy).toBe(false);
      expect(info.config.apiKey).toBe('not configured');
    });
  });
});
