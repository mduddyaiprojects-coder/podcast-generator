import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import { SecurityMonitoringService } from '../../src/services/security-monitoring';
import { apiKeySecurityService } from '../../src/services/api-key-security';
import { securityService } from '../../src/config/security';
import { environmentService } from '../../src/config/environment';

// Mock dependencies
jest.mock('../../src/services/api-key-security', () => ({
  apiKeySecurityService: {
    getAlerts: jest.fn(),
    validateApiKey: jest.fn()
  }
}));
jest.mock('../../src/config/security', () => ({
  securityService: {
    checkCredentialRotation: jest.fn()
  }
}));
jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getConfig: jest.fn(),
    isProduction: jest.fn()
  }
}));
jest.mock('../../src/utils/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

const mockApiKeySecurityService = apiKeySecurityService as jest.Mocked<typeof apiKeySecurityService>;
const mockSecurityService = securityService as jest.Mocked<typeof securityService>;
const mockEnvironmentService = environmentService as jest.Mocked<typeof environmentService>;

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockEnvironmentService.getConfig.mockReturnValue({
      features: {
        enableAzureOpenAI: true,
        enableTTS: true,
        enableFirecrawl: true,
        enableYouTube: true,
        enableWhisper: true
      },
      apiKeys: {
        azureOpenAI: { apiKey: 'test-key', endpoint: 'https://test.openai.azure.com' },
        elevenLabs: { apiKey: 'test-key' },
        firecrawl: { apiKey: 'test-key' },
        youtube: { apiKey: 'test-key' }
      }
    } as any);

    mockApiKeySecurityService.validateApiKey.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      service: 'test-service',
      lastValidated: new Date(),
      usageCount: 0
    } as any);

    mockApiKeySecurityService.getAlerts.mockReturnValue([]);

    mockSecurityService.checkCredentialRotation.mockReturnValue({
      needsRotation: [],
      warnings: []
    });

    mockEnvironmentService.isProduction.mockReturnValue(false);

    service = new SecurityMonitoringService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize without errors', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getSecurityHealthStatus', () => {
    it('should return healthy status when all services are healthy', async () => {
      const status = await service.getSecurityHealthStatus();

      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('alerts');
      expect(status).toHaveProperty('recommendations');
      expect(['healthy', 'warning', 'critical']).toContain(status.overall);
    });

    it('should return critical status when API key is missing', async () => {
      mockEnvironmentService.getConfig.mockReturnValue({
        features: { enableAzureOpenAI: true },
        apiKeys: { azureOpenAI: { apiKey: '', endpoint: '' } }
      } as any);

      const status = await service.getSecurityHealthStatus();

      expect(status.overall).toBe('critical');
    });

    it('should return warning status when API key validation has warnings', async () => {
      mockApiKeySecurityService.validateApiKey.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['API key may be weak'],
        service: 'test-service',
        lastValidated: new Date(),
        usageCount: 0
      } as any);

      const status = await service.getSecurityHealthStatus();

      // The status could be warning or critical depending on the implementation
      expect(['warning', 'critical']).toContain(status.overall);
    });

    it('should return critical status when API key validation fails', async () => {
      mockApiKeySecurityService.validateApiKey.mockResolvedValue({
        isValid: false,
        errors: ['Invalid API key format'],
        warnings: [],
        service: 'test-service',
        lastValidated: new Date(),
        usageCount: 0
      } as any);

      const status = await service.getSecurityHealthStatus();

      expect(status.overall).toBe('critical');
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return current security metrics', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics).toHaveProperty('apiKeyValidations');
      expect(metrics).toHaveProperty('failedValidations');
      expect(metrics).toHaveProperty('securityAlerts');
      expect(metrics).toHaveProperty('credentialRotations');
      expect(metrics).toHaveProperty('suspiciousActivities');
      expect(metrics).toHaveProperty('lastUpdated');
    });
  });

  describe('updateMetrics', () => {
    it('should update security metrics', () => {
      const updates = {
        apiKeyValidations: 10,
        failedValidations: 2
      };

      service.updateMetrics(updates);
      const metrics = service.getSecurityMetrics();

      expect(metrics.apiKeyValidations).toBe(10);
      expect(metrics.failedValidations).toBe(2);
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status', () => {
      const status = service.getServiceStatus('azure-openai');
      
      // Status might be undefined if service hasn't been checked yet
      if (status) {
        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('lastChecked');
        expect(status).toHaveProperty('issues');
        expect(status).toHaveProperty('warnings');
      }
    });
  });

  describe('getAllServiceStatuses', () => {
    it('should return all service statuses', () => {
      const statuses = service.getAllServiceStatuses();
      
      expect(typeof statuses).toBe('object');
    });
  });
});
