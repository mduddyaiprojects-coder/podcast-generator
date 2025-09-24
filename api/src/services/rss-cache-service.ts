import { CdnCacheManagementService } from './cdn-cache-management';
import { logger } from '../utils/logger';
import { PodcastEpisode } from '../models/podcast-episode';
import { RssGenerator } from './rss-generator';

/**
 * RSS Feed Cache Service
 * 
 * Manages caching and performance optimization for RSS feeds including:
 * - RSS feed generation and caching
 * - Cache invalidation strategies
 * - Performance monitoring
 * - CDN integration
 */

export interface RssCacheConfig {
  defaultCacheDuration: number; // in seconds
  maxCacheSize: number; // in bytes
  enableCompression: boolean;
  enableCDN: boolean;
  cacheKeyPrefix: string;
  invalidationStrategy: 'immediate' | 'scheduled' | 'lazy';
}

export interface RssCacheEntry {
  content: string;
  timestamp: number;
  ttl: number;
  size: number;
  compressed: boolean;
  episodeCount: number;
  lastModified: Date;
  etag: string;
}

export interface RssCacheStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageResponseTime: number;
  totalDataServed: number;
  compressionRatio: number;
  invalidationCount: number;
  lastInvalidation: Date | null;
}

export interface RssCacheOptions {
  forceRefresh?: boolean;
  includeChapters?: boolean;
  includeTranscript?: boolean;
  maxEpisodes?: number;
  sortOrder?: 'newest' | 'oldest';
  compression?: boolean;
}

export class RssCacheService {
  private cache: Map<string, RssCacheEntry> = new Map();
  private cdnCacheService: CdnCacheManagementService;
  private rssGenerator: RssGenerator;
  private config: RssCacheConfig;
  private stats: RssCacheStats;
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor() {
    this.config = {
      defaultCacheDuration: 3600, // 1 hour
      maxCacheSize: 10 * 1024 * 1024, // 10MB
      enableCompression: true,
      enableCDN: process.env['ENABLE_CDN'] === 'true',
      cacheKeyPrefix: 'rss:',
      invalidationStrategy: 'immediate'
    };

    this.cdnCacheService = new CdnCacheManagementService();
    this.rssGenerator = new RssGenerator();

    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageResponseTime: 0,
      totalDataServed: 0,
      compressionRatio: 0,
      invalidationCount: 0,
      lastInvalidation: null
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get RSS feed with caching
   */
  async getRssFeed(
    episodes: PodcastEpisode[],
    feedSlug: string = 'default',
    options: RssCacheOptions = {}
  ): Promise<{
    content: string;
    fromCache: boolean;
    responseTime: number;
    etag: string;
    lastModified: Date;
  }> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    const cacheKey = this.generateCacheKey(feedSlug, options);
    const etag = this.generateEtag(episodes, options);
    
    // Check cache first
    if (!options.forceRefresh) {
      const cached = this.getCachedEntry(cacheKey, etag);
      if (cached) {
        this.stats.cacheHits++;
        this.updateHitRate();
        
        logger.debug('RSS cache hit', { 
          feedSlug, 
          cacheKey, 
          episodeCount: cached.episodeCount,
          age: Date.now() - cached.timestamp
        });

        return {
          content: cached.content,
          fromCache: true,
          responseTime: Date.now() - startTime,
          etag: cached.etag,
          lastModified: cached.lastModified
        };
      }
    }

    // Cache miss - generate new RSS feed
    this.stats.cacheMisses++;
    this.updateHitRate();

    logger.debug('RSS cache miss', { feedSlug, cacheKey });

    const rssContent = await this.generateRssContent(episodes, options);
    const compressed = this.config.enableCompression && options.compression !== false;
    const finalContent = compressed ? await this.compressContent(rssContent) : rssContent;
    
    const entry: RssCacheEntry = {
      content: finalContent,
      timestamp: Date.now(),
      ttl: this.config.defaultCacheDuration,
      size: Buffer.byteLength(finalContent, 'utf8'),
      compressed,
      episodeCount: episodes.length,
      lastModified: new Date(),
      etag
    };

    // Store in cache
    this.setCachedEntry(cacheKey, entry);

    // Update stats
    this.stats.totalDataServed += entry.size;
    this.updateCompressionRatio();

    const responseTime = Date.now() - startTime;
    this.updateAverageResponseTime(responseTime);

    logger.info('RSS feed generated and cached', {
      feedSlug,
      episodeCount: episodes.length,
      size: entry.size,
      compressed: entry.compressed,
      responseTime
    });

    return {
      content: finalContent,
      fromCache: false,
      responseTime,
      etag: entry.etag,
      lastModified: entry.lastModified
    };
  }

  /**
   * Invalidate RSS feed cache
   */
  async invalidateRssCache(
    feedSlug: string = 'default',
    reason: string = 'manual'
  ): Promise<{ success: boolean; invalidatedKeys: string[]; error?: string }> {
    try {
      const keysToInvalidate: string[] = [];
      
      // Find all cache keys for this feed
      for (const [key] of this.cache.entries()) {
        if (key.startsWith(`${this.config.cacheKeyPrefix}${feedSlug}:`)) {
          keysToInvalidate.push(key);
        }
      }

      // Remove from local cache
      keysToInvalidate.forEach(key => this.cache.delete(key));

      // Invalidate CDN cache if enabled
      if (this.config.enableCDN) {
        const cdnPaths = [
          `/feeds/${feedSlug}/rss.xml`,
          `/feeds/${feedSlug}/episodes`
        ];

        await this.cdnCacheService.invalidateCache({
          contentPaths: cdnPaths,
          domains: [],
          reason: `RSS feed invalidation: ${reason}`
        });
      }

      // Update stats
      this.stats.invalidationCount++;
      this.stats.lastInvalidation = new Date();

      logger.info('RSS cache invalidated', {
        feedSlug,
        invalidatedKeys: keysToInvalidate.length,
        reason
      });

      return {
        success: true,
        invalidatedKeys: keysToInvalidate
      };
    } catch (error) {
      logger.error('Failed to invalidate RSS cache', { error, feedSlug, reason });
      return {
        success: false,
        invalidatedKeys: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Invalidate cache when episodes are added/updated
   */
  async invalidateOnEpisodeChange(
    episodeId: string,
    changeType: 'created' | 'updated' | 'deleted'
  ): Promise<void> {
    try {
      // Determine invalidation strategy
      switch (this.config.invalidationStrategy) {
        case 'immediate':
          await this.invalidateRssCache('default', `episode ${changeType}: ${episodeId}`);
          break;
        
        case 'scheduled':
          // Schedule invalidation for next batch
          await this.scheduleInvalidation(`episode ${changeType}: ${episodeId}`);
          break;
        
        case 'lazy':
          // Mark for lazy invalidation
          this.markForLazyInvalidation();
          break;
      }

      logger.debug('Episode change invalidation triggered', {
        episodeId,
        changeType,
        strategy: this.config.invalidationStrategy
      });
    } catch (error) {
      logger.error('Failed to trigger episode change invalidation', { error, episodeId, changeType });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): RssCacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache health information
   */
  getCacheHealth(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
    memoryUsage: number;
    entryCount: number;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check memory usage
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    const memoryUsage = (totalSize / this.config.maxCacheSize) * 100;
    
    if (memoryUsage > 90) {
      issues.push('Cache memory usage is very high');
      recommendations.push('Consider reducing cache duration or implementing LRU eviction');
    }
    
    // Check hit rate
    if (this.stats.hitRate < 0.5) {
      issues.push('Cache hit rate is low');
      recommendations.push('Review cache key generation and TTL settings');
    }
    
    // Check response time
    if (this.stats.averageResponseTime > 1000) {
      issues.push('Average response time is high');
      recommendations.push('Consider enabling compression or optimizing RSS generation');
    }
    
    // Check for stale entries
    const now = Date.now();
    const staleEntries = Array.from(this.cache.values()).filter(
      entry => (now - entry.timestamp) > entry.ttl * 1000
    ).length;
    
    if (staleEntries > 0) {
      issues.push(`${staleEntries} stale cache entries found`);
      recommendations.push('Run cache cleanup more frequently');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
      memoryUsage,
      entryCount: this.cache.size
    };
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageResponseTime: 0,
      totalDataServed: 0,
      compressionRatio: 0,
      invalidationCount: 0,
      lastInvalidation: null
    };

    logger.info('RSS cache cleared');
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(feedSlug: string, options: RssCacheOptions): string {
    const optionsHash = this.hashOptions(options);
    return `${this.config.cacheKeyPrefix}${feedSlug}:${optionsHash}`;
  }

  /**
   * Generate ETag for content
   */
  private generateEtag(episodes: PodcastEpisode[], options: RssCacheOptions): string {
    const episodeIds = episodes.map(ep => ep.id).sort().join(',');
    const optionsStr = JSON.stringify(options);
    const content = `${episodeIds}:${optionsStr}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * Get cached entry if valid
   */
  private getCachedEntry(cacheKey: string, etag: string): RssCacheEntry | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = (now - entry.timestamp) > entry.ttl * 1000;
    
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Check ETag match
    if (entry.etag !== etag) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * Set cached entry
   */
  private setCachedEntry(cacheKey: string, entry: RssCacheEntry): void {
    // Check memory limit
    if (entry.size > this.config.maxCacheSize) {
      logger.warn('RSS entry too large for cache', { size: entry.size, maxSize: this.config.maxCacheSize });
      return;
    }

    this.cache.set(cacheKey, entry);
  }

  /**
   * Generate RSS content
   */
  private async generateRssContent(episodes: PodcastEpisode[], options: RssCacheOptions): Promise<string> {
    const rssOptions = {
      include_chapters: options.includeChapters,
      include_transcript: options.includeTranscript,
      max_episodes: options.maxEpisodes,
      sort_order: options.sortOrder
    };

    return await this.rssGenerator.generateRss(episodes, {}, rssOptions);
  }

  /**
   * Compress content
   */
  private async compressContent(content: string): Promise<string> {
    // Simple compression simulation - in production, use actual compression
    return content.replace(/\s+/g, ' ').trim();
  }

  /**
   * Hash options for cache key
   */
  private hashOptions(options: RssCacheOptions): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((result, key) => {
        result[key] = options[key as keyof RssCacheOptions];
        return result;
      }, {} as any);
    
    return Buffer.from(JSON.stringify(sortedOptions)).toString('base64').slice(0, 16);
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.cacheHits / this.stats.totalRequests 
      : 0;
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / this.stats.totalRequests;
  }

  /**
   * Update compression ratio
   */
  private updateCompressionRatio(): void {
    const compressedEntries = Array.from(this.cache.values()).filter(entry => entry.compressed);
    if (compressedEntries.length > 0) {
      const totalOriginalSize = compressedEntries.reduce((sum, entry) => sum + entry.size, 0);
      const totalCompressedSize = compressedEntries.reduce((sum, entry) => sum + entry.size, 0);
      this.stats.compressionRatio = totalCompressedSize / totalOriginalSize;
    }
  }

  /**
   * Schedule invalidation
   */
  private async scheduleInvalidation(reason: string): Promise<void> {
    // Implementation would depend on your scheduling system
    logger.debug('Scheduled invalidation', { reason });
  }

  /**
   * Mark for lazy invalidation
   */
  private markForLazyInvalidation(): void {
    // Implementation would mark entries for lazy invalidation
    logger.debug('Marked for lazy invalidation');
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clean up timers and resources
   */
  cleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl * 1000) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired cache entries', { count: cleanedCount });
    }
  }
}
