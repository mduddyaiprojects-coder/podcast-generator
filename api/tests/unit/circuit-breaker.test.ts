import { CircuitBreaker, CircuitBreakerState, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../../src/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service');
  });

  describe('execute', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should fail fast when circuit is open', async () => {
      // Force circuit to open by failing multiple times
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // Execute enough failures to open circuit (need to exceed both failure threshold and min request count)
      const totalAttempts = Math.max(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold + 1, DEFAULT_CIRCUIT_BREAKER_CONFIG.minRequestCount + 1);
      
      for (let i = 0; i < totalAttempts; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
      
      // Now any operation should fail fast
      const operation = jest.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(operation))
        .rejects.toThrow('Circuit breaker for test-service is OPEN');
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should move to half-open after timeout', async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      const totalAttempts = Math.max(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold + 1, DEFAULT_CIRCUIT_BREAKER_CONFIG.minRequestCount + 1);
      
      for (let i = 0; i < totalAttempts; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
      
      // Mock Date.now to simulate timeout
      const originalNow = Date.now;
      const mockNow = jest.fn()
        .mockReturnValueOnce(originalNow()) // Initial time
        .mockReturnValueOnce(originalNow() + DEFAULT_CIRCUIT_BREAKER_CONFIG.timeoutMs + 1000); // After timeout
      
      Date.now = mockNow;
      
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.HALF_OPEN);
      
      Date.now = originalNow;
    });

    it('should close circuit after successful operations in half-open state', async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold + 1; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Move to half-open
      circuitBreaker['state'] = CircuitBreakerState.HALF_OPEN;
      
      // Execute successful operations
      const successOperation = jest.fn().mockResolvedValue('success');
      
      for (let i = 0; i < DEFAULT_CIRCUIT_BREAKER_CONFIG.successThreshold; i++) {
        await circuitBreaker.execute(successOperation);
      }
      
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = circuitBreaker.getStats();
      
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to initial state', async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      const totalAttempts = Math.max(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold + 1, DEFAULT_CIRCUIT_BREAKER_CONFIG.minRequestCount + 1);
      
      for (let i = 0; i < totalAttempts; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getStats().state).toBe(CircuitBreakerState.OPEN);
      
      // Reset
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
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      const totalAttempts = Math.max(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold + 1, DEFAULT_CIRCUIT_BREAKER_CONFIG.minRequestCount + 1);
      
      for (let i = 0; i < totalAttempts; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.isHealthy()).toBe(false);
    });
  });
});
