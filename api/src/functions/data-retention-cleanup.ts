import { HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { DataRetentionService } from '../services/data-retention-service';
import { ErrorHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';

/**
 * Timer-triggered function for data retention cleanup
 * Runs daily at 2 AM UTC to clean up old data
 */
export async function dataRetentionCleanupTimer(
  _myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  try {
    context.log('Starting data retention cleanup...');

    const retentionService = new DataRetentionService();
    const report = await retentionService.executeRetentionPolicies();

    context.log('Data retention cleanup completed:', {
      totalDeleted: report.totalDeleted,
      policiesExecuted: report.policies.length,
      errors: report.errors.length
    });

    // Log detailed results
    for (const policy of report.policies) {
      if (policy.error) {
        context.log(`ERROR: Failed to cleanup ${policy.table}: ${policy.error}`);
      } else {
        context.log(`INFO: Cleaned up ${policy.deletedCount} records from ${policy.table}`);
      }
    }

  } catch (error) {
    context.log(`ERROR: Data retention cleanup failed: ${error}`);
    logger.error('Data retention cleanup failed:', error);
  }
}

/**
 * HTTP-triggered function for manual data retention cleanup
 * GET /api/data-retention/cleanup - Run cleanup now
 * GET /api/data-retention/stats - Get retention statistics
 * POST /api/data-retention/archive - Archive old data
 */
export async function dataRetentionHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const retentionService = new DataRetentionService();
    const method = request.method;
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    context.log(`Data retention HTTP request: ${method} ${action}`);

    switch (action) {
      case 'cleanup':
        if (method === 'GET') {
          const report = await retentionService.executeRetentionPolicies();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Data retention cleanup completed',
              report: {
                timestamp: report.timestamp,
                totalDeleted: report.totalDeleted,
                policies: report.policies,
                errors: report.errors
              }
            }
          };
        }
        break;

      case 'stats':
        if (method === 'GET') {
          const stats = await retentionService.getRetentionStatistics();
          const dbSize = await retentionService.getDatabaseSize();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Retention statistics retrieved',
              statistics: stats,
              databaseSize: dbSize
            }
          };
        }
        break;

      case 'archive':
        if (method === 'POST') {
          const body = await request.json() as { olderThanDays?: number };
          const olderThanDays = body.olderThanDays || 90;
          
          const result = await retentionService.archiveOldData(olderThanDays);
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Data archiving completed',
              result: {
                archivedSubmissions: result.archivedSubmissions,
                archivedJobs: result.archivedJobs,
                olderThanDays
              }
            }
          };
        }
        break;

      default:
        return {
          status: 404,
          jsonBody: {
            error: 'NOT_FOUND',
            message: 'Endpoint not found',
            availableEndpoints: [
              'GET /api/data-retention/cleanup',
              'GET /api/data-retention/stats',
              'POST /api/data-retention/archive'
            ]
          }
        };
    }

    return {
      status: 405,
      jsonBody: {
        error: 'METHOD_NOT_ALLOWED',
        message: `Method ${method} not allowed for this endpoint`
      }
    };

  } catch (error) {
    context.log(`ERROR: Data retention HTTP error: ${error}`);
    return ErrorHandler.handleError(error, request, context, {
      includeStack: false,
      logErrors: true,
      sanitizeErrors: true
    });
  }
}
