import { logger } from './logger';

/**
 * Common error handling patterns for services
 */

export interface ServiceErrorContext {
  service: string;
  operation: string;
  data?: Record<string, any>;
  originalError?: Error;
  attempt?: number;
  fallback?: boolean;
  maxRetries?: number;
}

/**
 * Handle service errors with consistent logging and error transformation
 */
export class ServiceErrorHandler {
  /**
   * Handle async operation with error handling
   */
  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    context: ServiceErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, context);
      throw this.transformError(error, context);
    }
  }

  /**
   * Handle sync operation with error handling
   */
  static handleSyncOperation<T>(
    operation: () => T,
    context: ServiceErrorContext
  ): T {
    try {
      return operation();
    } catch (error) {
      this.logError(error, context);
      throw this.transformError(error, context);
    }
  }

  /**
   * Handle operation with retry logic
   */
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    context: ServiceErrorContext,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          this.logError(error, { ...context, attempt, maxRetries });
          throw this.transformError(error, context);
        }
        
        logger.warn(`${context.service}: ${context.operation} failed (attempt ${attempt}/${maxRetries}), retrying...`, {
          service: context.service,
          operation: context.operation,
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await this.delay(retryDelay * attempt);
      }
    }
    
    throw lastError!;
  }

  /**
   * Handle operation with fallback
   */
  static async handleWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ServiceErrorContext
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      logger.warn(`${context.service}: ${context.operation} primary failed, trying fallback`, {
        service: context.service,
        operation: context.operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        this.logError(fallbackError, { ...context, fallback: true });
        throw this.transformError(fallbackError, context);
      }
    }
  }

  /**
   * Log error with consistent format
   */
  private static logError(error: unknown, context: ServiceErrorContext): void {
    logger.error(`${context.service}: ${context.operation} failed`, {
      service: context.service,
      operation: context.operation,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ...context.data
    });
  }

  /**
   * Transform error to consistent format
   */
  private static transformError(error: unknown, context: ServiceErrorContext): Error {
    if (error instanceof Error) {
      return new Error(`${context.service}: ${context.operation} failed - ${error.message}`);
    }
    
    return new Error(`${context.service}: ${context.operation} failed - Unknown error`);
  }

  /**
   * Delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Decorator for automatic error handling
 */
export function withErrorHandling(context: Omit<ServiceErrorContext, 'operation'>) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const operationContext = {
        ...context,
        operation: _propertyName,
        data: { args: args.length }
      };
      
      return ServiceErrorHandler.handleAsyncOperation(
        () => method.apply(this, args),
        operationContext
      );
    };
  };
}

/**
 * Common error types for services
 */
export enum ServiceErrorType {
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Create standardized service error
 */
export function createServiceError(
  message: string,
  type: ServiceErrorType,
  context: ServiceErrorContext,
  originalError?: Error
): Error {
  const error = new Error(`${context.service}: ${message}`);
  (error as any).type = type;
  (error as any).context = context;
  (error as any).originalError = originalError;
  
  return error;
}
