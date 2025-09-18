# Azure Storage and CDN Setup Guide

This guide covers setting up Azure Blob Storage and CDN for the Podcast Generator API.

## Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Azure Functions app deployed
- n8n workflow environment configured

## Step 1: Create Azure Storage Account

### Using Azure CLI

```bash
# Set variables
RESOURCE_GROUP="your-resource-group"
STORAGE_ACCOUNT="your-storage-account"
LOCATION="your-region"

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Get connection string
az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString \
  --output tsv
```

### Using Azure Portal

1. Go to Azure Portal → Storage accounts
2. Click "Create"
3. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource group**: Your resource group
   - **Storage account name**: `your-storage-account`
   - **Location**: Your preferred region
   - **Performance**: Standard
   - **Redundancy**: LRS (Locally Redundant Storage)
4. Click "Review + create" → "Create"

## Step 2: Create Blob Container

### Using Azure CLI

```bash
# Create container
az storage container create \
  --name podcast-content \
  --account-name $STORAGE_ACCOUNT \
  --auth-mode login \
  --public-access blob
```

### Using Azure Portal

1. Go to your storage account
2. Click "Containers" in the left menu
3. Click "+ Container"
4. Name: `podcast-content`
5. Public access level: "Blob (anonymous read access for blobs only)"
6. Click "Create"

## Step 3: Set Up Azure CDN

### Using Azure CLI

```bash
# Set variables
CDN_PROFILE="your-cdn-profile"
CDN_ENDPOINT="your-cdn-endpoint"

# Create CDN profile
az cdn profile create \
  --name $CDN_PROFILE \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_Microsoft

# Create CDN endpoint
az cdn endpoint create \
  --name $CDN_ENDPOINT \
  --profile-name $CDN_PROFILE \
  --resource-group $RESOURCE_GROUP \
  --origin $STORAGE_ACCOUNT.blob.core.windows.net \
  --origin-host-header $STORAGE_ACCOUNT.blob.core.windows.net \
  --enable-compression true
```

### Using Azure Portal

1. Go to Azure Portal → CDN profiles
2. Click "Create"
3. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource group**: Your resource group
   - **Profile name**: `your-cdn-profile`
   - **Pricing tier**: Standard Microsoft
4. Click "Review + create" → "Create"

5. After creation, click "Create endpoint":
   - **Name**: `your-cdn-endpoint`
   - **Origin type**: Storage
   - **Origin hostname**: `your-storage-account.blob.core.windows.net`
   - **Origin path**: `/podcast-content`
   - **Origin host header**: `your-storage-account.blob.core.windows.net`
   - **Protocol**: HTTPS
   - **Origin port**: 443
   - **Optimized for**: General web delivery
   - **Enable compression**: Yes

## Step 4: Configure CDN Rules

### Cache Rules

1. Go to your CDN endpoint
2. Click "Rules engine" in the left menu
3. Click "Add rule"

#### Rule 1: Audio Files (Long Cache)
- **Name**: Audio Files Cache
- **Conditions**:
  - IF Request URL file extension equals "mp3, wav, m4a, ogg"
- **Actions**:
  - Cache expiration: 7 days
  - Cache behavior: Override

#### Rule 2: Images (Long Cache)
- **Name**: Images Cache
- **Conditions**:
  - IF Request URL file extension equals "jpg, jpeg, png, gif, webp"
- **Actions**:
  - Cache expiration: 1 day
  - Cache behavior: Override

#### Rule 3: RSS Feeds (Short Cache)
- **Name**: RSS Feeds Cache
- **Conditions**:
  - IF Request URL file extension equals "xml, rss"
- **Actions**:
  - Cache expiration: 5 minutes
  - Cache behavior: Override

### Compression Rules

1. Create a new rule for compression
2. **Name**: Enable Compression
3. **Conditions**:
  - IF Request header Accept-Encoding contains "gzip"
4. **Actions**:
  - Compression: Enable

## Step 5: Configure Environment Variables

### Update local.settings.json

```json
{
  "Values": {
    "AZURE_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;AccountName=your-storage-account;AccountKey=your-storage-key;EndpointSuffix=core.windows.net",
    "AZURE_STORAGE_CONTAINER_NAME": "podcast-content",
    "AZURE_STORAGE_DEFAULT_TTL": "3600",
    "AZURE_STORAGE_MAX_FILE_SIZE": "104857600",
    "CDN_BASE_URL": "https://your-cdn-endpoint.azureedge.net",
    "CDN_CACHE_CONTROL": "public, max-age=3600",
    "CDN_DEFAULT_TTL": "3600",
    "CDN_MAX_TTL": "86400",
    "CDN_COMPRESSION_ENABLED": "true",
    "CDN_HTTPS_REDIRECT": "true",
    "AUDIO_RETENTION_DAYS": "90",
    "IMAGE_RETENTION_DAYS": "30",
    "TEMP_FILE_RETENTION_HOURS": "24",
    "STORAGE_CLEANUP_ENABLED": "true"
  }
}
```

### Update Azure App Settings

```bash
# Set storage connection string
az functionapp config appsettings set \
  --name your-function-app \
  --resource-group your-resource-group \
  --settings "AZURE_STORAGE_CONNECTION_STRING=your-connection-string"

# Set CDN base URL
az functionapp config appsettings set \
  --name your-function-app \
  --resource-group your-resource-group \
  --settings "CDN_BASE_URL=https://your-cdn-endpoint.azureedge.net"

# Set other storage settings
az functionapp config appsettings set \
  --name your-function-app \
  --resource-group your-resource-group \
  --settings "AZURE_STORAGE_CONTAINER_NAME=podcast-content" \
  "CDN_COMPRESSION_ENABLED=true" \
  "STORAGE_CLEANUP_ENABLED=true"
```

## Step 6: Test the Setup

### Test Storage Connection

```bash
# Test storage connection
curl -X GET "https://your-function-app.azurewebsites.net/api/storage-management?action=health"
```

### Test File Upload

```bash
# Test file upload
curl -X POST "https://your-function-app.azurewebsites.net/api/storage-management?action=upload" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.mp3",
    "contentType": "audio/mpeg",
    "data": "base64-encoded-data",
    "metadata": {
      "test": "true"
    }
  }'
```

### Test CDN

```bash
# Test CDN URL
curl -I "https://your-cdn-endpoint.azureedge.net/podcast-content/test.mp3"
```

## Step 7: Configure Lifecycle Management

### Set Up Automated Cleanup

1. Go to your storage account
2. Click "Lifecycle management" in the left menu
3. Click "Add a rule"
4. Configure the rule:
   - **Rule name**: Podcast Content Cleanup
   - **Rule scope**: Limit blobs with filters
   - **Blob type**: Block blobs
   - **Blob subtype**: Base blobs
   - **Prefix match**: `podcast-content/`
   - **Blob index tags**: (optional)

5. Set up actions:
   - **After 90 days**: Delete if last modified time is older than 90 days
   - **After 30 days**: Move to cool storage if last modified time is older than 30 days

## Step 8: Monitor and Optimize

### Storage Metrics

1. Go to your storage account
2. Click "Insights" in the left menu
3. Monitor:
   - Total requests
   - Success rate
   - Average latency
   - Bandwidth usage

### CDN Metrics

1. Go to your CDN endpoint
2. Click "Metrics" in the left menu
3. Monitor:
   - Request count
   - Data transfer
   - Cache hit ratio
   - Origin response time

### Cost Optimization

1. **Use appropriate storage tiers**:
   - Hot: Frequently accessed files
   - Cool: Infrequently accessed files
   - Archive: Long-term storage

2. **Optimize CDN caching**:
   - Set appropriate cache TTL
   - Use compression
   - Enable HTTPS

3. **Monitor usage**:
   - Set up billing alerts
   - Review monthly costs
   - Optimize based on usage patterns

## Troubleshooting

### Common Issues

1. **Storage connection failed**:
   - Check connection string
   - Verify storage account exists
   - Check network access

2. **CDN not working**:
   - Verify CDN endpoint is active
   - Check origin configuration
   - Wait for propagation (up to 24 hours)

3. **File upload failed**:
   - Check file size limits
   - Verify content type
   - Check storage permissions

4. **Cache not updating**:
   - Purge CDN cache
   - Check cache rules
   - Verify TTL settings

### Debug Commands

```bash
# Check storage account status
az storage account show \
  --name your-storage-account \
  --resource-group your-resource-group

# List containers
az storage container list \
  --account-name your-storage-account \
  --auth-mode login

# Check CDN endpoint status
az cdn endpoint show \
  --name your-cdn-endpoint \
  --profile-name your-cdn-profile \
  --resource-group your-resource-group
```

## Security Considerations

1. **Access Control**:
   - Use managed identities when possible
   - Limit storage account access
   - Use SAS tokens for temporary access

2. **Network Security**:
   - Enable HTTPS only
   - Use Azure Private Link if needed
   - Configure firewall rules

3. **Data Protection**:
   - Enable soft delete
   - Use encryption at rest
   - Regular backup procedures

## Next Steps

After completing this setup:

1. Test all storage operations
2. Configure monitoring and alerting
3. Set up automated backups
4. Optimize performance based on usage
5. Review and update security settings regularly

