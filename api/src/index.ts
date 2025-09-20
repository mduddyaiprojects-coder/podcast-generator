// Main Azure Functions entry point
// This file imports and registers all the functions defined in the functions/ directory

import { app } from '@azure/functions';

// Import all function handlers
import { contentSubmissionFunction } from './functions/content-submission';
import { statusCheckFunction } from './functions/status-check';
import { rssFeedFunction } from './functions/rss-feed';
import { episodesListFunction } from './functions/episodes-list';
import { healthCheckFunction } from './functions/health-check';
import { ttsGenerationFunction } from './functions/tts-generation';
import { youtubeExtractionFunction } from './functions/youtube-extraction';
import { webhookShareFunction } from './functions/webhook-share';

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

// TTS generation endpoint (T034)
app.http('tts-generation', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'tts',
    handler: ttsGenerationFunction
});

// YouTube extraction endpoint (T032)
app.http('youtube-extraction', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'youtube-extract',
    handler: youtubeExtractionFunction
});

// Webhook share endpoint (T097) - for iOS Shortcuts integration
app.http('webhook-share', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'webhook/share',
    handler: webhookShareFunction
});
