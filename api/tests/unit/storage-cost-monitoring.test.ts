import { StorageCostMonitoringService } from '../../src/services/storage-cost-monitoring';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

// Mock the Azure Blob Storage client
jest.mock('@azure/storage-blob');

describe('StorageCostMonitoringService', () => {
  let monitoringService: StorageCostMonitoringService;
  let mockBlobServiceClient: jest.Mocked<BlobServiceClient>;
  let mockContainerClient: jest.Mocked<ContainerClient>;

  beforeEach(() => {
    // Reset environment variables
    process.env['AZURE_STORAGE_CONNECTION_STRING'] = 'test-connection-string';
    process.env['STORAGE_MONTHLY_BUDGET'] = '100';
    process.env['STORAGE_DAILY_SPIKE_THRESHOLD'] = '10';
    process.env['STORAGE_GROWTH_THRESHOLD'] = '20';

    // Mock the BlobServiceClient
    mockContainerClient = {
      listBlobsFlat: jest.fn()
    } as any;

    mockBlobServiceClient = {
      getContainerClient: jest.fn().mockReturnValue(mockContainerClient)
    } as any;

    (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(mockBlobServiceClient);

    monitoringService = new StorageCostMonitoringService();
  });

  describe('Cost Metrics Calculation', () => {
    beforeEach(() => {
      // Mock blob data for testing
      const mockBlobs = [
        {
          name: 'audio1.mp3',
          properties: {
            contentLength: 10485760, // 10MB
            accessTier: 'Hot',
            lastModified: new Date()
          }
        },
        {
          name: 'audio2.mp3',
          properties: {
            contentLength: 20971520, // 20MB
            accessTier: 'Cool',
            lastModified: new Date()
          }
        },
        {
          name: 'image1.jpg',
          properties: {
            contentLength: 5242880, // 5MB
            accessTier: 'Archive',
            lastModified: new Date()
          }
        }
      ];

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        }
      } as any);
    });

    it('should calculate storage metrics correctly', async () => {
      const metrics = await monitoringService.getStorageCostMetrics();

      expect(metrics.totalStorageGB).toBeCloseTo(0.0336, 4); // 35MB in GB
      expect(metrics.hotStorageGB).toBeCloseTo(0.0098, 4); // 10MB in GB
      expect(metrics.coolStorageGB).toBeCloseTo(0.0195, 4); // 20MB in GB
      expect(metrics.archiveStorageGB).toBeCloseTo(0.0049, 4); // 5MB in GB
      expect(metrics.estimatedMonthlyCost).toBeGreaterThan(0);
    });

    it('should calculate cost by tier correctly', async () => {
      const metrics = await monitoringService.getStorageCostMetrics();

      expect(metrics.costByTier.hot).toBeGreaterThan(0);
      expect(metrics.costByTier.cool).toBeGreaterThan(0);
      expect(metrics.costByTier.archive).toBeGreaterThan(0);
      expect(metrics.costByTier.hot).toBeGreaterThan(metrics.costByTier.cool);
      expect(metrics.costByTier.cool).toBeGreaterThan(metrics.costByTier.archive);
    });

    it('should include cost trends', async () => {
      const metrics = await monitoringService.getStorageCostMetrics();

      expect(metrics.costTrends).toHaveProperty('daily');
      expect(metrics.costTrends).toHaveProperty('weekly');
      expect(metrics.costTrends).toHaveProperty('monthly');
      expect(Array.isArray(metrics.costTrends.daily)).toBe(true);
      expect(Array.isArray(metrics.costTrends.weekly)).toBe(true);
      expect(Array.isArray(metrics.costTrends.monthly)).toBe(true);
    });

    it('should generate cost optimization recommendations', async () => {
      const metrics = await monitoringService.getStorageCostMetrics();

      expect(metrics.recommendations).toBeDefined();
      expect(Array.isArray(metrics.recommendations)).toBe(true);
    });
  });

  describe('Cost Alerts', () => {
    beforeEach(() => {
      // Mock high storage usage scenario
      const mockBlobs = Array.from({ length: 100 }, (_, i) => ({
        name: `file${i}.mp3`,
        properties: {
          contentLength: 104857600, // 100MB each
          accessTier: 'Hot',
          lastModified: new Date()
        }
      }));

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        }
      } as any);
    });

    it('should generate budget exceeded alert', async () => {
      // Set a very low budget to trigger alert
      process.env['STORAGE_MONTHLY_BUDGET'] = '1';
      
      const service = new StorageCostMonitoringService();
      const alerts = await service.checkCostAlerts();

      const budgetAlert = alerts.find(alert => alert.id === 'budget-exceeded');
      expect(budgetAlert).toBeDefined();
      expect(budgetAlert?.severity).toBe('critical');
      expect(budgetAlert?.actionRequired).toBe(true);
    });

    it('should generate storage growth alert', async () => {
      // Mock high growth rate
      const service = new StorageCostMonitoringService();
      const alerts = await service.checkCostAlerts();

      const growthAlert = alerts.find(alert => alert.id === 'storage-growth-high');
      expect(growthAlert).toBeDefined();
      expect(growthAlert?.severity).toBe('warning');
    });

    it('should generate hot storage alert when percentage is high', async () => {
      const alerts = await monitoringService.checkCostAlerts();

      const hotStorageAlert = alerts.find(alert => alert.id === 'hot-storage-high');
      expect(hotStorageAlert).toBeDefined();
      expect(hotStorageAlert?.severity).toBe('info');
    });

    it('should not generate alerts when thresholds are not exceeded', async () => {
      // Mock low storage usage
      const mockBlobs = [
        {
          name: 'small-file.txt',
          properties: {
            contentLength: 1024, // 1KB
            accessTier: 'Cool',
            lastModified: new Date()
          }
        }
      ];

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        }
      } as any);

      const alerts = await monitoringService.checkCostAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('Cost Optimization Report', () => {
    beforeEach(() => {
      const mockBlobs = [
        {
          name: 'hot-file.mp3',
          properties: {
            contentLength: 10485760, // 10MB
            accessTier: 'Hot',
            lastModified: new Date()
          }
        },
        {
          name: 'cool-file.mp3',
          properties: {
            contentLength: 20971520, // 20MB
            accessTier: 'Cool',
            lastModified: new Date()
          }
        }
      ];

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        }
      } as any);
    });

    it('should generate comprehensive cost optimization report', async () => {
      const report = await monitoringService.getCostOptimizationReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('recommendations');

      expect(report.summary).toHaveProperty('currentCost');
      expect(report.summary).toHaveProperty('potentialSavings');
      expect(report.summary).toHaveProperty('recommendationsCount');
      expect(report.summary).toHaveProperty('alertsCount');
    });

    it('should include valid summary statistics', async () => {
      const report = await monitoringService.getCostOptimizationReport();

      expect(typeof report.summary.currentCost).toBe('number');
      expect(typeof report.summary.potentialSavings).toBe('number');
      expect(typeof report.summary.recommendationsCount).toBe('number');
      expect(typeof report.summary.alertsCount).toBe('number');
      expect(report.summary.currentCost).toBeGreaterThanOrEqual(0);
      expect(report.summary.potentialSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage client errors gracefully', async () => {
      mockContainerClient.listBlobsFlat.mockImplementation(() => {
        throw new Error('Storage connection failed');
      });

      await expect(monitoringService.getStorageCostMetrics()).rejects.toThrow('Storage connection failed');
    });

    it('should handle missing environment variables', () => {
      delete process.env['AZURE_STORAGE_CONNECTION_STRING'];
      
      expect(() => new StorageCostMonitoringService()).toThrow('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    });

    it('should use default values for missing configuration', () => {
      delete process.env['STORAGE_MONTHLY_BUDGET'];
      delete process.env['STORAGE_DAILY_SPIKE_THRESHOLD'];
      delete process.env['STORAGE_GROWTH_THRESHOLD'];

      const service = new StorageCostMonitoringService();
      expect(service).toBeDefined();
    });
  });

  describe('Cost Calculation Accuracy', () => {
    it('should calculate tier costs with correct pricing', () => {
      const service = new StorageCostMonitoringService();
      
      // Test 1GB costs
      const hotCost = (service as any).calculateTierCost(1, 'Hot');
      const coolCost = (service as any).calculateTierCost(1, 'Cool');
      const archiveCost = (service as any).calculateTierCost(1, 'Archive');

      expect(hotCost).toBeCloseTo(0.0184, 4);
      expect(coolCost).toBeCloseTo(0.01, 4);
      expect(archiveCost).toBeCloseTo(0.00099, 4);
    });

    it('should handle zero storage size', () => {
      const service = new StorageCostMonitoringService();
      
      const hotCost = (service as any).calculateTierCost(0, 'Hot');
      expect(hotCost).toBe(0);
    });

    it('should handle large storage sizes', () => {
      const service = new StorageCostMonitoringService();
      
      const hotCost = (service as any).calculateTierCost(1000, 'Hot'); // 1TB
      expect(hotCost).toBeCloseTo(18.4, 1);
    });
  });

  describe('Growth Rate Calculation', () => {
    it('should calculate growth rate correctly', () => {
      const service = new StorageCostMonitoringService();
      
      // Mock the growth rate calculation
      const growthRate = (service as any).calculateGrowthRate(1000);
      expect(typeof growthRate).toBe('number');
      expect(growthRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Setup and Configuration', () => {
    it('should setup cost monitoring successfully', async () => {
      await expect(monitoringService.setupCostMonitoring()).resolves.not.toThrow();
    });

    it('should log configuration during setup', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await monitoringService.setupCostMonitoring();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cost monitoring thresholds configured:'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });
});
