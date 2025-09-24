/**
 * Performance Monitoring Service
 * Provides comprehensive performance monitoring and alerting for file operations
 */

import { logger } from '../utils/logger';
// import { PerformanceMetrics } from '../tests/utils/performance-test-utils';

// Local interface to replace missing import
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: number;
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: any;
}

export interface PerformanceAlert {
  id: string;
  type: 'response_time' | 'throughput' | 'error_rate' | 'resource_utilization';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolutionTime?: Date;
}

export interface PerformanceStats {
  operation: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageThroughput: number;
  peakThroughput: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: Date;
}

export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  throughput: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  resourceUtilization: {
    warning: number;
    critical: number;
  };
}

export class PerformanceMonitoringService {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private resourceMetrics: ResourceMetrics[] = [];
  private thresholds: PerformanceThresholds;

  constructor() {
    this.thresholds = {
      responseTime: {
        warning: parseInt(process.env['PERF_RESPONSE_TIME_WARNING'] || '3000'),
        critical: parseInt(process.env['PERF_RESPONSE_TIME_CRITICAL'] || '10000')
      },
      throughput: {
        warning: parseInt(process.env['PERF_THROUGHPUT_WARNING'] || '500000'),
        critical: parseInt(process.env['PERF_THROUGHPUT_CRITICAL'] || '100000')
      },
      errorRate: {
        warning: parseFloat(process.env['PERF_ERROR_RATE_WARNING'] || '0.05'),
        critical: parseFloat(process.env['PERF_ERROR_RATE_CRITICAL'] || '0.2')
      },
      resourceUtilization: {
        warning: parseInt(process.env['PERF_RESOURCE_WARNING'] || '80'),
        critical: parseInt(process.env['PERF_RESOURCE_CRITICAL'] || '95')
      }
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    const operation = metric.operation;
    
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(metric);
    
    // Keep only last 1000 metrics per operation
    if (operationMetrics.length > 1000) {
      operationMetrics.splice(0, operationMetrics.length - 1000);
    }
    
    logger.debug('Performance metric recorded', {
      operation: metric.operation,
      duration: metric.duration,
      throughput: metric.throughput,
      success: metric.success
    });
  }

  /**
   * Record resource metrics
   */
  recordResourceMetrics(metrics: ResourceMetrics): void {
    this.resourceMetrics.push(metrics);
    
    // Keep only last 1000 resource metrics
    if (this.resourceMetrics.length > 1000) {
      this.resourceMetrics.splice(0, this.resourceMetrics.length - 1000);
    }
    
    logger.debug('Resource metrics recorded', metrics);
  }

  /**
   * Get performance statistics for an operation
   */
  getPerformanceStats(operation: string): PerformanceStats | null {
    const operationMetrics = this.metrics.get(operation);
    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const successfulMetrics = operationMetrics.filter(m => m.success);
    const responseTimes = successfulMetrics.map(m => m.duration);
    const throughputs = successfulMetrics.map(m => m.throughput);
    
    responseTimes.sort((a, b) => a - b);
    
    const totalOperations = operationMetrics.length;
    const successfulOperations = successfulMetrics.length;
    const failedOperations = totalOperations - successfulOperations;
    
    const averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, r) => sum + r, 0) / responseTimes.length : 0;
    const minResponseTime = responseTimes.length > 0 ? responseTimes[0] : 0;
    const maxResponseTime = responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0;
    
    const p50ResponseTime = this.percentile(responseTimes, 50);
    const p90ResponseTime = this.percentile(responseTimes, 90);
    const p95ResponseTime = this.percentile(responseTimes, 95);
    const p99ResponseTime = this.percentile(responseTimes, 99);
    
    const averageThroughput = throughputs.length > 0 ? 
      throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length : 0;
    const peakThroughput = throughputs.length > 0 ? Math.max(...throughputs) : 0;
    
    const errorRate = totalOperations > 0 ? failedOperations / totalOperations : 0;

    return {
      operation,
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p50ResponseTime,
      p90ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      averageThroughput,
      peakThroughput,
      errorRate,
      lastUpdated: new Date()
    };
  }

  /**
   * Get performance statistics for all operations
   */
  getAllPerformanceStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];
    
    for (const operation of this.metrics.keys()) {
      const stat = this.getPerformanceStats(operation);
      if (stat) {
        stats.push(stat);
      }
    }
    
    return stats;
  }

  /**
   * Check for performance alerts
   */
  checkAlerts(): PerformanceAlert[] {
    const newAlerts: PerformanceAlert[] = [];
    
    // Check each operation for alerts
    for (const operation of this.metrics.keys()) {
      const stats = this.getPerformanceStats(operation);
      if (!stats) continue;
      
      // Check response time alerts
      if (stats.averageResponseTime > this.thresholds.responseTime.critical) {
        const alert = this.createAlert(
          'response_time',
          'critical',
          `Average response time for ${operation} is ${stats.averageResponseTime.toFixed(2)}ms, exceeding critical threshold of ${this.thresholds.responseTime.critical}ms`,
          stats.averageResponseTime,
          this.thresholds.responseTime.critical
        );
        newAlerts.push(alert);
      } else if (stats.averageResponseTime > this.thresholds.responseTime.warning) {
        const alert = this.createAlert(
          'response_time',
          'warning',
          `Average response time for ${operation} is ${stats.averageResponseTime.toFixed(2)}ms, exceeding warning threshold of ${this.thresholds.responseTime.warning}ms`,
          stats.averageResponseTime,
          this.thresholds.responseTime.warning
        );
        newAlerts.push(alert);
      }
      
      // Check throughput alerts
      if (stats.averageThroughput < this.thresholds.throughput.critical) {
        const alert = this.createAlert(
          'throughput',
          'critical',
          `Average throughput for ${operation} is ${stats.averageThroughput.toFixed(2)} bytes/s, below critical threshold of ${this.thresholds.throughput.critical} bytes/s`,
          stats.averageThroughput,
          this.thresholds.throughput.critical
        );
        newAlerts.push(alert);
      } else if (stats.averageThroughput < this.thresholds.throughput.warning) {
        const alert = this.createAlert(
          'throughput',
          'warning',
          `Average throughput for ${operation} is ${stats.averageThroughput.toFixed(2)} bytes/s, below warning threshold of ${this.thresholds.throughput.warning} bytes/s`,
          stats.averageThroughput,
          this.thresholds.throughput.warning
        );
        newAlerts.push(alert);
      }
      
      // Check error rate alerts
      if (stats.errorRate > this.thresholds.errorRate.critical) {
        const alert = this.createAlert(
          'error_rate',
          'critical',
          `Error rate for ${operation} is ${(stats.errorRate * 100).toFixed(2)}%, exceeding critical threshold of ${(this.thresholds.errorRate.critical * 100).toFixed(2)}%`,
          stats.errorRate,
          this.thresholds.errorRate.critical
        );
        newAlerts.push(alert);
      } else if (stats.errorRate > this.thresholds.errorRate.warning) {
        const alert = this.createAlert(
          'error_rate',
          'warning',
          `Error rate for ${operation} is ${(stats.errorRate * 100).toFixed(2)}%, exceeding warning threshold of ${(this.thresholds.errorRate.warning * 100).toFixed(2)}%`,
          stats.errorRate,
          this.thresholds.errorRate.warning
        );
        newAlerts.push(alert);
      }
    }
    
    // Check resource utilization alerts
    if (this.resourceMetrics.length > 0) {
      const latestResourceMetrics = this.resourceMetrics[this.resourceMetrics.length - 1];
      
      if (latestResourceMetrics.cpu > this.thresholds.resourceUtilization.critical) {
        const alert = this.createAlert(
          'resource_utilization',
          'critical',
          `CPU utilization is ${latestResourceMetrics.cpu}%, exceeding critical threshold of ${this.thresholds.resourceUtilization.critical}%`,
          latestResourceMetrics.cpu,
          this.thresholds.resourceUtilization.critical
        );
        newAlerts.push(alert);
      } else if (latestResourceMetrics.cpu > this.thresholds.resourceUtilization.warning) {
        const alert = this.createAlert(
          'resource_utilization',
          'warning',
          `CPU utilization is ${latestResourceMetrics.cpu}%, exceeding warning threshold of ${this.thresholds.resourceUtilization.warning}%`,
          latestResourceMetrics.cpu,
          this.thresholds.resourceUtilization.warning
        );
        newAlerts.push(alert);
      }
      
      if (latestResourceMetrics.memory > this.thresholds.resourceUtilization.critical) {
        const alert = this.createAlert(
          'resource_utilization',
          'critical',
          `Memory utilization is ${latestResourceMetrics.memory}%, exceeding critical threshold of ${this.thresholds.resourceUtilization.critical}%`,
          latestResourceMetrics.memory,
          this.thresholds.resourceUtilization.critical
        );
        newAlerts.push(alert);
      } else if (latestResourceMetrics.memory > this.thresholds.resourceUtilization.warning) {
        const alert = this.createAlert(
          'resource_utilization',
          'warning',
          `Memory utilization is ${latestResourceMetrics.memory}%, exceeding warning threshold of ${this.thresholds.resourceUtilization.warning}%`,
          latestResourceMetrics.memory,
          this.thresholds.resourceUtilization.warning
        );
        newAlerts.push(alert);
      }
    }
    
    // Add new alerts to the list
    this.alerts.push(...newAlerts);
    
    // Resolve alerts that are no longer active
    this.resolveAlerts();
    
    return newAlerts;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return this.alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    
    alert.resolved = true;
    alert.resolutionTime = new Date();
    
    logger.info('Performance alert resolved', { alertId, type: alert.type });
    return true;
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData(): {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    stats: PerformanceStats[];
    activeAlerts: PerformanceAlert[];
    resourceMetrics: ResourceMetrics[];
    recommendations: string[];
  } {
    const stats = this.getAllPerformanceStats();
    const activeAlerts = this.getActiveAlerts();
    const recentResourceMetrics = this.resourceMetrics.slice(-24); // Last 24 data points
    
    // Determine overall health
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    const warningAlerts = activeAlerts.filter(alert => alert.severity === 'warning');
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (criticalAlerts.length > 0) {
      overallHealth = 'unhealthy';
    } else if (warningAlerts.length > 2) {
      overallHealth = 'degraded';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (criticalAlerts.length > 0) {
      recommendations.push('Critical performance issues detected - immediate attention required');
    }
    
    if (warningAlerts.length > 0) {
      recommendations.push('Performance warnings detected - monitor closely and consider optimization');
    }
    
    const highErrorRateOps = stats.filter(s => s.errorRate > 0.1);
    if (highErrorRateOps.length > 0) {
      recommendations.push('High error rates detected - investigate error handling and retry logic');
    }
    
    const slowOps = stats.filter(s => s.averageResponseTime > 5000);
    if (slowOps.length > 0) {
      recommendations.push('Slow operations detected - consider performance optimization');
    }
    
    const lowThroughputOps = stats.filter(s => s.averageThroughput < 1000000);
    if (lowThroughputOps.length > 0) {
      recommendations.push('Low throughput detected - consider optimizing file processing or network configuration');
    }
    
    return {
      overallHealth,
      stats,
      activeAlerts,
      resourceMetrics: recentResourceMetrics,
      recommendations
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated', newThresholds);
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    // Clear metrics older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [operation, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.metadata && new Date(m.metadata.timestamp || 0) > cutoffTime);
      this.metrics.set(operation, recentMetrics);
    }
    
    // Clear resolved alerts older than 7 days
    const alertCutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || (alert.resolutionTime && alert.resolutionTime > alertCutoffTime)
    );
    
    // Clear resource metrics older than 24 hours
    this.resourceMetrics = this.resourceMetrics.filter(rm => rm.timestamp > cutoffTime);
    
    logger.info('Performance monitoring cleanup completed');
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): PerformanceAlert {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
   * Resolve alerts that are no longer active
   */
  private resolveAlerts(): void {
    const now = new Date();
    
    for (const alert of this.alerts) {
      if (alert.resolved) continue;
      
      let shouldResolve = false;
      
      // Check if alert conditions are no longer met
      if (alert.type === 'response_time' || alert.type === 'throughput' || alert.type === 'error_rate') {
        // For operation-specific alerts, check if the operation still has issues
        const operation = alert.message.split(' ')[3]; // Extract operation name from message
        const stats = this.getPerformanceStats(operation);
        
        if (stats) {
          if (alert.type === 'response_time' && stats.averageResponseTime <= this.thresholds.responseTime.warning) {
            shouldResolve = true;
          } else if (alert.type === 'throughput' && stats.averageThroughput >= this.thresholds.throughput.warning) {
            shouldResolve = true;
          } else if (alert.type === 'error_rate' && stats.errorRate <= this.thresholds.errorRate.warning) {
            shouldResolve = true;
          }
        }
      } else if (alert.type === 'resource_utilization') {
        // For resource alerts, check if resource utilization is back to normal
        if (this.resourceMetrics.length > 0) {
          const latestResourceMetrics = this.resourceMetrics[this.resourceMetrics.length - 1];
          if (latestResourceMetrics.cpu <= this.thresholds.resourceUtilization.warning && 
              latestResourceMetrics.memory <= this.thresholds.resourceUtilization.warning) {
            shouldResolve = true;
          }
        }
      }
      
      if (shouldResolve) {
        alert.resolved = true;
        alert.resolutionTime = now;
        logger.info('Performance alert auto-resolved', { alertId: alert.id, type: alert.type });
      }
    }
  }

  /**
   * Calculate percentile value
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
}




