import { StorageLifecycleService } from '../../src/services/storage-lifecycle';
import { StorageCostMonitoringService } from '../../src/services/storage-cost-monitoring';
import { AzureBlobStorageService } from '../../src/services/azure-blob-storage';
import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

// Mock Azure Storage
jest.mock('@azure/storage-blob');

describe('Storage Lifecycle Integration Tests', () => {
  let lifecycleService: StorageLifecycleService;
  let costMonitoringService: StorageCostMonitoringService;
  let mockBlobStorage: jest.Mocked<AzureBlobStorageService>;
  let mockBlobServiceClient: jest.Mocked<BlobServiceClient>;
  let mockContainerClient: jest.Mocked<ContainerClient>;

  beforeAll(() => {
    // Set up test environment
    process.env['AZURE_STORAGE_CONNECTION_STRING'] = 'test-connection-string';
    process.env['STORAGE_CLEANUP_ENABLED'] = 'true';
    process.env['STORAGE_TIERING_ENABLED'] = 'true';
    process.env['STORAGE_COMPRESSION_ENABLED'] = 'true';
    process.env['HOT_TO_COOL_DAYS'] = '30';
    process.env['COOL_TO_ARCHIVE_DAYS'] = '90';
    process.env['ARCHIVE_TO_DELETE_DAYS'] = '365';
    process.env['COMPRESSION_THRESHOLD'] = '1048576';
    process.env['STORAGE_MONTHLY_BUDGET'] = '100';
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock BlobServiceClient
    mockBlobServiceClient = {
      getContainerClient: jest.fn()
    } as any;

    mockContainerClient = {
      listBlobsFlat: jest.fn(),
      getBlobClient: jest.fn()
    } as any;

    mockBlobServiceClient.getContainerClient.mockReturnValue(mockContainerClient);

    // Mock BlockBlobClient for tier operations
    const mockBlockBlobClient = {
      setAccessTier: jest.fn(),
      setMetadata: jest.fn()
    } as any;

    mockContainerClient.getBlobClient.mockReturnValue(mockBlockBlobClient);

    (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(mockBlobServiceClient);

    // Mock AzureBlobStorageService
    mockBlobStorage = new AzureBlobStorageService() as jest.Mocked<AzureBlobStorageService>;
    mockBlobStorage.listFiles = jest.fn();
    mockBlobStorage.getFileMetadata = jest.fn();
    mockBlobStorage.deleteFile = jest.fn();

    // Initialize services
    lifecycleService = new StorageLifecycleService(mockBlobStorage);
    costMonitoringService = new StorageCostMonitoringService();
  });

  describe('End-to-End Lifecycle Management', () => {
    it('should process a complete lifecycle workflow', async () => {
      // Mock files at different lifecycle stages
      const mockFiles = [
        'recent-audio.mp3',      // Should stay in Hot
        'old-audio.mp3',         // Should move to Cool
        'very-old-audio.mp3',    // Should move to Archive
        'ancient-audio.mp3',     // Should be deleted
        'large-text.txt',        // Should be compressed
        'temp-file.tmp'          // Should be deleted
      ];

      mockBlobStorage.listFiles.mockResolvedValue(mockFiles);

      // Mock file metadata with different ages and types
      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const now = Date.now();
        const metadata = {
          'recent-audio.mp3': {
            contentType: 'audio/mpeg',
            size: '10485760',
            lastModified: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days old
            accessTier: 'Hot'
          },
          'old-audio.mp3': {
            contentType: 'audio/mpeg',
            size: '20971520',
            lastModified: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days old
            accessTier: 'Hot'
          },
          'very-old-audio.mp3': {
            contentType: 'audio/mpeg',
            size: '31457280',
            lastModified: new Date(now - 95 * 24 * 60 * 60 * 1000).toISOString(), // 95 days old
            accessTier: 'Cool'
          },
          'ancient-audio.mp3': {
            contentType: 'audio/mpeg',
            size: '41943040',
            lastModified: new Date(now - 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 days old
            accessTier: 'Archive'
          },
          'large-text.txt': {
            contentType: 'text/plain',
            size: '2097152',
            lastModified: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days old
            accessTier: 'Hot'
          },
          'temp-file.tmp': {
            contentType: 'application/octet-stream',
            size: '1024',
            lastModified: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25 hours old
            isTemporary: 'true'
          }
        };
        return Promise.resolve(metadata[fileName] || {});
      });

      // Mock successful operations
      mockBlobStorage.deleteFile.mockResolvedValue(true);

      // Run lifecycle management
      const stats = await lifecycleService.runLifecycleManagement();

      // Verify results
      expect(stats.totalFilesProcessed).toBe(6);
      expect(stats.filesTieredToCool).toBe(1); // old-audio.mp3
      expect(stats.filesTieredToArchive).toBe(1); // very-old-audio.mp3
      expect(stats.filesDeleted).toBe(2); // ancient-audio.mp3 + temp-file.tmp
      expect(stats.estimatedCostSavings).toBeGreaterThan(0);
      expect(stats.errors).toBe(0);
    });

    it('should handle mixed file types with appropriate policies', async () => {
      const mockFiles = [
        'recent-image.jpg',
        'old-image.jpg',
        'rss-feed.xml',
        'transcript.txt',
        'script.md'
      ];

      mockBlobStorage.listFiles.mockResolvedValue(mockFiles);

      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const now = Date.now();
        const metadata = {
          'recent-image.jpg': {
            contentType: 'image/jpeg',
            size: '5242880',
            lastModified: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days old
            accessTier: 'Hot'
          },
          'old-image.jpg': {
            contentType: 'image/jpeg',
            size: '10485760',
            lastModified: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days old
            accessTier: 'Hot'
          },
          'rss-feed.xml': {
            contentType: 'application/rss+xml',
            size: '10240',
            lastModified: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days old
            accessTier: 'Hot'
          },
          'transcript.txt': {
            contentType: 'text/plain',
            size: '2097152',
            lastModified: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days old
            accessTier: 'Hot'
          },
          'script.md': {
            contentType: 'text/markdown',
            size: '1048576',
            lastModified: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days old
            accessTier: 'Hot'
          }
        };
        return Promise.resolve(metadata[fileName] || {});
      });

      const stats = await lifecycleService.runLifecycleManagement();

      // Images should tier faster than audio
      expect(stats.filesTieredToCool).toBeGreaterThanOrEqual(1); // old-image.jpg should tier
      expect(stats.totalFilesProcessed).toBe(5);
    });
  });

  describe('Cost Optimization Integration', () => {
    it('should provide accurate cost recommendations', async () => {
      // Mock storage with various file types and ages
      const mockBlobs = [
        {
          name: 'hot-audio1.mp3',
          properties: {
            contentLength: 10485760, // 10MB
            accessTier: 'Hot',
            lastModified: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
          }
        },
        {
          name: 'hot-audio2.mp3',
          properties: {
            contentLength: 20971520, // 20MB
            accessTier: 'Hot',
            lastModified: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
          }
        },
        {
          name: 'cool-audio.mp3',
          properties: {
            contentLength: 31457280, // 30MB
            accessTier: 'Cool',
            lastModified: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000)
          }
        }
      ];

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        }
      } as any);

      const recommendations = await lifecycleService.getCostOptimizationRecommendations();

      expect(recommendations.totalPotentialSavings).toBeGreaterThan(0);
      expect(recommendations.recommendations.length).toBeGreaterThan(0);

      // Should recommend tiering for Hot files
      const tieringRecommendations = recommendations.recommendations.filter(r => r.type === 'tiering');
      expect(tieringRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate cost monitoring alerts when thresholds are exceeded', async () => {
      // Mock high storage usage to trigger alerts
      const mockBlobs = Array.from({ length: 50 }, (_, i) => ({
        name: `large-file-${i}.mp3`,
        properties: {
          contentLength: 104857600, // 100MB each
          accessTier: 'Hot',
          lastModified: new Date()
        }
      }));

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        }
      } as any);

      const alerts = await costMonitoringService.checkCostAlerts();

      // Should have alerts for high hot storage usage
      expect(alerts.length).toBeGreaterThan(0);
      const hotStorageAlert = alerts.find(alert => alert.id === 'hot-storage-high');
      expect(hotStorageAlert).toBeDefined();
    });
  });

  describe('Scheduled Cleanup Integration', () => {
    it('should simulate scheduled cleanup workflow', async () => {
      // Mock files that need cleanup
      const mockFiles = [
        'temp1.tmp',
        'temp2.tmp',
        'old-audio.mp3',
        'recent-audio.mp3'
      ];

      mockBlobStorage.listFiles.mockResolvedValue(mockFiles);

      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const now = Date.now();
        const metadata = {
          'temp1.tmp': {
            contentType: 'application/octet-stream',
            size: '1024',
            lastModified: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25 hours old
            isTemporary: 'true'
          },
          'temp2.tmp': {
            contentType: 'application/octet-stream',
            size: '2048',
            lastModified: new Date(now - 12 * 60 * 60 * 1000).toISOString(), // 12 hours old
            isTemporary: 'true'
          },
          'old-audio.mp3': {
            contentType: 'audio/mpeg',
            size: '10485760',
            lastModified: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days old
            accessTier: 'Hot'
          },
          'recent-audio.mp3': {
            contentType: 'audio/mpeg',
            size: '20971520',
            lastModified: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days old
            accessTier: 'Hot'
          }
        };
        return Promise.resolve(metadata[fileName] || {});
      });

      mockBlobStorage.deleteFile.mockResolvedValue(true);

      // Run lifecycle management (simulating scheduled cleanup)
      const lifecycleStats = await lifecycleService.runLifecycleManagement();
      
      // Run temporary file cleanup
      const tempFilesDeleted = await lifecycleService.cleanupTemporaryFiles();

      // Verify results
      expect(lifecycleStats.totalFilesProcessed).toBe(4);
      expect(tempFilesDeleted).toBe(1); // Only temp1.tmp should be deleted
      expect(lifecycleStats.filesTieredToCool).toBe(1); // old-audio.mp3 should tier
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing when individual files fail', async () => {
      const mockFiles = ['file1.mp3', 'file2.jpg', 'file3.txt'];

      mockBlobStorage.listFiles.mockResolvedValue(mockFiles);

      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        if (fileName === 'file2.jpg') {
          return Promise.reject(new Error('Metadata access failed'));
        }
        return Promise.resolve({
          contentType: fileName.endsWith('.mp3') ? 'audio/mpeg' : 'text/plain',
          size: '1048576',
          lastModified: new Date().toISOString(),
          accessTier: 'Hot'
        });
      });

      const stats = await lifecycleService.runLifecycleManagement();

      expect(stats.totalFilesProcessed).toBe(3);
      expect(stats.errors).toBe(1); // file2.jpg should cause an error
      expect(stats.filesTieredToCool).toBeGreaterThanOrEqual(0); // Other files should still process
    });

    it('should handle storage connection failures gracefully', async () => {
      mockBlobStorage.listFiles.mockRejectedValue(new Error('Storage connection failed'));

      const stats = await lifecycleService.runLifecycleManagement();

      expect(stats.totalFilesProcessed).toBe(0);
      expect(stats.errors).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of files efficiently', async () => {
      // Mock 1000 files
      const mockFiles = Array.from({ length: 1000 }, (_, i) => `file${i}.mp3`);

      mockBlobStorage.listFiles.mockResolvedValue(mockFiles);

      mockBlobStorage.getFileMetadata.mockImplementation((fileName) => {
        const fileNumber = parseInt(fileName.replace('file', '').replace('.mp3', ''));
        const age = fileNumber % 100; // Vary age from 0-99 days
        
        return Promise.resolve({
          contentType: 'audio/mpeg',
          size: '1048576',
          lastModified: new Date(Date.now() - age * 24 * 60 * 60 * 1000).toISOString(),
          accessTier: 'Hot'
        });
      });

      const startTime = Date.now();
      const stats = await lifecycleService.runLifecycleManagement();
      const executionTime = Date.now() - startTime;

      expect(stats.totalFilesProcessed).toBe(1000);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(stats.errors).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should work with different configuration values', async () => {
      // Test with different tiering thresholds
      process.env['HOT_TO_COOL_DAYS'] = '7';
      process.env['COOL_TO_ARCHIVE_DAYS'] = '30';
      process.env['ARCHIVE_TO_DELETE_DAYS'] = '180';

      const service = new StorageLifecycleService(mockBlobStorage);
      expect(service).toBeDefined();

      // Test with compression disabled
      process.env['STORAGE_COMPRESSION_ENABLED'] = 'false';
      const serviceNoCompression = new StorageLifecycleService(mockBlobStorage);
      expect(serviceNoCompression).toBeDefined();

      // Test with tiering disabled
      process.env['STORAGE_TIERING_ENABLED'] = 'false';
      const serviceNoTiering = new StorageLifecycleService(mockBlobStorage);
      expect(serviceNoTiering).toBeDefined();
    });
  });
});
