import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FallbackService, FallbackStrategy } from '../../src/services/fallback-service';
import { ServiceError, ErrorType, ErrorSeverity } from '../../src/utils/error-handling';

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../src/utils/retry', () => ({
  RetryUtil: {
    execute: jest.fn().mockImplementation(async (fn: any) => fn())
  }
}));

jest.mock('../../src/utils/timeout', () => ({
  timeoutManager: {
    executeWithTimeout: jest.fn().mockImplementation(async (fn: any) => fn())
  }
}));

describe('FallbackService', () => {
  let fallbackService: FallbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    fallbackService = new FallbackService();
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
    it('should initialize with default strategies', () => {
      expect(fallbackService).toBeInstanceOf(FallbackService);
    });
  });

  describe('addStrategies', () => {
    it('should add strategies for a service', () => {
      const strategies: FallbackStrategy[] = [
        {
          name: 'test_strategy',
          priority: 1,
          condition: (error) => error.type === ErrorType.SERVICE_UNAVAILABLE,
          action: async () => 'test result'
        }
      ];

      fallbackService.addStrategies('test-service', strategies);
      
      const addedStrategies = fallbackService.getStrategies('test-service');
      expect(addedStrategies).toHaveLength(1);
      expect(addedStrategies[0]?.name).toBe('test_strategy');
    });
  });

  describe('getStrategies', () => {
    it('should return strategies for a service', () => {
      const strategies = fallbackService.getStrategies('azure-openai');
      expect(Array.isArray(strategies)).toBe(true);
    });

    it('should return empty array for unknown service', () => {
      const strategies = fallbackService.getStrategies('unknown-service');
      expect(strategies).toEqual([]);
    });
  });

  describe('hasFallbacks', () => {
    it('should return true for services with strategies', () => {
      expect(fallbackService.hasFallbacks('azure-openai')).toBe(true);
    });

    it('should return false for services without strategies', () => {
      expect(fallbackService.hasFallbacks('unknown-service')).toBe(false);
    });
  });

  describe('getFallbackStats', () => {
    it('should return fallback statistics', () => {
      const stats = fallbackService.getFallbackStats();
      expect(typeof stats).toBe('object');
    });
  });

  describe('executeFallback', () => {
    it('should throw error when no strategies available', async () => {
      const error = new ServiceError(
        'Test error',
        ErrorType.INTERNAL_ERROR,
        ErrorSeverity.HIGH,
        'test-service'
      );

      await expect(fallbackService.executeFallback('unknown-service', error))
        .rejects.toThrow('No fallback strategies available');
    });
  });
});
