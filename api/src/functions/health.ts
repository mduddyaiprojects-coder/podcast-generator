import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Health check function processed a request.');

    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            message: 'Health check working!'
        })
    };
}

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: health
});
