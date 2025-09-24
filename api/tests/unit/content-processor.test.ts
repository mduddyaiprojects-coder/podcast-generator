import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ContentProcessor } from '../../src/services/content-processor';

// Mock dependencies
jest.mock('../../src/services/firecrawl-service');
jest.mock('../../src/services/azure-openai-service');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ContentProcessor', () => {
  let contentProcessor: ContentProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    contentProcessor = new ContentProcessor();
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
      expect(contentProcessor).toBeInstanceOf(ContentProcessor);
    });
  });
});