# CDN Caching Rules and Invalidation

This document provides comprehensive information about the CDN caching rules and invalidation system implemented for the podcast generator.

## Overview

The CDN (Content Delivery Network) caching system is designed to optimize content delivery by caching frequently accessed content at edge locations worldwide. This reduces latency, improves performance, and reduces bandwidth costs.

## Architecture

### Components

1. **CDN Cache Management Service** - Manages cache invalidation and rule configuration
2. **CDN Monitoring Service** - Monitors cache performance and generates alerts
3. **CDN Invalidation Triggers Service** - Automatically triggers cache invalidation based on events
4. **CDN Management Function** - HTTP API for CDN operations
5. **CDN Bicep Template** - Infrastructure as Code for CDN deployment

### Key Features

- **Intelligent Caching Rules** - Different cache durations for different content types
- **Automatic Invalidation** - Smart triggers for cache invalidation
- **Performance Monitoring** - Real-time analytics and alerting
- **Cost Optimization** - Bandwidth savings through effective caching
- **Security Headers** - Security enhancements for all cached content

## Caching Rules

### Audio Files
- **Path Pattern**: `/audio/*`
- **Cache Duration**: 365 days
- **Headers**: `Cache-Control: public, max-age=31536000, immutable`
- **Compression**: Disabled (audio files are already compressed)
- **Reasoning**: Audio files rarely change and benefit from long-term caching

### Image Files
- **Path Pattern**: `/images/*`, `/thumbnails/*`
- **Cache Duration**: 30 days
- **Headers**: `Cache-Control: public, max-age=2592000`
- **Compression**: Enabled
- **Reasoning**: Images may be updated occasionally but benefit from medium-term caching

### Text Files
- **Path Pattern**: `/transcripts/*`, `/scripts/*`, `/summaries/*`
- **Cache Duration**: 7 days
- **Headers**: `Cache-Control: public, max-age=604800`
- **Compression**: Enabled (gzip)
- **Reasoning**: Text content may be updated but benefits from compression

### RSS Feeds
- **Path Pattern**: `/feeds/*`, `/rss/*`
- **Cache Duration**: 5 minutes
- **Headers**: `Cache-Control: public, max-age=300`
- **Compression**: Disabled
- **Reasoning**: RSS feeds need to be fresh for podcast aggregators

### JSON Files
- **Path Pattern**: `/chapters/*`, `/metadata/*`
- **Cache Duration**: 24 hours
- **Headers**: `Cache-Control: public, max-age=86400`
- **Compression**: Enabled (gzip)
- **Reasoning**: JSON files may be updated frequently but benefit from compression

### Temporary Files
- **Path Pattern**: `/temp/*`, `/tmp/*`
- **Cache Duration**: No cache
- **Headers**: `Cache-Control: no-cache, no-store, must-revalidate`
- **Compression**: Disabled
- **Reasoning**: Temporary files should never be cached

## Cache Invalidation

### Automatic Triggers

#### File Upload Trigger
- **Triggered By**: Audio file uploads
- **Action**: Invalidate specific file and RSS feeds
- **Priority**: High

#### File Update Trigger
- **Triggered By**: Content updates (transcripts, scripts)
- **Action**: Invalidate specific file and related content
- **Priority**: Normal

#### File Delete Trigger
- **Triggered By**: File deletions
- **Action**: Invalidate specific file
- **Priority**: Normal

#### Content Publish Trigger
- **Triggered By**: Content publication
- **Action**: Invalidate all related content paths
- **Priority**: High

#### Large File Trigger
- **Triggered By**: Files larger than 50MB
- **Action**: Invalidate audio content
- **Priority**: Normal

#### Scheduled Invalidation
- **Triggered By**: Daily schedule
- **Action**: Invalidate RSS feeds and frequently updated content
- **Priority**: Low

### Manual Invalidation

#### API Endpoints

```bash
# Invalidate specific paths
POST /api/cdn-management?action=invalidate
{
  "contentPaths": ["/audio/episode-1.mp3", "/transcripts/episode-1.txt"],
  "reason": "Content update",
  "priority": "high"
}

# Invalidate submission content
POST /api/cdn-management?action=invalidate-submission&submissionId=123

# Invalidate RSS feeds
POST /api/cdn-management?action=invalidate-rss

# Invalidate all content
POST /api/cdn-management?action=invalidate-all
```

## Monitoring and Analytics

### Key Metrics

- **Cache Hit Rate** - Percentage of requests served from cache
- **Response Time** - Average time to serve content
- **Bandwidth Savings** - Amount of bandwidth saved through caching
- **Error Rate** - Percentage of failed requests
- **Geographic Distribution** - Request distribution by region

### Alerts

#### Low Cache Hit Rate
- **Threshold**: < 70%
- **Severity**: Critical
- **Action**: Review cache rules and content patterns

#### High Response Time
- **Threshold**: > 500ms
- **Severity**: Warning
- **Action**: Enable compression or optimize cache rules

#### High Error Rate
- **Threshold**: > 5%
- **Severity**: Critical
- **Action**: Check CDN configuration and origin health

#### Bandwidth Spike
- **Threshold**: > 2x normal usage
- **Severity**: Warning
- **Action**: Investigate traffic patterns

### Dashboard

Access the CDN health dashboard at:
```
GET /api/cdn-management?action=dashboard
```

## Configuration

### Environment Variables

```bash
# CDN Configuration
CDN_BASE_URL=https://your-cdn-endpoint.azureedge.net
CDN_CACHE_CONTROL=public, max-age=3600
CDN_DEFAULT_TTL=3600
CDN_MAX_TTL=86400
CDN_COMPRESSION_ENABLED=true
CDN_HTTPS_REDIRECT=true

# CDN Cache Management
CDN_PROFILE_NAME=podcast-generator-cdn-dev
CDN_ENDPOINT_NAME=podcast-generator-endpoint-dev
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=your-resource-group

# CDN Monitoring
CDN_MIN_HIT_RATE=0.7
CDN_MAX_RESPONSE_TIME=500
CDN_MAX_ERROR_RATE=0.05
CDN_BANDWIDTH_SPIKE_THRESHOLD=2.0

# CDN Cache Rules
CDN_AUDIO_CACHE_DAYS=365
CDN_IMAGE_CACHE_DAYS=30
CDN_TEXT_CACHE_DAYS=7
CDN_RSS_CACHE_MINUTES=5
CDN_JSON_CACHE_HOURS=24
CDN_ENABLE_QUERY_STRING_CACHING=false
CDN_ENABLE_GEO_FILTERING=false
```

### Bicep Template Parameters

```bicep
param audioCacheDays int = 365
param imageCacheDays int = 30
param textCacheDays int = 7
param rssCacheMinutes int = 5
param jsonCacheHours int = 24
param enableCaching bool = true
param enableCacheInvalidation bool = true
param enableAnalytics bool = true
param enableQueryStringCaching bool = false
param enableGeoFiltering bool = false
```

## Security

### Security Headers

All cached content includes security headers:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection

### Access Control

- **Public Access**: All content is publicly accessible
- **HTTPS Only**: All requests must use HTTPS
- **Origin Validation**: Only requests from configured origins are accepted

## Performance Optimization

### Compression

- **Text Files**: gzip compression (60-80% size reduction)
- **JSON Files**: gzip compression (50-70% size reduction)
- **Audio Files**: No compression (already compressed)
- **Image Files**: No compression (already compressed)

### Edge Caching

- **Global Edge Locations**: 200+ locations worldwide
- **Cache Hierarchy**: Edge → Regional → Origin
- **Cache Warming**: Automatic cache warming for popular content

### Bandwidth Optimization

- **Cache Hit Rate Target**: > 85%
- **Bandwidth Savings**: 60-80% for text content
- **Origin Load Reduction**: 90%+ reduction in origin requests

## Troubleshooting

### Common Issues

#### Low Cache Hit Rate
1. Check cache rules configuration
2. Verify content is being served with correct headers
3. Review content update patterns
4. Enable cache warming

#### High Response Time
1. Enable compression for text content
2. Optimize cache rules
3. Check origin server performance
4. Review geographic distribution

#### Cache Invalidation Not Working
1. Verify trigger configuration
2. Check API endpoint availability
3. Review invalidation logs
4. Test manual invalidation

#### Content Not Updating
1. Check cache invalidation triggers
2. Verify content paths are correct
3. Review cache duration settings
4. Test manual cache invalidation

### Debug Commands

```bash
# Check CDN health
curl -X GET "https://your-api.azurewebsites.net/api/cdn-management?action=health"

# Get cache statistics
curl -X GET "https://your-api.azurewebsites.net/api/cdn-management?action=statistics"

# Test cache invalidation
curl -X POST "https://your-api.azurewebsites.net/api/cdn-management?action=invalidate" \
  -H "Content-Type: application/json" \
  -d '{"contentPaths": ["/audio/test.mp3"], "reason": "Test"}'

# Get cache rules
curl -X GET "https://your-api.azurewebsites.net/api/cdn-management?action=rules"
```

## Testing

### Manual Testing

Run the CDN testing script:

```bash
# Set environment variables
export API_BASE_URL=https://your-api.azurewebsites.net/api
export CDN_BASE_URL=https://your-cdn-endpoint.azureedge.net

# Run tests
node scripts/test-cdn-caching.js
```

### Automated Testing

```bash
# Run unit tests
npm test -- --testPathPattern=cdn

# Run integration tests
npm test -- --testPathPattern=cdn-integration

# Run performance tests
npm test -- --testPathPattern=cdn-performance
```

## Best Practices

### Cache Rule Design

1. **Content Type Based**: Different rules for different content types
2. **Update Frequency**: Shorter cache for frequently updated content
3. **File Size**: Consider file size in cache duration decisions
4. **User Experience**: Balance freshness with performance

### Invalidation Strategy

1. **Event Driven**: Invalidate based on content changes
2. **Selective**: Only invalidate affected content
3. **Batch Operations**: Group related invalidations
4. **Monitoring**: Track invalidation effectiveness

### Performance Monitoring

1. **Regular Monitoring**: Check metrics daily
2. **Alert Thresholds**: Set appropriate alert levels
3. **Trend Analysis**: Monitor performance trends
4. **Optimization**: Continuously optimize based on data

## Cost Optimization

### Bandwidth Savings

- **Text Content**: 60-80% reduction through compression
- **Cache Hit Rate**: 85%+ target reduces origin requests
- **Edge Caching**: Reduces origin bandwidth by 90%+

### Storage Costs

- **Cache Duration**: Longer cache reduces origin requests
- **Compression**: Reduces storage requirements
- **Lifecycle Management**: Automatic cleanup of old content

### Monitoring Costs

- **Alert Thresholds**: Prevent unnecessary alerts
- **Batch Operations**: Reduce API call costs
- **Efficient Queries**: Optimize monitoring queries

## Future Enhancements

### Planned Features

1. **AI-Powered Cache Optimization** - Machine learning for cache rule optimization
2. **Predictive Invalidation** - Predict content changes for proactive invalidation
3. **Advanced Analytics** - More detailed performance insights
4. **Multi-CDN Support** - Support for multiple CDN providers
5. **Real-Time Monitoring** - Live performance dashboards

### Integration Opportunities

1. **Azure Monitor** - Integration with Azure monitoring services
2. **Application Insights** - Detailed application performance monitoring
3. **Log Analytics** - Centralized logging and analysis
4. **Alert Management** - Integration with alerting systems

## Support

For issues or questions regarding CDN caching:

1. Check the troubleshooting section
2. Review logs and metrics
3. Test with manual invalidation
4. Contact the development team

## References

- [Azure CDN Documentation](https://docs.microsoft.com/en-us/azure/cdn/)
- [CDN Best Practices](https://docs.microsoft.com/en-us/azure/cdn/cdn-best-practices)
- [Cache Invalidation Guide](https://docs.microsoft.com/en-us/azure/cdn/cdn-purge-endpoint)
- [Performance Optimization](https://docs.microsoft.com/en-us/azure/cdn/cdn-optimization-overview)



