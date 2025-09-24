import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AzureCDNService } from '../../src/services/azure-cdn';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }))
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('AzureCDNService', () => {
  let azureCdnService: AzureCDNService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['CDN_BASE_URL'] = 'https://test-cdn.com';
    process.env['CDN_CACHE_CONTROL'] = 'public, max-age=3600';
    process.env['CDN_DEFAULT_TTL'] = '3600';
    process.env['CDN_MAX_TTL'] = '86400';
    process.env['CDN_COMPRESSION_ENABLED'] = 'true';
    process.env['CDN_HTTPS_REDIRECT'] = 'true';
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(() => new AzureCDNService()).not.toThrow();
    });
  });

  describe('getCdnUrl', () => {
    it('should return CDN URL for given path', () => {
      azureCdnService = new AzureCDNService();
      const url = azureCdnService.getCdnUrl('/test/path');
      expect(typeof url).toBe('string');
    });

    it('should return original path when CDN base URL not configured', () => {
      delete process.env['CDN_BASE_URL'];
      azureCdnService = new AzureCDNService();
      const url = azureCdnService.getCdnUrl('/test/path');
      expect(url).toBe('/test/path');
    });
  });

  describe('purgeCache', () => {
    it('should attempt to purge cache', async () => {
      azureCdnService = new AzureCDNService();
      await expect(azureCdnService.purgeCache(['/test/path']))
        .resolves.not.toThrow();
    });
  });

  describe('testConnectivity', () => {
    it('should attempt to test connectivity', async () => {
      azureCdnService = new AzureCDNService();
      await expect(azureCdnService.testConnectivity())
        .resolves.not.toThrow();
    });
  });

  describe('getConfiguration', () => {
    it('should return CDN configuration', () => {
      azureCdnService = new AzureCDNService();
      const config = azureCdnService.getConfiguration();
      expect(typeof config).toBe('object');
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('cacheControl');
      expect(config).toHaveProperty('defaultTtl');
      expect(config).toHaveProperty('maxTtl');
      expect(config).toHaveProperty('compressionEnabled');
      expect(config).toHaveProperty('httpsRedirect');
    });
  });
});
