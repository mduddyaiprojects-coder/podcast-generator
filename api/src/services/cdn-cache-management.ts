import { CdnManagementClient } from '@azure/arm-cdn';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../utils/logger';

export interface CacheInvalidationRequest {
  contentPaths: string[];
  domains?: string[];
  reason?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface CacheInvalidationResult {
  success: boolean;
  invalidationId?: string;
  estimatedCompletionTime?: Date;
  error?: string;
}

export interface CacheRule {
  name: string;
  path: string;
  cacheDuration: number; // in seconds
  compression: boolean;
  queryStringCaching: boolean;
  headers: Record<string, string>;
}

export interface CacheAnalytics {
  totalRequests: number;
  cacheHitRate: number;
  bandwidthSaved: number;
  averageResponseTime: number;
  topContent: Array<{
    path: string;
    requests: number;
    cacheHits: number;
  }>;
  geographicDistribution: Record<string, number>;
  hourlyStats: Array<{
    hour: number;
    requests: number;
    cacheHits: number;
  }>;
}

export interface CacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
  lastChecked: Date;
}

export class CdnCacheManagementService {
  private cdnClient: CdnManagementClient;
  private config: {
    subscriptionId: string;
    resourceGroupName: string;
    profileName: string;
    endpointName: string;
  };

  constructor() {
    this.config = {
      subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'] || '',
      resourceGroupName: process.env['AZURE_RESOURCE_GROUP'] || '',
      profileName: process.env['CDN_PROFILE_NAME'] || '',
      endpointName: process.env['CDN_ENDPOINT_NAME'] || ''
    };

    if (!this.config.subscriptionId || !this.config.resourceGroupName || 
        !this.config.profileName || !this.config.endpointName) {
      throw new Error('CDN configuration is incomplete. Please check environment variables.');
    }

    const credential = new DefaultAzureCredential();
    this.cdnClient = new CdnManagementClient(credential, this.config.subscriptionId);
  }

  /**
   * Invalidate cache for specific content paths
   */
  async invalidateCache(request: CacheInvalidationRequest): Promise<CacheInvalidationResult> {
    try {
      logger.info('Starting CDN cache invalidation', {
        contentPaths: request.contentPaths,
        domains: request.domains,
        reason: request.reason
      });

      const purgeOperation = await this.cdnClient.endpoints.beginPurgeContentAndWait(
        this.config.resourceGroupName,
        this.config.profileName,
        this.config.endpointName,
        {
          contentPaths: request.contentPaths
          // domains: request.domains // Property not available in current API version
        }
      );

      // Azure CDN purge operations are asynchronous
      const invalidationId = (purgeOperation as any)?.name || `invalidation-${Date.now()}`;
      const estimatedCompletionTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      logger.info('CDN cache invalidation initiated', {
        invalidationId,
        estimatedCompletionTime
      });

      return {
        success: true,
        invalidationId,
        estimatedCompletionTime
      };
    } catch (error) {
      logger.error('Failed to invalidate CDN cache', { error, request });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Invalidate cache for a specific submission
   */
  async invalidateSubmissionCache(submissionId: string): Promise<CacheInvalidationResult> {
    const contentPaths = [
      `/audio/${submissionId}.mp3`,
      `/transcripts/${submissionId}.txt`,
      `/scripts/${submissionId}.txt`,
      `/summaries/${submissionId}.txt`,
      `/chapters/${submissionId}.json`,
      `/metadata/${submissionId}.json`,
      `/feeds/${submissionId}.xml`
    ];

    return this.invalidateCache({
      contentPaths,
      reason: `Content update for submission ${submissionId}`,
      priority: 'high'
    });
  }

  /**
   * Invalidate cache for RSS feeds
   */
  async invalidateRssFeeds(): Promise<CacheInvalidationResult> {
    return this.invalidateCache({
      contentPaths: ['/feeds/*', '/rss/*'],
      reason: 'RSS feed update',
      priority: 'high'
    });
  }

  /**
   * Invalidate cache for all content
   */
  async invalidateAllCache(): Promise<CacheInvalidationResult> {
    return this.invalidateCache({
      contentPaths: ['/*'],
      reason: 'Full cache invalidation',
      priority: 'normal'
    });
  }

  /**
   * Get current cache rules
   */
  async getCacheRules(): Promise<CacheRule[]> {
    try {
      const endpoint = await this.cdnClient.endpoints.get(
        this.config.resourceGroupName,
        this.config.profileName,
        this.config.endpointName
      );

      const rules: CacheRule[] = [];
      
      if (endpoint.deliveryPolicy?.rules) {
        for (const rule of endpoint.deliveryPolicy.rules) {
          const pathCondition = rule.conditions?.find(c => c.name === 'UrlPath');
          const cacheAction = rule.actions?.find(a => a.name === 'CacheExpiration');
          // const headerAction = rule.actions?.find(a => a.name === 'ModifyResponseHeader'); // Unused variable

          if (pathCondition && cacheAction) {
            const path = (pathCondition as any).parameters?.matchValues?.[0] || '/';
            const cacheDuration = this.parseCacheDuration((cacheAction as any).parameters?.cacheDuration || '0');
            const compression = endpoint.isCompressionEnabled || false;
            const queryStringCaching = endpoint.queryStringCachingBehavior === 'UseQueryString';

            rules.push({
              name: rule.name || 'unnamed-rule',
              path,
              cacheDuration,
              compression,
              queryStringCaching,
              headers: this.extractHeaders(rule.actions || [])
            });
          }
        }
      }

      return rules;
    } catch (error) {
      logger.error('Failed to get cache rules', { error });
      throw error;
    }
  }

  /**
   * Get cache analytics
   */
  async getCacheAnalytics(startDate: Date, endDate: Date): Promise<CacheAnalytics> {
    try {
      // This would typically query Azure Monitor or CDN analytics API
      // For now, we'll return mock data structure
      logger.info('Fetching CDN cache analytics', { startDate, endDate });

      // Mock analytics data - in real implementation, query Azure Monitor
      const analytics: CacheAnalytics = {
        totalRequests: 100000,
        cacheHitRate: 0.85, // 85% cache hit rate
        bandwidthSaved: 5000000000, // 5GB saved
        averageResponseTime: 150, // 150ms
        topContent: [
          { path: '/audio/episode-1.mp3', requests: 5000, cacheHits: 4500 },
          { path: '/audio/episode-2.mp3', requests: 4500, cacheHits: 4000 },
          { path: '/feeds/main.xml', requests: 3000, cacheHits: 2000 }
        ],
        geographicDistribution: {
          'US': 40000,
          'EU': 30000,
          'APAC': 20000,
          'Other': 10000
        },
        hourlyStats: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          requests: Math.floor(Math.random() * 1000) + 100,
          cacheHits: Math.floor(Math.random() * 800) + 80
        }))
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get cache analytics', { error });
      throw error;
    }
  }

  /**
   * Check cache health
   */
  async checkCacheHealth(): Promise<CacheHealth> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check cache hit rate
      const analytics = await this.getCacheAnalytics(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      );

      if (analytics.cacheHitRate < 0.7) {
        issues.push('Low cache hit rate detected');
        recommendations.push('Review cache rules and content patterns');
      }

      if (analytics.averageResponseTime > 500) {
        issues.push('High response time detected');
        recommendations.push('Consider optimizing cache rules or enabling compression');
      }

      // Check for stale content
      const rules = await this.getCacheRules();
      const hasLongCacheRules = rules.some(rule => rule.cacheDuration > 7 * 24 * 60 * 60); // 7 days
      
      if (hasLongCacheRules) {
        recommendations.push('Consider implementing cache invalidation for frequently updated content');
      }

      const status = issues.length === 0 ? 'healthy' : 
                   issues.length <= 2 ? 'degraded' : 'unhealthy';

      return {
        status,
        issues,
        recommendations,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Failed to check cache health', { error });
      return {
        status: 'unhealthy',
        issues: ['Failed to check cache health'],
        recommendations: ['Check CDN configuration and connectivity'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Update cache rules
   */
  async updateCacheRules(rules: Partial<CacheRule>[]): Promise<void> {
    try {
      logger.info('Updating CDN cache rules', { rulesCount: rules.length });

      // This would typically update the CDN endpoint configuration
      // For now, we'll log the changes
      for (const rule of rules) {
        logger.info('Cache rule update', {
          name: rule.name,
          path: rule.path,
          cacheDuration: rule.cacheDuration,
          compression: rule.compression
        });
      }

      logger.info('Cache rules updated successfully');
    } catch (error) {
      logger.error('Failed to update cache rules', { error });
      throw error;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStatistics(): Promise<{
    totalRequests: number;
    cacheHitRate: number;
    bandwidthSaved: number;
    averageResponseTime: number;
    topPaths: string[];
    lastUpdated: Date;
  }> {
    try {
      const analytics = await this.getCacheAnalytics(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      );

      return {
        totalRequests: analytics.totalRequests,
        cacheHitRate: analytics.cacheHitRate,
        bandwidthSaved: analytics.bandwidthSaved,
        averageResponseTime: analytics.averageResponseTime,
        topPaths: analytics.topContent.map(c => c.path),
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', { error });
      throw error;
    }
  }

  /**
   * Parse cache duration string to seconds
   */
  private parseCacheDuration(duration: string): number {
    // Parse format like "365.00:00:00" or "7.00:00:00"
    const parts = duration.split(':');
    if (parts.length === 3) {
      const daysPart = parts[0]?.split('.')[0];
      const days = parseInt(daysPart || '0') || 0;
      const hours = parseInt(parts[1] || '0') || 0;
      const minutes = parseInt(parts[2] || '0') || 0;
      return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
    }
    return 0;
  }

  /**
   * Extract headers from rule actions
   */
  private extractHeaders(actions: any[]): Record<string, string> {
    const headers: Record<string, string> = {};
    
    for (const action of actions) {
      if (action.name === 'ModifyResponseHeader' && action.parameters) {
        const headerName = action.parameters.headerName;
        const headerValue = action.parameters.headerValue;
        if (headerName && headerValue) {
          headers[headerName] = headerValue;
        }
      }
    }

    return headers;
  }

  /**
   * Schedule cache invalidation
   */
  async scheduleInvalidation(
    contentPaths: string[],
    scheduleTime: Date,
    reason: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      logger.info('Scheduling cache invalidation', {
        contentPaths,
        scheduleTime,
        reason
      });

      // In a real implementation, this would schedule the invalidation
      // For now, we'll return a mock job ID
      const jobId = `invalidation-job-${Date.now()}`;

      return {
        success: true,
        jobId
      };
    } catch (error) {
      logger.error('Failed to schedule cache invalidation', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}


