import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AzureOpenAIService } from '../../src/services/azure-openai-service';

// Mock the OpenAI client
jest.mock('openai', () => ({
  AzureOpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe('AzureOpenAIService', () => {
  let azureOpenAIService: AzureOpenAIService;
  let mockClient: any;

  beforeEach(() => {
    // Reset environment variables
    process.env['AZURE_OPENAI_ENDPOINT'] = 'https://test.openai.azure.com';
    process.env['AZURE_OPENAI_API_KEY'] = 'test-api-key';
    process.env['AZURE_OPENAI_API_VERSION'] = '2024-02-15-preview';
    process.env['AZURE_OPENAI_DEPLOYMENT_NAME'] = 'gpt-4';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked AzureOpenAI
    const { AzureOpenAI } = require('openai');
    mockClient = new AzureOpenAI();
    
    // Set up the mock to return the mock client
    (AzureOpenAI as jest.Mock).mockImplementation(() => mockClient);
    
    azureOpenAIService = new AzureOpenAIService();
  });

  describe('constructor', () => {
    it('should initialize with configuration from environment', () => {
      expect(azureOpenAIService.getConfig().endpoint).toBe('https://test.openai.azure.com');
      expect(azureOpenAIService.getConfig().apiVersion).toBe('2024-02-15-preview');
      expect(azureOpenAIService.getConfig().deploymentName).toBe('gpt-4');
      expect(azureOpenAIService.getHealthStatus()).toBe(true);
    });

    it('should handle missing configuration', () => {
      delete process.env['AZURE_OPENAI_ENDPOINT'];
      delete process.env['AZURE_OPENAI_API_KEY'];
      
      const service = new AzureOpenAIService();
      expect(service.getHealthStatus()).toBe(false);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test summary of the provided content.'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const content = 'This is a long article about artificial intelligence and machine learning...';
      const result = await azureOpenAIService.generateSummary(content);

      expect(result).toBe('This is a test summary of the provided content.');
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('helpful assistant that creates concise')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(content)
            })
          ]),
          max_tokens: 200,
          temperature: 0.7,
          top_p: 0.9
        })
      );
    });

    it('should handle missing API configuration', async () => {
      delete process.env['AZURE_OPENAI_ENDPOINT'];
      const service = new AzureOpenAIService();

      await expect(service.generateSummary('test content'))
        .rejects.toThrow('Azure OpenAI service not configured or unhealthy');
    });

    it('should handle API errors', async () => {
      mockClient.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(azureOpenAIService.generateSummary('test content'))
        .rejects.toThrow('Summary generation failed: API Error');
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(azureOpenAIService.generateSummary('test content'))
        .rejects.toThrow('No summary generated from Azure OpenAI');
    });
  });

  describe('generatePodcastScript', () => {
    it('should generate podcast script successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Welcome to today\'s podcast. Today we\'re discussing artificial intelligence...'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const content = {
        title: 'AI Revolution',
        content: 'This is about artificial intelligence...',
        summary: 'A brief summary of AI developments',
        metadata: {}
      };

      const result = await azureOpenAIService.generatePodcastScript(content);

      expect(result).toBe('Welcome to today\'s podcast. Today we\'re discussing artificial intelligence...');
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('professional podcast host')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Title: AI Revolution')
            })
          ]),
          max_tokens: 800,
          temperature: 0.8,
          top_p: 0.9
        })
      );
    });

    it('should handle missing API configuration', async () => {
      delete process.env['AZURE_OPENAI_ENDPOINT'];
      const service = new AzureOpenAIService();

      const content = {
        title: 'Test',
        content: 'Test content',
        summary: 'Test summary'
      };

      await expect(service.generatePodcastScript(content))
        .rejects.toThrow('Azure OpenAI service not configured or unhealthy');
    });

    it('should handle API errors', async () => {
      mockClient.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const content = {
        title: 'Test',
        content: 'Test content',
        summary: 'Test summary'
      };

      await expect(azureOpenAIService.generatePodcastScript(content))
        .rejects.toThrow('Podcast script generation failed: API Error');
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const content = {
        title: 'Test',
        content: 'Test content',
        summary: 'Test summary'
      };

      await expect(azureOpenAIService.generatePodcastScript(content))
        .rejects.toThrow('No podcast script generated from Azure OpenAI');
    });
  });

  describe('checkHealth', () => {
    it('should return true when service is healthy', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'OK'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const isHealthy = await azureOpenAIService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello, please respond with "OK" to confirm the service is working.'
            })
          ]),
          max_tokens: 10,
          temperature: 0
        })
      );
    });

    it('should return false when service is unhealthy', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Error'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const isHealthy = await azureOpenAIService.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when API throws exception', async () => {
      mockClient.chat.completions.create.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await azureOpenAIService.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when service is not configured', async () => {
      delete process.env['AZURE_OPENAI_ENDPOINT'];
      const service = new AzureOpenAIService();

      const isHealthy = await service.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      expect(azureOpenAIService.getHealthStatus()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return configuration without API key', () => {
      const config = azureOpenAIService.getConfig();
      
      expect(config).toEqual({
        endpoint: 'https://test.openai.azure.com',
        apiVersion: '2024-02-15-preview',
        deploymentName: 'gpt-4'
      });
      expect(config).not.toHaveProperty('apiKey');
    });
  });
});
