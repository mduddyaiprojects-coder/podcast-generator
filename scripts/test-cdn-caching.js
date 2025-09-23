#!/usr/bin/env node

/**
 * CDN Caching Test Script
 * Manual testing script for CDN caching rules and invalidation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:7071/api',
  cdnBaseUrl: process.env.CDN_BASE_URL || 'https://your-cdn-endpoint.azureedge.net',
  testTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
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
 * Test CDN endpoint availability
 */
async function testCdnAvailability() {
  log('\n🔍 Testing CDN Endpoint Availability...', 'cyan');
  
  try {
    const response = await makeRequest(config.cdnBaseUrl, {
      method: 'HEAD'
    });
    
    logTestResult('CDN Endpoint Available', response.status === 200, 
      `Status: ${response.status}`);
    
    return response.status === 200;
  } catch (error) {
    logTestResult('CDN Endpoint Available', false, 
      `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test cache rules for different content types
 */
async function testCacheRules() {
  log('\n📋 Testing Cache Rules...', 'cyan');
  
  const testCases = [
    {
      name: 'Audio Files (MP3)',
      path: '/audio/test-episode.mp3',
      expectedHeaders: {
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff'
      },
      expectedStatus: 200
    },
    {
      name: 'Image Files (JPEG)',
      path: '/images/test-thumbnail.jpg',
      expectedHeaders: {
        'cache-control': 'public, max-age=2592000'
      },
      expectedStatus: 200
    },
    {
      name: 'Text Files (Transcript)',
      path: '/transcripts/test-episode.txt',
      expectedHeaders: {
        'cache-control': 'public, max-age=604800',
        'content-encoding': 'gzip'
      },
      expectedStatus: 200
    },
    {
      name: 'RSS Feeds (XML)',
      path: '/feeds/test-feed.xml',
      expectedHeaders: {
        'cache-control': 'public, max-age=300'
      },
      expectedStatus: 200
    },
    {
      name: 'JSON Files (Chapters)',
      path: '/chapters/test-episode.json',
      expectedHeaders: {
        'cache-control': 'public, max-age=86400',
        'content-encoding': 'gzip'
      },
      expectedStatus: 200
    },
    {
      name: 'Temporary Files (No Cache)',
      path: '/temp/test-file.tmp',
      expectedHeaders: {
        'cache-control': 'no-cache, no-store, must-revalidate'
      },
      expectedStatus: 200
    }
  ];

  for (const testCase of testCases) {
    try {
      const url = `${config.cdnBaseUrl}${testCase.path}`;
      const response = await makeRequest(url, { method: 'HEAD' });
      
      let passed = response.status === testCase.expectedStatus;
      let details = `Status: ${response.status}`;
      
      // Check headers
      for (const [headerName, expectedValue] of Object.entries(testCase.expectedHeaders)) {
        const actualValue = response.headers[headerName];
        if (actualValue && actualValue.includes(expectedValue)) {
          details += `, ${headerName}: ✓`;
        } else {
          passed = false;
          details += `, ${headerName}: ✗ (expected: ${expectedValue}, got: ${actualValue})`;
        }
      }
      
      logTestResult(testCase.name, passed, details);
    } catch (error) {
      logTestResult(testCase.name, false, `Error: ${error.message}`);
    }
  }
}

/**
 * Test cache invalidation API
 */
async function testCacheInvalidation() {
  log('\n🔄 Testing Cache Invalidation...', 'cyan');
  
  try {
    // Test invalidate specific paths
    const response = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'invalidate' },
      data: {
        contentPaths: ['/audio/test-episode.mp3', '/transcripts/test-episode.txt'],
        reason: 'Manual test invalidation',
        priority: 'normal'
      }
    });
    
    logTestResult('Cache Invalidation API', response.status === 200, 
      `Status: ${response.status}, Response: ${JSON.stringify(response.data)}`);
    
    // Test invalidate submission
    const submissionResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'invalidate-submission', submissionId: 'test-submission-123' }
    });
    
    logTestResult('Submission Cache Invalidation', submissionResponse.status === 200,
      `Status: ${submissionResponse.status}`);
    
    // Test invalidate RSS feeds
    const rssResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'invalidate-rss' }
    });
    
    logTestResult('RSS Feed Invalidation', rssResponse.status === 200,
      `Status: ${rssResponse.status}`);
    
  } catch (error) {
    logTestResult('Cache Invalidation API', false, `Error: ${error.message}`);
  }
}

/**
 * Test CDN monitoring and analytics
 */
async function testCdnMonitoring() {
  log('\n📊 Testing CDN Monitoring...', 'cyan');
  
  try {
    // Test health check
    const healthResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'GET',
      params: { action: 'health' }
    });
    
    logTestResult('CDN Health Check', healthResponse.status === 200,
      `Status: ${healthResponse.status}, Health: ${JSON.stringify(healthResponse.data)}`);
    
    // Test analytics
    const analyticsResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'GET',
      params: { 
        action: 'analytics',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    });
    
    logTestResult('CDN Analytics', analyticsResponse.status === 200,
      `Status: ${analyticsResponse.status}`);
    
    // Test dashboard
    const dashboardResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'GET',
      params: { action: 'dashboard' }
    });
    
    logTestResult('CDN Dashboard', dashboardResponse.status === 200,
      `Status: ${dashboardResponse.status}`);
    
    // Test cache rules
    const rulesResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'GET',
      params: { action: 'rules' }
    });
    
    logTestResult('Cache Rules API', rulesResponse.status === 200,
      `Status: ${rulesResponse.status}, Rules: ${rulesResponse.data?.length || 0}`);
    
    // Test statistics
    const statsResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'GET',
      params: { action: 'statistics' }
    });
    
    logTestResult('Cache Statistics', statsResponse.status === 200,
      `Status: ${statsResponse.status}`);
    
  } catch (error) {
    logTestResult('CDN Monitoring', false, `Error: ${error.message}`);
  }
}

/**
 * Test invalidation triggers
 */
async function testInvalidationTriggers() {
  log('\n⚡ Testing Invalidation Triggers...', 'cyan');
  
  try {
    // Test file upload trigger
    const uploadResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'file-upload' },
      data: {
        filePath: '/audio/test-episode.mp3',
        contentType: 'audio/mpeg',
        fileSize: 50 * 1024 * 1024,
        submissionId: 'test-submission-123',
        userId: 'test-user-456'
      }
    });
    
    logTestResult('File Upload Trigger', uploadResponse.status === 200,
      `Status: ${uploadResponse.status}`);
    
    // Test file update trigger
    const updateResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'file-update' },
      data: {
        filePath: '/transcripts/test-episode.txt',
        contentType: 'text/plain',
        fileSize: 1024 * 1024,
        submissionId: 'test-submission-123',
        userId: 'test-user-456'
      }
    });
    
    logTestResult('File Update Trigger', updateResponse.status === 200,
      `Status: ${updateResponse.status}`);
    
    // Test content publish trigger
    const publishResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'content-publish' },
      data: {
        submissionId: 'test-submission-123',
        contentPaths: [
          '/audio/test-episode.mp3',
          '/transcripts/test-episode.txt',
          '/feeds/test-episode.xml'
        ],
        userId: 'test-user-456'
      }
    });
    
    logTestResult('Content Publish Trigger', publishResponse.status === 200,
      `Status: ${publishResponse.status}`);
    
    // Test scheduled invalidation
    const scheduledResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'scheduled-invalidation' }
    });
    
    logTestResult('Scheduled Invalidation', scheduledResponse.status === 200,
      `Status: ${scheduledResponse.status}`);
    
    // Test trigger statistics
    const triggersResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'GET',
      params: { action: 'triggers' }
    });
    
    logTestResult('Trigger Statistics', triggersResponse.status === 200,
      `Status: ${triggersResponse.status}, Triggers: ${triggersResponse.data?.totalTriggers || 0}`);
    
  } catch (error) {
    logTestResult('Invalidation Triggers', false, `Error: ${error.message}`);
  }
}

/**
 * Test performance and load
 */
async function testPerformance() {
  log('\n🚀 Testing Performance...', 'cyan');
  
  const testUrls = [
    '/audio/test-episode-1.mp3',
    '/audio/test-episode-2.mp3',
    '/images/test-thumbnail-1.jpg',
    '/transcripts/test-episode-1.txt',
    '/feeds/test-feed.xml',
    '/chapters/test-episode-1.json'
  ];
  
  const concurrentRequests = 10;
  const testDuration = 5000; // 5 seconds
  
  try {
    const startTime = Date.now();
    const promises = [];
    
    // Create concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      const url = `${config.cdnBaseUrl}${testUrls[i % testUrls.length]}`;
      promises.push(makeRequest(url, { method: 'HEAD' }));
    }
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successfulRequests = responses.filter(r => r.status === 200).length;
    const averageResponseTime = duration / responses.length;
    const throughput = (responses.length / duration) * 1000; // requests per second
    
    logTestResult('Concurrent Request Performance', 
      successfulRequests === responses.length && averageResponseTime < 1000,
      `Success: ${successfulRequests}/${responses.length}, Avg Time: ${averageResponseTime.toFixed(2)}ms, Throughput: ${throughput.toFixed(2)} req/s`);
    
  } catch (error) {
    logTestResult('Performance Test', false, `Error: ${error.message}`);
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  log('\n🛡️ Testing Error Handling...', 'cyan');
  
  try {
    // Test invalid API endpoint
    const invalidResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'invalid-action' }
    });
    
    logTestResult('Invalid Action Handling', invalidResponse.status === 400,
      `Status: ${invalidResponse.status}`);
    
    // Test missing parameters
    const missingParamsResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'invalidate-submission' }
      // Missing submissionId parameter
    });
    
    logTestResult('Missing Parameters Handling', missingParamsResponse.status === 400,
      `Status: ${missingParamsResponse.status}`);
    
    // Test invalid data format
    const invalidDataResponse = await makeRequest(`${config.apiBaseUrl}/cdn-management`, {
      method: 'POST',
      params: { action: 'invalidate' },
      data: {
        contentPaths: 'invalid-format' // Should be array
      }
    });
    
    logTestResult('Invalid Data Format Handling', invalidDataResponse.status >= 400,
      `Status: ${invalidDataResponse.status}`);
    
  } catch (error) {
    logTestResult('Error Handling', false, `Error: ${error.message}`);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  log('\n📋 Test Report', 'cyan');
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
  const reportPath = path.join(__dirname, 'cdn-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config,
    results: testResults
  }, null, 2));
  
  log(`\nReport saved to: ${reportPath}`, 'blue');
}

/**
 * Main test runner
 */
async function runTests() {
  log('🧪 CDN Caching Test Suite', 'bright');
  log('='.repeat(50), 'bright');
  
  log(`API Base URL: ${config.apiBaseUrl}`, 'blue');
  log(`CDN Base URL: ${config.cdnBaseUrl}`, 'blue');
  log(`Test Timeout: ${config.testTimeout}ms`, 'blue');
  
  try {
    await testCdnAvailability();
    await testCacheRules();
    await testCacheInvalidation();
    await testCdnMonitoring();
    await testInvalidationTriggers();
    await testPerformance();
    await testErrorHandling();
    
    generateReport();
    
    // Exit with appropriate code
    process.exit(testResults.failedTests > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testCdnAvailability,
  testCacheRules,
  testCacheInvalidation,
  testCdnMonitoring,
  testInvalidationTriggers,
  testPerformance,
  testErrorHandling
};

