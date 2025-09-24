import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MonitoringService, ServiceHealthStatus, AlertSeverity } from '../../src/services/monitoring-service';

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../src/utils/circuit-breaker', () => ({
  circuitBreakerManager: {
    getState: jest.fn().mockReturnValue('closed')
  }
}));

jest.mock('../../src/services/fallback-service', () => ({
  fallbackService: {
    hasFallbacks: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getServiceConfig: jest.fn()
  }
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = new MonitoringService();
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
      expect(monitoringService).toBeInstanceOf(MonitoringService);
    });
  });

  describe('getServiceHealth', () => {
    it('should return service health status', async () => {
      const health = await monitoringService.getServiceHealth('test-service');
      expect(health).toHaveProperty('serviceName');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('responseTime');
      expect(health).toHaveProperty('successRate');
      expect(health).toHaveProperty('errorRate');
      expect(health).toHaveProperty('totalRequests');
      expect(health).toHaveProperty('successfulRequests');
      expect(health).toHaveProperty('failedRequests');
      expect(health).toHaveProperty('circuitBreakerState');
      expect(health).toHaveProperty('uptime');
    });
  });

  describe('getAllServiceHealth', () => {
    it('should return all service health statuses', async () => {
      const allHealth = await monitoringService.getAllServiceHealth();
      expect(Array.isArray(allHealth)).toBe(true);
    });
  });

  describe('getAlerts', () => {
    it('should return system alerts', () => {
      const alerts = monitoringService.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics', () => {
      const metrics = monitoringService.getSystemMetrics();
      expect(typeof metrics).toBe('object');
    });
  });
});
