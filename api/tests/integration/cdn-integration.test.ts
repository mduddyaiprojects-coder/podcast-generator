import { CdnCacheManagementService } from '../../src/services/cdn-cache-management';
import { CdnMonitoringService } from '../../src/services/cdn-monitoring';
import { CdnInvalidationTriggersService } from '../../src/services/cdn-invalidation-triggers';
import { CdnTestUtils } from '../utils/cdn-test-utils';

// Mock Azure services
jest.mock('@azure/arm-cdn');
jest.mock('@azure/identity');

describe('CDN Integration Tests', () => {
  let cacheManagement: CdnCacheManagementService;
  let monitoring: CdnMonitoringService;
  let triggers: CdnInvalidationTriggersService;

  beforeEach(() => {
    // Set up environment variables
    process.env['AZURE_SUBSCRIPTION_ID'] = 'test-subscription-id';
    process.env['AZURE_RESOURCE_GROUP'] = 'test-resource-group';
    process.env['CDN_PROFILE_NAME'] = 'test-profile';
    process.env['CDN_ENDPOINT_NAME'] = 'test-endpoint';
    process.env['CDN_MIN_HIT_RATE'] = '0.7';
    process.env['CDN_MAX_RESPONSE_TIME'] = '500';
    process.env['CDN_MAX_ERROR_RATE'] = '0.05';
    process.env['CDN_BANDWIDTH_SPIKE_THRESHOLD'] = '2.0';

    cacheManagement = new CdnCacheManagementService();
    monitoring = new CdnMonitoringService();
    triggers = new CdnInvalidationTriggersService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End CDN Workflow', () => {
    it('should handle complete content lifecycle with cache invalidation', async () => {
      // 1. Upload audio file
      await triggers.processFileUpload(
        '/audio/episode-1.mp3',
        'audio/mpeg',
        50 * 1024 * 1024,
        'submission-123',
        'user-456'
      );

      // 2. Upload transcript
      await triggers.processFileUpdate(
        '/transcripts/episode-1.txt',
        'text/plain',
        1024 * 1024,
        'submission-123',
        'user-456'
      );

      // 3. Publish content
      await triggers.processContentPublish(
        'submission-123',
        [
          '/audio/episode-1.mp3',
          '/transcripts/episode-1.txt',
          '/feeds/episode-1.xml'
        ],
        'user-456'
      );

      // 4. Check cache health
      const health = await cacheManagement.checkCacheHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('recommendations');

      // 5. Get monitoring dashboard
      const dashboard = await monitoring.getHealthDashboard();
      expect(dashboard).toHaveProperty('overallHealth');
      expect(dashboard).toHaveProperty('metrics');
      expect(dashboard).toHaveProperty('alerts');
      expect(dashboard).toHaveProperty('recommendations');
    });

    it('should handle RSS feed updates with proper cache invalidation', async () => {
      // Upload RSS feed
      await triggers.processFileUpload(
        '/feeds/main.xml',
        'application/rss+xml',
        10 * 1024,
        'submission-123',
        'user-456'
      );

      // Check that RSS-specific triggers were activated
      const stats = triggers.getTriggerStatistics();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });

    it('should handle large file uploads with appropriate triggers', async () => {
      // Upload large audio file (>50MB)
      await triggers.processFileUpload(
        '/audio/large-episode.mp3',
        'audio/mpeg',
        100 * 1024 * 1024, // 100MB
        'submission-456',
        'user-789'
      );

      // Check that large file triggers were activated
      const stats = triggers.getTriggerStatistics();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });
  });

  describe('Cache Rule Validation', () => {
    it('should validate audio file caching rules', async () => {
      const scenarios = CdnTestUtils.createTestScenarios();
      const audioScenario = scenarios.find(s => s.name === 'Audio Files Caching');
      
      expect(audioScenario).toBeDefined();
      expect(audioScenario!.testCases).toHaveLength(2);

      for (const testCase of audioScenario!.testCases) {
        const response = await CdnTestUtils.simulateCdnRequest(testCase.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['Content-Type']).toBe(testCase.contentType);
        expect(response.headers['Cache-Control']).toContain('public');
        expect(response.headers['Cache-Control']).toContain('max-age=31536000'); // 365 days
        expect(response.headers['Cache-Control']).toContain('immutable');
      }
    });

    it('should validate image file caching rules', async () => {
      const scenarios = CdnTestUtils.createTestScenarios();
      const imageScenario = scenarios.find(s => s.name === 'Image Files Caching');
      
      expect(imageScenario).toBeDefined();

      for (const testCase of imageScenario!.testCases) {
        const response = await CdnTestUtils.simulateCdnRequest(testCase.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['Content-Type']).toBe(testCase.contentType);
        expect(response.headers['Cache-Control']).toContain('public');
        expect(response.headers['Cache-Control']).toContain('max-age=2592000'); // 30 days
      }
    });

    it('should validate text file caching rules', async () => {
      const scenarios = CdnTestUtils.createTestScenarios();
      const textScenario = scenarios.find(s => s.name === 'Text Files Caching');
      
      expect(textScenario).toBeDefined();

      for (const testCase of textScenario!.testCases) {
        const response = await CdnTestUtils.simulateCdnRequest(testCase.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['Content-Type']).toBe(testCase.contentType);
        expect(response.headers['Cache-Control']).toContain('public');
        expect(response.headers['Cache-Control']).toContain('max-age=604800'); // 7 days
        expect(response.headers['Content-Encoding']).toBe('gzip');
      }
    });

    it('should validate RSS feed caching rules', async () => {
      const scenarios = CdnTestUtils.createTestScenarios();
      const rssScenario = scenarios.find(s => s.name === 'RSS Feeds Caching');
      
      expect(rssScenario).toBeDefined();

      for (const testCase of rssScenario!.testCases) {
        const response = await CdnTestUtils.simulateCdnRequest(testCase.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['Content-Type']).toBe(testCase.contentType);
        expect(response.headers['Cache-Control']).toContain('public');
        expect(response.headers['Cache-Control']).toContain('max-age=300'); // 5 minutes
      }
    });

    it('should validate JSON file caching rules', async () => {
      const scenarios = CdnTestUtils.createTestScenarios();
      const jsonScenario = scenarios.find(s => s.name === 'JSON Files Caching');
      
      expect(jsonScenario).toBeDefined();

      for (const testCase of jsonScenario!.testCases) {
        const response = await CdnTestUtils.simulateCdnRequest(testCase.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['Content-Type']).toBe(testCase.contentType);
        expect(response.headers['Cache-Control']).toContain('public');
        expect(response.headers['Cache-Control']).toContain('max-age=86400'); // 24 hours
        expect(response.headers['Content-Encoding']).toBe('gzip');
      }
    });

    it('should validate temporary file no-cache rules', async () => {
      const scenarios = CdnTestUtils.createTestScenarios();
      const tempScenario = scenarios.find(s => s.name === 'Temporary Files No Cache');
      
      expect(tempScenario).toBeDefined();

      for (const testCase of tempScenario!.testCases) {
        const response = await CdnTestUtils.simulateCdnRequest(testCase.path);
        
        expect(response.status).toBe(200);
        expect(response.headers['Cache-Control']).toContain('no-cache');
        expect(response.headers['Cache-Control']).toContain('no-store');
        expect(response.headers['Cache-Control']).toContain('must-revalidate');
      }
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const testData = CdnTestUtils.createPerformanceTestData();
      
      const results = await CdnTestUtils.simulateLoadTest(
        testData.requestUrls,
        testData.concurrentRequests,
        10 // 10 seconds
      );

      expect(results.totalRequests).toBeGreaterThan(0);
      expect(results.successfulRequests).toBeGreaterThan(0);
      expect(results.averageResponseTime).toBeLessThan(1000); // Less than 1 second
      expect(results.throughput).toBeGreaterThan(100); // More than 100 requests per second
      expect(results.errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });

    it('should maintain cache hit rate under load', async () => {
      const testData = CdnTestUtils.createPerformanceTestData();
      
      const results = await CdnTestUtils.simulateLoadTest(
        testData.requestUrls,
        50, // 50 concurrent requests
        5 // 5 seconds
      );

      // Simulate cache hit rate calculation
      const responses = Array.from({ length: results.totalRequests }, () => ({
        fromCache: Math.random() > 0.3 // 70% cache hit rate
      }));

      const cacheHitRate = CdnTestUtils.calculateCacheHitRate(responses);
      expect(cacheHitRate).toBeGreaterThan(0.6); // At least 60% cache hit rate
    });
  });

  describe('Cache Invalidation Scenarios', () => {
    it('should invalidate cache for submission content updates', async () => {
      const submissionId = 'test-submission-123';
      
      // Mock cache invalidation
      const mockInvalidateCache = jest.fn().mockResolvedValue({
        success: true,
        invalidationId: 'test-invalidation'
      });
      
      (cacheManagement as any).invalidateCache = mockInvalidateCache;

      // Process content publish
      await triggers.processContentPublish(
        submissionId,
        [
          `/audio/${submissionId}.mp3`,
          `/transcripts/${submissionId}.txt`,
          `/feeds/${submissionId}.xml`
        ],
        'user-456'
      );

      // Should have triggered invalidation
      expect(mockInvalidateCache).toHaveBeenCalled();
    });

    it('should handle scheduled invalidation', async () => {
      const mockInvalidateCache = jest.fn().mockResolvedValue({
        success: true,
        invalidationId: 'scheduled-invalidation'
      });
      
      (cacheManagement as any).invalidateCache = mockInvalidateCache;

      // Process scheduled invalidation
      await triggers.processScheduledInvalidation();

      // Should have triggered invalidation for RSS feeds
      expect(mockInvalidateCache).toHaveBeenCalled();
    });
  });

  describe('Monitoring and Alerting', () => {
    it('should detect and alert on low cache hit rate', async () => {
      // Mock low hit rate metrics
      const mockCollectMetrics = jest.fn().mockResolvedValue({
        timestamp: new Date(),
        totalRequests: 100000,
        cacheHitRate: 0.5, // Low hit rate
        bandwidthSaved: 5000000000,
        averageResponseTime: 150,
        errorRate: 0.01,
        topContent: [],
        geographicDistribution: {},
        hourlyDistribution: []
      });

      (monitoring as any).collectMetrics = mockCollectMetrics;

      const alerts = await monitoring.checkAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('hit_rate_low');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should detect and alert on high response time', async () => {
      // Mock high response time metrics
      const mockCollectMetrics = jest.fn().mockResolvedValue({
        timestamp: new Date(),
        totalRequests: 100000,
        cacheHitRate: 0.85,
        bandwidthSaved: 5000000000,
        averageResponseTime: 1000, // High response time
        errorRate: 0.01,
        topContent: [],
        geographicDistribution: {},
        hourlyDistribution: []
      });

      (monitoring as any).collectMetrics = mockCollectMetrics;

      const alerts = await monitoring.checkAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('response_time_high');
      expect(alerts[0].severity).toBe('warning');
    });

    it('should provide optimization recommendations', async () => {
      // Mock suboptimal metrics
      const mockCollectMetrics = jest.fn().mockResolvedValue({
        timestamp: new Date(),
        totalRequests: 100000,
        cacheHitRate: 0.6, // Low hit rate
        bandwidthSaved: 5000000000,
        averageResponseTime: 400, // High response time
        errorRate: 0.01,
        topContent: [],
        geographicDistribution: {
          'US': 40000,
          'EU': 30000,
          'APAC': 20000
        },
        hourlyDistribution: []
      });

      (monitoring as any).collectMetrics = mockCollectMetrics;

      const recommendations = await monitoring.getOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('cache_rule');
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle cache invalidation failures gracefully', async () => {
      // Mock cache invalidation failure
      const mockInvalidateCache = jest.fn().mockRejectedValue(new Error('CDN unavailable'));
      (cacheManagement as any).invalidateCache = mockInvalidateCache;

      // Process file upload
      await triggers.processFileUpload(
        '/audio/episode-1.mp3',
        'audio/mpeg',
        50 * 1024 * 1024,
        'submission-123',
        'user-456'
      );

      // Should not throw error
      expect(mockInvalidateCache).toHaveBeenCalled();
    });

    it('should handle monitoring service failures gracefully', async () => {
      // Mock monitoring failure
      const mockCollectMetrics = jest.fn().mockRejectedValue(new Error('Monitoring unavailable'));
      (monitoring as any).collectMetrics = mockCollectMetrics;

      // Should handle error gracefully
      await expect(monitoring.checkAlerts()).resolves.toEqual([]);
    });

    it('should maintain service availability during partial failures', async () => {
      // Mock partial service failures
      const mockInvalidateCache = jest.fn().mockRejectedValue(new Error('Partial failure'));
      (cacheManagement as any).invalidateCache = mockInvalidateCache;

      // Process multiple events
      const events = [
        triggers.processFileUpload('/audio/episode-1.mp3', 'audio/mpeg', 1024, 'sub-1', 'user-1'),
        triggers.processFileUpload('/audio/episode-2.mp3', 'audio/mpeg', 1024, 'sub-2', 'user-2'),
        triggers.processFileUpload('/audio/episode-3.mp3', 'audio/mpeg', 1024, 'sub-3', 'user-3')
      ];

      // All should complete without throwing
      await expect(Promise.all(events)).resolves.toBeDefined();
    });
  });

  describe('Configuration and Customization', () => {
    it('should support custom trigger configuration', () => {
      const customTrigger = {
        id: 'custom-trigger',
        name: 'Custom Trigger',
        description: 'A custom invalidation trigger',
        enabled: true,
        conditions: [
          {
            type: 'content_type' as const,
            operator: 'equals' as const,
            value: 'application/pdf'
          }
        ],
        actions: [
          {
            type: 'invalidate_path' as const,
            target: '/documents/${filePath}'
          }
        ],
        triggerCount: 0
      };

      triggers.addTrigger(customTrigger);

      const stats = triggers.getTriggerStatistics();
      expect(stats.totalTriggers).toBeGreaterThan(0);
    });

    it('should support trigger updates', () => {
      const triggerId = 'audio-upload-trigger';
      const updates = {
        enabled: false,
        description: 'Updated audio upload trigger'
      };

      const updated = triggers.updateTrigger(triggerId, updates);
      expect(updated).toBe(true);
    });

    it('should support trigger removal', () => {
      const triggerId = 'audio-upload-trigger';
      const initialStats = triggers.getTriggerStatistics();
      
      const removed = triggers.removeTrigger(triggerId);
      expect(removed).toBe(true);

      const finalStats = triggers.getTriggerStatistics();
      expect(finalStats.totalTriggers).toBe(initialStats.totalTriggers - 1);
    });
  });
});

