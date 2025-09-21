import { logger } from './logger';

/**
 * Error types for different failure scenarios
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Custom error class with additional context
 */
export class ServiceError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly service: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public cause?: Error;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity,
    service: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      context?: Record<string, any>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
    this.severity = severity;
    this.service = service;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? this.isRetryableByType(type);
    this.context = options.context || {};
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Determine if error is retryable based on type
   */
  private isRetryableByType(type: ErrorType): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.EXTERNAL_SERVICE_ERROR
    ];
    return retryableTypes.includes(type);
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      service: this.service,
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause
    };
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  /**
   * Classify an error and create appropriate ServiceError
   */
  static classifyError(error: any, service: string): ServiceError {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new ServiceError(
        `Network error: ${error.message}`,
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM,
        service,
        { cause: error, retryable: true }
      );
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new ServiceError(
        `Timeout error: ${error.message}`,
        ErrorType.TIMEOUT_ERROR,
        ErrorSeverity.MEDIUM,
        service,
        { cause: error, retryable: true }
      );
    }

    // HTTP status code errors
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      
      switch (statusCode) {
        case 401:
          return new ServiceError(
            `Authentication failed: ${error.message}`,
            ErrorType.AUTHENTICATION_ERROR,
            ErrorSeverity.HIGH,
            service,
            { statusCode, cause: error, retryable: false }
          );
        
        case 403:
          return new ServiceError(
            `Authorization failed: ${error.message}`,
            ErrorType.AUTHORIZATION_ERROR,
            ErrorSeverity.HIGH,
            service,
            { statusCode, cause: error, retryable: false }
          );
        
        case 429:
          return new ServiceError(
            `Rate limit exceeded: ${error.message}`,
            ErrorType.RATE_LIMIT_ERROR,
            ErrorSeverity.MEDIUM,
            service,
            { statusCode, cause: error, retryable: true }
          );
        
        case 503:
        case 502:
        case 504:
          return new ServiceError(
            `Service unavailable: ${error.message}`,
            ErrorType.SERVICE_UNAVAILABLE,
            ErrorSeverity.HIGH,
            service,
            { statusCode, cause: error, retryable: true }
          );
        
        case 400:
          return new ServiceError(
            `Validation error: ${error.message}`,
            ErrorType.VALIDATION_ERROR,
            ErrorSeverity.MEDIUM,
            service,
            { statusCode, cause: error, retryable: false }
          );
        
        default:
          if (statusCode >= 500) {
            return new ServiceError(
              `Server error: ${error.message}`,
              ErrorType.EXTERNAL_SERVICE_ERROR,
              ErrorSeverity.HIGH,
              service,
              { statusCode, cause: error, retryable: true }
            );
          }
      }
    }

    // Configuration errors
    if (error.message?.includes('not configured') || error.message?.includes('missing')) {
      return new ServiceError(
        `Configuration error: ${error.message}`,
        ErrorType.CONFIGURATION_ERROR,
        ErrorSeverity.CRITICAL,
        service,
        { cause: error, retryable: false }
      );
    }

    // Default to unknown error
    return new ServiceError(
      `Unknown error: ${error.message || 'Unknown error occurred'}`,
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.MEDIUM,
      service,
      { cause: error, retryable: false }
    );
  }

  /**
   * Handle and log an error appropriately
   */
  static handleError(error: any, service: string, context: Record<string, any> = {}): ServiceError {
    const serviceError = this.classifyError(error, service);
    
    // Add context to the error (create new object since context is readonly)
    Object.assign(serviceError.context, context);

    // Log based on severity
    switch (serviceError.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`Critical error in ${service}`, serviceError.toJSON());
        break;
      case ErrorSeverity.HIGH:
        logger.error(`High severity error in ${service}`, serviceError.toJSON());
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`Medium severity error in ${service}`, serviceError.toJSON());
        break;
      case ErrorSeverity.LOW:
        logger.info(`Low severity error in ${service}`, serviceError.toJSON());
        break;
    }

    return serviceError;
  }

  /**
   * Create a standardized error response for API endpoints
   */
  static createErrorResponse(error: ServiceError): {
    error: string;
    type: ErrorType;
    severity: ErrorSeverity;
    service: string;
    message: string;
    retryable: boolean;
    timestamp: string;
    context?: Record<string, any>;
  } {
    return {
      error: error.type,
      type: error.type,
      severity: error.severity,
      service: error.service,
      message: error.message,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
      context: Object.keys(error.context).length > 0 ? error.context : undefined
    };
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: any): boolean {
    if (error instanceof ServiceError) {
      return error.retryable;
    }
    
    // Check common retryable error patterns
    const retryablePatterns = [
      'timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'rate limit',
      'service unavailable',
      'temporary'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Get appropriate HTTP status code for error
   */
  static getHttpStatusCode(error: ServiceError): number {
    if (error.statusCode) {
      return error.statusCode;
    }

    switch (error.type) {
      case ErrorType.AUTHENTICATION_ERROR:
        return 401;
      case ErrorType.AUTHORIZATION_ERROR:
        return 403;
      case ErrorType.VALIDATION_ERROR:
        return 400;
      case ErrorType.RATE_LIMIT_ERROR:
        return 429;
      case ErrorType.SERVICE_UNAVAILABLE:
        return 503;
      case ErrorType.CONFIGURATION_ERROR:
        return 500;
      case ErrorType.INTERNAL_ERROR:
        return 500;
      default:
        return 500;
    }
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  /**
   * Attempt to recover from an error using fallback strategies
   */
  static async attemptRecovery<T>(
    error: ServiceError,
    fallbackStrategies: Array<() => Promise<T>>,
    context: Record<string, any> = {}
  ): Promise<T> {
    logger.info(`Attempting error recovery for ${error.service}`, {
      errorType: error.type,
      severity: error.severity,
      fallbackStrategies: fallbackStrategies.length,
      context
    });

    for (let i = 0; i < fallbackStrategies.length; i++) {
      try {
        const result = await fallbackStrategies[i]!();
        logger.info(`Error recovery successful using strategy ${i + 1}`, {
          service: error.service,
          strategy: i + 1,
          totalStrategies: fallbackStrategies.length
        });
        return result;
      } catch (fallbackError) {
        logger.warn(`Fallback strategy ${i + 1} failed`, {
          service: error.service,
          strategy: i + 1,
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
      }
    }

    throw new ServiceError(
      `All recovery strategies failed for ${error.service}`,
      ErrorType.INTERNAL_ERROR,
      ErrorSeverity.CRITICAL,
      error.service,
      { context: { ...error.context, ...context } }
    );
  }

  /**
   * Create fallback response for service failures
   */
  static createFallbackResponse(service: string, operation: string): any {
    const fallbacks: Record<string, Record<string, any>> = {
      'azure-openai': {
        generateSummary: () => ({ text: 'Summary generation temporarily unavailable' }),
        generatePodcastScript: () => ({ text: 'Podcast script generation temporarily unavailable' })
      },
      'elevenlabs': {
        generateSpeech: () => ({ message: 'TTS generation temporarily unavailable' }),
        generateAudio: () => ({ message: 'Audio generation temporarily unavailable' })
      },
      'firecrawl': {
        extractContent: () => ({ title: 'Content extraction temporarily unavailable', content: '' })
      },
      'youtube': {
        getVideoMetadata: () => ({ title: 'Video metadata temporarily unavailable' })
      },
      'whisper': {
        transcribeAudio: () => ({ text: 'Transcription temporarily unavailable' })
      }
    };

    const serviceFallbacks = fallbacks[service];
    if (serviceFallbacks && serviceFallbacks[operation]) {
      return serviceFallbacks[operation]();
    }

    return { message: `${service} ${operation} temporarily unavailable` };
  }
}
