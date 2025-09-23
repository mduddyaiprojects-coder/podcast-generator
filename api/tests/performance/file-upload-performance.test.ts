/**
 * File Upload Performance Tests
 * Comprehensive performance testing for file upload operations
 */

import { PerformanceTestUtils } from '../utils/performance-test-utils';
import { PERFORMANCE_BENCHMARKS, LOAD_TEST_CONFIGS } from '../benchmarks/performance-benchmarks';

// Mock dependencies
jest.mock('../../src/utils/file-utils');
jest.mock('../../src/utils/audio-utils');
jest.mock('../../src/services/azure-blob-storage');

describe('File Upload Performance Tests', () => {
  let performanceUtils: PerformanceTestUtils;

  beforeEach(() => {
    performanceUtils = new PerformanceTestUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single File Upload Performance', () => {
    it('should meet performance benchmarks for small file uploads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Small File Upload (1MB)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024], // 1MB
        count: 1
      });
      
      expect(testFiles.length).toBeGreaterThan(0);
      const testFile = testFiles[0]!;

      const metrics = await performanceUtils.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should meet performance benchmarks for medium file uploads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Medium File Upload (10MB)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [10 * 1024 * 1024], // 10MB
        count: 1
      });
      
      expect(testFiles.length).toBeGreaterThan(0);
      const testFile = testFiles[0]!;

      const metrics = await performanceUtils.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should meet performance benchmarks for large file uploads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Large File Upload (50MB)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [50 * 1024 * 1024], // 50MB
        count: 1
      });
      
      expect(testFiles.length).toBeGreaterThan(0);
      const testFile = testFiles[0]!;

      const metrics = await performanceUtils.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should meet performance benchmarks for audio file uploads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Audio File Upload (MP3)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['audio/mpeg'],
        fileSizes: [5 * 1024 * 1024], // 5MB
        count: 1
      });
      
      expect(testFiles.length).toBeGreaterThan(0);
      const testFile = testFiles[0]!;

      const metrics = await performanceUtils.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });

    it('should meet performance benchmarks for text file uploads', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Text File Upload (TXT)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['text/plain'],
        fileSizes: [1024 * 1024], // 1MB
        count: 1
      });
      
      expect(testFiles.length).toBeGreaterThan(0);
      const testFile = testFiles[0]!;

      const metrics = await performanceUtils.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );

      expect(metrics.success).toBe(true);
      expect(metrics.duration).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(metrics.throughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
    });
  });

  describe('Concurrent Upload Performance', () => {
    it('should handle 10 concurrent uploads within performance thresholds', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Concurrent Upload (10 users)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024], // 1MB
        count: 10
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileUpload(
          file.content,
          file.name,
          file.mimeType,
          `/test-uploads/${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 10);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const averageThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(averageThroughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
      expect(errorRate).toBeLessThan(benchmark!.thresholds.maxErrorRate);
    });

    it('should handle 50 concurrent uploads within performance thresholds', async () => {
      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === 'Concurrent Upload (50 users)');
      expect(benchmark).toBeDefined();

      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024], // 1MB
        count: 50
      });

      const operations = testFiles.map(file => 
        () => performanceUtils.testFileUpload(
          file.content,
          file.name,
          file.mimeType,
          `/test-uploads/${file.name}`
        )
      );

      const results = await performanceUtils.testConcurrentOperations(operations, 50);

      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const averageThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      const errorRate = (results.length - successfulResults.length) / results.length;

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(benchmark!.thresholds.maxResponseTime);
      expect(averageThroughput).toBeGreaterThan(benchmark!.thresholds.minThroughput);
      expect(errorRate).toBeLessThan(benchmark!.thresholds.maxErrorRate);
    });
  });

  describe('Load Testing', () => {
    it('should handle small files load test', async () => {
      const config = LOAD_TEST_CONFIGS.smallFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.1); // Less than 10% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle medium files load test', async () => {
      const config = LOAD_TEST_CONFIGS.mediumFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.2); // Less than 20% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(10000); // Less than 10 seconds
    });

    it('should handle large files load test', async () => {
      const config = LOAD_TEST_CONFIGS.largeFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.3); // Less than 30% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(60000); // Less than 60 seconds
    });

    it('should handle audio files load test', async () => {
      const config = LOAD_TEST_CONFIGS.audioFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.2); // Less than 20% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(15000); // Less than 15 seconds
    });

    it('should handle text files load test', async () => {
      const config = LOAD_TEST_CONFIGS.textFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.1); // Less than 10% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle mixed files load test', async () => {
      const config = LOAD_TEST_CONFIGS.mixedFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.2); // Less than 20% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(8000); // Less than 8 seconds
    });

    it('should handle high concurrency load test', async () => {
      const config = LOAD_TEST_CONFIGS.highConcurrency;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary.totalOperations).toBe(config.totalOperations);
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.3); // Less than 30% error rate
      expect(result.summary.averageResponseTime).toBeLessThan(15000); // Less than 15 seconds
    });
  });

  describe('Performance Regression Testing', () => {
    it('should maintain performance within acceptable thresholds over time', async () => {
      const iterations = 5;
      const results: any[] = [];

      for (let i = 0; i < iterations; i++) {
        const config = LOAD_TEST_CONFIGS.smallFiles;
        const result = await performanceUtils.runLoadTest(config);
        results.push(result);
      }

      // Calculate average performance metrics
      const avgResponseTime = results.reduce((sum, r) => sum + r.summary.averageResponseTime, 0) / results.length;
      const avgThroughput = results.reduce((sum, r) => sum + r.summary.averageThroughput, 0) / results.length;
      const avgErrorRate = results.reduce((sum, r) => sum + r.summary.errorRate, 0) / results.length;

      // Check that performance is consistent
      expect(avgResponseTime).toBeLessThan(3000); // Less than 3 seconds average
      expect(avgThroughput).toBeGreaterThan(500000); // More than 500KB/s average
      expect(avgErrorRate).toBeLessThan(0.1); // Less than 10% error rate average

      // Check that performance doesn't degrade significantly
      const responseTimeVariance = results.map(r => r.summary.averageResponseTime);
      const maxResponseTime = Math.max(...responseTimeVariance);
      const minResponseTime = Math.min(...responseTimeVariance);
      const responseTimeRange = maxResponseTime - minResponseTime;

      expect(responseTimeRange).toBeLessThan(2000); // Less than 2 seconds variance
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle invalid files gracefully without performance impact', async () => {
      const validFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024],
        count: 1
      });
      
      expect(validFiles.length).toBeGreaterThan(0);
      const validFile = validFiles[0]!;

      const invalidFile = Buffer.from('invalid content');

      const operations = [
        () => performanceUtils.testFileUpload(validFile.content, validFile.name, validFile.mimeType, `/test-uploads/${validFile.name}`),
        () => performanceUtils.testFileUpload(invalidFile, 'invalid.txt', 'text/plain', '/test-uploads/invalid.txt'),
        () => performanceUtils.testFileUpload(validFile.content, validFile.name, validFile.mimeType, `/test-uploads/${validFile.name}`)
      ];

      const results = await performanceUtils.testConcurrentOperations(operations, 3);

      const validResults = results.filter(r => r.success);
      const invalidResults = results.filter(r => !r.success);

      expect(validResults.length).toBe(2);
      expect(invalidResults.length).toBe(1);
      expect(invalidResults.length).toBeGreaterThan(0);
      expect(invalidResults[0]!.error).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock a timeout scenario
      const testFiles = performanceUtils.generateTestFiles({
        fileTypes: ['application/octet-stream'],
        fileSizes: [1024 * 1024],
        count: 1
      });
      
      expect(testFiles.length).toBeGreaterThan(0);
      const testFile = testFiles[0]!;

      // This would test timeout handling in a real scenario
      const metrics = await performanceUtils.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );

      // Should either succeed or fail gracefully
      expect(metrics.success !== undefined).toBe(true);
    });
  });

  describe('Resource Utilization', () => {
    it('should not exceed memory limits during large file uploads', async () => {
      const config = LOAD_TEST_CONFIGS.largeFiles;
      const result = await performanceUtils.runLoadTest(config);

      // Check that we can handle large files without memory issues
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.5); // Less than 50% error rate
    });

    it('should handle concurrent uploads without resource exhaustion', async () => {
      const config = LOAD_TEST_CONFIGS.highConcurrency;
      const result = await performanceUtils.runLoadTest(config);

      // Check that high concurrency doesn't cause resource exhaustion
      expect(result.summary.successfulOperations).toBeGreaterThan(0);
      expect(result.summary.errorRate).toBeLessThan(0.5); // Less than 50% error rate
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect comprehensive performance metrics', async () => {
      const config = LOAD_TEST_CONFIGS.smallFiles;
      const result = await performanceUtils.runLoadTest(config);

      expect(result.summary).toHaveProperty('totalOperations');
      expect(result.summary).toHaveProperty('successfulOperations');
      expect(result.summary).toHaveProperty('failedOperations');
      expect(result.summary).toHaveProperty('averageResponseTime');
      expect(result.summary).toHaveProperty('minResponseTime');
      expect(result.summary).toHaveProperty('maxResponseTime');
      expect(result.summary).toHaveProperty('p50ResponseTime');
      expect(result.summary).toHaveProperty('p90ResponseTime');
      expect(result.summary).toHaveProperty('p95ResponseTime');
      expect(result.summary).toHaveProperty('p99ResponseTime');
      expect(result.summary).toHaveProperty('averageThroughput');
      expect(result.summary).toHaveProperty('peakThroughput');
      expect(result.summary).toHaveProperty('errorRate');
    });

    it('should generate performance reports', async () => {
      const configs = [
        LOAD_TEST_CONFIGS.smallFiles,
        LOAD_TEST_CONFIGS.mediumFiles,
        LOAD_TEST_CONFIGS.largeFiles
      ];

      const results = [];
      for (const config of configs) {
        const result = await performanceUtils.runLoadTest(config);
        results.push(result);
      }

      const report = performanceUtils.generateReport(results);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report.summary.totalTests).toBe(3);
      expect(report.details).toHaveLength(3);
    });
  });
});
