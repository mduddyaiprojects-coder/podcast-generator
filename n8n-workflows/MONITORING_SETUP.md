# n8n Workflow Monitoring and Logging Setup

This document outlines the comprehensive monitoring and logging setup for the Podcast Generator n8n workflows.

## 📊 Built-in n8n Monitoring Features

### 1. **Execution Tracking**
- ✅ All workflow executions are automatically logged
- ✅ Success/failure status for each execution
- ✅ Detailed execution data with inputs/outputs
- ✅ Performance metrics (execution time per node)
- ✅ Error details and stack traces

### 2. **Workflow Status Monitoring**
- ✅ Active/inactive workflow status
- ✅ Webhook trigger counts
- ✅ Execution history and trends
- ✅ Node-level execution details

### 3. **Data Persistence**
- ✅ All execution data saved (configurable)
- ✅ Error execution data saved
- ✅ Manual execution data saved
- ✅ Execution progress tracking

## 🔧 Monitoring Dashboard

### **Endpoint**: `https://n8n.m4c.ai/webhook/monitoring`

A comprehensive monitoring dashboard that provides:

#### **Health Metrics**
- Overall system health score (0-100)
- Success rate across all workflows
- Active vs inactive workflow counts
- Total executions in time period

#### **Workflow Status**
- Individual workflow health
- Recent execution counts
- Success rates per workflow
- Average execution times

#### **Alerts & Recommendations**
- Automatic alert generation for issues
- Recommendations for optimization
- Critical error detection
- Performance bottleneck identification

## 📈 Monitoring Capabilities

### **Real-time Monitoring**
```bash
# Get current system status
curl https://n8n.m4c.ai/webhook/monitoring
```

**Response includes:**
- Health score and status
- Workflow execution metrics
- Active alerts
- System recommendations

### **Execution History**
- Access via n8n UI: Executions tab
- Filter by workflow, status, time range
- Download execution data
- View detailed node execution logs

### **Performance Metrics**
- Node execution times
- Workflow completion rates
- Error frequency analysis
- Resource usage patterns

## 🚨 Alert System

### **Automatic Alerts**
1. **Low Success Rate** (< 80%)
   - Level: Warning
   - Triggers: System-wide success rate drops

2. **High Error Rate**
   - Level: Critical  
   - Triggers: Error handling workflow frequent execution

3. **Workflow Inactive**
   - Level: Info
   - Triggers: Expected workflows not running

### **Manual Monitoring**
- Check execution logs regularly
- Monitor webhook trigger counts
- Review error patterns
- Analyze performance trends

## 📋 Monitoring Checklist

### **Daily Monitoring**
- [ ] Check overall health score
- [ ] Review failed executions
- [ ] Verify all workflows are active
- [ ] Check execution volumes

### **Weekly Monitoring**
- [ ] Analyze performance trends
- [ ] Review error patterns
- [ ] Check resource usage
- [ ] Update monitoring thresholds

### **Monthly Monitoring**
- [ ] Review execution history
- [ ] Analyze workflow efficiency
- [ ] Plan capacity adjustments
- [ ] Update monitoring documentation

## 🔍 Troubleshooting

### **Common Issues**

1. **Workflow Not Executing**
   - Check if workflow is active
   - Verify webhook URL is correct
   - Check execution logs for errors

2. **High Error Rate**
   - Review error handling workflow
   - Check Azure Function status
   - Verify API credentials

3. **Slow Performance**
   - Check node execution times
   - Review Azure Function response times
   - Analyze workflow complexity

### **Debugging Steps**

1. **Check Execution Logs**
   - Go to Executions tab in n8n
   - Filter by failed executions
   - Review node-level details

2. **Test Individual Workflows**
   - Use manual execution
   - Check each node output
   - Verify data flow

3. **Monitor Azure Functions**
   - Check Azure Function logs
   - Verify API endpoints
   - Test direct API calls

## 📊 Metrics Dashboard

### **Key Performance Indicators (KPIs)**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overall Health Score | > 90% | 60% | ⚠️ Warning |
| Success Rate | > 95% | 60% | ⚠️ Warning |
| Active Workflows | 5 | 4 | ⚠️ Warning |
| Avg Response Time | < 2s | 0.5s | ✅ Good |

### **Workflow Status**

| Workflow | Status | Executions | Success Rate | Avg Time |
|----------|--------|------------|--------------|----------|
| Content Processing | ✅ Active | 0 | 100% | 0ms |
| YouTube Extraction | ❌ Inactive | 0 | 0% | 0ms |
| Document Processing | ✅ Active | 1 | 100% | 2000ms |
| TTS Generation | ✅ Active | 1 | 100% | 122ms |
| Error Handling | ✅ Active | 3 | 0% | 0ms |

## 🛠️ Configuration

### **Monitoring Settings**
All workflows are configured with:
```json
{
  "executionOrder": "v1",
  "saveDataErrorExecution": "all",
  "saveDataSuccessExecution": "all", 
  "saveManualExecutions": true,
  "saveExecutionProgress": true
}
```

### **Logging Levels**
- **Info**: Normal workflow execution
- **Warning**: Non-critical issues
- **Error**: Execution failures
- **Debug**: Detailed execution data

## 📞 Support

For monitoring issues:
1. Check this documentation
2. Review execution logs
3. Test individual workflows
4. Contact system administrator

---

**Last Updated**: 2025-09-20
**Version**: 1.0
**Status**: Active







