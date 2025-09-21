import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { monitoringService } from '../services/monitoring-service';
import { ServiceHealthStatus, AlertSeverity } from '../services/monitoring-service';

/**
 * GET /api/monitoring/health
 * Get overall system health status
 */
export async function monitoringHealthFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Monitoring health function processed request.');

  try {
    const healthSummary = monitoringService.getSystemHealthSummary();
    
    return {
      status: 200,
      jsonBody: {
        ...healthSummary,
        timestamp: new Date().toISOString(),
        environment: process.env['NODE_ENV'] || 'development'
      }
    };
  } catch (error) {
    context.error('Error getting system health:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get system health status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * GET /api/monitoring/metrics
 * Get metrics for all services or a specific service
 */
export async function monitoringMetricsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Monitoring metrics function processed request.');

  try {
    const serviceName = request.query.get('service');
    const limit = parseInt(request.query.get('limit') || '100');
    const hours = parseInt(request.query.get('hours') || '24');

    let metrics;
    if (serviceName) {
      const serviceMetrics = monitoringService.getAllMetrics()[serviceName];
      if (!serviceMetrics) {
        return {
          status: 404,
          jsonBody: {
            error: 'SERVICE_NOT_FOUND',
            message: `Service '${serviceName}' not found`
          }
        };
      }
      metrics = { [serviceName]: serviceMetrics };
    } else {
      metrics = monitoringService.getAllMetrics();
    }

    // Filter by time range
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const filteredMetrics: Record<string, any[]> = {};
    for (const [service, serviceMetrics] of Object.entries(metrics)) {
      filteredMetrics[service] = serviceMetrics
        .filter(metric => new Date(metric.timestamp) > cutoffTime)
        .slice(-limit);
    }

    return {
      status: 200,
      jsonBody: {
        metrics: filteredMetrics,
        timeRange: {
          hours,
          from: cutoffTime.toISOString(),
          to: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error('Error getting metrics:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * GET /api/monitoring/alerts
 * Get all alerts or filter by service/severity
 */
export async function monitoringAlertsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Monitoring alerts function processed request.');

  try {
    const serviceName = request.query.get('service');
    const severity = request.query.get('severity') as AlertSeverity;
    const activeOnly = request.query.get('active') === 'true';
    const limit = parseInt(request.query.get('limit') || '50');

    let alerts = monitoringService.getAllAlerts();

    // Filter by service
    if (serviceName) {
      alerts = alerts.filter(alert => alert.serviceName === serviceName);
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Filter by active status
    if (activeOnly) {
      alerts = alerts.filter(alert => !alert.resolved);
    }

    // Sort by timestamp (newest first) and limit
    alerts = alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return {
      status: 200,
      jsonBody: {
        alerts,
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter(alert => !alert.resolved).length,
        filters: {
          service: serviceName || 'all',
          severity: severity || 'all',
          activeOnly
        },
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error('Error getting alerts:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * POST /api/monitoring/alerts/resolve
 * Resolve an alert by ID
 */
export async function monitoringResolveAlertFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Monitoring resolve alert function processed request.');

  try {
    const body = await request.json();
    const { alertId } = body as { alertId: string };

    if (!alertId) {
      return {
        status: 400,
        jsonBody: {
          error: 'MISSING_ALERT_ID',
          message: 'Alert ID is required'
        }
      };
    }

    const resolved = monitoringService.resolveAlert(alertId);
    
    if (!resolved) {
      return {
        status: 404,
        jsonBody: {
          error: 'ALERT_NOT_FOUND',
          message: `Alert with ID '${alertId}' not found or already resolved`
        }
      };
    }

    return {
      status: 200,
      jsonBody: {
        message: 'Alert resolved successfully',
        alertId,
        resolvedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error('Error resolving alert:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to resolve alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * GET /api/monitoring/services
 * Get detailed information about all monitored services
 */
export async function monitoringServicesFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Monitoring services function processed request.');

  try {
    const allMetrics = monitoringService.getAllMetrics();
    const services: Record<string, any> = {};

    for (const [serviceName, metrics] of Object.entries(allMetrics)) {
      const latestMetrics = metrics[metrics.length - 1];
      const alerts = monitoringService.getAlertsByService(serviceName);
      const activeAlerts = alerts.filter(alert => !alert.resolved);

      // Calculate averages over last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const recentMetrics = metrics.filter(metric => 
        new Date(metric.timestamp) > oneHourAgo
      );

      const avgResponseTime = recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
        : 0;

      const avgSuccessRate = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length
        : 0;

      services[serviceName] = {
        name: serviceName,
        status: latestMetrics?.healthStatus || ServiceHealthStatus.UNKNOWN,
        lastCheck: latestMetrics?.timestamp,
        responseTime: {
          current: latestMetrics?.responseTime || 0,
          average: Math.round(avgResponseTime)
        },
        successRate: {
          current: latestMetrics?.successRate || 0,
          average: Math.round(avgSuccessRate * 100) / 100
        },
        requests: {
          total: latestMetrics?.totalRequests || 0,
          successful: latestMetrics?.successfulRequests || 0,
          failed: latestMetrics?.failedRequests || 0
        },
        circuitBreaker: {
          state: latestMetrics?.circuitBreakerState || 'unknown',
          healthy: latestMetrics?.healthStatus === ServiceHealthStatus.HEALTHY
        },
        alerts: {
          total: alerts.length,
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
          error: activeAlerts.filter(a => a.severity === AlertSeverity.ERROR).length,
          warning: activeAlerts.filter(a => a.severity === AlertSeverity.WARNING).length
        },
        uptime: latestMetrics?.uptime || 0,
        memoryUsage: latestMetrics?.memoryUsage,
        cpuUsage: latestMetrics?.cpuUsage
      };
    }

    return {
      status: 200,
      jsonBody: {
        services,
        summary: {
          totalServices: Object.keys(services).length,
          healthyServices: Object.values(services).filter((s: any) => s.status === ServiceHealthStatus.HEALTHY).length,
          degradedServices: Object.values(services).filter((s: any) => s.status === ServiceHealthStatus.DEGRADED).length,
          unhealthyServices: Object.values(services).filter((s: any) => s.status === ServiceHealthStatus.UNHEALTHY).length,
          totalAlerts: Object.values(services).reduce((sum, s: any) => sum + s.alerts.total, 0),
          activeAlerts: Object.values(services).reduce((sum, s: any) => sum + s.alerts.active, 0)
        },
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error('Error getting services information:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to get services information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * POST /api/monitoring/health-check
 * Trigger manual health check for all services
 */
export async function monitoringHealthCheckFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Monitoring health check function processed request.');

  try {
    await monitoringService.performHealthChecks();
    
    const healthSummary = monitoringService.getSystemHealthSummary();
    
    return {
      status: 200,
      jsonBody: {
        message: 'Health check completed successfully',
        healthSummary,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error('Error performing health check:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to perform health check',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
