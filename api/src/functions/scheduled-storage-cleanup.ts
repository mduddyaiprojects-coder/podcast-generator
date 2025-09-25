import { InvocationContext } from '@azure/functions';
import { AzureBlobStorageService } from '../services/azure-blob-storage';
import { StorageLifecycleService } from '../services/storage-lifecycle';
// Storage cost monitoring removed - not needed for personal use
// import { logger } from '../utils/logger'; // Unused

/**
 * Scheduled function for automated storage cleanup and cost optimization
 * Runs daily at 2 AM UTC
 */
export async function scheduledStorageCleanup(_timer: any, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  context.log('Starting scheduled storage cleanup and cost optimization');

  try {
    // Initialize services
    const blobStorage = new AzureBlobStorageService();
    const lifecycleService = new StorageLifecycleService(blobStorage);
    // Cost monitoring removed - not needed for personal use

    // Initialize blob storage
    await blobStorage.initialize();

    // Run lifecycle management
    context.log('Running storage lifecycle management...');
    const lifecycleStats = await lifecycleService.runLifecycleManagement();
    
    context.log('Lifecycle management completed:', {
      totalFilesProcessed: lifecycleStats.totalFilesProcessed,
      filesDeleted: lifecycleStats.filesDeleted,
      filesArchived: lifecycleStats.filesArchived,
      filesTieredToCool: lifecycleStats.filesTieredToCool,
      filesTieredToArchive: lifecycleStats.filesTieredToArchive,
      totalSizeFreed: lifecycleStats.totalSizeFreed,
      estimatedCostSavings: lifecycleStats.estimatedCostSavings,
      executionTime: lifecycleStats.executionTime
    });

    // Get cost optimization recommendations
    context.log('Getting cost optimization recommendations...');
    const recommendations = await lifecycleService.getCostOptimizationRecommendations();
    
    context.log('Cost optimization recommendations:', {
      totalPotentialSavings: recommendations.totalPotentialSavings,
      recommendationsCount: recommendations.recommendations.length
    });

    // Cost monitoring removed - not needed for personal use

    // Clean up temporary files
    context.log('Cleaning up temporary files...');
    const tempFilesDeleted = await lifecycleService.cleanupTemporaryFiles();
    context.log(`Cleaned up ${tempFilesDeleted} temporary files`);

    // Cost metrics removed - not needed for personal use

    const executionTime = Date.now() - startTime;
    context.log(`Scheduled storage cleanup completed successfully in ${executionTime}ms`);

  } catch (error) {
    context.log('Scheduled storage cleanup failed:', error);
    throw error;
  }
}

/**
 * Timer configuration for the scheduled function
 */
export const timerConfig = {
  schedule: '0 0 2 * * *', // Daily at 2 AM UTC
  runOnStartup: false,
  useMonitor: true
};
