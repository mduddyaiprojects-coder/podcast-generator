import { HttpRequest } from '@azure/functions';
import Joi from 'joi';
import {
  ValidationMiddleware,
  ValidationConfig,
  ValidationError,
  CommonSchemas,
  ValidationUtils,
  withValidation
} from '../../src/utils/validation-middleware';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

describe('ValidationMiddleware', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    mockRequest = {
      json: jest.fn(),
      query: new Map(),
      params: {}
    } as any;
  });

  describe('validateRequest', () => {
    it('should validate request body successfully', async () => {
      const config: ValidationConfig = {
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        })
      };

      const bodyData = { name: 'John Doe', email: 'john@example.com' };
      (mockRequest as any).json = jest.fn().mockResolvedValue(bodyData);

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        body: bodyData
      });
      expect(result.errors).toBeUndefined();
    });

    it('should validate query parameters successfully', async () => {
      const config: ValidationConfig = {
        query: Joi.object({
          limit: Joi.number().integer().min(1).max(100).default(50),
          offset: Joi.number().integer().min(0).default(0)
        })
      };

      (mockRequest as any).query = new Map([
        ['limit', '25'],
        ['offset', '0']
      ]);

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        query: { limit: 25, offset: 0 }
      });
    });

    it('should validate path parameters successfully', async () => {
      const config: ValidationConfig = {
        params: Joi.object({
          id: Joi.string().uuid().required()
        })
      };

      (mockRequest as any).params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      });
    });

    it('should validate all request parts together', async () => {
      const config: ValidationConfig = {
        body: Joi.object({
          name: Joi.string().required()
        }),
        query: Joi.object({
          limit: Joi.number().integer().min(1).max(100).default(50)
        }),
        params: Joi.object({
          id: Joi.string().uuid().required()
        })
      };

      const bodyData = { name: 'John Doe' };
      (mockRequest as any).json = jest.fn().mockResolvedValue(bodyData);
      (mockRequest as any).query = new Map([['limit', '25']]);
      (mockRequest as any).params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        body: bodyData,
        query: { limit: 25 },
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      });
    });

    it('should return validation errors for invalid body', async () => {
      const config: ValidationConfig = {
        body: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        })
      };

      const invalidBody = { name: '', email: 'invalid-email' };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidBody);

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors!.some(e => e.field === 'body.name')).toBe(true);
      expect(result.errors!.some(e => e.field === 'body.email')).toBe(true);
    });

    it('should return validation errors for invalid query parameters', async () => {
      const config: ValidationConfig = {
        query: Joi.object({
          limit: Joi.number().integer().min(1).max(100).required()
        })
      };

      (mockRequest as any).query = new Map([['limit', '150']]); // Invalid: exceeds max

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.field === 'query.limit')).toBe(true);
    });

    it('should return validation errors for invalid path parameters', async () => {
      const config: ValidationConfig = {
        params: Joi.object({
          id: Joi.string().uuid().required()
        })
      };

      (mockRequest as any).params = { id: 'invalid-uuid' };

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.field === 'params.id')).toBe(true);
    });

    it('should handle invalid JSON in request body', async () => {
      const config: ValidationConfig = {
        body: Joi.object({
          name: Joi.string().required()
        })
      };

      (mockRequest as any).json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.field === 'body' && e.code === 'INVALID_JSON')).toBe(true);
    });

    it('should use custom validation options', async () => {
      const config: ValidationConfig = {
        body: Joi.object({
          name: Joi.string().required(),
          extra: Joi.string()
        }),
        options: {
          stripUnknown: false,
          allowUnknown: true
        }
      };

      const bodyData = { name: 'John', extra: 'value', unknown: 'field' };
      (mockRequest as any).json = jest.fn().mockResolvedValue(bodyData);

      const result = await ValidationMiddleware.validateRequest(mockRequest, config);

      expect(result.isValid).toBe(true);
      expect(result.data.body).toEqual(bodyData);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with all fields', () => {
      const validationErrors: ValidationError[] = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED_FIELD' }
      ];

      const response = ValidationMiddleware.createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        'One or more fields contain invalid values',
        validationErrors
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: 'One or more fields contain invalid values',
        validation_errors: validationErrors
      });
    });

    it('should create error response without optional fields', () => {
      const response = ValidationMiddleware.createErrorResponse(
        500,
        'INTERNAL_ERROR',
        'Internal server error'
      );

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error'
      });
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error response', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Email is required', code: 'REQUIRED_FIELD' }
      ];

      const response = ValidationMiddleware.createValidationErrorResponse(errors);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: 'One or more fields contain invalid values',
        validation_errors: errors
      });
    });
  });

  describe('formatJoiErrors', () => {
    it('should format Joi errors correctly', () => {
      const joiError = {
        details: [
          {
            path: ['name'],
            message: 'Name is required',
            type: 'any.required',
            context: { key: 'name' }
          }
        ]
      } as Joi.ValidationError;

      const result = ValidationMiddleware['formatJoiErrors'](joiError, 'body');

      expect(result).toEqual([
        {
          field: 'body.name',
          message: 'Name is required',
          code: 'REQUIRED_FIELD'
        }
      ]);
    });
  });

  describe('getErrorCode', () => {
    it('should map Joi error types to error codes', () => {
      const testCases = [
        { type: 'any.required', expected: 'REQUIRED_FIELD' },
        { type: 'string.empty', expected: 'EMPTY_STRING' },
        { type: 'string.min', expected: 'STRING_TOO_SHORT' },
        { type: 'string.max', expected: 'STRING_TOO_LONG' },
        { type: 'string.pattern.base', expected: 'INVALID_FORMAT' },
        { type: 'string.uri', expected: 'INVALID_URL' },
        { type: 'string.uuid', expected: 'INVALID_UUID' },
        { type: 'number.min', expected: 'NUMBER_TOO_SMALL' },
        { type: 'number.max', expected: 'NUMBER_TOO_LARGE' },
        { type: 'any.only', expected: 'INVALID_VALUE' },
        { type: 'object.unknown', expected: 'UNKNOWN_FIELD' },
        { type: 'unknown.type', expected: 'VALIDATION_ERROR' }
      ];

      testCases.forEach(({ type, expected }) => {
        const result = ValidationMiddleware['getErrorCode'](type);
        expect(result).toBe(expected);
      });
    });
  });
});

describe('CommonSchemas', () => {
  describe('uuid', () => {
    it('should validate valid UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const { error } = CommonSchemas.uuid.validate(validUuid);
      expect(error).toBeUndefined();
    });

    it('should reject invalid UUID', () => {
      const invalidUuid = 'not-a-uuid';
      const { error } = CommonSchemas.uuid.validate(invalidUuid);
      expect(error).toBeDefined();
    });
  });

  describe('feedSlug', () => {
    it('should validate valid feed slug', () => {
      const validSlug = 'my-podcast-feed_123';
      const { error } = CommonSchemas.feedSlug.validate(validSlug);
      expect(error).toBeUndefined();
    });

    it('should reject invalid feed slug', () => {
      const invalidSlug = 'my podcast feed!';
      const { error } = CommonSchemas.feedSlug.validate(invalidSlug);
      expect(error).toBeDefined();
    });
  });

  describe('pagination', () => {
    it('should validate valid pagination parameters', () => {
      const validPagination = { limit: 25, offset: 50 };
      const { error } = CommonSchemas.pagination.validate(validPagination);
      expect(error).toBeUndefined();
    });

    it('should use default values', () => {
      const { value } = CommonSchemas.pagination.validate({});
      expect(value).toEqual({ limit: 50, offset: 0 });
    });

    it('should reject invalid pagination parameters', () => {
      const invalidPagination = { limit: 150, offset: -10 };
      const { error } = CommonSchemas.pagination.validate(invalidPagination);
      expect(error).toBeDefined();
    });
  });

  describe('contentSubmission', () => {
    it('should validate valid content submission', () => {
      const validSubmission = {
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'Test note'
      };
      const { error } = CommonSchemas.contentSubmission.validate(validSubmission);
      expect(error).toBeUndefined();
    });

    it('should validate content submission without user_note', () => {
      const validSubmission = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };
      const { error } = CommonSchemas.contentSubmission.validate(validSubmission);
      expect(error).toBeUndefined();
    });

    it('should reject invalid content submission', () => {
      const invalidSubmission = {
        content_url: 'not-a-url',
        content_type: 'invalid-type'
      };
      const { error } = CommonSchemas.contentSubmission.validate(invalidSubmission);
      expect(error).toBeDefined();
    });
  });

  describe('episodeId', () => {
    it('should validate valid episode ID', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const { error } = CommonSchemas.episodeId.validate(validId);
      expect(error).toBeUndefined();
    });

    it('should reject invalid episode ID', () => {
      const invalidId = 'not-a-uuid';
      const { error } = CommonSchemas.episodeId.validate(invalidId);
      expect(error).toBeDefined();
    });
  });

  describe('status', () => {
    it('should validate valid status', () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      validStatuses.forEach(status => {
        const { error } = CommonSchemas.status.validate(status);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid status', () => {
      const invalidStatus = 'invalid-status';
      const { error } = CommonSchemas.status.validate(invalidStatus);
      expect(error).toBeDefined();
    });
  });
});

describe('ValidationUtils', () => {
  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(ValidationUtils.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(ValidationUtils.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(ValidationUtils.isValidUUID('not-a-uuid')).toBe(false);
      expect(ValidationUtils.isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(ValidationUtils.isValidUUID('')).toBe(false);
    });
  });

  describe('isValidFeedSlug', () => {
    it('should return true for valid feed slugs', () => {
      expect(ValidationUtils.isValidFeedSlug('my-podcast')).toBe(true);
      expect(ValidationUtils.isValidFeedSlug('my_podcast_123')).toBe(true);
      expect(ValidationUtils.isValidFeedSlug('my-podcast-123')).toBe(true);
    });

    it('should return false for invalid feed slugs', () => {
      expect(ValidationUtils.isValidFeedSlug('my podcast')).toBe(false);
      expect(ValidationUtils.isValidFeedSlug('my-podcast!')).toBe(false);
      expect(ValidationUtils.isValidFeedSlug('my.podcast')).toBe(false);
      expect(ValidationUtils.isValidFeedSlug('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(ValidationUtils.isValidUrl('https://example.com')).toBe(true);
      expect(ValidationUtils.isValidUrl('http://example.com')).toBe(true);
      expect(ValidationUtils.isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(ValidationUtils.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationUtils.isValidUrl('https://')).toBe(false);
      expect(ValidationUtils.isValidUrl('')).toBe(false);
    });
  });

  describe('isValidYouTubeUrl', () => {
    it('should return true for valid YouTube URLs', () => {
      expect(ValidationUtils.isValidYouTubeUrl('https://youtube.com/watch?v=123')).toBe(true);
      expect(ValidationUtils.isValidYouTubeUrl('https://www.youtube.com/watch?v=123')).toBe(true);
      expect(ValidationUtils.isValidYouTubeUrl('https://youtu.be/123')).toBe(true);
    });

    it('should return false for invalid YouTube URLs', () => {
      expect(ValidationUtils.isValidYouTubeUrl('https://example.com')).toBe(false);
      expect(ValidationUtils.isValidYouTubeUrl('not-a-url')).toBe(false);
      expect(ValidationUtils.isValidYouTubeUrl('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(ValidationUtils.isValidEmail('user@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('user.name@example.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(ValidationUtils.isValidEmail('not-an-email')).toBe(false);
      expect(ValidationUtils.isValidEmail('user@')).toBe(false);
      expect(ValidationUtils.isValidEmail('@example.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidISODate', () => {
    it('should return true for valid ISO dates', () => {
      expect(ValidationUtils.isValidISODate('2023-01-01T00:00:00.000Z')).toBe(true);
      expect(ValidationUtils.isValidISODate('2023-12-31T23:59:59.999Z')).toBe(true);
    });

    it('should return false for invalid ISO dates', () => {
      expect(ValidationUtils.isValidISODate('2023-01-01')).toBe(false);
      expect(ValidationUtils.isValidISODate('not-a-date')).toBe(false);
      expect(ValidationUtils.isValidISODate('')).toBe(false);
    });
  });
});

describe('withValidation', () => {
  let mockRequest: HttpRequest;
  let mockContext: any;

  beforeEach(() => {
    mockRequest = {
      json: jest.fn(),
      query: new Map(),
      params: {}
    } as any;

    mockContext = {
      invocationId: 'test-invocation-id'
    };
  });

  it('should call handler when validation passes', async () => {
    const config: ValidationConfig = {
      body: Joi.object({
        name: Joi.string().required()
      })
    };

    const handler = jest.fn().mockResolvedValue({ status: 200, jsonBody: { success: true } });
    const wrappedHandler = withValidation(config)(handler);

    const bodyData = { name: 'John Doe' };
    (mockRequest as any).json = jest.fn().mockResolvedValue(bodyData);

    const result = await wrappedHandler(mockRequest, mockContext);

    expect(result).toEqual({ status: 200, jsonBody: { success: true } });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        validatedData: { body: bodyData }
      }),
      mockContext
    );
  });

  it('should return validation error when validation fails', async () => {
    const config: ValidationConfig = {
      body: Joi.object({
        name: Joi.string().required()
      })
    };

    const handler = jest.fn();
    const wrappedHandler = withValidation(config)(handler);

    const invalidBody = { name: '' };
    (mockRequest as any).json = jest.fn().mockResolvedValue(invalidBody);

    const result = await wrappedHandler(mockRequest, mockContext);

    expect(result.status).toBe(400);
    expect(result.jsonBody).toEqual({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: 'One or more fields contain invalid values',
      validation_errors: expect.any(Array)
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
