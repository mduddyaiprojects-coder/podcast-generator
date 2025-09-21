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
import { whisperTranscriptionFunction } from './functions/whisper-transcription';
import { webhookShareFunction } from './functions/webhook-share';
import { testDbFunction } from './functions/test-db';
import { dataRetentionCleanupTimer, dataRetentionHttp } from './functions/data-retention-cleanup';
import { databaseMonitoringFunction } from './functions/database-monitoring';
import { securityHealthFunction, securityAlertsFunction, securityMetricsFunction, securityValidateFunction } from './functions/security-health';
import { 
  monitoringHealthFunction, 
  monitoringMetricsFunction, 
  monitoringAlertsFunction, 
  monitoringResolveAlertFunction, 
  monitoringServicesFunction, 
  monitoringHealthCheckFunction 
} from './functions/monitoring-dashboard';

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

// Whisper transcription endpoint (T058)
app.http('whisper-transcription', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'whisper-transcribe',
    handler: whisperTranscriptionFunction
});

// Webhook share endpoint (T097) - for iOS Shortcuts integration
app.http('webhook-share', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'webhook/share',
  handler: webhookShareFunction
});

// Database test endpoint - for testing database connection
app.http('test-db', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'test-db',
  handler: testDbFunction
});

// Data retention cleanup - timer triggered (daily at 2 AM UTC)
app.timer('data-retention-cleanup', {
  schedule: '0 0 2 * * *', // Daily at 2 AM UTC
  handler: dataRetentionCleanupTimer
});

// Data retention HTTP endpoints - for manual cleanup and monitoring
app.http('data-retention-http', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'data-retention/{action?}',
  handler: dataRetentionHttp
});

// Database monitoring endpoints - for health, alerts, performance, and backups
app.http('database-monitoring', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'database-monitoring/{action?}',
  handler: databaseMonitoringFunction
});

// Security monitoring endpoints (T059)
app.http('security-health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'security/health',
  handler: securityHealthFunction
});

app.http('security-alerts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'security/alerts',
  handler: securityAlertsFunction
});

app.http('security-metrics', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'security/metrics',
  handler: securityMetricsFunction
});

app.http('security-validate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'security/validate',
  handler: securityValidateFunction
});

// Monitoring and alerting endpoints (T061)
app.http('monitoring-health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'monitoring/health',
  handler: monitoringHealthFunction
});

app.http('monitoring-metrics', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'monitoring/metrics',
  handler: monitoringMetricsFunction
});

app.http('monitoring-alerts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'monitoring/alerts',
  handler: monitoringAlertsFunction
});

app.http('monitoring-resolve-alert', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'monitoring/alerts/resolve',
  handler: monitoringResolveAlertFunction
});

app.http('monitoring-services', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'monitoring/services',
  handler: monitoringServicesFunction
});

app.http('monitoring-health-check', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'monitoring/health-check',
  handler: monitoringHealthCheckFunction
});
