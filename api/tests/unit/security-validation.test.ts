/**
 * T024 Security Tests
 * Quick unit tests to verify security checks in branding-put
 */

import { describe, it, expect } from '@jest/globals';

// Mock the security check function logic (would import from branding-put if exported)
function performSecurityChecks(imageUrl: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const url = new URL(imageUrl);

    // Must use HTTPS protocol
    if (url.protocol !== 'https:') {
      errors.push('Image URL must use HTTPS protocol for security');
    }

    // Check for suspicious patterns
    // Prevent localhost/private IPs
    const hostname = url.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^0\.0\.0\.0$/,
      /^\[::\]$/,
      /^::1$/
    ];

    if (privatePatterns.some(pattern => pattern.test(hostname))) {
      errors.push('Image URL cannot point to private/local network addresses');
    }

    // Check for valid file extension
    const pathname = url.pathname.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));

    if (!hasValidExtension) {
      errors.push('Image must be JPEG or PNG format (.jpg, .jpeg, or .png)');
    }

    // Prevent data URLs and javascript pseudo-protocol
    if (imageUrl.toLowerCase().startsWith('data:') || 
        imageUrl.toLowerCase().startsWith('javascript:')) {
      errors.push('Image URL cannot use data or javascript protocols');
    }

    // Check URL length for DoS protection
    if (imageUrl.length > 2048) {
      errors.push('Image URL exceeds maximum length of 2048 characters');
    }

  } catch (error) {
    errors.push('Image URL must be a valid URL');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('T024 Security Validation Tests', () => {
  describe('Valid URLs', () => {
    it('should accept valid HTTPS URL with JPEG', () => {
      const result = performSecurityChecks('https://example.com/image.jpg');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid HTTPS URL with PNG', () => {
      const result = performSecurityChecks('https://example.com/image.png');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept HTTPS URL with path segments', () => {
      const result = performSecurityChecks('https://cdn.example.com/assets/images/podcast.jpg');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept HTTPS URL with query parameters', () => {
      const result = performSecurityChecks('https://example.com/image.jpg?size=large');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Protocol Security', () => {
    it('should reject HTTP URLs', () => {
      const result = performSecurityChecks('http://example.com/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL must use HTTPS protocol for security');
    });

    it('should reject data URLs', () => {
      const result = performSecurityChecks('data:image/png;base64,iVBORw0KG...');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot use data or javascript protocols');
    });

    it('should reject javascript pseudo-protocol', () => {
      const result = performSecurityChecks('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot use data or javascript protocols');
    });
  });

  describe('SSRF Protection', () => {
    it('should reject localhost', () => {
      const result = performSecurityChecks('https://localhost/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot point to private/local network addresses');
    });

    it('should reject 127.0.0.1', () => {
      const result = performSecurityChecks('https://127.0.0.1/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot point to private/local network addresses');
    });

    it('should reject 192.168.x.x', () => {
      const result = performSecurityChecks('https://192.168.1.1/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot point to private/local network addresses');
    });

    it('should reject 10.x.x.x', () => {
      const result = performSecurityChecks('https://10.0.0.1/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot point to private/local network addresses');
    });

    it('should reject 172.16-31.x.x', () => {
      const result = performSecurityChecks('https://172.16.0.1/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL cannot point to private/local network addresses');
    });
  });

  describe('File Format Validation', () => {
    it('should reject unsupported image formats', () => {
      const result = performSecurityChecks('https://example.com/image.gif');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image must be JPEG or PNG format (.jpg, .jpeg, or .png)');
    });

    it('should reject non-image files', () => {
      const result = performSecurityChecks('https://example.com/file.pdf');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image must be JPEG or PNG format (.jpg, .jpeg, or .png)');
    });

    it('should accept .jpeg extension', () => {
      const result = performSecurityChecks('https://example.com/image.jpeg');
      expect(result.valid).toBe(true);
    });

    it('should accept uppercase extensions', () => {
      const result = performSecurityChecks('https://example.com/image.JPG');
      expect(result.valid).toBe(true);
    });
  });

  describe('DoS Protection', () => {
    it('should reject URLs longer than 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2040) + '.jpg';
      const result = performSecurityChecks(longUrl);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL exceeds maximum length of 2048 characters');
    });

    it('should accept URLs at the limit', () => {
      const url = 'https://example.com/' + 'a'.repeat(2000) + '.jpg';
      const result = performSecurityChecks(url);
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    it('should reject malformed URLs', () => {
      const result = performSecurityChecks('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL must be a valid URL');
    });

    it('should reject empty strings', () => {
      const result = performSecurityChecks('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image URL must be a valid URL');
    });
  });

  describe('Multiple Violations', () => {
    it('should report all violations', () => {
      const result = performSecurityChecks('http://localhost/file.gif');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Image URL must use HTTPS protocol for security');
      expect(result.errors).toContain('Image URL cannot point to private/local network addresses');
      expect(result.errors).toContain('Image must be JPEG or PNG format (.jpg, .jpeg, or .png)');
    });
  });
});
