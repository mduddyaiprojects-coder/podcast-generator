import { ErrorHandler, ServiceError, ErrorType, ErrorSeverity } from '../../src/utils/error-handling';

describe('ErrorHandler', () => {
  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = { code: 'ECONNRESET', message: 'Connection reset' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(serviceError.retryable).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = { code: 'ETIMEDOUT', message: 'Operation timed out' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(serviceError.retryable).toBe(true);
    });

    it('should classify authentication errors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.HIGH);
      expect(serviceError.retryable).toBe(false);
    });

    it('should classify authorization errors', () => {
      const error = { status: 403, message: 'Forbidden' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.AUTHORIZATION_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.HIGH);
      expect(serviceError.retryable).toBe(false);
    });

    it('should classify rate limit errors', () => {
      const error = { status: 429, message: 'Too Many Requests' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.RATE_LIMIT_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(serviceError.retryable).toBe(true);
    });

    it('should classify service unavailable errors', () => {
      const error = { status: 503, message: 'Service Unavailable' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.SERVICE_UNAVAILABLE);
      expect(serviceError.severity).toBe(ErrorSeverity.HIGH);
      expect(serviceError.retryable).toBe(true);
    });

    it('should classify validation errors', () => {
      const error = { status: 400, message: 'Bad Request' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(serviceError.retryable).toBe(false);
    });

    it('should classify configuration errors', () => {
      const error = { message: 'Service not configured' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.CONFIGURATION_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.CRITICAL);
      expect(serviceError.retryable).toBe(false);
    });

    it('should classify unknown errors', () => {
      const error = { message: 'Some random error' };
      const serviceError = ErrorHandler.classifyError(error, 'test-service');
      
      expect(serviceError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(serviceError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(serviceError.retryable).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should handle and log errors appropriately', () => {
      const error = { message: 'Test error' };
      const context = { operation: 'test' };
      
      const serviceError = ErrorHandler.handleError(error, 'test-service', context);
      
      expect(serviceError.service).toBe('test-service');
      expect(serviceError.context['operation']).toBe('test');
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const serviceError = new ServiceError(
        'Test error',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM,
        'test-service',
        { retryable: true }
      );
      
      const response = ErrorHandler.createErrorResponse(serviceError);
      
      expect(response.error).toBe(ErrorType.NETWORK_ERROR);
      expect(response.type).toBe(ErrorType.NETWORK_ERROR);
      expect(response.severity).toBe(ErrorSeverity.MEDIUM);
      expect(response.service).toBe('test-service');
      expect(response.message).toBe('Test error');
      expect(response.retryable).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable ServiceError', () => {
      const serviceError = new ServiceError(
        'Test error',
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM,
        'test-service',
        { retryable: true }
      );
      
      expect(ErrorHandler.isRetryable(serviceError)).toBe(true);
    });

    it('should return false for non-retryable ServiceError', () => {
      const serviceError = new ServiceError(
        'Test error',
        ErrorType.AUTHENTICATION_ERROR,
        ErrorSeverity.HIGH,
        'test-service',
        { retryable: false }
      );
      
      expect(ErrorHandler.isRetryable(serviceError)).toBe(false);
    });

    it('should check error message patterns', () => {
      expect(ErrorHandler.isRetryable({ message: 'timeout occurred' })).toBe(true);
      expect(ErrorHandler.isRetryable({ message: 'ECONNRESET' })).toBe(true);
      expect(ErrorHandler.isRetryable({ message: 'rate limit exceeded' })).toBe(true);
      expect(ErrorHandler.isRetryable({ message: 'service unavailable' })).toBe(true);
      expect(ErrorHandler.isRetryable({ message: 'temporary failure' })).toBe(true);
      expect(ErrorHandler.isRetryable({ message: 'permanent error' })).toBe(false);
    });
  });

  describe('getHttpStatusCode', () => {
    it('should return status code from ServiceError', () => {
      const serviceError = new ServiceError(
        'Test error',
        ErrorType.AUTHENTICATION_ERROR,
        ErrorSeverity.HIGH,
        'test-service',
        { statusCode: 401 }
      );
      
      expect(ErrorHandler.getHttpStatusCode(serviceError)).toBe(401);
    });

    it('should return default status codes based on error type', () => {
      const authError = new ServiceError(
        'Test error',
        ErrorType.AUTHENTICATION_ERROR,
        ErrorSeverity.HIGH,
        'test-service'
      );
      expect(ErrorHandler.getHttpStatusCode(authError)).toBe(401);

      const validationError = new ServiceError(
        'Test error',
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        'test-service'
      );
      expect(ErrorHandler.getHttpStatusCode(validationError)).toBe(400);

      const rateLimitError = new ServiceError(
        'Test error',
        ErrorType.RATE_LIMIT_ERROR,
        ErrorSeverity.MEDIUM,
        'test-service'
      );
      expect(ErrorHandler.getHttpStatusCode(rateLimitError)).toBe(429);
    });
  });
});

describe('ServiceError', () => {
  it('should create error with all properties', () => {
    const cause = new Error('Original error');
    const serviceError = new ServiceError(
      'Test error message',
      ErrorType.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      'test-service',
      {
        statusCode: 500,
        retryable: true,
        context: { operation: 'test' },
        cause
      }
    );

    expect(serviceError.message).toBe('Test error message');
    expect(serviceError.type).toBe(ErrorType.NETWORK_ERROR);
    expect(serviceError.severity).toBe(ErrorSeverity.MEDIUM);
    expect(serviceError.service).toBe('test-service');
    expect(serviceError.statusCode).toBe(500);
    expect(serviceError.retryable).toBe(true);
    expect(serviceError.context['operation']).toBe('test');
    expect(serviceError.cause).toBe(cause);
    expect(serviceError.timestamp).toBeInstanceOf(Date);
  });

  it('should determine retryability based on type', () => {
    const retryableError = new ServiceError(
      'Test error',
      ErrorType.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      'test-service'
    );
    expect(retryableError.retryable).toBe(true);

    const nonRetryableError = new ServiceError(
      'Test error',
      ErrorType.AUTHENTICATION_ERROR,
      ErrorSeverity.HIGH,
      'test-service'
    );
    expect(nonRetryableError.retryable).toBe(false);
  });

  it('should convert to JSON for logging', () => {
    const serviceError = new ServiceError(
      'Test error',
      ErrorType.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      'test-service',
      { context: { operation: 'test' } }
    );

    const json = serviceError.toJSON();

    expect(json['name']).toBe('ServiceError');
    expect(json['message']).toBe('Test error');
    expect(json['type']).toBe(ErrorType.NETWORK_ERROR);
    expect(json['severity']).toBe(ErrorSeverity.MEDIUM);
    expect(json['service']).toBe('test-service');
    expect(json['context']['operation']).toBe('test');
    expect(json['timestamp']).toBe(serviceError.timestamp.toISOString());
  });
});
