/**
 * Health Provider Interfaces
 * 
 * Defines interfaces for health checks of external integrations.
 * These interfaces decouple the health check endpoints from specific
 * service implementations, making the system more testable and maintainable.
 * 
 * Related Requirements:
 * - FR-005: Health Monitoring & Diagnostics
 *   "System MUST provide health check endpoints for YouTube processing 
 *    and document ingestion (via Firecrawl)"
 */

import { logger } from '../utils/logger';
import { serviceManager } from '../services/service-manager';
import { healthCheckCache } from '../utils/health-cache';

/**
 * Health check result structure
 * Used by all health providers
 */
export interface HealthCheckResult {
  status: 'OK' | 'DEGRADED' | 'FAILED';
  message: string;
  lastSuccessAt?: Date;
  details?: Record<string, any>;
}

/**
 * Health provider interface
 * All health providers must implement this interface
 */
export interface HealthProvider {
  /**
   * Check if the service is healthy
   * @returns Health check result with status and details
   */
  checkHealth(): Promise<HealthCheckResult>;

  /**
   * Get the last successful health check timestamp
   * @returns Date of last successful check, or undefined if never successful
   */
  getLastSuccessTimestamp(): Date | undefined;

  /**
   * Update the last successful health check timestamp
   * Called when a health check passes
   */
  updateLastSuccessTimestamp(): void;
}

/**
 * Base health provider implementation
 * Provides common functionality for all health providers
 */
export abstract class BaseHealthProvider implements HealthProvider {
  protected lastSuccessTimestamp?: Date;
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    // Initialize with current timestamp (optimistic)
    this.lastSuccessTimestamp = new Date();
  }

  abstract checkHealth(): Promise<HealthCheckResult>;

  getLastSuccessTimestamp(): Date | undefined {
    return this.lastSuccessTimestamp;
  }

  updateLastSuccessTimestamp(): void {
    this.lastSuccessTimestamp = new Date();
  }

  /**
   * Determine if a failure should be classified as DEGRADED or FAILED
   * Based on time since last success
   * 
   * @param timeSinceLastSuccess - Time in milliseconds since last success
   * @param degradedThresholdMs - Threshold for DEGRADED status (default: 5 minutes)
   * @returns 'DEGRADED' or 'FAILED'
   */
  protected classifyFailureStatus(
    timeSinceLastSuccess: number,
    degradedThresholdMs: number = 300000 // 5 minutes
  ): 'DEGRADED' | 'FAILED' {
    return timeSinceLastSuccess < degradedThresholdMs ? 'DEGRADED' : 'FAILED';
  }
}

/**
 * YouTube Health Provider
 * 
 * Checks health of YouTube processing capabilities.
 * Validates YouTube API connectivity and configuration.
 * 
 * Related to FR-005: Health check for YouTube processing
 */
export class YouTubeHealthProvider extends BaseHealthProvider {
  private readonly cacheKey = 'health:youtube';
  private readonly cacheTtlMs = 30000; // 30 seconds (T028)

  constructor() {
    super('YouTube');
  }

  async checkHealth(): Promise<HealthCheckResult> {
    // T028: Use cache to ensure <1s p95 response time
    return healthCheckCache.getOrCompute(
      this.cacheKey,
      () => this.performHealthCheck(),
      this.cacheTtlMs
    );
  }

  private async performHealthCheck(): Promise<HealthCheckResult> {
    try {
      logger.debug('YouTube health provider: checking health');

      // Get YouTube service from service manager
      const youtubeService = serviceManager.getYouTube();
      
      // Perform health check
      const isHealthy = await youtubeService.checkHealth();

      if (isHealthy) {
        // Update last success timestamp
        this.updateLastSuccessTimestamp();

        logger.info('YouTube health check passed', {
          lastSuccessAt: this.lastSuccessTimestamp?.toISOString()
        });

        return {
          status: 'OK',
          message: 'YouTube API is accessible and functioning normally',
          lastSuccessAt: this.lastSuccessTimestamp,
          details: {
            service: 'YouTube API',
            provider: 'google'
          }
        };
      } else {
        // Determine if this is a degradation or failure
        const timeSinceLastSuccess = this.lastSuccessTimestamp 
          ? Date.now() - this.lastSuccessTimestamp.getTime()
          : Infinity;
        
        const status = this.classifyFailureStatus(timeSinceLastSuccess);

        logger.warn('YouTube health check failed', {
          status,
          timeSinceLastSuccess,
          lastSuccessAt: this.lastSuccessTimestamp?.toISOString()
        });

        return {
          status,
          message: 'YouTube API health check failed',
          lastSuccessAt: this.lastSuccessTimestamp,
          details: {
            service: 'YouTube API',
            provider: 'google',
            timeSinceLastSuccess
          }
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('YouTube health check encountered error', {
        error: errorMessage,
        lastSuccessAt: this.lastSuccessTimestamp?.toISOString()
      });

      // Determine status based on last success
      const timeSinceLastSuccess = this.lastSuccessTimestamp 
        ? Date.now() - this.lastSuccessTimestamp.getTime()
        : Infinity;
      
      const status = this.classifyFailureStatus(timeSinceLastSuccess);

      return {
        status,
        message: `YouTube API connectivity issue: ${errorMessage}`,
        lastSuccessAt: this.lastSuccessTimestamp,
        details: {
          service: 'YouTube API',
          provider: 'google',
          error: errorMessage
        }
      };
    }
  }
}

/**
 * Document Ingestion Health Provider
 * 
 * Checks health of document ingestion capabilities via Firecrawl.
 * Validates Firecrawl API connectivity and configuration.
 * 
 * Related to FR-005: Health check for document ingestion
 */
export class DocumentIngestionHealthProvider extends BaseHealthProvider {
  private readonly cacheKey = 'health:doc-ingest';
  private readonly cacheTtlMs = 30000; // 30 seconds (T028)

  constructor() {
    super('DocumentIngestion');
  }

  async checkHealth(): Promise<HealthCheckResult> {
    // T028: Use cache to ensure <1s p95 response time
    return healthCheckCache.getOrCompute(
      this.cacheKey,
      () => this.performHealthCheck(),
      this.cacheTtlMs
    );
  }

  private async performHealthCheck(): Promise<HealthCheckResult> {
    try {
      logger.debug('Document ingestion health provider: checking health');

      // Get Firecrawl service from service manager
      const firecrawlService = serviceManager.getFirecrawl();
      
      // Perform health check
      const isHealthy = await firecrawlService.checkHealth();

      if (isHealthy) {
        // Update last success timestamp
        this.updateLastSuccessTimestamp();

        logger.info('Document ingestion health check passed', {
          lastSuccessAt: this.lastSuccessTimestamp?.toISOString()
        });

        return {
          status: 'OK',
          message: 'Document ingestion API is accessible and functioning normally',
          lastSuccessAt: this.lastSuccessTimestamp,
          details: {
            service: 'Firecrawl API',
            provider: 'firecrawl'
          }
        };
      } else {
        // Determine if this is a degradation or failure
        const timeSinceLastSuccess = this.lastSuccessTimestamp 
          ? Date.now() - this.lastSuccessTimestamp.getTime()
          : Infinity;
        
        const status = this.classifyFailureStatus(timeSinceLastSuccess);

        logger.warn('Document ingestion health check failed', {
          status,
          timeSinceLastSuccess,
          lastSuccessAt: this.lastSuccessTimestamp?.toISOString()
        });

        return {
          status,
          message: 'Document ingestion API health check failed',
          lastSuccessAt: this.lastSuccessTimestamp,
          details: {
            service: 'Firecrawl API',
            provider: 'firecrawl',
            timeSinceLastSuccess
          }
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Document ingestion health check encountered error', {
        error: errorMessage,
        lastSuccessAt: this.lastSuccessTimestamp?.toISOString()
      });

      // Determine status based on last success
      const timeSinceLastSuccess = this.lastSuccessTimestamp 
        ? Date.now() - this.lastSuccessTimestamp.getTime()
        : Infinity;
      
      const status = this.classifyFailureStatus(timeSinceLastSuccess);

      return {
        status,
        message: `Document ingestion API connectivity issue: ${errorMessage}`,
        lastSuccessAt: this.lastSuccessTimestamp,
        details: {
          service: 'Firecrawl API',
          provider: 'firecrawl',
          error: errorMessage
        }
      };
    }
  }
}

/**
 * Health Provider Factory
 * 
 * Creates and manages health provider instances.
 * Uses singleton pattern to ensure consistent state across health checks.
 */
export class HealthProviderFactory {
  private static youtubeProvider?: YouTubeHealthProvider;
  private static docIngestionProvider?: DocumentIngestionHealthProvider;

  /**
   * Get YouTube health provider instance (singleton)
   */
  static getYouTubeProvider(): YouTubeHealthProvider {
    if (!this.youtubeProvider) {
      logger.info('Creating YouTube health provider instance');
      this.youtubeProvider = new YouTubeHealthProvider();
    }
    return this.youtubeProvider;
  }

  /**
   * Get Document Ingestion health provider instance (singleton)
   */
  static getDocumentIngestionProvider(): DocumentIngestionHealthProvider {
    if (!this.docIngestionProvider) {
      logger.info('Creating Document Ingestion health provider instance');
      this.docIngestionProvider = new DocumentIngestionHealthProvider();
    }
    return this.docIngestionProvider;
  }

  /**
   * Clear all provider instances (for testing)
   */
  static clearProviders(): void {
    logger.info('Clearing health provider instances');
    this.youtubeProvider = undefined;
    this.docIngestionProvider = undefined;
  }
}

/**
 * Convenience function to check YouTube health
 * Uses the singleton provider from the factory
 */
export async function checkYouTubeHealth(): Promise<HealthCheckResult> {
  const provider = HealthProviderFactory.getYouTubeProvider();
  return provider.checkHealth();
}

/**
 * Convenience function to check document ingestion health
 * Uses the singleton provider from the factory
 */
export async function checkDocumentIngestionHealth(): Promise<HealthCheckResult> {
  const provider = HealthProviderFactory.getDocumentIngestionProvider();
  return provider.checkHealth();
}

/**
 * Check health of all providers
 * Returns combined health status
 */
export async function checkAllProvidersHealth(): Promise<{
  overall: 'OK' | 'DEGRADED' | 'FAILED';
  providers: {
    youtube: HealthCheckResult;
    documentIngestion: HealthCheckResult;
  };
}> {
  logger.info('Checking health of all providers');

  const [youtube, documentIngestion] = await Promise.all([
    checkYouTubeHealth(),
    checkDocumentIngestionHealth()
  ]);

  // Determine overall status
  const statuses = [youtube.status, documentIngestion.status];
  let overall: 'OK' | 'DEGRADED' | 'FAILED';

  if (statuses.every(s => s === 'OK')) {
    overall = 'OK';
  } else if (statuses.some(s => s === 'FAILED')) {
    overall = 'FAILED';
  } else {
    overall = 'DEGRADED';
  }

  logger.info('All providers health check completed', {
    overall,
    youtube: youtube.status,
    documentIngestion: documentIngestion.status
  });

  return {
    overall,
    providers: {
      youtube,
      documentIngestion
    }
  };
}
