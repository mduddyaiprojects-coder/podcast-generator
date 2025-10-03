import { logger } from '../utils/logger';

/**
 * Health check configuration
 * Defines settings for service health monitoring without exposing secrets
 */

export interface HealthCheckConfig {
  youtube: {
    enabled: boolean;
    checkIntervalMs: number;
    timeoutMs: number;
    retryAttempts: number;
  };
  docIngestion: {
    enabled: boolean;
    checkIntervalMs: number;
    timeoutMs: number;
    retryAttempts: number;
  };
  heartbeat: {
    enabled: boolean;
    intervalMs: number;
  };
}

export class HealthConfigService {
  private config: HealthCheckConfig;

  constructor() {
    this.config = this.loadHealthConfig();
    this.validateConfiguration();
  }

  /**
   * Load health check configuration from environment
   */
  private loadHealthConfig(): HealthCheckConfig {
    return {
      youtube: {
        enabled: this.getBooleanEnv('HEALTH_CHECK_YOUTUBE_ENABLED', true),
        checkIntervalMs: this.getNumberEnv('HEALTH_CHECK_YOUTUBE_INTERVAL_MS', 60000), // 1 minute
        timeoutMs: this.getNumberEnv('HEALTH_CHECK_YOUTUBE_TIMEOUT_MS', 5000), // 5 seconds
        retryAttempts: this.getNumberEnv('HEALTH_CHECK_YOUTUBE_RETRY_ATTEMPTS', 2)
      },
      docIngestion: {
        enabled: this.getBooleanEnv('HEALTH_CHECK_DOC_INGEST_ENABLED', true),
        checkIntervalMs: this.getNumberEnv('HEALTH_CHECK_DOC_INGEST_INTERVAL_MS', 60000), // 1 minute
        timeoutMs: this.getNumberEnv('HEALTH_CHECK_DOC_INGEST_TIMEOUT_MS', 5000), // 5 seconds
        retryAttempts: this.getNumberEnv('HEALTH_CHECK_DOC_INGEST_RETRY_ATTEMPTS', 2)
      },
      heartbeat: {
        enabled: this.getBooleanEnv('HEARTBEAT_ENABLED', true),
        intervalMs: this.getNumberEnv('HEARTBEAT_INTERVAL_MS', 30000) // 30 seconds
      }
    };
  }

  /**
   * Get a boolean environment variable with default
   */
  private getBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get a number environment variable with default
   */
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Validate the configuration
   */
  private validateConfiguration(): void {
    const warnings: string[] = [];

    // Validate timeout values
    if (this.config.youtube.timeoutMs > 30000) {
      warnings.push('YouTube health check timeout exceeds 30s - may cause slow responses');
    }

    if (this.config.docIngestion.timeoutMs > 30000) {
      warnings.push('Doc ingestion health check timeout exceeds 30s - may cause slow responses');
    }

    // Validate intervals
    if (this.config.youtube.checkIntervalMs < 10000) {
      warnings.push('YouTube health check interval < 10s may cause excessive API calls');
    }

    if (this.config.docIngestion.checkIntervalMs < 10000) {
      warnings.push('Doc ingestion health check interval < 10s may cause excessive API calls');
    }

    if (warnings.length > 0) {
      logger.warn('Health check configuration warnings', { warnings });
    }

    logger.info('Health check configuration loaded', {
      youtube: {
        enabled: this.config.youtube.enabled,
        intervalMs: this.config.youtube.checkIntervalMs
      },
      docIngestion: {
        enabled: this.config.docIngestion.enabled,
        intervalMs: this.config.docIngestion.checkIntervalMs
      },
      heartbeat: {
        enabled: this.config.heartbeat.enabled,
        intervalMs: this.config.heartbeat.intervalMs
      }
    });
  }

  /**
   * Get the current health check configuration
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  /**
   * Check if YouTube health checks are enabled
   */
  isYouTubeHealthCheckEnabled(): boolean {
    return this.config.youtube.enabled;
  }

  /**
   * Check if document ingestion health checks are enabled
   */
  isDocIngestionHealthCheckEnabled(): boolean {
    return this.config.docIngestion.enabled;
  }

  /**
   * Check if heartbeat is enabled
   */
  isHeartbeatEnabled(): boolean {
    return this.config.heartbeat.enabled;
  }

  /**
   * Get YouTube health check settings
   */
  getYouTubeHealthCheckConfig() {
    return { ...this.config.youtube };
  }

  /**
   * Get document ingestion health check settings
   */
  getDocIngestionHealthCheckConfig() {
    return { ...this.config.docIngestion };
  }

  /**
   * Get heartbeat settings
   */
  getHeartbeatConfig() {
    return { ...this.config.heartbeat };
  }
}

// Export singleton instance
export const healthConfigService = new HealthConfigService();
