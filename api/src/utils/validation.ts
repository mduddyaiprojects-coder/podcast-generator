import Joi from 'joi';
import { HttpRequest } from '@azure/functions';

const contentSubmissionSchema = Joi.object({
  url: Joi.string().uri().optional(),
  youtubeUrl: Joi.string().pattern(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/).optional(),
  document: Joi.object({
    content: Joi.string().required(),
    title: Joi.string().required(),
    type: Joi.string().valid('pdf', 'docx', 'txt').required()
  }).optional(),
  metadata: Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    author: Joi.string().optional()
  }).optional()
}).custom((value, helpers) => {
  // At least one content type must be provided
  if (!value.url && !value.youtubeUrl && !value.document) {
    return helpers.error('custom.atLeastOneContent');
  }
  return value;
}).messages({
  'custom.atLeastOneContent': 'At least one content type (url, youtubeUrl, or document) must be provided'
});

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

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

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
}
