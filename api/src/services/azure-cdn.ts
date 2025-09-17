import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface CDNConfiguration {
  baseUrl: string;
  cacheControl: string;
  defaultTtl: number;
  maxTtl: number;
  compressionEnabled: boolean;
  httpsRedirect: boolean;
}

export interface CachePurgeResult {
  success: boolean;
  purgedUrls?: string[];
  error?: string;
}

export class AzureCDNService {
  private cdnClient: AxiosInstance;
  private configuration: CDNConfiguration;

  constructor() {
    this.configuration = {
      baseUrl: process.env['CDN_BASE_URL'] || '',
      cacheControl: process.env['CDN_CACHE_CONTROL'] || 'public, max-age=3600',
      defaultTtl: parseInt(process.env['CDN_DEFAULT_TTL'] || '3600'),
      maxTtl: parseInt(process.env['CDN_MAX_TTL'] || '86400'),
      compressionEnabled: process.env['CDN_COMPRESSION_ENABLED'] === 'true',
      httpsRedirect: process.env['CDN_HTTPS_REDIRECT'] === 'true'
    };

    this.cdnClient = axios.create({
      baseURL: this.configuration.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Podcast-Generator-API/1.0'
      }
    });
  }

  /**
   * Get the CDN URL for a given path
   */
  getCdnUrl(path: string): string {
    if (!this.configuration.baseUrl) {
      logger.warn('CDN base URL not configured, returning original path');
      return path;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${this.configuration.baseUrl}/${cleanPath}`;
  }

  /**
   * Get cache headers for different content types
   */
  getCacheHeaders(contentType: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Cache-Control': this.getCacheControlForContentType(contentType),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    };

    if (this.configuration.compressionEnabled) {
      headers['Vary'] = 'Accept-Encoding';
    }

    if (this.configuration.httpsRedirect) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }

  /**
   * Get cache control header based on content type
   */
  private getCacheControlForContentType(contentType: string): string {
    if (contentType.startsWith('audio/')) {
      // Audio files can be cached longer
      return `public, max-age=${this.configuration.maxTtl}, immutable`;
    } else if (contentType.startsWith('image/')) {
      // Images can be cached for a long time
      return `public, max-age=${this.configuration.maxTtl}, immutable`;
    } else if (contentType.includes('xml') || contentType.includes('rss')) {
      // RSS feeds should have shorter cache time
      return `public, max-age=300, must-revalidate`;
    } else if (contentType.includes('json')) {
      // JSON responses should have moderate cache time
      return `public, max-age=${this.configuration.defaultTtl}`;
    } else {
      // Default cache control
      return this.configuration.cacheControl;
    }
  }

  /**
   * Purge cache for specific URLs
   */
  async purgeCache(urls: string[]): Promise<CachePurgeResult> {
    try {
      if (!this.configuration.baseUrl) {
        return {
          success: false,
          error: 'CDN base URL not configured'
        };
      }

      // For Azure CDN, we would typically use the Azure Management API
      // This is a simplified implementation
      logger.info(`Cache purge requested for ${urls.length} URLs`);
      
      // In a real implementation, you would call the Azure CDN API here
      // For now, we'll just log the URLs that would be purged
      for (const url of urls) {
        logger.info(`Would purge cache for: ${url}`);
      }

      return {
        success: true,
        purgedUrls: urls
      };
    } catch (error) {
      logger.error('Failed to purge cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Purge cache for all files with a specific prefix
   */
  async purgeCacheByPrefix(prefix: string): Promise<CachePurgeResult> {
    try {
      // This would typically involve listing all files with the prefix
      // and then purging each one
      logger.info(`Cache purge by prefix requested: ${prefix}`);
      
      return {
        success: true,
        purgedUrls: [`${this.configuration.baseUrl}/${prefix}/*`]
      };
    } catch (error) {
      logger.error('Failed to purge cache by prefix:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if CDN is properly configured
   */
  isConfigured(): boolean {
    return !!this.configuration.baseUrl;
  }

  /**
   * Get CDN configuration
   */
  getConfiguration(): CDNConfiguration {
    return { ...this.configuration };
  }

  /**
   * Update CDN configuration
   */
  updateConfiguration(newConfig: Partial<CDNConfiguration>): void {
    this.configuration = { ...this.configuration, ...newConfig };
    logger.info('CDN configuration updated', this.configuration);
  }

  /**
   * Test CDN connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      if (!this.configuration.baseUrl) {
        return false;
      }

      const response = await this.cdnClient.get('/', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error('CDN connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get CDN statistics (placeholder for future implementation)
   */
  async getStatistics(): Promise<{
    totalRequests: number;
    cacheHitRate: number;
    bandwidthUsed: number;
    lastUpdated: Date;
  }> {
    // This would typically call the Azure CDN Analytics API
    return {
      totalRequests: 0,
      cacheHitRate: 0,
      bandwidthUsed: 0,
      lastUpdated: new Date()
    };
  }
}
