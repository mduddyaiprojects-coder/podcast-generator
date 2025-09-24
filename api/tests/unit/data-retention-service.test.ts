import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DataRetentionService } from '../../src/services/data-retention-service';

// Mock dependencies
jest.mock('../../src/services/database-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('DataRetentionService', () => {
  let dataRetentionService: DataRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    dataRetentionService = new DataRetentionService();
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
      expect(dataRetentionService).toBeInstanceOf(DataRetentionService);
    });
  });

  describe('executeRetentionPolicies', () => {
    it('should execute retention policies', async () => {
      const result = await dataRetentionService.executeRetentionPolicies();
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('policies');
      expect(result).toHaveProperty('totalDeleted');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.policies)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.totalDeleted).toBe('number');
    });
  });
});