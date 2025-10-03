/**
 * Health Check Cache
 * 
 * Provides lightweight caching for health check results to ensure
 * fast response times (<1s p95) for health and heartbeat endpoints.
 * 
 * Related to T028: Performance optimization for health/heartbeat endpoints
 */

import { logger } from './logger';

/**
 * Cached health check result
 */
interface CachedHealthResult<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

/**
 * Health check cache service
 * 
 * Provides in-memory caching with TTL for health check results.
 * This prevents repeated expensive API calls to external services
 * during health checks.
 */
export class HealthCheckCache {
  private cache = new Map<string, CachedHealthResult<any>>();
  private defaultTtlMs: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(defaultTtlMs: number = 30000) { // Default 30 seconds
    this.defaultTtlMs = defaultTtlMs;
    
    // Start cleanup interval to remove expired entries
    this.startCleanupInterval();
  }

  /**
   * Destroy the cache and stop cleanup interval
   * Should be called when the cache is no longer needed (e.g., in tests)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
  }

  /**
   * Get cached result if available and not expired
   * 
   * @param key - Cache key
   * @returns Cached data or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    
    if (!cached) {
      logger.debug('Health cache miss', { key });
      return undefined;
    }

    // Check if expired
    if (new Date() > cached.expiresAt) {
      logger.debug('Health cache expired', { 
        key, 
        expiresAt: cached.expiresAt.toISOString() 
      });
      this.cache.delete(key);
      return undefined;
    }

    logger.debug('Health cache hit', { 
      key, 
      age: Date.now() - cached.timestamp.getTime() 
    });
    return cached.data;
  }

  /**
   * Set cached result with TTL
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlMs - Time to live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });

    logger.debug('Health cache set', { 
      key, 
      ttl, 
      expiresAt: expiresAt.toISOString() 
    });
  }

  /**
   * Clear a specific cache entry
   * 
   * @param key - Cache key to clear
   */
  clear(key: string): void {
    this.cache.delete(key);
    logger.debug('Health cache cleared', { key });
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Health cache cleared all entries', { entriesCleared: size });
  }

  /**
   * Get or compute cached result
   * 
   * This is a convenience method that gets from cache if available,
   * or executes the compute function and caches the result.
   * 
   * @param key - Cache key
   * @param computeFn - Function to compute result if not cached
   * @param ttlMs - Time to live in milliseconds (optional)
   * @returns Cached or computed result
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Not in cache, compute
    logger.debug('Health cache computing', { key });
    const startTime = Date.now();
    
    try {
      const result = await computeFn();
      const computeTime = Date.now() - startTime;
      
      // Cache the result
      this.set(key, result, ttlMs);
      
      logger.info('Health cache computed and stored', { 
        key, 
        computeTime 
      });
      
      return result;
    } catch (error) {
      const computeTime = Date.now() - startTime;
      logger.error('Health cache compute failed', { 
        key, 
        computeTime, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
    
    // Don't keep the process alive just for this interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = new Date();
    let removed = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Health cache cleanup completed', { 
        entriesRemoved: removed, 
        entriesRemaining: this.cache.size 
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
    }>;
  } {
    const now = Date.now();
    const entries: Array<{ key: string; age: number; ttl: number }> = [];

    for (const [key, cached] of this.cache.entries()) {
      entries.push({
        key,
        age: now - cached.timestamp.getTime(),
        ttl: cached.expiresAt.getTime() - now
      });
    }

    return {
      size: this.cache.size,
      entries
    };
  }
}

// Export singleton instance with 30-second default TTL for health checks
// This ensures health endpoints respond quickly while still detecting issues
export const healthCheckCache = new HealthCheckCache(30000);
