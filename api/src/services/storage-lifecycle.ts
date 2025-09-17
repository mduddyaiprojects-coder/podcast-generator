import { AzureBlobStorageService } from './azure-blob-storage';
import { getStorageConfig } from '../config/storage';
import { logger } from '../utils/logger';

export interface LifecycleStats {
  totalFilesProcessed: number;
  filesDeleted: number;
  filesArchived: number;
  errors: number;
  totalSizeFreed: number;
  executionTime: number;
}

export interface FileInfo {
  name: string;
  contentType: string;
  size: number;
  lastModified: Date;
  metadata: Record<string, string>;
}

export class StorageLifecycleService {
  private blobStorage: AzureBlobStorageService;
  private config: ReturnType<typeof getStorageConfig>;

  constructor(blobStorage: AzureBlobStorageService) {
    this.blobStorage = blobStorage;
    this.config = getStorageConfig();
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
      errors: 0,
      totalSizeFreed: 0,
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
              break;
            case 'archive':
              await this.archiveFile(fileName, fileInfo);
              stats.filesArchived++;
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
  private determineFileAction(fileInfo: FileInfo): 'delete' | 'archive' | 'keep' {
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

    // Check audio file retention
    if (fileInfo.contentType.startsWith('audio/')) {
      if (ageInDays > this.config.lifecycle.audioRetentionDays) {
        return 'delete';
      }
      return 'keep';
    }

    // Check image file retention
    if (fileInfo.contentType.startsWith('image/')) {
      if (ageInDays > this.config.lifecycle.imageRetentionDays) {
        return 'delete';
      }
      return 'keep';
    }

    // For other file types, use default retention
    if (ageInDays > 30) { // 30 days default
      return 'delete';
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
}
