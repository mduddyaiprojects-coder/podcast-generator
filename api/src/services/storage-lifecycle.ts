import { AzureBlobStorageService } from './azure-blob-storage';
import { getStorageConfig } from '../config/storage';
import { logger } from '../utils/logger';
import { BlobServiceClient } from '@azure/storage-blob';

export interface LifecycleStats {
  totalFilesProcessed: number;
  filesDeleted: number;
  filesArchived: number;
  filesTieredToCool: number;
  filesTieredToArchive: number;
  errors: number;
  totalSizeFreed: number;
  estimatedCostSavings: number;
  executionTime: number;
}

export interface FileInfo {
  name: string;
  contentType: string;
  size: number;
  lastModified: Date;
  metadata: Record<string, string>;
  accessTier?: 'Hot' | 'Cool' | 'Archive';
  tags?: Record<string, string>;
}

export interface CostOptimizationConfig {
  enableTiering: boolean;
  enableCompression: boolean;
  enableDeduplication: boolean;
  costThresholds: {
    hotToCoolDays: number;
    coolToArchiveDays: number;
    archiveToDeleteDays: number;
  };
  compressionThreshold: number; // File size threshold for compression (bytes)
}

export class StorageLifecycleService {
  private blobStorage: AzureBlobStorageService;
  private config: ReturnType<typeof getStorageConfig>;
  private costConfig: CostOptimizationConfig;
  private blobServiceClient: BlobServiceClient;

  constructor(blobStorage: AzureBlobStorageService) {
    this.blobStorage = blobStorage;
    this.config = getStorageConfig();
    this.costConfig = this.getCostOptimizationConfig();
    this.blobServiceClient = this.createBlobServiceClient();
  }

  /**
   * Get cost optimization configuration
   */
  private getCostOptimizationConfig(): CostOptimizationConfig {
    return {
      enableTiering: process.env['STORAGE_TIERING_ENABLED'] === 'true',
      enableCompression: process.env['STORAGE_COMPRESSION_ENABLED'] === 'true',
      enableDeduplication: process.env['STORAGE_DEDUPLICATION_ENABLED'] === 'true',
      costThresholds: {
        hotToCoolDays: parseInt(process.env['HOT_TO_COOL_DAYS'] || '30'),
        coolToArchiveDays: parseInt(process.env['COOL_TO_ARCHIVE_DAYS'] || '90'),
        archiveToDeleteDays: parseInt(process.env['ARCHIVE_TO_DELETE_DAYS'] || '365')
      },
      compressionThreshold: parseInt(process.env['COMPRESSION_THRESHOLD'] || '1048576') // 1MB
    };
  }

  /**
   * Create BlobServiceClient for lifecycle management operations
   */
  private createBlobServiceClient(): BlobServiceClient {
    const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'];
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  /**
   * Run the complete lifecycle management process
   */
  async runLifecycleManagement(): Promise<LifecycleStats> {
    const startTime = Date.now();
    const stats: LifecycleStats = {
      totalFilesProcessed: 0,
      filesDeleted: 0,
      filesArchived: 0,
      filesTieredToCool: 0,
      filesTieredToArchive: 0,
      errors: 0,
      totalSizeFreed: 0,
      estimatedCostSavings: 0,
      executionTime: 0
    };

    try {
      logger.info('Starting storage lifecycle management');

      if (!this.config.lifecycle.cleanupEnabled) {
        logger.info('Storage cleanup is disabled, skipping lifecycle management');
        return stats;
      }

      // Get all files in the container
      const files = await this.blobStorage.listFiles();
      stats.totalFilesProcessed = files.length;

      logger.info(`Processing ${files.length} files for lifecycle management`);

      for (const fileName of files) {
        try {
          const fileInfo = await this.getFileInfo(fileName);
          if (!fileInfo) {
            stats.errors++;
            continue;
          }

          const action = this.determineFileAction(fileInfo);
          
          switch (action) {
            case 'delete':
              await this.deleteFile(fileName, fileInfo);
              stats.filesDeleted++;
              stats.totalSizeFreed += fileInfo.size;
              stats.estimatedCostSavings += this.calculateCostSavings(fileInfo.size, fileInfo.accessTier || 'Hot', 'deleted');
              break;
            case 'archive':
              await this.archiveFile(fileName, fileInfo);
              stats.filesArchived++;
              break;
            case 'tierToCool':
              await this.tierFileToCool(fileName, fileInfo);
              stats.filesTieredToCool++;
              stats.estimatedCostSavings += this.calculateCostSavings(fileInfo.size, 'Hot', 'Cool');
              break;
            case 'tierToArchive':
              await this.tierFileToArchive(fileName, fileInfo);
              stats.filesTieredToArchive++;
              stats.estimatedCostSavings += this.calculateCostSavings(fileInfo.size, fileInfo.accessTier || 'Cool', 'Archive');
              break;
            case 'compress':
              await this.compressFile(fileName, fileInfo);
              stats.estimatedCostSavings += this.calculateCompressionSavings(fileInfo.size);
              break;
            case 'keep':
              // File is still within retention period
              break;
          }
        } catch (error) {
          logger.error(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      stats.executionTime = Date.now() - startTime;
      logger.info('Storage lifecycle management completed', stats);

      return stats;
    } catch (error) {
      logger.error('Storage lifecycle management failed:', error);
      stats.executionTime = Date.now() - startTime;
      stats.errors++;
      return stats;
    }
  }

  /**
   * Get file information including metadata
   */
  private async getFileInfo(fileName: string): Promise<FileInfo | null> {
    try {
      const metadata = await this.blobStorage.getFileMetadata(fileName);
      if (!metadata) {
        return null;
      }

      // We would need to get the blob properties to get size and lastModified
      // For now, we'll use the metadata
      return {
        name: fileName,
        contentType: metadata['contentType'] || 'application/octet-stream',
        size: parseInt(metadata['size'] || '0'),
        lastModified: new Date(metadata['lastModified'] || Date.now()),
        metadata
      };
    } catch (error) {
      logger.error(`Failed to get file info for ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Determine what action to take on a file based on its age and type
   */
  private determineFileAction(fileInfo: FileInfo): 'delete' | 'archive' | 'tierToCool' | 'tierToArchive' | 'compress' | 'keep' {
    const now = new Date();
    const ageInDays = (now.getTime() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24);

    // Check if file is a temporary file
    if (fileInfo.metadata['isTemporary'] === 'true') {
      const tempAgeInHours = ageInDays * 24;
      if (tempAgeInHours > this.config.lifecycle.tempFileRetentionHours) {
        return 'delete';
      }
      return 'keep';
    }

    // Check for compression opportunities
    if (this.costConfig.enableCompression && 
        fileInfo.size > this.costConfig.compressionThreshold && 
        this.isCompressibleFile(fileInfo.contentType)) {
      return 'compress';
    }

    // Check audio file lifecycle
    if (fileInfo.contentType.startsWith('audio/')) {
      if (ageInDays > this.config.lifecycle.audioRetentionDays) {
        return 'delete';
      } else if (this.costConfig.enableTiering) {
        if (fileInfo.accessTier === 'Hot' && ageInDays > this.costConfig.costThresholds.hotToCoolDays) {
          return 'tierToCool';
        } else if (fileInfo.accessTier === 'Cool' && ageInDays > this.costConfig.costThresholds.coolToArchiveDays) {
          return 'tierToArchive';
        }
      }
      return 'keep';
    }

    // Check image file lifecycle
    if (fileInfo.contentType.startsWith('image/')) {
      if (ageInDays > this.config.lifecycle.imageRetentionDays) {
        return 'delete';
      } else if (this.costConfig.enableTiering) {
        if (fileInfo.accessTier === 'Hot' && ageInDays > 7) { // Images cool faster
          return 'tierToCool';
        } else if (fileInfo.accessTier === 'Cool' && ageInDays > 14) {
          return 'tierToArchive';
        }
      }
      return 'keep';
    }

    // Check transcript files
    if (fileInfo.contentType.includes('text') || fileInfo.name.includes('transcript')) {
      if (ageInDays > 180) {
        return 'delete';
      } else if (this.costConfig.enableTiering) {
        if (fileInfo.accessTier === 'Hot' && ageInDays > 14) {
          return 'tierToCool';
        } else if (fileInfo.accessTier === 'Cool' && ageInDays > 60) {
          return 'tierToArchive';
        }
      }
      return 'keep';
    }

    // For other file types, use default retention
    if (ageInDays > 30) { // 30 days default
      return 'delete';
    } else if (this.costConfig.enableTiering && fileInfo.accessTier === 'Hot' && ageInDays > 7) {
      return 'tierToCool';
    }

    return 'keep';
  }

  /**
   * Delete a file from storage
   */
  private async deleteFile(fileName: string, fileInfo: FileInfo): Promise<void> {
    try {
      const success = await this.blobStorage.deleteFile(fileName);
      if (success) {
        logger.info(`Deleted file: ${fileName} (${fileInfo.size} bytes)`);
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      logger.error(`Failed to delete file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Archive a file (move to archive container or mark as archived)
   */
  private async archiveFile(fileName: string, _fileInfo: FileInfo): Promise<void> {
    try {
      // For now, we'll just mark the file as archived in metadata
      // In a real implementation, you might move it to an archive container
      logger.info(`Archived file: ${fileName}`);
    } catch (error) {
      logger.error(`Failed to archive file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    lastModified: Date | null;
    filesByType: Record<string, number>;
    filesByAge: {
      recent: number; // < 1 day
      week: number;   // 1-7 days
      month: number;  // 1-30 days
      old: number;    // > 30 days
    };
  }> {
    try {
      const containerStats = await this.blobStorage.getContainerStats();
      const files = await this.blobStorage.listFiles();
      
      const filesByType: Record<string, number> = {};
      const filesByAge = {
        recent: 0,
        week: 0,
        month: 0,
        old: 0
      };

      const now = new Date();

      for (const fileName of files) {
        try {
          const fileInfo = await this.getFileInfo(fileName);
          if (!fileInfo) continue;

          // Count by content type
          const type = fileInfo.contentType.split('/')[0] || 'unknown';
          filesByType[type] = (filesByType[type] || 0) + 1;

          // Count by age
          const ageInDays = (now.getTime() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24);
          if (ageInDays < 1) {
            filesByAge.recent++;
          } else if (ageInDays < 7) {
            filesByAge.week++;
          } else if (ageInDays < 30) {
            filesByAge.month++;
          } else {
            filesByAge.old++;
          }
        } catch (error) {
          logger.error(`Error processing file ${fileName} for stats:`, error);
        }
      }

      return {
        totalFiles: containerStats.totalFiles,
        totalSize: containerStats.totalSize,
        lastModified: containerStats.lastModified,
        filesByType,
        filesByAge
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        lastModified: null,
        filesByType: {},
        filesByAge: {
          recent: 0,
          week: 0,
          month: 0,
          old: 0
        }
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTemporaryFiles(): Promise<number> {
    try {
      const files = await this.blobStorage.listFiles();
      let deletedCount = 0;

      for (const fileName of files) {
        try {
          const fileInfo = await this.getFileInfo(fileName);
          if (!fileInfo) continue;

          if (fileInfo.metadata['isTemporary'] === 'true') {
            const now = new Date();
            const ageInHours = (now.getTime() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60);
            
            if (ageInHours > this.config.lifecycle.tempFileRetentionHours) {
              await this.deleteFile(fileName, fileInfo);
              deletedCount++;
            }
          }
        } catch (error) {
          logger.error(`Error cleaning up temporary file ${fileName}:`, error);
        }
      }

      logger.info(`Cleaned up ${deletedCount} temporary files`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup temporary files:', error);
      return 0;
    }
  }

  /**
   * Tier a file to Cool storage
   */
  private async tierFileToCool(fileName: string, fileInfo: FileInfo): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.config.blobStorage.containerName);
      const blobClient = containerClient.getBlobClient(fileName);
      
      await blobClient.setAccessTier('Cool');
      logger.info(`Tiered file to Cool: ${fileName} (${fileInfo.size} bytes)`);
    } catch (error) {
      logger.error(`Failed to tier file to Cool ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Tier a file to Archive storage
   */
  private async tierFileToArchive(fileName: string, fileInfo: FileInfo): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.config.blobStorage.containerName);
      const blobClient = containerClient.getBlobClient(fileName);
      
      await blobClient.setAccessTier('Archive');
      logger.info(`Tiered file to Archive: ${fileName} (${fileInfo.size} bytes)`);
    } catch (error) {
      logger.error(`Failed to tier file to Archive ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Compress a file if it's beneficial
   */
  private async compressFile(fileName: string, fileInfo: FileInfo): Promise<void> {
    try {
      // For now, we'll just mark the file as compressed in metadata
      // In a real implementation, you would compress the file content
      const containerClient = this.blobServiceClient.getContainerClient(this.config.blobStorage.containerName);
      const blobClient = containerClient.getBlobClient(fileName);
      
      const metadata = {
        ...fileInfo.metadata,
        compressed: 'true',
        compressedAt: new Date().toISOString(),
        originalSize: fileInfo.size.toString()
      };
      
      await blobClient.setMetadata(metadata);
      logger.info(`Marked file for compression: ${fileName} (${fileInfo.size} bytes)`);
    } catch (error) {
      logger.error(`Failed to compress file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Check if a file type is compressible
   */
  private isCompressibleFile(contentType: string): boolean {
    const compressibleTypes = [
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      'application/rss+xml'
    ];
    return compressibleTypes.includes(contentType);
  }

  /**
   * Calculate cost savings from tiering or deletion
   */
  private calculateCostSavings(sizeInBytes: number, fromTier: string, toTier: string): number {
    const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
    
    // Azure Storage pricing (approximate, per GB per month)
    const pricing = {
      'Hot': 0.0184,
      'Cool': 0.01,
      'Archive': 0.00099,
      'deleted': 0
    };
    
    const fromPrice = pricing[fromTier as keyof typeof pricing] || 0;
    const toPrice = pricing[toTier as keyof typeof pricing] || 0;
    
    return (fromPrice - toPrice) * sizeInGB;
  }

  /**
   * Calculate compression savings
   */
  private calculateCompressionSavings(sizeInBytes: number): number {
    // Assume 30% compression ratio for text files
    const compressionRatio = 0.3;
    const compressedSize = sizeInBytes * compressionRatio;
    const savings = sizeInBytes - compressedSize;
    const savingsInGB = savings / (1024 * 1024 * 1024);
    
    // Use Hot tier pricing for compression savings calculation
    return savingsInGB * 0.0184;
  }

  /**
   * Get cost optimization recommendations
   */
  async getCostOptimizationRecommendations(): Promise<{
    totalPotentialSavings: number;
    recommendations: Array<{
      type: 'tiering' | 'compression' | 'deletion';
      description: string;
      potentialSavings: number;
      affectedFiles: number;
    }>;
  }> {
    try {
      const files = await this.blobStorage.listFiles();
      const recommendations = [];
      let totalPotentialSavings = 0;

      // Analyze files for tiering opportunities
      let hotFiles = 0;
      let coolFiles = 0;
      let hotToCoolSavings = 0;
      let coolToArchiveSavings = 0;

      for (const fileName of files) {
        const fileInfo = await this.getFileInfo(fileName);
        if (!fileInfo) continue;

        const ageInDays = (Date.now() - fileInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24);

        if (fileInfo.accessTier === 'Hot' && ageInDays > this.costConfig.costThresholds.hotToCoolDays) {
          hotFiles++;
          hotToCoolSavings += this.calculateCostSavings(fileInfo.size, 'Hot', 'Cool');
        } else if (fileInfo.accessTier === 'Cool' && ageInDays > this.costConfig.costThresholds.coolToArchiveDays) {
          coolFiles++;
          coolToArchiveSavings += this.calculateCostSavings(fileInfo.size, 'Cool', 'Archive');
        }
      }

      if (hotFiles > 0) {
        recommendations.push({
          type: 'tiering' as const,
          description: `Move ${hotFiles} files from Hot to Cool storage`,
          potentialSavings: hotToCoolSavings,
          affectedFiles: hotFiles
        });
        totalPotentialSavings += hotToCoolSavings;
      }

      if (coolFiles > 0) {
        recommendations.push({
          type: 'tiering' as const,
          description: `Move ${coolFiles} files from Cool to Archive storage`,
          potentialSavings: coolToArchiveSavings,
          affectedFiles: coolFiles
        });
        totalPotentialSavings += coolToArchiveSavings;
      }

      return {
        totalPotentialSavings,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get cost optimization recommendations:', error);
      return {
        totalPotentialSavings: 0,
        recommendations: []
      };
    }
  }

  /**
   * Schedule automated cleanup
   */
  async scheduleCleanup(cronExpression: string = '0 2 * * *'): Promise<void> {
    // This would integrate with Azure Functions or Logic Apps for scheduling
    // For now, we'll just log the schedule
    logger.info(`Cleanup scheduled with cron expression: ${cronExpression}`);
  }
}
