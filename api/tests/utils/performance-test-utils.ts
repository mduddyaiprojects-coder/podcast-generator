/**
 * Performance Testing Utilities
 * Provides comprehensive performance testing capabilities for file upload/download operations
 */

import { performance } from 'perf_hooks';
// import { Readable } from 'stream'; // Not used in this file
import { FileUtils } from '../../src/utils/file-utils';
// import { AudioUtils } from '../../src/utils/audio-utils'; // Not used
import { AzureBlobStorageService } from '../../src/services/azure-blob-storage';
import { logger } from '../../src/utils/logger';

export interface PerformanceMetrics {
  operation: string;
  duration: number; // in milliseconds
  throughput: number; // bytes per second
  success: boolean;
  error?: string;
  metadata?: {
    fileSize: number;
    fileType: string;
    concurrency: number;
    retries: number;
  };
}

export interface LoadTestConfig {
  concurrentUsers: number;
  totalOperations: number;
  fileSizes: number[]; // in bytes
  fileTypes: string[];
  testDuration: number; // in milliseconds
  rampUpTime: number; // in milliseconds
  rampDownTime: number; // in milliseconds
}

export interface LoadTestResult {
  config: LoadTestConfig;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  metrics: PerformanceMetrics[];
  summary: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50ResponseTime: number;
    p90ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    averageThroughput: number;
    peakThroughput: number;
    errorRate: number;
  };
}

export interface PerformanceBenchmark {
  name: string;
  description: string;
  baseline: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  thresholds: {
    maxResponseTime: number;
    minThroughput: number;
    maxErrorRate: number;
  };
}

export class PerformanceTestUtils {
  private fileUtils: FileUtils;
  // private audioUtils: AudioUtils; // Not used in this file
  private blobStorage: AzureBlobStorageService;

  constructor() {
    this.fileUtils = FileUtils.getInstance();
    // this.audioUtils = AudioUtils.getInstance(); // Not used
    this.blobStorage = new AzureBlobStorageService();
  }

  /**
   * Generate test files of different types and sizes
   */
  generateTestFiles(config: {
    fileTypes: string[];
    fileSizes: number[];
    count: number;
  }): Array<{
    name: string;
    content: Buffer;
    mimeType: string;
    size: number;
  }> {
    const testFiles: Array<{
      name: string;
      content: Buffer;
      mimeType: string;
      size: number;
    }> = [];

    for (let i = 0; i < config.count; i++) {
      const fileType = config.fileTypes[i % config.fileTypes.length];
      const fileSize = config.fileSizes[i % config.fileSizes.length];
      
      const testFile = this.generateTestFile(fileType!, fileSize!, `test-file-${i}`);
      testFiles.push(testFile);
    }

    return testFiles;
  }

  /**
   * Generate a single test file
   */
  private generateTestFile(
    mimeType: string,
    size: number,
    name: string
  ): {
    name: string;
    content: Buffer;
    mimeType: string;
    size: number;
  } {
    const extension = this.getExtensionForMimeType(mimeType);
    const fileName = `${name}${extension}`;
    
    // Generate content based on file type
    let content: Buffer;
    
    if (mimeType.startsWith('audio/')) {
      content = this.generateAudioFile(mimeType, size);
    } else if (mimeType.startsWith('text/')) {
      content = this.generateTextFile(size);
    } else if (mimeType.startsWith('image/')) {
      content = this.generateImageFile(mimeType, size);
    } else {
      content = this.generateBinaryFile(size);
    }

    return {
      name: fileName,
      content,
      mimeType,
      size: content.length
    };
  }

  /**
   * Generate audio file content
   */
  private generateAudioFile(mimeType: string, size: number): Buffer {
    // Generate a simple audio file header and padding
    const headerSize = 44; // WAV header size
    const audioDataSize = Math.max(size - headerSize, 1024);
    
    const buffer = Buffer.alloc(size);
    
    if (mimeType === 'audio/wav') {
      // WAV header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(size - 8, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20); // PCM
      buffer.writeUInt16LE(2, 22); // Stereo
      buffer.writeUInt32LE(44100, 24); // Sample rate
      buffer.writeUInt32LE(176400, 28); // Byte rate
      buffer.writeUInt16LE(4, 32); // Block align
      buffer.writeUInt16LE(16, 34); // Bits per sample
      buffer.write('data', 36);
      buffer.writeUInt32LE(audioDataSize, 40);
      
      // Fill with random audio data
      for (let i = headerSize; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    } else {
      // MP3, OGG, etc. - just fill with random data
      for (let i = 0; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return buffer;
  }

  /**
   * Generate text file content
   */
  private generateTextFile(size: number): Buffer {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(Math.ceil(size / 57));
    return Buffer.from(text.substring(0, size), 'utf8');
  }

  /**
   * Generate image file content
   */
  private generateImageFile(mimeType: string, size: number): Buffer {
    const buffer = Buffer.alloc(size);
    
    if (mimeType === 'image/jpeg') {
      // JPEG header
      buffer[0] = 0xFF;
      buffer[1] = 0xD8; // SOI marker
      buffer[2] = 0xFF;
      buffer[3] = 0xE0; // APP0 marker
      
      // Fill with random data
      for (let i = 4; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      
      // JPEG footer
      buffer[size - 2] = 0xFF;
      buffer[size - 1] = 0xD9; // EOI marker
    } else {
      // PNG, GIF, etc. - just fill with random data
      for (let i = 0; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return buffer;
  }

  /**
   * Generate binary file content
   */
  private generateBinaryFile(size: number): Buffer {
    const buffer = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  }

  /**
   * Get file extension for MIME type
   */
  private getExtensionForMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
      'audio/webm': '.webm',
      'text/plain': '.txt',
      'text/html': '.html',
      'application/json': '.json',
      'application/xml': '.xml',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/pdf': '.pdf'
    };
    
    return extensions[mimeType] || '.bin';
  }

  /**
   * Run single file upload performance test
   */
  async testFileUpload(
    file: Buffer,
    _fileName: string,
    mimeType: string,
    destination: string
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    
    try {
      const result = await this.fileUtils.uploadFile(file, destination, {
        // contentType: mimeType, // Not available in UploadOptions
        onProgress: (progress) => {
          logger.debug(`Upload progress: ${progress}%`);
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const throughput = (file.length / duration) * 1000; // bytes per second
      
      return {
        operation: 'file_upload',
        duration,
        throughput,
        success: result.success,
        error: result.error,
        metadata: {
          fileSize: file.length,
          fileType: mimeType,
          concurrency: 1,
          retries: 0
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        operation: 'file_upload',
        duration,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fileSize: file.length,
          fileType: mimeType,
          concurrency: 1,
          retries: 0
        }
      };
    }
  }

  /**
   * Run single file download performance test
   */
  async testFileDownload(
    source: string,
    destination?: string
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    
    try {
      const result = await this.fileUtils.downloadFile(source, destination);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const fileSize = result.metadata?.size || 0;
      const throughput = fileSize > 0 ? (fileSize / duration) * 1000 : 0;
      
      return {
        operation: 'file_download',
        duration,
        throughput,
        success: result.success,
        error: result.error,
        metadata: {
          fileSize,
          fileType: result.metadata?.mimeType || 'unknown',
          concurrency: 1,
          retries: 0
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        operation: 'file_download',
        duration,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fileSize: 0,
          fileType: 'unknown',
          concurrency: 1,
          retries: 0
        }
      };
    }
  }

  /**
   * Run blob storage upload performance test
   */
  async testBlobUpload(
    file: Buffer,
    fileName: string,
    mimeType: string,
    _containerName: string = 'test-container'
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    
    try {
      const result = await this.blobStorage.uploadFile(file, fileName, mimeType);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const throughput = (file.length / duration) * 1000;
      
      return {
        operation: 'blob_upload',
        duration,
        throughput,
        success: result.success,
        error: result.error,
        metadata: {
          fileSize: file.length,
          fileType: mimeType,
          concurrency: 1,
          retries: 0
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        operation: 'blob_upload',
        duration,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fileSize: file.length,
          fileType: mimeType,
          concurrency: 1,
          retries: 0
        }
      };
    }
  }

  /**
   * Run blob storage download performance test
   */
  async testBlobDownload(
    blobName: string,
    _containerName: string = 'test-container'
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    
    try {
      const result = await this.blobStorage.downloadFile(blobName);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const fileSize = (result as any).content?.length || 0;
      const throughput = fileSize > 0 ? (fileSize / duration) * 1000 : 0;
      
      return {
        operation: 'blob_download',
        duration,
        throughput,
        success: result.success,
        error: result.error,
        metadata: {
          fileSize,
          fileType: result.contentType || 'unknown',
          concurrency: 1,
          retries: 0
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        operation: 'blob_download',
        duration,
        throughput: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fileSize: 0,
          fileType: 'unknown',
          concurrency: 1,
          retries: 0
        }
      };
    }
  }

  /**
   * Run concurrent operations performance test
   */
  async testConcurrentOperations(
    operations: Array<() => Promise<PerformanceMetrics>>,
    concurrency: number = 10
  ): Promise<PerformanceMetrics[]> {
    const results: PerformanceMetrics[] = [];
    const startTime = performance.now();
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchPromises = batch.map(op => op());
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        logger.error('Batch operation failed:', error);
        // Add failed results for the batch
        for (let j = 0; j < batch.length; j++) {
          results.push({
            operation: 'concurrent_operation',
            duration: 0,
            throughput: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: {
              fileSize: 0,
              fileType: 'unknown',
              concurrency,
              retries: 0
            }
          });
        }
      }
    }
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    logger.info(`Concurrent operations completed`, {
      totalOperations: operations.length,
      concurrency,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      successfulOperations: results.filter(r => r.success).length,
      failedOperations: results.filter(r => !r.success).length
    });
    
    return results;
  }

  /**
   * Run load test with configurable parameters
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const startTime = new Date();
    const testFiles = this.generateTestFiles({
      fileTypes: config.fileTypes,
      fileSizes: config.fileSizes,
      count: config.totalOperations
    });
    
    logger.info('Starting load test', {
      concurrentUsers: config.concurrentUsers,
      totalOperations: config.totalOperations,
      testDuration: config.testDuration,
      fileTypes: config.fileTypes,
      fileSizes: config.fileSizes
    });
    
    const operations: Array<() => Promise<PerformanceMetrics>> = [];
    
    // Generate operations
    for (let i = 0; i < config.totalOperations; i++) {
        const testFile = testFiles[i]!;
      const operation = () => this.testFileUpload(
        testFile.content,
        testFile.name,
        testFile.mimeType,
        `/test-uploads/${testFile.name}`
      );
      operations.push(operation);
    }
    
    // Run operations with concurrency control
    const metrics = await this.testConcurrentOperations(operations, config.concurrentUsers);
    
    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();
    
    // Calculate summary statistics
    const successfulMetrics = metrics.filter(m => m.success);
    const responseTimes = successfulMetrics.map(m => m.duration);
    const throughputs = successfulMetrics.map(m => m.throughput);
    
    responseTimes.sort((a, b) => a - b);
    
    const summary = {
      totalOperations: metrics.length,
      successfulOperations: successfulMetrics.length,
      failedOperations: metrics.length - successfulMetrics.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? responseTimes[0]! : 0,
      maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1]! : 0,
      p50ResponseTime: this.percentile(responseTimes, 50),
      p90ResponseTime: this.percentile(responseTimes, 90),
      p95ResponseTime: this.percentile(responseTimes, 95),
      p99ResponseTime: this.percentile(responseTimes, 99),
      averageThroughput: throughputs.length > 0 ? throughputs.reduce((a, b) => a + b, 0) / throughputs.length : 0,
      peakThroughput: throughputs.length > 0 ? Math.max(...throughputs) : 0,
      errorRate: metrics.length > 0 ? (metrics.length - successfulMetrics.length) / metrics.length : 0
    };
    
    const result: LoadTestResult = {
      config,
      startTime,
      endTime,
      totalDuration,
      metrics,
      summary
    };
    
    logger.info('Load test completed', summary);
    
    return result;
  }

  /**
   * Calculate percentile value
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]!;
    
    return sortedArray[lower]! * (1 - weight) + sortedArray[upper]! * weight;
  }

  /**
   * Run performance benchmark test
   */
  async runBenchmark(
    benchmark: PerformanceBenchmark,
    operations: Array<() => Promise<PerformanceMetrics>>
  ): Promise<{
    benchmark: PerformanceBenchmark;
    result: LoadTestResult;
    passed: boolean;
    violations: string[];
  }> {
    logger.info(`Running benchmark: ${benchmark.name}`);
    
    const config: LoadTestConfig = {
      concurrentUsers: 10,
      totalOperations: operations.length,
      fileSizes: [1024 * 1024], // 1MB
      fileTypes: ['application/octet-stream'],
      testDuration: 60000, // 1 minute
      rampUpTime: 10000, // 10 seconds
      rampDownTime: 10000 // 10 seconds
    };
    
    const result = await this.runLoadTest(config);
    const violations: string[] = [];
    
    // Check thresholds
    if (result.summary.averageResponseTime > benchmark.thresholds.maxResponseTime) {
      violations.push(`Average response time ${result.summary.averageResponseTime.toFixed(2)}ms exceeds threshold ${benchmark.thresholds.maxResponseTime}ms`);
    }
    
    if (result.summary.averageThroughput < benchmark.thresholds.minThroughput) {
      violations.push(`Average throughput ${result.summary.averageThroughput.toFixed(2)} bytes/s below threshold ${benchmark.thresholds.minThroughput} bytes/s`);
    }
    
    if (result.summary.errorRate > benchmark.thresholds.maxErrorRate) {
      violations.push(`Error rate ${(result.summary.errorRate * 100).toFixed(2)}% exceeds threshold ${(benchmark.thresholds.maxErrorRate * 100).toFixed(2)}%`);
    }
    
    const passed = violations.length === 0;
    
    logger.info(`Benchmark ${benchmark.name} ${passed ? 'PASSED' : 'FAILED'}`, {
      violations,
      summary: result.summary
    });
    
    return {
      benchmark,
      result,
      passed,
      violations
    };
  }

  /**
   * Generate performance report
   */
  generateReport(results: LoadTestResult[]): {
    summary: {
      totalTests: number;
      totalOperations: number;
      averageResponseTime: number;
      averageThroughput: number;
      overallErrorRate: number;
    };
    details: Array<{
      testName: string;
      operations: number;
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
      status: 'pass' | 'fail' | 'warning';
    }>;
    recommendations: string[];
  } {
    const totalTests = results.length;
    const totalOperations = results.reduce((sum, r) => sum + r.summary.totalOperations, 0);
    // const totalSuccessful = results.reduce((sum, r) => sum + r.summary.successfulOperations, 0); // Not used
    const totalFailed = results.reduce((sum, r) => sum + r.summary.failedOperations, 0);
    
    const averageResponseTime = results.reduce((sum, r) => sum + r.summary.averageResponseTime, 0) / totalTests;
    const averageThroughput = results.reduce((sum, r) => sum + r.summary.averageThroughput, 0) / totalTests;
    const overallErrorRate = totalOperations > 0 ? totalFailed / totalOperations : 0;
    
    const details = results.map((result, index) => {
      let status: 'pass' | 'fail' | 'warning' = 'pass';
      
      if (result.summary.errorRate > 0.05) status = 'fail';
      else if (result.summary.errorRate > 0.01) status = 'warning';
      else if (result.summary.averageResponseTime > 5000) status = 'warning';
      
      return {
        testName: `Test ${index + 1}`,
        operations: result.summary.totalOperations,
        averageResponseTime: result.summary.averageResponseTime,
        throughput: result.summary.averageThroughput,
        errorRate: result.summary.errorRate,
        status
      };
    });
    
    const recommendations: string[] = [];
    
    if (overallErrorRate > 0.05) {
      recommendations.push('High error rate detected - investigate network connectivity and server capacity');
    }
    
    if (averageResponseTime > 5000) {
      recommendations.push('High response times detected - consider optimizing file processing or increasing server resources');
    }
    
    if (averageThroughput < 1000000) { // 1MB/s
      recommendations.push('Low throughput detected - consider optimizing file compression or network configuration');
    }
    
    return {
      summary: {
        totalTests,
        totalOperations,
        averageResponseTime,
        averageThroughput,
        overallErrorRate
      },
      details,
      recommendations
    };
  }
}
