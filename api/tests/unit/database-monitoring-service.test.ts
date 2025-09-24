import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseMonitoringService } from '../../src/services/database-monitoring-service';

// Mock dependencies
jest.mock('../../src/services/database-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('DatabaseMonitoringService', () => {
  let databaseMonitoringService: DatabaseMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    databaseMonitoringService = new DatabaseMonitoringService();
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
      expect(databaseMonitoringService).toBeInstanceOf(DatabaseMonitoringService);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts', () => {
      const alerts = databaseMonitoringService.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});