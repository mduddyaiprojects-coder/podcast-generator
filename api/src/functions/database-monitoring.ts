import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseMonitoringService } from '../services/database-monitoring-service';
import { ErrorHandler } from '../utils/error-handler';

/**
 * HTTP-triggered function for database monitoring
 * GET /api/database-monitoring/health - Get database health metrics
 * GET /api/database-monitoring/alerts - Get active alerts
 * GET /api/database-monitoring/performance - Get query performance stats
 * GET /api/database-monitoring/backups - Get backup information
 * POST /api/database-monitoring/backup - Create manual backup
 * POST /api/database-monitoring/alerts/{id}/resolve - Resolve an alert
 * GET /api/database-monitoring/dashboard - Get complete dashboard data
 */
export async function databaseMonitoringFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const monitoringService = new DatabaseMonitoringService();
    const method = request.method;
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    
    // Extract action from path: /api/database-monitoring/{action}
    const action = pathSegments[2] || 'health';
    const subAction = pathSegments[3]; // For actions like alerts/{id}/resolve

    context.log(`Database monitoring request: ${method} ${action}${subAction ? `/${subAction}` : ''}`);

    switch (action) {
      case 'health':
        if (method === 'GET') {
          const healthMetrics = await monitoringService.getHealthMetrics();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Database health metrics retrieved',
              data: healthMetrics
            }
          };
        }
        break;

      case 'alerts':
        if (method === 'GET') {
          const alerts = await monitoringService.checkForIssues();
          const activeAlerts = monitoringService.getActiveAlerts();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Database alerts retrieved',
              data: {
                newAlerts: alerts,
                activeAlerts,
                totalActive: activeAlerts.length
              }
            }
          };
        } else if (method === 'POST' && subAction === 'resolve') {
          const alertId = pathSegments[4];
          if (!alertId) {
            return {
              status: 400,
              jsonBody: {
                error: 'MISSING_ALERT_ID',
                message: 'Alert ID is required for resolve action'
              }
            };
          }

          const resolved = monitoringService.resolveAlert(alertId);
          
          return {
            status: resolved ? 200 : 404,
            jsonBody: {
              success: resolved,
              message: resolved ? 'Alert resolved successfully' : 'Alert not found',
              alertId
            }
          };
        }
        break;

      case 'performance':
        if (method === 'GET') {
          const performance = await monitoringService.getQueryPerformance();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Query performance data retrieved',
              data: performance
            }
          };
        }
        break;

      case 'backups':
        if (method === 'GET') {
          const backups = await monitoringService.getBackupInfo();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Backup information retrieved',
              data: {
                backups,
                totalBackups: backups.length,
                latestBackup: backups.length > 0 ? backups[0] : null
              }
            }
          };
        } else if (method === 'POST') {
          const backup = await monitoringService.createManualBackup();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Manual backup created successfully',
              data: backup
            }
          };
        }
        break;

      case 'dashboard':
        if (method === 'GET') {
          const dashboardData = await monitoringService.getDashboardData();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Dashboard data retrieved',
              data: dashboardData
            }
          };
        }
        break;

      case 'cleanup':
        if (method === 'POST') {
          const cleanedCount = monitoringService.cleanupOldAlerts();
          
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Old alerts cleaned up',
              data: {
                cleanedCount,
                remainingAlerts: monitoringService.getActiveAlerts().length
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
              'GET /api/database-monitoring/health',
              'GET /api/database-monitoring/alerts',
              'POST /api/database-monitoring/alerts/{id}/resolve',
              'GET /api/database-monitoring/performance',
              'GET /api/database-monitoring/backups',
              'POST /api/database-monitoring/backup',
              'GET /api/database-monitoring/dashboard',
              'POST /api/database-monitoring/cleanup'
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
    context.log(`ERROR: Database monitoring error: ${error}`);
    return ErrorHandler.handleError(error, request, context, {
      includeStack: false,
      logErrors: true,
      sanitizeErrors: true
    });
  }
}
