// Main Azure Functions entry point
// This file imports and registers all the functions defined in the functions/ directory

import { app } from '@azure/functions';

// Import all function handlers
import { contentSubmissionFunction } from './functions/content-submission';
import { statusCheckFunction } from './functions/status-check';
import { rssFeedFunction } from './functions/rss-feed';
import { episodesListFunction } from './functions/episodes-list';
import { healthCheckFunction } from './functions/health-check';

// Register all functions with the Azure Functions runtime

// Health check endpoint
app.http('health-check', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthCheckFunction
});

// Content submission endpoint (T025)
app.http('content-submission', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'content',
    handler: contentSubmissionFunction
});

// Status check endpoint (T026)
app.http('status-check', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'content/{id}/status',
    handler: statusCheckFunction
});

// RSS feed endpoint (T027)
app.http('rss-feed', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'feeds/{slug}/rss.xml',
    handler: rssFeedFunction
});

// Episodes list endpoint (T028)
app.http('episodes-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'feeds/{slug}/episodes',
    handler: episodesListFunction
});
