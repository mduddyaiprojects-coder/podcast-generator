import { 
  validateAudioFile, 
  calculateEstimatedDuration,
  getPodcastAudioSettings,
  detectAudioMimeType 
} from '../../src/utils/audio-utils';

describe('AudioUtils', () => {
  describe('validateAudioFile', () => {
    it('should validate a valid MP3 buffer', async () => {
      // Create a larger mock buffer to pass size validation
      const mockMp3Buffer = Buffer.alloc(2048, 'mock mp3 data');
      const result = await validateAudioFile(mockMp3Buffer, 'test.mp3', 'audio/mpeg');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should reject empty buffer', async () => {
      const result = await validateAudioFile(Buffer.alloc(0), 'test.mp3');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Audio buffer is empty');
    });

    it('should reject unsupported format', async () => {
      const mockBuffer = Buffer.from('mock data');
      const result = await validateAudioFile(mockBuffer, 'test.xyz', 'audio/unsupported');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unsupported audio format: audio/unsupported');
    });
  });

  describe('calculateEstimatedDuration', () => {
    it('should calculate duration for text', () => {
      const textLength = 1500; // ~300 words
      const duration = calculateEstimatedDuration(textLength);
      
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBe(120); // 300 words / 150 WPM = 2 minutes = 120 seconds
    });
  });

  describe('getPodcastAudioSettings', () => {
    it('should return podcast-optimized settings', () => {
      const settings = getPodcastAudioSettings();
      
      expect(settings.targetBitrate).toBe(128);
      expect(settings.targetSampleRate).toBe(44100);
      expect(settings.normalize).toBe(true);
      expect(settings.quality).toBe('medium');
    });
  });

  describe('detectAudioMimeType', () => {
    it('should detect MP3 MIME type', () => {
      const mimeType = detectAudioMimeType('test.mp3');
      expect(mimeType).toBe('audio/mpeg');
    });

    it('should detect WAV MIME type', () => {
      const mimeType = detectAudioMimeType('test.wav');
      expect(mimeType).toBe('audio/wav');
    });

    it('should return null for unknown extension', () => {
      const mimeType = detectAudioMimeType('test.xyz');
      expect(mimeType).toBeNull();
    });
  });
});
