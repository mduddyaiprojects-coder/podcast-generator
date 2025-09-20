import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheckFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Health check function processed a request.');

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Health check working!',
        version: process.env['FUNCTIONS_EXTENSION_VERSION'] || 'unknown',
        runtime: 'Azure Functions v4'
      })
    };

  } catch (error) {
    context.log('Health check error:', error);
    return {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      })
    };
  }
}
