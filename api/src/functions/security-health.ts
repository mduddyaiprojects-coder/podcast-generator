import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { securityMonitoringService } from '../services/security-monitoring';
import { apiKeySecurityService } from '../services/api-key-security';
import { environmentService } from '../config/environment';

/**
 * GET /api/security/health
 *
 * Comprehensive security health check endpoint
 *
 * Response body:
 * {
 *   "overall": "healthy|warning|critical",
 *   "timestamp": "2023-10-27T10:00:00Z",
 *   "services": {
 *     "azure-openai": { "status": "healthy", "issues": [], "warnings": [] },
 *     "elevenlabs": { "status": "warning", "issues": [], "warnings": ["Weak API key"] }
 *   },
 *   "alerts": { "total": 2, "critical": 0, "high": 1, "medium": 1, "low": 0 },
 *   "recommendations": ["Configure API keys for: youtube", "Strengthen API keys for: elevenlabs"]
 * }
 */
export async function securityHealthFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Security health check function processed request.');

  try {
    // Get comprehensive security health status
    const healthStatus = await securityMonitoringService.getSecurityHealthStatus();
    const metrics = securityMonitoringService.getSecurityMetrics();
    const recentAlerts = apiKeySecurityService.getRecentAlerts(24);

    // Determine HTTP status code based on overall health
    let httpStatus = 200;
    if (healthStatus.overall === 'critical') {
      httpStatus = 503; // Service Unavailable
    } else if (healthStatus.overall === 'warning') {
      httpStatus = 200; // OK but with warnings
    }

    return {
      status: httpStatus,
      jsonBody: {
        ...healthStatus,
        metrics,
        recentAlerts: recentAlerts.length,
        environment: environmentService.getConfig().name,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    context.error('Security health check error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred during security health check',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * GET /api/security/alerts
 *
 * Get security alerts with optional filtering
 *
 * Query parameters:
 * - severity: Filter by severity (low|medium|high|critical)
 * - hours: Show alerts from last N hours (default: 24)
 * - service: Filter by service name
 *
 * Response body:
 * {
 *   "alerts": [...],
 *   "summary": { "total": 5, "bySeverity": {...}, "byService": {...} },
 *   "timestamp": "2023-10-27T10:00:00Z"
 * }
 */
export async function securityAlertsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Security alerts function processed request.');

  try {
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null;
    const hours = parseInt(url.searchParams.get('hours') || '24');
    const service = url.searchParams.get('service');

    // Get alerts with filtering
    let alerts = apiKeySecurityService.getAlerts(severity || undefined);
    
    if (service) {
      alerts = alerts.filter(alert => alert.service === service);
    }

    // Filter by time if specified
    if (hours !== 24) {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      alerts = alerts.filter(alert => alert.timestamp > cutoff);
    }

    // Generate summary
    const summary = {
      total: alerts.length,
      bySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byService: alerts.reduce((acc, alert) => {
        acc[alert.service] = (acc[alert.service] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return {
      status: 200,
      jsonBody: {
        alerts,
        summary,
        timestamp: new Date().toISOString(),
        filters: { severity, hours, service }
      }
    };

  } catch (error) {
    context.error('Security alerts error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred while retrieving security alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * GET /api/security/metrics
 *
 * Get security metrics and statistics
 *
 * Response body:
 * {
 *   "metrics": { "apiKeyValidations": 150, "failedValidations": 2, ... },
 *   "serviceStatus": { "azure-openai": { "status": "healthy", ... } },
 *   "timestamp": "2023-10-27T10:00:00Z"
 * }
 */
export async function securityMetricsFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Security metrics function processed request.');

  try {
    const metrics = securityMonitoringService.getSecurityMetrics();
    const serviceStatus = securityMonitoringService.getAllServiceStatuses();
    const securitySummary = apiKeySecurityService.getSecuritySummary();

    return {
      status: 200,
      jsonBody: {
        metrics,
        serviceStatus,
        securitySummary,
        environment: environmentService.getConfig().name,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    context.error('Security metrics error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred while retrieving security metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * POST /api/security/validate
 *
 * Manually trigger API key validation for all services
 *
 * Response body:
 * {
 *   "validationResults": [...],
 *   "summary": { "total": 4, "valid": 3, "invalid": 1 },
 *   "timestamp": "2023-10-27T10:00:00Z"
 * }
 */
export async function securityValidateFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Security validate function processed request.');

  try {
    // Trigger validation for all API keys
    const validationResults = await apiKeySecurityService.validateAllApiKeys();
    
    // Generate summary
    const summary = {
      total: validationResults.length,
      valid: validationResults.filter(r => r.isValid).length,
      invalid: validationResults.filter(r => !r.isValid).length
    };

    return {
      status: 200,
      jsonBody: {
        validationResults,
        summary,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    context.error('Security validate error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred during API key validation',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}
