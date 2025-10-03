import { BlobServiceClient, ContainerClient, BlobUploadCommonResponse } from '@azure/storage-blob';
import { logger } from '../utils/logger';

/**
 * StorageService
 * 
 * Handles file storage operations using Azure Blob Storage.
 * Manages audio files, transcripts, and other generated content.
 */

export interface StorageConfig {
  connectionString: string;
  containerName: string;
  cdnBaseUrl?: string;
}

export interface UploadResult {
  url: string;
  size: number;
  contentType: string;
  etag: string;
  lastModified: Date;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  containerName: string;
  lastModified: Date;
}

export class StorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(config.containerName);
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    try {
      // Ensure container exists
      await this.containerClient.createIfNotExists({
        access: 'blob', // Public read access for audio files
        metadata: {
          purpose: 'podcast-generator-storage',
          created: new Date().toISOString()
        }
      });

      logger.info('Storage service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize storage service:', error);
      throw new Error(`Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload audio file to storage
   */
  async uploadAudio(audioBuffer: Buffer, submissionId: string, contentType: string = 'audio/mpeg'): Promise<UploadResult> {
    try {
      const blobName = `audio/${submissionId}.mp3`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobCacheControl: 'public, max-age=31536000' // 1 year cache
        },
        metadata: {
          submissionId,
          type: 'audio',
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadResponse: BlobUploadCommonResponse = await blockBlobClient.upload(
        audioBuffer,
        audioBuffer.length,
        uploadOptions
      );

      const url = await this.getPublicUrl(blobName);
      
      logger.info(`Audio uploaded successfully: ${blobName}`, {
        submissionId,
        size: audioBuffer.length,
        url
      });

      return {
        url,
        size: audioBuffer.length,
        contentType,
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!
      };
    } catch (error) {
      logger.error('Failed to upload audio:', error);
      throw new Error(`Audio upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload transcript file to storage
   */
  async uploadTranscript(transcriptContent: string, submissionId: string): Promise<UploadResult> {
    try {
      const blobName = `transcripts/${submissionId}.txt`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const buffer = Buffer.from(transcriptContent, 'utf-8');

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: 'text/plain; charset=utf-8',
          blobCacheControl: 'public, max-age=86400' // 1 day cache
        },
        metadata: {
          submissionId,
          type: 'transcript',
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadResponse: BlobUploadCommonResponse = await blockBlobClient.upload(
        buffer,
        buffer.length,
        uploadOptions
      );

      const url = await this.getPublicUrl(blobName);
      
      logger.info(`Transcript uploaded successfully: ${blobName}`, {
        submissionId,
        size: buffer.length,
        url
      });

      return {
        url,
        size: buffer.length,
        contentType: 'text/plain; charset=utf-8',
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!
      };
    } catch (error) {
      logger.error('Failed to upload transcript:', error);
      throw new Error(`Transcript upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload dialogue script to storage
   */
  async uploadDialogueScript(scriptContent: string, submissionId: string): Promise<UploadResult> {
    try {
      const blobName = `scripts/${submissionId}.txt`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const buffer = Buffer.from(scriptContent, 'utf-8');

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: 'text/plain; charset=utf-8',
          blobCacheControl: 'public, max-age=86400'
        },
        metadata: {
          submissionId,
          type: 'dialogue-script',
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadResponse: BlobUploadCommonResponse = await blockBlobClient.upload(
        buffer,
        buffer.length,
        uploadOptions
      );

      const url = await this.getPublicUrl(blobName);
      
      logger.info(`Dialogue script uploaded successfully: ${blobName}`, {
        submissionId,
        size: buffer.length,
        url
      });

      return {
        url,
        size: buffer.length,
        contentType: 'text/plain; charset=utf-8',
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!
      };
    } catch (error) {
      logger.error('Failed to upload dialogue script:', error);
      throw new Error(`Dialogue script upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload summary to storage
   */
  async uploadSummary(summaryContent: string, submissionId: string): Promise<UploadResult> {
    try {
      const blobName = `summaries/${submissionId}.txt`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const buffer = Buffer.from(summaryContent, 'utf-8');

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: 'text/plain; charset=utf-8',
          blobCacheControl: 'public, max-age=86400'
        },
        metadata: {
          submissionId,
          type: 'summary',
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadResponse: BlobUploadCommonResponse = await blockBlobClient.upload(
        buffer,
        buffer.length,
        uploadOptions
      );

      const url = await this.getPublicUrl(blobName);
      
      logger.info(`Summary uploaded successfully: ${blobName}`, {
        submissionId,
        size: buffer.length,
        url
      });

      return {
        url,
        size: buffer.length,
        contentType: 'text/plain; charset=utf-8',
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!
      };
    } catch (error) {
      logger.error('Failed to upload summary:', error);
      throw new Error(`Summary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload chapter markers as JSON
   */
  async uploadChapterMarkers(chapterMarkers: any[], submissionId: string): Promise<UploadResult> {
    try {
      const blobName = `chapters/${submissionId}.json`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const content = JSON.stringify(chapterMarkers, null, 2);
      const buffer = Buffer.from(content, 'utf-8');

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: 'application/json; charset=utf-8',
          blobCacheControl: 'public, max-age=86400'
        },
        metadata: {
          submissionId,
          type: 'chapter-markers',
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadResponse: BlobUploadCommonResponse = await blockBlobClient.upload(
        buffer,
        buffer.length,
        uploadOptions
      );

      const url = await this.getPublicUrl(blobName);
      
      logger.info(`Chapter markers uploaded successfully: ${blobName}`, {
        submissionId,
        size: buffer.length,
        url
      });

      return {
        url,
        size: buffer.length,
        contentType: 'application/json; charset=utf-8',
        etag: uploadResponse.etag!,
        lastModified: uploadResponse.lastModified!
      };
    } catch (error) {
      logger.error('Failed to upload chapter markers:', error);
      throw new Error(`Chapter markers upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete files for a submission
   */
  async deleteSubmissionFiles(submissionId: string): Promise<void> {
    try {
      const prefixes = ['audio/', 'transcripts/', 'scripts/', 'summaries/', 'chapters/'];
      const deletePromises: Promise<void>[] = [];

      for (const prefix of prefixes) {
        const blobs = this.containerClient.listBlobsFlat({ prefix: `${prefix}${submissionId}` });
        
        for await (const blob of blobs) {
          const deletePromise = this.containerClient.deleteBlob(blob.name).then(() => {});
          deletePromises.push(deletePromise);
        }
      }

      await Promise.all(deletePromises);
      
      // Purge CDN cache for deleted files
      if (cdnService.checkHealth()) {
        try {
          await cdnService.purgeSubmissionContent(submissionId);
          logger.info(`CDN cache purged for submission: ${submissionId}`);
        } catch (error) {
          logger.warn('Failed to purge CDN cache for deleted files', { error, submissionId });
        }
      }
      
      logger.info(`Deleted files for submission: ${submissionId}`, {
        submissionId,
        deletedCount: deletePromises.length
      });
    } catch (error) {
      logger.error('Failed to delete submission files:', error);
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      let lastModified = new Date(0);

      const blobs = this.containerClient.listBlobsFlat();
      for await (const blob of blobs) {
        totalFiles++;
        totalSize += blob.properties.contentLength || 0;
        
        if (blob.properties.lastModified && blob.properties.lastModified > lastModified) {
          lastModified = blob.properties.lastModified;
        }
      }

      return {
        totalFiles,
        totalSize,
        containerName: this.config.containerName,
        lastModified
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      throw new Error(`Storage stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(blobName: string): Promise<boolean> {
    try {
      const blobClient = this.containerClient.getBlobClient(blobName);
      const exists = await blobClient.exists();
      return exists;
    } catch (error) {
      logger.error('Failed to check file existence:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(blobName: string): Promise<any> {
    try {
      const blobClient = this.containerClient.getBlobClient(blobName);
      const properties = await blobClient.getProperties();
      
      return {
        size: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified,
        etag: properties.etag,
        metadata: properties.metadata
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new Error(`Metadata retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate public URL for a blob
   */
  private async getPublicUrl(blobName: string): Promise<string> {
    // Use CDN URL if configured
    if (this.config.cdnBaseUrl) {
      return `${this.config.cdnBaseUrl}/${blobName}`;
    }
    
    // Fallback to direct blob storage URL
    const accountName = this.config.connectionString.match(/AccountName=([^;]+)/)?.[1];
    if (!accountName) {
      throw new Error('Could not extract account name from connection string');
    }
    
    return `https://${accountName}.blob.core.windows.net/${this.config.containerName}/${blobName}`;
  }

  /**
   * Check storage service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Check if container exists and is accessible
      const exists = await this.containerClient.exists();
      if (!exists) {
        logger.warn('Storage container does not exist');
        return false;
      }

      // Try to list blobs to verify access
      const iterator = this.containerClient.listBlobsFlat();
      await iterator.next();
      
      logger.info('Storage service health check passed');
      return true;
    } catch (error) {
      logger.error('Storage service health check failed:', error);
      return false;
    }
  }

  /**
   * Clean up old files (older than specified days)
   */
  async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let deletedCount = 0;
      const blobs = this.containerClient.listBlobsFlat();
      
      for await (const blob of blobs) {
        if (blob.properties.lastModified && blob.properties.lastModified < cutoffDate) {
          await this.containerClient.deleteBlob(blob.name);
          deletedCount++;
        }
      }
      
      logger.info(`Cleaned up ${deletedCount} old files`, {
        olderThanDays,
        cutoffDate,
        deletedCount
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
      throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all audio files in the container
   */
  async listAudioFiles(): Promise<Array<{ name: string; url: string; lastModified?: Date; size?: number }>> {
    try {
      const audioFiles: Array<{ name: string; url: string; lastModified?: Date; size?: number }> = [];
      
      for await (const blob of this.containerClient.listBlobsFlat({ prefix: 'audio/' })) {
        if (blob.name.endsWith('.mp3')) {
          const url = this.config.cdnBaseUrl 
            ? `${this.config.cdnBaseUrl}/${blob.name}`
            : this.containerClient.getBlockBlobClient(blob.name).url;
            
          audioFiles.push({
            name: blob.name,
            url,
            lastModified: blob.properties.lastModified,
            size: blob.properties.contentLength
          });
        }
      }
      
      return audioFiles;
    } catch (error) {
      logger.error('Failed to list audio files:', error);
      return [];
    }
  }

  /**
   * Get container configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }
}
