import { logger } from './logger';
import { ServiceError, ErrorType, ErrorSeverity } from './error-handling';

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  defaultTimeoutMs: number;
  serviceTimeouts: Record<string, number>;
  maxTimeoutMs: number;
  minTimeoutMs: number;
}

/**
 * Default timeout configuration
 */
export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  defaultTimeoutMs: 30000, // 30 seconds
  maxTimeoutMs: 300000,    // 5 minutes
  minTimeoutMs: 1000,      // 1 second
  serviceTimeouts: {
    'azure-openai': 60000,     // 1 minute for AI operations
    'elevenlabs': 120000,      // 2 minutes for TTS generation
    'firecrawl': 45000,        // 45 seconds for web scraping
    'youtube': 15000,          // 15 seconds for API calls
    'whisper': 180000,         // 3 minutes for audio transcription
    'database': 10000,         // 10 seconds for database operations
    'storage': 30000           // 30 seconds for storage operations
  }
};

/**
 * Timeout manager for external service calls
 */
export class TimeoutManager {
  private config: TimeoutConfig;

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = { ...DEFAULT_TIMEOUT_CONFIG, ...config };
  }

  /**
   * Execute an operation with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    service: string,
    customTimeoutMs?: number
  ): Promise<T> {
    const timeoutMs = this.getTimeoutForService(service, customTimeoutMs);
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new ServiceError(
          `Operation timed out after ${timeoutMs}ms`,
          ErrorType.TIMEOUT_ERROR,
          ErrorSeverity.MEDIUM,
          service,
          { 
            context: { 
              timeoutMs, 
              service,
              operation: operation.name || 'anonymous'
            },
            retryable: true
          }
        );
        
        logger.warn(`Operation timed out for ${service}`, {
          service,
          timeoutMs,
          operation: operation.name || 'anonymous'
        });
        
        reject(error);
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute multiple operations with individual timeouts
   */
  async executeWithTimeouts<T>(
    operations: Array<{
      operation: () => Promise<T>;
      service: string;
      timeoutMs?: number;
    }>
  ): Promise<Array<{ result: T; service: string; duration: number }>> {
    const startTime = Date.now();
    const promises = operations.map(async ({ operation, service, timeoutMs }) => {
      const operationStart = Date.now();
      try {
        const result = await this.executeWithTimeout(operation, service, timeoutMs);
        const duration = Date.now() - operationStart;
        return { result, service, duration };
      } catch (error) {
        const duration = Date.now() - operationStart;
        logger.error(`Operation failed for ${service}`, {
          service,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw { error, service, duration };
      }
    });

    try {
      const results = await Promise.allSettled(promises);
      const totalDuration = Date.now() - startTime;
      
      logger.info(`Batch operations completed`, {
        totalOperations: operations.length,
        totalDuration,
        results: results.map((result, index) => ({
          service: operations[index]!.service,
          status: result.status,
          duration: result.status === 'fulfilled' ? (result as any).value.duration : 'failed'
        }))
      });

      return results
        .filter((result) => result.status === 'fulfilled')
        .map(result => (result as any).value);
    } catch (error) {
      logger.error('Batch operations failed', { error });
      throw error;
    }
  }

  /**
   * Get timeout for a specific service
   */
  getTimeoutForService(service: string, customTimeoutMs?: number): number {
    if (customTimeoutMs !== undefined) {
      return this.clampTimeout(customTimeoutMs);
    }

    const serviceTimeout = this.config.serviceTimeouts[service];
    if (serviceTimeout !== undefined) {
      return this.clampTimeout(serviceTimeout);
    }

    return this.clampTimeout(this.config.defaultTimeoutMs);
  }

  /**
   * Clamp timeout value within allowed range
   */
  private clampTimeout(timeoutMs: number): number {
    return Math.max(
      this.config.minTimeoutMs,
      Math.min(timeoutMs, this.config.maxTimeoutMs)
    );
  }

  /**
   * Update timeout configuration
   */
  updateConfig(updates: Partial<TimeoutConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Timeout configuration updated', { updates });
  }

  /**
   * Get current timeout configuration
   */
  getConfig(): TimeoutConfig {
    return { ...this.config };
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  createTimeoutPromise(timeoutMs: number, service: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ServiceError(
          `Timeout after ${timeoutMs}ms`,
          ErrorType.TIMEOUT_ERROR,
          ErrorSeverity.MEDIUM,
          service,
          { context: { timeoutMs, service }, retryable: true }
        ));
      }, timeoutMs);
    });
  }

  /**
   * Race an operation against a timeout
   */
  async raceWithTimeout<T>(
    operation: () => Promise<T>,
    service: string,
    timeoutMs?: number
  ): Promise<T> {
    const actualTimeout = this.getTimeoutForService(service, timeoutMs);
    const timeoutPromise = this.createTimeoutPromise(actualTimeout, service);
    
    return Promise.race([operation(), timeoutPromise]);
  }
}

// Export singleton instance
export const timeoutManager = new TimeoutManager();

/**
 * Decorator for adding timeout to methods
 */
export function withTimeoutDecorator(timeoutMs: number, service: string) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return timeoutManager.executeWithTimeout(
        () => method.apply(this, args),
        service,
        timeoutMs
      );
    };
  };
}

/**
 * Utility function for executing with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  service: string,
  timeoutMs?: number
): Promise<T> {
  return timeoutManager.executeWithTimeout(operation, service, timeoutMs);
}
