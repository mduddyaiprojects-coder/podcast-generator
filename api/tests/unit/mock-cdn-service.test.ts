import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MockCdnService } from '../../src/services/mock-cdn-service';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('MockCdnService', () => {
  let mockCdnService: MockCdnService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCdnService = new MockCdnService();
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
      expect(mockCdnService).toBeInstanceOf(MockCdnService);
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        baseUrl: 'https://custom-cdn.com',
        enableCompression: false,
        enableHttps: true
      };
      const service = new MockCdnService(customConfig);
      expect(service).toBeInstanceOf(MockCdnService);
    });
  });

  describe('getCdnUrl', () => {
    it('should return CDN URL for given path', () => {
      const url = mockCdnService.getCdnUrl('/test/path');
      expect(typeof url).toBe('string');
      expect(url).toContain('/test/path');
    });
  });

  describe('getStats', () => {
    it('should return CDN statistics', () => {
      const stats = mockCdnService.getStats();
      expect(stats).toHaveProperty('requests');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('dataTransferred');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(typeof stats.requests).toBe('number');
      expect(typeof stats.cacheHits).toBe('number');
      expect(typeof stats.cacheMisses).toBe('number');
      expect(typeof stats.dataTransferred).toBe('number');
      expect(typeof stats.averageResponseTime).toBe('number');
    });
  });

  describe('getConfig', () => {
    it('should return CDN configuration', () => {
      const config = mockCdnService.getConfig();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('enableCompression');
      expect(config).toHaveProperty('enableHttps');
      expect(config).toHaveProperty('cacheRules');
      expect(typeof config.baseUrl).toBe('string');
      expect(typeof config.enableCompression).toBe('boolean');
      expect(typeof config.enableHttps).toBe('boolean');
      expect(Array.isArray(config.cacheRules)).toBe(true);
    });
  });
});
