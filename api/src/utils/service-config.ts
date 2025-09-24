/**
 * Common service configuration utilities
 */

export interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export interface AzureConfig {
  subscriptionId?: string;
  resourceGroupName?: string;
  accountName?: string;
  connectionString?: string;
  useManagedIdentity?: boolean;
}

export interface ApiKeyConfig {
  apiKey?: string;
  endpoint?: string;
  baseUrl?: string;
  apiVersion?: string;
}

export interface CdnConfig {
  subscriptionId?: string;
  resourceGroupName?: string;
  profileName?: string;
  endpointName?: string;
  originHostName?: string;
  originPath?: string;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env['DATABASE_URL'];
  
  if (databaseUrl) {
    return {
      url: databaseUrl,
      ssl: true
    };
  }

  return {
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432'),
    database: process.env['DATABASE_NAME'] || 'podcast_generator_dev',
    user: process.env['DATABASE_USER'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || 'password',
    ssl: process.env['NODE_ENV'] === 'production'
  };
}

/**
 * Get Azure configuration from environment variables
 */
export function getAzureConfig(): AzureConfig {
  return {
    subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'],
    resourceGroupName: process.env['AZURE_RESOURCE_GROUP_NAME'],
    accountName: process.env['AZURE_STORAGE_ACCOUNT_NAME'],
    connectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'],
    useManagedIdentity: process.env['AZURE_USE_MANAGED_IDENTITY'] === 'true'
  };
}

/**
 * Get API key configuration for a service
 */
export function getApiKeyConfig(serviceName: string): ApiKeyConfig {
  const upperService = serviceName.toUpperCase();
  
  return {
    apiKey: process.env[`${upperService}_API_KEY`],
    endpoint: process.env[`${upperService}_ENDPOINT`],
    baseUrl: process.env[`${upperService}_BASE_URL`],
    apiVersion: process.env[`${upperService}_API_VERSION`]
  };
}

/**
 * Get CDN configuration from environment variables
 */
export function getCdnConfig(): CdnConfig {
  return {
    subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'],
    resourceGroupName: process.env['AZURE_RESOURCE_GROUP_NAME'],
    profileName: process.env['CDN_PROFILE_NAME'],
    endpointName: process.env['CDN_ENDPOINT_NAME'],
    originHostName: process.env['CDN_ORIGIN_HOST_NAME'],
    originPath: process.env['CDN_ORIGIN_PATH']
  };
}

/**
 * Get common service configuration
 */
export function getCommonConfig() {
  return {
    nodeEnv: process.env['NODE_ENV'] || 'development',
    logLevel: process.env['LOG_LEVEL'] || 'info',
    enableCdn: process.env['ENABLE_CDN'] === 'true',
    enableMonitoring: process.env['ENABLE_MONITORING'] === 'true',
    enableSecurity: process.env['ENABLE_SECURITY'] === 'true'
  };
}

/**
 * Validate required environment variables
 */
export function validateRequiredEnv(requiredVars: string[]): string[] {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  return missing;
}

/**
 * Get environment variable with type conversion
 */
export function getEnvVar<T = string>(
  key: string, 
  defaultValue: T, 
  type: 'string' | 'number' | 'boolean' = 'string'
): T {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  switch (type) {
    case 'number':
      return parseInt(value, 10) as T;
    case 'boolean':
      return (value.toLowerCase() === 'true') as T;
    default:
      return value as T;
  }
}
