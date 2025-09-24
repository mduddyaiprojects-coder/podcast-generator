import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import { CircuitBreaker, CircuitBreakerManager, CircuitBreakerState } from '../../src/utils/circuit-breaker';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const breaker = new CircuitBreaker('test-service');
      const stats = breaker.getStats();
      
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.requestCount).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        failureThreshold: 3,
        successThreshold: 2,
        timeoutMs: 30000
      };
      
      const breaker = new CircuitBreaker('test-service', customConfig);
      const stats = breaker.getStats();
      
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('execute', () => {
    it('should execute successful operation', async () => {
      const operation = () => Promise.resolve('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
    });

    it('should handle operation failure', async () => {
      const operation = () => Promise.reject(new Error('Operation failed'));
      
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Operation failed');
    });

    it('should open circuit after failure threshold', async () => {
      const config = {
        failureThreshold: 2,
        minRequestCount: 2
      };
      const breaker = new CircuitBreaker('test-service', config);
      const operation = () => Promise.reject(new Error('Operation failed'));
      
      // First failure
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      // Second failure - should open circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      // Third attempt - should fail fast
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker for test-service is OPEN');
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = circuitBreaker.getStats();
      
      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('requestCount');
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to initial state', async () => {
      // Cause some state changes
      const operation = () => Promise.reject(new Error('Operation failed'));
      await circuitBreaker.execute(operation).catch(() => {});
      
      circuitBreaker.reset();
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });

  describe('isHealthy', () => {
    it('should return true when circuit is closed', () => {
      expect(circuitBreaker.isHealthy()).toBe(true);
    });

    it('should return false when circuit is open', async () => {
      const config = {
        failureThreshold: 1,
        minRequestCount: 1
      };
      const breaker = new CircuitBreaker('test-service', config);
      const operation = () => Promise.reject(new Error('Operation failed'));
      
      // Cause circuit to open
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      expect(breaker.isHealthy()).toBe(false);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBreaker', () => {
    it('should create new circuit breaker for service', () => {
      const breaker = manager.getBreaker('test-service');
      
      expect(breaker).toBeDefined();
      expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should return existing circuit breaker for service', () => {
      const breaker1 = manager.getBreaker('test-service');
      const breaker2 = manager.getBreaker('test-service');
      
      expect(breaker1).toBe(breaker2);
    });
  });

  describe('execute', () => {
    it('should execute operation through service circuit breaker', async () => {
      const operation = () => Promise.resolve('success');
      
      const result = await manager.execute('test-service', operation);
      
      expect(result).toBe('success');
    });
  });

  describe('getAllStats', () => {
    it('should return statistics for all circuit breakers', () => {
      manager.getBreaker('service1');
      manager.getBreaker('service2');
      
      const stats = manager.getAllStats();
      
      expect(stats).toHaveProperty('service1');
      expect(stats).toHaveProperty('service2');
      expect(stats['service1']?.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats['service2']?.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('resetAll', () => {
    it('should reset all circuit breakers', async () => {
      const breaker1 = manager.getBreaker('service1');
      const breaker2 = manager.getBreaker('service2');
      
      // Cause some state changes
      const operation = () => Promise.reject(new Error('Operation failed'));
      await breaker1.execute(operation).catch(() => {});
      await breaker2.execute(operation).catch(() => {});
      
      manager.resetAll();
      
      expect(breaker1.getStats().state).toBe(CircuitBreakerState.CLOSED);
      expect(breaker2.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('reset', () => {
    it('should reset specific circuit breaker', async () => {
      const breaker = manager.getBreaker('test-service');
      
      // Cause some state changes
      const operation = () => Promise.reject(new Error('Operation failed'));
      await breaker.execute(operation).catch(() => {});
      
      manager.reset('test-service');
      
      expect(breaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should handle reset of non-existent service', () => {
      expect(() => manager.reset('non-existent')).not.toThrow();
    });
  });
});