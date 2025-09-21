import { logger } from '../utils/logger';
import { apiKeySecurityService } from './api-key-security';
import { securityService } from '../config/security';
import { environmentService } from '../config/environment';

/**
 * Security monitoring and health check service
 */

export interface SecurityHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'warning' | 'critical';
      lastChecked: Date;
      issues: string[];
      warnings: string[];
    };
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
}

export interface SecurityMetrics {
  apiKeyValidations: number;
  failedValidations: number;
  securityAlerts: number;
  credentialRotations: number;
  suspiciousActivities: number;
  lastUpdated: Date;
}

/**
 * Security monitoring service for comprehensive security oversight
 */
export class SecurityMonitoringService {
  private metrics: SecurityMetrics = {
    apiKeyValidations: 0,
    failedValidations: 0,
    securityAlerts: 0,
    credentialRotations: 0,
    suspiciousActivities: 0,
    lastUpdated: new Date()
  };

  private serviceStatus: Map<string, {
    status: 'healthy' | 'warning' | 'critical';
    lastChecked: Date;
    issues: string[];
    warnings: string[];
  }> = new Map();

  constructor() {
    this.startMonitoring();
  }

  /**
   * Get comprehensive security health status
   */
  async getSecurityHealthStatus(): Promise<SecurityHealthStatus> {
    const services = await this.checkAllServices();
    const alerts = apiKeySecurityService.getAlerts();
    const recommendations = this.generateRecommendations(services, alerts);

    // Determine overall status
    const hasCriticalIssues = Object.values(services).some(s => s.status === 'critical');
    const hasWarnings = Object.values(services).some(s => s.status === 'warning');
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (hasCriticalIssues) overall = 'critical';
    else if (hasWarnings) overall = 'warning';

    return {
      overall,
      timestamp: new Date(),
      services,
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      recommendations
    };
  }

  /**
   * Check all services for security issues
   */
  private async checkAllServices(): Promise<{
    [serviceName: string]: {
      status: 'healthy' | 'warning' | 'critical';
      lastChecked: Date;
      issues: string[];
      warnings: string[];
    };
  }> {
    const services: any = {};
    const config = environmentService.getConfig();

    // Check Azure OpenAI
    if (config.features.enableAzureOpenAI) {
      services['azure-openai'] = await this.checkService('azure-openai', {
        hasApiKey: !!config.apiKeys.azureOpenAI.apiKey,
        hasEndpoint: !!config.apiKeys.azureOpenAI.endpoint,
        apiKey: config.apiKeys.azureOpenAI.apiKey
      });
    }

    // Check ElevenLabs
    if (config.features.enableTTS) {
      services['elevenlabs'] = await this.checkService('elevenlabs', {
        hasApiKey: !!config.apiKeys.elevenLabs.apiKey,
        apiKey: config.apiKeys.elevenLabs.apiKey
      });
    }

    // Check Firecrawl
    if (config.features.enableFirecrawl) {
      services['firecrawl'] = await this.checkService('firecrawl', {
        hasApiKey: !!config.apiKeys.firecrawl.apiKey,
        apiKey: config.apiKeys.firecrawl.apiKey
      });
    }

    // Check YouTube
    if (config.features.enableYouTube) {
      services['youtube'] = await this.checkService('youtube', {
        hasApiKey: !!config.apiKeys.youtube.apiKey,
        apiKey: config.apiKeys.youtube.apiKey
      });
    }

    // Check Whisper (uses Azure OpenAI)
    if (config.features.enableWhisper) {
      services['whisper'] = await this.checkService('whisper', {
        hasApiKey: !!config.apiKeys.azureOpenAI.apiKey,
        hasEndpoint: !!config.apiKeys.azureOpenAI.endpoint,
        apiKey: config.apiKeys.azureOpenAI.apiKey
      });
    }

    return services;
  }

  /**
   * Check individual service security status
   */
  private async checkService(serviceName: string, config: any): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    lastChecked: Date;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check if API key is present
    if (!config.hasApiKey) {
      issues.push('API key not configured');
      status = 'critical';
    } else if (config.apiKey) {
      // Validate API key
      const validation = await apiKeySecurityService.validateApiKey(serviceName, config.apiKey);
      this.metrics.apiKeyValidations++;
      
      if (!validation.isValid) {
        issues.push(...validation.errors);
        status = 'critical';
        this.metrics.failedValidations++;
      } else {
        warnings.push(...validation.warnings);
        if (warnings.length > 0 && status === 'healthy') {
          status = 'warning';
        }
      }
    }

    // Check for required configuration
    if (serviceName === 'azure-openai' && !config.hasEndpoint) {
      issues.push('Azure OpenAI endpoint not configured');
      status = 'critical';
    }

    // Check for placeholder values
    if (config.apiKey && this.isPlaceholderValue(config.apiKey)) {
      issues.push('API key appears to be a placeholder value');
      status = 'critical';
    }

    // Check for weak keys
    if (config.apiKey && this.isWeakKey(config.apiKey)) {
      warnings.push('API key may be weak or insecure');
      if (status === 'healthy') status = 'warning';
    }

    const result = {
      status,
      lastChecked: new Date(),
      issues,
      warnings
    };

    this.serviceStatus.set(serviceName, result);
    return result;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(services: any, alerts: any[]): string[] {
    const recommendations: string[] = [];

    // Check for missing API keys
    const missingKeys = Object.entries(services)
      .filter(([_, service]: [string, any]) => service.status === 'critical' && service.issues.some((i: string) => i.includes('not configured')))
      .map(([name]) => name);

    if (missingKeys.length > 0) {
      recommendations.push(`Configure API keys for: ${missingKeys.join(', ')}`);
    }

    // Check for weak keys
    const weakKeys = Object.entries(services)
      .filter(([_, service]: [string, any]) => service.warnings.some((w: string) => w.includes('weak')))
      .map(([name]) => name);

    if (weakKeys.length > 0) {
      recommendations.push(`Strengthen API keys for: ${weakKeys.join(', ')}`);
    }

    // Check for high alert count
    if (alerts.length > 10) {
      recommendations.push('High number of security alerts - review and address issues');
    }

    // Check for critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`Address ${criticalAlerts.length} critical security alerts immediately`);
    }

    // Check for credential rotation needs
    const rotationCheck = securityService.checkCredentialRotation();
    if (rotationCheck.needsRotation.length > 0) {
      recommendations.push(`Rotate API keys for: ${rotationCheck.needsRotation.join(', ')}`);
    }

    // Environment-specific recommendations
    if (environmentService.isProduction()) {
      recommendations.push('Ensure all security features are enabled in production');
      recommendations.push('Set up external monitoring and alerting');
      recommendations.push('Implement API key rotation schedule');
    }

    return recommendations;
  }

  /**
   * Get current security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Update security metrics
   */
  updateMetrics(updates: Partial<SecurityMetrics>): void {
    this.metrics = { ...this.metrics, ...updates, lastUpdated: new Date() };
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName: string) {
    return this.serviceStatus.get(serviceName);
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses() {
    return Object.fromEntries(this.serviceStatus);
  }

  /**
   * Check if a value is a placeholder
   */
  private isPlaceholderValue(value: string): boolean {
    const placeholders = ['your-', 'placeholder', 'example', 'test-', 'demo-', 'sample-'];
    return placeholders.some(placeholder => value.toLowerCase().includes(placeholder));
  }

  /**
   * Check if a key is weak
   */
  private isWeakKey(key: string): boolean {
    // Check for common weak patterns
    if (key.length < 32) return true;
    if (key === key.toLowerCase() && key.length < 64) return true;
    if (/(.)\1{3,}/.test(key)) return true; // Repeated characters
    if (/^[0-9]+$/.test(key)) return true; // All numbers
    if (/^[a-z]+$/.test(key)) return true; // All lowercase letters
    
    return false;
  }

  /**
   * Start monitoring services
   */
  private startMonitoring(): void {
    // Check services every 2 minutes
    setInterval(async () => {
      try {
        await this.checkAllServices();
        this.updateMetrics({ lastUpdated: new Date() });
      } catch (error) {
        logger.error('Error in security monitoring', error);
      }
    }, 2 * 60 * 1000);

    // Initial check
    setTimeout(async () => {
      try {
        await this.checkAllServices();
      } catch (error) {
        logger.error('Error in initial security monitoring', error);
      }
    }, 1000);
  }
}

// Export singleton instance
export const securityMonitoringService = new SecurityMonitoringService();
