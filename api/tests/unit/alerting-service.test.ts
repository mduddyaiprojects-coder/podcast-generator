import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AlertingService, AlertRule } from '../../src/services/alerting-service';

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../src/services/monitoring-service', () => ({
  SystemAlert: jest.fn(),
  AlertSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  }
}));

jest.mock('../../src/services/metrics-collector', () => ({
  metricsCollector: {
    getMetricValue: jest.fn(),
    getMetricHistory: jest.fn()
  }
}));

describe('AlertingService', () => {
  let alertingService: AlertingService;

  beforeEach(() => {
    jest.clearAllMocks();
    alertingService = new AlertingService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(alertingService).toBeInstanceOf(AlertingService);
    });
  });

  describe('addRule', () => {
    it('should add a new alert rule', () => {
      const rule: AlertRule = {
        id: 'test-rule-1',
        name: 'Test Rule',
        description: 'Test Description',
        enabled: true,
        conditions: [{
          metric: 'cpu_usage',
          operator: 'gt',
          threshold: 80,
          timeWindowMinutes: 5,
          aggregation: 'avg'
        }],
        severity: 'high' as any,
        cooldownMinutes: 10,
        notificationChannels: ['email'],
        tags: { environment: 'test' }
      };

      const initialRules = alertingService.getAllRules();
      alertingService.addRule(rule);
      const rules = alertingService.getAllRules();
      expect(rules).toHaveLength(initialRules.length + 1);
      expect(rules.some(r => r.id === 'test-rule-1')).toBe(true);
    });
  });

  describe('getAllRules', () => {
    it('should return rules array', () => {
      const rules = alertingService.getAllRules();
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('getAllNotifications', () => {
    it('should return empty array initially', () => {
      const notifications = alertingService.getAllNotifications();
      expect(notifications).toEqual([]);
    });
  });
});