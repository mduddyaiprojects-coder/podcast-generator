import { BrandingService } from '../../src/services/branding-service';
import { BlobStorageService } from '../../src/services/blob-storage-service';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the BlobStorageService
jest.mock('../../src/services/blob-storage-service');

describe('BrandingService', () => {
  let brandingService: BrandingService;
  let mockBlobStorageService: jest.Mocked<BlobStorageService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a mock BlobStorageService instance
    mockBlobStorageService = {
      getBlobProperties: jest.fn(),
      downloadBuffer: jest.fn(),
      uploadBuffer: jest.fn(),
      deleteBlob: jest.fn(),
      listBlobs: jest.fn(),
      blobExists: jest.fn(),
      uploadFile: jest.fn(),
      downloadToFile: jest.fn(),
      generateSasUrl: jest.fn(),
      getContainerClient: jest.fn()
    } as any;

    // Create BrandingService with mocked storage
    brandingService = new BrandingService(mockBlobStorageService);
  });

  describe('getBranding', () => {
    it('should return default branding when blob does not exist', async () => {
      // Mock blob not found error
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );

      const result = await brandingService.getBranding();

      expect(result).toEqual({
        title: 'My Podcast',
        imageUrl: 'https://via.placeholder.com/3000x3000.png',
        updatedAt: new Date('2025-01-01T00:00:00Z')
      });
      expect(mockBlobStorageService.getBlobProperties).toHaveBeenCalledWith(
        'config',
        'branding.json'
      );
      expect(mockBlobStorageService.downloadBuffer).not.toHaveBeenCalled();
    });

    it('should return stored branding when blob exists', async () => {
      const storedBranding = {
        title: 'Test Podcast',
        imageUrl: 'https://example.com/image.jpg',
        updatedAt: '2025-01-15T12:34:56.789Z'
      };

      // Mock successful blob retrieval
      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(storedBranding), 'utf-8')
      );

      const result = await brandingService.getBranding();

      expect(result).toEqual({
        title: 'Test Podcast',
        imageUrl: 'https://example.com/image.jpg',
        updatedAt: new Date('2025-01-15T12:34:56.789Z')
      });
      expect(mockBlobStorageService.getBlobProperties).toHaveBeenCalledWith(
        'config',
        'branding.json'
      );
      expect(mockBlobStorageService.downloadBuffer).toHaveBeenCalledWith(
        'config',
        'branding.json'
      );
    });

    it('should return default branding on download error', async () => {
      // Mock blob exists but download fails
      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockRejectedValue(
        new Error('Download failed')
      );

      const result = await brandingService.getBranding();

      expect(result).toEqual({
        title: 'My Podcast',
        imageUrl: 'https://via.placeholder.com/3000x3000.png',
        updatedAt: new Date('2025-01-01T00:00:00Z')
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      // Mock blob with invalid JSON
      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from('invalid json', 'utf-8')
      );

      const result = await brandingService.getBranding();

      // Should return defaults when JSON parsing fails
      expect(result).toEqual({
        title: 'My Podcast',
        imageUrl: 'https://via.placeholder.com/3000x3000.png',
        updatedAt: new Date('2025-01-01T00:00:00Z')
      });
    });

    it('should convert updatedAt string to Date object', async () => {
      const storedBranding = {
        title: 'Test Podcast',
        imageUrl: 'https://example.com/image.jpg',
        updatedAt: '2025-01-15T12:34:56.789Z'
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(storedBranding), 'utf-8')
      );

      const result = await brandingService.getBranding();

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.toISOString()).toBe('2025-01-15T12:34:56.789Z');
    });
  });

  describe('updateBranding', () => {
    it('should create new branding when none exists', async () => {
      // Mock no existing branding
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const updates = {
        title: 'New Podcast',
        imageUrl: 'https://example.com/new-image.jpg'
      };

      const result = await brandingService.updateBranding(updates);

      expect(result.title).toBe('New Podcast');
      expect(result.imageUrl).toBe('https://example.com/new-image.jpg');
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockBlobStorageService.uploadBuffer).toHaveBeenCalled();
    });

    it('should update title only (partial update)', async () => {
      const existingBranding = {
        title: 'Old Title',
        imageUrl: 'https://example.com/old-image.jpg',
        updatedAt: '2025-01-14T00:00:00Z'
      };

      // Mock existing branding
      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const result = await brandingService.updateBranding({ title: 'New Title' });

      expect(result.title).toBe('New Title');
      expect(result.imageUrl).toBe('https://example.com/old-image.jpg'); // Unchanged
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        new Date(existingBranding.updatedAt).getTime()
      );
    });

    it('should update imageUrl only (partial update)', async () => {
      const existingBranding = {
        title: 'Test Podcast',
        imageUrl: 'https://example.com/old-image.jpg',
        updatedAt: '2025-01-14T00:00:00Z'
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const result = await brandingService.updateBranding({
        imageUrl: 'https://example.com/new-image.jpg'
      });

      expect(result.title).toBe('Test Podcast'); // Unchanged
      expect(result.imageUrl).toBe('https://example.com/new-image.jpg');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        new Date(existingBranding.updatedAt).getTime()
      );
    });

    it('should update both title and imageUrl', async () => {
      const existingBranding = {
        title: 'Old Title',
        imageUrl: 'https://example.com/old-image.jpg',
        updatedAt: '2025-01-14T00:00:00Z'
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const updates = {
        title: 'New Title',
        imageUrl: 'https://example.com/new-image.jpg'
      };

      const result = await brandingService.updateBranding(updates);

      expect(result.title).toBe('New Title');
      expect(result.imageUrl).toBe('https://example.com/new-image.jpg');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        new Date(existingBranding.updatedAt).getTime()
      );
    });

    it('should implement Last-Write-Wins (LWW) with timestamps', async () => {
      const currentTime = new Date('2025-01-15T12:00:00Z');
      const futureTime = new Date('2025-01-15T13:00:00Z');
      const pastTime = new Date('2025-01-15T11:00:00Z');

      const existingBranding = {
        title: 'Current Title',
        imageUrl: 'https://example.com/current.jpg',
        updatedAt: currentTime.toISOString()
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      // Update with future timestamp (should succeed)
      const futureResult = await brandingService.updateBranding(
        { title: 'Future Title' },
        futureTime
      );
      expect(futureResult.title).toBe('Future Title');
      expect(futureResult.updatedAt).toEqual(futureTime);
      expect(mockBlobStorageService.uploadBuffer).toHaveBeenCalled();

      // Reset mock call count
      jest.clearAllMocks();

      // Update current branding reference
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(futureResult), 'utf-8')
      );

      // Update with past timestamp (should be rejected)
      const pastResult = await brandingService.updateBranding(
        { title: 'Past Title' },
        pastTime
      );
      expect(pastResult.title).toBe('Future Title'); // Unchanged
      expect(mockBlobStorageService.uploadBuffer).not.toHaveBeenCalled();
    });

    it('should store branding as properly formatted JSON', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const updates = {
        title: 'Test Podcast',
        imageUrl: 'https://example.com/test.jpg'
      };

      await brandingService.updateBranding(updates);

      // Verify uploadBuffer was called with correct parameters
      expect(mockBlobStorageService.uploadBuffer).toHaveBeenCalledWith(
        'config',
        'branding.json',
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/json',
          metadata: expect.objectContaining({
            updatedAt: expect.any(String)
          })
        })
      );

      // Verify the JSON is properly formatted
      const uploadCall = mockBlobStorageService.uploadBuffer.mock.calls[0];
      expect(uploadCall).toBeDefined();
      const uploadedBuffer = uploadCall![2] as Buffer;
      const uploadedData = JSON.parse(uploadedBuffer.toString('utf-8'));

      expect(uploadedData).toHaveProperty('title');
      expect(uploadedData).toHaveProperty('imageUrl');
      expect(uploadedData).toHaveProperty('updatedAt');
    });

    it('should include metadata with updatedAt timestamp', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      await brandingService.updateBranding({ title: 'Test' });

      const uploadCall = mockBlobStorageService.uploadBuffer.mock.calls[0];
      expect(uploadCall).toBeDefined();
      const options = uploadCall![3];

      expect(options?.metadata).toHaveProperty('updatedAt');
      expect(options?.metadata?.['updatedAt']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw error when upload fails', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockRejectedValue(
        new Error('Upload failed')
      );

      await expect(
        brandingService.updateBranding({ title: 'Test' })
      ).rejects.toThrow('Failed to update branding');
    });

    it('should update timestamp on each update', async () => {
      const existingBranding = {
        title: 'Test',
        imageUrl: 'https://example.com/test.jpg',
        updatedAt: '2025-01-14T00:00:00Z'
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const beforeUpdate = new Date();
      const result = await brandingService.updateBranding({ title: 'Updated' });
      const afterUpdate = new Date();

      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000);
      expect(result.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime() + 1000);
    });
  });

  describe('resetBranding', () => {
    it('should reset branding to defaults', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const result = await brandingService.resetBranding();

      expect(result.title).toBe('My Podcast');
      expect(result.imageUrl).toBe('https://via.placeholder.com/3000x3000.png');
      expect(mockBlobStorageService.uploadBuffer).toHaveBeenCalled();
    });

    it('should overwrite existing branding with defaults', async () => {
      const existingBranding = {
        title: 'Custom Podcast',
        imageUrl: 'https://example.com/custom.jpg',
        updatedAt: '2025-01-14T00:00:00Z'
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      const result = await brandingService.resetBranding();

      expect(result.title).toBe('My Podcast');
      expect(result.imageUrl).toBe('https://via.placeholder.com/3000x3000.png');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        new Date(existingBranding.updatedAt).getTime()
      );
    });
  });

  describe('deleteBranding', () => {
    it('should delete branding blob when it exists', async () => {
      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.deleteBlob.mockResolvedValue({} as any);

      await brandingService.deleteBranding();

      expect(mockBlobStorageService.getBlobProperties).toHaveBeenCalledWith(
        'config',
        'branding.json'
      );
      expect(mockBlobStorageService.deleteBlob).toHaveBeenCalledWith(
        'config',
        'branding.json'
      );
    });

    it('should handle deletion when blob does not exist', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );

      // Should not throw error
      await expect(brandingService.deleteBranding()).resolves.not.toThrow();
      expect(mockBlobStorageService.deleteBlob).not.toHaveBeenCalled();
    });

    it('should handle error when checking if blob exists for deletion', async () => {
      // Mock error in both getBlobProperties and deleteBlob
      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.deleteBlob.mockRejectedValue(
        new Error('Delete failed')
      );

      // Should not throw - inner catch handles this
      await expect(brandingService.deleteBranding()).resolves.not.toThrow();
    });
  });

  describe('Concurrent Updates (Last-Write-Wins)', () => {
    it('should handle concurrent updates correctly', async () => {
      const existingBranding = {
        title: 'Initial',
        imageUrl: 'https://example.com/initial.jpg',
        updatedAt: '2025-01-15T12:00:00Z'
      };

      mockBlobStorageService.getBlobProperties.mockResolvedValue({} as any);
      mockBlobStorageService.downloadBuffer.mockResolvedValue(
        Buffer.from(JSON.stringify(existingBranding), 'utf-8')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      // Simulate multiple concurrent updates
      const updates = [
        { title: 'Update 1' },
        { title: 'Update 2' },
        { title: 'Update 3' }
      ];

      const results = await Promise.all(
        updates.map(update => brandingService.updateBranding(update))
      );

      // All updates should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('updatedAt');
      });

      // Upload should have been called for each update
      expect(mockBlobStorageService.uploadBuffer).toHaveBeenCalledTimes(3);
    });
  });

  describe('Storage Location and Naming', () => {
    it('should use correct container name (config)', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );

      await brandingService.getBranding();

      expect(mockBlobStorageService.getBlobProperties).toHaveBeenCalledWith(
        'config',
        expect.any(String)
      );
    });

    it('should use correct blob name (branding.json)', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );

      await brandingService.getBranding();

      expect(mockBlobStorageService.getBlobProperties).toHaveBeenCalledWith(
        expect.any(String),
        'branding.json'
      );
    });

    it('should set correct content type (application/json)', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockResolvedValue({} as any);

      await brandingService.updateBranding({ title: 'Test' });

      const uploadCall = mockBlobStorageService.uploadBuffer.mock.calls[0];
      expect(uploadCall).toBeDefined();
      const options = uploadCall![3];

      expect(options?.contentType).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should return defaults when getBranding encounters error', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('Network error')
      );

      const result = await brandingService.getBranding();

      expect(result).toEqual({
        title: 'My Podcast',
        imageUrl: 'https://via.placeholder.com/3000x3000.png',
        updatedAt: new Date('2025-01-01T00:00:00Z')
      });
    });

    it('should throw descriptive error when updateBranding fails', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('BlobNotFound')
      );
      mockBlobStorageService.uploadBuffer.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        brandingService.updateBranding({ title: 'Test' })
      ).rejects.toThrow('Failed to update branding: Network timeout');
    });

    it('should handle getBlobProperties network errors gracefully', async () => {
      mockBlobStorageService.getBlobProperties.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      // Should not throw, should return defaults
      const result = await brandingService.getBranding();
      expect(result).toBeDefined();
      expect(result.title).toBe('My Podcast');
    });
  });
});
