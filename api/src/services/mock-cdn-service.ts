import { logger } from '../utils/logger';

/**
 * Mock CDN service for local development and testing
 * Simulates CDN behavior without requiring actual Azure CDN resources
 */

export interface MockCdnConfig {
  baseUrl: string;
  enableCompression: boolean;
  enableHttps: boolean;
  cacheRules: MockCacheRule[];
}

export interface MockCacheRule {
  path: string;
  cacheDuration: number; // in seconds
  compression: boolean;
}

export interface MockCdnStats {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  dataTransferred: number;
  averageResponseTime: number;
}

export class MockCdnService {
  private config: MockCdnConfig;
  private stats: MockCdnStats;
  private cache: Map<string, { content: Buffer; timestamp: number; ttl: number }>;

  constructor(config?: Partial<MockCdnConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'https://mock-cdn.localhost:3000',
      enableCompression: config?.enableCompression ?? true,
      enableHttps: config?.enableHttps ?? true,
      cacheRules: config?.cacheRules || this.getDefaultCacheRules()
    };

    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dataTransferred: 0,
      averageResponseTime: 0
    };

    this.cache = new Map();
    
    logger.info('Mock CDN service initialized', { config: this.config });
  }

  /**
   * Get default cache rules for different content types
   */
  private getDefaultCacheRules(): MockCacheRule[] {
    return [
      {
        path: '/audio/',
        cacheDuration: 365 * 24 * 60 * 60, // 1 year
        compression: false
      },
      {
        path: '/transcripts/',
        cacheDuration: 7 * 24 * 60 * 60, // 7 days
        compression: true
      },
      {
        path: '/scripts/',
        cacheDuration: 7 * 24 * 60 * 60, // 7 days
        compression: true
      },
      {
        path: '/summaries/',
        cacheDuration: 7 * 24 * 60 * 60, // 7 days
        compression: true
      },
      {
        path: '/chapters/',
        cacheDuration: 24 * 60 * 60, // 1 day
        compression: true
      }
    ];
  }

  /**
   * Simulate CDN endpoint URL
   */
  async getEndpointUrl(): Promise<string> {
    return this.config.baseUrl;
  }

  /**
   * Simulate content delivery through CDN
   */
  async deliverContent(path: string, content: Buffer): Promise<{
    url: string;
    fromCache: boolean;
    compressed: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    this.stats.requests++;

    // Find matching cache rule
    const cacheRule = this.config.cacheRules.find(rule => path.startsWith(rule.path));
    const cacheDuration = cacheRule?.cacheDuration || 3600; // Default 1 hour
    const shouldCompress = cacheRule?.compression && this.config.enableCompression;

    // Check cache
    const cacheKey = path;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    let fromCache = false;
    let finalContent = content;

    if (cached && (now - cached.timestamp) < cached.ttl * 1000) {
      // Cache hit
      fromCache = true;
      this.stats.cacheHits++;
      finalContent = cached.content;
      logger.debug('CDN cache hit', { path, cacheAge: now - cached.timestamp });
    } else {
      // Cache miss - simulate origin fetch
      this.stats.cacheMisses++;
      
      // Simulate compression
      if (shouldCompress) {
        finalContent = this.simulateCompression(content);
      }

      // Store in cache
      this.cache.set(cacheKey, {
        content: finalContent,
        timestamp: now,
        ttl: cacheDuration
      });

      logger.debug('CDN cache miss', { path, compressed: shouldCompress });
    }

    // Update stats
    this.stats.dataTransferred += finalContent.length;
    const responseTime = Date.now() - startTime;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.requests - 1) + responseTime) / this.stats.requests;

    return {
      url: `${this.config.baseUrl}${path}`,
      fromCache,
      compressed: shouldCompress || false,
      responseTime
    };
  }

  /**
   * Simulate compression (simple size reduction)
   */
  private simulateCompression(content: Buffer): Buffer {
    // Simulate 60% compression for text content
    const compressionRatio = 0.6;
    const compressedSize = Math.floor(content.length * compressionRatio);
    return Buffer.alloc(compressedSize);
  }

  /**
   * Simulate cache purging
   */
  async purgeCache(paths: string[]): Promise<void> {
    let purgedCount = 0;
    
    for (const path of paths) {
      if (this.cache.has(path)) {
        this.cache.delete(path);
        purgedCount++;
      }
    }

    logger.info('CDN cache purged', { paths, purgedCount });
  }

  /**
   * Simulate purging all content for a submission
   */
  async purgeSubmissionContent(submissionId: string): Promise<void> {
    const paths = [
      `/audio/${submissionId}.mp3`,
      `/transcripts/${submissionId}.txt`,
      `/scripts/${submissionId}.txt`,
      `/summaries/${submissionId}.txt`,
      `/chapters/${submissionId}.json`
    ];

    await this.purgeCache(paths);
  }

  /**
   * Get CDN statistics
   */
  getStats(): MockCdnStats & { cacheHitRatio: number; cacheSize: number } {
    const cacheHitRatio = this.stats.requests > 0 
      ? this.stats.cacheHits / this.stats.requests 
      : 0;

    return {
      ...this.stats,
      cacheHitRatio,
      cacheSize: this.cache.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dataTransferred: 0,
      averageResponseTime: 0
    };
    this.cache.clear();
    logger.info('CDN statistics reset');
  }

  /**
   * Check if service is healthy
   */
  checkHealth(): boolean {
    return true; // Mock service is always healthy
  }

  /**
   * Get service information
   */
  getServiceInfo(): { name: string; healthy: boolean; config: MockCdnConfig } {
    return {
      name: 'Mock CDN Service',
      healthy: this.checkHealth(),
      config: { ...this.config }
    };
  }

  /**
   * Simulate CDN analytics
   */
  async getAnalytics(_startDate: Date, _endDate: Date): Promise<{
    totalRequests: number;
    totalDataTransferred: number;
    cacheHitRatio: number;
    averageResponseTime: number;
    topCountries: Array<{ country: string; requests: number }>;
    topUserAgents: Array<{ userAgent: string; requests: number }>;
  }> {
    const stats = this.getStats();
    
    return {
      totalRequests: stats.requests,
      totalDataTransferred: stats.dataTransferred,
      cacheHitRatio: stats.cacheHitRatio,
      averageResponseTime: stats.averageResponseTime,
      topCountries: [
        { country: 'US', requests: Math.floor(stats.requests * 0.4) },
        { country: 'UK', requests: Math.floor(stats.requests * 0.2) },
        { country: 'CA', requests: Math.floor(stats.requests * 0.15) }
      ],
      topUserAgents: [
        { userAgent: 'Mozilla/5.0 (Podcast App)', requests: Math.floor(stats.requests * 0.6) },
        { userAgent: 'Mozilla/5.0 (Web Browser)', requests: Math.floor(stats.requests * 0.4) }
      ]
    };
  }

  /**
   * Get cache information
   */
  getCacheInfo(): Array<{ path: string; size: number; age: number; ttl: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([path, data]) => ({
      path,
      size: data.content.length,
      age: now - data.timestamp,
      ttl: data.ttl
    }));
  }

  /**
   * Simulate CDN endpoint creation
   */
  async createOrUpdateEndpoint(): Promise<void> {
    logger.info('Mock CDN endpoint created/updated', { config: this.config });
  }

  /**
   * Simulate CDN profile creation
   */
  async createOrUpdateProfile(): Promise<void> {
    logger.info('Mock CDN profile created/updated', { config: this.config });
  }
}

// Export singleton instance for testing
export const mockCdnService = new MockCdnService();
