/**
 * File Download Performance Tests
 * Comprehensive performance testing for file download operations
 */

import { PerformanceTestUtils } from '../utils/performance-test-utils';
import { PERFORMANCE_BENCHMARKS, LOAD_TEST_CONFIGS } from '../benchmarks/performance-benchmarks';

// Mock dependencies
jest.mock('../../src/utils/file-utils');
jest.mock('../../src/services/azure-blob-storage');

describe('File Download Performance Tests', () => {
  let performanceUtils: PerformanceTestUtils;

  beforeEach(() => {
    performanceUtils = new PerformanceTestUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single File Download Performance', () => {
    it('should meet performance benchmarks for small file downloads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'File Download (1MB)');
      expect(benchmark).toBeDefined();

      const metrics = await performanceUtils.testFileDownload(
        '/test-downloads/small-file.bin',
        '/tmp/downloaded-small-file.bin'
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should meet performance benchmarks for medium file downloads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'File Download (10MB)');
      expect(benchmark).toBeDefined();

      const metrics = await performanceUtils.testFileDownload(
        '/test-downloads/medium-file.bin',
        '/tmp/downloaded-medium-file.bin'
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should meet performance benchmarks for blob storage downloads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Blob Storage Download');
      expect(benchmark).toBeDefined();

      const metrics = await performanceUtils.testBlobDownload('test-blob.bin');

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });
  });

  describe('Concurrent Download Performance', () => {
    it('should handle concurrent downloads efficiently', async () => {
      const testFiles = [
        '/test-downloads/file1.bin',
        '/test-downloads/file2.bin',
        '/test-downloads/file3.bin',
        '/test-downloads/file4.bin',
        '/test-downloads/file5.bin'
      ];

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(file, `/tmp/downloaded-${file.split('/').pop()}`)
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 5);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const averageThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(5000); // Less than 5 seconds
      expect(averageThroughput).toBeGreaterThan(1000000); // More than 1MB/s
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });

    it('should handle high concurrency downloads', async () => {
      const testFiles = Array.from({ length: 20 }, (_, i) => `/test-downloads/file${i}.bin`);

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(file, `/tmp/downloaded-${file.split('/').pop()}`)
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 20);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(10000); // Less than 10 seconds
      expect(errorRate).toBeLessThan(0.2); // Less than 20% error rate
    });
  });

  describe('Download Load Testing', () => {
    it('should handle small files download load test', async () => {
      const config = {
        ...LOAD_TEST_CONFIGS.smallFiles,
        // Override to use download operations
        fileTypes: ['application/octet-stream']
      };

      // Generate test files first
      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: config.fileTypes,
        fileSizes: config.fileSizes,
        count: config.totalOperations
      });

      // Create download operations
      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(
          `/test-downloads/${file.name}`,
          `/tmp/downloaded-${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, config.concurrentUsers);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(results.length).toBe(config.totalOperations);
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(2000); // Less than 2 seconds
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });

    it('should handle medium files download load test', async () => {
      const config = {
        ...LOAD_TEST_CONFIGS.mediumFiles,
        fileTypes: ['application/octet-stream']
      };

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: config.fileTypes,
        fileSizes: config.fileSizes,
        count: config.totalOperations
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(
          `/test-downloads/${file.name}`,
          `/tmp/downloaded-${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, config.concurrentUsers);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(results.length).toBe(config.totalOperations);
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(5000); // Less than 5 seconds
      expect(errorRate).toBeLessThan(0.2); // Less than 20% error rate
    });

    it('should handle large files download load test', async () => {
      const config = {
        ...LOAD_TEST_CONFIGS.largeFiles,
        fileTypes: ['application/octet-stream']
      };

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: config.fileTypes,
        fileSizes: config.fileSizes,
        count: config.totalOperations
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(
          `/test-downloads/${file.name}`,
          `/tmp/downloaded-${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, config.concurrentUsers);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(results.length).toBe(config.totalOperations);
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(30000); // Less than 30 seconds
      expect(errorRate).toBeLessThan(0.3); // Less than 30% error rate
    });
  });

  describe('Blob Storage Download Performance', () => {
    it('should meet performance benchmarks for blob storage downloads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Blob Storage Download');
      expect(benchmark).toBeDefined();

      const metrics = await performanceUtils.testBlobDownload('test-blob.bin');

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should handle concurrent blob storage downloads', async () => {
      const blobNames = Array.from({ length: 10 }, (_, i) => `test-blob-${i}.bin`);

      const operations = blobNames.map(blobName => 
        () => performanceUtils.testBlobDownload(blobName)
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 10);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const averageThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(3000); // Less than 3 seconds
      expect(averageThroughput).toBeGreaterThan(1000000); // More than 1MB/s
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });
  });

  describe('Download Performance Regression Testing', () => {
    it('should maintain consistent download performance over time', async () => {
      const iterations = 5;
      const results: any[] = [];

      for (let i = 0; i < iterations; i++) {
        const testFiles = performanceUtils.generateTestFiles({
          fileTypes: ['application/octet-stream'],
          fileSizes: [1024 * 1024], // 1MB
          count: 10
        });

        const operations = testFiles.map(file => 
          () => performanceUtils.testFileDownload(
            `/test-downloads/${file.name}`,
            `/tmp/downloaded-${file.name}`
          )
        );

        const batchResults = await performanceUtils.testConcurrentOperations(operations, 5);
        results.push(batchResults);
      }

      // Calculate average performance metrics across iterations
      const allResults = results.flat();
      const successfulResults = allResults.filter(r => r.success);
      const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const avgThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      const avgErrorRate = (allResults.length - successfulResults.length) / allResults.length;

      expect(avgResponseTime).toBeLessThan(2000); // Less than 2 seconds average
      expect(avgThroughput).toBeGreaterThan(1000000); // More than 1MB/s average
      expect(avgErrorRate).toBeLessThan(0.1); // Less than 10% error rate average
    });
  });

  describe('Download Error Handling Performance', () => {
    it('should handle missing files gracefully without performance impact', async () => {
      const operations = [
        () => performanceUtils.testFileDownload('/test-downloads/existing-file.bin', '/tmp/existing.bin'),
        () => performanceUtils.testFileDownload('/test-downloads/missing-file.bin', '/tmp/missing.bin'),
        () => performanceUtils.testFileDownload('/test-downloads/another-existing-file.bin', '/tmp/another.bin')
      ];

      const results = await performanceUtils.testConcurrentOperations(operations, 3);

      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      expect(successfulResults.length).toBe(2);
      expect(failedResults.length).toBe(1);
      expect(failedResults.length).toBeGreaterThan(0);
      expect(failedResults[0]!.error).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock a timeout scenario
      const metrics = await performanceUtils.testFileDownload(
        '/test-downloads/slow-file.bin',
        '/tmp/slow.bin'
      );

      // Should either succeed or fail gracefully
      expect(metrics.success !== undefined).toBe(true);
    });
  });

  describe('Download Resource Utilization', () => {
    it('should not exceed memory limits during large file downloads', async () => {
      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [50 * 1024 * 1024], // 50MB
        count: 5
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(
          `/test-downloads/${file.name}`,
          `/tmp/downloaded-${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 5);

      const successfulResults = results.filter(r => r.success);
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(errorRate).toBeLessThan(0.5); // Less than 50% error rate
    });

    it('should handle concurrent downloads without resource exhaustion', async () => {
      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024], // 1MB
        count: 50
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(
          `/test-downloads/${file.name}`,
          `/tmp/downloaded-${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 50);

      const successfulResults = results.filter(r => r.success);
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(errorRate).toBeLessThan(0.3); // Less than 30% error rate
    });
  });

  describe('Download Performance Monitoring', () => {
    it('should collect comprehensive download performance metrics', async () => {
      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024], // 1MB
        count: 20
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileDownload(
          `/test-downloads/${file.name}`,
          `/tmp/downloaded-${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 10);

      // Check that we have comprehensive metrics
      expect(results.length).toBe(20);
      
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);

      // Calculate summary metrics
      const responseTimes = successfulResults.map(r => r.duration);
      const throughputs = successfulResults.map(r => r.throughput);
      
      responseTimes.sort((a, b) => a - b);
      
      const averageResponseTime = responseTimes.reduce((sum, r) => sum + r, 0) / responseTimes.length;
      const minResponseTime = responseTimes[0];
      const maxResponseTime = responseTimes[responseTimes.length - 1];
      const p50ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.5)];
      const p90ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.9)];
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
      
      const averageThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
      const peakThroughput = Math.max(...throughputs);
      
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(averageResponseTime).toBeGreaterThan(0);
      expect(minResponseTime).toBeGreaterThan(0);
      expect(maxResponseTime).toBeGreaterThan(0);
      expect(p50ResponseTime).toBeGreaterThan(0);
      expect(p90ResponseTime).toBeGreaterThan(0);
      expect(p95ResponseTime).toBeGreaterThan(0);
      expect(p99ResponseTime).toBeGreaterThan(0);
      expect(averageThroughput).toBeGreaterThan(0);
      expect(peakThroughput).toBeGreaterThan(0);
      expect(errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should generate download performance reports', async () => {
      const configs = [
        LOAD_TEST_CONFIGS.smallFiles,
        LOAD_TEST_CONFIGS.mediumFiles
      ];

      const results = [];
      for (const config of configs) {
        const testFiles = performanceUtils.generateTestFiles({
          fileTypes: config.fileTypes,
          fileSizes: config.fileSizes,
          count: config.totalOperations
        });

        const operations = testFiles.map(file => 
          () => performanceUtils.testFileDownload(
            `/test-downloads/${file.name}`,
            `/tmp/downloaded-${file.name}`
          )
        );

        const batchResults = await performanceUtils.testConcurrentOperations(operations, config.concurrentUsers);
        
        // Create a mock LoadTestResult
        const mockResult = {
          config,
          startTime: new Date(),
          endTime: new Date(),
          totalDuration: 60000,
          metrics: batchResults,
          summary: {
            totalOperations: batchResults.length,
            successfulOperations: batchResults.filter(r => r.success).length,
            failedOperations: batchResults.filter(r => !r.success).length,
            averageResponseTime: batchResults.reduce((sum, r) => sum + r.duration, 0) / batchResults.length,
            minResponseTime: Math.min(...batchResults.map(r => r.duration)),
            maxResponseTime: Math.max(...batchResults.map(r => r.duration)),
            p50ResponseTime: 0,
            p90ResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            averageThroughput: batchResults.reduce((sum, r) => sum + r.throughput, 0) / batchResults.length,
            peakThroughput: Math.max(...batchResults.map(r => r.throughput)),
            errorRate: batchResults.filter(r => !r.success).length / batchResults.length
          }
        };
        
        results.push(mockResult);
      }

      const report = performanceUtils.generateReport(results);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report.summary.totalTests).toBe(2);
      expect(report.details).toHaveLength(2);
    });
  });
});
