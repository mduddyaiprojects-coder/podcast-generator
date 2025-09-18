import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StorageService, StorageConfig } from '../../src/services/storage-service';

// Mock Azure Blob Storage
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn(),
  ContainerClient: jest.fn()
}));

describe('StorageService', () => {
  let storageService: StorageService;
  let mockConfig: StorageConfig;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    mockConfig = {
      connectionString: 'DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey;EndpointSuffix=core.windows.net',
      containerName: 'test-container',
      cdnBaseUrl: 'https://cdn.example.com'
    };

    // Mock the container client methods
    const mockContainerClient = {
      createIfNotExists: (jest.fn() as any).mockResolvedValue({ succeeded: true }),
      getBlockBlobClient: (jest.fn() as any).mockReturnValue({
        upload: (jest.fn() as any).mockResolvedValue({
          etag: 'test-etag',
          lastModified: new Date('2024-01-01T00:00:00Z')
        })
      }),
      getBlobClient: (jest.fn() as any).mockReturnValue({
        exists: (jest.fn() as any).mockResolvedValue(true),
        getProperties: (jest.fn() as any).mockResolvedValue({
          contentLength: 1024,
          contentType: 'audio/mpeg',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          etag: 'test-etag',
          metadata: { submissionId: 'test-submission-123' }
        })
      }),
      listBlobsFlat: (jest.fn() as any).mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator for most tests
        },
        next: (jest.fn() as any).mockResolvedValue({ done: true, value: undefined })
      }),
      exists: (jest.fn() as any).mockResolvedValue(true),
      deleteBlob: (jest.fn() as any).mockResolvedValue({})
    };

    const mockBlobServiceClient = {
      getContainerClient: (jest.fn() as any).mockReturnValue(mockContainerClient)
    };

    // Mock the constructors
    const { BlobServiceClient, ContainerClient } = require('@azure/storage-blob');
    BlobServiceClient.mockImplementation(() => mockBlobServiceClient);
    ContainerClient.mockImplementation(() => mockContainerClient);

    storageService = new StorageService(mockConfig);
  });

  describe('Constructor and Initialization', () => {
    it('should create StorageService with valid config', () => {
      expect(storageService).toBeDefined();
      expect(storageService.getConfig()).toEqual(mockConfig);
    });

    it('should initialize storage service', async () => {
      await expect(storageService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Audio Upload', () => {
    it('should upload audio file successfully', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const submissionId = 'test-submission-123';

      const result = await storageService.uploadAudio(audioBuffer, submissionId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('contentType');
      expect(result).toHaveProperty('etag');
      expect(result).toHaveProperty('lastModified');
      expect(result.url).toContain('test-submission-123.mp3');
      expect(result.size).toBe(audioBuffer.length);
      expect(result.contentType).toBe('audio/mpeg');
    });

    it('should upload audio with custom content type', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const submissionId = 'test-submission-123';
      const contentType = 'audio/wav';

      const result = await storageService.uploadAudio(audioBuffer, submissionId, contentType);

      expect(result.contentType).toBe(contentType);
    });
  });

  describe('Transcript Upload', () => {
    it('should upload transcript successfully', async () => {
      const transcriptContent = 'This is a test transcript.';
      const submissionId = 'test-submission-123';

      const result = await storageService.uploadTranscript(transcriptContent, submissionId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.contentType).toBe('text/plain; charset=utf-8');
      expect(result.url).toContain('test-submission-123.txt');
    });
  });

  describe('Dialogue Script Upload', () => {
    it('should upload dialogue script successfully', async () => {
      const scriptContent = 'Host: Welcome to the show.\nGuest: Thank you for having me.';
      const submissionId = 'test-submission-123';

      const result = await storageService.uploadDialogueScript(scriptContent, submissionId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.contentType).toBe('text/plain; charset=utf-8');
      expect(result.url).toContain('test-submission-123.txt');
    });
  });

  describe('Summary Upload', () => {
    it('should upload summary successfully', async () => {
      const summaryContent = 'This is a summary of the episode.';
      const submissionId = 'test-submission-123';

      const result = await storageService.uploadSummary(summaryContent, submissionId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.contentType).toBe('text/plain; charset=utf-8');
      expect(result.url).toContain('test-submission-123.txt');
    });
  });

  describe('Chapter Markers Upload', () => {
    it('should upload chapter markers successfully', async () => {
      const chapterMarkers = [
        { start_time: 0, end_time: 120, title: 'Introduction' },
        { start_time: 120, end_time: 480, title: 'Main Discussion' }
      ];
      const submissionId = 'test-submission-123';

      const result = await storageService.uploadChapterMarkers(chapterMarkers, submissionId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result.contentType).toBe('application/json; charset=utf-8');
      expect(result.url).toContain('test-submission-123.json');
    });
  });

  describe('File Management', () => {
    it('should check if file exists', async () => {
      const blobName = 'audio/test-submission-123.mp3';
      
      const exists = await storageService.fileExists(blobName);
      
      expect(exists).toBe(true);
    });

    it('should get file metadata', async () => {
      const blobName = 'audio/test-submission-123.mp3';
      
      // Mock the getProperties method
      const mockBlobClient = {
        getProperties: (jest.fn() as any).mockResolvedValue({
          contentLength: 1024,
          contentType: 'audio/mpeg',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          etag: 'test-etag',
          metadata: { submissionId: 'test-submission-123' }
        })
      };

      const mockContainerClient = {
        getBlobClient: (jest.fn() as any).mockReturnValue(mockBlobClient)
      };

      // Replace the container client mock
      const { ContainerClient } = require('@azure/storage-blob');
      ContainerClient.mockImplementation(() => mockContainerClient);

      const metadata = await storageService.getFileMetadata(blobName);

      expect(metadata).toHaveProperty('size');
      expect(metadata).toHaveProperty('contentType');
      expect(metadata).toHaveProperty('lastModified');
      expect(metadata).toHaveProperty('etag');
      expect(metadata).toHaveProperty('metadata');
    });
  });

  describe('Storage Statistics', () => {
    it('should get storage statistics', async () => {
      // Mock blobs for statistics
      const mockBlobs = [
        {
          properties: {
            contentLength: 1024,
            lastModified: new Date('2024-01-01T00:00:00Z')
          }
        },
        {
          properties: {
            contentLength: 2048,
            lastModified: new Date('2024-01-02T00:00:00Z')
          }
        }
      ];

      const mockContainerClient = {
        createIfNotExists: (jest.fn() as any).mockResolvedValue({ succeeded: true }),
        listBlobsFlat: (jest.fn() as any).mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const blob of mockBlobs) {
              yield blob;
            }
          }
        })
      };

      const mockBlobServiceClient = {
        getContainerClient: (jest.fn() as any).mockReturnValue(mockContainerClient)
      };

      const { BlobServiceClient, ContainerClient } = require('@azure/storage-blob');
      BlobServiceClient.mockImplementation(() => mockBlobServiceClient);
      ContainerClient.mockImplementation(() => mockContainerClient);

      // Create a new storage service instance for this test
      const testStorageService = new StorageService(mockConfig);
      await testStorageService.initialize();

      const stats = await testStorageService.getStorageStats();

      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('containerName');
      expect(stats).toHaveProperty('lastModified');
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.containerName).toBe('test-container');
    });
  });

  describe('Health Check', () => {
    it('should pass health check when container exists', async () => {
      const isHealthy = await storageService.checkHealth();
      expect(isHealthy).toBe(true);
    });

    it('should fail health check when container does not exist', async () => {
      const mockContainerClient = {
        createIfNotExists: (jest.fn() as any).mockResolvedValue({ succeeded: true }),
        exists: (jest.fn() as any).mockResolvedValue(false),
        listBlobsFlat: (jest.fn() as any)
      };

      const mockBlobServiceClient = {
        getContainerClient: (jest.fn() as any).mockReturnValue(mockContainerClient)
      };

      const { BlobServiceClient, ContainerClient } = require('@azure/storage-blob');
      BlobServiceClient.mockImplementation(() => mockBlobServiceClient);
      ContainerClient.mockImplementation(() => mockContainerClient);

      // Create a new storage service instance for this test
      const testStorageService = new StorageService(mockConfig);
      await testStorageService.initialize();

      const isHealthy = await testStorageService.checkHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old files', async () => {
      const oldDate = new Date('2023-01-01T00:00:00Z');
      const recentDate = new Date(); // Current date - should not be deleted

      const mockBlobs = [
        {
          name: 'old-file.mp3',
          properties: {
            lastModified: oldDate
          }
        },
        {
          name: 'recent-file.mp3',
          properties: {
            lastModified: recentDate
          }
        }
      ];

      const mockContainerClient = {
        createIfNotExists: (jest.fn() as any).mockResolvedValue({ succeeded: true }),
        listBlobsFlat: (jest.fn() as any).mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const blob of mockBlobs) {
              yield blob;
            }
          }
        }),
        deleteBlob: (jest.fn() as any).mockResolvedValue({})
      };

      const mockBlobServiceClient = {
        getContainerClient: (jest.fn() as any).mockReturnValue(mockContainerClient)
      };

      const { BlobServiceClient, ContainerClient } = require('@azure/storage-blob');
      BlobServiceClient.mockImplementation(() => mockBlobServiceClient);
      ContainerClient.mockImplementation(() => mockContainerClient);

      // Create a new storage service instance for this test
      const testStorageService = new StorageService(mockConfig);
      await testStorageService.initialize();

      const deletedCount = await testStorageService.cleanupOldFiles(30);

      expect(deletedCount).toBe(1); // Only the old file should be deleted
      expect(mockContainerClient.deleteBlob).toHaveBeenCalledWith('old-file.mp3');
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors gracefully', async () => {
      const mockContainerClient = {
        createIfNotExists: (jest.fn() as any).mockResolvedValue({ succeeded: true }),
        getBlockBlobClient: (jest.fn() as any).mockReturnValue({
          upload: (jest.fn() as any).mockRejectedValue(new Error('Upload failed'))
        })
      };

      const mockBlobServiceClient = {
        getContainerClient: (jest.fn() as any).mockReturnValue(mockContainerClient)
      };

      const { BlobServiceClient, ContainerClient } = require('@azure/storage-blob');
      BlobServiceClient.mockImplementation(() => mockBlobServiceClient);
      ContainerClient.mockImplementation(() => mockContainerClient);

      // Create a new storage service instance for this test
      const testStorageService = new StorageService(mockConfig);
      await testStorageService.initialize();

      const audioBuffer = Buffer.from('fake audio data');
      const submissionId = 'test-submission-123';

      await expect(testStorageService.uploadAudio(audioBuffer, submissionId))
        .rejects.toThrow('Audio upload failed: Upload failed');
    });

    it('should handle initialization errors gracefully', async () => {
      const mockContainerClient = {
        createIfNotExists: (jest.fn() as any).mockRejectedValue(new Error('Container creation failed'))
      };

      const mockBlobServiceClient = {
        getContainerClient: (jest.fn() as any).mockReturnValue(mockContainerClient)
      };

      const { BlobServiceClient, ContainerClient } = require('@azure/storage-blob');
      BlobServiceClient.mockImplementation(() => mockBlobServiceClient);
      ContainerClient.mockImplementation(() => mockContainerClient);

      // Create a new storage service instance for this test
      const testStorageService = new StorageService(mockConfig);

      await expect(testStorageService.initialize())
        .rejects.toThrow('Storage initialization failed: Container creation failed');
    });
  });

  describe('URL Generation', () => {
    it('should generate CDN URL when CDN base URL is provided', () => {
      const service = new StorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey;EndpointSuffix=core.windows.net',
        containerName: 'test-container',
        cdnBaseUrl: 'https://cdn.example.com'
      });

      // Access private method for testing
      const getPublicUrl = (service as any).getPublicUrl.bind(service);
      const url = getPublicUrl('audio/test.mp3');

      expect(url).toBe('https://cdn.example.com/audio/test.mp3');
    });

    it('should generate blob storage URL when no CDN is provided', () => {
      const service = new StorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey;EndpointSuffix=core.windows.net',
        containerName: 'test-container'
      });

      // Access private method for testing
      const getPublicUrl = (service as any).getPublicUrl.bind(service);
      const url = getPublicUrl('audio/test.mp3');

      expect(url).toBe('https://testaccount.blob.core.windows.net/test-container/audio/test.mp3');
    });
  });
});
