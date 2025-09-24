import { HttpRequest } from '@azure/functions';
import { 
  validateContentSubmission, 
  validateUrl, 
  validateYouTubeUrl,
  ValidationResult 
} from '../../src/utils/validation';

// Mock the validation-middleware
jest.mock('../../src/utils/validation-middleware', () => ({
  ValidationUtils: {
    isValidUrl: jest.fn(),
    isValidYouTubeUrl: jest.fn()
  }
}));

import { ValidationUtils } from '../../src/utils/validation-middleware';

const mockValidationUtils = ValidationUtils as jest.Mocked<typeof ValidationUtils>;

describe('Validation Utils', () => {
  let mockRequest: HttpRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      json: jest.fn()
    } as any;
  });

  describe('validateContentSubmission', () => {
    it('should validate valid content submission', async () => {
      const validData = {
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'Test note'
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(validData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: true
      });
    });

    it('should validate content submission without user_note', async () => {
      const validData = {
        content_url: 'https://example.com/article',
        content_type: 'url'
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(validData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: true
      });
    });

    it('should reject invalid content_url', async () => {
      const invalidData = {
        content_url: 'not-a-url',
        content_type: 'url'
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: false,
        errors: ['"content_url" must be a valid uri']
      });
    });

    it('should reject missing content_url', async () => {
      const invalidData = {
        content_type: 'url'
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: false,
        errors: ['"content_url" is required']
      });
    });

    it('should reject missing content_type', async () => {
      const invalidData = {
        content_url: 'https://example.com/article'
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: false,
        errors: ['"content_type" is required']
      });
    });

    it('should reject invalid content_type', async () => {
      const invalidData = {
        content_url: 'https://example.com/article',
        content_type: 'invalid-type'
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: false,
        errors: ['"content_type" must be one of [url, youtube, pdf, document]']
      });
    });

    it('should reject user_note that is too long', async () => {
      const invalidData = {
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'a'.repeat(501) // 501 characters
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidData);

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: false,
        errors: ['"user_note" length must be less than or equal to 500 characters long']
      });
    });

    it('should handle multiple validation errors', async () => {
      const invalidData = {
        content_url: 'not-a-url',
        content_type: 'invalid-type',
        user_note: 'a'.repeat(501)
      };
      (mockRequest as any).json = jest.fn().mockResolvedValue(invalidData);

      const result = await validateContentSubmission(mockRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('"content_url" must be a valid uri');
      expect(result.errors).toContain('"content_type" must be one of [url, youtube, pdf, document]');
      expect(result.errors).toContain('"user_note" length must be less than or equal to 500 characters long');
    });

    it('should handle invalid JSON', async () => {
      (mockRequest as any).json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const result = await validateContentSubmission(mockRequest);

      expect(result).toEqual({
        isValid: false,
        errors: ['Invalid JSON in request body']
      });
    });

    it('should validate all supported content types', async () => {
      const contentTypes = ['url', 'youtube', 'pdf', 'document'];
      
      for (const contentType of contentTypes) {
        const data = {
          content_url: 'https://example.com/test',
          content_type: contentType
        };
        (mockRequest as any).json = jest.fn().mockResolvedValue(data);

        const result = await validateContentSubmission(mockRequest);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('validateUrl', () => {
    it('should delegate to ValidationUtils.isValidUrl', () => {
      mockValidationUtils.isValidUrl.mockReturnValue(true);
      
      const result = validateUrl('https://example.com');
      
      expect(result).toBe(true);
      expect(mockValidationUtils.isValidUrl).toHaveBeenCalledWith('https://example.com');
    });

    it('should return false for invalid URLs', () => {
      mockValidationUtils.isValidUrl.mockReturnValue(false);
      
      const result = validateUrl('not-a-url');
      
      expect(result).toBe(false);
      expect(mockValidationUtils.isValidUrl).toHaveBeenCalledWith('not-a-url');
    });
  });

  describe('validateYouTubeUrl', () => {
    it('should delegate to ValidationUtils.isValidYouTubeUrl', () => {
      mockValidationUtils.isValidYouTubeUrl.mockReturnValue(true);
      
      const result = validateYouTubeUrl('https://youtube.com/watch?v=123');
      
      expect(result).toBe(true);
      expect(mockValidationUtils.isValidYouTubeUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=123');
    });

    it('should return false for invalid YouTube URLs', () => {
      mockValidationUtils.isValidYouTubeUrl.mockReturnValue(false);
      
      const result = validateYouTubeUrl('https://example.com');
      
      expect(result).toBe(false);
      expect(mockValidationUtils.isValidYouTubeUrl).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('ValidationResult interface', () => {
    it('should have correct structure for valid result', () => {
      const result: ValidationResult = {
        isValid: true
      };
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should have correct structure for invalid result', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Error message']
      };
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Error message']);
    });
  });
});
