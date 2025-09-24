import { HttpRequest, InvocationContext } from '@azure/functions';
import {
  ErrorHandler,
  ErrorType,
  ErrorHandlerConfig,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  DatabaseError,
  StorageError,
  ExternalServiceError,
  ProcessingError,
  ErrorUtils,
  withErrorHandling
} from '../../src/utils/error-handler';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

describe('ErrorHandler', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: 'https://example.com/test',
      headers: {
        get: jest.fn().mockReturnValue('test-request-id')
      }
    } as any;

    mockContext = {
      invocationId: 'test-invocation-id',
      functionName: 'test-function',
      log: jest.fn()
    } as any;
  });

  describe('handleError', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', 'field1', 'INVALID_VALUE');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 400,
        jsonBody: {
          error: ErrorType.VALIDATION_ERROR,
          message: 'Request validation failed',
          details: 'Invalid input',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('Resource not found', 'Additional details');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 404,
        jsonBody: {
          error: ErrorType.NOT_FOUND,
          message: 'Resource not found',
          details: 'Additional details',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle UnauthorizedError correctly', () => {
      const error = new UnauthorizedError('Access denied', 'Invalid token');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 401,
        jsonBody: {
          error: ErrorType.UNAUTHORIZED,
          message: 'Access denied',
          details: 'Invalid token',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle ForbiddenError correctly', () => {
      const error = new ForbiddenError('Forbidden access', 'Insufficient permissions');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 403,
        jsonBody: {
          error: ErrorType.FORBIDDEN,
          message: 'Forbidden access',
          details: 'Insufficient permissions',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle RateLimitError correctly', () => {
      const error = new RateLimitError('Too many requests', 'Rate limit exceeded', 60);
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 429,
        jsonBody: {
          error: ErrorType.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests',
          details: 'Rate limit exceeded',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle DatabaseError correctly', () => {
      const error = new DatabaseError('Connection failed', 'connect');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 500,
        jsonBody: {
          error: ErrorType.DATABASE_ERROR,
          message: 'Database operation failed',
          details: 'Connection failed',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle StorageError correctly', () => {
      const error = new StorageError('Upload failed', 'upload');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 500,
        jsonBody: {
          error: ErrorType.STORAGE_ERROR,
          message: 'Storage operation failed',
          details: 'Upload failed',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle ExternalServiceError correctly', () => {
      const error = new ExternalServiceError('API call failed', 'payment-service');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 502,
        jsonBody: {
          error: ErrorType.EXTERNAL_SERVICE_ERROR,
          message: 'External service error',
          details: 'API call failed',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle ProcessingError correctly', () => {
      const error = new ProcessingError('Content processing failed', 'transcription');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 500,
        jsonBody: {
          error: ErrorType.PROCESSING_ERROR,
          message: 'Content processing failed',
          details: 'Content processing failed',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Something went wrong');
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 500,
        jsonBody: {
          error: ErrorType.INTERNAL_ERROR,
          message: 'An internal error occurred',
          details: 'Something went wrong',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should handle unknown error correctly', () => {
      const error = 'String error';
      const response = ErrorHandler.handleError(error, mockRequest, mockContext);

      expect(response).toEqual({
        status: 500,
        jsonBody: {
          error: ErrorType.INTERNAL_ERROR,
          message: 'An unknown error occurred',
          details: 'Please try again later',
          timestamp: expect.any(String),
          request_id: 'test-request-id'
        }
      });
    });

    it('should use custom config', () => {
      const error = new Error('Test error');
      const config: ErrorHandlerConfig = {
        includeStack: true,
        logErrors: false,
        requestIdHeader: 'x-custom-id'
      };

      (mockRequest.headers as any).get = jest.fn().mockReturnValue('custom-request-id');

      const response = ErrorHandler.handleError(error, mockRequest, mockContext, config);

      expect(response).toEqual({
        status: 500,
        jsonBody: {
          error: ErrorType.INTERNAL_ERROR,
          message: 'An internal error occurred',
          details: 'Test error',
          timestamp: expect.any(String),
          request_id: 'custom-request-id'
        }
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create basic error response', () => {
      const response = ErrorHandler.createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        'Invalid input',
        400,
        'Field validation failed',
        'req-123'
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: ErrorType.VALIDATION_ERROR,
        message: 'Invalid input',
        details: 'Field validation failed',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });

    it('should create error response with validation errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' },
        { field: 'password', message: 'Password too short', code: 'PASSWORD_TOO_SHORT' }
      ];

      const response = ErrorHandler.createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        'Validation failed',
        400,
        'Multiple validation errors',
        'req-123',
        validationErrors
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: ErrorType.VALIDATION_ERROR,
        message: 'Validation failed',
        details: 'Multiple validation errors',
        timestamp: expect.any(String),
        request_id: 'req-123',
        validation_errors: validationErrors
      });
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error response', () => {
      const errors = [
        { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }
      ];

      const response = ErrorHandler.createValidationErrorResponse(errors, 'req-123');

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: ErrorType.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: 'One or more fields contain invalid values',
        timestamp: expect.any(String),
        request_id: 'req-123',
        validation_errors: errors
      });
    });
  });

  describe('createNotFoundErrorResponse', () => {
    it('should create not found error response with identifier', () => {
      const response = ErrorHandler.createNotFoundErrorResponse('User', '123', 'req-123');

      expect(response.status).toBe(404);
      expect(response.jsonBody).toEqual({
        error: ErrorType.NOT_FOUND,
        message: "User with identifier '123' not found",
        details: 'The requested user does not exist',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });

    it('should create not found error response without identifier', () => {
      const response = ErrorHandler.createNotFoundErrorResponse('Resource', undefined, 'req-123');

      expect(response.status).toBe(404);
      expect(response.jsonBody).toEqual({
        error: ErrorType.NOT_FOUND,
        message: 'Resource not found',
        details: 'The requested resource does not exist',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });
  });

  describe('createRateLimitErrorResponse', () => {
    it('should create rate limit error response without retry after', () => {
      const response = ErrorHandler.createRateLimitErrorResponse('100 requests per hour', undefined, 'req-123');

      expect(response.status).toBe(429);
      expect(response.jsonBody).toEqual({
        error: ErrorType.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        details: 'Maximum 100 requests per hour requests allowed',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });

    it('should create rate limit error response with retry after', () => {
      const response = ErrorHandler.createRateLimitErrorResponse('100 requests per hour', 300, 'req-123');

      expect(response.status).toBe(429);
      expect(response.headers).toEqual({
        'Retry-After': '300'
      });
      expect(response.jsonBody).toEqual({
        error: ErrorType.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        details: 'Maximum 100 requests per hour requests allowed',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });
  });

  describe('createInternalErrorResponse', () => {
    it('should create internal error response with default message', () => {
      const response = ErrorHandler.createInternalErrorResponse();

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        error: ErrorType.INTERNAL_ERROR,
        message: 'An internal error occurred',
        details: 'Please try again later',
        timestamp: expect.any(String)
      });
    });

    it('should create internal error response with custom message and details', () => {
      const response = ErrorHandler.createInternalErrorResponse('Database connection failed', 'Connection timeout', 'req-123');

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        error: ErrorType.INTERNAL_ERROR,
        message: 'Database connection failed',
        details: 'Connection timeout',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });
  });

  describe('createServiceUnavailableErrorResponse', () => {
    it('should create service unavailable error response without retry after', () => {
      const response = ErrorHandler.createServiceUnavailableErrorResponse('payment-service', undefined, 'req-123');

      expect(response.status).toBe(503);
      expect(response.jsonBody).toEqual({
        error: ErrorType.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        details: 'payment-service is currently unavailable',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });

    it('should create service unavailable error response with retry after', () => {
      const response = ErrorHandler.createServiceUnavailableErrorResponse('payment-service', 60, 'req-123');

      expect(response.status).toBe(503);
      expect(response.headers).toEqual({
        'Retry-After': '60'
      });
      expect(response.jsonBody).toEqual({
        error: ErrorType.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        details: 'payment-service is currently unavailable',
        timestamp: expect.any(String),
        request_id: 'req-123'
      });
    });
  });
});

describe('ErrorUtils', () => {
  describe('isKnownError', () => {
    it('should return true for known error types', () => {
      expect(ErrorUtils.isKnownError(new ValidationError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new NotFoundError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new UnauthorizedError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new ForbiddenError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new RateLimitError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new DatabaseError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new StorageError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new ExternalServiceError('test'))).toBe(true);
      expect(ErrorUtils.isKnownError(new ProcessingError('test'))).toBe(true);
    });

    it('should return false for unknown error types', () => {
      expect(ErrorUtils.isKnownError(new Error('test'))).toBe(false);
      expect(ErrorUtils.isKnownError('string error')).toBe(false);
      expect(ErrorUtils.isKnownError(null)).toBe(false);
      expect(ErrorUtils.isKnownError(undefined)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      expect(ErrorUtils.getErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('should return string as-is', () => {
      expect(ErrorUtils.getErrorMessage('String error')).toBe('String error');
    });

    it('should return default message for unknown types', () => {
      expect(ErrorUtils.getErrorMessage(null)).toBe('An unknown error occurred');
      expect(ErrorUtils.getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(ErrorUtils.getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('getErrorStack', () => {
    it('should extract stack from Error instance', () => {
      const error = new Error('Test error');
      expect(ErrorUtils.getErrorStack(error)).toBe(error.stack);
    });

    it('should return undefined for non-Error types', () => {
      expect(ErrorUtils.getErrorStack('string error')).toBeUndefined();
      expect(ErrorUtils.getErrorStack(null)).toBeUndefined();
      expect(ErrorUtils.getErrorStack(undefined)).toBeUndefined();
    });
  });

  describe('createErrorFromStatus', () => {
    it('should create appropriate error for status codes', () => {
      expect(ErrorUtils.createErrorFromStatus(400)).toBeInstanceOf(ValidationError);
      expect(ErrorUtils.createErrorFromStatus(401)).toBeInstanceOf(UnauthorizedError);
      expect(ErrorUtils.createErrorFromStatus(403)).toBeInstanceOf(ForbiddenError);
      expect(ErrorUtils.createErrorFromStatus(404)).toBeInstanceOf(NotFoundError);
      expect(ErrorUtils.createErrorFromStatus(429)).toBeInstanceOf(RateLimitError);
      expect(ErrorUtils.createErrorFromStatus(500)).toBeInstanceOf(Error);
      expect(ErrorUtils.createErrorFromStatus(503)).toBeInstanceOf(Error);
      expect(ErrorUtils.createErrorFromStatus(999)).toBeInstanceOf(Error);
    });

    it('should use custom message when provided', () => {
      const error = ErrorUtils.createErrorFromStatus(400, 'Custom validation error');
      expect(error.message).toBe('Custom validation error');
    });
  });
});

describe('withErrorHandling', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: 'https://example.com/test',
      headers: {
        get: jest.fn().mockReturnValue('test-request-id')
      }
    } as any;

    mockContext = {
      invocationId: 'test-invocation-id',
      functionName: 'test-function',
      log: jest.fn()
    } as any;
  });

  it('should return successful response when handler succeeds', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 200,
      jsonBody: { success: true }
    });

    const wrappedHandler = withErrorHandling()(handler);
    const result = await wrappedHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 200,
      jsonBody: { success: true }
    });
    expect(handler).toHaveBeenCalledWith(mockRequest, mockContext);
  });

  it('should handle errors thrown by handler', async () => {
    const error = new ValidationError('Invalid input');
    const handler = jest.fn().mockRejectedValue(error);

    const wrappedHandler = withErrorHandling()(handler);
    const result = await wrappedHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 400,
      jsonBody: {
        error: ErrorType.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: 'Invalid input',
        timestamp: expect.any(String),
        request_id: 'test-request-id'
      }
    });
  });

  it('should use custom config', async () => {
    const error = new Error('Test error');
    const handler = jest.fn().mockRejectedValue(error);
    const config: ErrorHandlerConfig = {
      requestIdHeader: 'x-custom-id'
    };

    (mockRequest.headers as any).get = jest.fn().mockReturnValue('custom-request-id');

    const wrappedHandler = withErrorHandling(config)(handler);
    const result = await wrappedHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 500,
      jsonBody: {
        error: ErrorType.INTERNAL_ERROR,
        message: 'An internal error occurred',
        details: 'Test error',
        timestamp: expect.any(String),
        request_id: 'custom-request-id'
      }
    });
  });
});

describe('Custom Error Classes', () => {
  describe('ValidationError', () => {
    it('should create with message, field, and code', () => {
      const error = new ValidationError('Invalid email', 'email', 'INVALID_FORMAT');
      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
      expect(error.code).toBe('INVALID_FORMAT');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create with message and details', () => {
      const error = new NotFoundError('User not found', 'User with ID 123 does not exist');
      expect(error.message).toBe('User not found');
      expect(error.details).toBe('User with ID 123 does not exist');
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create with message and details', () => {
      const error = new UnauthorizedError('Invalid token', 'Token has expired');
      expect(error.message).toBe('Invalid token');
      expect(error.details).toBe('Token has expired');
      expect(error.name).toBe('UnauthorizedError');
    });
  });

  describe('ForbiddenError', () => {
    it('should create with message and details', () => {
      const error = new ForbiddenError('Access denied', 'Insufficient permissions');
      expect(error.message).toBe('Access denied');
      expect(error.details).toBe('Insufficient permissions');
      expect(error.name).toBe('ForbiddenError');
    });
  });

  describe('RateLimitError', () => {
    it('should create with message, details, and retryAfter', () => {
      const error = new RateLimitError('Too many requests', 'Rate limit exceeded', 60);
      expect(error.message).toBe('Too many requests');
      expect(error.details).toBe('Rate limit exceeded');
      expect(error.retryAfter).toBe(60);
      expect(error.name).toBe('RateLimitError');
    });
  });

  describe('DatabaseError', () => {
    it('should create with message and operation', () => {
      const error = new DatabaseError('Connection failed', 'connect');
      expect(error.message).toBe('Connection failed');
      expect(error.operation).toBe('connect');
      expect(error.name).toBe('DatabaseError');
    });
  });

  describe('StorageError', () => {
    it('should create with message and operation', () => {
      const error = new StorageError('Upload failed', 'upload');
      expect(error.message).toBe('Upload failed');
      expect(error.operation).toBe('upload');
      expect(error.name).toBe('StorageError');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create with message and service', () => {
      const error = new ExternalServiceError('API call failed', 'payment-service');
      expect(error.message).toBe('API call failed');
      expect(error.service).toBe('payment-service');
      expect(error.name).toBe('ExternalServiceError');
    });
  });

  describe('ProcessingError', () => {
    it('should create with message and step', () => {
      const error = new ProcessingError('Transcription failed', 'audio-processing');
      expect(error.message).toBe('Transcription failed');
      expect(error.step).toBe('audio-processing');
      expect(error.name).toBe('ProcessingError');
    });
  });
});