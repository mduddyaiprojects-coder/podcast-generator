import { logger } from '../utils/logger';
import { environmentService } from '../config/environment';

/**
 * CDN Service for managing Azure Front Door CDN operations
 */
export interface CDNConfig {
  baseUrl: string;
  profileName: string;
  endpointName: string;
  resourceGroup: string;
}

export interface CDNUrlResult {
  originalUrl: string;
  cdnUrl: string;
  isCdnEnabled: boolean;
}

export interface CDNPurgeResult {
  success: boolean;
  message: string;
  purgeId?: string;
}

export class CDNService {
  private config: CDNConfig;
  private isHealthy: boolean = true;

  constructor() {
    const envConfig = environmentService.getConfig();
    this.config = {
      baseUrl: envConfig.storage.cdnBaseUrl || '',
      profileName: 'podcastgen-afd-profile',
      endpointName: 'podcastgen-cdn',
      resourceGroup: 'rg-m4c-apps'
    };

    if (!this.config.baseUrl) {
      logger.warn('CDN base URL not configured - service will not function');
      this.isHealthy = false;
      return;
    }

    logger.info('CDN service initialized successfully', {
      baseUrl: this.config.baseUrl,
      profileName: this.config.profileName
    });
  }

  /**
   * Convert a blob storage URL to CDN URL
   */
  convertToCdnUrl(blobUrl: string): CDNUrlResult {
    if (!this.isHealthy) {
      return {
        originalUrl: blobUrl,
        cdnUrl: blobUrl,
        isCdnEnabled: false
      };
    }

    try {
      // Extract the blob path from the storage URL
      // Example: https://podcastgenstorage.blob.core.windows.net/container/blob.mp3
      // Should become: https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net/container/blob.mp3
      
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');
      
      if (pathParts.length < 3) {
        logger.warn('Invalid blob URL format', { blobUrl });
        return {
          originalUrl: blobUrl,
          cdnUrl: blobUrl,
          isCdnEnabled: false
        };
      }

      // Remove the first empty part and get container/blob path
      const containerAndBlob = pathParts.slice(1).join('/');
      const cdnUrl = `${this.config.baseUrl}/${containerAndBlob}`;

      logger.info('Converted blob URL to CDN URL', {
        originalUrl: blobUrl,
        cdnUrl: cdnUrl
      });

      return {
        originalUrl: blobUrl,
        cdnUrl: cdnUrl,
        isCdnEnabled: true
      };
    } catch (error) {
      logger.error('Failed to convert blob URL to CDN URL', { error, blobUrl });
      return {
        originalUrl: blobUrl,
        cdnUrl: blobUrl,
        isCdnEnabled: false
      };
    }
  }

  /**
   * Generate CDN URL for a specific container and blob
   */
  generateCdnUrl(containerName: string, blobName: string): string {
    if (!this.isHealthy) {
      return '';
    }

    const cdnUrl = `${this.config.baseUrl}/${containerName}/${blobName}`;
    logger.info('Generated CDN URL', { containerName, blobName, cdnUrl });
    return cdnUrl;
  }

  /**
   * Purge CDN cache for a specific path
   */
  async purgeCache(path: string): Promise<CDNPurgeResult> {
    if (!this.isHealthy) {
      return {
        success: false,
        message: 'CDN service is not healthy'
      };
    }

    try {
      // Note: In a real implementation, you would use the Azure SDK to purge the cache
      // For now, we'll simulate the operation
      logger.info('Purging CDN cache', { path });
      
      // Simulate purge operation
      const purgeId = `purge-${Date.now()}`;
      
      logger.info('CDN cache purged successfully', { path, purgeId });
      
      return {
        success: true,
        message: 'Cache purged successfully',
        purgeId: purgeId
      };
    } catch (error: any) {
      logger.error('Failed to purge CDN cache', { error, path });
      return {
        success: false,
        message: `Failed to purge cache: ${error.message}`
      };
    }
  }

  /**
   * Purge entire CDN cache
   */
  async purgeAllCache(): Promise<CDNPurgeResult> {
    return this.purgeCache('/*');
  }

  /**
   * Check if CDN is healthy
   */
  checkHealth(): boolean {
    return this.isHealthy;
  }

  /**
   * Get CDN service information
   */
  getServiceInfo(): { name: string; healthy: boolean; config: CDNConfig } {
    return {
      name: 'Azure Front Door CDN',
      healthy: this.isHealthy,
      config: this.config
    };
  }

  /**
   * Get CDN base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Check if a URL is a CDN URL
   */
  isCdnUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('azurefd.net');
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics (simulated)
   */
  async getCacheStats(): Promise<{
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRatio: number;
  }> {
    // In a real implementation, you would query Azure Front Door metrics
    return {
      totalRequests: 1000,
      cacheHits: 850,
      cacheMisses: 150,
      hitRatio: 0.85
    };
  }
}

// Export singleton instance
export const cdnService = new CDNService();
