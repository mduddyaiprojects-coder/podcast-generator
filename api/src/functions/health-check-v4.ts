import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheckV4(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Health check function processed a request.');

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

app.http('health-check-v4', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthCheckV4
});
