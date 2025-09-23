import { CdnService } from '../../src/services/cdn-service';
import { environmentService } from '../../src/config/environment';

// Mock the CDN management client
jest.mock('@azure/arm-cdn', () => ({
  CdnManagementClient: jest.fn().mockImplementation(() => ({
    profiles: {
      createOrUpdate: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({ name: 'test-profile' })
    },
    endpoints: {
      createOrUpdate: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({ 
        hostName: 'test-endpoint.azureedge.net',
        properties: { hostName: 'test-endpoint.azureedge.net' }
      }),
      purgeContent: jest.fn().mockResolvedValue({})
    }
  }))
}));

// Mock environment service
jest.mock('../../src/config/environment', () => ({
  environmentService: {
    getConfig: jest.fn().mockReturnValue({
      storage: {
        blobStorage: {
          accountName: 'teststorageaccount',
          useManagedIdentity: true
        },
        containerName: 'test-container'
      }
    })
  }
}));

describe('CdnService', () => {
  let cdnService: CdnService;
  let mockCdnClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.AZURE_SUBSCRIPTION_ID = 'test-subscription-id';
    process.env.AZURE_RESOURCE_GROUP_NAME = 'test-rg';
    
    cdnService = new CdnService();
    mockCdnClient = (cdnService as any).client;
  });

  afterEach(() => {
    delete process.env.AZURE_SUBSCRIPTION_ID;
    delete process.env.AZURE_RESOURCE_GROUP_NAME;
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      const config = cdnService.getConfig();
      
      expect(config.subscriptionId).toBe('test-subscription-id');
      expect(config.resourceGroupName).toBe('test-rg');
      expect(config.profileName).toBe('podcast-generator-cdn-dev');
      expect(config.endpointName).toBe('podcast-generator-endpoint-dev');
      expect(config.originHostName).toBe('teststorageaccount.blob.core.windows.net');
    });

    it('should be healthy when properly configured', () => {
      expect(cdnService.checkHealth()).toBe(true);
    });

    it('should be unhealthy when missing required config', () => {
      delete process.env.AZURE_SUBSCRIPTION_ID;
      const unhealthyService = new CdnService();
      expect(unhealthyService.checkHealth()).toBe(false);
    });
  });

  describe('createOrUpdateProfile', () => {
    it('should create CDN profile successfully', async () => {
      await cdnService.createOrUpdateProfile('Standard_Microsoft');
      
      expect(mockCdnClient.profiles.createOrUpdate).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        expect.objectContaining({
          location: 'Global',
          sku: { name: 'Standard_Microsoft' },
          tags: expect.objectContaining({
            purpose: 'podcast-generator-cdn'
          })
        })
      );
    });

    it('should handle different SKU types', async () => {
      await cdnService.createOrUpdateProfile('Premium_Verizon');
      
      expect(mockCdnClient.profiles.createOrUpdate).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        expect.objectContaining({
          sku: { name: 'Premium_Verizon' }
        })
      );
    });
  });

  describe('createOrUpdateEndpoint', () => {
    it('should create CDN endpoint with default configuration', async () => {
      await cdnService.createOrUpdateEndpoint();
      
      expect(mockCdnClient.endpoints.createOrUpdate).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        'podcast-generator-endpoint-dev',
        expect.objectContaining({
          location: 'Global',
          isHttpsEnabled: true,
          isHttpAllowed: false,
          isCompressionEnabled: true,
          queryStringCachingBehavior: 'IgnoreQueryString',
          origins: expect.arrayContaining([
            expect.objectContaining({
              name: 'blob-storage-origin',
              hostName: 'teststorageaccount.blob.core.windows.net'
            })
          ])
        })
      );
    });

    it('should create CDN endpoint with custom configuration', async () => {
      const customConfig = {
        isHttpsEnabled: false,
        isHttpAllowed: true,
        compressionEnabled: false
      };
      
      await cdnService.createOrUpdateEndpoint(customConfig);
      
      expect(mockCdnClient.endpoints.createOrUpdate).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        'podcast-generator-endpoint-dev',
        expect.objectContaining({
          isHttpsEnabled: false,
          isHttpAllowed: true,
          isCompressionEnabled: false
        })
      );
    });
  });

  describe('getEndpointUrl', () => {
    it('should return CDN endpoint URL', async () => {
      const url = await cdnService.getEndpointUrl();
      
      expect(url).toBe('https://test-endpoint.azureedge.net');
      expect(mockCdnClient.endpoints.get).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        'podcast-generator-endpoint-dev'
      );
    });

    it('should throw error when hostname not found', async () => {
      mockCdnClient.endpoints.get.mockResolvedValueOnce({});
      
      await expect(cdnService.getEndpointUrl()).rejects.toThrow('CDN endpoint hostname not found');
    });
  });

  describe('purgeCache', () => {
    it('should purge CDN cache successfully', async () => {
      const purgeConfig = {
        contentPaths: ['/audio/test.mp3', '/transcripts/test.txt'],
        domains: ['test-endpoint.azureedge.net']
      };
      
      await cdnService.purgeCache(purgeConfig);
      
      expect(mockCdnClient.endpoints.purgeContent).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        'podcast-generator-endpoint-dev',
        purgeConfig
      );
    });
  });

  describe('purgeSubmissionContent', () => {
    it('should purge all content for a submission', async () => {
      const submissionId = 'test-submission-123';
      
      await cdnService.purgeSubmissionContent(submissionId);
      
      expect(mockCdnClient.endpoints.purgeContent).toHaveBeenCalledWith(
        'test-rg',
        'podcast-generator-cdn-dev',
        'podcast-generator-endpoint-dev',
        {
          contentPaths: [
            `/audio/${submissionId}.mp3`,
            `/transcripts/${submissionId}.txt`,
            `/scripts/${submissionId}.txt`,
            `/summaries/${submissionId}.txt`,
            `/chapters/${submissionId}.json`
          ]
        }
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      
      const analytics = await cdnService.getAnalytics(startDate, endDate);
      
      expect(analytics).toEqual({
        totalRequests: 0,
        totalDataTransferred: 0,
        cacheHitRatio: 0,
        averageResponseTime: 0,
        topCountries: [],
        topUserAgents: []
      });
    });
  });

  describe('getDefaultCacheRules', () => {
    it('should return correct cache rules for different content types', () => {
      const rules = (cdnService as any).getDefaultCacheRules();
      
      expect(rules).toHaveLength(3);
      
      // Audio files rule
      expect(rules[0]).toEqual({
        name: 'audio-cache-rule',
        order: 1,
        conditions: [{
          name: 'UrlPath',
          parameters: {
            operator: 'BeginsWith',
            matchValues: ['/audio/']
          }
        }],
        actions: [{
          name: 'CacheExpiration',
          parameters: {
            cacheBehavior: 'Override',
            cacheDuration: '365.00:00:00'
          }
        }]
      });
      
      // Text files rule
      expect(rules[1]).toEqual({
        name: 'text-cache-rule',
        order: 2,
        conditions: [{
          name: 'UrlPath',
          parameters: {
            operator: 'BeginsWith',
            matchValues: ['/transcripts/', '/scripts/', '/summaries/']
          }
        }],
        actions: [{
          name: 'CacheExpiration',
          parameters: {
            cacheBehavior: 'Override',
            cacheDuration: '7.00:00:00'
          }
        }]
      });
      
      // JSON files rule
      expect(rules[2]).toEqual({
        name: 'json-cache-rule',
        order: 3,
        conditions: [{
          name: 'UrlPath',
          parameters: {
            operator: 'BeginsWith',
            matchValues: ['/chapters/']
          }
        }],
        actions: [{
          name: 'CacheExpiration',
          parameters: {
            cacheBehavior: 'Override',
            cacheDuration: '1.00:00:00'
          }
        }]
      });
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = cdnService.getServiceInfo();
      
      expect(info).toEqual({
        name: 'Azure CDN',
        healthy: true,
        config: {
          subscriptionId: 'test-subscription-id',
          resourceGroupName: 'test-rg',
          profileName: 'podcast-generator-cdn-dev',
          endpointName: 'podcast-generator-endpoint-dev',
          useManagedIdentity: true
        }
      });
    });
  });
});