import { FileUtils, validateFile, uploadFile, downloadFile, extractMetadata } from '../../src/utils/file-utils';
import { environmentService } from '../../src/config/environment';
import { createReadStream, createWriteStream, mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock environment service
jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getConfig: jest.fn().mockReturnValue({
      limits: {
        maxFileSize: 25 * 1024 * 1024 // 25MB
      }
    })
  }
}));

describe('FileUtils', () => {
  let fileUtils: FileUtils;
  let tempDir: string;

  beforeEach(() => {
    fileUtils = FileUtils.getInstance();
    tempDir = join(tmpdir(), 'podcast-test-' + Date.now());
    mkdirSync(tempDir, { recursive: true });
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

  describe('validateFile', () => {
    it('should validate valid audio file', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const result = await validateFile(audioBuffer, 'test.mp3', 'audio/mpeg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toEqual({
        name: 'test.mp3',
        size: audioBuffer.length,
        mimeType: 'audio/mpeg',
        extension: '.mp3',
        category: 'audio',
        lastModified: expect.any(Date)
      });
    });

    it('should reject unsupported file type', async () => {
      const buffer = Buffer.from('test data');
      const result = await validateFile(buffer, 'test.exe', 'application/x-executable');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unsupported file type: application/x-executable');
    });

    it('should reject file that exceeds size limit', async () => {
      const largeBuffer = Buffer.alloc(30 * 1024 * 1024); // 30MB
      const result = await validateFile(largeBuffer, 'large.mp3', 'audio/mpeg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true);
    });

    it('should reject suspicious file extension', async () => {
      const buffer = Buffer.from('test data');
      const result = await validateFile(buffer, 'test.exe', 'application/x-executable');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Suspicious file extension: .exe');
    });

    it('should warn about multiple extensions', async () => {
      const buffer = Buffer.from('test data');
      const result = await validateFile(buffer, 'test.txt.exe', 'text/plain');

      expect(result.warnings).toContain('File has multiple extensions, which could be a security risk');
    });

    it('should validate file from path', async () => {
      const testFile = join(tempDir, 'test.txt');
      writeFileSync(testFile, 'test content');
      
      const result = await validateFile(testFile, 'test.txt', 'text/plain');

      expect(result.valid).toBe(true);
      expect(result.metadata?.size).toBe(12); // 'test content'.length
    });

    it('should handle missing file', async () => {
      const result = await validateFile('/nonexistent/file.txt', 'test.txt', 'text/plain');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('should validate with custom options', async () => {
      const buffer = Buffer.from('test data');
      const result = await validateFile(
        buffer, 
        'test.mp3', 
        'audio/mpeg',
        {
          maxSize: 1000,
          allowedTypes: ['audio/mpeg'],
          generateChecksum: true
        }
      );

      expect(result.valid).toBe(true);
      expect(result.metadata?.checksum).toBeDefined();
    });
  });

  describe('uploadFile', () => {
    it('should upload buffer to file', async () => {
      const buffer = Buffer.from('test content');
      const destination = join(tempDir, 'uploaded.txt');
      
      const result = await uploadFile(buffer, destination);

      expect(result.success).toBe(true);
      expect(result.url).toBe(destination);
      expect(existsSync(destination)).toBe(true);
    });

    it('should upload file from path', async () => {
      const sourceFile = join(tempDir, 'source.txt');
      writeFileSync(sourceFile, 'source content');
      const destination = join(tempDir, 'uploaded.txt');
      
      const result = await uploadFile(sourceFile, destination);

      expect(result.success).toBe(true);
      expect(existsSync(destination)).toBe(true);
    });

    it('should upload stream', async () => {
      const stream = createReadStream(Buffer.from('stream content'));
      const destination = join(tempDir, 'streamed.txt');
      
      const result = await uploadFile(stream, destination);

      expect(result.success).toBe(true);
      expect(existsSync(destination)).toBe(true);
    });

    it('should validate file before upload', async () => {
      const buffer = Buffer.from('test');
      const destination = join(tempDir, 'test.exe');
      
      const result = await uploadFile(buffer, destination);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File validation failed');
    });

    it('should handle upload errors', async () => {
      const buffer = Buffer.from('test');
      const invalidDestination = '/invalid/path/that/does/not/exist/file.txt';
      
      const result = await uploadFile(buffer, invalidDestination);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('downloadFile', () => {
    it('should download file from path', async () => {
      const sourceFile = join(tempDir, 'source.txt');
      writeFileSync(sourceFile, 'source content');
      const destination = join(tempDir, 'downloaded.txt');
      
      const result = await downloadFile(sourceFile, destination);

      expect(result.success).toBe(true);
      expect(result.path).toBe(destination);
      expect(existsSync(destination)).toBe(true);
    });

    it('should download from stream', async () => {
      const stream = createReadStream(Buffer.from('stream content'));
      const destination = join(tempDir, 'streamed.txt');
      
      const result = await downloadFile(stream, destination);

      expect(result.success).toBe(true);
      expect(existsSync(destination)).toBe(true);
    });

    it('should generate temp path if no destination provided', async () => {
      const sourceFile = join(tempDir, 'source.txt');
      writeFileSync(sourceFile, 'source content');
      
      const result = await downloadFile(sourceFile);

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
      expect(existsSync(result.path!)).toBe(true);
    });

    it('should handle download errors', async () => {
      const result = await downloadFile('/nonexistent/file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from file', async () => {
      const testFile = join(tempDir, 'test.mp3');
      writeFileSync(testFile, 'fake audio data');
      
      const metadata = await extractMetadata(testFile);

      expect(metadata.name).toBe('test.mp3');
      expect(metadata.size).toBe(16); // 'fake audio data'.length
      expect(metadata.mimeType).toBe('audio/mpeg');
      expect(metadata.extension).toBe('.mp3');
      expect(metadata.category).toBe('audio');
      expect(metadata.lastModified).toBeInstanceOf(Date);
    });

    it('should handle missing file', async () => {
      await expect(extractMetadata('/nonexistent/file.txt')).rejects.toThrow();
    });
  });

  describe('generateChecksum', () => {
    it('should generate SHA256 checksum', async () => {
      const data = Buffer.from('test data');
      const checksum = await fileUtils.generateChecksum(data);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different checksums for different data', async () => {
      const data1 = Buffer.from('test data 1');
      const data2 = Buffer.from('test data 2');
      
      const checksum1 = await fileUtils.generateChecksum(data1);
      const checksum2 = await fileUtils.generateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should generate same checksum for same data', async () => {
      const data = Buffer.from('test data');
      
      const checksum1 = await fileUtils.generateChecksum(data);
      const checksum2 = await fileUtils.generateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('compressFile', () => {
    it('should compress file', async () => {
      const inputFile = join(tempDir, 'input.txt');
      const outputFile = join(tempDir, 'output.txt');
      writeFileSync(inputFile, 'test content for compression');
      
      const result = await fileUtils.compressFile(inputFile, outputFile);

      expect(result.success).toBe(true);
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(result.ratio).toBeGreaterThan(0);
      expect(existsSync(outputFile)).toBe(true);
    });

    it('should handle compression errors', async () => {
      await expect(fileUtils.compressFile('/nonexistent/input.txt', '/output.txt')).rejects.toThrow();
    });
  });

  describe('cleanupTempFiles', () => {
    it('should cleanup temp files', async () => {
      const patterns = ['test-*.txt', 'temp-*.mp3'];
      
      const cleanedCount = await fileUtils.cleanupTempFiles(patterns);

      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('file type detection', () => {
    it('should detect MIME type from extension', () => {
      const mimeType = (fileUtils as any).detectMimeType('test.mp3');
      expect(mimeType).toBe('audio/mpeg');
    });

    it('should return null for unknown extension', () => {
      const mimeType = (fileUtils as any).detectMimeType('test.unknown');
      expect(mimeType).toBeNull();
    });

    it('should get category from MIME type', () => {
      const category = (fileUtils as any).getCategoryFromMimeType('audio/mpeg');
      expect(category).toBe('audio');
    });

    it('should return other for unknown MIME type', () => {
      const category = (fileUtils as any).getCategoryFromMimeType('unknown/type');
      expect(category).toBe('other');
    });
  });

  describe('security checks', () => {
    it('should detect suspicious extensions', () => {
      const result = (fileUtils as any).performSecurityChecks(Buffer.from('test'), 'test.exe', 'application/x-executable');
      expect(result.errors).toContain('Suspicious file extension: .exe');
    });

    it('should warn about multiple extensions', () => {
      const result = (fileUtils as any).performSecurityChecks(Buffer.from('test'), 'test.txt.exe', 'text/plain');
      expect(result.warnings).toContain('File has multiple extensions, which could be a security risk');
    });

    it('should detect null bytes in filename', () => {
      const result = (fileUtils as any).performSecurityChecks(Buffer.from('test'), 'test\0.txt', 'text/plain');
      expect(result.errors).toContain('Filename contains null bytes');
    });

    it('should detect long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = (fileUtils as any).performSecurityChecks(Buffer.from('test'), longName, 'text/plain');
      expect(result.errors).toContain('Filename too long (max 255 characters)');
    });
  });

  describe('utility functions', () => {
    it('should format bytes correctly', () => {
      expect((fileUtils as any).formatBytes(0)).toBe('0 Bytes');
      expect((fileUtils as any).formatBytes(1024)).toBe('1 KB');
      expect((fileUtils as any).formatBytes(1024 * 1024)).toBe('1 MB');
      expect((fileUtils as any).formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should generate temp path', () => {
      const path1 = (fileUtils as any).generateTempPath();
      const path2 = (fileUtils as any).generateTempPath();
      
      expect(path1).toBeDefined();
      expect(path2).toBeDefined();
      expect(path1).not.toBe(path2);
      expect(path1).toContain('podcast-temp-');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = FileUtils.getInstance();
      const instance2 = FileUtils.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
