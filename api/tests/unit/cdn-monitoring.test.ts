import { CdnMonitoringService } from '../../src/services/cdn-monitoring';
import { CdnCacheManagementService } from '../../src/services/cdn-cache-management';

// Mock the CdnCacheManagementService
jest.mock('../../src/services/cdn-cache-management');

describe('CdnMonitoringService', () => {
  let service: CdnMonitoringService;
  let mockCacheManagement: jest.Mocked<CdnCacheManagementService>;

  beforeEach(() => {
    // Set up environment variables
    process.env['CDN_MIN_HIT_RATE'] = '0.7';
    process.env['CDN_MAX_RESPONSE_TIME'] = '500';
    process.env['CDN_MAX_ERROR_RATE'] = '0.05';
    process.env['CDN_BANDWIDTH_SPIKE_THRESHOLD'] = '2.0';

    mockCacheManagement = new CdnCacheManagementService() as jest.Mocked<CdnCacheManagementService>;
    service = new CdnMonitoringService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collectMetrics', () => {
    it('should collect and store cache metrics', async () => {
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3', '/feeds/main.xml'],
        lastUpdated: new Date()
      };

      const mockAnalytics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topContent: [
          { path: '/audio/episode-1.mp3', requests: 5000, cacheHits: 4500 },
          { path: '/feeds/main.xml', requests: 3000, cacheHits: 2000 }
        ],
        geographicDistribution: {
          'US': 40000,
          'EU': 30000,
          'APAC': 20000
        },
        hourlyStats: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          requests: Math.floor(Math.random() * 1000) + 100,
          cacheHits: Math.floor(Math.random() * 800) + 80
        }))
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);
      mockCacheManagement.getCacheAnalytics.mockResolvedValue(mockAnalytics);

      const metrics = await service.collectMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics.totalRequests).toBe(100000);
      expect(metrics.cacheHitRate).toBe(0.85);
      expect(metrics.bandwidthSaved).toBe(5000000000);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.topContent).toHaveLength(2);
      expect(metrics.geographicDistribution).toHaveProperty('US');
      expect(metrics.hourlyDistribution).toHaveLength(24);
    });

    it('should handle errors gracefully', async () => {
      mockCacheManagement.getCacheStatistics.mockRejectedValue(new Error('Statistics unavailable'));
      mockCacheManagement.getCacheAnalytics.mockRejectedValue(new Error('Analytics unavailable'));

      await expect(service.collectMetrics()).rejects.toThrow('Statistics unavailable');
    });
  });

  describe('checkAlerts', () => {
    beforeEach(() => {
      // Mock successful metrics collection
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      const mockAnalytics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topContent: [],
        geographicDistribution: {},
        hourlyStats: []
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);
      mockCacheManagement.getCacheAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should create alert for low cache hit rate', async () => {
      // Mock low hit rate
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.5, // Below threshold of 0.7
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('hit_rate_low');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toContain('Cache hit rate is 50.0%');
    });

    it('should create alert for high response time', async () => {
      // Mock high response time
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 1000, // Above threshold of 500
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('response_time_high');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].message).toContain('Average response time is 1000ms');
    });

    it('should create alert for high error rate', async () => {
      // Mock high error rate by mocking calculateErrorRate
      jest.spyOn(service as any, 'calculateErrorRate').mockReturnValue(0.1); // 10% error rate

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('error_rate_high');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toContain('Error rate is 10.0%');
    });

    it('should create alert for bandwidth spike', async () => {
      // Mock bandwidth spike by adding metrics history
      const service = new CdnMonitoringService();
      (service as any).metricsHistory = [
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          totalRequests: 50000
        },
        {
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          totalRequests: 150000 // 3x increase
        }
      ];

      const mockStatistics = {
        totalRequests: 150000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('bandwidth_spike');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].message).toContain('Bandwidth spike detected');
    });

    it('should not create alerts when metrics are healthy', async () => {
      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(0);
    });
  });

  describe('getOptimizationRecommendations', () => {
    beforeEach(() => {
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      const mockAnalytics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topContent: [],
        geographicDistribution: {
          'US': 40000,
          'EU': 30000,
          'APAC': 20000
        },
        hourlyStats: []
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);
      mockCacheManagement.getCacheAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should recommend improving cache hit rate when low', async () => {
      // Mock low hit rate
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.5, // Low hit rate
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);

      const recommendations = await service.getOptimizationRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('cache_rule');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].title).toBe('Improve Cache Hit Rate');
    });

    it('should recommend compression when response time is high', async () => {
      // Mock high response time
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 500, // High response time
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);

      const recommendations = await service.getOptimizationRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('compression');
      expect(recommendations[0].priority).toBe('medium');
      expect(recommendations[0].title).toBe('Enable Compression for Text Content');
    });

    it('should recommend geographic optimization when multiple regions', async () => {
      const recommendations = await service.getOptimizationRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('geographic');
      expect(recommendations[0].priority).toBe('low');
      expect(recommendations[0].title).toBe('Optimize Geographic Distribution');
    });

    it('should return empty recommendations when metrics are optimal', async () => {
      // Mock optimal metrics
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.95, // High hit rate
        bandwidthSaved: 5000000000,
        averageResponseTime: 100, // Low response time
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      const mockAnalytics = {
        totalRequests: 100000,
        cacheHitRate: 0.95,
        bandwidthSaved: 5000000000,
        averageResponseTime: 100,
        topContent: [],
        geographicDistribution: {
          'US': 100000 // Single region
        },
        hourlyStats: []
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);
      mockCacheManagement.getCacheAnalytics.mockResolvedValue(mockAnalytics);

      const recommendations = await service.getOptimizationRecommendations();

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('getHealthDashboard', () => {
    beforeEach(() => {
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      const mockAnalytics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        topContent: [],
        geographicDistribution: {},
        hourlyStats: []
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);
      mockCacheManagement.getCacheAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should return comprehensive health dashboard', async () => {
      const dashboard = await service.getHealthDashboard();

      expect(dashboard).toHaveProperty('overallHealth');
      expect(dashboard).toHaveProperty('metrics');
      expect(dashboard).toHaveProperty('alerts');
      expect(dashboard).toHaveProperty('recommendations');
      expect(dashboard).toHaveProperty('trends');

      expect(dashboard.overallHealth).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(dashboard.metrics).toHaveProperty('totalRequests');
      expect(dashboard.metrics).toHaveProperty('cacheHitRate');
      expect(dashboard.trends).toHaveProperty('hitRateTrend');
      expect(dashboard.trends).toHaveProperty('responseTimeTrend');
      expect(dashboard.trends).toHaveProperty('bandwidthTrend');
    });

    it('should return healthy status when metrics are good', async () => {
      const dashboard = await service.getHealthDashboard();

      expect(dashboard.overallHealth).toBe('healthy');
      expect(dashboard.alerts).toHaveLength(0);
    });

    it('should return degraded status when there are warnings', async () => {
      // Mock high response time to trigger warning
      const mockStatistics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 1000, // High response time
        topPaths: ['/audio/episode-1.mp3'],
        lastUpdated: new Date()
      };

      mockCacheManagement.getCacheStatistics.mockResolvedValue(mockStatistics);

      const dashboard = await service.getHealthDashboard();

      expect(dashboard.overallHealth).toBe('degraded');
      expect(dashboard.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('calculateOverallHealth', () => {
    it('should return healthy when no critical issues', () => {
      const service = new CdnMonitoringService();
      const calculateHealth = (service as any).calculateOverallHealth;

      const metrics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        errorRate: 0.01,
        topContent: [],
        geographicDistribution: {},
        hourlyDistribution: []
      };

      const alerts = [];

      const health = calculateHealth(metrics, alerts);

      expect(health).toBe('healthy');
    });

    it('should return degraded when there are warnings', () => {
      const service = new CdnMonitoringService();
      const calculateHealth = (service as any).calculateOverallHealth;

      const metrics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        errorRate: 0.01,
        topContent: [],
        geographicDistribution: {},
        hourlyDistribution: []
      };

      const alerts = [
        {
          type: 'response_time_high',
          severity: 'warning',
          resolved: false
        }
      ];

      const health = calculateHealth(metrics, alerts);

      expect(health).toBe('degraded');
    });

    it('should return unhealthy when there are critical issues', () => {
      const service = new CdnMonitoringService();
      const calculateHealth = (service as any).calculateOverallHealth;

      const metrics = {
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        errorRate: 0.01,
        topContent: [],
        geographicDistribution: {},
        hourlyDistribution: []
      };

      const alerts = [
        {
          type: 'hit_rate_low',
          severity: 'critical',
          resolved: false
        }
      ];

      const health = calculateHealth(metrics, alerts);

      expect(health).toBe('unhealthy');
    });
  });

  describe('calculateTrends', () => {
    it('should calculate trends from metrics history', () => {
      const service = new CdnMonitoringService();
      const calculateTrends = (service as any).calculateTrends;

      // Mock metrics history
      (service as any).metricsHistory = [
        // Older metrics (6 data points)
        { cacheHitRate: 0.8, averageResponseTime: 200, totalRequests: 50000 },
        { cacheHitRate: 0.82, averageResponseTime: 190, totalRequests: 52000 },
        { cacheHitRate: 0.81, averageResponseTime: 195, totalRequests: 51000 },
        { cacheHitRate: 0.83, averageResponseTime: 185, totalRequests: 53000 },
        { cacheHitRate: 0.79, averageResponseTime: 205, totalRequests: 49000 },
        { cacheHitRate: 0.84, averageResponseTime: 180, totalRequests: 54000 },
        // Recent metrics (6 data points)
        { cacheHitRate: 0.85, averageResponseTime: 150, totalRequests: 55000 },
        { cacheHitRate: 0.87, averageResponseTime: 140, totalRequests: 57000 },
        { cacheHitRate: 0.86, averageResponseTime: 145, totalRequests: 56000 },
        { cacheHitRate: 0.88, averageResponseTime: 135, totalRequests: 58000 },
        { cacheHitRate: 0.84, averageResponseTime: 155, totalRequests: 54000 },
        { cacheHitRate: 0.89, averageResponseTime: 130, totalRequests: 59000 }
      ];

      const trends = calculateTrends();

      expect(trends).toHaveProperty('hitRateTrend');
      expect(trends).toHaveProperty('responseTimeTrend');
      expect(trends).toHaveProperty('bandwidthTrend');
      expect(['up', 'down', 'stable']).toContain(trends.hitRateTrend);
      expect(['up', 'down', 'stable']).toContain(trends.responseTimeTrend);
      expect(['up', 'down', 'stable']).toContain(trends.bandwidthTrend);
    });

    it('should return stable trends when insufficient data', () => {
      const service = new CdnMonitoringService();
      const calculateTrends = (service as any).calculateTrends;

      (service as any).metricsHistory = [];

      const trends = calculateTrends();

      expect(trends.hitRateTrend).toBe('stable');
      expect(trends.responseTimeTrend).toBe('stable');
      expect(trends.bandwidthTrend).toBe('stable');
    });
  });
});

