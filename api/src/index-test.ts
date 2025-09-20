// Ultra-simple test function
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function testFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Test function called');
    
    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'Test function working!',
            timestamp: new Date().toISOString()
        })
    };
}

app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: testFunction
});

