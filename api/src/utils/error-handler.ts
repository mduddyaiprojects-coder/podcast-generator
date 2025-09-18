import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { logger } from './logger';

/**
 * Error Handling Middleware for Azure Functions
 * 
 * Provides standardized error handling, logging, and response formatting
 * for consistent error management across all API endpoints.
 */

export interface ErrorDetails {
  code: string;
  message: string;
  details?: string;
  field?: string;
  timestamp?: string;
  requestId?: string;
  stack?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
  timestamp: string;
  request_id?: string;
  validation_errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export interface ErrorHandlerConfig {
  includeStack?: boolean;
  logErrors?: boolean;
  sanitizeErrors?: boolean;
  requestIdHeader?: string;
}

/**
 * Error types and their corresponding HTTP status codes
 */
export enum ErrorType {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  
  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_GATEWAY = 'BAD_GATEWAY',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  
  // Custom Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR'
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  private static readonly DEFAULT_CONFIG: ErrorHandlerConfig = {
    includeStack: false,
    logErrors: true,
    sanitizeErrors: true,
    requestIdHeader: 'x-request-id'
  };

  /**
   * Handle errors and return standardized error responses
   */
  static handleError(
    error: Error | unknown,
    request: HttpRequest,
    context: InvocationContext,
    config: ErrorHandlerConfig = {}
  ): HttpResponseInit {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
    const requestId = this.getRequestId(request, mergedConfig.requestIdHeader!);
    
    // Determine error type and status code
    const errorInfo = this.categorizeError(error);
    
    // Log error if configured
    if (mergedConfig.logErrors) {
      this.logError(error, errorInfo, request, context, requestId);
    }
    
    // Create error response
    const errorResponse = this.createErrorResponse(errorInfo, requestId, mergedConfig);
    
    return {
      status: errorInfo.status,
      jsonBody: errorResponse
    };
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    errorType: ErrorType,
    message: string,
    status: number,
    details?: string,
    requestId?: string,
    validationErrors?: Array<{ field: string; message: string; code: string }>
  ): HttpResponseInit {
    const errorResponse: ErrorResponse = {
      error: errorType,
      message,
      timestamp: new Date().toISOString(),
      ...(requestId && { request_id: requestId }),
      ...(details && { details }),
      ...(validationErrors && { validation_errors: validationErrors })
    };

    return {
      status,
      jsonBody: errorResponse
    };
  }

  /**
   * Create validation error response
   */
  static createValidationErrorResponse(
    errors: Array<{ field: string; message: string; code: string }>,
    requestId?: string
  ): HttpResponseInit {
    return this.createErrorResponse(
      ErrorType.VALIDATION_ERROR,
      'Request validation failed',
      400,
      'One or more fields contain invalid values',
      requestId,
      errors
    );
  }

  /**
   * Create not found error response
   */
  static createNotFoundErrorResponse(
    resource: string,
    identifier?: string,
    requestId?: string
  ): HttpResponseInit {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    return this.createErrorResponse(
      ErrorType.NOT_FOUND,
      message,
      404,
      `The requested ${resource.toLowerCase()} does not exist`,
      requestId
    );
  }

  /**
   * Create rate limit error response
   */
  static createRateLimitErrorResponse(
    limit: string,
    retryAfter?: number,
    requestId?: string
  ): HttpResponseInit {
    const response = this.createErrorResponse(
      ErrorType.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      429,
      `Maximum ${limit} requests allowed`,
      requestId
    );

    if (retryAfter) {
      response.headers = {
        'Retry-After': retryAfter.toString()
      };
    }

    return response;
  }

  /**
   * Create internal server error response
   */
  static createInternalErrorResponse(
    message: string = 'An internal error occurred',
    details?: string,
    requestId?: string
  ): HttpResponseInit {
    return this.createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      message,
      500,
      details || 'Please try again later',
      requestId
    );
  }

  /**
   * Create service unavailable error response
   */
  static createServiceUnavailableErrorResponse(
    service: string,
    retryAfter?: number,
    requestId?: string
  ): HttpResponseInit {
    const response = this.createErrorResponse(
      ErrorType.SERVICE_UNAVAILABLE,
      'Service temporarily unavailable',
      503,
      `${service} is currently unavailable`,
      requestId
    );

    if (retryAfter) {
      response.headers = {
        'Retry-After': retryAfter.toString()
      };
    }

    return response;
  }

  /**
   * Categorize error and determine appropriate response
   */
  private static categorizeError(error: Error | unknown): {
    type: ErrorType;
    status: number;
    message: string;
    details?: string;
  } {
    if (error instanceof ValidationError) {
      return {
        type: ErrorType.VALIDATION_ERROR,
        status: 400,
        message: 'Request validation failed',
        details: error.message
      };
    }

    if (error instanceof NotFoundError) {
      return {
        type: ErrorType.NOT_FOUND,
        status: 404,
        message: error.message,
        details: error.details
      };
    }

    if (error instanceof UnauthorizedError) {
      return {
        type: ErrorType.UNAUTHORIZED,
        status: 401,
        message: error.message,
        details: error.details
      };
    }

    if (error instanceof ForbiddenError) {
      return {
        type: ErrorType.FORBIDDEN,
        status: 403,
        message: error.message,
        details: error.details
      };
    }

    if (error instanceof RateLimitError) {
      return {
        type: ErrorType.RATE_LIMIT_EXCEEDED,
        status: 429,
        message: error.message,
        details: error.details
      };
    }

    if (error instanceof DatabaseError) {
      return {
        type: ErrorType.DATABASE_ERROR,
        status: 500,
        message: 'Database operation failed',
        details: error.message
      };
    }

    if (error instanceof StorageError) {
      return {
        type: ErrorType.STORAGE_ERROR,
        status: 500,
        message: 'Storage operation failed',
        details: error.message
      };
    }

    if (error instanceof ExternalServiceError) {
      return {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        status: 502,
        message: 'External service error',
        details: error.message
      };
    }

    if (error instanceof ProcessingError) {
      return {
        type: ErrorType.PROCESSING_ERROR,
        status: 500,
        message: 'Content processing failed',
        details: error.message
      };
    }

    // Generic error handling
    if (error instanceof Error) {
      return {
        type: ErrorType.INTERNAL_ERROR,
        status: 500,
        message: 'An internal error occurred',
        details: error.message
      };
    }

    return {
      type: ErrorType.INTERNAL_ERROR,
      status: 500,
      message: 'An unknown error occurred',
      details: 'Please try again later'
    };
  }

  /**
   * Create error response object
   */
  private static createErrorResponse(
    errorInfo: { type: ErrorType; status: number; message: string; details?: string },
    requestId: string | undefined,
    config: ErrorHandlerConfig
  ): ErrorResponse {
    const response: ErrorResponse = {
      error: errorInfo.type,
      message: errorInfo.message,
      timestamp: new Date().toISOString(),
      ...(requestId && { request_id: requestId }),
      ...(errorInfo.details && { details: errorInfo.details })
    };

    return response;
  }

  /**
   * Log error with appropriate level
   */
  private static logError(
    error: Error | unknown,
    errorInfo: { type: ErrorType; status: number; message: string; details?: string },
    request: HttpRequest,
    context: InvocationContext,
    requestId: string | undefined
  ): void {
    const logData = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      errorType: errorInfo.type,
      status: errorInfo.status,
      message: errorInfo.message,
      details: errorInfo.details,
      stack: error instanceof Error ? error.stack : undefined
    };

    if (errorInfo.status >= 500) {
      logger.error('Server error occurred:', logData);
    } else if (errorInfo.status >= 400) {
      logger.warn('Client error occurred:', logData);
    } else {
      logger.info('Error occurred:', logData);
    }
  }

  /**
   * Extract request ID from headers
   */
  private static getRequestId(request: HttpRequest, headerName: string): string | undefined {
    return request.headers.get(headerName) || undefined;
  }
}

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public code?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public details?: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class StorageError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service?: string) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string, public step?: string) {
    super(message);
    this.name = 'ProcessingError';
  }
}

/**
 * Higher-order function to wrap Azure Functions with error handling
 */
export function withErrorHandling(config: ErrorHandlerConfig = {}) {
  return function<T extends (...args: any[]) => Promise<HttpResponseInit>>(
    handler: T
  ): T {
    return (async (request: HttpRequest, context: InvocationContext) => {
      try {
        return await handler(request, context);
      } catch (error) {
        return ErrorHandler.handleError(error, request, context, config);
      }
    }) as T;
  };
}

/**
 * Utility functions for common error scenarios
 */
export class ErrorUtils {
  /**
   * Check if error is a known error type
   */
  static isKnownError(error: unknown): boolean {
    return error instanceof ValidationError ||
           error instanceof NotFoundError ||
           error instanceof UnauthorizedError ||
           error instanceof ForbiddenError ||
           error instanceof RateLimitError ||
           error instanceof DatabaseError ||
           error instanceof StorageError ||
           error instanceof ExternalServiceError ||
           error instanceof ProcessingError;
  }

  /**
   * Extract error message safely
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  }

  /**
   * Extract error stack safely
   */
  static getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * Create error from HTTP status code
   */
  static createErrorFromStatus(status: number, message?: string): Error {
    switch (status) {
      case 400:
        return new ValidationError(message || 'Bad request');
      case 401:
        return new UnauthorizedError(message || 'Unauthorized');
      case 403:
        return new ForbiddenError(message || 'Forbidden');
      case 404:
        return new NotFoundError(message || 'Not found');
      case 429:
        return new RateLimitError(message || 'Rate limit exceeded');
      case 500:
        return new Error(message || 'Internal server error');
      case 503:
        return new Error(message || 'Service unavailable');
      default:
        return new Error(message || 'Unknown error');
    }
  }
}
