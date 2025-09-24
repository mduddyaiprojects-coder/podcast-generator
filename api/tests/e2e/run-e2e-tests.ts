#!/usr/bin/env node

/**
 * End-to-End Test Runner for Podcast Generator
 * 
 * This script runs comprehensive E2E tests to validate the complete
 * podcast generation pipeline with real content.
 */

import { execSync } from 'child_process';
import { logger } from '../../src/utils/logger';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passCount: number;
  failCount: number;
  skipCount: number;
}

class E2ETestRunner {
  private testSuites: TestSuite[] = [];
  private startTime: number = 0;

  async runTests(): Promise<void> {
    this.startTime = Date.now();
    logger.info('🚀 Starting End-to-End Tests for Podcast Generator');

    try {
      // Run the E2E test suite
      await this.runTestSuite('Podcast Generation Pipeline', 'podcast-generation-pipeline.test.ts');
      
      // Run additional test suites if they exist
      await this.runTestSuite('Content Processing', 'content-processing.test.ts');
      await this.runTestSuite('RSS Feed Generation', 'rss-feed-generation.test.ts');
      await this.runTestSuite('Audio Generation', 'audio-generation.test.ts');
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      logger.error('❌ E2E Test Runner failed:', error);
      process.exit(1);
    }
  }

  private async runTestSuite(suiteName: string, testFile: string): Promise<void> {
    logger.info(`📋 Running test suite: ${suiteName}`);
    
    const suiteStartTime = Date.now();
    const suite: TestSuite = {
      name: suiteName,
      tests: [],
      totalDuration: 0,
      passCount: 0,
      failCount: 0,
      skipCount: 0
    };

    try {
      // Check if test file exists
      const fs = require('fs');
      const path = require('path');
      const testFilePath = path.join(__dirname, testFile);
      
      if (!fs.existsSync(testFilePath)) {
        logger.warn(`⚠️  Test file not found: ${testFile} - Skipping suite`);
        suite.tests.push({
          testName: 'File Not Found',
          status: 'SKIP',
          duration: 0,
          error: `Test file ${testFile} not found`
        });
        suite.skipCount++;
      } else {
        // Run the test file
        const result = await this.runJestTest(testFilePath);
        suite.tests.push(...result);
        
        // Count results
        suite.tests.forEach(test => {
          switch (test.status) {
            case 'PASS':
              suite.passCount++;
              break;
            case 'FAIL':
              suite.failCount++;
              break;
            case 'SKIP':
              suite.skipCount++;
              break;
          }
        });
      }

      suite.totalDuration = Date.now() - suiteStartTime;
      this.testSuites.push(suite);
      
      logger.info(`✅ Completed test suite: ${suiteName} (${suite.totalDuration}ms)`);
      
    } catch (error) {
      logger.error(`❌ Test suite failed: ${suiteName}`, error);
      suite.tests.push({
        testName: 'Suite Execution',
        status: 'FAIL',
        duration: Date.now() - suiteStartTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      suite.failCount++;
      suite.totalDuration = Date.now() - suiteStartTime;
      this.testSuites.push(suite);
    }
  }

  private async runJestTest(testFilePath: string): Promise<TestResult[]> {
    try {
      // Run Jest with the specific test file
      const command = `npx jest "${testFilePath}" --verbose --no-coverage --forceExit`;
      logger.info(`🔧 Running command: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      // Parse Jest output to extract test results
      return this.parseJestOutput(output);
      
    } catch (error) {
      logger.error('❌ Jest test execution failed:', error);
      return [{
        testName: 'Jest Execution',
        status: 'FAIL',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }

  private parseJestOutput(output: string): TestResult[] {
    const results: TestResult[] = [];
    const lines = output.split('\n');
    
    let currentTest = '';
    let testStartTime = 0;
    
    for (const line of lines) {
      // Match test start
      if (line.includes('✓') || line.includes('✗')) {
        const testName = line.trim();
        const isPass = line.includes('✓');
        const duration = this.extractDuration(line);
        
        results.push({
          testName: testName.replace(/[✓✗]/g, '').trim(),
          status: isPass ? 'PASS' : 'FAIL',
          duration: duration
        });
      }
      
      // Match skipped tests
      if (line.includes('○')) {
        const testName = line.trim().replace(/○/g, '').trim();
        results.push({
          testName,
          status: 'SKIP',
          duration: 0
        });
      }
    }
    
    return results;
  }

  private extractDuration(line: string): number {
    const match = line.match(/\((\d+(?:\.\d+)?)ms\)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.testSuites.reduce((sum, suite) => sum + suite.passCount, 0);
    const totalFailed = this.testSuites.reduce((sum, suite) => sum + suite.failCount, 0);
    const totalSkipped = this.testSuites.reduce((sum, suite) => sum + suite.skipCount, 0);

    logger.info('\n' + '='.repeat(80));
    logger.info('📊 END-TO-END TEST REPORT');
    logger.info('='.repeat(80));
    logger.info(`⏱️  Total Duration: ${totalDuration}ms`);
    logger.info(`📋 Total Tests: ${totalTests}`);
    logger.info(`✅ Passed: ${totalPassed}`);
    logger.info(`❌ Failed: ${totalFailed}`);
    logger.info(`⏭️  Skipped: ${totalSkipped}`);
    logger.info(`📈 Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
    logger.info('='.repeat(80));

    // Detailed results for each suite
    this.testSuites.forEach(suite => {
      logger.info(`\n📋 Test Suite: ${suite.name}`);
      logger.info(`   Duration: ${suite.totalDuration}ms`);
      logger.info(`   Tests: ${suite.tests.length} (✅ ${suite.passCount}, ❌ ${suite.failCount}, ⏭️ ${suite.skipCount})`);
      
      if (suite.failCount > 0) {
        logger.info('   Failed Tests:');
        suite.tests
          .filter(test => test.status === 'FAIL')
          .forEach(test => {
            logger.info(`     ❌ ${test.testName} (${test.duration}ms)`);
            if (test.error) {
              logger.info(`        Error: ${test.error}`);
            }
          });
      }
    });

    logger.info('\n' + '='.repeat(80));
    
    if (totalFailed === 0) {
      logger.info('🎉 All E2E tests passed! The podcast generation pipeline is working correctly.');
    } else {
      logger.error(`💥 ${totalFailed} E2E test(s) failed. Please review the errors above.`);
      process.exit(1);
    }
  }
}

// Run the E2E tests
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.runTests().catch(error => {
    logger.error('💥 E2E Test Runner crashed:', error);
    process.exit(1);
  });
}

export { E2ETestRunner };
