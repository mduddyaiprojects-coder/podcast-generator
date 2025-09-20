import { app } from '@azure/functions';

// Register all functions here
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (_request, context) => {
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
});

app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (_request, context) => {
        context.log('Test function processed a request.');

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Test function working!',
                timestamp: new Date().toISOString()
            })
        };
    }
});
