import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { healthConfigService } from '../config/health';
import { serviceManager } from '../services/service-manager';
import { logger } from '../utils/logger';

/**
 * Heartbeat status enum
 * Indicates overall system health
 */
export enum HeartbeatStatus {
  OK = 'OK',
  DEGRADED = 'DEGRADED',
  FAILED = 'FAILED'
}

/**
 * Heartbeat Function
 * 
 * Provides a simple health status endpoint for the system.
 * Returns overall health status and timestamp.
 * 
 * This endpoint is used by:
 * - iOS Shortcut for backend health verification (FR-007)
 * - Monitoring systems for uptime checks
 * - Load balancers for health checks
 * 
 * Requirements:
 * - FR-016: System MUST publish a heartbeat status indicating overall health
 *           (OK/DEGRADED/FAILED) and a recent timestamp
 * 
 * Response Format:
 * {
 *   "status": "OK" | "DEGRADED" | "FAILED",
 *   "timestamp": "2025-09-30T12:34:56.789Z"
 * }
 */
export async function heartbeatFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    context.log('Heartbeat function processed a request.');
    
    // T023: Log request with telemetry
    logger.info('Heartbeat request received', {
      requestId: context.invocationId,
      timestamp: new Date().toISOString()
    });

    // Check if heartbeat is enabled
    const config = healthConfigService.getHeartbeatConfig();
    if (!config.enabled) {
      const responseTime = Date.now() - startTime;
      logger.warn('Heartbeat is disabled in configuration', {
        requestId: context.invocationId,
        responseTime
      });
      return {
        status: 200,
        jsonBody: {
          status: HeartbeatStatus.DEGRADED,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Determine overall system health
    const status = await determineSystemHealth(context);

    const responseTime = Date.now() - startTime;
    
    // T023: Log successful response with metrics
    logger.info('Heartbeat response sent', {
      requestId: context.invocationId,
      status,
      responseTime,
      timestamp: new Date().toISOString()
    });

    // Return heartbeat response
    return {
      status: 200,
      jsonBody: {
        status,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    // Even if health check fails, return a response
    // (heartbeat should always respond)
    const responseTime = Date.now() - startTime;
    context.error('Heartbeat function error:', error);
    
    // T023: Enhanced error logging with context
    logger.error('Heartbeat error', {
      requestId: context.invocationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime
    });

    return {
      status: 200, // Still return 200 to indicate endpoint is alive
      jsonBody: {
        status: HeartbeatStatus.FAILED,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Determine overall system health
 * 
 * This is a lightweight check that doesn't exhaustively test all services.
 * For detailed health information, use the /health endpoint.
 * 
 * Health Determination Logic:
 * - OK: System is fully operational
 * - DEGRADED: System is operational but with some issues
 * - FAILED: System has critical failures
 */
async function determineSystemHealth(context: InvocationContext): Promise<HeartbeatStatus> {
  try {
    // Perform lightweight health checks
    // We don't want to check every service exhaustively as this should be fast
    
    // Check if service manager is initialized
    if (!serviceManager) {
      logger.warn('ServiceManager not initialized');
      return HeartbeatStatus.DEGRADED;
    }

    // Quick check: Can we access basic services?
    // This is intentionally lightweight to keep response time < 1s
    const healthChecks = await Promise.allSettled([
      checkCoreServices(),
      checkConfiguration()
    ]);

    // Count failed checks
    const failedChecks = healthChecks.filter(result => result.status === 'rejected').length;
    const degradedChecks = healthChecks.filter(
      result => result.status === 'fulfilled' && result.value === false
    ).length;

    // Determine status based on check results
    if (failedChecks > 0) {
      logger.warn('Heartbeat: Critical failures detected', { failedChecks });
      return HeartbeatStatus.FAILED;
    }

    if (degradedChecks > 0) {
      logger.info('Heartbeat: Some services degraded', { degradedChecks });
      return HeartbeatStatus.DEGRADED;
    }

    // All checks passed
    return HeartbeatStatus.OK;

  } catch (error) {
    context.error('Health determination error:', error);
    logger.error('Health determination failed', { error });
    return HeartbeatStatus.FAILED;
  }
}

/**
 * Check core services availability
 * Returns true if core services are accessible, false otherwise
 */
async function checkCoreServices(): Promise<boolean> {
  try {
    // Check if we can access the service manager
    // This is a very lightweight check
    if (!serviceManager) {
      return false;
    }

    // Service manager is accessible
    return true;
  } catch (error) {
    logger.warn('Core services check failed', { error });
    return false;
  }
}

/**
 * Check configuration validity
 * Returns true if configuration is valid, false otherwise
 */
async function checkConfiguration(): Promise<boolean> {
  try {
    // Check if health config is accessible
    const config = healthConfigService.getConfig();
    
    // Verify basic configuration is present
    if (!config || !config.heartbeat) {
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('Configuration check failed', { error });
    return false;
  }
}

