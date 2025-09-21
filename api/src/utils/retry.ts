import { logger } from './logger';

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    if (error.status === 429) { // Rate limited
      return true;
    }
    return false;
  }
};

/**
 * Retry utility class with exponential backoff and jitter
 */
export class RetryUtil {
  /**
   * Execute a function with retry logic
   */
  static async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`, {
            operation: operation.name || 'anonymous',
            attempts: attempt,
            maxAttempts: finalConfig.maxAttempts
          });
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === finalConfig.maxAttempts || !this.shouldRetry(error, finalConfig)) {
          if (finalConfig.onMaxAttemptsReached) {
            finalConfig.onMaxAttemptsReached(error);
          }
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, finalConfig);
        
        logger.warn(`Operation failed on attempt ${attempt}, retrying in ${delay}ms`, {
          operation: operation.name || 'anonymous',
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          error: error.message,
          delay
        });

        if (finalConfig.onRetry) {
          finalConfig.onRetry(attempt, error);
        }

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute a function with retry logic and return both result and metadata
   */
  static async executeWithMetadata<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<{ result: T; attempts: number; totalTimeMs: number }> {
    const startTime = Date.now();
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any;
    let attempts = 0;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      attempts = attempt;
      
      try {
        const result = await operation();
        const totalTimeMs = Date.now() - startTime;
        
        return { result, attempts, totalTimeMs };
      } catch (error: any) {
        lastError = error;
        
        if (attempt === finalConfig.maxAttempts || !this.shouldRetry(error, finalConfig)) {
          break;
        }

        const delay = this.calculateDelay(attempt, finalConfig);
        await this.sleep(delay);
      }
    }

    const totalTimeMs = Date.now() - startTime;
    throw { ...lastError, attempts, totalTimeMs };
  }

  /**
   * Check if an error should trigger a retry
   */
  private static shouldRetry(error: any, config: RetryConfig): boolean {
    if (!config.retryCondition) {
      return true;
    }
    return config.retryCondition(error);
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    
    if (config.jitter) {
      // Add jitter to prevent thundering herd
      const jitterAmount = cappedDelay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      return Math.max(0, cappedDelay + jitter);
    }
    
    return cappedDelay;
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create retry configuration for specific service types
   */
  static createServiceConfig(serviceType: 'api' | 'database' | 'storage' | 'ai'): RetryConfig {
    const baseConfig = { ...DEFAULT_RETRY_CONFIG };

    switch (serviceType) {
      case 'api':
        return {
          ...baseConfig,
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 5000,
          retryCondition: (error) => {
            return error.status >= 500 || error.status === 429 || error.code === 'ECONNRESET';
          }
        };
      
      case 'database':
        return {
          ...baseConfig,
          maxAttempts: 5,
          baseDelayMs: 500,
          maxDelayMs: 3000,
          retryCondition: (error) => {
            return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('connection');
          }
        };
      
      case 'storage':
        return {
          ...baseConfig,
          maxAttempts: 4,
          baseDelayMs: 2000,
          maxDelayMs: 8000,
          retryCondition: (error) => {
            return error.status >= 500 || error.code === 'ECONNRESET' || error.message?.includes('timeout');
          }
        };
      
      case 'ai':
        return {
          ...baseConfig,
          maxAttempts: 2, // AI services are expensive, retry less
          baseDelayMs: 3000,
          maxDelayMs: 10000,
          retryCondition: (error) => {
            return error.status >= 500 || error.status === 429;
          }
        };
      
      default:
        return baseConfig;
    }
  }
}

/**
 * Decorator for adding retry logic to methods
 */
export function withRetry(config: Partial<RetryConfig> = {}) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return RetryUtil.execute(
        () => method.apply(this, args),
        config
      );
    };
  };
}

/**
 * Utility function for retrying async operations
 */
export async function retry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  return RetryUtil.execute(operation, config);
}

/**
 * Utility function for retrying with metadata
 */
export async function retryWithMetadata<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<{ result: T; attempts: number; totalTimeMs: number }> {
  return RetryUtil.executeWithMetadata(operation, config);
}
