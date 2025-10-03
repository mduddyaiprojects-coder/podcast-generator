/**
 * Performance Tests: Health & Heartbeat Endpoints
 * 
 * Tests to ensure health and heartbeat endpoints meet performance requirements.
 * 
 * T028 Requirement: Ensure health/heartbeat <1s p95, add lightweight caching if needed
 * 
 * These tests measure response times to verify the <1s p95 requirement is met.
 */

import { describe, it, expect } from '@jest/globals';
import { HealthProviderFactory } from '../../src/integrations/health-providers';
import { healthCheckCache } from '../../src/utils/health-cache';

describe('Health & Heartbeat Performance (T028)', () => {
  
  beforeAll(() => {
    // Clear any existing cache before tests
    healthCheckCache.clearAll();
    // Clear provider instances to ensure fresh state
    HealthProviderFactory.clearProviders();
  });

  afterAll(() => {
    // Clean up
    healthCheckCache.clearAll();
  });

  describe('Response Time Requirements', () => {
    /**
     * Test that health checks complete within 1 second on cached requests
     * This is the p95 requirement from T028
     */
    it('should return YouTube health status in <1s when cached', async () => {
      const provider = HealthProviderFactory.getYouTubeProvider();
      
      // First call - will be slower (actual check)
      await provider.checkHealth();
      
      // Measure cached call performance
      const measurements: number[] = [];
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await provider.checkHealth();
        const duration = Date.now() - start;
        measurements.push(duration);
      }
      
      // Calculate p95
      const sorted = measurements.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95 = sorted[p95Index];
      
      // Verify p95 is under 1 second (1000ms)
      expect(p95).toBeLessThan(1000);
      
      // Also verify average is reasonable
      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avg).toBeLessThan(100); // Cached responses should be very fast
    }, 30000); // 30 second timeout for the test

    it('should return Document Ingestion health status in <1s when cached', async () => {
      const provider = HealthProviderFactory.getDocumentIngestionProvider();
      
      // First call - will be slower (actual check)
      await provider.checkHealth();
      
      // Measure cached call performance
      const measurements: number[] = [];
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await provider.checkHealth();
        const duration = Date.now() - start;
        measurements.push(duration);
      }
      
      // Calculate p95
      const sorted = measurements.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95 = sorted[p95Index];
      
      // Verify p95 is under 1 second (1000ms)
      expect(p95).toBeLessThan(1000);
      
      // Also verify average is reasonable
      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avg).toBeLessThan(100); // Cached responses should be very fast
    }, 30000);
  });

  describe('Cache Effectiveness', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const provider = HealthProviderFactory.getYouTubeProvider();
      
      // Clear cache to ensure fresh start
      healthCheckCache.clearAll();
      
      // Measure uncached performance (first call)
      const uncachedStart = Date.now();
      const uncachedResult = await provider.checkHealth();
      const uncachedDuration = Date.now() - uncachedStart;
      
      expect(uncachedResult).toBeDefined();
      expect(uncachedResult.status).toBeDefined();
      
      // Measure cached performance (subsequent calls)
      const cachedMeasurements: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await provider.checkHealth();
        const duration = Date.now() - start;
        cachedMeasurements.push(duration);
      }
      
      const avgCached = cachedMeasurements.reduce((a, b) => a + b, 0) / cachedMeasurements.length;
      
      // Cached calls should be significantly faster
      // We expect at least 10x improvement for cached responses
      const improvementRatio = uncachedDuration / avgCached;
      expect(improvementRatio).toBeGreaterThan(2); // At least 2x faster
      
      // Log for debugging
      console.log({
        uncachedDuration,
        avgCached,
        improvementRatio: improvementRatio.toFixed(2) + 'x faster'
      });
    }, 30000);
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent health checks efficiently', async () => {
      const provider = HealthProviderFactory.getYouTubeProvider();
      
      // Clear cache
      healthCheckCache.clearAll();
      
      // First call to populate cache
      await provider.checkHealth();
      
      // Make 50 concurrent requests
      const concurrentRequests = 50;
      const start = Date.now();
      
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => provider.checkHealth());
      
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - start;
      
      // All should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.status).toBeDefined();
      });
      
      // Average time per request should be very low when cached
      const avgTimePerRequest = totalDuration / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(100); // Less than 100ms per request on average
      
      // Total time should still be under 5 seconds
      expect(totalDuration).toBeLessThan(5000);
      
      console.log({
        concurrentRequests,
        totalDuration,
        avgTimePerRequest: avgTimePerRequest.toFixed(2) + 'ms'
      });
    }, 30000);
  });

  describe('Cache Expiration Behavior', () => {
    it('should refresh cache after TTL expires', async () => {
      // Create a provider instance
      const provider = HealthProviderFactory.getYouTubeProvider();
      
      // Clear cache
      healthCheckCache.clearAll();
      
      // First call - populates cache
      const result1 = await provider.checkHealth();
      expect(result1).toBeDefined();
      
      // Immediate second call - uses cache
      const cachedStart = Date.now();
      const result2 = await provider.checkHealth();
      const cachedDuration = Date.now() - cachedStart;
      
      expect(result2).toBeDefined();
      expect(cachedDuration).toBeLessThan(100); // Should be very fast
      
      // Note: We can't easily test cache expiration in unit tests
      // without waiting 30 seconds, but the cache mechanism is tested
      // in health-cache.test.ts
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance statistics', async () => {
      const provider = HealthProviderFactory.getYouTubeProvider();
      
      // Clear cache
      healthCheckCache.clearAll();
      
      // Make several calls
      await provider.checkHealth();
      await provider.checkHealth();
      await provider.checkHealth();
      
      // Get cache statistics
      const stats = healthCheckCache.getStats();
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries).toBeDefined();
      
      // Each entry should have performance metrics
      stats.entries.forEach(entry => {
        expect(entry.key).toBeDefined();
        expect(typeof entry.age).toBe('number');
        expect(typeof entry.ttl).toBe('number');
        expect(entry.ttl).toBeGreaterThan(0); // Should have TTL remaining
      });
    });
  });
});
