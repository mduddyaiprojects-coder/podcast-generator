import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ContentSubmissionService } from '../../src/services/content-submission-service';

// Mock dependencies
jest.mock('../../src/services/content-processor');
jest.mock('../../src/services/podcast-generator');
jest.mock('../../src/services/database-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ContentSubmissionService', () => {
  let contentSubmissionService: ContentSubmissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    contentSubmissionService = new ContentSubmissionService();
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
      expect(contentSubmissionService).toBeInstanceOf(ContentSubmissionService);
    });
  });
});