#!/usr/bin/env node

/**
 * File Performance Testing Script
 * Manual testing script for file upload/download performance
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:7071/api',
  testTimeout: 300000, // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000,
  concurrentUsers: 10,
  totalOperations: 100,
  fileSizes: [1024, 1024 * 1024, 10 * 1024 * 1024], // 1KB, 1MB, 10MB
  fileTypes: ['application/octet-stream', 'audio/mpeg', 'text/plain']
};

// Test results storage
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Log with color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Log test result
 */
function logTestResult(testName, passed, details = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    log(`✓ ${testName}`, 'green');
  } else {
    testResults.failedTests++;
    log(`✗ ${testName}`, 'red');
    if (details) {
      log(`  ${details}`, 'yellow');
    }
  }
  testResults.results.push({ testName, passed, details });
}

/**
 * Make HTTP request with retry
 */
async function makeRequest(url, options = {}, retryCount = 0) {
  try {
    const response = await axios({
      url,
      timeout: config.testTimeout,
      ...options
    });
    return response;
  } catch (error) {
    if (retryCount < config.retryAttempts) {
      log(`Request failed, retrying... (${retryCount + 1}/${config.retryAttempts})`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return makeRequest(url, options, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Generate test file
 */
function generateTestFile(size, mimeType) {
  const buffer = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer.toString('base64');
}

/**
 * Test single file upload performance
 */
async function testSingleUpload(fileSize, mimeType) {
  const testName = `Single Upload (${Math.round(fileSize / 1024)}KB, ${mimeType})`;
  
  try {
    const fileContent = generateTestFile(fileSize, mimeType);
    const fileName = `test-${Date.now()}.${mimeType.split('/')[1] || 'bin'}`;
    
    const startTime = performance.now();
    
    const response = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'POST',
      params: { action: 'test-upload' },
      data: {
        file: fileContent,
        fileName: fileName,
        mimeType: mimeType,
        destination: `/test-uploads/${fileName}`
      }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const success = response.status === 200 && response.data.success;
    const throughput = success ? (fileSize / duration) * 1000 : 0; // bytes per second
    
    logTestResult(testName, success, 
      `Duration: ${duration.toFixed(2)}ms, Throughput: ${(throughput / 1024).toFixed(2)}KB/s`);
    
    return { success, duration, throughput, response: response.data };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, duration: 0, throughput: 0, error: error.message };
  }
}

/**
 * Test single file download performance
 */
async function testSingleDownload(fileSize, mimeType) {
  const testName = `Single Download (${Math.round(fileSize / 1024)}KB, ${mimeType})`;
  
  try {
    const fileName = `test-${Date.now()}.${mimeType.split('/')[1] || 'bin'}`;
    
    const startTime = performance.now();
    
    const response = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'POST',
      params: { action: 'test-download' },
      data: {
        source: `/test-downloads/${fileName}`,
        destination: `/tmp/downloaded-${fileName}`
      }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const success = response.status === 200 && response.data.success;
    const throughput = success ? (fileSize / duration) * 1000 : 0; // bytes per second
    
    logTestResult(testName, success, 
      `Duration: ${duration.toFixed(2)}ms, Throughput: ${(throughput / 1024).toFixed(2)}KB/s`);
    
    return { success, duration, throughput, response: response.data };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, duration: 0, throughput: 0, error: error.message };
  }
}

/**
 * Test concurrent uploads
 */
async function testConcurrentUploads(concurrency, totalOperations) {
  const testName = `Concurrent Uploads (${concurrency} users, ${totalOperations} operations)`;
  
  try {
    const operations = [];
    
    for (let i = 0; i < totalOperations; i++) {
      const fileSize = config.fileSizes[i % config.fileSizes.length];
      const mimeType = config.fileTypes[i % config.fileTypes.length];
      const fileContent = generateTestFile(fileSize, mimeType);
      const fileName = `concurrent-test-${i}-${Date.now()}.${mimeType.split('/')[1] || 'bin'}`;
      
      operations.push({
        file: fileContent,
        fileName: fileName,
        mimeType: mimeType,
        destination: `/test-uploads/${fileName}`
      });
    }
    
    const startTime = performance.now();
    
    const response = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'POST',
      params: { action: 'test-concurrent' },
      data: {
        operations: operations.map(op => () => 
          makeRequest(`${config.apiBaseUrl}/performance-testing`, {
            method: 'POST',
            params: { action: 'test-upload' },
            data: op
          })
        ),
        concurrency: concurrency
      }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const success = response.status === 200;
    const results = response.data || [];
    const successfulResults = results.filter(r => r.success);
    const errorRate = (results.length - successfulResults.length) / results.length;
    
    logTestResult(testName, success, 
      `Duration: ${duration.toFixed(2)}ms, Success Rate: ${((1 - errorRate) * 100).toFixed(1)}%, Error Rate: ${(errorRate * 100).toFixed(1)}%`);
    
    return { success, duration, results, errorRate };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, duration: 0, results: [], errorRate: 1, error: error.message };
  }
}

/**
 * Test load test execution
 */
async function testLoadTest(configName) {
  const testName = `Load Test (${configName})`;
  
  try {
    const startTime = performance.now();
    
    const response = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'POST',
      params: { action: 'run-load-test', config: configName }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const success = response.status === 200;
    const result = response.data;
    
    if (success && result) {
      const summary = result.summary;
      logTestResult(testName, true, 
        `Operations: ${summary.totalOperations}, Success: ${summary.successfulOperations}, ` +
        `Avg Response: ${summary.averageResponseTime.toFixed(2)}ms, ` +
        `Error Rate: ${(summary.errorRate * 100).toFixed(1)}%`);
    } else {
      logTestResult(testName, false, 'Load test failed');
    }
    
    return { success, duration, result };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, duration: 0, result: null, error: error.message };
  }
}

/**
 * Test benchmark execution
 */
async function testBenchmark(benchmarkName) {
  const testName = `Benchmark (${benchmarkName})`;
  
  try {
    const startTime = performance.now();
    
    const response = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'POST',
      params: { action: 'run-benchmark', benchmark: benchmarkName }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const success = response.status === 200;
    const result = response.data;
    
    if (success && result) {
      const passed = result.passed;
      const violations = result.violations || [];
      logTestResult(testName, passed, 
        `Passed: ${passed}, Violations: ${violations.length}, ` +
        `Duration: ${duration.toFixed(2)}ms`);
    } else {
      logTestResult(testName, false, 'Benchmark failed');
    }
    
    return { success, duration, result };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, duration: 0, result: null, error: error.message };
  }
}

/**
 * Test performance monitoring
 */
async function testPerformanceMonitoring() {
  const testName = 'Performance Monitoring';
  
  try {
    // Test dashboard
    const dashboardResponse = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'GET',
      params: { action: 'dashboard' }
    });
    
    // Test stats
    const statsResponse = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'GET',
      params: { action: 'stats' }
    });
    
    // Test alerts
    const alertsResponse = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'GET',
      params: { action: 'alerts' }
    });
    
    const success = dashboardResponse.status === 200 && 
                   statsResponse.status === 200 && 
                   alertsResponse.status === 200;
    
    logTestResult(testName, success, 
      `Dashboard: ${dashboardResponse.status}, Stats: ${statsResponse.status}, Alerts: ${alertsResponse.status}`);
    
    return { success, dashboard: dashboardResponse.data, stats: statsResponse.data, alerts: alertsResponse.data };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test custom performance test
 */
async function testCustomPerformance() {
  const testName = 'Custom Performance Test';
  
  try {
    const customConfig = {
      concurrentUsers: 5,
      totalOperations: 50,
      fileSizes: [1024 * 1024], // 1MB
      fileTypes: ['application/octet-stream'],
      testDuration: 30000 // 30 seconds
    };
    
    const startTime = performance.now();
    
    const response = await makeRequest(`${config.apiBaseUrl}/performance-testing`, {
      method: 'POST',
      params: { action: 'run-custom-test' },
      data: customConfig
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const success = response.status === 200;
    const result = response.data;
    
    if (success && result) {
      const summary = result.summary;
      logTestResult(testName, true, 
        `Operations: ${summary.totalOperations}, Success: ${summary.successfulOperations}, ` +
        `Avg Response: ${summary.averageResponseTime.toFixed(2)}ms, ` +
        `Throughput: ${(summary.averageThroughput / 1024).toFixed(2)}KB/s`);
    } else {
      logTestResult(testName, false, 'Custom test failed');
    }
    
    return { success, duration, result };
  } catch (error) {
    logTestResult(testName, false, `Error: ${error.message}`);
    return { success: false, duration: 0, result: null, error: error.message };
  }
}

/**
 * Run all performance tests
 */
async function runAllTests() {
  log('🚀 File Performance Test Suite', 'bright');
  log('='.repeat(50), 'bright');
  
  log(`API Base URL: ${config.apiBaseUrl}`, 'blue');
  log(`Concurrent Users: ${config.concurrentUsers}`, 'blue');
  log(`Total Operations: ${config.totalOperations}`, 'blue');
  log(`File Sizes: ${config.fileSizes.map(s => Math.round(s / 1024) + 'KB').join(', ')}`, 'blue');
  log(`File Types: ${config.fileTypes.join(', ')}`, 'blue');
  
  try {
    // Test single uploads
    log('\n📤 Testing Single File Uploads...', 'cyan');
    for (const fileSize of config.fileSizes) {
      for (const mimeType of config.fileTypes) {
        await testSingleUpload(fileSize, mimeType);
      }
    }
    
    // Test single downloads
    log('\n📥 Testing Single File Downloads...', 'cyan');
    for (const fileSize of config.fileSizes) {
      for (const mimeType of config.fileTypes) {
        await testSingleDownload(fileSize, mimeType);
      }
    }
    
    // Test concurrent uploads
    log('\n🔄 Testing Concurrent Uploads...', 'cyan');
    await testConcurrentUploads(5, 25);
    await testConcurrentUploads(10, 50);
    await testConcurrentUploads(20, 100);
    
    // Test load tests
    log('\n⚡ Testing Load Tests...', 'cyan');
    await testLoadTest('smallFiles');
    await testLoadTest('mediumFiles');
    await testLoadTest('audioFiles');
    await testLoadTest('textFiles');
    
    // Test benchmarks
    log('\n📊 Testing Benchmarks...', 'cyan');
    await testBenchmark('Small File Upload (1MB)');
    await testBenchmark('Medium File Upload (10MB)');
    await testBenchmark('Audio File Upload (MP3)');
    await testBenchmark('Concurrent Upload (10 users)');
    
    // Test performance monitoring
    log('\n📈 Testing Performance Monitoring...', 'cyan');
    await testPerformanceMonitoring();
    
    // Test custom performance test
    log('\n🎯 Testing Custom Performance Test...', 'cyan');
    await testCustomPerformance();
    
    generateReport();
    
    // Exit with appropriate code
    process.exit(testResults.failedTests > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  log('\n📋 Performance Test Report', 'cyan');
  log('='.repeat(50), 'cyan');
  
  const passRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1);
  
  log(`Total Tests: ${testResults.totalTests}`, 'bright');
  log(`Passed: ${testResults.passedTests}`, 'green');
  log(`Failed: ${testResults.failedTests}`, 'red');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
  
  if (testResults.failedTests > 0) {
    log('\nFailed Tests:', 'red');
    testResults.results
      .filter(r => !r.passed)
      .forEach(r => {
        log(`  - ${r.testName}: ${r.details}`, 'yellow');
      });
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, 'file-performance-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config,
    results: testResults
  }, null, 2));
  
  log(`\nReport saved to: ${reportPath}`, 'blue');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testSingleUpload,
  testSingleDownload,
  testConcurrentUploads,
  testLoadTest,
  testBenchmark,
  testPerformanceMonitoring,
  testCustomPerformance
};




