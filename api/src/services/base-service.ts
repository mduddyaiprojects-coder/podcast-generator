import { logger } from '../utils/logger';

/**
 * Base service class with common functionality
 */
export abstract class BaseService {
  protected serviceName: string;
  protected isHealthy: boolean = true;
  protected config: Record<string, any> = {};

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.initializeConfig();
  }

  /**
   * Initialize service configuration
   * Override in subclasses to set specific config
   */
  protected abstract initializeConfig(): void;

  /**
   * Get environment variable with default value
   */
  protected getEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Get environment variable as number with default value
   */
  protected getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * Get environment variable as boolean with default value
   */
  protected getBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    return value ? value.toLowerCase() === 'true' : defaultValue;
  }

  /**
   * Log service operation with consistent format
   */
  protected logOperation(operation: string, data: Record<string, any> = {}): void {
    logger.info(`${this.serviceName}: ${operation}`, {
      service: this.serviceName,
      operation,
      ...data
    });
  }

  /**
   * Log service error with consistent format
   */
  protected logError(operation: string, error: unknown, data: Record<string, any> = {}): void {
    logger.error(`${this.serviceName}: ${operation} failed`, {
      service: this.serviceName,
      operation,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...data
    });
  }

  /**
   * Log service warning with consistent format
   */
  protected logWarning(operation: string, message: string, data: Record<string, any> = {}): void {
    logger.warn(`${this.serviceName}: ${operation} - ${message}`, {
      service: this.serviceName,
      operation,
      message,
      ...data
    });
  }

  /**
   * Execute operation with error handling and logging
   */
  protected async executeWithErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    data: Record<string, any> = {}
  ): Promise<T> {
    try {
      this.logOperation(operation, data);
      const result = await fn();
      this.logOperation(`${operation} completed`, { ...data, success: true });
      return result;
    } catch (error) {
      this.logError(operation, error, data);
      throw error;
    }
  }

  /**
   * Execute operation with fallback
   */
  protected async executeWithFallback<T>(
    operation: string,
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    data: Record<string, any> = {}
  ): Promise<T> {
    try {
      return await this.executeWithErrorHandling(operation, primaryFn, data);
    } catch (error) {
      this.logWarning(operation, 'Primary operation failed, trying fallback', data);
      try {
        return await this.executeWithErrorHandling(`${operation} (fallback)`, fallbackFn, data);
      } catch (fallbackError) {
        this.logError(`${operation} (fallback)`, fallbackError, data);
        throw fallbackError;
      }
    }
  }

  /**
   * Check if service is healthy
   */
  isServiceHealthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Set service health status
   */
  protected setHealthStatus(healthy: boolean, reason?: string): void {
    this.isHealthy = healthy;
    if (!healthy && reason) {
      this.logWarning('health check', `Service marked as unhealthy: ${reason}`);
    } else if (healthy && reason) {
      this.logOperation('health check', { message: `Service marked as healthy: ${reason}` });
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Validate required configuration
   */
  protected validateRequiredConfig(requiredKeys: string[]): void {
    const missing = requiredKeys.filter(key => !this.config[key]);
    if (missing.length > 0) {
      const message = `Missing required configuration: ${missing.join(', ')}`;
      this.logWarning('configuration', message);
      this.setHealthStatus(false, message);
    }
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.serviceName;
  }
}
