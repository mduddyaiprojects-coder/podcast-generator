import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { healthConfigService } from '../config/health';
import { HealthProviderFactory } from '../integrations/health-providers';
import { logger } from '../utils/logger';

/**
 * Health Check: YouTube Processing
 * 
 * GET /api/health/youtube
 * 
 * Returns the health status of YouTube processing capabilities.
 * Checks YouTube API connectivity and configuration.
 * 
 * Response:
 * {
 *   status: 'OK' | 'DEGRADED' | 'FAILED',
 *   message: string,
 *   lastSuccessAt: ISO 8601 timestamp
 * }
 * 
 * Related to FR-005: Health Monitoring & Diagnostics
 */

export async function healthYoutubeFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestStartTime = Date.now();
  
  context.log('Health YouTube check requested');
  
  // T023: Log request with telemetry
  logger.info('YouTube health check request received', {
    requestId: context.invocationId,
    timestamp: new Date().toISOString()
  });

  try {
    // Check if YouTube health checks are enabled
    const healthConfig = healthConfigService.getYouTubeHealthCheckConfig();
    
    if (!healthConfig.enabled) {
      const provider = HealthProviderFactory.getYouTubeProvider();
      const lastSuccessAt = provider.getLastSuccessTimestamp();
      const responseTime = Date.now() - requestStartTime;
      
      // T023: Log degraded state with telemetry
      logger.warn('YouTube health checks are disabled', {
        requestId: context.invocationId,
        responseTime,
        lastSuccessAt: lastSuccessAt?.toISOString()
      });
      
      return {
        status: 200,
        jsonBody: {
          status: 'DEGRADED',
          message: 'YouTube health checks are disabled',
          lastSuccessAt: lastSuccessAt?.toISOString() || new Date().toISOString()
        }
      };
    }

    // Get YouTube health provider
    const provider = HealthProviderFactory.getYouTubeProvider();
    
    // Perform health check with timeout
    const checkStartTime = Date.now();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), healthConfig.timeoutMs);
    });

    try {
      // Race between health check and timeout
      const result = await Promise.race([
        provider.checkHealth(),
        timeoutPromise
      ]);

      const checkDuration = Date.now() - checkStartTime;
      const totalResponseTime = Date.now() - requestStartTime;

      // T023: Enhanced success logging with metrics
      logger.info('YouTube health check completed', {
        requestId: context.invocationId,
        status: result.status,
        checkDuration,
        totalResponseTime,
        lastSuccessAt: result.lastSuccessAt?.toISOString(),
        timestamp: new Date().toISOString()
      });

      return {
        status: 200,
        jsonBody: {
          status: result.status,
          message: result.message,
          lastSuccessAt: result.lastSuccessAt?.toISOString() || new Date().toISOString()
        }
      };

    } catch (error) {
      // Timeout or other error during health check
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const checkDuration = Date.now() - checkStartTime;
      const totalResponseTime = Date.now() - requestStartTime;
      const lastSuccessAt = provider.getLastSuccessTimestamp();

      // T023: Enhanced error logging with full context
      logger.warn('YouTube health check timed out or failed', {
        requestId: context.invocationId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        checkDuration,
        totalResponseTime,
        lastSuccessAt: lastSuccessAt?.toISOString(),
        timestamp: new Date().toISOString()
      });

      return {
        status: 200,
        jsonBody: {
          status: 'FAILED',
          message: `YouTube health check error: ${errorMessage}`,
          lastSuccessAt: lastSuccessAt?.toISOString() || new Date().toISOString()
        }
      };
    }

  } catch (error) {
    // Catch-all for unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const totalResponseTime = Date.now() - requestStartTime;
    
    // T023: Critical error logging with full context
    logger.error('YouTube health check encountered unexpected error', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      totalResponseTime,
      timestamp: new Date().toISOString()
    });

    return {
      status: 200,
      jsonBody: {
        status: 'FAILED',
        message: `YouTube health check error: ${errorMessage}`,
        lastSuccessAt: new Date().toISOString()
      }
    };
  }
}

