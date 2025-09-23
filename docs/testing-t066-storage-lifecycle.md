# Testing Guide for T066: Storage Lifecycle Policies for Cost Optimization

This guide provides comprehensive testing strategies and scenarios for validating the storage lifecycle management and cost optimization features implemented in T066.

## Overview

T066 implements automated storage lifecycle management with cost optimization features including:
- Automated tiering (Hot → Cool → Archive → Delete)
- Cost monitoring and alerting
- Compression optimization
- Temporary file cleanup
- Scheduled maintenance

## Testing Strategy

### 1. Unit Tests
- **Location**: `api/tests/unit/`
- **Coverage**: Individual service methods and functions
- **Focus**: Logic validation, error handling, edge cases

### 2. Integration Tests
- **Location**: `api/tests/integration/`
- **Coverage**: End-to-end workflows and service interactions
- **Focus**: Real-world scenarios, performance, scalability

### 3. Manual Tests
- **Location**: `scripts/test-storage-lifecycle.js`
- **Coverage**: API endpoints and user-facing functionality
- **Focus**: User experience, real deployment validation

## Test Categories

### A. Unit Tests

#### Storage Lifecycle Service Tests
```bash
# Run unit tests for storage lifecycle service
npm test -- --testPathPattern=storage-lifecycle.test.ts
```

**Key Test Scenarios:**
1. **File Action Determination**
   - Recent files stay in current tier
   - Old files move to appropriate tier
   - Very old files are deleted
   - Temporary files are cleaned up quickly

2. **Cost Calculation**
   - Accurate tier cost calculations
   - Compression savings calculations
   - Zero-size file handling

3. **Configuration Management**
   - Environment variable loading
   - Default value fallbacks
   - Invalid configuration handling

#### Storage Cost Monitoring Tests
```bash
# Run unit tests for cost monitoring service
npm test -- --testPathPattern=storage-cost-monitoring.test.ts
```

**Key Test Scenarios:**
1. **Metrics Calculation**
   - Storage usage by tier
   - Cost calculations per tier
   - Trend analysis

2. **Alert Generation**
   - Budget threshold alerts
   - Growth rate alerts
   - Hot storage percentage alerts

3. **Recommendations**
   - Cost optimization suggestions
   - Tiering recommendations
   - Action prioritization

### B. Integration Tests

#### End-to-End Lifecycle Management
```bash
# Run integration tests
npm test -- --testPathPattern=storage-lifecycle-integration.test.ts
```

**Test Scenarios:**
1. **Complete Lifecycle Workflow**
   - Upload files of different types
   - Wait for tier transitions
   - Verify cost savings
   - Check cleanup results

2. **Mixed File Type Processing**
   - Audio files (90-day retention)
   - Image files (30-day retention)
   - Text files (180-day retention)
   - RSS feeds (30-day retention)
   - Temporary files (24-hour retention)

3. **Performance Testing**
   - Large file count processing
   - Concurrent operations
   - Memory usage validation

### C. Manual Testing

#### API Endpoint Testing
```bash
# Run manual test script
node scripts/test-storage-lifecycle.js
```

**Test Endpoints:**
1. **Storage Statistics**
   ```bash
   curl -X GET "https://your-function-app.azurewebsites.net/api/storage-management?action=stats"
   ```

2. **Lifecycle Management**
   ```bash
   curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=lifecycle"
   ```

3. **Cost Optimization**
   ```bash
   curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=cost-optimization"
   ```

4. **Temporary Cleanup**
   ```bash
   curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=cleanup-temp"
   ```

## Test Data Scenarios

### Scenario 1: Realistic Podcast Storage
```javascript
const scenario = {
  name: 'Realistic Podcast Storage',
  files: [
    // Recent audio files (Hot tier)
    { name: 'episode-1.mp3', type: 'audio/mpeg', size: '50MB', age: 5, tier: 'Hot' },
    { name: 'episode-2.mp3', type: 'audio/mpeg', size: '50MB', age: 10, tier: 'Hot' },
    
    // Older audio files (Cool tier)
    { name: 'episode-11.mp3', type: 'audio/mpeg', size: '50MB', age: 35, tier: 'Cool' },
    { name: 'episode-12.mp3', type: 'audio/mpeg', size: '50MB', age: 45, tier: 'Cool' },
    
    // Very old audio files (Archive tier)
    { name: 'episode-31.mp3', type: 'audio/mpeg', size: '50MB', age: 95, tier: 'Archive' },
    
    // Image files
    { name: 'thumbnail-1.jpg', type: 'image/jpeg', size: '2MB', age: 3, tier: 'Hot' },
    { name: 'thumbnail-2.jpg', type: 'image/jpeg', size: '2MB', age: 10, tier: 'Cool' },
    
    // Text files
    { name: 'transcript-1.txt', type: 'text/plain', size: '1MB', age: 20, tier: 'Hot' },
    
    // RSS feeds
    { name: 'feed.xml', type: 'application/rss+xml', size: '10KB', age: 5, tier: 'Hot' },
    
    // Temporary files
    { name: 'temp-1.tmp', type: 'application/octet-stream', size: '100KB', age: 25, temporary: true }
  ]
};
```

### Scenario 2: High-Cost Alert Testing
```javascript
const highCostScenario = {
  name: 'High Cost Scenario',
  files: Array.from({ length: 100 }, (_, i) => ({
    name: `large-audio-${i + 1}.mp3`,
    type: 'audio/mpeg',
    size: '100MB',
    age: Math.floor(Math.random() * 100) + 1,
    tier: 'Hot'
  }))
};
```

### Scenario 3: Cost Optimization Testing
```javascript
const optimizedScenario = {
  name: 'Cost Optimized Scenario',
  files: [
    // Well-distributed tiers
    { name: 'recent-1.mp3', type: 'audio/mpeg', size: '50MB', age: 5, tier: 'Hot' },
    { name: 'cool-1.mp3', type: 'audio/mpeg', size: '50MB', age: 35, tier: 'Cool' },
    { name: 'archive-1.mp3', type: 'audio/mpeg', size: '50MB', age: 95, tier: 'Archive' }
  ]
};
```

## Validation Criteria

### 1. Functional Validation
- [ ] Files are correctly categorized by type and age
- [ ] Tier transitions occur at appropriate thresholds
- [ ] Temporary files are cleaned up within 24 hours
- [ ] Cost calculations are accurate
- [ ] Recommendations are relevant and actionable

### 2. Performance Validation
- [ ] Lifecycle management completes within 10 seconds for 1000 files
- [ ] Memory usage remains stable during processing
- [ ] No memory leaks during long-running operations
- [ ] Concurrent operations don't interfere with each other

### 3. Error Handling Validation
- [ ] Individual file errors don't stop batch processing
- [ ] Storage connection failures are handled gracefully
- [ ] Invalid configuration values are handled appropriately
- [ ] Error messages are informative and actionable

### 4. Cost Optimization Validation
- [ ] Tiering recommendations reduce costs by at least 30%
- [ ] Compression recommendations are applied to appropriate files
- [ ] Budget alerts trigger at correct thresholds
- [ ] Cost trends are calculated accurately

## Test Execution

### 1. Local Development Testing
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests
node scripts/test-storage-lifecycle.js
```

### 2. Azure Function Testing
```bash
# Deploy to Azure
az functionapp deployment source config-zip \
  --resource-group your-resource-group \
  --name your-function-app \
  --src api/dist.zip

# Test deployed functions
curl -X GET "https://your-function-app.azurewebsites.net/api/storage-management?action=stats"
```

### 3. Scheduled Function Testing
```bash
# Test scheduled cleanup function
curl -X POST "https://your-function-app.azurewebsites.net/api/scheduled-storage-cleanup"
```

## Monitoring and Validation

### 1. Azure Monitor Metrics
- Storage account usage by tier
- Function execution duration
- Error rates and exceptions
- Cost trends over time

### 2. Application Insights
- Custom metrics for lifecycle operations
- Performance counters
- Error tracking and diagnostics
- User-defined events

### 3. Cost Analysis
- Monthly storage costs by tier
- Cost savings from optimization
- Budget vs. actual spending
- ROI calculations

## Troubleshooting

### Common Issues

1. **High Hot Storage Usage**
   - Check tiering thresholds
   - Verify file access patterns
   - Review tiering configuration

2. **Unexpected Deletions**
   - Verify retention policies
   - Check file metadata
   - Review cleanup logs

3. **Cost Alerts Not Triggering**
   - Check alert thresholds
   - Verify monitoring configuration
   - Review cost calculation logic

4. **Performance Issues**
   - Check file count and sizes
   - Review processing logic
   - Monitor memory usage

### Debug Commands

```bash
# Check storage statistics
curl -X GET "https://your-function-app.azurewebsites.net/api/storage-management?action=stats"

# Run lifecycle management with verbose logging
curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=lifecycle" \
  -H "X-Debug: true"

# Get cost optimization recommendations
curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=cost-optimization"
```

## Success Criteria

### T066 is considered successfully tested when:

1. **All unit tests pass** (100% pass rate)
2. **All integration tests pass** (100% pass rate)
3. **Manual tests complete successfully** (95% pass rate)
4. **Cost savings are demonstrable** (30%+ reduction)
5. **Performance requirements are met** (<10s for 1000 files)
6. **Error handling is robust** (graceful degradation)
7. **Monitoring is functional** (alerts and metrics work)

### Performance Benchmarks:
- **File Processing**: 1000 files in <10 seconds
- **Memory Usage**: <500MB peak during processing
- **Cost Savings**: 30-70% reduction vs. static Hot storage
- **Error Rate**: <1% for normal operations
- **Availability**: 99.9% uptime for scheduled functions

## Test Data Management

### Test Data Cleanup
```bash
# Clean up test files after testing
curl -X DELETE "https://your-function-app.azurewebsites.net/api/storage-management?action=cleanup-test-data"
```

### Test Data Generation
```bash
# Generate test data for specific scenarios
node scripts/generate-test-data.js --scenario=realistic --count=100
```

This comprehensive testing approach ensures that T066's storage lifecycle policies and cost optimization features work correctly, perform well, and provide real value in production environments.
