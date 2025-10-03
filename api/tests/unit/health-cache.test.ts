/**
 * Unit Tests: Health Check Cache
 * 
 * Tests for the health check caching mechanism that ensures
 * fast response times (<1s p95) for health and heartbeat endpoints.
 * 
 * Related to T028: Performance optimization for health endpoints
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HealthCheckCache } from '../../src/utils/health-cache';

describe('HealthCheckCache', () => {
  let cache: HealthCheckCache;

  beforeEach(() => {
    // Create a new cache instance for each test
    cache = new HealthCheckCache(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    // Clean up cache to prevent open handles
    cache.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve values', () => {
      const testData = { status: 'OK', message: 'Test' };
      cache.set('test-key', testData);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for expired entries', async () => {
      const testData = { status: 'OK', message: 'Test' };
      cache.set('test-key', testData, 100); // 100ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toBeUndefined();
    });

    it('should clear specific cache entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      
      cache.clear('key1');
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toEqual({ data: 'value2' });
    });

    it('should clear all cache entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      
      cache.clearAll();
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('getOrCompute', () => {
    it('should compute and cache result if not in cache', async () => {
      const computeFn = jest.fn(async () => ({ status: 'OK', message: 'Computed' }));
      
      const result = await cache.getOrCompute('test-key', computeFn);
      
      expect(result).toEqual({ status: 'OK', message: 'Computed' });
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached result without computing', async () => {
      const computeFn = jest.fn(async () => ({ status: 'OK', message: 'Computed' }));
      
      // First call - should compute
      await cache.getOrCompute('test-key', computeFn);
      
      // Second call - should use cache
      const result = await cache.getOrCompute('test-key', computeFn);
      
      expect(result).toEqual({ status: 'OK', message: 'Computed' });
      expect(computeFn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should recompute after cache expires', async () => {
      let callCount = 0;
      const computeFn = async () => {
        callCount++;
        return { status: 'OK', message: callCount === 1 ? 'First' : 'Second' };
      };
      
      // First call
      const result1 = await cache.getOrCompute('test-key', computeFn, 100); // 100ms TTL
      expect(result1).toEqual({ status: 'OK', message: 'First' });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second call - should recompute
      const result2 = await cache.getOrCompute('test-key', computeFn, 100);
      expect(result2).toEqual({ status: 'OK', message: 'Second' });
      expect(callCount).toBe(2);
    });

    it('should propagate compute errors', async () => {
      const error = new Error('Compute failed');
      const computeFn = jest.fn(async () => {
        throw error;
      });
      
      await expect(cache.getOrCompute('test-key', computeFn)).rejects.toThrow('Compute failed');
    });
  });

  describe('Performance Characteristics', () => {
    it('should return cached results quickly (T028: <1s requirement)', async () => {
      const slowComputeFn = jest.fn(async () => {
        // Simulate slow external API call
        await new Promise(resolve => setTimeout(resolve, 500));
        return { status: 'OK', message: 'Slow result' };
      });
      
      // First call - will be slow
      const start1 = Date.now();
      await cache.getOrCompute('test-key', slowComputeFn);
      const duration1 = Date.now() - start1;
      expect(duration1).toBeGreaterThanOrEqual(500);
      
      // Second call - should be fast (from cache)
      const start2 = Date.now();
      await cache.getOrCompute('test-key', slowComputeFn);
      const duration2 = Date.now() - start2;
      expect(duration2).toBeLessThan(50); // Should be nearly instant
      expect(slowComputeFn).toHaveBeenCalledTimes(1); // Not called second time
    });

    it('should handle multiple concurrent requests efficiently', async () => {
      let computeCount = 0;
      const computeFn = jest.fn(async () => {
        computeCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { status: 'OK', message: `Result ${computeCount}` };
      });
      
      // First request populates cache
      await cache.getOrCompute('test-key', computeFn);
      
      // Multiple concurrent requests should all use cache
      const requests = Array(10).fill(null).map(() => 
        cache.getOrCompute('test-key', computeFn)
      );
      
      const results = await Promise.all(requests);
      
      // All should return the same cached result
      results.forEach(result => {
        expect(result).toEqual({ status: 'OK', message: 'Result 1' });
      });
      
      // Compute function should only be called once
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should report cache statistics', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('key');
      expect(stats.entries[0]).toHaveProperty('age');
      expect(stats.entries[0]).toHaveProperty('ttl');
    });

    it('should calculate correct age and TTL', async () => {
      cache.set('test-key', { data: 'value' }, 5000); // 5 second TTL
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = cache.getStats();
      const entry = stats.entries.find(e => e.key === 'test-key');
      
      expect(entry).toBeDefined();
      expect(entry!.age).toBeGreaterThanOrEqual(100);
      expect(entry!.age).toBeLessThan(200);
      expect(entry!.ttl).toBeLessThanOrEqual(5000);
      expect(entry!.ttl).toBeGreaterThan(4800);
    });
  });

  describe('TTL Management', () => {
    it('should use default TTL when not specified', () => {
      const defaultCache = new HealthCheckCache(2000); // 2 second default
      try {
        defaultCache.set('test-key', { data: 'value' });
        
        const stats = defaultCache.getStats();
        const entry = stats.entries[0];
        
        expect(entry).toBeDefined();
        expect(entry!.ttl).toBeLessThanOrEqual(2000);
        expect(entry!.ttl).toBeGreaterThan(1900);
      } finally {
        defaultCache.destroy();
      }
    });

    it('should use custom TTL when specified', () => {
      cache.set('test-key', { data: 'value' }, 500); // Custom 500ms TTL
      
      const stats = cache.getStats();
      const entry = stats.entries[0];
      
      expect(entry).toBeDefined();
      expect(entry!.ttl).toBeLessThanOrEqual(500);
      expect(entry!.ttl).toBeGreaterThan(400);
    });
  });

  describe('Health Check Integration', () => {
    it('should support typical health check usage pattern', async () => {
      // Simulate health check function that takes 300ms
      const healthCheckFn = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          status: 'OK' as const,
          message: 'Service healthy',
          lastSuccessAt: new Date()
        };
      });
      
      // First health check - slow
      const start1 = Date.now();
      const result1 = await cache.getOrCompute('health:youtube', healthCheckFn, 30000);
      const duration1 = Date.now() - start1;
      
      expect(result1.status).toBe('OK');
      expect(duration1).toBeGreaterThanOrEqual(300);
      
      // Subsequent checks within TTL - fast
      const start2 = Date.now();
      const result2 = await cache.getOrCompute('health:youtube', healthCheckFn, 30000);
      const duration2 = Date.now() - start2;
      
      expect(result2.status).toBe('OK');
      expect(duration2).toBeLessThan(50); // Much faster than 1s requirement
      expect(healthCheckFn).toHaveBeenCalledTimes(1); // Only called once
    });
  });
});
