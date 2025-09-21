import { logger } from '../utils/logger';
import { SystemAlert, AlertSeverity } from './monitoring-service';
import { metricsCollector } from './metrics-collector';

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  cooldownMinutes: number;
  notificationChannels: string[];
  tags: Record<string, string>;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  timeWindowMinutes: number;
  aggregation: 'avg' | 'sum' | 'count' | 'max' | 'min';
}

/**
 * Alert notification
 */
export interface AlertNotification {
  id: string;
  alertId: string;
  ruleId: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
  retryCount: number;
}

/**
 * Alerting service for managing alert rules and notifications
 */
export class AlertingService {
  private rules: Map<string, AlertRule> = new Map();
  private notifications: AlertNotification[] = [];
  private evaluationInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor() {
    this.initializeDefaultRules();
    this.startEvaluation();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 10%',
        enabled: true,
        conditions: [{
          metric: 'error_rate',
          operator: 'gt',
          threshold: 0.1,
          timeWindowMinutes: 5,
          aggregation: 'avg'
        }],
        severity: AlertSeverity.ERROR,
        cooldownMinutes: 15,
        notificationChannels: ['console', 'log'],
        tags: { category: 'reliability' }
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        description: 'Alert when average response time exceeds 5 seconds',
        enabled: true,
        conditions: [{
          metric: 'response_time',
          operator: 'gt',
          threshold: 5000,
          timeWindowMinutes: 5,
          aggregation: 'avg'
        }],
        severity: AlertSeverity.WARNING,
        cooldownMinutes: 10,
        notificationChannels: ['console', 'log'],
        tags: { category: 'performance' }
      },
      {
        id: 'service_down',
        name: 'Service Down',
        description: 'Alert when service success rate drops below 50%',
        enabled: true,
        conditions: [{
          metric: 'success_rate',
          operator: 'lt',
          threshold: 0.5,
          timeWindowMinutes: 2,
          aggregation: 'avg'
        }],
        severity: AlertSeverity.CRITICAL,
        cooldownMinutes: 5,
        notificationChannels: ['console', 'log'],
        tags: { category: 'availability' }
      },
      {
        id: 'circuit_breaker_open',
        name: 'Circuit Breaker Open',
        description: 'Alert when circuit breaker opens',
        enabled: true,
        conditions: [{
          metric: 'circuit_breaker_state',
          operator: 'eq',
          threshold: 1, // 1 = OPEN
          timeWindowMinutes: 1,
          aggregation: 'max'
        }],
        severity: AlertSeverity.CRITICAL,
        cooldownMinutes: 5,
        notificationChannels: ['console', 'log'],
        tags: { category: 'reliability' }
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 80%',
        enabled: true,
        conditions: [{
          metric: 'memory_usage',
          operator: 'gt',
          threshold: 0.8,
          timeWindowMinutes: 5,
          aggregation: 'avg'
        }],
        severity: AlertSeverity.WARNING,
        cooldownMinutes: 15,
        notificationChannels: ['console', 'log'],
        tags: { category: 'resources' }
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Initialized default alert rules', {
      ruleCount: defaultRules.length,
      rules: defaultRules.map(r => r.id)
    });
  }

  /**
   * Start alert evaluation
   */
  private startEvaluation(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.evaluationInterval = setInterval(() => {
      this.evaluateAlerts();
    }, 60000); // Evaluate every minute

    logger.info('Alert evaluation started');
  }

  /**
   * Stop alert evaluation
   */
  stopEvaluation(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = undefined;
    }
    this.isRunning = false;
    logger.info('Alert evaluation stopped');
  }

  /**
   * Evaluate all alert rules
   */
  async evaluateAlerts(): Promise<void> {
    try {
      for (const [_ruleId, rule] of this.rules) {
        if (!rule.enabled) continue;

        const shouldAlert = await this.evaluateRule(rule);
        if (shouldAlert) {
          await this.triggerAlert(rule);
        }
      }
    } catch (error) {
      logger.error('Error evaluating alerts', { error });
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    try {
      // Check if rule is in cooldown
      const lastAlert = this.getLastAlertForRule(rule.id);
      if (lastAlert) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const timeSinceLastAlert = Date.now() - new Date(lastAlert.timestamp).getTime();
        if (timeSinceLastAlert < cooldownMs) {
          return false; // Still in cooldown
        }
      }

      // Evaluate all conditions
      for (const condition of rule.conditions) {
        const conditionMet = await this.evaluateCondition(condition);
        if (!conditionMet) {
          return false; // At least one condition not met
        }
      }

      return true; // All conditions met
    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}`, { error, ruleId: rule.id });
      return false;
    }
  }

  /**
   * Evaluate a specific condition
   */
  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    try {
      const metrics = this.getMetricsForCondition(condition);
      if (metrics.length === 0) {
        return false; // No data available
      }

      const value = this.aggregateMetrics(metrics, condition.aggregation);
      return this.compareValues(value, condition.operator, condition.threshold);
    } catch (error) {
      logger.error('Error evaluating condition', { error, condition });
      return false;
    }
  }

  /**
   * Get metrics for a condition
   */
  private getMetricsForCondition(condition: AlertCondition): any[] {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - condition.timeWindowMinutes);

    // Get metrics based on the metric name
    switch (condition.metric) {
      case 'error_rate':
        return this.getErrorRateMetrics(cutoffTime);
      case 'response_time':
        return this.getResponseTimeMetrics(cutoffTime);
      case 'success_rate':
        return this.getSuccessRateMetrics(cutoffTime);
      case 'circuit_breaker_state':
        return this.getCircuitBreakerStateMetrics(cutoffTime);
      case 'memory_usage':
        return this.getMemoryUsageMetrics(cutoffTime);
      default:
        return [];
    }
  }

  /**
   * Get error rate metrics
   */
  private getErrorRateMetrics(cutoffTime: Date): any[] {
    const operationMetrics = metricsCollector.getOperationMetrics();
    const recentMetrics = operationMetrics.filter(m => new Date(m.startTime) > cutoffTime);
    
    const serviceGroups: Record<string, any[]> = {};
    recentMetrics.forEach(m => {
      if (!serviceGroups[m.serviceName]) {
        serviceGroups[m.serviceName] = [];
      }
      serviceGroups[m.serviceName]!.push(m);
    });

    return Object.entries(serviceGroups).map(([service, metrics]) => {
      const totalRequests = metrics.length;
      const failedRequests = metrics.filter(m => !m.success).length;
      return {
        service,
        value: totalRequests > 0 ? failedRequests / totalRequests : 0,
        timestamp: new Date()
      };
    });
  }

  /**
   * Get response time metrics
   */
  private getResponseTimeMetrics(cutoffTime: Date): any[] {
    const operationMetrics = metricsCollector.getOperationMetrics();
    const recentMetrics = operationMetrics.filter(m => new Date(m.startTime) > cutoffTime);
    
    const serviceGroups: Record<string, any[]> = {};
    recentMetrics.forEach(m => {
      if (!serviceGroups[m.serviceName]) {
        serviceGroups[m.serviceName] = [];
      }
      serviceGroups[m.serviceName]!.push(m);
    });

    return Object.entries(serviceGroups).map(([service, metrics]) => {
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      return {
        service,
        value: avgResponseTime,
        timestamp: new Date()
      };
    });
  }

  /**
   * Get success rate metrics
   */
  private getSuccessRateMetrics(cutoffTime: Date): any[] {
    const operationMetrics = metricsCollector.getOperationMetrics();
    const recentMetrics = operationMetrics.filter(m => new Date(m.startTime) > cutoffTime);
    
    const serviceGroups: Record<string, any[]> = {};
    recentMetrics.forEach(m => {
      if (!serviceGroups[m.serviceName]) {
        serviceGroups[m.serviceName] = [];
      }
      serviceGroups[m.serviceName]!.push(m);
    });

    return Object.entries(serviceGroups).map(([service, metrics]) => {
      const totalRequests = metrics.length;
      const successfulRequests = metrics.filter(m => m.success).length;
      return {
        service,
        value: totalRequests > 0 ? successfulRequests / totalRequests : 1,
        timestamp: new Date()
      };
    });
  }

  /**
   * Get circuit breaker state metrics
   */
  private getCircuitBreakerStateMetrics(_cutoffTime: Date): any[] {
    // This would need to be implemented based on your circuit breaker state tracking
    // For now, return empty array
    return [];
  }

  /**
   * Get memory usage metrics
   */
  private getMemoryUsageMetrics(_cutoffTime: Date): any[] {
    const memUsage = process.memoryUsage();
    const memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
    
    return [{
      service: 'system',
      value: memoryUsage,
      timestamp: new Date()
    }];
  }

  /**
   * Aggregate metrics based on aggregation type
   */
  private aggregateMetrics(metrics: any[], aggregation: string): number {
    if (metrics.length === 0) return 0;

    const values = metrics.map(m => m.value);
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'count':
        return values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      default:
        return 0;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alert: SystemAlert = {
      id: this.generateAlertId(),
      serviceName: 'system',
      severity: rule.severity,
      title: rule.name,
      message: rule.description,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata: {
        ruleId: rule.id,
        conditions: rule.conditions,
        tags: rule.tags
      }
    };

    // Send notifications
    for (const channel of rule.notificationChannels) {
      await this.sendNotification(alert, channel);
    }

    logger.warn(`Alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      alertId: alert.id,
      severity: rule.severity,
      channels: rule.notificationChannels
    });
  }

  /**
   * Send notification through a channel
   */
  private async sendNotification(alert: SystemAlert, channel: string): Promise<void> {
    const notification: AlertNotification = {
      id: this.generateNotificationId(),
      alertId: alert.id,
      ruleId: alert.metadata['ruleId'] || 'unknown',
      channel,
      status: 'pending',
      retryCount: 0
    };

    try {
      switch (channel) {
        case 'console':
          console.log(`🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);
          notification.status = 'sent';
          notification.sentAt = new Date().toISOString();
          break;
        case 'log':
          logger.error(`Alert: ${alert.title}`, {
            alertId: alert.id,
            severity: alert.severity,
            message: alert.message,
            metadata: alert.metadata
          });
          notification.status = 'sent';
          notification.sentAt = new Date().toISOString();
          break;
        // Add more channels like email, Slack, webhook, etc.
        default:
          notification.status = 'failed';
          notification.error = `Unknown channel: ${channel}`;
      }
    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.notifications.push(notification);
  }

  /**
   * Get last alert for a rule
   */
  private getLastAlertForRule(_ruleId: string): SystemAlert | null {
    // This would need to be implemented based on your alert storage
    // For now, return null
    return null;
  }

  /**
   * Add or update an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Alert rule added/updated: ${rule.name}`, { ruleId: rule.id });
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info(`Alert rule removed: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get all alert rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): AlertNotification[] {
    return [...this.notifications];
  }

  /**
   * Get notifications by status
   */
  getNotificationsByStatus(status: string): AlertNotification[] {
    return this.notifications.filter(n => n.status === status);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const alertingService = new AlertingService();
