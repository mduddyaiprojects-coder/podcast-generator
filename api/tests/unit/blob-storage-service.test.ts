import { BlobStorageService } from '../../src/services/blob-storage-service';
import { environmentService } from '../../src/config/environment';

// Mock the Azure Blob Storage client
jest.mock('@azure/storage-blob', () => {
  const mockBlobServiceClient = {
    getContainerClient: jest.fn().mockReturnValue({
      createIfNotExists: jest.fn(),
      getBlobClient: jest.fn().mockReturnValue({
        url: 'https://testaccount.blob.core.windows.net/testcontainer/testblob',
        download: jest.fn().mockResolvedValue({
          readableStreamBody: {
            pipe: jest.fn(),
            [Symbol.asyncIterator]: jest.fn().mockReturnValue({
              next: jest.fn().mockResolvedValue({ done: true, value: undefined })
            })
          }
        }),
        downloadToFile: jest.fn(),
        delete: jest.fn(),
        getProperties: jest.fn().mockResolvedValue({
          contentLength: 1024,
          lastModified: new Date('2024-01-01T00:00:00Z'),
          contentType: 'audio/mpeg',
          metadata: { test: 'value' },
          accessTier: 'Hot',
          tagCount: 1
        }),
        getTags: jest.fn().mockResolvedValue({
          tags: { environment: 'test' }
        }),
        generateSasUrl: jest.fn().mockResolvedValue('https://testaccount.blob.core.windows.net/testcontainer/testblob?sv=2023-01-03&st=2024-01-01T00%3A00%3A00Z&se=2024-01-01T01%3A00%3A00Z&sr=b&sp=r&sig=test')
      }),
      getBlockBlobClient: jest.fn().mockReturnValue({
        url: 'https://testaccount.blob.core.windows.net/testcontainer/testblob',
        uploadFile: jest.fn().mockResolvedValue({
          etag: 'test-etag',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          contentLength: 1024
        }),
        uploadData: jest.fn().mockResolvedValue({
          etag: 'test-etag',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          contentLength: 1024
        }),
        uploadStream: jest.fn().mockResolvedValue({
          etag: 'test-etag',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          contentLength: 1024
        })
      }),
      listBlobsFlat: jest.fn().mockReturnValue([{
        name: 'testblob',
        properties: {
          contentLength: 1024,
          lastModified: new Date('2024-01-01T00:00:00Z'),
          contentType: 'audio/mpeg',
          accessTier: 'Hot'
        },
        metadata: { test: 'value' },
        tags: { environment: 'test' }
      }])
    })
  };

  const mockBlobServiceClientConstructor = jest.fn().mockImplementation(() => mockBlobServiceClient) as any;
  mockBlobServiceClientConstructor.fromConnectionString = jest.fn().mockReturnValue(mockBlobServiceClient);
  
  return {
    BlobServiceClient: mockBlobServiceClientConstructor,
    ContainerClient: jest.fn(),
    BlockBlobClient: jest.fn().mockImplementation(() => ({
      url: 'https://testaccount.blob.core.windows.net/testcontainer/testblob',
      uploadFile: jest.fn().mockResolvedValue({
        etag: 'test-etag',
        lastModified: new Date('2024-01-01T00:00:00Z'),
        contentLength: 1024
      }),
      uploadData: jest.fn().mockResolvedValue({
        etag: 'test-etag',
        lastModified: new Date('2024-01-01T00:00:00Z'),
        contentLength: 1024
      }),
      uploadStream: jest.fn().mockResolvedValue({
        etag: 'test-etag',
        lastModified: new Date('2024-01-01T00:00:00Z'),
        contentLength: 1024
      })
    }))
  };
});

// Mock the Azure Identity client
jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn().mockImplementation(() => ({}))
}));

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the environment service
jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getConfig: jest.fn().mockReturnValue({
      storage: {
        blobStorage: {
          accountName: 'testaccount',
          connectionString: 'test-connection-string',
          useManagedIdentity: false
        }
      }
    })
  }
}));

describe('BlobStorageService', () => {
  let service: BlobStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlobStorageService();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      console.log('Service health:', service.checkHealth());
      console.log('Service info:', service.getServiceInfo());
      expect(service.checkHealth()).toBe(true);
    });

    it('should handle missing account name', () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          blobStorage: {
            accountName: '',
            connectionString: 'test-connection-string',
            useManagedIdentity: false
          }
        }
      });

      const unhealthyService = new BlobStorageService();
      expect(unhealthyService.checkHealth()).toBe(false);
    });
  });

  describe('createContainer', () => {
    it('should create a container successfully', async () => {
      await expect(service.createContainer('test-container')).resolves.not.toThrow();
    });

    it('should create a container with public access', async () => {
      await expect(service.createContainer('test-container', { publicAccess: 'blob' })).resolves.not.toThrow();
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const result = await service.uploadFile('test-container', 'test-blob', '/path/to/file.mp3');
      
      expect(result).toEqual({
        blobName: 'test-blob',
        url: 'https://testaccount.blob.core.windows.net/testcontainer/testblob',
        etag: 'test-etag',
        lastModified: expect.any(Date),
        size: 0
      });
    });

    it('should upload a file with options', async () => {
      const options = {
        contentType: 'audio/mpeg',
        metadata: { test: 'value' },
        tags: { environment: 'test' },
        accessTier: 'Hot' as const
      };

      const result = await service.uploadFile('test-container', 'test-blob', '/path/to/file.mp3', options);
      
      expect(result.blobName).toBe('test-blob');
      expect(result.url).toBe('https://testaccount.blob.core.windows.net/testcontainer/testblob');
    });
  });

  describe('uploadBuffer', () => {
    it('should upload a buffer successfully', async () => {
      const buffer = Buffer.from('test data');
      const result = await service.uploadBuffer('test-container', 'test-blob', buffer);
      
      expect(result.blobName).toBe('test-blob');
      expect(result.size).toBe(0);
    });
  });

  describe('uploadStream', () => {
    it('should upload a stream successfully', async () => {
      const stream = {
        pipe: jest.fn()
      } as any;

      const result = await service.uploadStream('test-container', 'test-blob', stream);
      
      expect(result.blobName).toBe('test-blob');
      expect(result.size).toBe(0);
    });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      await expect(service.downloadFile('test-container', 'test-blob', '/path/to/output.mp3')).resolves.not.toThrow();
    });

    it('should download a file with options', async () => {
      const options = {
        range: 'bytes=0-1023'
      };

      await expect(service.downloadFile('test-container', 'test-blob', '/path/to/output.mp3', options)).resolves.not.toThrow();
    });
  });

  describe('downloadBuffer', () => {
    it('should download a buffer successfully', async () => {
      const buffer = await service.downloadBuffer('test-container', 'test-blob');
      
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('downloadStream', () => {
    it('should download a stream successfully', async () => {
      const writableStream = {
        write: jest.fn()
      } as any;

      await expect(service.downloadStream('test-container', 'test-blob', writableStream)).resolves.not.toThrow();
    });
  });

  describe('listBlobs', () => {
    it('should list blobs successfully', async () => {
      const blobs = await service.listBlobs('test-container');
      
      expect(blobs).toHaveLength(1);
      expect(blobs[0]).toEqual({
        name: 'testblob',
        url: 'https://testaccount.blob.core.windows.net/testcontainer/testblob',
        size: 1024,
        lastModified: expect.any(Date),
        contentType: 'audio/mpeg',
        metadata: { test: 'value' },
        tags: { environment: 'test' },
        accessTier: 'Hot'
      });
    });

    it('should list blobs with prefix', async () => {
      const blobs = await service.listBlobs('test-container', 'audio/');
      
      expect(blobs).toHaveLength(1);
    });
  });

  describe('deleteBlob', () => {
    it('should delete a blob successfully', async () => {
      await expect(service.deleteBlob('test-container', 'test-blob')).resolves.not.toThrow();
    });
  });

  describe('getBlobProperties', () => {
    it('should get blob properties successfully', async () => {
      const properties = await service.getBlobProperties('test-container', 'test-blob');
      
      expect(properties).toEqual({
        name: 'test-blob',
        url: 'https://testaccount.blob.core.windows.net/testcontainer/testblob',
        size: 1024,
        lastModified: expect.any(Date),
        contentType: 'audio/mpeg',
        metadata: { test: 'value' },
        tags: { environment: 'test' },
        accessTier: 'Hot'
      });
    });
  });

  describe('generateSasUrl', () => {
    it('should generate a SAS URL successfully', async () => {
      const sasUrl = await service.generateSasUrl('test-container', 'test-blob');
      
      expect(sasUrl).toContain('https://testaccount.blob.core.windows.net/testcontainer/testblob');
      expect(sasUrl).toContain('sv=');
    });

    it('should generate a SAS URL with custom permissions and expiry', async () => {
      const sasUrl = await service.generateSasUrl('test-container', 'test-blob', 'rw', 120);
      
      expect(sasUrl).toContain('https://testaccount.blob.core.windows.net/testcontainer/testblob');
    });
  });

  describe('checkHealth', () => {
    it('should return health status', () => {
      expect(typeof service.checkHealth()).toBe('boolean');
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = service.getServiceInfo();
      
      expect(info).toEqual({
        name: 'Azure Blob Storage',
        healthy: true,
        config: {
          accountName: 'testaccount',
          useManagedIdentity: false
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle service not healthy gracefully', async () => {
      // Create a service with missing configuration
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          blobStorage: {
            accountName: '',
            connectionString: '',
            useManagedIdentity: false
          }
        }
      });

      const unhealthyService = new BlobStorageService();
      expect(unhealthyService.checkHealth()).toBe(false);
      
      await expect(unhealthyService.uploadFile('test-container', 'test-blob', '/path/to/file.mp3')).rejects.toThrow('Blob Storage service is not healthy');
    });

    it('should handle missing configuration gracefully', () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          blobStorage: {
            accountName: '',
            connectionString: '',
            useManagedIdentity: false
          }
        }
      });

      const unhealthyService = new BlobStorageService();
      expect(unhealthyService.checkHealth()).toBe(false);
      expect(unhealthyService.getServiceInfo().healthy).toBe(false);
    });
  });
});
