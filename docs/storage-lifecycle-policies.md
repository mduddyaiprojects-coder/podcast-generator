# Storage Lifecycle Policies and Cost Optimization

This document describes the storage lifecycle management policies implemented for the Podcast Generator application to optimize costs while maintaining data availability.

## Overview

The storage lifecycle management system automatically manages file retention, tiering, and cleanup to optimize Azure Storage costs. It includes:

- **Automated tiering** from Hot → Cool → Archive based on file age and type
- **Intelligent retention policies** based on content type and usage patterns
- **Cost monitoring and alerting** to prevent budget overruns
- **Compression optimization** for text-based files
- **Scheduled cleanup** of temporary and expired files

## Storage Tiers and Policies

### Hot Storage (Frequently Accessed)
- **Purpose**: Recently created and frequently accessed files
- **Retention**: 0-30 days for most files
- **Cost**: $0.0184 per GB per month
- **Use Cases**: 
  - Recently generated audio files
  - Active RSS feeds
  - Current episode content

### Cool Storage (Infrequently Accessed)
- **Purpose**: Files accessed less frequently but still needed
- **Retention**: 30-90 days for audio, 7-30 days for images
- **Cost**: $0.01 per GB per month (46% savings vs Hot)
- **Use Cases**:
  - Older audio episodes
  - Archived transcripts
  - Historical RSS feeds

### Archive Storage (Long-term Storage)
- **Purpose**: Files rarely accessed but must be retained
- **Retention**: 90-365 days
- **Cost**: $0.00099 per GB per month (95% savings vs Hot)
- **Use Cases**:
  - Very old audio files
  - Historical transcripts
  - Compliance data

## File Type-Specific Policies

### Audio Files (.mp3, .wav, .m4a)
```
Hot (0-30 days) → Cool (30-90 days) → Archive (90-365 days) → Delete
```
- **Hot to Cool**: 30 days
- **Cool to Archive**: 90 days
- **Archive to Delete**: 365 days
- **Special handling**: Audio files are prioritized for retention

### Image Files (.jpg, .png, .gif, .webp)
```
Hot (0-7 days) → Cool (7-30 days) → Archive (30-90 days) → Delete
```
- **Hot to Cool**: 7 days (faster than audio)
- **Cool to Archive**: 30 days
- **Archive to Delete**: 90 days
- **Special handling**: Images cool faster due to lower access frequency

### Text Files (transcripts, scripts, summaries)
```
Hot (0-14 days) → Cool (14-60 days) → Archive (60-180 days) → Delete
```
- **Hot to Cool**: 14 days
- **Cool to Archive**: 60 days
- **Archive to Delete**: 180 days
- **Special handling**: Text files are candidates for compression

### RSS Feeds (.xml)
```
Hot (0-7 days) → Cool (7-30 days) → Delete
```
- **Hot to Cool**: 7 days
- **Cool to Delete**: 30 days
- **Special handling**: RSS feeds have shorter retention due to dynamic nature

### Temporary Files
```
Hot (0-24 hours) → Delete
```
- **Retention**: 24 hours maximum
- **Special handling**: Immediate cleanup for temp files

## Cost Optimization Features

### 1. Automated Tiering
- Files automatically move between storage tiers based on age and access patterns
- Configurable thresholds for each tier transition
- Significant cost savings (up to 95% for archived files)

### 2. Compression
- Text-based files larger than 1MB are candidates for compression
- Estimated 30% size reduction for compressible content
- Automatic compression marking and metadata tracking

### 3. Deduplication
- Identical files are identified and deduplicated
- Metadata-based deduplication for similar content
- Reduces storage footprint and costs

### 4. Smart Retention
- Content-type specific retention policies
- Usage pattern analysis for retention decisions
- Compliance-aware retention for sensitive data

## Monitoring and Alerting

### Cost Monitoring
- **Monthly Budget Alerts**: Notify when storage costs exceed budget
- **Growth Rate Alerts**: Monitor storage growth trends
- **Tier Distribution Alerts**: Ensure optimal tier distribution

### Performance Metrics
- **Storage Utilization**: Track total storage usage by tier
- **Cost Trends**: Monitor cost changes over time
- **Cleanup Statistics**: Track files processed and savings achieved

### Alert Types
- **Critical**: Budget exceeded, storage full
- **Warning**: High growth rate, suboptimal tiering
- **Info**: Recommendations for optimization

## Configuration

### Environment Variables

```bash
# Lifecycle Management
STORAGE_CLEANUP_ENABLED=true
AUDIO_RETENTION_DAYS=90
IMAGE_RETENTION_DAYS=30
TEMP_FILE_RETENTION_HOURS=24

# Cost Optimization
STORAGE_TIERING_ENABLED=true
STORAGE_COMPRESSION_ENABLED=true
STORAGE_DEDUPLICATION_ENABLED=false
HOT_TO_COOL_DAYS=30
COOL_TO_ARCHIVE_DAYS=90
ARCHIVE_TO_DELETE_DAYS=365
COMPRESSION_THRESHOLD=1048576

# Cost Monitoring
STORAGE_MONTHLY_BUDGET=100
STORAGE_DAILY_SPIKE_THRESHOLD=10
STORAGE_GROWTH_THRESHOLD=20
```

### Azure Storage Account Configuration

The storage account is configured with Azure-native lifecycle management policies:

```bicep
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    policy: {
      rules: [
        // Audio files: Hot(30d) → Cool(90d) → Archive(365d) → Delete
        // Image files: Hot(7d) → Cool(30d) → Archive(90d) → Delete
        // Text files: Hot(14d) → Cool(60d) → Archive(180d) → Delete
        // RSS feeds: Hot(7d) → Cool(30d) → Delete
        // Temp files: Hot(1d) → Delete
      ]
    }
  }
}
```

## API Endpoints

### Storage Management
- `GET /api/storage-management?action=stats` - Get storage statistics
- `POST /api/storage-management?action=lifecycle` - Run lifecycle management
- `POST /api/storage-management?action=cost-optimization` - Get cost recommendations
- `POST /api/storage-management?action=cleanup-temp` - Clean temporary files

### Scheduled Cleanup
- **Function**: `scheduledStorageCleanup`
- **Schedule**: Daily at 2 AM UTC
- **Actions**: Lifecycle management, cost optimization, temp cleanup

## Cost Savings Examples

### Example 1: Audio File Lifecycle
- **File**: 50MB audio file
- **Hot Storage (30 days)**: $0.92
- **Cool Storage (60 days)**: $0.50
- **Archive Storage (275 days)**: $0.14
- **Total Cost**: $1.56
- **Without Lifecycle**: $2.76 (Hot for 365 days)
- **Savings**: 43%

### Example 2: Image File Lifecycle
- **File**: 5MB image file
- **Hot Storage (7 days)**: $0.06
- **Cool Storage (23 days)**: $0.12
- **Archive Storage (60 days)**: $0.03
- **Total Cost**: $0.21
- **Without Lifecycle**: $0.92 (Hot for 90 days)
- **Savings**: 77%

### Example 3: Text File Compression
- **File**: 2MB transcript (compressed to 1.4MB)
- **Original Cost**: $0.37 (Hot for 180 days)
- **Compressed Cost**: $0.26 (Hot for 180 days)
- **Savings**: 30%

## Best Practices

### 1. Regular Monitoring
- Review cost reports weekly
- Monitor tier distribution monthly
- Adjust thresholds based on usage patterns

### 2. Threshold Tuning
- Start with default thresholds
- Adjust based on actual usage patterns
- Consider seasonal variations

### 3. Content Classification
- Use metadata to classify content importance
- Implement custom retention for special content
- Consider compliance requirements

### 4. Cost Optimization
- Enable compression for text files
- Use appropriate storage tiers
- Regular cleanup of temporary files

## Troubleshooting

### Common Issues

1. **High Hot Storage Usage**
   - Check if files are being accessed frequently
   - Verify tiering thresholds are appropriate
   - Consider moving static content to Cool/Archive

2. **Unexpected Deletions**
   - Verify retention policies are correct
   - Check file metadata for proper classification
   - Review cleanup logs for errors

3. **Cost Alerts**
   - Review storage usage patterns
   - Check for unexpected file growth
   - Verify tiering is working correctly

### Monitoring Commands

```bash
# Check storage statistics
curl -X GET "https://your-function-app.azurewebsites.net/api/storage-management?action=stats"

# Run lifecycle management
curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=lifecycle"

# Get cost recommendations
curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=cost-optimization"
```

## Future Enhancements

1. **Machine Learning-Based Tiering**: Use ML to predict access patterns
2. **Advanced Compression**: Implement more sophisticated compression algorithms
3. **Cross-Region Replication**: Optimize for global content delivery
4. **Real-time Cost Tracking**: Live cost monitoring and alerts
5. **Custom Retention Policies**: User-defined retention rules per content type
