import Joi from 'joi';
import { HttpRequest } from '@azure/functions';
import { ValidationMiddleware, CommonSchemas, ValidationUtils } from './validation-middleware';

// Legacy validation functions for backward compatibility
const contentSubmissionSchema = Joi.object({
  content_url: Joi.string().uri().required(),
  content_type: Joi.string().valid('url', 'youtube', 'pdf', 'document').required(),
  user_note: Joi.string().max(500).optional()
}).messages({
  'content_url.required': 'content_url is required',
  'content_url.uri': 'content_url must be a valid URL',
  'content_type.required': 'content_type is required',
  'content_type.valid': 'content_type must be one of: url, youtube, pdf, document',
  'user_note.max': 'user_note cannot exceed 500 characters'
});

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

/**
 * Legacy content submission validation (for backward compatibility)
 * @deprecated Use ValidationMiddleware.validateRequest with CommonSchemas.contentSubmission instead
 */
export async function validateContentSubmission(request: HttpRequest): Promise<ValidationResult> {
  try {
    const body = await request.json();
    const { error } = contentSubmissionSchema.validate(body, { abortEarly: false });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };

  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid JSON in request body']
    };
  }
}

/**
 * Legacy URL validation (for backward compatibility)
 * @deprecated Use ValidationUtils.isValidUrl instead
 */
export function validateUrl(url: string): boolean {
  return ValidationUtils.isValidUrl(url);
}

/**
 * Legacy YouTube URL validation (for backward compatibility)
 * @deprecated Use ValidationUtils.isValidYouTubeUrl instead
 */
export function validateYouTubeUrl(url: string): boolean {
  return ValidationUtils.isValidYouTubeUrl(url);
}

// Re-export new validation utilities
export { ValidationMiddleware, CommonSchemas, ValidationUtils, withValidation } from './validation-middleware';
