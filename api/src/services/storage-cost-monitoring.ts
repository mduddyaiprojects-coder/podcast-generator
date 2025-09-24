import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '../utils/logger';
import { getStorageConfig } from '../config/storage';

export interface StorageCostMetrics {
  totalStorageGB: number;
  hotStorageGB: number;
  coolStorageGB: number;
  archiveStorageGB: number;
  estimatedMonthlyCost: number;
  costByTier: {
    hot: number;
    cool: number;
    archive: number;
  };
  costTrends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  recommendations: Array<{
    type: 'tiering' | 'deletion' | 'compression';
    description: string;
    potentialSavings: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface CostAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'recommendation';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value: number;
  threshold?: number;
  timestamp: Date;
  actionRequired: boolean;
}

export class StorageCostMonitoringService {
  private blobServiceClient: BlobServiceClient;
  private config: ReturnType<typeof getStorageConfig>;
  private costThresholds: {
    monthlyBudget: number;
    dailySpikeThreshold: number;
    storageGrowthThreshold: number;
  };

  constructor() {
    this.config = getStorageConfig();
    this.blobServiceClient = this.createBlobServiceClient();
    this.costThresholds = {
      monthlyBudget: parseFloat(process.env['STORAGE_MONTHLY_BUDGET'] || '100'),
      dailySpikeThreshold: parseFloat(process.env['STORAGE_DAILY_SPIKE_THRESHOLD'] || '10'),
      storageGrowthThreshold: parseFloat(process.env['STORAGE_GROWTH_THRESHOLD'] || '20')
    };
  }

  /**
   * Create BlobServiceClient for monitoring operations
   */
  private createBlobServiceClient(): BlobServiceClient {
    const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'];
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  /**
   * Get comprehensive storage cost metrics
   */
  async getStorageCostMetrics(): Promise<StorageCostMetrics> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.config.blobStorage.containerName);
      
      let totalStorageGB = 0;
      let hotStorageGB = 0;
      let coolStorageGB = 0;
      let archiveStorageGB = 0;
      const costByTier = { hot: 0, cool: 0, archive: 0 };

      // Analyze all blobs in the container
      for await (const blob of containerClient.listBlobsFlat()) {
        const sizeInGB = (blob.properties.contentLength || 0) / (1024 * 1024 * 1024);
        totalStorageGB += sizeInGB;

        const accessTier = blob.properties.accessTier || 'Hot';
        switch (accessTier) {
          case 'Hot':
            hotStorageGB += sizeInGB;
            costByTier.hot += this.calculateTierCost(sizeInGB, 'Hot');
            break;
          case 'Cool':
            coolStorageGB += sizeInGB;
            costByTier.cool += this.calculateTierCost(sizeInGB, 'Cool');
            break;
          case 'Archive':
            archiveStorageGB += sizeInGB;
            costByTier.archive += this.calculateTierCost(sizeInGB, 'Archive');
            break;
        }
      }

      const estimatedMonthlyCost = costByTier.hot + costByTier.cool + costByTier.archive;
      const recommendations = await this.generateCostRecommendations({
        totalStorageGB,
        hotStorageGB,
        coolStorageGB,
        archiveStorageGB,
        estimatedMonthlyCost,
        costByTier
      });

      return {
        totalStorageGB,
        hotStorageGB,
        coolStorageGB,
        archiveStorageGB,
        estimatedMonthlyCost,
        costByTier,
        costTrends: await this.getCostTrends(),
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get storage cost metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate cost for a specific storage tier
   */
  private calculateTierCost(sizeInGB: number, tier: 'Hot' | 'Cool' | 'Archive'): number {
    const pricing = {
      'Hot': 0.0184,    // $0.0184 per GB per month
      'Cool': 0.01,     // $0.01 per GB per month
      'Archive': 0.00099 // $0.00099 per GB per month
    };
    return sizeInGB * pricing[tier];
  }

  /**
   * Generate cost optimization recommendations
   */
  private async generateCostRecommendations(metrics: {
    totalStorageGB: number;
    hotStorageGB: number;
    coolStorageGB: number;
    archiveStorageGB: number;
    estimatedMonthlyCost: number;
    costByTier: { hot: number; cool: number; archive: number };
  }): Promise<Array<{
    type: 'tiering' | 'deletion' | 'compression';
    description: string;
    potentialSavings: number;
    priority: 'high' | 'medium' | 'low';
  }>> {
    const recommendations = [];

    // Check if hot storage is too high
    if (metrics.hotStorageGB > 10 && metrics.hotStorageGB / metrics.totalStorageGB > 0.5) {
      const potentialSavings = metrics.hotStorageGB * 0.5 * (0.0184 - 0.01); // Move 50% to Cool
      recommendations.push({
        type: 'tiering' as const,
        description: `Consider moving ${Math.round(metrics.hotStorageGB * 0.5)}GB from Hot to Cool storage`,
        potentialSavings,
        priority: potentialSavings > 10 ? 'high' as const : 'medium' as const
      });
    }

    // Check if cool storage should be archived
    if (metrics.coolStorageGB > 20) {
      const potentialSavings = metrics.coolStorageGB * 0.3 * (0.01 - 0.00099); // Move 30% to Archive
      recommendations.push({
        type: 'tiering' as const,
        description: `Consider archiving ${Math.round(metrics.coolStorageGB * 0.3)}GB from Cool to Archive storage`,
        potentialSavings,
        priority: potentialSavings > 5 ? 'medium' as const : 'low' as const
      });
    }

    // Check monthly budget
    if (metrics.estimatedMonthlyCost > this.costThresholds.monthlyBudget) {
      const overage = metrics.estimatedMonthlyCost - this.costThresholds.monthlyBudget;
      recommendations.push({
        type: 'deletion' as const,
        description: `Storage costs exceed budget by $${overage.toFixed(2)}. Consider deleting old files.`,
        potentialSavings: overage,
        priority: 'high' as const
      });
    }

    return recommendations;
  }

  /**
   * Get cost trends over time
   */
  private async getCostTrends(): Promise<{
    daily: number[];
    weekly: number[];
    monthly: number[];
  }> {
    // This would typically query a time-series database or Azure Monitor
    // For now, return mock data
    return {
      daily: [10, 12, 11, 13, 15, 14, 16], // Last 7 days
      weekly: [80, 85, 90, 88, 95], // Last 5 weeks
      monthly: [300, 320, 340, 360] // Last 4 months
    };
  }

  /**
   * Check for cost alerts
   */
  async checkCostAlerts(): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    const metrics = await this.getStorageCostMetrics();

    // Budget threshold alert
    if (metrics.estimatedMonthlyCost > this.costThresholds.monthlyBudget) {
      alerts.push({
        id: 'budget-exceeded',
        type: 'threshold',
        severity: 'critical',
        message: `Storage costs exceed monthly budget by $${(metrics.estimatedMonthlyCost - this.costThresholds.monthlyBudget).toFixed(2)}`,
        value: metrics.estimatedMonthlyCost,
        threshold: this.costThresholds.monthlyBudget,
        timestamp: new Date(),
        actionRequired: true
      });
    }

    // Storage growth alert
    const growthRate = this.calculateGrowthRate(metrics.totalStorageGB);
    if (growthRate > this.costThresholds.storageGrowthThreshold) {
      alerts.push({
        id: 'storage-growth-high',
        type: 'anomaly',
        severity: 'warning',
        message: `Storage growth rate is ${growthRate.toFixed(1)}% this month`,
        value: growthRate,
        threshold: this.costThresholds.storageGrowthThreshold,
        timestamp: new Date(),
        actionRequired: false
      });
    }

    // High hot storage alert
    if (metrics.hotStorageGB / metrics.totalStorageGB > 0.7) {
      alerts.push({
        id: 'hot-storage-high',
        type: 'recommendation',
        severity: 'info',
        message: `${((metrics.hotStorageGB / metrics.totalStorageGB) * 100).toFixed(1)}% of storage is in Hot tier`,
        value: metrics.hotStorageGB / metrics.totalStorageGB,
        timestamp: new Date(),
        actionRequired: false
      });
    }

    return alerts;
  }

  /**
   * Calculate storage growth rate
   */
  private calculateGrowthRate(_currentStorageGB: number): number {
    // This would typically compare with previous month's data
    // For now, return a mock growth rate
    return 15; // 15% growth
  }

  /**
   * Get cost optimization report
   */
  async getCostOptimizationReport(): Promise<{
    summary: {
      currentCost: number;
      potentialSavings: number;
      recommendationsCount: number;
      alertsCount: number;
    };
    metrics: StorageCostMetrics;
    alerts: CostAlert[];
    recommendations: Array<{
      type: 'tiering' | 'deletion' | 'compression';
      description: string;
      potentialSavings: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    const metrics = await this.getStorageCostMetrics();
    const alerts = await this.checkCostAlerts();
    
    const totalPotentialSavings = metrics.recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);

    return {
      summary: {
        currentCost: metrics.estimatedMonthlyCost,
        potentialSavings: totalPotentialSavings,
        recommendationsCount: metrics.recommendations.length,
        alertsCount: alerts.length
      },
      metrics,
      alerts,
      recommendations: metrics.recommendations
    };
  }

  /**
   * Set up cost monitoring alerts
   */
  async setupCostMonitoring(): Promise<void> {
    logger.info('Setting up storage cost monitoring');
    
    // This would typically set up Azure Monitor alerts or Logic Apps
    // For now, we'll just log the configuration
    logger.info('Cost monitoring thresholds configured:', {
      monthlyBudget: this.costThresholds.monthlyBudget,
      dailySpikeThreshold: this.costThresholds.dailySpikeThreshold,
      storageGrowthThreshold: this.costThresholds.storageGrowthThreshold
    });
  }
}
