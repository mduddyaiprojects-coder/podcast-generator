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
import { testStorageFunction } from './functions/test-storage';
// Feature 002 endpoints
import { heartbeatFunction } from './functions/heartbeat';
import { healthYoutubeFunction } from './functions/health-youtube';
import { healthDocIngestFunction } from './functions/health-doc-ingest';
import { brandingPutFunction } from './functions/branding-put';
import { brandingGetFunction } from './functions/branding-get';
// import { dataRetentionCleanupTimer, dataRetentionHttp } from './functions/data-retention-cleanup';
// import { databaseMonitoringFunction } from './functions/database-monitoring';
// Security endpoints removed - not needed for personal use
// import { 
//   monitoringHealthFunction, 
//   monitoringMetricsFunction, 
//   monitoringAlertsFunction, 
//   monitoringResolveAlertFunction, 
//   monitoringServicesFunction, 
//   monitoringHealthCheckFunction 
// } from './functions/monitoring-dashboard';

// Register all functions with the Azure Functions runtime

// Health check endpoint
app.http('health-check', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthCheckFunction
});

// Feature 002: Heartbeat endpoint (T002)
app.http('heartbeat', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'heartbeat',
    handler: heartbeatFunction
});

// Feature 002: YouTube health check endpoint (T002)
app.http('health-youtube', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health/youtube',
    handler: healthYoutubeFunction
});

// Feature 002: Document ingestion health check endpoint (T002)
app.http('health-doc-ingest', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health/doc-ingest',
    handler: healthDocIngestFunction
});

// Feature 002: Branding update endpoint (T002)
app.http('branding-put', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'branding',
    handler: brandingPutFunction
});

// Feature 002: Branding get endpoint
app.http('branding-get', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'branding',
    handler: brandingGetFunction
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
    methods: ['GET', 'HEAD'],
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

// Storage test endpoint - for testing storage connection
app.http('test-storage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'test-storage',
  handler: testStorageFunction
});

// Data retention cleanup - DISABLED (database removed)
// app.timer('data-retention-cleanup', {
//   schedule: '0 0 2 * * *', // Daily at 2 AM UTC
//   handler: dataRetentionCleanupTimer
// });

// Data retention HTTP endpoints - DISABLED (database removed)
// app.http('data-retention-http', {
//   methods: ['GET', 'POST'],
//   authLevel: 'anonymous',
//   route: 'data-retention/{action?}',
//   handler: dataRetentionHttp
// });

// Database monitoring endpoints - DISABLED (database removed)
// app.http('database-monitoring', {
//   methods: ['GET', 'POST'],
//   authLevel: 'anonymous',
//   route: 'database-monitoring/{action?}',
//   handler: databaseMonitoringFunction
// });

// Security monitoring endpoints removed - not needed for personal use

// Monitoring and alerting endpoints (T061) - DISABLED (causing memory issues)
// app.http('monitoring-health', {
//   methods: ['GET'],
//   authLevel: 'anonymous',
//   route: 'monitoring/health',
//   handler: monitoringHealthFunction
// });

// app.http('monitoring-metrics', {
//   methods: ['GET'],
//   authLevel: 'anonymous',
//   route: 'monitoring/metrics',
//   handler: monitoringMetricsFunction
// });

// app.http('monitoring-alerts', {
//   methods: ['GET'],
//   authLevel: 'anonymous',
//   route: 'monitoring/alerts',
//   handler: monitoringAlertsFunction
// });

// app.http('monitoring-resolve-alert', {
//   methods: ['POST'],
//   authLevel: 'anonymous',
//   route: 'monitoring/alerts/resolve',
//   handler: monitoringResolveAlertFunction
// });

// app.http('monitoring-services', {
//   methods: ['GET'],
//   authLevel: 'anonymous',
//   route: 'monitoring/services',
//   handler: monitoringServicesFunction
// });

// app.http('monitoring-health-check', {
//   methods: ['POST'],
//   authLevel: 'anonymous',
//   route: 'monitoring/health-check',
//   handler: monitoringHealthCheckFunction
// });
