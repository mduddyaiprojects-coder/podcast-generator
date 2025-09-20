import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * GET /api/health
 * Simple health check endpoint
 */
export async function healthCheckFunction(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  };
}

app.http('health-check', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheckFunction
});



