import { HttpRequest, HttpResponseInit } from '@azure/functions';
import Joi from 'joi';
import { logger } from './logger';

/**
 * Validation Middleware for Azure Functions
 * 
 * Provides standardized validation patterns and error responses for API endpoints.
 * Supports request body validation, query parameter validation, and path parameter validation.
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  data?: any;
}

export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
}

export interface ValidationConfig {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  options?: ValidationOptions;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
  validation_errors?: ValidationError[];
}

/**
 * Validation middleware factory
 */
export class ValidationMiddleware {
  private static readonly DEFAULT_OPTIONS: ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  };

  /**
   * Validate request body, query parameters, and path parameters
   */
  static async validateRequest(
    request: HttpRequest,
    config: ValidationConfig
  ): Promise<ValidationResult> {
    try {
      const options = { ...this.DEFAULT_OPTIONS, ...config.options };
      const errors: ValidationError[] = [];
      let validatedData: any = {};

      // Validate request body
      if (config.body) {
        try {
          const body = await request.json();
          const { error, value } = config.body.validate(body, options);
          
          if (error) {
            errors.push(...this.formatJoiErrors(error, 'body'));
          } else {
            validatedData.body = value;
          }
        } catch (parseError) {
          errors.push({
            field: 'body',
            message: 'Invalid JSON in request body',
            code: 'INVALID_JSON'
          });
        }
      }

      // Validate query parameters
      if (config.query) {
        const queryParams = Object.fromEntries(request.query.entries());
        const { error, value } = config.query.validate(queryParams, options);
        
        if (error) {
          errors.push(...this.formatJoiErrors(error, 'query'));
        } else {
          validatedData.query = value;
        }
      }

      // Validate path parameters
      if (config.params) {
        const { error, value } = config.params.validate(request.params, options);
        
        if (error) {
          errors.push(...this.formatJoiErrors(error, 'params'));
        } else {
          validatedData.params = value;
        }
      }

      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        data: errors.length === 0 ? validatedData : undefined
      };

    } catch (error) {
      logger.error('Validation middleware error:', error);
      return {
        isValid: false,
        errors: [{
          field: 'request',
          message: 'Validation failed due to internal error',
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    status: number,
    errorCode: string,
    message: string,
    details?: string,
    validationErrors?: ValidationError[]
  ): HttpResponseInit {
    const response: ErrorResponse = {
      error: errorCode,
      message,
      ...(details && { details }),
      ...(validationErrors && { validation_errors: validationErrors })
    };

    return {
      status,
      jsonBody: response
    };
  }

  /**
   * Create validation error response
   */
  static createValidationErrorResponse(errors: ValidationError[]): HttpResponseInit {
    return this.createErrorResponse(
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      'One or more fields contain invalid values',
      errors
    );
  }

  /**
   * Format Joi validation errors to our standard format
   */
  private static formatJoiErrors(error: Joi.ValidationError, context: string): ValidationError[] {
    return error.details.map(detail => ({
      field: `${context}.${detail.path.join('.')}`,
      message: detail.message,
      code: this.getErrorCode(detail.type, detail.context?.key)
    }));
  }

  /**
   * Map Joi error types to our error codes
   */
  private static getErrorCode(type: string, _field?: string): string {
    switch (type) {
      case 'any.required':
        return 'REQUIRED_FIELD';
      case 'string.empty':
        return 'EMPTY_STRING';
      case 'string.min':
        return 'STRING_TOO_SHORT';
      case 'string.max':
        return 'STRING_TOO_LONG';
      case 'string.pattern.base':
        return 'INVALID_FORMAT';
      case 'string.uri':
        return 'INVALID_URL';
      case 'string.uuid':
        return 'INVALID_UUID';
      case 'number.min':
        return 'NUMBER_TOO_SMALL';
      case 'number.max':
        return 'NUMBER_TOO_LARGE';
      case 'any.only':
        return 'INVALID_VALUE';
      case 'object.unknown':
        return 'UNKNOWN_FIELD';
      default:
        return 'VALIDATION_ERROR';
    }
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid().required(),
  
  // Feed slug validation
  feedSlug: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).required(),
  
  // Pagination parameters
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  }),
  
  // Content submission validation
  contentSubmission: Joi.object({
    content_url: Joi.string().uri().required(),
    content_type: Joi.string().valid('url', 'youtube', 'pdf', 'document').required(),
    user_note: Joi.string().max(500).optional()
  }).messages({
    'content_url.required': 'content_url is required',
    'content_url.uri': 'content_url must be a valid URL',
    'content_type.required': 'content_type is required',
    'content_type.valid': 'content_type must be one of: url, youtube, pdf, document',
    'user_note.max': 'user_note cannot exceed 500 characters'
  }),
  
  // Episode ID validation
  episodeId: Joi.string().uuid().required(),
  
  // Status validation
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').required()
};

/**
 * Utility functions for common validations
 */
export class ValidationUtils {
  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate feed slug format
   */
  static isValidFeedSlug(slug: string): boolean {
    const slugRegex = /^[a-zA-Z0-9-_]+$/;
    return slugRegex.test(slug);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate YouTube URL format
   */
  static isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate date format (ISO 8601)
   */
  static isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString() === dateString;
  }
}

/**
 * Higher-order function to wrap Azure Functions with validation
 */
export function withValidation(config: ValidationConfig) {
  return function<T extends (...args: any[]) => Promise<HttpResponseInit>>(
    handler: T
  ): T {
    return (async (request: HttpRequest, context: any) => {
      // Validate request
      const validationResult = await ValidationMiddleware.validateRequest(request, config);
      
      if (!validationResult.isValid) {
        return ValidationMiddleware.createValidationErrorResponse(validationResult.errors!);
      }

      // Add validated data to request context
      const validatedRequest = {
        ...request,
        validatedData: validationResult.data
      };

      // Call the original handler
      return handler(validatedRequest, context);
    }) as T;
  };
}
