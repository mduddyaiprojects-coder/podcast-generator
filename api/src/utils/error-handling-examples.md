# Error Handling Middleware Examples

This document provides comprehensive examples of how to use the error handling middleware system in Azure Functions.

## Overview

The error handling middleware provides:
- Standardized error responses
- Automatic error logging
- Custom error types
- Error categorization and status code mapping
- Request ID tracking
- Stack trace management
- Retry-after headers for rate limiting

## Basic Usage

### 1. Manual Error Handling

```typescript
import { ErrorHandler, ValidationError, NotFoundError } from '../utils/error-handler';

export async function myFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Your function logic here...
    
    // Throw specific errors
    if (!resource) {
      throw new NotFoundError('User not found', 'The specified user does not exist');
    }
    
    if (!isValid) {
      throw new ValidationError('Invalid input', 'field_name', 'INVALID_VALUE');
    }
    
    return { status: 200, jsonBody: { success: true } };
    
  } catch (error) {
    return ErrorHandler.handleError(error, request, context);
  }
}
```

### 2. Using the withErrorHandling Decorator

```typescript
import { withErrorHandling, ProcessingError } from '../utils/error-handler';

export const myFunction = withErrorHandling({
  includeStack: false,
  logErrors: true,
  sanitizeErrors: true
})(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  // Your function logic here...
  // Errors are automatically caught and handled
  
  if (processingFailed) {
    throw new ProcessingError('Content processing failed', 'transcription');
  }
  
  return { status: 200, jsonBody: { success: true } };
});
```

### 3. Combining with Validation Middleware

```typescript
import { withErrorHandling } from '../utils/error-handler';
import { withValidation, CommonSchemas } from '../utils/validation';

export const myFunction = withErrorHandling()(
  withValidation({
    body: CommonSchemas.contentSubmission
  })(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // Both validation and error handling are automatic
    const { content_url } = request.validatedData.body;
    
    // Your function logic here...
    return { status: 200, jsonBody: { success: true } };
  })
);
```

## Custom Error Types

### Built-in Error Classes

```typescript
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  DatabaseError,
  StorageError,
  ExternalServiceError,
  ProcessingError
} from '../utils/error-handler';

// Validation error
throw new ValidationError('Invalid email format', 'email', 'INVALID_EMAIL');

// Not found error
throw new NotFoundError('Episode not found', 'The specified episode does not exist');

// Unauthorized error
throw new UnauthorizedError('Invalid credentials', 'Please check your username and password');

// Forbidden error
throw new ForbiddenError('Access denied', 'You do not have permission to access this resource');

// Rate limit error
throw new RateLimitError('Too many requests', 'Maximum 100 requests per hour', 3600);

// Database error
throw new DatabaseError('Failed to save user', 'user_creation');

// Storage error
throw new StorageError('Failed to upload file', 'file_upload');

// External service error
throw new ExternalServiceError('OpenAI service unavailable', 'openai');

// Processing error
throw new ProcessingError('Transcription failed', 'audio_processing');
```

### Creating Custom Error Responses

```typescript
import { ErrorHandler } from '../utils/error-handler';

// Validation error response
return ErrorHandler.createValidationErrorResponse([
  { field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' },
  { field: 'password', message: 'Password too short', code: 'PASSWORD_TOO_SHORT' }
]);

// Not found error response
return ErrorHandler.createNotFoundErrorResponse('User', 'user123');

// Rate limit error response
return ErrorHandler.createRateLimitErrorResponse('100 requests per hour', 3600);

// Internal error response
return ErrorHandler.createInternalErrorResponse(
  'Database connection failed',
  'Please try again in a few minutes'
);

// Service unavailable error response
return ErrorHandler.createServiceUnavailableErrorResponse('OpenAI', 300);
```

## Error Response Format

### Standard Error Response

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": "One or more fields contain invalid values",
  "timestamp": "2024-12-19T15:30:00.000Z",
  "request_id": "req_123456789",
  "validation_errors": [
    {
      "field": "body.email",
      "message": "email must be a valid email address",
      "code": "INVALID_EMAIL"
    }
  ]
}
```

### Error Types and Status Codes

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not allowed |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `PAYLOAD_TOO_LARGE` | 413 | Request too large |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Unsupported content type |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `BAD_GATEWAY` | 502 | Bad gateway |
| `GATEWAY_TIMEOUT` | 504 | Gateway timeout |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `STORAGE_ERROR` | 500 | Storage operation failed |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service error |
| `PROCESSING_ERROR` | 500 | Content processing failed |

## Configuration Options

### ErrorHandlerConfig

```typescript
interface ErrorHandlerConfig {
  includeStack?: boolean;        // Include stack trace in response
  logErrors?: boolean;          // Log errors to console
  sanitizeErrors?: boolean;     // Remove sensitive information
  requestIdHeader?: string;     // Header name for request ID
}
```

### Example Configuration

```typescript
const config: ErrorHandlerConfig = {
  includeStack: process.env.NODE_ENV === 'development',
  logErrors: true,
  sanitizeErrors: process.env.NODE_ENV === 'production',
  requestIdHeader: 'x-request-id'
};

export const myFunction = withErrorHandling(config)(async (request, context) => {
  // Function logic...
});
```

## Error Logging

### Automatic Logging

The middleware automatically logs errors with appropriate levels:

- **Error Level**: Server errors (5xx)
- **Warn Level**: Client errors (4xx)
- **Info Level**: Other errors

### Log Data Structure

```typescript
{
  requestId: 'req_123456789',
  method: 'POST',
  url: '/api/content',
  userAgent: 'Mozilla/5.0...',
  errorType: 'VALIDATION_ERROR',
  status: 400,
  message: 'Request validation failed',
  details: 'One or more fields contain invalid values',
  stack: 'Error: Validation failed\n    at...'
}
```

## Utility Functions

### ErrorUtils

```typescript
import { ErrorUtils } from '../utils/error-handler';

// Check if error is a known error type
if (ErrorUtils.isKnownError(error)) {
  // Handle known error
}

// Extract error message safely
const message = ErrorUtils.getErrorMessage(error);

// Extract error stack safely
const stack = ErrorUtils.getErrorStack(error);

// Create error from HTTP status code
const error = ErrorUtils.createErrorFromStatus(404, 'Resource not found');
```

## Advanced Patterns

### Error Recovery

```typescript
export async function resilientFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Primary operation
    return await primaryOperation(request);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      try {
        // Fallback operation
        return await fallbackOperation(request);
      } catch (fallbackError) {
        return ErrorHandler.handleError(fallbackError, request, context);
      }
    }
    
    return ErrorHandler.handleError(error, request, context);
  }
}
```

### Conditional Error Handling

```typescript
export async function conditionalErrorFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const result = await riskyOperation(request);
    return { status: 200, jsonBody: result };
  } catch (error) {
    // Only handle specific errors, let others bubble up
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return ErrorHandler.handleError(error, request, context);
    }
    
    // Re-throw other errors
    throw error;
  }
}
```

### Error Context

```typescript
export async function contextualErrorFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const userId = request.params.userId;
    const resource = await getResource(userId);
    
    if (!resource) {
      throw new NotFoundError(
        `Resource not found for user ${userId}`,
        `User ${userId} does not have access to this resource`
      );
    }
    
    return { status: 200, jsonBody: resource };
  } catch (error) {
    return ErrorHandler.handleError(error, request, context);
  }
}
```

## Best Practices

1. **Use Specific Error Types**: Throw specific error types for better error handling
2. **Include Context**: Provide meaningful error messages with context
3. **Log Appropriately**: Use appropriate log levels for different error types
4. **Sanitize in Production**: Remove sensitive information in production
5. **Include Request IDs**: Use request IDs for error tracking and debugging
6. **Handle Errors Gracefully**: Provide fallback mechanisms where possible
7. **Document Error Codes**: Document all possible error codes and their meanings
8. **Test Error Scenarios**: Write tests for error handling paths
9. **Monitor Error Rates**: Set up monitoring for error rates and patterns
10. **Use Retry Logic**: Implement retry logic for transient errors

## Migration Guide

### From Manual Error Handling

**Before:**
```typescript
try {
  // Function logic
} catch (error) {
  logger.error('Error occurred:', error);
  return {
    status: 500,
    jsonBody: {
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }
  };
}
```

**After:**
```typescript
export const myFunction = withErrorHandling()(async (request, context) => {
  // Function logic
  // Errors are automatically handled
});
```

### From Inconsistent Error Responses

**Before:**
```typescript
// Different error response formats across functions
return { status: 400, jsonBody: { error: 'Bad request' } };
return { status: 404, jsonBody: { message: 'Not found' } };
return { status: 500, jsonBody: { details: 'Server error' } };
```

**After:**
```typescript
// Consistent error response format
throw new ValidationError('Invalid input');
throw new NotFoundError('Resource not found');
throw new Error('Internal server error');
```

## Performance Considerations

- Error handling middleware adds minimal overhead
- Error logging can impact performance in high-traffic scenarios
- Consider using async logging for production
- Stack trace generation can be expensive
- Request ID generation is lightweight
- Error categorization is fast
