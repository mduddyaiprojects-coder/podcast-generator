import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function simpleHealth(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Simple health check function processed a request.');

    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            message: 'Simple health check working!'
        })
    };
}

app.http('simple-health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'simple-health',
    handler: simpleHealth
});
