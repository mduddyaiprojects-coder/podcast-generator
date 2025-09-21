import { logger } from '../utils/logger';
import { ServiceError } from '../utils/error-handling';
import { circuitBreakerManager } from '../utils/circuit-breaker';

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  name: string;
  type: MetricType;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Service operation metrics
 */
export interface OperationMetrics {
  serviceName: string;
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  responseSize?: number;
  requestSize?: number;
  retryCount?: number;
  circuitBreakerState?: string;
}

/**
 * Metrics collector for tracking service operations
 */
export class MetricsCollector {
  private metrics: MetricDataPoint[] = [];
  private operationMetrics: OperationMetrics[] = [];
  private maxMetrics: number;
  private maxOperationMetrics: number;

  constructor() {
    this.maxMetrics = this.getNumberEnv('METRICS_MAX_METRICS', 10000);
    this.maxOperationMetrics = this.getNumberEnv('METRICS_MAX_OPERATION_METRICS', 5000);
  }

  /**
   * Record a counter metric
   */
  recordCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: new Date().toISOString(),
      tags
    });
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: new Date().toISOString(),
      tags
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: new Date().toISOString(),
      tags
    });
  }

  /**
   * Record a timer metric
   */
  recordTimer(name: string, duration: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      type: MetricType.TIMER,
      value: duration,
      timestamp: new Date().toISOString(),
      tags
    });
  }

  /**
   * Record operation metrics
   */
  recordOperation(metrics: OperationMetrics): void {
    this.operationMetrics.push(metrics);
    
    // Clean up old metrics
    if (this.operationMetrics.length > this.maxOperationMetrics) {
      this.operationMetrics = this.operationMetrics.slice(-this.maxOperationMetrics);
    }

    // Record derived metrics
    this.recordTimer(`${metrics.serviceName}.${metrics.operationName}.duration`, metrics.duration, {
      service: metrics.serviceName,
      operation: metrics.operationName,
      success: metrics.success.toString()
    });

    this.recordCounter(`${metrics.serviceName}.${metrics.operationName}.requests`, 1, {
      service: metrics.serviceName,
      operation: metrics.operationName,
      success: metrics.success.toString()
    });

    if (!metrics.success && metrics.errorType) {
      this.recordCounter(`${metrics.serviceName}.${metrics.operationName}.errors`, 1, {
        service: metrics.serviceName,
        operation: metrics.operationName,
        errorType: metrics.errorType
      });
    }

    if (metrics.retryCount && metrics.retryCount > 0) {
      this.recordCounter(`${metrics.serviceName}.${metrics.operationName}.retries`, metrics.retryCount, {
        service: metrics.serviceName,
        operation: metrics.operationName
      });
    }

    if (metrics.responseSize) {
      this.recordHistogram(`${metrics.serviceName}.${metrics.operationName}.response_size`, metrics.responseSize, {
        service: metrics.serviceName,
        operation: metrics.operationName
      });
    }

    if (metrics.requestSize) {
      this.recordHistogram(`${metrics.serviceName}.${metrics.operationName}.request_size`, metrics.requestSize, {
        service: metrics.serviceName,
        operation: metrics.operationName
      });
    }
  }

  /**
   * Record a service error
   */
  recordServiceError(serviceName: string, operationName: string, error: ServiceError, duration: number): void {
    this.recordCounter(`${serviceName}.${operationName}.errors`, 1, {
      service: serviceName,
      operation: operationName,
      errorType: error.type,
      severity: error.severity
    });

    this.recordOperation({
      serviceName,
      operationName,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: false,
      errorType: error.type,
      errorMessage: error.message,
      circuitBreakerState: circuitBreakerManager.getBreaker(serviceName).getStats().state
    });
  }

  /**
   * Record a successful service operation
   */
  recordServiceSuccess(serviceName: string, operationName: string, duration: number, responseSize?: number, requestSize?: number): void {
    this.recordCounter(`${serviceName}.${operationName}.success`, 1, {
      service: serviceName,
      operation: operationName
    });

    this.recordOperation({
      serviceName,
      operationName,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      responseSize,
      requestSize,
      circuitBreakerState: circuitBreakerManager.getBreaker(serviceName).getStats().state
    });
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerStateChange(serviceName: string, fromState: string, toState: string): void {
    this.recordCounter(`${serviceName}.circuit_breaker.state_change`, 1, {
      service: serviceName,
      fromState,
      toState
    });
  }

  /**
   * Record retry attempt
   */
  recordRetryAttempt(serviceName: string, operationName: string, attempt: number, error: Error): void {
    this.recordCounter(`${serviceName}.${operationName}.retry_attempt`, 1, {
      service: serviceName,
      operation: operationName,
      attempt: attempt.toString(),
      errorType: error.constructor.name
    });
  }

  /**
   * Record fallback strategy usage
   */
  recordFallbackUsage(serviceName: string, operationName: string, strategyName: string, success: boolean): void {
    this.recordCounter(`${serviceName}.${operationName}.fallback`, 1, {
      service: serviceName,
      operation: operationName,
      strategy: strategyName,
      success: success.toString()
    });
  }

  /**
   * Get metrics by name pattern
   */
  getMetrics(pattern?: string): MetricDataPoint[] {
    if (!pattern) {
      return [...this.metrics];
    }

    const regex = new RegExp(pattern);
    return this.metrics.filter(metric => regex.test(metric.name));
  }

  /**
   * Get operation metrics
   */
  getOperationMetrics(serviceName?: string, operationName?: string): OperationMetrics[] {
    let metrics = [...this.operationMetrics];

    if (serviceName) {
      metrics = metrics.filter(m => m.serviceName === serviceName);
    }

    if (operationName) {
      metrics = metrics.filter(m => m.operationName === operationName);
    }

    return metrics;
  }

  /**
   * Get aggregated metrics for a service
   */
  getServiceAggregatedMetrics(serviceName: string, timeWindowHours: number = 24): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errorRate: number;
    successRate: number;
    topErrors: Array<{ errorType: string; count: number }>;
    responseTimePercentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  } {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

    const recentMetrics = this.operationMetrics.filter(m => 
      m.serviceName === serviceName && 
      new Date(m.startTime) > cutoffTime
    );

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
      : 0;

    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;

    // Top errors
    const errorCounts: Record<string, number> = {};
    recentMetrics
      .filter(m => !m.success && m.errorType)
      .forEach(m => {
        errorCounts[m.errorType!] = (errorCounts[m.errorType!] || 0) + 1;
      });

    const topErrors = Object.entries(errorCounts)
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Response time percentiles
    const responseTimes = recentMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const getPercentile = (percentile: number): number => {
      const index = Math.ceil((percentile / 100) * responseTimes.length) - 1;
      return responseTimes[Math.max(0, index)] || 0;
    };

    const responseTimePercentiles = {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      topErrors,
      responseTimePercentiles
    };
  }

  /**
   * Get system-wide aggregated metrics
   */
  getSystemAggregatedMetrics(timeWindowHours: number = 24): {
    totalRequests: number;
    totalErrors: number;
    averageResponseTime: number;
    services: Record<string, any>;
  } {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeWindowHours);

    const recentMetrics = this.operationMetrics.filter(m => 
      new Date(m.startTime) > cutoffTime
    );

    const totalRequests = recentMetrics.length;
    const totalErrors = recentMetrics.filter(m => !m.success).length;
    const averageResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
      : 0;

    // Group by service
    const serviceGroups: Record<string, OperationMetrics[]> = {};
    recentMetrics.forEach(m => {
      if (!serviceGroups[m.serviceName]) {
        serviceGroups[m.serviceName] = [];
      }
      serviceGroups[m.serviceName]!.push(m);
    });

    const services: Record<string, any> = {};
    for (const [serviceName, _metrics] of Object.entries(serviceGroups)) {
      services[serviceName] = this.getServiceAggregatedMetrics(serviceName, timeWindowHours);
    }

    return {
      totalRequests,
      totalErrors,
      averageResponseTime: Math.round(averageResponseTime),
      services
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    this.metrics = this.metrics.filter(m => new Date(m.timestamp) > cutoffTime);
    this.operationMetrics = this.operationMetrics.filter(m => new Date(m.startTime) > cutoffTime);

    logger.info('Cleared old metrics', {
      metricsRemaining: this.metrics.length,
      operationMetricsRemaining: this.operationMetrics.length,
      cutoffTime: cutoffTime.toISOString()
    });
  }

  /**
   * Record a metric data point
   */
  private recordMetric(metric: MetricDataPoint): void {
    this.metrics.push(metric);
    
    // Clean up old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get number environment variable with default
   */
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value && !isNaN(Number(value))) {
      return Number(value);
    }
    return defaultValue;
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
