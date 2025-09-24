import { logger } from '../utils/logger';
import { securityService } from '../config/security';
import { environmentService } from '../config/environment';

/**
 * API key security and validation service
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  service: string;
  errors: string[];
  warnings: string[];
  lastValidated: Date;
  usageCount: number;
}

export interface SecurityAlert {
  id: string;
  type: 'invalid_key' | 'key_rotation_needed' | 'suspicious_usage' | 'security_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * API key security service for monitoring and validation
 */
export class ApiKeySecurityService {
  private alerts: SecurityAlert[] = [];
  private validationCache: Map<string, ApiKeyValidationResult> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private intervalId?: NodeJS.Timeout;
  private timeoutId?: NodeJS.Timeout;

  constructor() {
    // Start periodic validation
    this.startPeriodicValidation();
  }

  /**
   * Validate an API key for a specific service
   */
  async validateApiKey(service: string, apiKey: string): Promise<ApiKeyValidationResult> {
    const cacheKey = `${service}:${this.hashApiKey(apiKey)}`;
    const cached = this.validationCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && this.isCacheValid(cached.lastValidated)) {
      return cached;
    }

    // Perform validation
    const validation = securityService.validateApiKey(service, apiKey);
    const result: ApiKeyValidationResult = {
      isValid: validation.isValid,
      service,
      errors: validation.errors,
      warnings: validation.warnings,
      lastValidated: new Date(),
      usageCount: 0
    };

    // Cache the result
    this.validationCache.set(cacheKey, result);

    // Log validation result
    if (!validation.isValid) {
      logger.error(`API key validation failed for ${service}`, {
        service,
        errorCount: validation.errors.length,
        errors: validation.errors
      });

      // Create security alert
      this.createAlert({
        type: 'invalid_key',
        severity: 'high',
        service,
        message: `Invalid API key detected for ${service}`,
        details: { errors: validation.errors }
      });
    } else if (validation.warnings.length > 0) {
      logger.warn(`API key validation warnings for ${service}`, {
        service,
        warningCount: validation.warnings.length,
        warnings: validation.warnings
      });
    }

    return result;
  }

  /**
   * Validate all configured API keys
   */
  async validateAllApiKeys(): Promise<ApiKeyValidationResult[]> {
    const results: ApiKeyValidationResult[] = [];
    const config = environmentService.getConfig();

    // Validate Azure OpenAI
    if (config.apiKeys.azureOpenAI.apiKey) {
      const result = await this.validateApiKey('azure-openai', config.apiKeys.azureOpenAI.apiKey);
      results.push(result);
    }

    // Validate ElevenLabs
    if (config.apiKeys.elevenLabs.apiKey) {
      const result = await this.validateApiKey('elevenlabs', config.apiKeys.elevenLabs.apiKey);
      results.push(result);
    }

    // Validate Firecrawl
    if (config.apiKeys.firecrawl.apiKey) {
      const result = await this.validateApiKey('firecrawl', config.apiKeys.firecrawl.apiKey);
      results.push(result);
    }

    // Validate YouTube
    if (config.apiKeys.youtube.apiKey) {
      const result = await this.validateApiKey('youtube', config.apiKeys.youtube.apiKey);
      results.push(result);
    }

    return results;
  }

  /**
   * Check for credential rotation needs
   */
  async checkCredentialRotation(): Promise<void> {
    const rotation = securityService.checkCredentialRotation();
    
    if (rotation.needsRotation.length > 0) {
      logger.warn('API keys need rotation', {
        services: rotation.needsRotation
      });

      for (const service of rotation.needsRotation) {
        this.createAlert({
          type: 'key_rotation_needed',
          severity: 'medium',
          service,
          message: `API key for ${service} needs rotation`,
          details: { rotationRequired: true }
        });
      }
    }

    if (rotation.warnings.length > 0) {
      logger.info('API key rotation warnings', {
        warnings: rotation.warnings
      });
    }
  }

  /**
   * Monitor API key usage patterns
   */
  async monitorUsagePatterns(): Promise<void> {
    const apiKeyInfo = securityService.getAllApiKeyInfo();
    
    for (const info of apiKeyInfo) {
      // Check for suspicious usage patterns
      if (info.usageCount > 1000) { // High usage
        this.createAlert({
          type: 'suspicious_usage',
          severity: 'medium',
          service: info.service,
          message: `High API key usage detected for ${info.service}`,
          details: { usageCount: info.usageCount }
        });
      }

      // Check for very recent usage (potential abuse)
      if (info.lastUsed && this.isRecentUsage(info.lastUsed)) {
        logger.debug(`Recent API key usage for ${info.service}`, {
          service: info.service,
          lastUsed: info.lastUsed,
          usageCount: info.usageCount
        });
      }
    }
  }

  /**
   * Create a security alert
   */
  private createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp'>): void {
    const securityAlert: SecurityAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      ...alert
    };

    this.alerts.push(securityAlert);

    // Log alert
    logger.warn(`Security alert: ${alert.type}`, {
      alert: securityAlert
    });

    // In production, you might want to send alerts to external monitoring systems
    if (environmentService.isProduction()) {
      this.sendExternalAlert(securityAlert);
    }
  }

  /**
   * Get all security alerts
   */
  getAlerts(severity?: SecurityAlert['severity']): SecurityAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Get recent alerts (last 24 hours)
   */
  getRecentAlerts(hours: number = 24): SecurityAlert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Clear old alerts (older than 7 days)
   */
  clearOldAlerts(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Get security summary
   */
  getSecuritySummary(): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    recentAlerts: number;
    apiKeyStatus: Record<string, boolean>;
  } {
    const recentAlerts = this.getRecentAlerts(24);
    const alertsBySeverity = this.alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const apiKeyStatus: Record<string, boolean> = {};
    for (const [key, result] of this.validationCache) {
      const service = key.split(':')[0];
      if (service) {
        apiKeyStatus[service] = result.isValid;
      }
    }

    return {
      totalAlerts: this.alerts.length,
      alertsBySeverity,
      recentAlerts: recentAlerts.length,
      apiKeyStatus
    };
  }

  /**
   * Start periodic validation and monitoring
   */
  private startPeriodicValidation(): void {
    // Validate all keys every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        await this.validateAllApiKeys();
        await this.checkCredentialRotation();
        await this.monitorUsagePatterns();
        this.clearOldAlerts();
      } catch (error) {
        logger.error('Error in periodic security validation', error);
      }
    }, 5 * 60 * 1000);
    
    // Unref to prevent Jest from hanging
    if (this.intervalId) {
      this.intervalId.unref();
    }

    // Initial validation
    this.timeoutId = setTimeout(async () => {
      try {
        await this.validateAllApiKeys();
        await this.checkCredentialRotation();
      } catch (error) {
        logger.error('Error in initial security validation', error);
      }
    }, 1000);
    
    // Unref to prevent Jest from hanging
    if (this.timeoutId) {
      this.timeoutId.unref();
    }
  }

  /**
   * Clean up timers and resources
   */
  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * Hash API key for caching (one-way hash)
   */
  private hashApiKey(apiKey: string): string {
    // Simple hash for caching - not cryptographically secure
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(lastValidated: Date): boolean {
    return Date.now() - lastValidated.getTime() < this.CACHE_TTL_MS;
  }

  /**
   * Check if usage is recent (within last minute)
   */
  private isRecentUsage(lastUsed: Date): boolean {
    return Date.now() - lastUsed.getTime() < 60 * 1000;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send alert to external monitoring system (placeholder)
   */
  private sendExternalAlert(alert: SecurityAlert): void {
    // In a real implementation, this would send to:
    // - Azure Monitor
    // - PagerDuty
    // - Slack
    // - Email
    // - etc.
    logger.info('External alert would be sent', { alertId: alert.id, type: alert.type });
  }
}

// Export singleton instance
export const apiKeySecurityService = new ApiKeySecurityService();

/**
 * Global cleanup function for tests
 */
export function cleanupApiKeySecurityService(): void {
  apiKeySecurityService.cleanup();
}
