# n8n Workflow Monitoring and Logging Setup

This guide provides comprehensive monitoring and logging configuration for n8n workflows in the Podcast Generator system.

## 📊 Monitoring Overview

### Key Metrics to Monitor
- **Workflow Execution Success Rate**
- **Average Execution Time**
- **Error Frequency and Types**
- **API Response Times**
- **Webhook Request Volume**
- **Resource Usage**

## 🔧 Logging Configuration

### 1. n8n Logging Setup

Update `n8n.config.js` with enhanced logging:

```javascript
module.exports = {
  // ... existing configuration ...
  
  // Enhanced Logging Configuration
  logging: {
    level: process.env.N8N_LOG_LEVEL || 'info',
    output: process.env.N8N_LOG_OUTPUT?.split(',') || ['console', 'file'],
    file: {
      location: process.env.N8N_LOG_FILE_LOCATION || './logs/n8n.log',
      maxSize: '10MB',
      maxFiles: 5
    },
    // Custom log format for better monitoring
    format: (info) => {
      return JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        workflow: info.workflow || 'unknown',
        executionId: info.executionId || 'unknown',
        node: info.node || 'unknown',
        ...info
      });
    }
  },
  
  // Execution monitoring
  executions: {
    process: process.env.EXECUTIONS_PROCESS || 'main',
    mode: process.env.EXECUTIONS_MODE || 'regular',
    timeout: parseInt(process.env.EXECUTIONS_TIMEOUT) || 3600,
    timeoutMax: parseInt(process.env.EXECUTIONS_TIMEOUT_MAX) || 7200,
    // Save all executions for monitoring
    saveManualExecutions: true,
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all'
  },
  
  // Custom monitoring configuration
  monitoring: {
    enabled: true,
    metrics: {
      executionTime: true,
      successRate: true,
      errorRate: true,
      apiResponseTime: true
    },
    alerts: {
      enabled: true,
      webhook: process.env.MONITORING_WEBHOOK_URL,
      thresholds: {
        errorRate: 0.1, // 10%
        avgExecutionTime: 30000, // 30 seconds
        apiTimeout: 60000 // 60 seconds
      }
    }
  }
};
```

### 2. Environment Variables for Monitoring

Add to your `.env` file:

```bash
# Monitoring Configuration
N8N_LOG_LEVEL=info
N8N_LOG_OUTPUT=console,file
N8N_LOG_FILE_LOCATION=./logs/n8n.log

# Execution Monitoring
EXECUTIONS_SAVE_MANUAL=true
EXECUTIONS_SAVE_DATA_ERROR=all
EXECUTIONS_SAVE_DATA_SUCCESS=all

# Monitoring Alerts
MONITORING_WEBHOOK_URL=https://your-monitoring-service.com/webhook
MONITORING_ALERT_EMAIL=admin@yourdomain.com

# Performance Thresholds
MAX_EXECUTION_TIME=300000
MAX_API_RESPONSE_TIME=60000
ERROR_RATE_THRESHOLD=0.1
```

## 📈 Monitoring Dashboard Setup

### 1. Create Monitoring Workflow

Create a new workflow `monitoring-dashboard.json`:

```json
{
  "name": "Monitoring Dashboard",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "value": "0 */5 * * * *"
            }
          ]
        }
      },
      "id": "schedule-trigger",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "functionCode": "// Collect execution metrics\nconst now = new Date();\nconst fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);\n\n// This would typically query n8n's execution database\n// For now, we'll simulate the data collection\nconst metrics = {\n  timestamp: now.toISOString(),\n  period: '5m',\n  executions: {\n    total: 0,\n    successful: 0,\n    failed: 0,\n    running: 0\n  },\n  workflows: {},\n  errors: [],\n  performance: {\n    avgExecutionTime: 0,\n    maxExecutionTime: 0,\n    apiResponseTime: 0\n  }\n};\n\nreturn { json: metrics };"
      },
      "id": "collect-metrics",
      "name": "Collect Metrics",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "functionCode": "// Analyze metrics and detect issues\nconst metrics = $input.first().json;\n\n// Calculate success rate\nconst successRate = metrics.executions.total > 0 \n  ? metrics.executions.successful / metrics.executions.total \n  : 1;\n\n// Check for alerts\nconst alerts = [];\n\nif (successRate < 0.9) {\n  alerts.push({\n    type: 'low_success_rate',\n    severity: 'high',\n    message: `Success rate is ${(successRate * 100).toFixed(1)}%`,\n    value: successRate\n  });\n}\n\nif (metrics.performance.avgExecutionTime > 30000) {\n  alerts.push({\n    type: 'slow_execution',\n    severity: 'medium',\n    message: `Average execution time is ${metrics.performance.avgExecutionTime}ms`,\n    value: metrics.performance.avgExecutionTime\n  });\n}\n\nconst analysis = {\n  ...metrics,\n  successRate,\n  alerts,\n  status: alerts.length > 0 ? 'warning' : 'healthy'\n};\n\nreturn { json: analysis };"
      },
      "id": "analyze-metrics",
      "name": "Analyze Metrics",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "has-alerts",
              "leftValue": "={{$json.alerts.length}}",
              "rightValue": 0,
              "operator": {
                "type": "number",
                "operation": "gt"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "check-alerts",
      "name": "Has Alerts?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [900, 300]
    },
    {
      "parameters": {
        "url": "={{$env.MONITORING_WEBHOOK_URL}}",
        "authentication": "none",
        "requestMethod": "POST",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "alerts",
              "value": "={{JSON.stringify($json.alerts)}}"
            },
            {
              "name": "metrics",
              "value": "={{JSON.stringify($json)}}"
            }
          ]
        }
      },
      "id": "send-alerts",
      "name": "Send Alerts",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [1120, 200]
    },
    {
      "parameters": {
        "functionCode": "// Log metrics to file or database\nconst metrics = $input.first().json;\n\nconsole.log('Monitoring metrics:', JSON.stringify(metrics, null, 2));\n\n// In a real implementation, this would save to a database\n// or send to a monitoring service like DataDog, New Relic, etc.\n\nreturn { json: { logged: true, timestamp: new Date().toISOString() } };"
      },
      "id": "log-metrics",
      "name": "Log Metrics",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1120, 400]
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Collect Metrics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Collect Metrics": {
      "main": [
        [
          {
            "node": "Analyze Metrics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Analyze Metrics": {
      "main": [
        [
          {
            "node": "Check Alerts",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Alerts": {
      "main": [
        [
          {
            "node": "Send Alerts",
            "type": "main",
            "index": 0
          },
          {
            "node": "Log Metrics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1",
  "meta": {
    "templateCredsSetupCompleted": true
  },
  "id": "monitoring-dashboard",
  "tags": ["monitoring", "dashboard", "metrics", "alerts"]
}
```

### 2. Log Aggregation Setup

Create a log aggregation script `scripts/log-aggregator.js`:

```javascript
const fs = require('fs');
const path = require('path');

class LogAggregator {
  constructor(logDir = './logs') {
    this.logDir = logDir;
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  parseLogLine(line) {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }

  aggregateLogs() {
    const logFile = path.join(this.logDir, 'n8n.log');
    const aggregatedFile = path.join(this.logDir, 'aggregated.json');
    
    if (!fs.existsSync(logFile)) {
      console.log('No log file found');
      return;
    }

    const logs = fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => this.parseLogLine(line))
      .filter(log => log !== null);

    const aggregated = {
      timestamp: new Date().toISOString(),
      totalLogs: logs.length,
      byLevel: {},
      byWorkflow: {},
      errors: logs.filter(log => log.level === 'error'),
      warnings: logs.filter(log => log.level === 'warn'),
      executions: logs.filter(log => log.message?.includes('execution'))
    };

    // Group by level
    logs.forEach(log => {
      aggregated.byLevel[log.level] = (aggregated.byLevel[log.level] || 0) + 1;
    });

    // Group by workflow
    logs.forEach(log => {
      if (log.workflow) {
        aggregated.byWorkflow[log.workflow] = (aggregated.byWorkflow[log.workflow] || 0) + 1;
      }
    });

    fs.writeFileSync(aggregatedFile, JSON.stringify(aggregated, null, 2));
    console.log('Logs aggregated successfully');
  }
}

// Run aggregation
const aggregator = new LogAggregator();
aggregator.aggregateLogs();
```

## 🚨 Alert Configuration

### 1. Alert Thresholds

Set up alert thresholds in your monitoring system:

```yaml
# monitoring-config.yaml
alerts:
  success_rate:
    threshold: 0.9
    severity: high
    message: "Workflow success rate below 90%"
  
  execution_time:
    threshold: 30000  # 30 seconds
    severity: medium
    message: "Average execution time exceeds 30 seconds"
  
  error_rate:
    threshold: 0.1  # 10%
    severity: high
    message: "Error rate exceeds 10%"
  
  api_timeout:
    threshold: 60000  # 60 seconds
    severity: high
    message: "API response time exceeds 60 seconds"
```

### 2. Notification Channels

Configure notification channels:

```javascript
// notification-channels.js
const notificationChannels = {
  email: {
    enabled: true,
    recipients: ['admin@yourdomain.com'],
    template: 'workflow-alert-email'
  },
  
  slack: {
    enabled: true,
    webhook: process.env.SLACK_WEBHOOK_URL,
    channel: '#podcast-alerts'
  },
  
  webhook: {
    enabled: true,
    url: process.env.ALERT_WEBHOOK_URL
  }
};
```

## 📊 Dashboard Metrics

### Key Performance Indicators (KPIs)

1. **Workflow Health**
   - Success Rate: > 95%
   - Average Execution Time: < 30 seconds
   - Error Rate: < 5%

2. **API Performance**
   - Response Time: < 5 seconds
   - Timeout Rate: < 1%
   - Availability: > 99.9%

3. **Resource Usage**
   - CPU Usage: < 80%
   - Memory Usage: < 80%
   - Disk Usage: < 90%

### Monitoring Queries

Example queries for monitoring systems:

```sql
-- Success rate by workflow
SELECT 
  workflow,
  COUNT(*) as total_executions,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  AVG(execution_time) as avg_execution_time
FROM executions 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY workflow;

-- Error analysis
SELECT 
  error_type,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM errors 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY error_count DESC;
```

## 🔧 Maintenance Tasks

### Daily Tasks
- Review error logs
- Check execution success rates
- Monitor resource usage

### Weekly Tasks
- Analyze performance trends
- Review alert thresholds
- Update monitoring dashboards

### Monthly Tasks
- Clean up old logs
- Review and optimize workflows
- Update monitoring configuration

## 📞 Troubleshooting

### Common Monitoring Issues

1. **Missing Metrics**
   - Check log file permissions
   - Verify monitoring workflow is active
   - Ensure proper log formatting

2. **False Alerts**
   - Adjust alert thresholds
   - Review alert conditions
   - Check for temporary issues

3. **Performance Impact**
   - Optimize monitoring frequency
   - Reduce log verbosity
   - Use async processing

### Debug Commands

```bash
# Check log files
tail -f logs/n8n.log

# Check aggregated metrics
cat logs/aggregated.json

# Test monitoring workflow
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/monitoring-test

# Check execution history
curl -X GET https://your-n8n-instance.azurewebsites.net/api/v1/executions
```

This monitoring setup provides comprehensive visibility into your n8n workflows and helps ensure reliable operation of the Podcast Generator system.

