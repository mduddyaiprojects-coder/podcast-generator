import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { HealthCheckService } from '../services/health-check-service';

export async function healthCheckFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const healthService = new HealthCheckService();
    const healthStatus = await healthService.checkHealth();

    return {
      status: healthStatus.isHealthy ? 200 : 503,
      jsonBody: {
        status: healthStatus.isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: healthStatus.services,
        version: process.env['FUNCTIONS_EXTENSION_VERSION'] || 'unknown'
      }
    };

  } catch (error) {
    context.log('Health check error:', error);
    return {
      status: 503,
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }
    };
  }
}
