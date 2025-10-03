import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { healthConfigService } from '../config/health';
import { HealthProviderFactory } from '../integrations/health-providers';
import { logger } from '../utils/logger';

/**
 * Health Check: Document Ingestion
 * 
 * GET /api/health/doc-ingest
 * 
 * Returns the health status of document ingestion capabilities.
 * Checks Firecrawl API connectivity and configuration.
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

export async function healthDocIngestFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestStartTime = Date.now();
  
  context.log('Health Document Ingestion check requested');
  
  // T023: Log request with telemetry
  logger.info('Document ingestion health check request received', {
    requestId: context.invocationId,
    timestamp: new Date().toISOString()
  });

  try {
    // Check if document ingestion health checks are enabled
    const healthConfig = healthConfigService.getDocIngestionHealthCheckConfig();
    
    if (!healthConfig.enabled) {
      const provider = HealthProviderFactory.getDocumentIngestionProvider();
      const lastSuccessAt = provider.getLastSuccessTimestamp();
      const responseTime = Date.now() - requestStartTime;
      
      // T023: Log degraded state with telemetry
      logger.warn('Document ingestion health checks are disabled', {
        requestId: context.invocationId,
        responseTime,
        lastSuccessAt: lastSuccessAt?.toISOString()
      });
      
      return {
        status: 200,
        jsonBody: {
          status: 'DEGRADED',
          message: 'Document ingestion health checks are disabled',
          lastSuccessAt: lastSuccessAt?.toISOString() || new Date().toISOString()
        }
      };
    }

    // Get Document Ingestion health provider
    const provider = HealthProviderFactory.getDocumentIngestionProvider();
    
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
      logger.info('Document ingestion health check completed', {
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
      logger.warn('Document ingestion health check timed out or failed', {
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
          message: `Document ingestion health check error: ${errorMessage}`,
          lastSuccessAt: lastSuccessAt?.toISOString() || new Date().toISOString()
        }
      };
    }

  } catch (error) {
    // Catch-all for unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const totalResponseTime = Date.now() - requestStartTime;
    
    // T023: Critical error logging with full context
    logger.error('Document ingestion health check encountered unexpected error', {
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
        message: `Document ingestion health check error: ${errorMessage}`,
        lastSuccessAt: new Date().toISOString()
      }
    };
  }
}

