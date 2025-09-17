/**
 * Azure Storage and CDN Configuration
 * This file contains configuration settings for Azure Blob Storage and CDN
 */

export interface StorageConfig {
  blobStorage: {
    connectionString: string;
    containerName: string;
    defaultTtl: number;
    maxFileSize: number;
    allowedContentTypes: string[];
  };
  cdn: {
    baseUrl: string;
    cacheControl: string;
    defaultTtl: number;
    maxTtl: number;
    compressionEnabled: boolean;
    httpsRedirect: boolean;
  };
  lifecycle: {
    audioRetentionDays: number;
    imageRetentionDays: number;
    tempFileRetentionHours: number;
    cleanupEnabled: boolean;
  };
}

export const getStorageConfig = (): StorageConfig => {
  return {
    blobStorage: {
      connectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'] || '',
      containerName: process.env['AZURE_STORAGE_CONTAINER_NAME'] || 'podcast-content',
      defaultTtl: parseInt(process.env['AZURE_STORAGE_DEFAULT_TTL'] || '3600'),
      maxFileSize: parseInt(process.env['AZURE_STORAGE_MAX_FILE_SIZE'] || '104857600'), // 100MB
      allowedContentTypes: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/m4a',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/xml',
        'application/rss+xml',
        'text/xml',
        'application/json'
      ]
    },
    cdn: {
      baseUrl: process.env['CDN_BASE_URL'] || '',
      cacheControl: process.env['CDN_CACHE_CONTROL'] || 'public, max-age=3600',
      defaultTtl: parseInt(process.env['CDN_DEFAULT_TTL'] || '3600'),
      maxTtl: parseInt(process.env['CDN_MAX_TTL'] || '86400'),
      compressionEnabled: process.env['CDN_COMPRESSION_ENABLED'] === 'true',
      httpsRedirect: process.env['CDN_HTTPS_REDIRECT'] === 'true'
    },
    lifecycle: {
      audioRetentionDays: parseInt(process.env['AUDIO_RETENTION_DAYS'] || '90'),
      imageRetentionDays: parseInt(process.env['IMAGE_RETENTION_DAYS'] || '30'),
      tempFileRetentionHours: parseInt(process.env['TEMP_FILE_RETENTION_HOURS'] || '24'),
      cleanupEnabled: process.env['STORAGE_CLEANUP_ENABLED'] === 'true'
    }
  };
};

export const validateStorageConfig = (config: StorageConfig): string[] => {
  const errors: string[] = [];

  if (!config.blobStorage.connectionString) {
    errors.push('AZURE_STORAGE_CONNECTION_STRING is required');
  }

  if (!config.blobStorage.containerName) {
    errors.push('AZURE_STORAGE_CONTAINER_NAME is required');
  }

  if (config.blobStorage.maxFileSize <= 0) {
    errors.push('AZURE_STORAGE_MAX_FILE_SIZE must be greater than 0');
  }

  if (config.cdn.baseUrl && !config.cdn.baseUrl.startsWith('https://')) {
    errors.push('CDN_BASE_URL must use HTTPS protocol');
  }

  if (config.cdn.defaultTtl <= 0) {
    errors.push('CDN_DEFAULT_TTL must be greater than 0');
  }

  if (config.cdn.maxTtl <= config.cdn.defaultTtl) {
    errors.push('CDN_MAX_TTL must be greater than CDN_DEFAULT_TTL');
  }

  if (config.lifecycle.audioRetentionDays <= 0) {
    errors.push('AUDIO_RETENTION_DAYS must be greater than 0');
  }

  if (config.lifecycle.imageRetentionDays <= 0) {
    errors.push('IMAGE_RETENTION_DAYS must be greater than 0');
  }

  if (config.lifecycle.tempFileRetentionHours <= 0) {
    errors.push('TEMP_FILE_RETENTION_HOURS must be greater than 0');
  }

  return errors;
};

export const getContentTypeCacheTtl = (contentType: string): number => {
  const config = getStorageConfig();
  
  if (contentType.startsWith('audio/')) {
    return config.cdn.maxTtl; // Audio files can be cached for a long time
  } else if (contentType.startsWith('image/')) {
    return config.cdn.maxTtl; // Images can be cached for a long time
  } else if (contentType.includes('xml') || contentType.includes('rss')) {
    return 300; // RSS feeds should have shorter cache time
  } else if (contentType.includes('json')) {
    return config.cdn.defaultTtl; // JSON responses have moderate cache time
  } else {
    return config.cdn.defaultTtl; // Default cache time
  }
};

export const isAllowedContentType = (contentType: string): boolean => {
  const config = getStorageConfig();
  return config.blobStorage.allowedContentTypes.includes(contentType);
};

export const getMaxFileSize = (): number => {
  const config = getStorageConfig();
  return config.blobStorage.maxFileSize;
};
