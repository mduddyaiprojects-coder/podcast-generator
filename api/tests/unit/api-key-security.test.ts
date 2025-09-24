import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ApiKeySecurityService } from '../../src/services/api-key-security';

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../src/config/security', () => ({
  securityService: {
    validateApiKey: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    }),
    rotateApiKey: jest.fn()
  }
}));

jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getServiceConfig: jest.fn()
  }
}));

describe('ApiKeySecurityService', () => {
  let apiKeySecurityService: ApiKeySecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    apiKeySecurityService = new ApiKeySecurityService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(apiKeySecurityService).toBeInstanceOf(ApiKeySecurityService);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key for a service', async () => {
      const result = await apiKeySecurityService.validateApiKey('test-service', 'test-key');
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('lastValidated');
      expect(result).toHaveProperty('usageCount');
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('getAlerts', () => {
    it('should return security alerts', () => {
      const alerts = apiKeySecurityService.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getRecentAlerts', () => {
    it('should return recent alerts', () => {
      const alerts = apiKeySecurityService.getRecentAlerts(24);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});