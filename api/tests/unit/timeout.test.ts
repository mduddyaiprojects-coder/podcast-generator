import { TimeoutManager, DEFAULT_TIMEOUT_CONFIG, timeoutManager, withTimeout, withTimeoutDecorator } from '../../src/utils/timeout';
import { ServiceError, ErrorType, ErrorSeverity } from '../../src/utils/error-handling';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TimeoutManager', () => {
  let timeoutManager: TimeoutManager;

  beforeEach(() => {
    timeoutManager = new TimeoutManager();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const manager = new TimeoutManager();
      expect(manager.getConfig()).toEqual(DEFAULT_TIMEOUT_CONFIG);
    });

    it('should merge custom config with default config', () => {
      const customConfig = {
        defaultTimeoutMs: 60000,
        serviceTimeouts: {
          'custom-service': 30000
        }
      };
      const manager = new TimeoutManager(customConfig);
      const config = manager.getConfig();
      
      expect(config.defaultTimeoutMs).toBe(60000);
      expect(config.serviceTimeouts['custom-service']).toBe(30000);
      expect(config.maxTimeoutMs).toBe(DEFAULT_TIMEOUT_CONFIG.maxTimeoutMs);
    });
  });

  describe('getTimeoutForService', () => {
    it('should return custom timeout when provided', () => {
      const timeout = timeoutManager.getTimeoutForService('test-service', 5000);
      expect(timeout).toBe(5000);
    });

    it('should return service-specific timeout when available', () => {
      const timeout = timeoutManager.getTimeoutForService('azure-openai');
      expect(timeout).toBe(60000);
    });

    it('should return default timeout when service not found', () => {
      const timeout = timeoutManager.getTimeoutForService('unknown-service');
      expect(timeout).toBe(30000);
    });

    it('should clamp timeout to min value', () => {
      const timeout = timeoutManager.getTimeoutForService('test-service', 500);
      expect(timeout).toBe(1000); // minTimeoutMs
    });

    it('should clamp timeout to max value', () => {
      const timeout = timeoutManager.getTimeoutForService('test-service', 500000);
      expect(timeout).toBe(300000); // maxTimeoutMs
    });
  });

  describe('executeWithTimeout', () => {
    it('should resolve when operation completes before timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await timeoutManager.executeWithTimeout(operation, 'test-service', 1000);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should reject with timeout error when operation exceeds timeout', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      );

      await expect(
        timeoutManager.executeWithTimeout(operation, 'test-service', 100)
      ).rejects.toThrow(ServiceError);
    });

    it('should reject with original error when operation fails', async () => {
      const originalError = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(originalError);

      await expect(
        timeoutManager.executeWithTimeout(operation, 'test-service', 1000)
      ).rejects.toThrow(originalError);
    });

    it('should clear timeout when operation completes', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const operation = jest.fn().mockResolvedValue('success');
      
      await timeoutManager.executeWithTimeout(operation, 'test-service', 1000);
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('executeWithTimeouts', () => {
    it('should execute multiple operations with individual timeouts', async () => {
      const operations = [
        {
          operation: jest.fn().mockResolvedValue('result1'),
          service: 'service1',
          timeoutMs: 1000
        },
        {
          operation: jest.fn().mockResolvedValue('result2'),
          service: 'service2',
          timeoutMs: 1000
        }
      ];

      const results = await timeoutManager.executeWithTimeouts(operations);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        result: 'result1',
        service: 'service1',
        duration: expect.any(Number)
      });
      expect(results[1]).toEqual({
        result: 'result2',
        service: 'service2',
        duration: expect.any(Number)
      });
    });

    it('should handle failed operations in batch', async () => {
      const operations = [
        {
          operation: jest.fn().mockResolvedValue('result1'),
          service: 'service1',
          timeoutMs: 1000
        },
        {
          operation: jest.fn().mockRejectedValue(new Error('Failed')),
          service: 'service2',
          timeoutMs: 1000
        }
      ];

      const results = await timeoutManager.executeWithTimeouts(operations);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        result: 'result1',
        service: 'service1',
        duration: expect.any(Number)
      });
    });
  });

  describe('createTimeoutPromise', () => {
    it('should create a promise that rejects after timeout', async () => {
      const timeoutPromise = timeoutManager.createTimeoutPromise(100, 'test-service');
      
      await expect(timeoutPromise).rejects.toThrow(ServiceError);
    });

    it('should reject with correct error details', async () => {
      const timeoutPromise = timeoutManager.createTimeoutPromise(100, 'test-service');
      
      try {
        await timeoutPromise;
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect((error as ServiceError).type).toBe(ErrorType.TIMEOUT_ERROR);
        expect((error as ServiceError).severity).toBe(ErrorSeverity.MEDIUM);
        expect((error as ServiceError).service).toBe('test-service');
      }
    });
  });

  describe('raceWithTimeout', () => {
    it('should return operation result when it completes first', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await timeoutManager.raceWithTimeout(operation, 'test-service', 1000);
      
      expect(result).toBe('success');
    });

    it('should reject with timeout when timeout occurs first', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 2000))
      );

      await expect(
        timeoutManager.raceWithTimeout(operation, 'test-service', 100)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const updates = {
        defaultTimeoutMs: 45000,
        serviceTimeouts: {
          'new-service': 20000
        }
      };

      timeoutManager.updateConfig(updates);
      const config = timeoutManager.getConfig();
      
      expect(config.defaultTimeoutMs).toBe(45000);
      expect(config.serviceTimeouts['new-service']).toBe(20000);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config1 = timeoutManager.getConfig();
      const config2 = timeoutManager.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });
});

describe('withTimeout utility function', () => {
  it('should execute operation with timeout', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await withTimeout(operation, 'test-service', 1000);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
  });

  it('should use default timeout when not specified', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await withTimeout(operation, 'azure-openai');
    
    expect(result).toBe('success');
  });
});

describe('withTimeoutDecorator', () => {
  it('should create a decorator function', () => {
    const decorator = withTimeoutDecorator(1000, 'test-service');
    expect(typeof decorator).toBe('function');
  });

  it('should wrap method with timeout functionality', () => {
    class TestClass {
      async testMethod(): Promise<string> {
        return 'success';
      }
    }

    const instance = new TestClass();
    const originalMethod = instance.testMethod;
    
    // Apply decorator manually
    const decorator = withTimeoutDecorator(100, 'test-service');
    const descriptor = {
      value: originalMethod,
      writable: true,
      enumerable: true,
      configurable: true
    };
    
    decorator(TestClass.prototype, 'testMethod', descriptor);
    
    expect(typeof descriptor.value).toBe('function');
    expect(descriptor.value).not.toBe(originalMethod);
  });
});

describe('timeoutManager singleton', () => {
  it('should export singleton instance', () => {
    expect(timeoutManager).toBeInstanceOf(TimeoutManager);
  });

  it('should have default configuration', () => {
    const config = timeoutManager.getConfig();
    expect(config).toEqual(DEFAULT_TIMEOUT_CONFIG);
  });
});

describe('DEFAULT_TIMEOUT_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_TIMEOUT_CONFIG.defaultTimeoutMs).toBe(30000);
    expect(DEFAULT_TIMEOUT_CONFIG.maxTimeoutMs).toBe(300000);
    expect(DEFAULT_TIMEOUT_CONFIG.minTimeoutMs).toBe(1000);
    expect(DEFAULT_TIMEOUT_CONFIG.serviceTimeouts).toEqual({
      'azure-openai': 60000,
      'elevenlabs': 120000,
      'firecrawl': 45000,
      'youtube': 15000,
      'whisper': 180000,
      'database': 10000,
      'storage': 30000
    });
  });
});
