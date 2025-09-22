import { CDNService } from '../../src/services/cdn-service';
import { environmentService } from '../../src/config/environment';

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
        cdnBaseUrl: 'https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net'
      }
    })
  }
}));

describe('CDNService', () => {
  let service: CDNService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CDNService();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(service.checkHealth()).toBe(true);
      expect(service.getServiceInfo().healthy).toBe(true);
    });

    it('should handle missing CDN base URL', () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          cdnBaseUrl: ''
        }
      });

      const unhealthyService = new CDNService();
      expect(unhealthyService.checkHealth()).toBe(false);
    });
  });

  describe('convertToCdnUrl', () => {
    it('should convert blob storage URL to CDN URL', () => {
      const blobUrl = 'https://podcastgenstorage.blob.core.windows.net/test-container/audio.mp3';
      const result = service.convertToCdnUrl(blobUrl);

      expect(result).toEqual({
        originalUrl: blobUrl,
        cdnUrl: 'https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net/test-container/audio.mp3',
        isCdnEnabled: true
      });
    });

    it('should handle invalid URL format', () => {
      const invalidUrl = 'https://podcastgenstorage.blob.core.windows.net/invalid';
      const result = service.convertToCdnUrl(invalidUrl);

      expect(result).toEqual({
        originalUrl: invalidUrl,
        cdnUrl: invalidUrl,
        isCdnEnabled: false
      });
    });

    it('should handle malformed URL', () => {
      const malformedUrl = 'not-a-valid-url';
      const result = service.convertToCdnUrl(malformedUrl);

      expect(result).toEqual({
        originalUrl: malformedUrl,
        cdnUrl: malformedUrl,
        isCdnEnabled: false
      });
    });

    it('should return original URL when service is unhealthy', () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          cdnBaseUrl: ''
        }
      });

      const unhealthyService = new CDNService();
      const blobUrl = 'https://podcastgenstorage.blob.core.windows.net/test-container/audio.mp3';
      const result = unhealthyService.convertToCdnUrl(blobUrl);

      expect(result).toEqual({
        originalUrl: blobUrl,
        cdnUrl: blobUrl,
        isCdnEnabled: false
      });
    });
  });

  describe('generateCdnUrl', () => {
    it('should generate CDN URL for container and blob', () => {
      const cdnUrl = service.generateCdnUrl('test-container', 'audio.mp3');
      expect(cdnUrl).toBe('https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net/test-container/audio.mp3');
    });

    it('should return empty string when service is unhealthy', () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          cdnBaseUrl: ''
        }
      });

      const unhealthyService = new CDNService();
      const cdnUrl = unhealthyService.generateCdnUrl('test-container', 'audio.mp3');
      expect(cdnUrl).toBe('');
    });
  });

  describe('purgeCache', () => {
    it('should purge cache for specific path', async () => {
      const result = await service.purgeCache('/test-container/audio.mp3');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cache purged successfully');
      expect(result.purgeId).toBeDefined();
    });

    it('should purge all cache', async () => {
      const result = await service.purgeAllCache();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cache purged successfully');
      expect(result.purgeId).toBeDefined();
    });

    it('should return failure when service is unhealthy', async () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          cdnBaseUrl: ''
        }
      });

      const unhealthyService = new CDNService();
      const result = await unhealthyService.purgeCache('/test-container/audio.mp3');

      expect(result.success).toBe(false);
      expect(result.message).toBe('CDN service is not healthy');
    });
  });

  describe('checkHealth', () => {
    it('should return true when healthy', () => {
      expect(service.checkHealth()).toBe(true);
    });

    it('should return false when unhealthy', () => {
      (environmentService.getConfig as jest.Mock).mockReturnValueOnce({
        storage: {
          cdnBaseUrl: ''
        }
      });

      const unhealthyService = new CDNService();
      expect(unhealthyService.checkHealth()).toBe(false);
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = service.getServiceInfo();

      expect(info).toEqual({
        name: 'Azure Front Door CDN',
        healthy: true,
        config: {
          baseUrl: 'https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net',
          profileName: 'podcastgen-afd-profile',
          endpointName: 'podcastgen-cdn',
          resourceGroup: 'rg-m4c-apps'
        }
      });
    });
  });

  describe('getBaseUrl', () => {
    it('should return CDN base URL', () => {
      const baseUrl = service.getBaseUrl();
      expect(baseUrl).toBe('https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net');
    });
  });

  describe('isCdnUrl', () => {
    it('should identify CDN URLs', () => {
      expect(service.isCdnUrl('https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net/container/blob.mp3')).toBe(true);
      expect(service.isCdnUrl('https://podcastgenstorage.blob.core.windows.net/container/blob.mp3')).toBe(false);
      expect(service.isCdnUrl('https://example.com/file.mp3')).toBe(false);
    });

    it('should handle invalid URLs', () => {
      expect(service.isCdnUrl('not-a-url')).toBe(false);
      expect(service.isCdnUrl('')).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalRequests: 1000,
        cacheHits: 850,
        cacheMisses: 150,
        hitRatio: 0.85
      });
    });
  });
});
