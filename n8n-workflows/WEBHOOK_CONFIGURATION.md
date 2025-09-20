# n8n Webhook Configuration Guide

This guide provides comprehensive instructions for configuring n8n webhooks for the Podcast Generator system.

## 🔗 Webhook Endpoints

### Primary Workflows

| Workflow | Webhook Path | Purpose | Input Format |
|----------|--------------|---------|--------------|
| Content Processing | `/process-content` | General content processing | `{content_url, content_type, submission_id?, metadata?}` |
| YouTube Extraction | `/extract-youtube` | YouTube video processing | `{youtube_url, submission_id?, metadata?}` |
| Document Processing | `/process-document` | Document file processing | `{document_url, submission_id?, metadata?}` |
| TTS Generation | `/generate-tts` | Text-to-speech generation | `{submission_id, text_content, voice_settings?}` |
| Error Handling | `/handle-error` | Error logging and handling | `{submission_id, error_type, error_message, context?, severity?}` |

### Legacy Workflows

| Workflow | Webhook Path | Purpose | Input Format |
|----------|--------------|---------|--------------|
| Status Update | `/update-status` | Status updates | `{submission_id, status, progress?, message?}` |
| Error Notification | `/notify-error` | Legacy error notifications | `{submission_id, error_type, error_message, context?}` |

## 🚀 Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the n8n-workflows directory:

```bash
# n8n Configuration
N8N_HOST=your-azure-n8n-host.azurewebsites.net
N8N_PORT=443
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://your-azure-n8n-host.azurewebsites.net

# API Endpoints
PODCAST_API_BASE_URL=https://your-azure-functions-app.azurewebsites.net/api
WEBHOOK_BASE_URL=https://your-azure-n8n-host.azurewebsites.net/webhook

# External Service Credentials
AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
FIRECRAWL_API_KEY=your-firecrawl-api-key
AZURE_STORAGE_CONNECTION_STRING=your-azure-storage-connection-string

# Database
DATABASE_URL=your-postgresql-connection-string

# Security
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
```

### 2. Workflow Import Process

1. **Access n8n Instance**
   - Navigate to your Azure n8n instance
   - Login with admin credentials

2. **Import Workflows**
   - Go to **Workflows** → **Import from File**
   - Import each workflow JSON file:
     - `content-processing.json`
     - `youtube-extraction.json`
     - `document-processing.json`
     - `tts-generation.json`
     - `error-handling.json`

3. **Configure API URLs**
   - Open each imported workflow
   - Find the "Call Azure Functions" nodes
   - Update the URL to use environment variable: `={{$env.PODCAST_API_BASE_URL}}/api/content`
   - For TTS workflow, use: `={{$env.PODCAST_API_BASE_URL}}/api/tts/generate`

4. **Activate Workflows**
   - Toggle the **Active** switch for each workflow
   - Note the generated webhook URLs

### 3. Webhook URL Generation

After activation, n8n will generate webhook URLs in this format:
```
https://your-n8n-instance.azurewebsites.net/webhook/{webhook-path}
```

Example URLs:
- `https://podcast-n8n.azurewebsites.net/webhook/process-content`
- `https://podcast-n8n.azurewebsites.net/webhook/extract-youtube`
- `https://podcast-n8n.azurewebsites.net/webhook/process-document`
- `https://podcast-n8n.azurewebsites.net/webhook/generate-tts`
- `https://podcast-n8n.azurewebsites.net/webhook/handle-error`

## 🧪 Testing Webhooks

### Test Content Processing
```bash
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/process-content \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/article",
    "content_type": "url",
    "submission_id": "test-123",
    "metadata": {
      "source": "test",
      "priority": "normal"
    }
  }'
```

### Test YouTube Extraction
```bash
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/extract-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "submission_id": "yt-test-123",
    "metadata": {
      "extract_audio": true,
      "quality": "high"
    }
  }'
```

### Test Document Processing
```bash
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/process-document \
  -H "Content-Type: application/json" \
  -d '{
    "document_url": "https://example.com/document.pdf",
    "submission_id": "doc-test-123",
    "metadata": {
      "extract_text": true,
      "preserve_formatting": false
    }
  }'
```

### Test TTS Generation
```bash
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/generate-tts \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "tts-test-123",
    "text_content": "Hello, this is a test of the text-to-speech system.",
    "voice_settings": {
      "voice_id": "default",
      "speed": 1.0,
      "pitch": 1.0
    }
  }'
```

### Test Error Handling
```bash
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/handle-error \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "error-test-123",
    "error_type": "processing_error",
    "error_message": "Failed to extract content from URL",
    "context": {
      "step": "content_extraction",
      "url": "https://example.com"
    },
    "severity": "medium"
  }'
```

## 📊 Expected Responses

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "submission_id": "uuid",
  "status": "processing|completed|failed",
  "timestamp": "2024-12-19T15:30:00.000Z",
  "additional_data": {}
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Error message description",
  "submission_id": "uuid",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

## 🔧 Configuration Details

### Environment Variables

The workflows use these environment variables:

- `PODCAST_API_BASE_URL`: Base URL for Azure Functions API
- `WEBHOOK_BASE_URL`: Base URL for n8n webhooks
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI service endpoint
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key
- `ELEVENLABS_API_KEY`: ElevenLabs TTS API key
- `FIRECRAWL_API_KEY`: Firecrawl web scraping API key
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Storage connection string
- `DATABASE_URL`: PostgreSQL database connection string

### Workflow Settings

Each workflow is configured with:
- **Timeout**: 30 seconds (TTS: 5 minutes)
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: Comprehensive error catching and logging
- **Response Format**: JSON with consistent structure

## 🐛 Troubleshooting

### Common Issues

1. **Webhook Not Responding**
   - Check if workflow is active
   - Verify webhook URL is correct
   - Check n8n execution logs

2. **API Calls Failing**
   - Verify `PODCAST_API_BASE_URL` environment variable
   - Check if Azure Functions API is accessible
   - Review API logs for errors

3. **Environment Variables Not Working**
   - Ensure `.env` file is in correct location
   - Check n8n configuration for environment variable support
   - Verify variable names match exactly

4. **Workflow Execution Errors**
   - Check n8n execution history
   - Review function node code
   - Verify input data format matches expected schema

### Debug Mode

Enable debug logging:
1. Go to **Settings** → **Log Level**
2. Set to **Debug**
3. Check execution logs for detailed information

### Monitoring

- **n8n Execution History**: View workflow executions in n8n interface
- **API Integration**: Monitor Azure Functions API calls
- **Error Logs**: Review error handling and logging

## 🔄 Updates and Maintenance

### Updating Workflows
1. Export current workflow from n8n
2. Replace with new JSON file
3. Import updated workflow
4. Test functionality
5. Activate if working correctly

### Backup
- Export all workflows regularly
- Backup n8n configuration
- Document webhook URLs and settings

## 📞 Support

For issues:
1. Check n8n execution logs
2. Review Azure Functions API logs
3. Verify webhook URLs and environment variables
4. Test with sample data using provided curl commands

