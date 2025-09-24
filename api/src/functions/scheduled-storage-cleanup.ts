import { InvocationContext } from '@azure/functions';
import { AzureBlobStorageService } from '../services/azure-blob-storage';
import { StorageLifecycleService } from '../services/storage-lifecycle';
import { StorageCostMonitoringService } from '../services/storage-cost-monitoring';
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
    const costMonitoring = new StorageCostMonitoringService();

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

    // Check for cost alerts
    context.log('Checking cost alerts...');
    const alerts = await costMonitoring.checkCostAlerts();
    
    if (alerts.length > 0) {
      context.log('Cost alerts detected:', alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        actionRequired: alert.actionRequired
      })));
    }

    // Clean up temporary files
    context.log('Cleaning up temporary files...');
    const tempFilesDeleted = await lifecycleService.cleanupTemporaryFiles();
    context.log(`Cleaned up ${tempFilesDeleted} temporary files`);

    // Get final cost metrics
    const costMetrics = await costMonitoring.getStorageCostMetrics();
    context.log('Final storage cost metrics:', {
      totalStorageGB: costMetrics.totalStorageGB,
      estimatedMonthlyCost: costMetrics.estimatedMonthlyCost,
      costByTier: costMetrics.costByTier
    });

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
