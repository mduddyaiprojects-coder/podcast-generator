# Azure Functions Deployment Guide

## Prerequisites

1. **Azure CLI** installed and logged in
2. **Azure Functions Core Tools** installed
3. **Node.js 22** installed locally

## One-Time Setup

### 1. Create Function App
```bash
az functionapp create \
  --resource-group rg-m4c-apps \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 22 \
  --functions-version 4 \
  --name podcast-gen-api \
  --storage-account <your-storage-account>
```

### 2. Verify Configuration
Check that these settings are correct in Azure Portal:
- **Stack**: Node.js
- **Node.js version**: Node.js 22
- **WEBSITE_NODE_DEFAULT_VERSION**: ~22
- **FUNCTIONS_EXTENSION_VERSION**: ~4
- **FUNCTIONS_WORKER_RUNTIME**: node

## Deployment Process

### 1. Build and Deploy
```bash
cd api
npm run build
func azure functionapp publish podcast-gen-api
```

### 2. Verify Deployment
```bash
# Test health endpoint
curl https://podcast-gen-api.azurewebsites.net/api/health

# Test content submission
curl -X POST https://podcast-gen-api.azurewebsites.net/api/content \
  -H "Content-Type: application/json" \
  -d '{"content_url":"https://example.com","content_type":"url"}'
```

## Configuration Requirements

### host.json
```json
{
  "version": "2.0",
  "functionTimeout": "00:09:00",  // Must be < 10 minutes for consumption plan
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

## Troubleshooting

### Common Issues

1. **FunctionTimeout Error**
   - Ensure `functionTimeout` in `host.json` is less than 10 minutes
   - Maximum allowed: `"00:09:59"`

2. **Runtime Version Error**
   - Usually caused by FunctionTimeout configuration issues
   - Fix the timeout, then redeploy

3. **Function Host Not Running**
   - Restart the Function App in Azure Portal
   - Check Application Insights logs for errors

4. **Sync Triggers Failed**
   - This is often a temporary issue
   - Functions usually work despite this error
   - Check the Functions list in Azure Portal

## API Endpoints

- **Health Check**: `GET /api/health`
- **Content Submission**: `POST /api/content`
- **Status Check**: `GET /api/content/{id}/status`
- **RSS Feed**: `GET /api/feeds/{slug}/rss.xml`
- **Episodes List**: `GET /api/feeds/{slug}/episodes`

## Why Not Use Custom Scripts?

The custom `deploy-minimal.sh` script was removed because:
- Azure Functions Core Tools (`func azure functionapp publish`) is more reliable
- Microsoft's tool handles edge cases and error scenarios better
- Simpler deployment process with fewer failure points
- Better integration with Azure Functions runtime





