import { logger } from '../utils/logger';
// import { ErrorType, ErrorSeverity } from '../utils/error-handling';
import { circuitBreakerManager } from '../utils/circuit-breaker';
import { fallbackService } from './fallback-service';
import { environmentService } from '../config/environment';

/**
 * Service health status
 */
export enum ServiceHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Service metrics
 */
export interface ServiceMetrics {
  serviceName: string;
  timestamp: string;
  healthStatus: ServiceHealthStatus;
  responseTime: number;
  successRate: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitBreakerState: string;
  lastError?: string;
  lastErrorTime?: string;
  uptime: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * System alert
 */
export interface SystemAlert {
  id: string;
  serviceName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  healthCheckInterval: number;
  metricsRetentionDays: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    successRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alertChannels: string[];
  enableRealTimeMonitoring: boolean;
}

/**
 * Service monitoring and alerting system
 */
export class MonitoringService {
  private metrics: Map<string, ServiceMetrics[]> = new Map();
  private alerts: SystemAlert[] = [];
  private config: MonitoringConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.config = this.loadConfig();
    this.startHealthChecks();
  }

  /**
   * Load monitoring configuration
   */
  private loadConfig(): MonitoringConfig {
    return {
      healthCheckInterval: this.getNumberEnv('MONITORING_HEALTH_CHECK_INTERVAL', 30000), // 30 seconds
      metricsRetentionDays: this.getNumberEnv('MONITORING_METRICS_RETENTION_DAYS', 7),
      alertThresholds: {
        responseTime: this.getNumberEnv('ALERT_THRESHOLD_RESPONSE_TIME', 5000), // 5 seconds
        errorRate: this.getNumberEnv('ALERT_THRESHOLD_ERROR_RATE', 0.1), // 10%
        successRate: this.getNumberEnv('ALERT_THRESHOLD_SUCCESS_RATE', 0.9), // 90%
        memoryUsage: this.getNumberEnv('ALERT_THRESHOLD_MEMORY_USAGE', 0.8), // 80%
        cpuUsage: this.getNumberEnv('ALERT_THRESHOLD_CPU_USAGE', 0.8) // 80%
      },
      alertChannels: this.getStringArrayEnv('ALERT_CHANNELS', ['console', 'log']),
      enableRealTimeMonitoring: this.getBooleanEnv('ENABLE_REAL_TIME_MONITORING', true)
    };
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    if (this.config.enableRealTimeMonitoring) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks();
      }, this.config.healthCheckInterval);

      logger.info('Health check monitoring started', {
        interval: this.config.healthCheckInterval,
        services: this.getMonitoredServices()
      });
    }
  }

  /**
   * Stop health check monitoring
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('Health check monitoring stopped');
    }
  }

  /**
   * Perform health checks for all services
   */
  async performHealthChecks(): Promise<void> {
    const services = this.getMonitoredServices();
    
    for (const serviceName of services) {
      try {
        const metrics = await this.checkServiceHealth(serviceName);
        this.recordMetrics(serviceName, metrics);
        this.evaluateAlerts(serviceName, metrics);
      } catch (error) {
        logger.error(`Health check failed for ${serviceName}`, { error });
        this.createAlert(serviceName, AlertSeverity.ERROR, 'Health Check Failed', 
          `Health check failed for ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Check health of a specific service
   */
  async checkServiceHealth(serviceName: string): Promise<ServiceMetrics> {
    const startTime = Date.now();
    let healthStatus = ServiceHealthStatus.UNKNOWN;
    let lastError: string | undefined;
    let lastErrorTime: string | undefined;

    try {
      // Check circuit breaker status
      const circuitBreaker = circuitBreakerManager.getBreaker(serviceName);
      const circuitStats = circuitBreaker.getStats();
      
      if (circuitStats.state === 'OPEN') {
        healthStatus = ServiceHealthStatus.UNHEALTHY;
        lastError = 'Circuit breaker is OPEN';
        lastErrorTime = new Date().toISOString();
      } else if (circuitStats.state === 'HALF_OPEN') {
        healthStatus = ServiceHealthStatus.DEGRADED;
      } else {
        healthStatus = ServiceHealthStatus.HEALTHY;
      }

      // Check if service has fallback strategies
      const hasFallbacks = fallbackService.hasFallbacks(serviceName);
      if (!hasFallbacks && healthStatus === ServiceHealthStatus.UNHEALTHY) {
        healthStatus = ServiceHealthStatus.DEGRADED;
      }

      // Simulate service-specific health checks
      await this.performServiceSpecificHealthCheck(serviceName);

    } catch (error) {
      healthStatus = ServiceHealthStatus.UNHEALTHY;
      lastError = error instanceof Error ? error.message : 'Unknown error';
      lastErrorTime = new Date().toISOString();
    }

    const responseTime = Date.now() - startTime;
    const uptime = Date.now() - this.startTime.getTime();

    return {
      serviceName,
      timestamp: new Date().toISOString(),
      healthStatus,
      responseTime,
      successRate: healthStatus === ServiceHealthStatus.HEALTHY ? 1.0 : 
                   healthStatus === ServiceHealthStatus.DEGRADED ? 0.7 : 0.0,
      errorRate: healthStatus === ServiceHealthStatus.UNHEALTHY ? 1.0 : 
                 healthStatus === ServiceHealthStatus.DEGRADED ? 0.3 : 0.0,
      totalRequests: this.getTotalRequests(serviceName),
      successfulRequests: this.getSuccessfulRequests(serviceName),
      failedRequests: this.getFailedRequests(serviceName),
      circuitBreakerState: circuitBreakerManager.getBreaker(serviceName).getStats().state,
      lastError,
      lastErrorTime,
      uptime,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage()
    };
  }

  /**
   * Perform service-specific health checks
   */
  private async performServiceSpecificHealthCheck(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'azure-openai':
        await this.checkAzureOpenAIHealth();
        break;
      case 'elevenlabs':
        await this.checkElevenLabsHealth();
        break;
      case 'firecrawl':
        await this.checkFirecrawlHealth();
        break;
      case 'youtube':
        await this.checkYouTubeHealth();
        break;
      case 'whisper':
        await this.checkWhisperHealth();
        break;
      default:
        // Generic health check
        break;
    }
  }

  /**
   * Check Azure OpenAI health
   */
  private async checkAzureOpenAIHealth(): Promise<void> {
    const config = environmentService.getConfig();
    if (!config.apiKeys.azureOpenAI.apiKey || !config.apiKeys.azureOpenAI.endpoint) {
      throw new Error('Azure OpenAI not configured');
    }
  }

  /**
   * Check ElevenLabs health
   */
  private async checkElevenLabsHealth(): Promise<void> {
    const config = environmentService.getConfig();
    if (!config.apiKeys.elevenLabs.apiKey) {
      throw new Error('ElevenLabs not configured');
    }
  }

  /**
   * Check Firecrawl health
   */
  private async checkFirecrawlHealth(): Promise<void> {
    const config = environmentService.getConfig();
    if (!config.apiKeys.firecrawl.apiKey) {
      throw new Error('Firecrawl not configured');
    }
  }

  /**
   * Check YouTube health
   */
  private async checkYouTubeHealth(): Promise<void> {
    const config = environmentService.getConfig();
    if (!config.apiKeys.youtube.apiKey) {
      throw new Error('YouTube not configured');
    }
  }

  /**
   * Check Whisper health
   */
  private async checkWhisperHealth(): Promise<void> {
    const config = environmentService.getConfig();
    if (!config.apiKeys.azureOpenAI.apiKey || !config.apiKeys.azureOpenAI.endpoint) {
      throw new Error('Whisper (Azure OpenAI) not configured');
    }
  }

  /**
   * Record metrics for a service
   */
  private recordMetrics(serviceName: string, metrics: ServiceMetrics): void {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, []);
    }

    const serviceMetrics = this.metrics.get(serviceName)!;
    serviceMetrics.push(metrics);

    // Clean up old metrics
    this.cleanupOldMetrics(serviceName);
  }

  /**
   * Clean up old metrics based on retention policy
   */
  private cleanupOldMetrics(serviceName: string): void {
    const serviceMetrics = this.metrics.get(serviceName);
    if (!serviceMetrics) return;

    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - this.config.metricsRetentionDays);

    const filteredMetrics = serviceMetrics.filter(metric => 
      new Date(metric.timestamp) > cutoffTime
    );

    this.metrics.set(serviceName, filteredMetrics);
  }

  /**
   * Evaluate alerts based on metrics
   */
  private evaluateAlerts(serviceName: string, metrics: ServiceMetrics): void {
    const thresholds = this.config.alertThresholds;

    // Response time alert
    if (metrics.responseTime > thresholds.responseTime) {
      this.createAlert(serviceName, AlertSeverity.WARNING, 'High Response Time',
        `Service ${serviceName} response time is ${metrics.responseTime}ms (threshold: ${thresholds.responseTime}ms)`);
    }

    // Error rate alert
    if (metrics.errorRate > thresholds.errorRate) {
      this.createAlert(serviceName, AlertSeverity.ERROR, 'High Error Rate',
        `Service ${serviceName} error rate is ${(metrics.errorRate * 100).toFixed(1)}% (threshold: ${(thresholds.errorRate * 100).toFixed(1)}%)`);
    }

    // Success rate alert
    if (metrics.successRate < thresholds.successRate) {
      this.createAlert(serviceName, AlertSeverity.WARNING, 'Low Success Rate',
        `Service ${serviceName} success rate is ${(metrics.successRate * 100).toFixed(1)}% (threshold: ${(thresholds.successRate * 100).toFixed(1)}%)`);
    }

    // Memory usage alert
    if (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) {
      this.createAlert(serviceName, AlertSeverity.WARNING, 'High Memory Usage',
        `Service ${serviceName} memory usage is ${(metrics.memoryUsage * 100).toFixed(1)}% (threshold: ${(thresholds.memoryUsage * 100).toFixed(1)}%)`);
    }

    // CPU usage alert
    if (metrics.cpuUsage && metrics.cpuUsage > thresholds.cpuUsage) {
      this.createAlert(serviceName, AlertSeverity.WARNING, 'High CPU Usage',
        `Service ${serviceName} CPU usage is ${(metrics.cpuUsage * 100).toFixed(1)}% (threshold: ${(thresholds.cpuUsage * 100).toFixed(1)}%)`);
    }

    // Service unhealthy alert
    if (metrics.healthStatus === ServiceHealthStatus.UNHEALTHY) {
      this.createAlert(serviceName, AlertSeverity.CRITICAL, 'Service Unhealthy',
        `Service ${serviceName} is in unhealthy state`);
    }
  }

  /**
   * Create a system alert
   */
  createAlert(serviceName: string, severity: AlertSeverity, title: string, message: string, metadata: Record<string, any> = {}): void {
    const alert: SystemAlert = {
      id: this.generateAlertId(),
      serviceName,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    this.sendAlert(alert);

    logger.warn(`Alert created: ${title}`, {
      serviceName,
      severity,
      alertId: alert.id,
      message
    });
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: SystemAlert): void {
    for (const channel of this.config.alertChannels) {
      switch (channel) {
        case 'console':
          console.log(`🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.serviceName}: ${alert.title}`);
          break;
        case 'log':
          logger.error(`Alert: ${alert.title}`, {
            alertId: alert.id,
            serviceName: alert.serviceName,
            severity: alert.severity,
            message: alert.message,
            metadata: alert.metadata
          });
          break;
        // Add more channels like email, Slack, etc.
      }
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      
      logger.info(`Alert resolved: ${alert.title}`, {
        alertId,
        serviceName: alert.serviceName,
        resolvedAt: alert.resolvedAt
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get current metrics for all services
   */
  getAllMetrics(): Record<string, ServiceMetrics[]> {
    const result: Record<string, ServiceMetrics[]> = {};
    for (const [serviceName, metrics] of this.metrics) {
      result[serviceName] = [...metrics];
    }
    return result;
  }

  /**
   * Get latest metrics for a service
   */
  getLatestMetrics(serviceName: string): ServiceMetrics | null {
    const serviceMetrics = this.metrics.get(serviceName);
    if (!serviceMetrics || serviceMetrics.length === 0) {
      return null;
    }
    return serviceMetrics[serviceMetrics.length - 1] || null;
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by service
   */
  getAlertsByService(serviceName: string): SystemAlert[] {
    return this.alerts.filter(alert => alert.serviceName === serviceName);
  }

  /**
   * Get system health summary
   */
  getSystemHealthSummary(): {
    overallHealth: ServiceHealthStatus;
    services: Record<string, ServiceHealthStatus>;
    activeAlerts: number;
    totalAlerts: number;
    uptime: number;
  } {
    const services = this.getMonitoredServices();
    const serviceHealths: Record<string, ServiceHealthStatus> = {};
    let healthyServices = 0;
    let degradedServices = 0;
    let unhealthyServices = 0;

    for (const serviceName of services) {
      const latestMetrics = this.getLatestMetrics(serviceName);
      const health = latestMetrics?.healthStatus || ServiceHealthStatus.UNKNOWN;
      serviceHealths[serviceName] = health;

      switch (health) {
        case ServiceHealthStatus.HEALTHY:
          healthyServices++;
          break;
        case ServiceHealthStatus.DEGRADED:
          degradedServices++;
          break;
        case ServiceHealthStatus.UNHEALTHY:
          unhealthyServices++;
          break;
      }
    }

    let overallHealth: ServiceHealthStatus;
    if (unhealthyServices > 0) {
      overallHealth = ServiceHealthStatus.UNHEALTHY;
    } else if (degradedServices > 0) {
      overallHealth = ServiceHealthStatus.DEGRADED;
    } else if (healthyServices === services.length) {
      overallHealth = ServiceHealthStatus.HEALTHY;
    } else {
      overallHealth = ServiceHealthStatus.UNKNOWN;
    }

    return {
      overallHealth,
      services: serviceHealths,
      activeAlerts: this.getActiveAlerts().length,
      totalAlerts: this.alerts.length,
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * Get monitored services list
   */
  private getMonitoredServices(): string[] {
    return ['azure-openai', 'elevenlabs', 'firecrawl', 'youtube', 'whisper'];
  }

  /**
   * Get total requests for a service
   */
  private getTotalRequests(serviceName: string): number {
    const circuitBreaker = circuitBreakerManager.getBreaker(serviceName);
    return circuitBreaker.getStats().requestCount;
  }

  /**
   * Get successful requests for a service
   */
  private getSuccessfulRequests(serviceName: string): number {
    const circuitBreaker = circuitBreakerManager.getBreaker(serviceName);
    return circuitBreaker.getStats().successCount;
  }

  /**
   * Get failed requests for a service
   */
  private getFailedRequests(serviceName: string): number {
    const circuitBreaker = circuitBreakerManager.getBreaker(serviceName);
    return circuitBreaker.getStats().failureCount;
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / memUsage.heapTotal;
  }

  /**
   * Get CPU usage percentage (simplified)
   */
  private getCpuUsage(): number {
    // Simplified CPU usage calculation
    // In production, you'd use a more sophisticated method
    return Math.random() * 0.5; // Placeholder
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  /**
   * Get boolean environment variable with default
   */
  private getBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key]?.toLowerCase();
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
  }

  /**
   * Get string array environment variable with default
   */
  private getStringArrayEnv(key: string, defaultValue: string[]): string[] {
    const value = process.env[key];
    if (value) {
      return value.split(',').map(s => s.trim());
    }
    return defaultValue;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
