import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { logger } from '../utils/logger';

export interface BlobUploadResult {
  success: boolean;
  url?: string;
  blobName?: string;
  error?: string;
}

export interface BlobDownloadResult {
  success: boolean;
  data?: Buffer;
  contentType?: string;
  error?: string;
}

export class AzureBlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;
  private cdnBaseUrl: string;

  constructor() {
    const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'];
    this.containerName = process.env['AZURE_STORAGE_CONTAINER_NAME'] || 'podcast-content';
    this.cdnBaseUrl = process.env['CDN_BASE_URL'] || '';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  /**
   * Initialize the storage service and create container if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      const createContainerResponse = await this.containerClient.createIfNotExists({
        access: 'blob',
        metadata: {
          description: 'Podcast content storage container',
          createdBy: 'podcast-generator-api'
        }
      });

      if (createContainerResponse.succeeded) {
        logger.info(`Container '${this.containerName}' created successfully`);
      } else {
        logger.info(`Container '${this.containerName}' already exists`);
      }
    } catch (error) {
      logger.error('Failed to initialize Azure Blob Storage:', error);
      throw error;
    }
  }

  /**
   * Upload a file to blob storage
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<BlobUploadResult> {
    try {
      const blobName = this.generateBlobName(fileName);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
        metadata: {
          originalFileName: fileName,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      };

      const uploadResponse = await blockBlobClient.upload(file, file.length, uploadOptions);
      
      if (uploadResponse.requestId) {
        const url = this.cdnBaseUrl 
          ? `${this.cdnBaseUrl}/${this.containerName}/${blobName}`
          : blockBlobClient.url;

        logger.info(`File uploaded successfully: ${blobName}`);
        
        return {
          success: true,
          url,
          blobName
        };
      } else {
        throw new Error('Upload response missing request ID');
      }
    } catch (error) {
      logger.error('Failed to upload file to blob storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download a file from blob storage
   */
  async downloadFile(blobName: string): Promise<BlobDownloadResult> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No readable stream body in download response');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
      
      const data = Buffer.concat(chunks);
      const contentType = downloadResponse.contentType || 'application/octet-stream';

      logger.info(`File downloaded successfully: ${blobName}`);
      
      return {
        success: true,
        data,
        contentType
      };
    } catch (error) {
      logger.error('Failed to download file from blob storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a file from blob storage
   */
  async deleteFile(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      
      logger.info(`File deleted successfully: ${blobName}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete file from blob storage:', error);
      return false;
    }
  }

  /**
   * Check if a file exists in blob storage
   */
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const exists = await blockBlobClient.exists();
      return exists;
    } catch (error) {
      logger.error('Failed to check if file exists:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(blobName: string): Promise<Record<string, string> | null> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const properties = await blockBlobClient.getProperties();
      return properties.metadata || {};
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      return null;
    }
  }

  /**
   * Generate a unique blob name with timestamp and random suffix
   */
  private generateBlobName(originalFileName: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalFileName.split('.').pop() || '';
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    
    return `${baseName}-${timestamp}-${randomSuffix}.${extension}`;
  }

  /**
   * Get the public URL for a blob
   */
  getPublicUrl(blobName: string): string {
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}/${this.containerName}/${blobName}`;
    }
    
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  /**
   * List files in the container with optional prefix
   */
  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const listOptions = prefix ? { prefix } : {};
      
      for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
        files.push(blob.name);
      }
      
      return files;
    } catch (error) {
      logger.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Get container statistics
   */
  async getContainerStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    lastModified: Date | null;
  }> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      let lastModified: Date | null = null;

      for await (const blob of this.containerClient.listBlobsFlat()) {
        totalFiles++;
        totalSize += blob.properties.contentLength || 0;
        
        if (!lastModified || (blob.properties.lastModified && blob.properties.lastModified > lastModified)) {
          lastModified = blob.properties.lastModified || null;
        }
      }

      return {
        totalFiles,
        totalSize,
        lastModified
      };
    } catch (error) {
      logger.error('Failed to get container stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        lastModified: null
      };
    }
  }
}
