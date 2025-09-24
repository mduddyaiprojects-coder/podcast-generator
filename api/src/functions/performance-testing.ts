/**
 * Performance Testing Function
 * HTTP-triggered function for running performance tests
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PerformanceTestUtils } from '../tests/utils/performance-test-utils';
import { PERFORMANCE_BENCHMARKS, LOAD_TEST_CONFIGS } from '../tests/benchmarks/performance-benchmarks';
import { PerformanceMonitoringService } from '../services/performance-monitoring';
import { logger } from '../utils/logger';

const httpTrigger = async function (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const method = request.method?.toUpperCase();
    const action = request.query.get('action') || '';

    logger.info(`Performance testing request: ${method} ${action}`);

    // Initialize services
    const performanceUtils = new PerformanceTestUtils();
    const monitoringService = new PerformanceMonitoringService();

    switch (method) {
      case 'GET':
        return await handleGetRequest(request, performanceUtils, monitoringService, action);
      case 'POST':
        return await handlePostRequest(request, performanceUtils, monitoringService, action);
      default:
        return {
          status: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    logger.error('Performance testing error:', error);
    return {
      status: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function handleGetRequest(
  request: HttpRequest,
  performanceUtils: PerformanceTestUtils,
  monitoringService: PerformanceMonitoringService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'benchmarks':
      return {
        status: 200,
        body: JSON.stringify(PERFORMANCE_BENCHMARKS)
      };

    case 'configs':
      return {
        status: 200,
        body: JSON.stringify(LOAD_TEST_CONFIGS)
      };

    case 'stats':
      const stats = monitoringService.getAllPerformanceStats();
      return {
        status: 200,
        body: JSON.stringify(stats)
      };

    case 'alerts':
      const alerts = monitoringService.getAllAlerts();
      return {
        status: 200,
        body: JSON.stringify(alerts)
      };

    case 'dashboard':
      const dashboard = monitoringService.getDashboardData();
      return {
        status: 200,
        body: JSON.stringify(dashboard)
      };

    case 'health':
      const health = monitoringService.getDashboardData();
      return {
        status: 200,
        body: JSON.stringify({
          status: health.overallHealth,
          activeAlerts: health.activeAlerts.length,
          totalOperations: health.stats.reduce((sum, s) => sum + s.totalOperations, 0),
          recommendations: health.recommendations
        })
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for GET request' })
      };
  }
}

async function handlePostRequest(
  request: HttpRequest,
  performanceUtils: PerformanceTestUtils,
  monitoringService: PerformanceMonitoringService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'run-benchmark':
      const benchmarkName = request.query.get('benchmark');
      if (!benchmarkName) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'benchmark parameter is required' })
        };
      }

      const benchmark = PERFORMANCE_BENCHMARKS.find(b => b.name === benchmarkName);
      if (!benchmark) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'Benchmark not found' })
        };
      }

      try {
        // Generate test operations based on benchmark
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

        const result = await performanceUtils.runBenchmark(benchmark, operations);

        // Record metrics
        for (const metric of result.result.metrics) {
          monitoringService.recordMetric(metric);
        }

        return {
          status: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Benchmark execution failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    case 'run-load-test':
      const configName = request.query.get('config');
      if (!configName) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'config parameter is required' })
        };
      }

      const config = LOAD_TEST_CONFIGS[configName as keyof typeof LOAD_TEST_CONFIGS];
      if (!config) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'Load test config not found' })
        };
      }

      try {
        const result = await performanceUtils.runLoadTest(config);

        // Record metrics
        for (const metric of result.metrics) {
          monitoringService.recordMetric(metric);
        }

        return {
          status: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Load test execution failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    case 'run-custom-test':
      const body = await request.json();
      const { 
        concurrentUsers = 10,
        totalOperations = 100,
        fileSizes = [1024 * 1024],
        fileTypes = ['application/octet-stream'],
        testDuration = 60000
      } = body;

      const customConfig = {
        concurrentUsers,
        totalOperations,
        fileSizes,
        fileTypes,
        testDuration,
        rampUpTime: 10000,
        rampDownTime: 10000
      };

      try {
        const result = await performanceUtils.runLoadTest(customConfig);

        // Record metrics
        for (const metric of result.metrics) {
          monitoringService.recordMetric(metric);
        }

        return {
          status: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Custom test execution failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    case 'test-upload':
      const uploadBody = await request.json();
      const { file, fileName, mimeType, destination } = uploadBody;

      if (!file || !fileName || !mimeType || !destination) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'file, fileName, mimeType, and destination are required' })
        };
      }

      try {
        const fileBuffer = Buffer.from(file, 'base64');
        const metrics = await performanceUtils.testFileUpload(
          fileBuffer,
          fileName,
          mimeType,
          destination
        );

        // Record metric
        monitoringService.recordMetric(metrics);

        return {
          status: 200,
          body: JSON.stringify(metrics)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Upload test failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    case 'test-download':
      const downloadBody = await request.json();
      const { source, destination: downloadDestination } = downloadBody;

      if (!source) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'source is required' })
        };
      }

      try {
        const metrics = await performanceUtils.testFileDownload(source, downloadDestination);

        // Record metric
        monitoringService.recordMetric(metrics);

        return {
          status: 200,
          body: JSON.stringify(metrics)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Download test failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    case 'test-concurrent':
      const concurrentBody = await request.json();
      const { operations, concurrency = 10 } = concurrentBody;

      if (!operations || !Array.isArray(operations)) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'operations array is required' })
        };
      }

      try {
        const results = await performanceUtils.testConcurrentOperations(operations, concurrency);

        // Record metrics
        for (const metric of results) {
          monitoringService.recordMetric(metric);
        }

        return {
          status: 200,
          body: JSON.stringify(results)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Concurrent test failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    case 'check-alerts':
      const alerts = monitoringService.checkAlerts();
      return {
        status: 200,
        body: JSON.stringify(alerts)
      };

    case 'resolve-alert':
      const alertId = request.query.get('alertId');
      if (!alertId) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'alertId parameter is required' })
        };
      }

      const resolved = monitoringService.resolveAlert(alertId);
      return {
        status: resolved ? 200 : 404,
        body: JSON.stringify({ 
          success: resolved,
          message: resolved ? 'Alert resolved' : 'Alert not found'
        })
      };

    case 'update-thresholds':
      const thresholdsBody = await request.json();
      monitoringService.updateThresholds(thresholdsBody);
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'Thresholds updated' })
      };

    case 'cleanup':
      monitoringService.cleanup();
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'Cleanup completed' })
      };

    case 'generate-report':
      const reportBody = await request.json();
      const { testResults } = reportBody;

      if (!testResults || !Array.isArray(testResults)) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'testResults array is required' })
        };
      }

      try {
        const report = performanceUtils.generateReport(testResults);
        return {
          status: 200,
          body: JSON.stringify(report)
        };
      } catch (error) {
        return {
          status: 500,
          body: JSON.stringify({ 
            error: 'Report generation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for POST request' })
      };
  }
}

export { httpTrigger };




