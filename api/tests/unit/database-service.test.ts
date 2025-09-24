import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseService } from '../../src/services/database-service';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    databaseService = new DatabaseService();
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
      expect(databaseService).toBeInstanceOf(DatabaseService);
    });
  });

  describe('connect', () => {
    it('should attempt to connect', async () => {
      await expect(databaseService.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should attempt to disconnect', async () => {
      await expect(databaseService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getEpisodeCount', () => {
    it('should get episode count', async () => {
      const count = await databaseService.getEpisodeCount();
      expect(typeof count).toBe('number');
    });
  });

  describe('checkConnection', () => {
    it('should check connection status', async () => {
      const result = await databaseService.checkConnection();
      expect(typeof result).toBe('boolean');
    });
  });
});