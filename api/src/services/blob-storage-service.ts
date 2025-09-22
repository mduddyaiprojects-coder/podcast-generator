import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../utils/logger';
import { environmentService } from '../config/environment';

/**
 * Blob Storage configuration interface
 */
export interface BlobStorageConfig {
  accountName: string;
  connectionString?: string;
  useManagedIdentity: boolean;
}

/**
 * Upload options for blob operations
 */
export interface BlobUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  accessTier?: 'Hot' | 'Cool' | 'Archive';
  blockSize?: number;
  concurrency?: number;
  maxSingleShotSize?: number;
}

/**
 * Download options for blob operations
 */
export interface BlobDownloadOptions {
  offset?: number;
  length?: number;
  range?: string;
}

/**
 * Blob information interface
 */
export interface BlobInfo {
  name: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  accessTier?: string;
}

/**
 * Upload result interface
 */
export interface BlobUploadResult {
  blobName: string;
  url: string;
  etag: string;
  lastModified: Date;
  size: number;
}

/**
 * Azure Blob Storage service for file operations
 */
export class BlobStorageService {
  private client!: BlobServiceClient;
  private config: BlobStorageConfig;
  private isHealthy: boolean = true;

  constructor() {
    const envConfig = environmentService.getConfig();
    this.config = {
      accountName: envConfig.storage.blobStorage.accountName,
      connectionString: envConfig.storage.blobStorage.connectionString,
      useManagedIdentity: envConfig.storage.blobStorage.useManagedIdentity
    };

    if (!this.config.accountName) {
      logger.warn('Azure Blob Storage not configured - service will not function');
      this.isHealthy = false;
      return;
    }

    try {
      this.client = this.createBlobServiceClient();
      logger.info('Azure Blob Storage service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure Blob Storage service', { error });
      this.isHealthy = false;
    }
  }

  /**
   * Create BlobServiceClient with appropriate authentication
   */
  private createBlobServiceClient(): BlobServiceClient {
    const accountUrl = `https://${this.config.accountName}.blob.core.windows.net`;

    if (this.config.useManagedIdentity) {
      // Use Managed Identity (recommended for production)
      const credential = new DefaultAzureCredential();
      return new BlobServiceClient(accountUrl, credential);
    } else if (this.config.connectionString) {
      // Use connection string (for development)
      return BlobServiceClient.fromConnectionString(this.config.connectionString);
    } else {
      throw new Error('No authentication method configured for Blob Storage');
    }
  }

  /**
   * Get container client
   */
  private getContainerClient(containerName: string): ContainerClient {
    if (!this.isHealthy) {
      throw new Error('Blob Storage service is not healthy');
    }
    return this.client.getContainerClient(containerName);
  }

  /**
   * Create a container if it doesn't exist
   */
  async createContainer(containerName: string, options?: { publicAccess?: 'blob' | 'container' }): Promise<void> {
    try {
      const containerClient = this.getContainerClient(containerName);
      await containerClient.createIfNotExists({
        access: options?.publicAccess
      });
      logger.info(`Container '${containerName}' created or already exists`);
    } catch (error) {
      logger.error(`Failed to create container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Upload a file to blob storage
   */
  async uploadFile(
    containerName: string,
    blobName: string,
    filePath: string,
    options?: BlobUploadOptions
  ): Promise<BlobUploadResult> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options?.contentType
        },
        metadata: options?.metadata,
        tags: options?.tags,
        tier: options?.accessTier,
        blockSize: options?.blockSize,
        concurrency: options?.concurrency,
        maxSingleShotSize: options?.maxSingleShotSize
      };

      const uploadResponse = await blockBlobClient.uploadFile(filePath, uploadOptions);

      const result: BlobUploadResult = {
        blobName,
        url: blockBlobClient.url,
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!,
        size: 0 // Content length not available in upload response
      };

      logger.info(`File uploaded successfully: ${blobName}`, { 
        container: containerName,
        size: result.size,
        url: result.url
      });

      return result;
    } catch (error) {
      logger.error(`Failed to upload file '${blobName}' to container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Upload data from buffer to blob storage
   */
  async uploadBuffer(
    containerName: string,
    blobName: string,
    buffer: Buffer,
    options?: BlobUploadOptions
  ): Promise<BlobUploadResult> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options?.contentType
        },
        metadata: options?.metadata,
        tags: options?.tags,
        tier: options?.accessTier,
        blockSize: options?.blockSize,
        concurrency: options?.concurrency,
        maxSingleShotSize: options?.maxSingleShotSize
      };

      const uploadResponse = await blockBlobClient.uploadData(buffer, uploadOptions);

      const result: BlobUploadResult = {
        blobName,
        url: blockBlobClient.url,
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!,
        size: 0 // Content length not available in upload response
      };

      logger.info(`Buffer uploaded successfully: ${blobName}`, { 
        container: containerName,
        size: result.size,
        url: result.url
      });

      return result;
    } catch (error) {
      logger.error(`Failed to upload buffer '${blobName}' to container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Upload data from stream to blob storage
   */
  async uploadStream(
    containerName: string,
    blobName: string,
    stream: NodeJS.ReadableStream,
    _options?: BlobUploadOptions
  ): Promise<BlobUploadResult> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadResponse = await blockBlobClient.uploadStream(stream as any);

      const result: BlobUploadResult = {
        blobName,
        url: blockBlobClient.url,
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!,
        size: 0 // Content length not available in upload response
      };

      logger.info(`Stream uploaded successfully: ${blobName}`, { 
        container: containerName,
        size: result.size,
        url: result.url
      });

      return result;
    } catch (error) {
      logger.error(`Failed to upload stream '${blobName}' to container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Download a file from blob storage
   */
  async downloadFile(
    containerName: string,
    blobName: string,
    filePath: string,
    _options?: BlobDownloadOptions
  ): Promise<void> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      await blobClient.downloadToFile(filePath);
      logger.info(`File downloaded successfully: ${blobName}`, { 
        container: containerName,
        filePath
      });
    } catch (error) {
      logger.error(`Failed to download file '${blobName}' from container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Download blob data to buffer
   */
  async downloadBuffer(
    containerName: string,
    blobName: string,
    _options?: BlobDownloadOptions
  ): Promise<Buffer> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No data received from blob download');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      logger.info(`Buffer downloaded successfully: ${blobName}`, { 
        container: containerName,
        size: buffer.length
      });

      return buffer;
    } catch (error) {
      logger.error(`Failed to download buffer '${blobName}' from container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Download blob data to stream
   */
  async downloadStream(
    containerName: string,
    blobName: string,
    writableStream: NodeJS.WritableStream,
    _options?: BlobDownloadOptions
  ): Promise<void> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No data received from blob download');
      }

      (downloadResponse.readableStreamBody as any).pipe(writableStream);
      logger.info(`Stream downloaded successfully: ${blobName}`, { 
        container: containerName
      });
    } catch (error) {
      logger.error(`Failed to download stream '${blobName}' from container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * List blobs in a container
   */
  async listBlobs(containerName: string, prefix?: string): Promise<BlobInfo[]> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobs: BlobInfo[] = [];

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        blobs.push({
          name: blob.name,
          url: containerClient.getBlobClient(blob.name).url,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          contentType: blob.properties.contentType,
          metadata: blob.metadata,
          tags: blob.tags,
          accessTier: blob.properties.accessTier
        });
      }

      logger.info(`Listed ${blobs.length} blobs in container '${containerName}'`, { 
        container: containerName,
        prefix,
        count: blobs.length
      });

      return blobs;
    } catch (error) {
      logger.error(`Failed to list blobs in container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Delete a blob
   */
  async deleteBlob(containerName: string, blobName: string): Promise<void> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      await blobClient.delete();
      logger.info(`Blob deleted successfully: ${blobName}`, { 
        container: containerName
      });
    } catch (error) {
      logger.error(`Failed to delete blob '${blobName}' from container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Get blob properties and metadata
   */
  async getBlobProperties(containerName: string, blobName: string): Promise<BlobInfo> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      const properties = await blobClient.getProperties();

      const blobInfo: BlobInfo = {
        name: blobName,
        url: blobClient.url,
        size: properties.contentLength || 0,
        lastModified: properties.lastModified || new Date(),
        contentType: properties.contentType,
        metadata: properties.metadata,
        tags: properties.tagCount ? await blobClient.getTags().then(tags => tags.tags) : undefined,
        accessTier: properties.accessTier
      };

      logger.info(`Retrieved properties for blob: ${blobName}`, { 
        container: containerName,
        size: blobInfo.size
      });

      return blobInfo;
    } catch (error) {
      logger.error(`Failed to get properties for blob '${blobName}' in container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Generate a SAS URL for a blob
   */
  async generateSasUrl(
    containerName: string,
    blobName: string,
    permissions: string = 'r',
    expiresInMinutes: number = 60
  ): Promise<string> {
    try {
      const containerClient = this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      const expiresOn = new Date();
      expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

      const sasUrl = await blobClient.generateSasUrl({
        permissions: permissions as any,
        expiresOn
      });

      logger.info(`Generated SAS URL for blob: ${blobName}`, { 
        container: containerName,
        expiresInMinutes
      });

      return sasUrl;
    } catch (error) {
      logger.error(`Failed to generate SAS URL for blob '${blobName}' in container '${containerName}'`, { error });
      throw error;
    }
  }

  /**
   * Check if the service is healthy
   */
  checkHealth(): boolean {
    return this.isHealthy;
  }

  /**
   * Get service information
   */
  getServiceInfo(): { name: string; healthy: boolean; config: Partial<BlobStorageConfig> } {
    return {
      name: 'Azure Blob Storage',
      healthy: this.isHealthy,
      config: {
        accountName: this.config.accountName,
        useManagedIdentity: this.config.useManagedIdentity
      }
    };
  }
}

// Export singleton instance
export const blobStorageService = new BlobStorageService();
