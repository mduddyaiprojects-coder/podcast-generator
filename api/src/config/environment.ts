import { logger } from '../utils/logger';
import { securityService } from './security';

/**
 * Environment-specific configuration management
 */

export interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  apiKeys: {
    azureOpenAI: {
      endpoint: string;
      apiKey: string;
      apiVersion: string;
      deploymentName: string;
    };
    elevenLabs: {
      apiKey: string;
      baseUrl: string;
    };
    firecrawl: {
      apiKey: string;
      apiUrl: string;
    };
    youtube: {
      apiKey: string;
      baseUrl: string;
    };
  };
  storage: {
    azureStorageConnectionString?: string;
    containerName: string;
    cdnBaseUrl?: string;
    blobStorage: {
      accountName: string;
      connectionString?: string;
      useManagedIdentity: boolean;
    };
    cdn: {
      profileName: string;
      endpointName: string;
      customDomain?: string;
      enableCompression: boolean;
      enableHttps: boolean;
    };
  };
  security: {
    enableApiKeyValidation: boolean;
    enableCredentialRotation: boolean;
    enableSecurityMonitoring: boolean;
    logSensitiveData: boolean;
  };
  features: {
    enableTTS: boolean;
    enableYouTube: boolean;
    enableFirecrawl: boolean;
    enableAzureOpenAI: boolean;
  };
  limits: {
    maxFileSize: number;
    maxProcessingTime: number;
    maxRetries: number;
    rateLimitPerMinute: number;
  };
}

/**
 * Environment configuration service
 */
export class EnvironmentService {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadEnvironmentConfig();
    this.validateConfiguration();
  }

  /**
   * Load environment-specific configuration
   */
  private loadEnvironmentConfig(): EnvironmentConfig {
    const environment = this.getEnvironment();
    
    return {
      name: environment,
      isDevelopment: environment === 'development',
      isStaging: environment === 'staging',
      isProduction: environment === 'production',
      
      apiKeys: {
        azureOpenAI: {
          endpoint: process.env['AZURE_OPENAI_ENDPOINT'] || '',
          apiKey: process.env['AZURE_OPENAI_API_KEY'] || '',
          apiVersion: process.env['AZURE_OPENAI_API_VERSION'] || '2024-04-01-preview',
          deploymentName: process.env['AZURE_OPENAI_DEPLOYMENT_NAME'] || 'gpt-4'
        },
        elevenLabs: {
          apiKey: process.env['ELEVENLABS_API_KEY'] || '',
          baseUrl: process.env['ELEVENLABS_BASE_URL'] || 'https://api.elevenlabs.io'
        },
        firecrawl: {
          apiKey: process.env['FIRECRAWL_API_KEY'] || '',
          apiUrl: process.env['FIRECRAWL_API_URL'] || 'https://api.firecrawl.dev'
        },
        youtube: {
          apiKey: process.env['YOUTUBE_API_KEY'] || '',
          baseUrl: process.env['YOUTUBE_BASE_URL'] || 'https://www.googleapis.com/youtube/v3'
        }
      },
      
      storage: {
        azureStorageConnectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'],
        containerName: process.env['AZURE_STORAGE_CONTAINER_NAME'] || 'podcast-content',
        cdnBaseUrl: process.env['CDN_BASE_URL'],
        blobStorage: {
          accountName: process.env['AZURE_BLOB_STORAGE_ACCOUNT_NAME'] || '',
          connectionString: process.env['AZURE_BLOB_STORAGE_CONNECTION_STRING'],
          useManagedIdentity: this.getBooleanEnv('AZURE_BLOB_STORAGE_USE_MANAGED_IDENTITY', environment === 'production')
        },
        cdn: {
          profileName: process.env['CDN_PROFILE_NAME'] || `podcast-generator-cdn-${environment}`,
          endpointName: process.env['CDN_ENDPOINT_NAME'] || `podcast-generator-endpoint-${environment}`,
          customDomain: process.env['CDN_CUSTOM_DOMAIN'],
          enableCompression: this.getBooleanEnv('CDN_ENABLE_COMPRESSION', true),
          enableHttps: this.getBooleanEnv('CDN_ENABLE_HTTPS', true)
        }
      },
      
      security: {
        enableApiKeyValidation: this.getBooleanEnv('ENABLE_API_KEY_VALIDATION', environment === 'production'),
        enableCredentialRotation: this.getBooleanEnv('ENABLE_CREDENTIAL_ROTATION', environment === 'production'),
        enableSecurityMonitoring: this.getBooleanEnv('ENABLE_SECURITY_MONITORING', true),
        logSensitiveData: this.getBooleanEnv('LOG_SENSITIVE_DATA', environment === 'development')
      },
      
      features: {
        enableTTS: this.getBooleanEnv('ENABLE_TTS', true),
        enableYouTube: this.getBooleanEnv('ENABLE_YOUTUBE', true),
        enableFirecrawl: this.getBooleanEnv('ENABLE_FIRECRAWL', true),
        enableAzureOpenAI: this.getBooleanEnv('ENABLE_AZURE_OPENAI', true)
      },
      
      limits: {
        maxFileSize: this.getNumberEnv('MAX_FILE_SIZE_MB', 25) * 1024 * 1024, // Convert to bytes
        maxProcessingTime: this.getNumberEnv('MAX_PROCESSING_TIME_MS', 300000), // 5 minutes
        maxRetries: this.getNumberEnv('MAX_RETRIES', 3),
        rateLimitPerMinute: this.getNumberEnv('RATE_LIMIT_PER_MINUTE', 60)
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
   * Validate the current configuration
   */
  private validateConfiguration(): void {
    const validation = securityService.validateEnvironmentVariables();
    
    if (!validation.isValid) {
      logger.error('Environment configuration validation failed', {
        errors: validation.errors,
        warnings: validation.warnings
      });
      
      if (this.config.isProduction) {
        throw new Error(`Invalid environment configuration: ${validation.errors.join(', ')}`);
      }
    }

    if (validation.warnings.length > 0) {
      logger.warn('Environment configuration warnings', {
        warnings: validation.warnings
      });
    }

    // Log configuration summary
    logger.info('Environment configuration loaded', {
      environment: this.config.name,
      features: Object.entries(this.config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      security: {
        apiKeyValidation: this.config.security.enableApiKeyValidation,
        credentialRotation: this.config.security.enableCredentialRotation,
        monitoring: this.config.security.enableSecurityMonitoring
      }
    });
  }

  /**
   * Get the current configuration
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Check if security feature is enabled
   */
  isSecurityFeatureEnabled(feature: keyof EnvironmentConfig['security']): boolean {
    return this.config.security[feature];
  }

  /**
   * Get API key configuration for a service
   */
  getApiKeyConfig(service: keyof EnvironmentConfig['apiKeys']) {
    return { ...this.config.apiKeys[service] };
  }

  /**
   * Get storage configuration
   */
  getStorageConfig() {
    return { ...this.config.storage };
  }

  /**
   * Get limits configuration
   */
  getLimitsConfig() {
    return { ...this.config.limits };
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.config.isProduction;
  }

  /**
   * Get environment-specific logging level
   */
  getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    if (this.config.isDevelopment) return 'debug';
    if (this.config.isStaging) return 'info';
    return 'warn';
  }

  /**
   * Get environment-specific rate limits
   */
  getRateLimits() {
    return {
      requestsPerMinute: this.config.limits.rateLimitPerMinute,
      maxFileSize: this.config.limits.maxFileSize,
      maxProcessingTime: this.config.limits.maxProcessingTime,
      maxRetries: this.config.limits.maxRetries
    };
  }
}

// Export singleton instance
export const environmentService = new EnvironmentService();
