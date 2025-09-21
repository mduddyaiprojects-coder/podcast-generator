import { WhisperService } from '../../src/services/whisper-service';

// Mock fetch globally
global.fetch = jest.fn();

describe('WhisperService', () => {
  let whisperService: WhisperService;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Reset environment variables
    process.env['AZURE_OPENAI_API_KEY'] = 'test-api-key';
    process.env['AZURE_OPENAI_ENDPOINT'] = 'https://test.openai.azure.com';
    process.env['AZURE_OPENAI_API_VERSION'] = '2024-12-01-preview';

    whisperService = new WhisperService();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(whisperService).toBeDefined();
      expect(whisperService.getServiceInfo().isHealthy).toBe(true);
    });

    it('should mark as unhealthy when API key is missing', () => {
      delete process.env['AZURE_OPENAI_API_KEY'];
      const service = new WhisperService();
      expect(service.getServiceInfo().isHealthy).toBe(false);
    });

    it('should mark as unhealthy when endpoint is missing', () => {
      delete process.env['AZURE_OPENAI_ENDPOINT'];
      const service = new WhisperService();
      expect(service.getServiceInfo().isHealthy).toBe(false);
    });
  });

  describe('checkHealth', () => {
    it('should return true when service is healthy', async () => {
      const isHealthy = await whisperService.checkHealth();
      expect(isHealthy).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      delete process.env['AZURE_OPENAI_API_KEY'];
      const service = new WhisperService();
      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('transcribeAudio', () => {
    const mockAudioBuffer = Buffer.from('mock audio data');

    it('should transcribe audio successfully', async () => {
      const mockResponse = {
        text: 'This is a test transcription.',
        language: 'en',
        duration: 10.5,
        segments: [
          {
            id: 0,
            seek: 0,
            start: 0,
            end: 10.5,
            text: 'This is a test transcription.',
            tokens: [1, 2, 3, 4, 5],
            temperature: 0.0,
            avg_logprob: -0.5,
            compression_ratio: 1.2,
            no_speech_prob: 0.1
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await whisperService.transcribeAudio(mockAudioBuffer);

      expect(result).toEqual({
        text: 'This is a test transcription.',
        language: 'en',
        duration: 10.5,
        segments: mockResponse.segments
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/openai/deployments/whisper/audio/transcriptions'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'api-key': 'test-api-key',
            'Accept': 'application/json'
          }
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid audio format'
      } as Response);

      await expect(whisperService.transcribeAudio(mockAudioBuffer))
        .rejects.toThrow('Audio transcription failed: Azure OpenAI Whisper API error: 400 Bad Request - Invalid audio format');
    });

    it('should throw error when service is unhealthy', async () => {
      delete process.env['AZURE_OPENAI_API_KEY'];
      const service = new WhisperService();

      await expect(service.transcribeAudio(mockAudioBuffer))
        .rejects.toThrow('Whisper service not configured or unhealthy');
    });
  });

  describe('transcribeAudioFile', () => {
    it('should transcribe audio file successfully', async () => {
      const mockResponse = {
        text: 'File transcription test.',
        language: 'en'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      // Mock fs.readFileSync
      const fs = require('fs');
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockReturnValue(Buffer.from('mock file data'));

      const result = await whisperService.transcribeAudioFile('/path/to/audio.mp3');

      expect(result.text).toBe('File transcription test.');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/audio.mp3');

      // Restore original function
      fs.readFileSync = originalReadFileSync;
    });

    it('should handle file read errors', async () => {
      const fs = require('fs');
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(whisperService.transcribeAudioFile('/nonexistent/file.mp3'))
        .rejects.toThrow('File transcription failed: File not found');

      // Restore original function
      fs.readFileSync = originalReadFileSync;
    });
  });

  describe('getDefaultPodcastOptions', () => {
    it('should return optimized options for podcast content', () => {
      const options = whisperService.getDefaultPodcastOptions();

      expect(options).toEqual({
        language: 'en',
        responseFormat: 'verbose_json',
        temperature: 0.0,
        timestampGranularities: ['word', 'segment']
      });
    });
  });

  describe('getContentTypeOptions', () => {
    it('should return podcast-specific options', () => {
      const options = whisperService.getContentTypeOptions('podcast');

      expect(options.language).toBe('en');
      expect(options.prompt).toContain('podcast episode');
    });

    it('should return interview-specific options', () => {
      const options = whisperService.getContentTypeOptions('interview');

      expect(options.language).toBe('en');
      expect(options.prompt).toContain('interview');
    });

    it('should return lecture-specific options', () => {
      const options = whisperService.getContentTypeOptions('lecture');

      expect(options.language).toBe('en');
      expect(options.prompt).toContain('educational lecture');
    });

    it('should return meeting-specific options', () => {
      const options = whisperService.getContentTypeOptions('meeting');

      expect(options.language).toBe('en');
      expect(options.prompt).toContain('meeting recording');
    });
  });

  describe('validateAudioFile', () => {
    it('should validate audio buffer successfully', () => {
      const validBuffer = Buffer.alloc(1024 * 1024); // 1MB
      const result = whisperService.validateAudioFile(validBuffer);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = whisperService.validateAudioFile(emptyBuffer);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Audio buffer is empty');
    });

    it('should reject buffer that is too small', () => {
      const smallBuffer = Buffer.alloc(500); // Less than 1KB
      const result = whisperService.validateAudioFile(smallBuffer);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Audio file too small (minimum 1KB)');
    });

    it('should reject buffer that is too large', () => {
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB
      const result = whisperService.validateAudioFile(largeBuffer);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Audio file too large (26MB). Maximum size is 25MB');
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = whisperService.getServiceInfo();

      expect(info).toEqual({
        isHealthy: true,
        config: {
          apiKey: '***configured***',
          endpoint: 'https://test.openai.azure.com',
          apiVersion: '2024-12-01-preview'
        }
      });
    });
  });
});

