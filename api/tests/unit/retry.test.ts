import { RetryUtil } from '../../src/utils/retry';

describe('RetryUtil', () => {
  describe('execute', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryUtil.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('success');
      
      const result = await RetryUtil.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(RetryUtil.execute(operation, { maxAttempts: 2 }))
        .rejects.toThrow('Persistent error');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect retry condition', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Non-retryable error'));
      
      const config = {
        retryCondition: (error: any) => error.message.includes('retryable')
      };
      
      await expect(RetryUtil.execute(operation, config))
        .rejects.toThrow('Non-retryable error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await RetryUtil.execute(operation, { onRetry });
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should call onMaxAttemptsReached callback', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      const onMaxAttemptsReached = jest.fn();
      
      await expect(RetryUtil.execute(operation, { 
        maxAttempts: 2, 
        onMaxAttemptsReached 
      })).rejects.toThrow();
      
      expect(onMaxAttemptsReached).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('executeWithMetadata', () => {
    it('should return result with metadata', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryUtil.executeWithMetadata(operation);
      
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.totalTimeMs).toBeGreaterThan(0);
    });

    it('should include attempts and timing in error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(RetryUtil.executeWithMetadata(operation, { maxAttempts: 2 }))
        .rejects.toMatchObject({
          message: 'Persistent error',
          attempts: 2,
          totalTimeMs: expect.any(Number)
        });
    });
  });

  describe('createServiceConfig', () => {
    it('should create API service config', () => {
      const config = RetryUtil.createServiceConfig('api');
      
      expect(config.maxAttempts).toBe(3);
      expect(config.baseDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(5000);
    });

    it('should create database service config', () => {
      const config = RetryUtil.createServiceConfig('database');
      
      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelayMs).toBe(500);
      expect(config.maxDelayMs).toBe(3000);
    });

    it('should create storage service config', () => {
      const config = RetryUtil.createServiceConfig('storage');
      
      expect(config.maxAttempts).toBe(4);
      expect(config.baseDelayMs).toBe(2000);
      expect(config.maxDelayMs).toBe(8000);
    });

    it('should create AI service config', () => {
      const config = RetryUtil.createServiceConfig('ai');
      
      expect(config.maxAttempts).toBe(2);
      expect(config.baseDelayMs).toBe(3000);
      expect(config.maxDelayMs).toBe(10000);
    });
  });
});
