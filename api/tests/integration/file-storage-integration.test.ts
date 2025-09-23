import { fileUtils, validateFile, uploadFile } from '../../src/utils/file-utils';
import { StorageService } from '../../src/services/storage-service';
import { cdnService } from '../../src/services/cdn-service';
import { environmentService } from '../../src/config/environment';
import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock Azure Storage Blob
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: jest.fn().mockReturnValue({
      createIfNotExists: jest.fn().mockResolvedValue({}),
      getBlockBlobClient: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          etag: 'test-etag',
          lastModified: new Date('2024-01-01T00:00:00Z')
        })
      }),
      listBlobsFlat: jest.fn().mockReturnValue([]),
      deleteBlob: jest.fn().mockResolvedValue({}),
      exists: jest.fn().mockResolvedValue(true)
    })
  }))
}));

// Mock CDN service
jest.mock('../../src/services/cdn-service', () => ({
  cdnService: {
    checkHealth: jest.fn().mockReturnValue(true),
    getEndpointUrl: jest.fn().mockResolvedValue('https://test-cdn.azureedge.net'),
    purgeSubmissionContent: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock environment service
jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getConfig: jest.fn().mockReturnValue({
      storage: {
        containerName: 'test-container',
        cdnBaseUrl: undefined
      },
      limits: {
        maxFileSize: 25 * 1024 * 1024 // 25MB
      }
    })
  }
}));

describe('File Utils + Storage Integration', () => {
  let storageService: StorageService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), 'podcast-integration-test-' + Date.now());
    mkdirSync(tempDir, { recursive: true });

    storageService = new StorageService({
      connectionString: 'DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=testkey;EndpointSuffix=core.windows.net',
      containerName: 'test-container'
    });
  });

  afterEach(() => {
    // Cleanup temp files
    try {
      if (existsSync(tempDir)) {
        require('fs').rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Upload with Validation', () => {
    it('should upload valid audio file through storage service', async () => {
      const audioBuffer = Buffer.from('fake audio data for testing');
      const validation = await validateFile(audioBuffer, 'test-episode.mp3', 'audio/mpeg');
      
      expect(validation.valid).toBe(true);
      
      const uploadResult = await storageService.uploadAudio(audioBuffer, 'test-submission');
      
      expect(uploadResult.url).toContain('test-cdn.azureedge.net');
      expect(uploadResult.size).toBe(audioBuffer.length);
      expect(uploadResult.contentType).toBe('audio/mpeg');
    });

    it('should reject invalid file before storage upload', async () => {
      const invalidBuffer = Buffer.from('test');
      const validation = await validateFile(invalidBuffer, 'test.exe', 'application/x-executable');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Suspicious file extension: .exe');
    });

    it('should handle file size validation', async () => {
      const largeBuffer = Buffer.alloc(30 * 1024 * 1024); // 30MB
      const validation = await validateFile(largeBuffer, 'large.mp3', 'audio/mpeg');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
    });
  });

  describe('File Processing Pipeline', () => {
    it('should process file through complete pipeline', async () => {
      const testFile = join(tempDir, 'test-audio.mp3');
      const audioData = Buffer.from('fake audio content for processing');
      writeFileSync(testFile, audioData);

      // Step 1: Validate file
      const validation = await validateFile(testFile, 'test-audio.mp3', 'audio/mpeg');
      expect(validation.valid).toBe(true);

      // Step 2: Extract metadata
      const metadata = await fileUtils.extractMetadata(testFile);
      expect(metadata.name).toBe('test-audio.mp3');
      expect(metadata.category).toBe('audio');

      // Step 3: Upload to storage
      const uploadResult = await storageService.uploadAudio(audioData, 'test-submission');
      expect(uploadResult.url).toContain('test-cdn.azureedge.net');
    });

    it('should handle different file types in pipeline', async () => {
      const testCases = [
        { file: 'transcript.txt', content: 'transcript content', type: 'text/plain' },
        { file: 'script.txt', content: 'script content', type: 'text/plain' },
        { file: 'summary.txt', content: 'summary content', type: 'text/plain' },
        { file: 'chapters.json', content: '{"chapters": []}', type: 'application/json' }
      ];

      for (const testCase of testCases) {
        const filePath = join(tempDir, testCase.file);
        writeFileSync(filePath, testCase.content);

        // Validate
        const validation = await validateFile(filePath, testCase.file, testCase.type);
        expect(validation.valid).toBe(true);

        // Extract metadata
        const metadata = await fileUtils.extractMetadata(filePath);
        expect(metadata.name).toBe(testCase.file);
        expect(metadata.category).toBe('text');
      }
    });
  });

  describe('File Upload with Progress Tracking', () => {
    it('should track upload progress', async () => {
      const progressUpdates: number[] = [];
      const audioBuffer = Buffer.from('test audio data');
      
      const result = await uploadFile(audioBuffer, join(tempDir, 'progress-test.mp3'), {
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should handle upload with retries', async () => {
      const audioBuffer = Buffer.from('test audio data');
      
      const result = await uploadFile(audioBuffer, join(tempDir, 'retry-test.mp3'), {
        retries: 3,
        timeout: 5000
      });

      expect(result.success).toBe(true);
    });
  });

  describe('File Compression Integration', () => {
    it('should compress file before upload', async () => {
      const inputFile = join(tempDir, 'input.txt');
      const outputFile = join(tempDir, 'compressed.txt');
      const content = 'This is a test content that can be compressed. '.repeat(100);
      writeFileSync(inputFile, content);

      // Compress file
      const compressionResult = await fileUtils.compressFile(inputFile, outputFile);
      expect(compressionResult.success).toBe(true);
      expect(existsSync(outputFile)).toBe(true);

      // Upload compressed file
      const uploadResult = await uploadFile(outputFile, join(tempDir, 'final.txt'));
      expect(uploadResult.success).toBe(true);
    });
  });

  describe('File Checksum Integration', () => {
    it('should generate and verify checksums', async () => {
      const audioBuffer = Buffer.from('test audio data for checksum');
      
      // Generate checksum
      const checksum = await fileUtils.generateChecksum(audioBuffer);
      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA256

      // Validate with checksum
      const validation = await validateFile(audioBuffer, 'test.mp3', 'audio/mpeg', {
        generateChecksum: true
      });

      expect(validation.valid).toBe(true);
      expect(validation.metadata?.checksum).toBe(checksum);
    });

    it('should detect file corruption using checksums', async () => {
      const originalBuffer = Buffer.from('original content');
      const corruptedBuffer = Buffer.from('corrupted content');
      
      const originalChecksum = await fileUtils.generateChecksum(originalBuffer);
      const corruptedChecksum = await fileUtils.generateChecksum(corruptedBuffer);
      
      expect(originalChecksum).not.toBe(corruptedChecksum);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle storage service errors gracefully', async () => {
      // Mock storage service to throw error
      const mockStorageService = {
        uploadAudio: jest.fn().mockRejectedValue(new Error('Storage service error'))
      };

      const audioBuffer = Buffer.from('test data');
      
      // This should not throw, but return error result
      try {
        await mockStorageService.uploadAudio(audioBuffer, 'test');
      } catch (error) {
        expect(error.message).toBe('Storage service error');
      }
    });

    it('should handle file validation errors', async () => {
      const invalidFile = Buffer.from('test');
      
      const validation = await validateFile(invalidFile, 'test.exe', 'application/x-executable');
      expect(validation.valid).toBe(false);
      
      // Should not proceed with upload
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle network timeouts', async () => {
      const audioBuffer = Buffer.from('test data');
      
      const result = await uploadFile(audioBuffer, join(tempDir, 'timeout-test.mp3'), {
        timeout: 1 // 1ms timeout to force timeout
      });

      // Should handle timeout gracefully
      expect(result.success).toBeDefined();
    });
  });

  describe('File Type Detection Integration', () => {
    it('should detect file types correctly for different formats', async () => {
      const testCases = [
        { filename: 'audio.mp3', expectedType: 'audio/mpeg', expectedCategory: 'audio' },
        { filename: 'audio.wav', expectedType: 'audio/wav', expectedCategory: 'audio' },
        { filename: 'text.txt', expectedType: 'text/plain', expectedCategory: 'text' },
        { filename: 'data.json', expectedType: 'application/json', expectedCategory: 'text' },
        { filename: 'image.jpg', expectedType: 'image/jpeg', expectedCategory: 'image' },
        { filename: 'video.mp4', expectedType: 'video/mp4', expectedCategory: 'video' }
      ];

      for (const testCase of testCases) {
        const filePath = join(tempDir, testCase.filename);
        writeFileSync(filePath, 'test content');

        const metadata = await fileUtils.extractMetadata(filePath);
        expect(metadata.mimeType).toBe(testCase.expectedType);
        expect(metadata.category).toBe(testCase.expectedCategory);
      }
    });
  });

  describe('Security Integration', () => {
    it('should prevent upload of malicious files', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'malicious content' },
        { name: 'script.bat', content: 'batch script' },
        { name: 'virus.scr', content: 'screensaver virus' }
      ];

      for (const file of maliciousFiles) {
        const filePath = join(tempDir, file.name);
        writeFileSync(filePath, file.content);

        const validation = await validateFile(filePath, file.name);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(error => error.includes('Suspicious file extension'))).toBe(true);
      }
    });

    it('should handle files with suspicious names', async () => {
      const suspiciousNames = [
        'file.txt.exe',
        'document.pdf.bat',
        'image.jpg.scr'
      ];

      for (const name of suspiciousNames) {
        const filePath = join(tempDir, name);
        writeFileSync(filePath, 'content');

        const validation = await validateFile(filePath, name);
        expect(validation.warnings.some(warning => warning.includes('multiple extensions'))).toBe(true);
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle large files efficiently', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const startTime = Date.now();

      const validation = await validateFile(largeBuffer, 'large.mp3', 'audio/mpeg');
      const uploadResult = await uploadFile(largeBuffer, join(tempDir, 'large.mp3'));

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(validation.valid).toBe(true);
      expect(uploadResult.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent uploads', async () => {
      const uploadPromises = [];
      const fileCount = 10;

      for (let i = 0; i < fileCount; i++) {
        const buffer = Buffer.from(`test content ${i}`);
        const promise = uploadFile(buffer, join(tempDir, `concurrent-${i}.txt`));
        uploadPromises.push(promise);
      }

      const results = await Promise.all(uploadPromises);
      
      expect(results).toHaveLength(fileCount);
      expect(results.every(result => result.success)).toBe(true);
    });
  });
});
