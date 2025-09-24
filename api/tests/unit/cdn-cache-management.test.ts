import { CdnCacheManagementService } from '../../src/services/cdn-cache-management';
import { CdnTestUtils } from '../utils/cdn-test-utils';

// Mock Azure CDN Management Client
jest.mock('@azure/arm-cdn', () => ({
  CdnManagementClient: jest.fn().mockImplementation(() => ({
    endpoints: {
      purgeContent: jest.fn(),
      get: jest.fn()
    }
  }))
}));

// Mock Azure Identity
jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn()
}));

describe('CdnCacheManagementService', () => {
  let service: CdnCacheManagementService;
  let mockCdnClient: any;

  beforeEach(() => {
    // Set up environment variables
    process.env['AZURE_SUBSCRIPTION_ID'] = 'test-subscription-id';
    process.env['AZURE_RESOURCE_GROUP'] = 'test-resource-group';
    process.env['CDN_PROFILE_NAME'] = 'test-profile';
    process.env['CDN_ENDPOINT_NAME'] = 'test-endpoint';

    service = new CdnCacheManagementService();
    mockCdnClient = (service as any).cdnClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('invalidateCache', () => {
    it('should successfully invalidate cache for given content paths', async () => {
      const mockPurgeOperation = {
        name: 'test-invalidation-id'
      };
      mockCdnClient.endpoints.purgeContent.mockResolvedValue(mockPurgeOperation);

      const request = {
        contentPaths: ['/audio/episode-1.mp3', '/transcripts/episode-1.txt'],
        domains: ['example.com'],
        reason: 'Test invalidation',
        priority: 'high' as const
      };

      const result = await service.invalidateCache(request);

      expect(result.success).toBe(true);
      expect(result.invalidationId).toBe('test-invalidation-id');
      expect(result.estimatedCompletionTime).toBeDefined();
      expect(mockCdnClient.endpoints.purgeContent).toHaveBeenCalledWith(
        'test-resource-group',
        'test-profile',
        'test-endpoint',
        {
          contentPaths: request.contentPaths,
          domains: request.domains
        }
      );
    });

    it('should handle invalidation errors gracefully', async () => {
      const error = new Error('CDN invalidation failed');
      mockCdnClient.endpoints.purgeContent.mockRejectedValue(error);

      const request = {
        contentPaths: ['/audio/episode-1.mp3'],
        reason: 'Test invalidation'
      };

      const result = await service.invalidateCache(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('CDN invalidation failed');
    });
  });

  describe('invalidateSubmissionCache', () => {
    it('should invalidate cache for all submission-related content', async () => {
      const mockPurgeOperation = { name: 'submission-invalidation' };
      mockCdnClient.endpoints.purgeContent.mockResolvedValue(mockPurgeOperation);

      const submissionId = 'test-submission-123';
      const result = await service.invalidateSubmissionCache(submissionId);

      expect(result.success).toBe(true);
      expect(mockCdnClient.endpoints.purgeContent).toHaveBeenCalledWith(
        'test-resource-group',
        'test-profile',
        'test-endpoint',
        {
          contentPaths: [
            `/audio/${submissionId}.mp3`,
            `/transcripts/${submissionId}.txt`,
            `/scripts/${submissionId}.txt`,
            `/summaries/${submissionId}.txt`,
            `/chapters/${submissionId}.json`,
            `/metadata/${submissionId}.json`,
            `/feeds/${submissionId}.xml`
          ],
          domains: undefined
        }
      );
    });
  });

  describe('invalidateRssFeeds', () => {
    it('should invalidate cache for RSS feeds', async () => {
      const mockPurgeOperation = { name: 'rss-invalidation' };
      mockCdnClient.endpoints.purgeContent.mockResolvedValue(mockPurgeOperation);

      const result = await service.invalidateRssFeeds();

      expect(result.success).toBe(true);
      expect(mockCdnClient.endpoints.purgeContent).toHaveBeenCalledWith(
        'test-resource-group',
        'test-profile',
        'test-endpoint',
        {
          contentPaths: ['/feeds/*', '/rss/*'],
          domains: undefined
        }
      );
    });
  });

  describe('invalidateAllCache', () => {
    it('should invalidate all cache content', async () => {
      const mockPurgeOperation = { name: 'full-invalidation' };
      mockCdnClient.endpoints.purgeContent.mockResolvedValue(mockPurgeOperation);

      const result = await service.invalidateAllCache();

      expect(result.success).toBe(true);
      expect(mockCdnClient.endpoints.purgeContent).toHaveBeenCalledWith(
        'test-resource-group',
        'test-profile',
        'test-endpoint',
        {
          contentPaths: ['/*'],
          domains: undefined
        }
      );
    });
  });

  describe('getCacheRules', () => {
    it('should return cache rules from CDN endpoint', async () => {
      const mockEndpoint = {
        deliveryPolicy: {
          rules: [
            {
              name: 'audio-cache-rule',
              conditions: [{
                name: 'UrlPath',
                parameters: {
                  operator: 'BeginsWith',
                  matchValues: ['/audio/']
                }
              }],
              actions: [
                {
                  name: 'CacheExpiration',
                  parameters: {
                    cacheBehavior: 'Override',
                    cacheDuration: '365.00:00:00'
                  }
                },
                {
                  name: 'ModifyResponseHeader',
                  parameters: {
                    headerAction: 'Overwrite',
                    headerName: 'Cache-Control',
                    headerValue: 'public, max-age=31536000, immutable'
                  }
                }
              ]
            }
          ]
        },
        isCompressionEnabled: true,
        queryStringCachingBehavior: 'IgnoreQueryString'
      };

      mockCdnClient.endpoints.get.mockResolvedValue(mockEndpoint);

      const rules = await service.getCacheRules();

      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual({
        name: 'audio-cache-rule',
        path: '/audio/',
        cacheDuration: 365 * 24 * 60 * 60, // 365 days in seconds
        compression: true,
        queryStringCaching: false,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    });

    it('should handle missing delivery policy gracefully', async () => {
      const mockEndpoint = {
        isCompressionEnabled: false,
        queryStringCachingBehavior: 'UseQueryString'
      };

      mockCdnClient.endpoints.get.mockResolvedValue(mockEndpoint);

      const rules = await service.getCacheRules();

      expect(rules).toEqual([]);
    });
  });

  describe('getCacheAnalytics', () => {
    it('should return mock analytics data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const analytics = await service.getCacheAnalytics(startDate, endDate);

      expect(analytics).toHaveProperty('totalRequests');
      expect(analytics).toHaveProperty('cacheHitRate');
      expect(analytics).toHaveProperty('bandwidthSaved');
      expect(analytics).toHaveProperty('averageResponseTime');
      expect(analytics).toHaveProperty('topContent');
      expect(analytics).toHaveProperty('geographicDistribution');
      expect(analytics).toHaveProperty('hourlyStats');
      expect(analytics.hourlyStats).toHaveLength(24);
    });
  });

  describe('checkCacheHealth', () => {
    it('should return healthy status when metrics are good', async () => {
      // Mock good metrics
      jest.spyOn(service, 'getCacheAnalytics').mockResolvedValue({
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topContent: [],
        geographicDistribution: {},
        hourlyStats: []
      });

      const health = await service.checkCacheHealth();

      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
    });

    it('should return degraded status when hit rate is low', async () => {
      // Mock low hit rate
      jest.spyOn(service, 'getCacheAnalytics').mockResolvedValue({
        totalRequests: 100000,
        cacheHitRate: 0.5, // Low hit rate
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topContent: [],
        geographicDistribution: {},
        hourlyStats: []
      });

      const health = await service.checkCacheHealth();

      expect(health.status).toBe('degraded');
      expect(health.issues).toContain('Low cache hit rate detected');
      expect(health.recommendations).toContain('Review cache rules and content patterns');
    });

    it('should return unhealthy status when response time is high', async () => {
      // Mock high response time
      jest.spyOn(service, 'getCacheAnalytics').mockResolvedValue({
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 1000, // High response time
        topContent: [],
        geographicDistribution: {},
        hourlyStats: []
      });

      const health = await service.checkCacheHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.issues).toContain('High response time detected');
      expect(health.recommendations).toContain('Consider optimizing cache rules or enabling compression');
    });
  });

  describe('getCacheStatistics', () => {
    it('should return cache statistics', async () => {
      const statistics = await service.getCacheStatistics();

      expect(statistics).toHaveProperty('totalRequests');
      expect(statistics).toHaveProperty('cacheHitRate');
      expect(statistics).toHaveProperty('bandwidthSaved');
      expect(statistics).toHaveProperty('averageResponseTime');
      expect(statistics).toHaveProperty('topPaths');
      expect(statistics).toHaveProperty('lastUpdated');
    });
  });

  describe('scheduleInvalidation', () => {
    it('should schedule cache invalidation', async () => {
      const contentPaths = ['/audio/episode-1.mp3'];
      const scheduleTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const reason = 'Scheduled maintenance';

      const result = await service.scheduleInvalidation(contentPaths, scheduleTime, reason);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^invalidation-job-\d+$/);
    });
  });

  describe('parseCacheDuration', () => {
    it('should parse cache duration string correctly', () => {
      const service = new CdnCacheManagementService();
      const parseDuration = (service as any).parseCacheDuration;

      expect(parseDuration('365.00:00:00')).toBe(365 * 24 * 60 * 60);
      expect(parseDuration('7.00:00:00')).toBe(7 * 24 * 60 * 60);
      expect(parseDuration('1.12:30:45')).toBe(1 * 24 * 60 * 60 + 12 * 60 * 60 + 30 * 60 + 45);
      expect(parseDuration('invalid')).toBe(0);
    });
  });

  describe('extractHeaders', () => {
    it('should extract headers from rule actions', () => {
      const service = new CdnCacheManagementService();
      const extractHeaders = (service as any).extractHeaders;

      const actions = [
        {
          name: 'ModifyResponseHeader',
          parameters: {
            headerAction: 'Overwrite',
            headerName: 'Cache-Control',
            headerValue: 'public, max-age=3600'
          }
        },
        {
          name: 'ModifyResponseHeader',
          parameters: {
            headerAction: 'Append',
            headerName: 'X-Custom-Header',
            headerValue: 'custom-value'
          }
        },
        {
          name: 'CacheExpiration',
          parameters: {
            cacheBehavior: 'Override',
            cacheDuration: '3600'
          }
        }
      ];

      const headers = extractHeaders(actions);

      expect(headers).toEqual({
        'Cache-Control': 'public, max-age=3600',
        'X-Custom-Header': 'custom-value'
      });
    });
  });
});

describe('CdnTestUtils Integration', () => {
  it('should create comprehensive test scenarios', () => {
    const scenarios = CdnTestUtils.createTestScenarios();

    expect(scenarios).toHaveLength(6);
    expect(scenarios[0].name).toBe('Audio Files Caching');
    expect(scenarios[1].name).toBe('Image Files Caching');
    expect(scenarios[2].name).toBe('Text Files Caching');
    expect(scenarios[3].name).toBe('RSS Feeds Caching');
    expect(scenarios[4].name).toBe('JSON Files Caching');
    expect(scenarios[5].name).toBe('Temporary Files No Cache');
  });

  it('should validate cache headers correctly', () => {
    const actualHeaders = {
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    };

    const expectedHeaders = {
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    };

    const result = CdnTestUtils.validateCacheHeaders(actualHeaders, expectedHeaders);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect header mismatches', () => {
    const actualHeaders = {
      'Cache-Control': 'public, max-age=1800',
      'X-Content-Type-Options': 'nosniff'
    };

    const expectedHeaders = {
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    };

    const result = CdnTestUtils.validateCacheHeaders(actualHeaders, expectedHeaders);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Header mismatch for Cache-Control');
  });

  it('should calculate cache hit rate correctly', () => {
    const responses = [
      { fromCache: true },
      { fromCache: true },
      { fromCache: false },
      { fromCache: true },
      { fromCache: false }
    ];

    const hitRate = CdnTestUtils.calculateCacheHitRate(responses);

    expect(hitRate).toBe(0.6); // 3 out of 5
  });

  it('should calculate average response time correctly', () => {
    const responses = [
      { responseTime: 100 },
      { responseTime: 200 },
      { responseTime: 300 },
      { responseTime: 400 }
    ];

    const avgTime = CdnTestUtils.calculateAverageResponseTime(responses);

    expect(avgTime).toBe(250);
  });

  it('should calculate bandwidth savings correctly', () => {
    const responses = [
      { fromCache: true, fileSize: 1000, compressed: false },
      { fromCache: false, fileSize: 2000, compressed: true, compressionRatio: 0.5 },
      { fromCache: true, fileSize: 1500, compressed: false },
      { fromCache: false, fileSize: 1000, compressed: false }
    ];

    const savings = CdnTestUtils.calculateBandwidthSavings(responses);

    // Total bandwidth: 1000 + 2000 + 1500 + 1000 = 5500
    // Saved bandwidth: 1000 (cache) + 1000 (compression) + 1500 (cache) = 3500
    // Savings: 3500 / 5500 = 0.636...
    expect(savings).toBeCloseTo(0.636, 2);
  });
});



