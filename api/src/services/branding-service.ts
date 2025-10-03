import { logger } from '../utils/logger';
import { BlobStorageService } from './blob-storage-service';

/**
 * Podcast Branding Interface
 */
export interface PodcastBranding {
  title: string;
  imageUrl: string;
  updatedAt: Date;
}

/**
 * Default branding configuration
 */
const DEFAULT_BRANDING: PodcastBranding = {
  title: 'My Podcast',
  imageUrl: 'https://via.placeholder.com/3000x3000.png',
  updatedAt: new Date('2025-01-01T00:00:00Z')
};

/**
 * BrandingService
 * 
 * Manages podcast branding (title and image) using Azure Blob Storage.
 * Stores branding as a JSON file in the 'config' container.
 * Implements Last-Write-Wins (LWW) conflict resolution using timestamps.
 * 
 * Storage Location: `config/branding.json` in Azure Blob Storage
 * 
 * @example
 * ```typescript
 * const brandingService = new BrandingService();
 * 
 * // Get current branding (returns defaults if not set)
 * const branding = await brandingService.getBranding();
 * 
 * // Update branding (partial updates supported)
 * await brandingService.updateBranding({
 *   title: 'My New Podcast Title'
 * });
 * ```
 */
export class BrandingService {
  private readonly containerName = 'config';
  private readonly blobName = 'branding.json';
  private readonly storageService: BlobStorageService;

  constructor(storageService?: BlobStorageService) {
    this.storageService = storageService || new BlobStorageService();
  }

  /**
   * Get current podcast branding
   * Returns default branding if not yet configured
   * 
   * @returns Current branding configuration
   */
  async getBranding(): Promise<PodcastBranding> {
    try {
      logger.debug('Fetching podcast branding from blob storage', {
        container: this.containerName,
        blob: this.blobName
      });

      // Try to get blob properties to check if it exists
      try {
        await this.storageService.getBlobProperties(this.containerName, this.blobName);
      } catch (error) {
        // Blob doesn't exist, return defaults
        logger.info('Branding not found in blob storage, returning defaults');
        return { ...DEFAULT_BRANDING };
      }

      // Download branding JSON
      const content = await this.storageService.downloadBuffer(this.containerName, this.blobName);
      const brandingData = JSON.parse(content.toString('utf-8'));

      // Convert updatedAt string back to Date
      const branding: PodcastBranding = {
        ...brandingData,
        updatedAt: new Date(brandingData.updatedAt)
      };

      logger.info('Successfully fetched podcast branding from blob storage', {
        title: branding.title,
        updatedAt: branding.updatedAt
      });

      return branding;

    } catch (error) {
      logger.error('Failed to fetch branding from blob storage, returning defaults', {
        error: error instanceof Error ? error.message : String(error),
        container: this.containerName,
        blob: this.blobName
      });
      return { ...DEFAULT_BRANDING };
    }
  }

  /**
   * Update podcast branding with Last-Write-Wins (LWW) conflict resolution
   * 
   * @param updates Partial branding updates (title and/or imageUrl)
   * @param timestamp Optional timestamp for the update (defaults to now)
   * @returns Updated branding configuration
   * @throws Error if update fails after retries
   */
  async updateBranding(
    updates: Partial<Pick<PodcastBranding, 'title' | 'imageUrl'>>,
    timestamp?: Date
  ): Promise<PodcastBranding> {
    try {
      logger.debug('Updating podcast branding in blob storage', {
        container: this.containerName,
        blob: this.blobName,
        updates
      });

      // Get current branding
      const currentBranding = await this.getBranding();

      // Create update timestamp
      const updateTimestamp = timestamp || new Date();

      // Implement Last-Write-Wins (LWW): only update if new timestamp is newer
      if (updateTimestamp < currentBranding.updatedAt) {
        logger.warn('Branding update rejected: timestamp is older than current', {
          updateTimestamp,
          currentTimestamp: currentBranding.updatedAt
        });
        return currentBranding;
      }

      // Merge updates with current branding
      const updatedBranding: PodcastBranding = {
        title: updates.title !== undefined ? updates.title : currentBranding.title,
        imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : currentBranding.imageUrl,
        updatedAt: updateTimestamp
      };

      // Upload updated branding to blob storage
      const brandingJson = JSON.stringify(updatedBranding, null, 2);
      await this.storageService.uploadBuffer(
        this.containerName,
        this.blobName,
        Buffer.from(brandingJson, 'utf-8'),
        {
          contentType: 'application/json',
          metadata: {
            updatedAt: updateTimestamp.toISOString()
          }
        }
      );

      logger.info('Successfully updated podcast branding in blob storage', {
        title: updatedBranding.title,
        imageUrl: updatedBranding.imageUrl,
        updatedAt: updatedBranding.updatedAt
      });

      return updatedBranding;

    } catch (error) {
      logger.error('Failed to update branding in blob storage', {
        error: error instanceof Error ? error.message : String(error),
        container: this.containerName,
        blob: this.blobName,
        updates
      });
      throw new Error(`Failed to update branding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reset branding to defaults
   * Useful for testing or initialization
   * 
   * @returns Default branding configuration
   */
  async resetBranding(): Promise<PodcastBranding> {
    logger.info('Resetting podcast branding to defaults');
    return this.updateBranding(DEFAULT_BRANDING, new Date());
  }

  /**
   * Delete branding configuration
   * After deletion, getBranding() will return defaults
   */
  async deleteBranding(): Promise<void> {
    try {
      logger.info('Deleting podcast branding from blob storage');
      
      try {
        await this.storageService.getBlobProperties(this.containerName, this.blobName);
        // Blob exists, delete it
        await this.storageService.deleteBlob(this.containerName, this.blobName);
        logger.info('Successfully deleted podcast branding');
      } catch (error) {
        // Blob doesn't exist, nothing to delete
        logger.info('Branding blob does not exist, nothing to delete');
      }
    } catch (error) {
      logger.error('Failed to delete branding from blob storage', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export singleton instance for convenience
export const brandingService = new BrandingService();
