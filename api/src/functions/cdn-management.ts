import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CdnCacheManagementService } from '../services/cdn-cache-management';
import { CdnMonitoringService } from '../services/cdn-monitoring';
import { CdnInvalidationTriggersService } from '../services/cdn-invalidation-triggers';
import { logger } from '../utils/logger';

const httpTrigger = async function (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const method = request.method?.toUpperCase();
    const action = request.query.get('action') || '';

    logger.info(`CDN management request: ${method} ${action}`);

    // Initialize services
    const cacheManagement = new CdnCacheManagementService();
    const monitoring = new CdnMonitoringService();
    const triggers = new CdnInvalidationTriggersService();

    switch (method) {
      case 'GET':
        return await handleGetRequest(request, cacheManagement, monitoring, triggers, action);
      case 'POST':
        return await handlePostRequest(request, cacheManagement, monitoring, triggers, action);
      case 'DELETE':
        return await handleDeleteRequest(request, cacheManagement, action);
      default:
        return {
          status: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    logger.error('CDN management error:', error);
    return {
      status: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function handleGetRequest(
  request: HttpRequest,
  cacheManagement: CdnCacheManagementService,
  monitoring: CdnMonitoringService,
  triggers: CdnInvalidationTriggersService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'health':
      const health = await cacheManagement.checkCacheHealth();
      return {
        status: 200,
        body: JSON.stringify(health)
      };

    case 'analytics':
      const startDate = new Date(request.query.get('startDate') || Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date(request.query.get('endDate') || Date.now());
      const analytics = await monitoring.getCacheAnalytics(startDate, endDate);
      return {
        status: 200,
        body: JSON.stringify(analytics)
      };

    case 'dashboard':
      const dashboard = await monitoring.getHealthDashboard();
      return {
        status: 200,
        body: JSON.stringify(dashboard)
      };

    case 'rules':
      const rules = await cacheManagement.getCacheRules();
      return {
        status: 200,
        body: JSON.stringify(rules)
      };

    case 'statistics':
      const statistics = await cacheManagement.getCacheStatistics();
      return {
        status: 200,
        body: JSON.stringify(statistics)
      };

    case 'triggers':
      const triggerStats = triggers.getTriggerStatistics();
      return {
        status: 200,
        body: JSON.stringify(triggerStats)
      };

    case 'events':
      const limit = parseInt(request.query.get('limit') || '100');
      const events = triggers.getEventHistory(limit);
      return {
        status: 200,
        body: JSON.stringify(events)
      };

    case 'recommendations':
      const recommendations = await monitoring.getOptimizationRecommendations();
      return {
        status: 200,
        body: JSON.stringify(recommendations)
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for GET request' })
      };
  }
}

async function handlePostRequest(
  request: HttpRequest,
  cacheManagement: CdnCacheManagementService,
  monitoring: CdnMonitoringService,
  triggers: CdnInvalidationTriggersService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'invalidate':
      const body = await request.json();
      const invalidationRequest = {
        contentPaths: body.contentPaths || [],
        domains: body.domains,
        reason: body.reason || 'Manual invalidation',
        priority: body.priority || 'normal'
      };
      
      const result = await cacheManagement.invalidateCache(invalidationRequest);
      return {
        status: result.success ? 200 : 500,
        body: JSON.stringify(result)
      };

    case 'invalidate-submission':
      const submissionId = request.query.get('submissionId');
      if (!submissionId) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'submissionId is required' })
        };
      }
      
      const submissionResult = await cacheManagement.invalidateSubmissionCache(submissionId);
      return {
        status: submissionResult.success ? 200 : 500,
        body: JSON.stringify(submissionResult)
      };

    case 'invalidate-rss':
      const rssResult = await cacheManagement.invalidateRssFeeds();
      return {
        status: rssResult.success ? 200 : 500,
        body: JSON.stringify(rssResult)
      };

    case 'invalidate-all':
      const allResult = await cacheManagement.invalidateAllCache();
      return {
        status: allResult.success ? 200 : 500,
        body: JSON.stringify(allResult)
      };

    case 'file-upload':
      const uploadBody = await request.json();
      await triggers.processFileUpload(
        uploadBody.filePath,
        uploadBody.contentType,
        uploadBody.fileSize,
        uploadBody.submissionId,
        uploadBody.userId
      );
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'File upload event processed' })
      };

    case 'file-update':
      const updateBody = await request.json();
      await triggers.processFileUpdate(
        updateBody.filePath,
        updateBody.contentType,
        updateBody.fileSize,
        updateBody.submissionId,
        updateBody.userId
      );
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'File update event processed' })
      };

    case 'file-delete':
      const deleteBody = await request.json();
      await triggers.processFileDelete(
        deleteBody.filePath,
        deleteBody.contentType,
        deleteBody.submissionId,
        deleteBody.userId
      );
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'File delete event processed' })
      };

    case 'content-publish':
      const publishBody = await request.json();
      await triggers.processContentPublish(
        publishBody.submissionId,
        publishBody.contentPaths,
        publishBody.userId
      );
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'Content publish event processed' })
      };

    case 'scheduled-invalidation':
      await triggers.processScheduledInvalidation();
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'Scheduled invalidation processed' })
      };

    case 'add-trigger':
      const triggerBody = await request.json();
      triggers.addTrigger(triggerBody);
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'Trigger added successfully' })
      };

    case 'update-trigger':
      const updateTriggerBody = await request.json();
      const { triggerId, ...updates } = updateTriggerBody;
      const updated = triggers.updateTrigger(triggerId, updates);
      return {
        status: updated ? 200 : 404,
        body: JSON.stringify({ 
          success: updated, 
          message: updated ? 'Trigger updated successfully' : 'Trigger not found' 
        })
      };

    case 'check-alerts':
      const alerts = await monitoring.checkAlerts();
      return {
        status: 200,
        body: JSON.stringify(alerts)
      };

    case 'update-rules':
      const rulesBody = await request.json();
      await cacheManagement.updateCacheRules(rulesBody.rules);
      return {
        status: 200,
        body: JSON.stringify({ success: true, message: 'Cache rules updated successfully' })
      };

    case 'schedule-invalidation':
      const scheduleBody = await request.json();
      const scheduleResult = await cacheManagement.scheduleInvalidation(
        scheduleBody.contentPaths,
        new Date(scheduleBody.scheduleTime),
        scheduleBody.reason
      );
      return {
        status: scheduleResult.success ? 200 : 500,
        body: JSON.stringify(scheduleResult)
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for POST request' })
      };
  }
}

async function handleDeleteRequest(
  request: HttpRequest,
  cacheManagement: CdnCacheManagementService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'trigger':
      const triggerId = request.query.get('triggerId');
      if (!triggerId) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'triggerId is required' })
        };
      }

      // This would require access to the triggers service
      // For now, return a not implemented response
      return {
        status: 501,
        body: JSON.stringify({ error: 'Trigger deletion not implemented' })
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for DELETE request' })
      };
  }
}

export { httpTrigger };

