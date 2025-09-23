import { StorageService } from '../../src/services/storage-service';
import { cdnService } from '../../src/services/cdn-service';
import { environmentService } from '../../src/config/environment';

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
      }
    })
  }
}));

describe('CDN + Storage Integration', () => {
  let storageService: StorageService;
  const mockCdnService = cdnService as jest.Mocked<typeof cdnService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    storageService = new StorageService({
      connectionString: 'DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=testkey;EndpointSuffix=core.windows.net',
      containerName: 'test-container'
    });
  });

  describe('URL Generation with CDN', () => {
    it('should use CDN URL when CDN is healthy', async () => {
      mockCdnService.checkHealth.mockReturnValue(true);
      mockCdnService.getEndpointUrl.mockResolvedValue('https://test-cdn.azureedge.net');

      const audioBuffer = Buffer.from('fake audio data');
      const result = await storageService.uploadAudio(audioBuffer, 'test-submission');

      expect(result.url).toBe('https://test-cdn.azureedge.net/audio/test-submission.mp3');
      expect(mockCdnService.getEndpointUrl).toHaveBeenCalled();
    });

    it('should fallback to blob storage URL when CDN is unhealthy', async () => {
      mockCdnService.checkHealth.mockReturnValue(false);

      const audioBuffer = Buffer.from('fake audio data');
      const result = await storageService.uploadAudio(audioBuffer, 'test-submission');

      expect(result.url).toBe('https://teststorage.blob.core.windows.net/test-container/audio/test-submission.mp3');
      expect(mockCdnService.getEndpointUrl).not.toHaveBeenCalled();
    });

    it('should use configured CDN base URL when available', async () => {
      const storageServiceWithCdn = new StorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=testkey;EndpointSuffix=core.windows.net',
        containerName: 'test-container',
        cdnBaseUrl: 'https://custom-cdn.example.com'
      });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await storageServiceWithCdn.uploadAudio(audioBuffer, 'test-submission');

      expect(result.url).toBe('https://custom-cdn.example.com/audio/test-submission.mp3');
    });

    it('should handle CDN service errors gracefully', async () => {
      mockCdnService.checkHealth.mockReturnValue(true);
      mockCdnService.getEndpointUrl.mockRejectedValue(new Error('CDN service error'));

      const audioBuffer = Buffer.from('fake audio data');
      const result = await storageService.uploadAudio(audioBuffer, 'test-submission');

      expect(result.url).toBe('https://teststorage.blob.core.windows.net/test-container/audio/test-submission.mp3');
    });
  });

  describe('Cache Purging on Deletion', () => {
    it('should purge CDN cache when deleting submission files', async () => {
      mockCdnService.checkHealth.mockReturnValue(true);

      await storageService.deleteSubmissionFiles('test-submission');

      expect(mockCdnService.purgeSubmissionContent).toHaveBeenCalledWith('test-submission');
    });

    it('should not purge CDN cache when CDN is unhealthy', async () => {
      mockCdnService.checkHealth.mockReturnValue(false);

      await storageService.deleteSubmissionFiles('test-submission');

      expect(mockCdnService.purgeSubmissionContent).not.toHaveBeenCalled();
    });

    it('should handle CDN purge errors gracefully', async () => {
      mockCdnService.checkHealth.mockReturnValue(true);
      mockCdnService.purgeSubmissionContent.mockRejectedValue(new Error('Purge failed'));

      // Should not throw error
      await expect(storageService.deleteSubmissionFiles('test-submission')).resolves.not.toThrow();
    });
  });

  describe('Different Content Types', () => {
    it('should generate correct CDN URLs for different file types', async () => {
      mockCdnService.checkHealth.mockReturnValue(true);
      mockCdnService.getEndpointUrl.mockResolvedValue('https://test-cdn.azureedge.net');

      // Test audio file
      const audioResult = await storageService.uploadAudio(Buffer.from('audio'), 'test');
      expect(audioResult.url).toBe('https://test-cdn.azureedge.net/audio/test.mp3');

      // Test transcript
      const transcriptResult = await storageService.uploadTranscript('transcript content', 'test');
      expect(transcriptResult.url).toBe('https://test-cdn.azureedge.net/transcripts/test.txt');

      // Test script
      const scriptResult = await storageService.uploadDialogueScript('script content', 'test');
      expect(scriptResult.url).toBe('https://test-cdn.azureedge.net/scripts/test.txt');

      // Test summary
      const summaryResult = await storageService.uploadSummary('summary content', 'test');
      expect(summaryResult.url).toBe('https://test-cdn.azureedge.net/summaries/test.txt');

      // Test chapter markers
      const chapterResult = await storageService.uploadChapterMarkers([{ title: 'Chapter 1' }], 'test');
      expect(chapterResult.url).toBe('https://test-cdn.azureedge.net/chapters/test.json');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing account name in connection string', async () => {
      const invalidStorageService = new StorageService({
        connectionString: 'invalid-connection-string',
        containerName: 'test-container'
      });

      mockCdnService.checkHealth.mockReturnValue(false);

      await expect(invalidStorageService.uploadAudio(Buffer.from('test'), 'test')).rejects.toThrow(
        'Could not extract account name from connection string'
      );
    });
  });
});
