// Minimal Azure Functions entry point
// This version uses only JavaScript-compatible code to avoid TypeScript issues

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

// Simple health check function
export async function healthMinimal(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
            version: 'minimal-1.0.0'
        })
    };
}

// Simple content submission function
export async function contentSubmissionMinimal(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('Content submission request received');
        
        const body = await request.json() as { content_url?: string; content_type?: string };
        const { content_url, content_type } = body;

        // Basic validation
        if (!content_url || !content_type) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'INVALID_REQUEST',
                    message: 'Missing required fields: content_url and content_type'
                })
            };
        }

        // Generate a simple submission ID
        const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Calculate estimated completion (15 minutes from now)
        const estimatedCompletion = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        return {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submission_id: submissionId,
                status: 'pending',
                estimated_completion: estimatedCompletion,
                message: 'Content submission received and queued for processing',
                version: 'minimal-1.0.0'
            })
        };
    } catch (error) {
        context.error('Content submission error:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'INTERNAL_ERROR',
                message: 'An internal error occurred while processing your request'
            })
        };
    }
}

// Register the functions
app.http('health-minimal', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthMinimal
});

app.http('content-submission-minimal', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'content',
    handler: contentSubmissionMinimal
});

