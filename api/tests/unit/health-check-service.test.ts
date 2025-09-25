import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HealthCheckService } from '../../src/services/health-check-service';

// Mock dependencies
jest.mock('../../src/services/azure-openai-service');
jest.mock('../../src/services/elevenlabs-service');
jest.mock('../../src/services/firecrawl-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    jest.clearAllMocks();
    healthCheckService = new HealthCheckService();
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
      expect(healthCheckService).toBeInstanceOf(HealthCheckService);
    });
  });

  describe('checkHealth', () => {
    it('should return health status structure', async () => {
      const result = await healthCheckService.checkHealth();
      
      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('services');
      expect(typeof result.isHealthy).toBe('boolean');
    });
  });
});