# Azure CDN Setup for Podcast Generator

This guide explains how to set up Azure CDN (Content Delivery Network) for the Podcast Generator application to improve content delivery performance and reduce costs.

## Overview

Azure CDN provides global content delivery with edge caching to serve audio files, transcripts, and other podcast content more efficiently to users worldwide.

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- Storage account already deployed
- Resource group created

## Architecture

```
User Request → Azure CDN Edge → Azure Blob Storage
                ↓
            Cached Content (if available)
                ↓
            Fresh Content (if cache miss)
```

## CDN Configuration

### 1. Environment Variables

Add these environment variables to your configuration:

```bash
# CDN Configuration
CDN_PROFILE_NAME=podcast-generator-cdn-dev
CDN_ENDPOINT_NAME=podcast-generator-endpoint-dev
CDN_CUSTOM_DOMAIN=your-custom-domain.com  # Optional
CDN_BASE_URL=https://your-cdn-endpoint.azureedge.net
CDN_ENABLE_COMPRESSION=true
CDN_ENABLE_HTTPS=true

# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP_NAME=podcast-generator-rg
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
```

### 2. CDN SKU Options

| SKU | Description | Use Case |
|-----|-------------|----------|
| Standard_Microsoft | Microsoft's global network | General purpose, cost-effective |
| Standard_Akamai | Akamai's global network | High performance, video content |
| Standard_Verizon | Verizon's global network | Enterprise features |
| Premium_Verizon | Verizon with advanced features | Advanced analytics, security |

## Deployment

### Option 1: Automated Deployment Script

```bash
# Set environment variables
export AZURE_RESOURCE_GROUP_NAME="podcast-generator-rg"
export AZURE_STORAGE_ACCOUNT_NAME="your-storage-account"
export CDN_CUSTOM_DOMAIN="your-domain.com"  # Optional
export CDN_SKU="Standard_Microsoft"

# Run deployment script
./scripts/deploy-cdn.sh
```

### Option 2: Manual Azure CLI Deployment

```bash
# Create CDN profile
az cdn profile create \
  --resource-group podcast-generator-rg \
  --name podcast-generator-cdn-dev \
  --sku Standard_Microsoft \
  --location Global

# Create CDN endpoint
az cdn endpoint create \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --origin your-storage-account.blob.core.windows.net \
  --origin-host-header your-storage-account.blob.core.windows.net \
  --enable-compression \
  --content-types-to-compress "audio/mpeg" "audio/mp3" "text/plain" "application/json"
```

### Option 3: Bicep Template

```bash
# Deploy using Bicep
az deployment group create \
  --resource-group podcast-generator-rg \
  --template-file infra/cdn.bicep \
  --parameters \
    environment=dev \
    storageAccountName=your-storage-account \
    customDomainName=your-domain.com \
    sku=Standard_Microsoft
```

## Caching Rules

The CDN is configured with optimized caching rules for different content types:

### Audio Files
- **Path**: `/audio/*`
- **Cache Duration**: 365 days
- **Reasoning**: Audio files rarely change and benefit from long-term caching

### Text Files (Transcripts, Scripts, Summaries)
- **Path**: `/transcripts/*`, `/scripts/*`, `/summaries/*`
- **Cache Duration**: 7 days
- **Reasoning**: Text content may be updated occasionally

### JSON Files (Chapter Markers)
- **Path**: `/chapters/*`
- **Cache Duration**: 1 day
- **Reasoning**: Chapter markers may be updated more frequently

## Performance Optimizations

### 1. Compression
- Enabled for text and JSON files
- Reduces bandwidth usage by 60-80%
- Supported content types: `text/*`, `application/json`, `application/xml`

### 2. HTTP/2 Support
- Automatically enabled on Azure CDN
- Improves performance for multiple concurrent requests

### 3. Edge Caching
- Content cached at 200+ edge locations worldwide
- Reduces latency for global users

## Monitoring and Analytics

### 1. Azure Monitor Integration
```bash
# Enable CDN analytics
az cdn endpoint update \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --enable-logging
```

### 2. Key Metrics to Monitor
- **Cache Hit Ratio**: Should be > 80% for audio files
- **Origin Requests**: Should be minimal for cached content
- **Data Transfer**: Monitor bandwidth usage
- **Response Times**: Should be < 100ms for cached content

### 3. Log Analysis
```bash
# View CDN logs
az cdn endpoint log-analytics report \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --metrics "Requests" "DataTransfer" \
  --granularity "Hourly" \
  --start-time "2024-01-01T00:00:00Z" \
  --end-time "2024-01-02T00:00:00Z"
```

## Cache Management

### 1. Purge Cache
```bash
# Purge specific content
az cdn endpoint purge \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --content-paths "/audio/episode123.mp3" "/transcripts/episode123.txt"

# Purge all content
az cdn endpoint purge \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --content-paths "/*"
```

### 2. Programmatic Cache Purging
```typescript
import { cdnService } from './services/cdn-service';

// Purge specific submission content
await cdnService.purgeSubmissionContent('submission-123');

// Purge custom paths
await cdnService.purgeCache({
  contentPaths: ['/audio/episode123.mp3'],
  domains: ['your-cdn-endpoint.azureedge.net']
});
```

## Security Considerations

### 1. HTTPS Enforcement
- HTTPS is enabled by default
- HTTP requests are redirected to HTTPS
- SSL/TLS certificates are automatically managed

### 2. Access Control
- CDN respects blob storage access policies
- No direct access to storage account required
- Origin host header validation

### 3. DDoS Protection
- Azure DDoS Protection Standard recommended
- Built-in DDoS mitigation for CDN endpoints

## Cost Optimization

### 1. Caching Strategy
- Long cache durations for static content
- Appropriate cache rules reduce origin requests
- Compression reduces data transfer costs

### 2. Monitoring Usage
```bash
# Check CDN usage
az consumption usage list \
  --billing-period-name "202401" \
  --query "[?contains(instanceName, 'cdn')]"
```

### 3. Cost Estimation
- **Data Transfer Out**: ~$0.087/GB (first 10TB)
- **Requests**: ~$0.004/10,000 requests
- **Compression**: Reduces data transfer by 60-80%

## Troubleshooting

### 1. Common Issues

#### Cache Not Working
```bash
# Check cache headers
curl -I https://your-cdn-endpoint.azureedge.net/audio/episode123.mp3

# Verify cache-control headers
# Should show: Cache-Control: public, max-age=31536000
```

#### 404 Errors
```bash
# Check if content exists in storage
az storage blob show \
  --account-name your-storage-account \
  --container-name podcast-content \
  --name audio/episode123.mp3

# Verify CDN origin configuration
az cdn endpoint show \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --query "origins"
```

#### Slow Performance
```bash
# Check CDN analytics
az cdn endpoint log-analytics report \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --metrics "ResponseSize" "ResponseTime" \
  --granularity "Hourly"
```

### 2. Debug Commands

```bash
# Test CDN endpoint
curl -v https://your-cdn-endpoint.azureedge.net/audio/test.mp3

# Check CDN status
az cdn endpoint show \
  --resource-group podcast-generator-rg \
  --profile-name podcast-generator-cdn-dev \
  --name podcast-generator-endpoint-dev \
  --query "resourceState"

# List CDN profiles
az cdn profile list --resource-group podcast-generator-rg
```

## Testing

### 1. Performance Testing
```bash
# Test from different locations
curl -w "@curl-format.txt" -o /dev/null -s https://your-cdn-endpoint.azureedge.net/audio/test.mp3

# Create curl-format.txt:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#           time_total:  %{time_total}\n
```

### 2. Cache Testing
```bash
# First request (cache miss)
curl -I https://your-cdn-endpoint.azureedge.net/audio/test.mp3
# Should show: X-Cache: MISS

# Second request (cache hit)
curl -I https://your-cdn-endpoint.azureedge.net/audio/test.mp3
# Should show: X-Cache: HIT
```

## Best Practices

1. **Use appropriate cache durations** for different content types
2. **Enable compression** for text-based content
3. **Monitor cache hit ratios** and adjust rules as needed
4. **Purge cache** when content is updated
5. **Use HTTPS** for all content delivery
6. **Monitor costs** and optimize based on usage patterns
7. **Test from multiple locations** to verify global performance

## Next Steps

1. Deploy CDN using the provided scripts
2. Update application configuration with CDN URL
3. Test content delivery performance
4. Monitor usage and costs
5. Optimize caching rules based on usage patterns

For more information, see the [Azure CDN documentation](https://docs.microsoft.com/en-us/azure/cdn/).
