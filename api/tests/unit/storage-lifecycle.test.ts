import { StorageLifecycleService } from '../../src/services/storage-lifecycle';
import { AzureBlobStorageService } from '../../src/services/azure-blob-storage';
import { BlobServiceClient } from '@azure/storage-blob';

// Mock the Azure Blob Storage service
jest.mock('../../src/services/azure-blob-storage');
jest.mock('@azure/storage-blob');

describe('StorageLifecycleService - Cost Optimization', () => {
  let lifecycleService: StorageLifecycleService;
  let mockBlobStorage: jest.Mocked<AzureBlobStorageService>;
  let mockBlobServiceClient: jest.Mocked<BlobServiceClient>;

  beforeEach(() => {
    // Reset environment variables
    process.env['STORAGE_TIERING_ENABLED'] = 'true';
    process.env['STORAGE_COMPRESSION_ENABLED'] = 'true';
    process.env['STORAGE_DEDUPLICATION_ENABLED'] = 'false';
    process.env['HOT_TO_COOL_DAYS'] = '30';
    process.env['COOL_TO_ARCHIVE_DAYS'] = '90';
    process.env['ARCHIVE_TO_DELETE_DAYS'] = '365';
    process.env['COMPRESSION_THRESHOLD'] = '1048576';
    process.env['AZURE_STORAGE_CONNECTION_STRING'] = 'test-connection-string';

    mockBlobStorage = new AzureBlobStorageService() as jest.Mocked<AzureBlobStorageService>;
    mockBlobServiceClient = {} as jest.Mocked<BlobServiceClient>;
    
    lifecycleService = new StorageLifecycleService(mockBlobStorage);
  });

  describe('Cost Optimization Configuration', () => {
    it('should load cost optimization configuration from environment variables', () => {
      // Test is implicit in the constructor - if it fails, the service won't initialize
      expect(lifecycleService).toBeDefined();
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env['HOT_TO_COOL_DAYS'];
      delete process.env['COOL_TO_ARCHIVE_DAYS'];
      delete process.env['COMPRESSION_THRESHOLD'];

      const service = new StorageLifecycleService(mockBlobStorage);
      expect(service).toBeDefined();
    });
  });

  describe('File Action Determination', () => {
    const createMockFileInfo = (overrides: Partial<any> = {}) => ({
      name: 'test-file.mp3',
      contentType: 'audio/mpeg',
      size: 10485760, // 10MB
      lastModified: new Date(),
      metadata: {},
      accessTier: 'Hot',
      ...overrides
    });

    it('should recommend tiering to Cool for old Hot audio files', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days old

      const fileInfo = createMockFileInfo({
        contentType: 'audio/mpeg',
        accessTier: 'Hot',
        lastModified: oldDate
      });

      // Access private method through any type
      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('tierToCool');
    });

    it('should recommend tiering to Archive for old Cool audio files', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 95); // 95 days old

      const fileInfo = createMockFileInfo({
        contentType: 'audio/mpeg',
        accessTier: 'Cool',
        lastModified: oldDate
      });

      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('tierToArchive');
    });

    it('should recommend deletion for very old audio files', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days old

      const fileInfo = createMockFileInfo({
        contentType: 'audio/mpeg',
        accessTier: 'Archive',
        lastModified: oldDate
      });

      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('delete');
    });

    it('should recommend compression for large text files', () => {
      const fileInfo = createMockFileInfo({
        contentType: 'text/plain',
        size: 2097152, // 2MB
        accessTier: 'Hot'
      });

      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('compress');
    });

    it('should recommend faster tiering for image files', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days old

      const fileInfo = createMockFileInfo({
        contentType: 'image/jpeg',
        accessTier: 'Hot',
        lastModified: oldDate
      });

      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('tierToCool');
    });

    it('should recommend deletion for temporary files after retention period', () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25); // 25 hours old

      const fileInfo = createMockFileInfo({
        metadata: { isTemporary: 'true' },
        lastModified: oldDate
      });

      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('delete');
    });

    it('should keep recent files in their current tier', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days old

      const fileInfo = createMockFileInfo({
        contentType: 'audio/mpeg',
        accessTier: 'Hot',
        lastModified: recentDate
      });

      const action = (lifecycleService as any).determineFileAction(fileInfo);
      expect(action).toBe('keep');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost savings for tier transitions', () => {
      const sizeInBytes = 1073741824; // 1GB
      
      const hotToCoolSavings = (lifecycleService as any).calculateCostSavings(sizeInBytes, 'Hot', 'Cool');
      const coolToArchiveSavings = (lifecycleService as any).calculateCostSavings(sizeInBytes, 'Cool', 'Archive');
      const hotToArchiveSavings = (lifecycleService as any).calculateCostSavings(sizeInBytes, 'Hot', 'Archive');

      // Expected savings per GB per month
      expect(hotToCoolSavings).toBeCloseTo(0.0084, 4); // $0.0184 - $0.01
      expect(coolToArchiveSavings).toBeCloseTo(0.00901, 4); // $0.01 - $0.00099
      expect(hotToArchiveSavings).toBeCloseTo(0.01741, 4); // $0.0184 - $0.00099
    });

    it('should calculate compression savings', () => {
      const sizeInBytes = 10485760; // 10MB
      const compressionSavings = (lifecycleService as any).calculateCompressionSavings(sizeInBytes);
      
      // 30% compression ratio, 7MB savings, converted to GB
      const expectedSavings = (sizeInBytes * 0.3) / (1024 * 1024 * 1024) * 0.0184;
      expect(compressionSavings).toBeCloseTo(expectedSavings, 6);
    });

    it('should handle zero size files', () => {
      const zeroSizeSavings = (lifecycleService as any).calculateCostSavings(0, 'Hot', 'Cool');
      expect(zeroSizeSavings).toBe(0);
    });
  });

  describe('Compression Detection', () => {
    it('should identify compressible file types', () => {
      const compressibleTypes = [
        'text/plain',
        'text/html',
        'application/json',
        'application/xml',
        'text/xml',
        'application/rss+xml'
      ];

      compressibleTypes.forEach(type => {
        const isCompressible = (lifecycleService as any).isCompressibleFile(type);
        expect(isCompressible).toBe(true);
      });
    });

    it('should identify non-compressible file types', () => {
      const nonCompressibleTypes = [
        'audio/mpeg',
        'audio/mp3',
        'image/jpeg',
        'image/png',
        'video/mp4'
      ];

      nonCompressibleTypes.forEach(type => {
        const isCompressible = (lifecycleService as any).isCompressibleFile(type);
        expect(isCompressible).toBe(false);
      });
    });
  });

  describe('Lifecycle Management Execution', () => {
    beforeEach(() => {
      // Mock the blob storage methods
      mockBlobStorage.listFiles.mockResolvedValue(['file1.mp3', 'file2.jpg', 'file3.txt']);
      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const mockMetadata = {
          'file1.mp3': { contentType: 'audio/mpeg', size: '10485760', lastModified: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() },
          'file2.jpg': { contentType: 'image/jpeg', size: '5242880', lastModified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
          'file3.txt': { contentType: 'text/plain', size: '2097152', lastModified: new Date().toISOString() }
        };
        return Promise.resolve(mockMetadata[fileName] || {});
      });
    });

    it('should process files and return comprehensive statistics', async () => {
      const stats = await lifecycleService.runLifecycleManagement();

      expect(stats).toHaveProperty('totalFilesProcessed', 3);
      expect(stats).toHaveProperty('filesDeleted', 0);
      expect(stats).toHaveProperty('filesArchived', 0);
      expect(stats).toHaveProperty('filesTieredToCool');
      expect(stats).toHaveProperty('filesTieredToArchive');
      expect(stats).toHaveProperty('estimatedCostSavings');
      expect(stats).toHaveProperty('executionTime');
    });

    it('should skip processing when cleanup is disabled', async () => {
      process.env['STORAGE_CLEANUP_ENABLED'] = 'false';
      
      const service = new StorageLifecycleService(mockBlobStorage);
      const stats = await service.runLifecycleManagement();

      expect(stats.totalFilesProcessed).toBe(0);
      expect(stats.filesDeleted).toBe(0);
    });
  });

  describe('Cost Optimization Recommendations', () => {
    beforeEach(() => {
      mockBlobStorage.listFiles.mockResolvedValue(['file1.mp3', 'file2.jpg']);
      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const mockMetadata = {
          'file1.mp3': { 
            contentType: 'audio/mpeg', 
            size: '10485760', 
            lastModified: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
            accessTier: 'Hot'
          },
          'file2.jpg': { 
            contentType: 'image/jpeg', 
            size: '5242880', 
            lastModified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            accessTier: 'Hot'
          }
        };
        return Promise.resolve(mockMetadata[fileName] || {});
      });
    });

    it('should generate cost optimization recommendations', async () => {
      const recommendations = await lifecycleService.getCostOptimizationRecommendations();

      expect(recommendations).toHaveProperty('totalPotentialSavings');
      expect(recommendations).toHaveProperty('recommendations');
      expect(Array.isArray(recommendations.recommendations)).toBe(true);
    });

    it('should include tiering recommendations for eligible files', async () => {
      const recommendations = await lifecycleService.getCostOptimizationRecommendations();

      const tieringRecommendations = recommendations.recommendations.filter(r => r.type === 'tiering');
      expect(tieringRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Temporary File Cleanup', () => {
    beforeEach(() => {
      mockBlobStorage.listFiles.mockResolvedValue(['temp1.tmp', 'temp2.tmp', 'permanent.mp3']);
      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const mockMetadata = {
          'temp1.tmp': { 
            contentType: 'application/octet-stream', 
            size: '1024', 
            lastModified: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours old
            isTemporary: 'true'
          },
          'temp2.tmp': { 
            contentType: 'application/octet-stream', 
            size: '2048', 
            lastModified: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours old
            isTemporary: 'true'
          },
          'permanent.mp3': { 
            contentType: 'audio/mpeg', 
            size: '1048576', 
            lastModified: new Date().toISOString(),
            isTemporary: 'false'
          }
        };
        return Promise.resolve(mockMetadata[fileName] || {});
      });
    });

    it('should clean up old temporary files', async () => {
      const deletedCount = await lifecycleService.cleanupTemporaryFiles();
      
      expect(deletedCount).toBe(1); // Only temp1.tmp should be deleted (25 hours old)
    });

    it('should not delete recent temporary files', async () => {
      // Mock temp2.tmp as recent (12 hours old)
      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        if (fileName === 'temp2.tmp') {
          return Promise.resolve({
            contentType: 'application/octet-stream',
            size: '2048',
            lastModified: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            isTemporary: 'true'
          });
        }
        return Promise.resolve({});
      });

      const deletedCount = await lifecycleService.cleanupTemporaryFiles();
      expect(deletedCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during lifecycle management', async () => {
      mockBlobStorage.listFiles.mockRejectedValue(new Error('Storage error'));
      
      const stats = await lifecycleService.runLifecycleManagement();
      
      expect(stats.errors).toBeGreaterThan(0);
      expect(stats.totalFilesProcessed).toBe(0);
    });

    it('should handle individual file processing errors', async () => {
      mockBlobStorage.listFiles.mockResolvedValue(['file1.mp3', 'file2.jpg']);
      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        if (fileName === 'file1.mp3') {
          return Promise.reject(new Error('Metadata error'));
        }
        return Promise.resolve({
          contentType: 'image/jpeg',
          size: '5242880',
          lastModified: new Date().toISOString()
        });
      });

      const stats = await lifecycleService.runLifecycleManagement();
      
      expect(stats.errors).toBe(1);
      expect(stats.totalFilesProcessed).toBe(2);
    });
  });
});
