# Validation Middleware Examples

This document provides comprehensive examples of how to use the validation middleware system in Azure Functions.

## Overview

The validation middleware provides:
- Standardized validation patterns
- Consistent error responses
- Support for request body, query parameters, and path parameters
- Reusable validation schemas
- Type-safe validation results

## Basic Usage

### 1. Manual Validation

```typescript
import { ValidationMiddleware, CommonSchemas } from '../utils/validation';

export async function myFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Validate request
  const validationResult = await ValidationMiddleware.validateRequest(request, {
    body: CommonSchemas.contentSubmission,
    query: CommonSchemas.pagination,
    params: Joi.object({
      id: CommonSchemas.uuid
    })
  });

  if (!validationResult.isValid) {
    return ValidationMiddleware.createValidationErrorResponse(validationResult.errors!);
  }

  // Use validated data
  const { content_url, content_type } = validationResult.data!.body;
  const { limit, offset } = validationResult.data!.query;
  const { id } = validationResult.data!.params;

  // Your function logic here...
}
```

### 2. Using the withValidation Decorator

```typescript
import { withValidation, CommonSchemas } from '../utils/validation';

export const myFunction = withValidation({
  body: CommonSchemas.contentSubmission,
  query: CommonSchemas.pagination
})(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
  // Access validated data directly
  const { content_url, content_type } = request.validatedData.body;
  const { limit, offset } = request.validatedData.query;

  // Your function logic here...
});
```

## Common Validation Patterns

### Content Submission

```typescript
const validationResult = await ValidationMiddleware.validateRequest(request, {
  body: CommonSchemas.contentSubmission
});
```

### Pagination

```typescript
const validationResult = await ValidationMiddleware.validateRequest(request, {
  query: CommonSchemas.pagination
});
```

### UUID Parameters

```typescript
const validationResult = await ValidationMiddleware.validateRequest(request, {
  params: Joi.object({
    submission_id: CommonSchemas.uuid,
    episode_id: CommonSchemas.uuid
  })
});
```

### Feed Slug Parameters

```typescript
const validationResult = await ValidationMiddleware.validateRequest(request, {
  params: Joi.object({
    feed_slug: CommonSchemas.feedSlug
  })
});
```

## Custom Validation Schemas

### Creating Custom Schemas

```typescript
import Joi from 'joi';

const customSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(120).optional()
}).messages({
  'name.required': 'Name is required',
  'name.min': 'Name must be at least 1 character',
  'name.max': 'Name cannot exceed 100 characters',
  'email.required': 'Email is required',
  'email.email': 'Email must be a valid email address',
  'age.min': 'Age cannot be negative',
  'age.max': 'Age cannot exceed 120'
});

const validationResult = await ValidationMiddleware.validateRequest(request, {
  body: customSchema
});
```

### Complex Validation with Dependencies

```typescript
const complexSchema = Joi.object({
  type: Joi.string().valid('user', 'admin').required(),
  permissions: Joi.when('type', {
    is: 'admin',
    then: Joi.array().items(Joi.string()).min(1).required(),
    otherwise: Joi.array().items(Joi.string()).optional()
  }),
  metadata: Joi.object().when('type', {
    is: 'admin',
    then: Joi.object({
      department: Joi.string().required(),
      level: Joi.number().integer().min(1).max(10).required()
    }).required(),
    otherwise: Joi.object().optional()
  })
});
```

## Error Handling

### Standard Error Responses

```typescript
// Validation error
return ValidationMiddleware.createValidationErrorResponse(errors);

// Custom error
return ValidationMiddleware.createErrorResponse(
  404,
  'NOT_FOUND',
  'Resource not found',
  'The requested resource does not exist'
);

// Error with validation details
return ValidationMiddleware.createErrorResponse(
  400,
  'INVALID_REQUEST',
  'Request validation failed',
  'One or more fields contain invalid values',
  validationErrors
);
```

### Error Response Format

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": "One or more fields contain invalid values",
  "validation_errors": [
    {
      "field": "body.content_url",
      "message": "content_url must be a valid URL",
      "code": "INVALID_URL"
    },
    {
      "field": "query.limit",
      "message": "limit must be between 1 and 100",
      "code": "NUMBER_TOO_LARGE"
    }
  ]
}
```

## Utility Functions

### ValidationUtils

```typescript
import { ValidationUtils } from '../utils/validation';

// Check if string is valid UUID
if (ValidationUtils.isValidUUID(id)) {
  // Handle valid UUID
}

// Check if string is valid URL
if (ValidationUtils.isValidUrl(url)) {
  // Handle valid URL
}

// Check if string is valid email
if (ValidationUtils.isValidEmail(email)) {
  // Handle valid email
}

// Check if string is valid feed slug
if (ValidationUtils.isValidFeedSlug(slug)) {
  // Handle valid feed slug
}
```

## Migration Guide

### From Legacy Validation

**Before:**
```typescript
const validationResult = await validateContentSubmission(request);
if (!validationResult.isValid) {
  return {
    status: 400,
    jsonBody: {
      error: 'INVALID_URL',
      message: 'The provided URL is not valid',
      details: validationResult.errors?.join(', ')
    }
  };
}
```

**After:**
```typescript
const validationResult = await ValidationMiddleware.validateRequest(request, {
  body: CommonSchemas.contentSubmission
});

if (!validationResult.isValid) {
  return ValidationMiddleware.createValidationErrorResponse(validationResult.errors!);
}
```

## Best Practices

1. **Use Common Schemas**: Leverage `CommonSchemas` for standard validation patterns
2. **Consistent Error Handling**: Use `ValidationMiddleware.createErrorResponse()` for consistent error responses
3. **Type Safety**: Access validated data through `validationResult.data` for type safety
4. **Custom Messages**: Provide clear, user-friendly error messages in your schemas
5. **Validation Order**: Validate in order: params → query → body
6. **Error Codes**: Use descriptive error codes for different validation failures
7. **Logging**: Log validation failures for debugging and monitoring

## Performance Considerations

- Validation middleware adds minimal overhead
- Joi schemas are compiled once and reused
- Use `abortEarly: false` to get all validation errors at once
- Consider caching validation results for repeated requests
- Use `stripUnknown: true` to remove unknown fields from validated data
