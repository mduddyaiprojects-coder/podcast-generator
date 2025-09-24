import { CdnManagementClient } from '@azure/arm-cdn';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../utils/logger';
import { environmentService } from '../config/environment';

/**
 * CDN configuration interface
 */
export interface CdnConfig {
  subscriptionId: string;
  resourceGroupName: string;
  profileName: string;
  endpointName: string;
  originHostName: string;
  originPath?: string;
  customDomain?: string;
  useManagedIdentity: boolean;
}

/**
 * CDN endpoint configuration
 */
export interface CdnEndpointConfig {
  name: string;
  hostName: string;
  isHttpsEnabled: boolean;
  isHttpAllowed: boolean;
  originPath?: string;
  queryStringCachingBehavior: 'IgnoreQueryString' | 'BypassCaching' | 'UseQueryString';
  compressionEnabled: boolean;
  contentTypesToCompress: string[];
  cacheRules: CdnCacheRule[];
}

/**
 * CDN cache rule configuration
 */
export interface CdnCacheRule {
  name: string;
  order: number;
  conditions: CdnCacheCondition[];
  actions: CdnCacheAction[];
}

/**
 * CDN cache condition
 */
export interface CdnCacheCondition {
  name: 'UrlPath' | 'RequestHeader' | 'QueryString' | 'RequestMethod' | 'RequestScheme' | 'RequestBody' | 'RequestUri' | 'IsDevice' | 'RemoteAddr' | 'SocketAddr';
  parameters: {
    operator: 'Any' | 'Equal' | 'Contains' | 'BeginsWith' | 'EndsWith' | 'LessThan' | 'LessThanOrEqual' | 'GreaterThan' | 'GreaterThanOrEqual' | 'RegEx';
    negateCondition?: boolean;
    matchValues?: string[];
    transforms?: string[];
  };
}

/**
 * CDN cache action
 */
export interface CdnCacheAction {
  name: 'CacheExpiration' | 'ModifyRequestHeader' | 'ModifyResponseHeader' | 'UrlRedirect' | 'UrlRewrite';
  parameters: {
    cacheBehavior?: 'BypassCache' | 'Override' | 'SetIfMissing';
    cacheDuration?: string;
    headerAction?: 'Append' | 'Overwrite' | 'Delete';
    headerName?: string;
    headerValue?: string;
    redirectType?: 'Moved' | 'Found' | 'TemporaryRedirect' | 'PermanentRedirect';
    redirectProtocol?: 'MatchRequest' | 'Http' | 'Https';
    customPath?: string;
    customQueryString?: string;
    customFragment?: string;
    destination?: string;
    sourcePattern?: string;
  };
}

/**
 * CDN purge configuration
 */
export interface CdnPurgeConfig {
  contentPaths: string[];
  domains?: string[];
}

/**
 * CDN analytics data
 */
export interface CdnAnalytics {
  totalRequests: number;
  totalDataTransferred: number;
  cacheHitRatio: number;
  averageResponseTime: number;
  topCountries: Array<{ country: string; requests: number }>;
  topUserAgents: Array<{ userAgent: string; requests: number }>;
}

/**
 * Azure CDN service for managing content delivery
 */
export class CdnService {
  private client!: CdnManagementClient;
  private config: CdnConfig;
  private isHealthy: boolean = true;

  constructor() {
    const envConfig = environmentService.getConfig();
    this.config = {
      subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'] || '',
      resourceGroupName: process.env['AZURE_RESOURCE_GROUP_NAME'] || '',
      profileName: process.env['CDN_PROFILE_NAME'] || 'podcast-generator-cdn',
      endpointName: process.env['CDN_ENDPOINT_NAME'] || 'podcast-generator-endpoint',
      originHostName: envConfig.storage.blobStorage.accountName 
        ? `${envConfig.storage.blobStorage.accountName}.blob.core.windows.net`
        : '',
      originPath: `/${envConfig.storage.containerName}`,
      customDomain: process.env['CDN_CUSTOM_DOMAIN'],
      useManagedIdentity: envConfig.storage.blobStorage.useManagedIdentity
    };

    if (!this.config.subscriptionId || !this.config.resourceGroupName) {
      logger.warn('Azure CDN not configured - service will not function');
      this.isHealthy = false;
      return;
    }

    try {
      this.client = this.createCdnClient();
      logger.info('Azure CDN service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure CDN service', { error });
      this.isHealthy = false;
    }
  }

  /**
   * Create CDN management client with appropriate authentication
   */
  private createCdnClient(): CdnManagementClient {
    if (this.config.useManagedIdentity) {
      // Use Managed Identity (recommended for production)
      const credential = new DefaultAzureCredential();
      return new CdnManagementClient(credential, this.config.subscriptionId);
    } else {
      throw new Error('CDN service requires Managed Identity authentication');
    }
  }

  /**
   * Create or update CDN profile
   */
  async createOrUpdateProfile(sku: 'Standard_Microsoft' | 'Standard_Akamai' | 'Standard_Verizon' | 'Premium_Verizon' = 'Standard_Microsoft'): Promise<void> {
    try {
      await this.client.profiles.beginCreateAndWait(
        this.config.resourceGroupName,
        this.config.profileName,
        {
          location: 'Global',
          sku: { name: sku },
          tags: {
            purpose: 'podcast-generator-cdn',
            created: new Date().toISOString()
          }
        }
      );

      logger.info(`CDN profile '${this.config.profileName}' created or updated successfully`);
    } catch (error) {
      logger.error(`Failed to create/update CDN profile '${this.config.profileName}'`, { error });
      throw error;
    }
  }

  /**
   * Create or update CDN endpoint
   */
  async createOrUpdateEndpoint(config: Partial<CdnEndpointConfig> = {}): Promise<void> {
    try {
      const defaultConfig: CdnEndpointConfig = {
        name: this.config.endpointName,
        hostName: this.config.originHostName,
        isHttpsEnabled: true,
        isHttpAllowed: false,
        originPath: this.config.originPath,
        queryStringCachingBehavior: 'IgnoreQueryString',
        compressionEnabled: true,
        contentTypesToCompress: [
          'text/plain',
          'text/html',
          'text/css',
          'text/javascript',
          'application/javascript',
          'application/json',
          'application/xml',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg'
        ],
        cacheRules: this.getDefaultCacheRules(),
        ...config
      };

      await this.client.endpoints.beginCreateAndWait(
        this.config.resourceGroupName,
        this.config.profileName,
        this.config.endpointName,
        {
          location: 'Global',
          origins: [{
            name: 'blob-storage-origin',
            hostName: this.config.originHostName,
            httpPort: 80,
            httpsPort: 443,
            originHostHeader: this.config.originHostName,
            priority: 1,
            weight: 1000,
            enabled: true
          }],
          // isHttpsEnabled: defaultConfig.isHttpsEnabled, // Property not available in current API version
          isHttpAllowed: defaultConfig.isHttpAllowed,
          queryStringCachingBehavior: defaultConfig.queryStringCachingBehavior,
          isCompressionEnabled: defaultConfig.compressionEnabled,
          contentTypesToCompress: defaultConfig.contentTypesToCompress,
          tags: {
            purpose: 'podcast-generator-cdn',
            created: new Date().toISOString()
          }
        }
      );

      logger.info(`CDN endpoint '${this.config.endpointName}' created or updated successfully`);
    } catch (error) {
      logger.error(`Failed to create/update CDN endpoint '${this.config.endpointName}'`, { error });
      throw error;
    }
  }

  /**
   * Get default cache rules for podcast content
   */
  private getDefaultCacheRules(): CdnCacheRule[] {
    return [
      // Audio files - long cache
      {
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
            cacheDuration: '365.00:00:00' // 1 year
          }
        }]
      },
      // Transcripts and scripts - medium cache
      {
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
            cacheDuration: '7.00:00:00' // 7 days
          }
        }]
      },
      // Chapter markers - short cache
      {
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
            cacheDuration: '1.00:00:00' // 1 day
          }
        }]
      }
    ];
  }

  /**
   * Get CDN endpoint URL
   */
  async getEndpointUrl(): Promise<string> {
    try {
      const endpoint = await this.client.endpoints.get(
        this.config.resourceGroupName,
        this.config.profileName,
        this.config.endpointName
      );

      const hostName = endpoint.hostName;
      if (!hostName) {
        throw new Error('CDN endpoint hostname not found');
      }

      return `https://${hostName}`;
    } catch (error) {
      logger.error('Failed to get CDN endpoint URL', { error });
      throw error;
    }
  }

  /**
   * Purge CDN cache
   */
  async purgeCache(config: CdnPurgeConfig): Promise<void> {
    try {
      await this.client.endpoints.beginPurgeContentAndWait(
        this.config.resourceGroupName,
        this.config.profileName,
        this.config.endpointName,
        {
          contentPaths: config.contentPaths
          // domains: config.domains // Property not available in current API version
        }
      );

      logger.info('CDN cache purged successfully', {
        contentPaths: config.contentPaths,
        domains: config.domains
      });
    } catch (error) {
      logger.error('Failed to purge CDN cache', { error });
      throw error;
    }
  }

  /**
   * Purge all content for a submission
   */
  async purgeSubmissionContent(submissionId: string): Promise<void> {
    const contentPaths = [
      `/audio/${submissionId}.mp3`,
      `/transcripts/${submissionId}.txt`,
      `/scripts/${submissionId}.txt`,
      `/summaries/${submissionId}.txt`,
      `/chapters/${submissionId}.json`
    ];

    await this.purgeCache({ contentPaths });
  }

  /**
   * Get CDN analytics (requires Premium Verizon SKU)
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<CdnAnalytics> {
    try {
      // This is a simplified implementation
      // In practice, you'd use the CDN Analytics API
      const analytics: CdnAnalytics = {
        totalRequests: 0,
        totalDataTransferred: 0,
        cacheHitRatio: 0,
        averageResponseTime: 0,
        topCountries: [],
        topUserAgents: []
      };

      logger.info('CDN analytics retrieved', {
        startDate,
        endDate,
        analytics
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to get CDN analytics', { error });
      throw error;
    }
  }

  /**
   * Check if CDN service is healthy
   */
  checkHealth(): boolean {
    return this.isHealthy;
  }

  /**
   * Get service information
   */
  getServiceInfo(): { name: string; healthy: boolean; config: Partial<CdnConfig> } {
    return {
      name: 'Azure CDN',
      healthy: this.isHealthy,
      config: {
        subscriptionId: this.config.subscriptionId,
        resourceGroupName: this.config.resourceGroupName,
        profileName: this.config.profileName,
        endpointName: this.config.endpointName,
        useManagedIdentity: this.config.useManagedIdentity
      }
    };
  }

  /**
   * Get CDN configuration
   */
  getConfig(): CdnConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const cdnService = new CdnService();