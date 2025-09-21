import { logger } from '../utils/logger';

/**
 * Security configuration and validation for API keys and environment variables
 */

export interface SecurityConfig {
  environment: 'development' | 'staging' | 'production';
  apiKeyValidation: {
    enabled: boolean;
    minLength: number;
    maxLength: number;
    allowedCharacters: RegExp;
  };
  credentialRotation: {
    enabled: boolean;
    rotationIntervalDays: number;
    warningDaysBeforeExpiry: number;
  };
  monitoring: {
    enabled: boolean;
    logApiKeyUsage: boolean;
    alertOnInvalidKeys: boolean;
  };
}

export interface ApiKeyInfo {
  service: string;
  key: string;
  isValid: boolean;
  lastValidated?: Date;
  expiresAt?: Date;
  usageCount: number;
  lastUsed?: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Security service for managing API keys and environment variables
 */
export class SecurityService {
  private config: SecurityConfig;
  private apiKeys: Map<string, ApiKeyInfo> = new Map();

  constructor() {
    this.config = {
      environment: (process.env['NODE_ENV'] as any) || 'development',
      apiKeyValidation: {
        enabled: true,
        minLength: 20,
        maxLength: 200,
        allowedCharacters: /^[A-Za-z0-9_\-\.]+$/
      },
      credentialRotation: {
        enabled: this.getEnvironment() === 'production',
        rotationIntervalDays: 90,
        warningDaysBeforeExpiry: 30
      },
      monitoring: {
        enabled: true,
        logApiKeyUsage: this.getEnvironment() === 'production',
        alertOnInvalidKeys: true
      }
    };
  }

  /**
   * Get the current environment
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env['NODE_ENV']?.toLowerCase();
    if (env === 'production' || env === 'prod') return 'production';
    if (env === 'staging' || env === 'stage') return 'staging';
    return 'development';
  }

  /**
   * Validate and sanitize an API key
   */
  validateApiKey(service: string, key: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if key exists
    if (!key || key.trim() === '') {
      errors.push(`${service} API key is required`);
      return { isValid: false, errors, warnings };
    }

    // Check key length
    if (key.length < this.config.apiKeyValidation.minLength) {
      errors.push(`${service} API key is too short (minimum ${this.config.apiKeyValidation.minLength} characters)`);
    }

    if (key.length > this.config.apiKeyValidation.maxLength) {
      errors.push(`${service} API key is too long (maximum ${this.config.apiKeyValidation.maxLength} characters)`);
    }

    // Check key format
    if (!this.config.apiKeyValidation.allowedCharacters.test(key)) {
      errors.push(`${service} API key contains invalid characters`);
    }

    // Check for placeholder values
    if (key.includes('your-') || key.includes('placeholder') || key.includes('example')) {
      errors.push(`${service} API key appears to be a placeholder value`);
    }

    // Check for common weak patterns
    if (key === key.toLowerCase() && key.length < 32) {
      warnings.push(`${service} API key may be weak (all lowercase, short length)`);
    }

    // Check for sequential or repeated characters
    if (/(.)\1{3,}/.test(key)) {
      warnings.push(`${service} API key contains repeated characters`);
    }

    const isValid = errors.length === 0;

    // Update API key info
    this.apiKeys.set(service, {
      service,
      key: this.sanitizeApiKey(key),
      isValid,
      lastValidated: new Date(),
      usageCount: (this.apiKeys.get(service)?.usageCount || 0) + 1,
      lastUsed: new Date()
    });

    // Log validation result
    if (this.config.monitoring.logApiKeyUsage) {
      logger.info(`API key validation for ${service}`, {
        service,
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
        keyLength: key.length
      });
    }

    return { isValid, errors, warnings };
  }

  /**
   * Sanitize an API key for logging (mask sensitive parts)
   */
  private sanitizeApiKey(key: string): string {
    if (key.length <= 8) {
      return '*'.repeat(key.length);
    }
    
    const start = key.substring(0, 4);
    const end = key.substring(key.length - 4);
    const middle = '*'.repeat(Math.max(0, key.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Validate all required environment variables
   */
  validateEnvironmentVariables(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredVars = [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'ELEVENLABS_API_KEY',
      'FIRECRAWL_API_KEY',
      'YOUTUBE_API_KEY'
    ];

    const optionalVars = [
      'AZURE_STORAGE_CONNECTION_STRING',
      'DATABASE_URL',
      'CDN_BASE_URL'
    ];

    // Check required variables
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        errors.push(`Required environment variable ${varName} is not set`);
      } else {
        // Validate API key format for known API keys
        if (varName.includes('API_KEY')) {
          const service = varName.replace('_API_KEY', '').toLowerCase();
          const validation = this.validateApiKey(service, value);
          if (!validation.isValid) {
            errors.push(...validation.errors.map(e => `${varName}: ${e}`));
          }
          warnings.push(...validation.warnings.map(w => `${varName}: ${w}`));
        }
      }
    }

    // Check optional variables
    for (const varName of optionalVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        warnings.push(`Optional environment variable ${varName} is not set`);
      }
    }

    // Check for development vs production configuration
    if (this.getEnvironment() === 'production') {
      // In production, all variables should be set
      for (const varName of optionalVars) {
        const value = process.env[varName];
        if (!value || value.trim() === '') {
          errors.push(`Production environment requires ${varName} to be set`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get sanitized API key info for monitoring
   */
  getApiKeyInfo(service: string): ApiKeyInfo | null {
    const info = this.apiKeys.get(service);
    if (!info) return null;

    return {
      ...info,
      key: this.sanitizeApiKey(info.key)
    };
  }

  /**
   * Get all API key info (sanitized)
   */
  getAllApiKeyInfo(): ApiKeyInfo[] {
    return Array.from(this.apiKeys.values()).map(info => ({
      ...info,
      key: this.sanitizeApiKey(info.key)
    }));
  }

  /**
   * Check if any API keys need rotation
   */
  checkCredentialRotation(): { needsRotation: string[]; warnings: string[] } {
    const needsRotation: string[] = [];
    const warnings: string[] = [];

    if (!this.config.credentialRotation.enabled) {
      return { needsRotation, warnings };
    }

    const now = new Date();
    const rotationIntervalMs = this.config.credentialRotation.rotationIntervalDays * 24 * 60 * 60 * 1000;
    const warningIntervalMs = this.config.credentialRotation.warningDaysBeforeExpiry * 24 * 60 * 60 * 1000;

    for (const [service, info] of this.apiKeys) {
      if (!info.lastValidated) continue;

      const timeSinceValidation = now.getTime() - info.lastValidated.getTime();
      
      if (timeSinceValidation > rotationIntervalMs) {
        needsRotation.push(service);
      } else if (timeSinceValidation > (rotationIntervalMs - warningIntervalMs)) {
        warnings.push(`${service} API key should be rotated soon`);
      }
    }

    return { needsRotation, warnings };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Security configuration updated', { updates });
  }
}

// Export singleton instance
export const securityService = new SecurityService();
