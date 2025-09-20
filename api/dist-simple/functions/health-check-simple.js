"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckFunction = healthCheckFunction;
const functions_1 = require("@azure/functions");
/**
 * GET /api/health
 * Simple health check endpoint
 */
async function healthCheckFunction(request, context) {
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
functions_1.app.http('health-check', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthCheckFunction
});
