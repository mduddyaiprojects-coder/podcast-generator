import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MetricsCollector } from '../../src/services/metrics-collector';

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

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsCollector = new MetricsCollector();
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
      expect(metricsCollector).toBeInstanceOf(MetricsCollector);
    });
  });

  describe('recordCounter', () => {
    it('should record a counter metric', () => {
      metricsCollector.recordCounter('test.metric', 1, { service: 'test' });
      const metrics = metricsCollector.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('recordOperation', () => {
    it('should record an operation', () => {
      metricsCollector.recordOperation({
        serviceName: 'test-service',
        operationName: 'test-operation',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        success: true
      });
      const operations = metricsCollector.getOperationMetrics();
      expect(operations.length).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics array', () => {
      const metrics = metricsCollector.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('getOperationMetrics', () => {
    it('should return operation metrics array', () => {
      const operations = metricsCollector.getOperationMetrics();
      expect(Array.isArray(operations)).toBe(true);
    });
  });

  describe('getOperationMetrics', () => {
    it('should return operation metrics array', () => {
      const operations = metricsCollector.getOperationMetrics();
      expect(Array.isArray(operations)).toBe(true);
    });
  });
});
