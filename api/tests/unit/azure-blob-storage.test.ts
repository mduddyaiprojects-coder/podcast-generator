import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AzureBlobStorageService } from '../../src/services/azure-blob-storage';

// Mock Azure Storage Blob
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn(() => ({
      getContainerClient: jest.fn(() => ({}))
    }))
  },
  ContainerClient: jest.fn()
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('AzureBlobStorageService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['AZURE_STORAGE_CONNECTION_STRING'] = 'test-connection-string';
    process.env['AZURE_STORAGE_CONTAINER_NAME'] = 'test-container';
    process.env['CDN_BASE_URL'] = 'https://test-cdn.com';
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
    it('should initialize with connection string', () => {
      expect(() => new AzureBlobStorageService()).not.toThrow();
    });

    it('should throw error when connection string is missing', () => {
      delete process.env['AZURE_STORAGE_CONNECTION_STRING'];
      expect(() => new AzureBlobStorageService()).toThrow('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    });
  });
});