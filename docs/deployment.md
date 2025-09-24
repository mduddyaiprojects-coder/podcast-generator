# Podcast Generator Deployment Guide

## Overview

This guide covers the complete deployment process for the Podcast Generator application, including Azure Functions API, infrastructure setup, database configuration, and monitoring.

## Architecture

The Podcast Generator consists of:
- **Azure Functions API** - Serverless API for content processing
- **Azure Storage** - Blob storage for audio files and content
- **Azure CDN** - Content delivery for RSS feeds and audio
- **PostgreSQL Database** - Episode and submission data
- **External Services** - OpenAI, ElevenLabs, Firecrawl
- **n8n Workflows** - Content processing automation
- **iOS App** - Share extension for content submission

## Prerequisites

### Required Tools
- **Azure CLI** (latest version)
- **Azure Functions Core Tools** v4
- **Node.js** 22.x
- **npm** 9.x or later
- **Git** (for source control)

### Required Azure Resources
- Azure subscription with appropriate permissions
- Resource group for the application
- Azure Storage Account
- Azure Database for PostgreSQL (Flexible Server)
- Azure CDN profile

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/podcast-generator.git
cd podcast-generator
```

### 2. Install Dependencies
```bash
# Install API dependencies
cd api
npm install

# Install n8n workflow dependencies
cd ../n8n-workflows
npm install

# Install database dependencies
cd ../database
npm install
```

### 3. Environment Configuration

Create environment files for each component:

#### API Environment (`api/local.settings.json`)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=...",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://user:password@server.postgres.database.azure.com:5432/podcastgen",
    "AZURE_OPENAI_API_KEY": "your-openai-key",
    "AZURE_OPENAI_ENDPOINT": "https://your-resource.openai.azure.com/",
    "ELEVENLABS_API_KEY": "your-elevenlabs-key",
    "FIRECRAWL_API_KEY": "your-firecrawl-key",
    "AZURE_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;AccountName=...",
    "CDN_ENDPOINT_URL": "https://your-cdn.azureedge.net",
    "API_KEY_SECRET": "your-secure-api-key"
  }
}
```

#### Database Environment (`database/.env`)
```env
DATABASE_URL=postgresql://user:password@server.postgres.database.azure.com:5432/podcastgen
NODE_ENV=production
```

#### n8n Environment (`n8n-workflows/.env`)
```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
N8N_ENCRYPTION_KEY=your-encryption-key
WEBHOOK_URL=https://your-n8n-instance.com
```

## Infrastructure Deployment

### 1. Deploy Storage Infrastructure

```bash
# Deploy storage account with lifecycle policies
az deployment group create \
  --resource-group rg-podcast-generator \
  --template-file infra/storage.bicep \
  --parameters environment=prod \
  --parameters location=eastus
```

### 2. Deploy CDN Infrastructure

```bash
# Deploy CDN profile and endpoints
az deployment group create \
  --resource-group rg-podcast-generator \
  --template-file infra/cdn.bicep \
  --parameters environment=prod \
  --parameters location=eastus
```

### 3. Create PostgreSQL Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group rg-podcast-generator \
  --name podcastgen-db \
  --location eastus \
  --admin-user podcastadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --public-access 0.0.0.0 \
  --storage-size 32

# Create database
az postgres flexible-server db create \
  --resource-group rg-podcast-generator \
  --server-name podcastgen-db \
  --database-name podcastgen
```

## API Deployment

### 1. Build and Deploy Azure Functions

```bash
cd api

# Build TypeScript
npm run build

# Deploy to Azure Functions
func azure functionapp publish podcast-gen-api \
  --resource-group rg-podcast-generator \
  --subscription your-subscription-id
```

### 2. Configure Application Settings

```bash
# Set environment variables
az functionapp config appsettings set \
  --resource-group rg-podcast-generator \
  --name podcast-gen-api \
  --settings \
    DATABASE_URL="postgresql://podcastadmin:YourSecurePassword123!@podcastgen-db.postgres.database.azure.com:5432/podcastgen" \
    AZURE_OPENAI_API_KEY="your-openai-key" \
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
    ELEVENLABS_API_KEY="your-elevenlabs-key" \
    FIRECRAWL_API_KEY="your-firecrawl-key" \
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..." \
    CDN_ENDPOINT_URL="https://your-cdn.azureedge.net" \
    API_KEY_SECRET="your-secure-api-key"
```

### 3. Verify API Deployment

```bash
# Test health endpoint
curl https://podcast-gen-api.azurewebsites.net/api/health

# Test content submission
curl -X POST https://podcast-gen-api.azurewebsites.net/api/content \
  -H "X-API-Key: your-secure-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/article",
    "content_type": "url",
    "user_note": "Test submission"
  }'
```

## Database Setup

### 1. Run Migrations

```bash
cd database

# Install dependencies
npm install

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 2. Verify Database Connection

```bash
# Test database connection
npm run test-connection
```

## n8n Workflow Deployment

### 1. Deploy n8n Instance

```bash
cd n8n-workflows

# Deploy using Azure Container Apps or Azure App Service
# (Follow n8n deployment guide for your preferred method)
```

### 2. Import Workflows

```bash
# Import workflow configurations
n8n import:workflow --input=workflows/content-processing.json
n8n import:workflow --input=workflows/tts-generation.json
n8n import:workflow --input=workflows/error-handling.json
```

### 3. Configure Webhooks

```bash
# Set up webhook endpoints
# Update webhook URLs in workflow configurations
# Test webhook connectivity
```

## iOS App Deployment

### 1. Configure Xcode Project

```bash
cd ios

# Update API endpoint in configuration
# Set your Azure Functions URL
# Configure app settings
```

### 2. Build and Deploy

```bash
# Build for App Store or TestFlight
# Follow iOS deployment guide
```

## Monitoring and Logging

### 1. Application Insights Setup

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --resource-group rg-podcast-generator \
  --app podcast-gen-insights \
  --location eastus \
  --kind web

# Get instrumentation key
az monitor app-insights component show \
  --resource-group rg-podcast-generator \
  --app podcast-gen-insights \
  --query instrumentationKey
```

### 2. Configure Logging

```bash
# Set Application Insights key
az functionapp config appsettings set \
  --resource-group rg-podcast-generator \
  --name podcast-gen-api \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### 3. Set Up Alerts

```bash
# Create alert rules for critical metrics
# Monitor function execution time
# Monitor error rates
# Monitor storage usage
```

## Security Configuration

### 1. API Key Management

```bash
# Generate secure API keys
# Store in Azure Key Vault
# Configure key rotation
```

### 2. Network Security

```bash
# Configure VNet integration
# Set up private endpoints
# Configure firewall rules
```

### 3. Data Encryption

```bash
# Enable encryption at rest
# Configure TLS 1.2+
# Set up certificate management
```

## Performance Optimization

### 1. CDN Configuration

```bash
# Configure caching rules
# Set up compression
# Optimize cache headers
```

### 2. Database Optimization

```bash
# Configure connection pooling
# Set up read replicas
# Optimize query performance
```

### 3. Function App Scaling

```bash
# Configure auto-scaling
# Set up premium plan if needed
# Monitor performance metrics
```

## Backup and Recovery

### 1. Database Backups

```bash
# Configure automated backups
# Set up point-in-time recovery
# Test restore procedures
```

### 2. Storage Backups

```bash
# Configure blob backup
# Set up geo-redundancy
# Test recovery procedures
```

### 3. Configuration Backups

```bash
# Export configuration
# Store in version control
# Document recovery procedures
```

## Troubleshooting

### Common Issues

#### 1. Function Timeout Errors
```bash
# Check functionTimeout in host.json
# Ensure it's less than 10 minutes for consumption plan
# Consider upgrading to premium plan for longer timeouts
```

#### 2. Database Connection Issues
```bash
# Verify connection string
# Check firewall rules
# Test connectivity from Azure
```

#### 3. Storage Access Issues
```bash
# Verify connection string
# Check access keys
# Test blob operations
```

#### 4. External Service Failures
```bash
# Check API keys
# Verify service endpoints
# Monitor rate limits
```

### Debugging Commands

```bash
# View function logs
az functionapp logs tail --name podcast-gen-api --resource-group rg-podcast-generator

# Check function status
az functionapp show --name podcast-gen-api --resource-group rg-podcast-generator

# Test database connection
psql "postgresql://user:password@server.postgres.database.azure.com:5432/podcastgen"

# Check storage account
az storage account show --name your-storage-account --resource-group rg-podcast-generator
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check storage usage
   - Monitor performance metrics

2. **Monthly**
   - Update dependencies
   - Review security settings
   - Test backup procedures

3. **Quarterly**
   - Security audit
   - Performance review
   - Cost optimization

### Update Procedures

```bash
# Update API
cd api
git pull origin main
npm install
npm run build
func azure functionapp publish podcast-gen-api

# Update database
cd database
git pull origin main
npm run migrate

# Update n8n workflows
cd n8n-workflows
git pull origin main
# Import updated workflows
```

## Cost Optimization

### 1. Storage Optimization
- Use lifecycle policies
- Enable compression
- Archive old content

### 2. Function Optimization
- Monitor execution time
- Optimize cold starts
- Use appropriate plan

### 3. Database Optimization
- Monitor query performance
- Use appropriate SKU
- Enable auto-scaling

## Support and Documentation

- **API Documentation**: `/docs/api.md`
- **User Guide**: `/docs/user-guide.md`
- **Troubleshooting**: Check logs and monitoring
- **Issues**: Create GitHub issues for bugs

## Quick Reference

### Key URLs
- **API Health**: `https://podcast-gen-api.azurewebsites.net/api/health`
- **RSS Feed**: `https://podcast-gen-api.azurewebsites.net/api/feeds/main/rss.xml`
- **n8n Dashboard**: `https://your-n8n-instance.com`

### Key Commands
```bash
# Deploy API
func azure functionapp publish podcast-gen-api

# Run migrations
npm run migrate

# Test health
curl https://podcast-gen-api.azurewebsites.net/api/health

# View logs
az functionapp logs tail --name podcast-gen-api --resource-group rg-podcast-generator
```

### Emergency Contacts
- **Azure Support**: Through Azure Portal
- **GitHub Issues**: For code-related problems
- **Documentation**: Check `/docs/` directory
