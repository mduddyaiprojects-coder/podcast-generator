import { logger } from '../utils/logger';
import { serviceManager } from './service-manager';

export interface CacheMetrics {
  timestamp: Date;
  totalRequests: number;
  cacheHitRate: number;
  bandwidthSaved: number;
  averageResponseTime: number;
  errorRate: number;
  topContent: Array<{
    path: string;
    requests: number;
    cacheHits: number;
    bandwidth: number;
  }>;
  geographicDistribution: Record<string, number>;
  hourlyDistribution: Array<{
    hour: number;
    requests: number;
    cacheHits: number;
  }>;
}

export interface CacheAlert {
  id: string;
  type: 'hit_rate_low' | 'response_time_high' | 'error_rate_high' | 'bandwidth_spike';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolutionTime?: Date;
}

export interface CacheOptimizationRecommendation {
  id: string;
  type: 'cache_rule' | 'compression' | 'invalidation' | 'geographic';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  potentialSavings: {
    bandwidth: number;
    responseTime: number;
    cost: number;
  };
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    effort: string;
    steps: string[];
  };
}

export class CdnMonitoringService {
  // cacheManagement will be lazy loaded via ServiceManager
  private alertThresholds: {
    minHitRate: number;
    maxResponseTime: number;
    maxErrorRate: number;
    bandwidthSpikeThreshold: number;
  };
  private metricsHistory: CacheMetrics[] = [];
  private activeAlerts: CacheAlert[] = [];

  constructor() {
    // cacheManagement will be lazy loaded via ServiceManager
    this.alertThresholds = {
      minHitRate: parseFloat(process.env['CDN_MIN_HIT_RATE'] || '0.7'),
      maxResponseTime: parseInt(process.env['CDN_MAX_RESPONSE_TIME'] || '500'),
      maxErrorRate: parseFloat(process.env['CDN_MAX_ERROR_RATE'] || '0.05'),
      bandwidthSpikeThreshold: parseFloat(process.env['CDN_BANDWIDTH_SPIKE_THRESHOLD'] || '2.0')
    };
  }

  /**
   * Collect current cache metrics
   */
  async collectMetrics(): Promise<CacheMetrics> {
    try {
      const cacheManagement = serviceManager.getCdnCacheManagement();
      const statistics = await cacheManagement.getCacheStatistics();
      const analytics = await cacheManagement.getCacheAnalytics(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      const metrics: CacheMetrics = {
        timestamp: new Date(),
        totalRequests: statistics.totalRequests,
        cacheHitRate: statistics.cacheHitRate,
        bandwidthSaved: statistics.bandwidthSaved,
        averageResponseTime: statistics.averageResponseTime,
        errorRate: this.calculateErrorRate(statistics),
        topContent: analytics.topContent.map(content => ({
          path: content.path,
          requests: content.requests,
          cacheHits: content.cacheHits,
          bandwidth: content.requests * 1024 * 1024 // Mock bandwidth calculation
        })),
        geographicDistribution: analytics.geographicDistribution,
        hourlyDistribution: analytics.hourlyStats
      };

      // Store metrics in history
      this.metricsHistory.push(metrics);
      
      // Keep only last 24 hours of metrics
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffTime);

      logger.info('CDN metrics collected', {
        totalRequests: metrics.totalRequests,
        cacheHitRate: metrics.cacheHitRate,
        averageResponseTime: metrics.averageResponseTime
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect CDN metrics', { error });
      throw error;
    }
  }

  /**
   * Check for cache alerts
   */
  async checkAlerts(): Promise<CacheAlert[]> {
    try {
      const metrics = await this.collectMetrics();
      const newAlerts: CacheAlert[] = [];

      // Check cache hit rate
      if (metrics.cacheHitRate < this.alertThresholds.minHitRate) {
        const alert = this.createAlert(
          'hit_rate_low',
          'critical',
          `Cache hit rate is ${(metrics.cacheHitRate * 100).toFixed(1)}%, below threshold of ${(this.alertThresholds.minHitRate * 100).toFixed(1)}%`,
          metrics.cacheHitRate,
          this.alertThresholds.minHitRate
        );
        newAlerts.push(alert);
      }

      // Check response time
      if (metrics.averageResponseTime > this.alertThresholds.maxResponseTime) {
        const alert = this.createAlert(
          'response_time_high',
          'warning',
          `Average response time is ${metrics.averageResponseTime}ms, above threshold of ${this.alertThresholds.maxResponseTime}ms`,
          metrics.averageResponseTime,
          this.alertThresholds.maxResponseTime
        );
        newAlerts.push(alert);
      }

      // Check error rate
      if (metrics.errorRate > this.alertThresholds.maxErrorRate) {
        const alert = this.createAlert(
          'error_rate_high',
          'critical',
          `Error rate is ${(metrics.errorRate * 100).toFixed(1)}%, above threshold of ${(this.alertThresholds.maxErrorRate * 100).toFixed(1)}%`,
          metrics.errorRate,
          this.alertThresholds.maxErrorRate
        );
        newAlerts.push(alert);
      }

      // Check for bandwidth spikes
      const bandwidthSpike = this.detectBandwidthSpike(metrics);
      if (bandwidthSpike) {
        const alert = this.createAlert(
          'bandwidth_spike',
          'warning',
          `Bandwidth spike detected: ${bandwidthSpike.toFixed(1)}x normal usage`,
          bandwidthSpike,
          this.alertThresholds.bandwidthSpikeThreshold
        );
        newAlerts.push(alert);
      }

      // Add new alerts to active alerts
      this.activeAlerts.push(...newAlerts);

      // Resolve alerts that are no longer active
      await this.resolveAlerts(metrics);

      logger.info('CDN alerts checked', {
        newAlerts: newAlerts.length,
        activeAlerts: this.activeAlerts.length
      });

      return newAlerts;
    } catch (error) {
      logger.error('Failed to check CDN alerts', { error });
      return [];
    }
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<CacheOptimizationRecommendation[]> {
    try {
      const metrics = await this.collectMetrics();
      const recommendations: CacheOptimizationRecommendation[] = [];

      // Low cache hit rate recommendation
      if (metrics.cacheHitRate < 0.8) {
        recommendations.push({
          id: 'improve-cache-hit-rate',
          type: 'cache_rule',
          priority: 'high',
          title: 'Improve Cache Hit Rate',
          description: 'Current cache hit rate is below optimal. Consider adjusting cache rules for better performance.',
          potentialSavings: {
            bandwidth: metrics.bandwidthSaved * 0.2,
            responseTime: metrics.averageResponseTime * 0.3,
            cost: 100 // Estimated monthly cost savings
          },
          implementation: {
            complexity: 'medium',
            effort: '2-4 hours',
            steps: [
              'Review current cache rules',
              'Identify frequently accessed content',
              'Adjust cache durations for different content types',
              'Implement cache warming strategies'
            ]
          }
        });
      }

      // High response time recommendation
      if (metrics.averageResponseTime > 300) {
        recommendations.push({
          id: 'reduce-response-time',
          type: 'compression',
          priority: 'medium',
          title: 'Enable Compression for Text Content',
          description: 'High response times detected. Enabling compression can reduce bandwidth and improve performance.',
          potentialSavings: {
            bandwidth: metrics.bandwidthSaved * 0.4,
            responseTime: metrics.averageResponseTime * 0.2,
            cost: 50
          },
          implementation: {
            complexity: 'low',
            effort: '1-2 hours',
            steps: [
              'Enable compression for text content types',
              'Configure compression levels',
              'Test compression effectiveness',
              'Monitor performance improvements'
            ]
          }
        });
      }

      // Geographic distribution recommendation
      const topRegions = Object.entries(metrics.geographicDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      if (topRegions.length > 0) {
        recommendations.push({
          id: 'optimize-geographic-distribution',
          type: 'geographic',
          priority: 'low',
          title: 'Optimize Geographic Distribution',
          description: `Top regions: ${topRegions.map(([region, count]) => `${region} (${count})`).join(', ')}. Consider CDN edge optimization.`,
          potentialSavings: {
            bandwidth: metrics.bandwidthSaved * 0.1,
            responseTime: metrics.averageResponseTime * 0.1,
            cost: 25
          },
          implementation: {
            complexity: 'high',
            effort: '1-2 days',
            steps: [
              'Analyze geographic traffic patterns',
              'Configure CDN edge locations',
              'Implement geographic routing rules',
              'Monitor performance improvements'
            ]
          }
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Failed to get optimization recommendations', { error });
      return [];
    }
  }

  /**
   * Get cache health dashboard data
   */
  async getHealthDashboard(): Promise<{
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    metrics: CacheMetrics;
    alerts: CacheAlert[];
    recommendations: CacheOptimizationRecommendation[];
    trends: {
      hitRateTrend: 'up' | 'down' | 'stable';
      responseTimeTrend: 'up' | 'down' | 'stable';
      bandwidthTrend: 'up' | 'down' | 'stable';
    };
  }> {
    try {
      const metrics = await this.collectMetrics();
      const alerts = await this.checkAlerts();
      const recommendations = await this.getOptimizationRecommendations();
      
      const overallHealth = this.calculateOverallHealth(metrics, alerts);
      const trends = this.calculateTrends();

      return {
        overallHealth,
        metrics,
        alerts: alerts.filter(alert => !alert.resolved),
        recommendations,
        trends
      };
    } catch (error) {
      logger.error('Failed to get health dashboard', { error });
      throw error;
    }
  }

  /**
   * Create a cache alert
   */
  private createAlert(
    type: CacheAlert['type'],
    severity: CacheAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): CacheAlert {
    return {
      id: `${type}-${Date.now()}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false
    };
  }

  /**
   * Calculate error rate from statistics
   */
  private calculateErrorRate(statistics: any): number {
    // Mock error rate calculation
    // In real implementation, this would come from CDN analytics
    return Math.random() * 0.02; // 0-2% error rate
  }

  /**
   * Detect bandwidth spikes
   */
  private detectBandwidthSpike(metrics: CacheMetrics): number | null {
    if (this.metricsHistory.length < 2) return null;

    const previousMetrics = this.metricsHistory[this.metricsHistory.length - 2];
    const currentBandwidth = metrics.totalRequests;
    const previousBandwidth = previousMetrics.totalRequests;

    if (previousBandwidth === 0) return null;

    const spikeRatio = currentBandwidth / previousBandwidth;
    return spikeRatio > this.alertThresholds.bandwidthSpikeThreshold ? spikeRatio : null;
  }

  /**
   * Resolve alerts that are no longer active
   */
  private async resolveAlerts(metrics: CacheMetrics): Promise<void> {
    const now = new Date();
    
    for (const alert of this.activeAlerts) {
      if (alert.resolved) continue;

      let shouldResolve = false;

      switch (alert.type) {
        case 'hit_rate_low':
          shouldResolve = metrics.cacheHitRate >= this.alertThresholds.minHitRate;
          break;
        case 'response_time_high':
          shouldResolve = metrics.averageResponseTime <= this.alertThresholds.maxResponseTime;
          break;
        case 'error_rate_high':
          shouldResolve = metrics.errorRate <= this.alertThresholds.maxErrorRate;
          break;
        case 'bandwidth_spike':
          shouldResolve = !this.detectBandwidthSpike(metrics);
          break;
      }

      if (shouldResolve) {
        alert.resolved = true;
        alert.resolutionTime = now;
        logger.info('CDN alert resolved', { alertId: alert.id, type: alert.type });
      }
    }
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(metrics: CacheMetrics, alerts: CacheAlert[]): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
    const warningAlerts = alerts.filter(alert => alert.severity === 'warning' && !alert.resolved);

    if (criticalAlerts.length > 0) return 'unhealthy';
    if (warningAlerts.length > 2 || metrics.cacheHitRate < 0.6) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate trends from metrics history
   */
  private calculateTrends(): {
    hitRateTrend: 'up' | 'down' | 'stable';
    responseTimeTrend: 'up' | 'down' | 'stable';
    bandwidthTrend: 'up' | 'down' | 'stable';
  } {
    if (this.metricsHistory.length < 2) {
      return {
        hitRateTrend: 'stable',
        responseTimeTrend: 'stable',
        bandwidthTrend: 'stable'
      };
    }

    const recent = this.metricsHistory.slice(-6); // Last 6 data points
    const older = this.metricsHistory.slice(-12, -6); // Previous 6 data points

    if (recent.length === 0 || older.length === 0) {
      return {
        hitRateTrend: 'stable',
        responseTimeTrend: 'stable',
        bandwidthTrend: 'stable'
      };
    }

    const avgRecentHitRate = recent.reduce((sum, m) => sum + m.cacheHitRate, 0) / recent.length;
    const avgOlderHitRate = older.reduce((sum, m) => sum + m.cacheHitRate, 0) / older.length;
    
    const avgRecentResponseTime = recent.reduce((sum, m) => sum + m.averageResponseTime, 0) / recent.length;
    const avgOlderResponseTime = older.reduce((sum, m) => sum + m.averageResponseTime, 0) / older.length;
    
    const avgRecentBandwidth = recent.reduce((sum, m) => sum + m.totalRequests, 0) / recent.length;
    const avgOlderBandwidth = older.reduce((sum, m) => sum + m.totalRequests, 0) / older.length;

    const threshold = 0.05; // 5% change threshold

    return {
      hitRateTrend: Math.abs(avgRecentHitRate - avgOlderHitRate) < threshold ? 'stable' :
                   avgRecentHitRate > avgOlderHitRate ? 'up' : 'down',
      responseTimeTrend: Math.abs(avgRecentResponseTime - avgOlderResponseTime) < threshold ? 'stable' :
                        avgRecentResponseTime < avgOlderResponseTime ? 'down' : 'up',
      bandwidthTrend: Math.abs(avgRecentBandwidth - avgOlderBandwidth) < threshold ? 'stable' :
                     avgRecentBandwidth > avgOlderBandwidth ? 'up' : 'down'
    };
  }
}





