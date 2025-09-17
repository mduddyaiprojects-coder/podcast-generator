# n8n Workflow Environment for Podcast Generator

This directory contains the n8n workflow automation setup for the podcast generation pipeline.

## Overview

n8n workflows handle the automated processing of content submissions, including:
- Content extraction and processing
- YouTube video processing
- Document parsing and analysis
- Text-to-speech generation
- Error handling and retry logic

## Quick Start

1. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

2. **Configure your credentials:**
   - Edit `.env` file with your actual API keys and endpoints
   - Update credential files in `credentials/` directory

3. **Start n8n:**
   ```bash
   npm run dev
   ```

4. **Access n8n interface:**
   - Open http://localhost:5678 in your browser
   - Default credentials: admin/admin (change in .env)

## Directory Structure

```
n8n-workflows/
├── package.json              # n8n dependencies and scripts
├── n8n.config.js            # n8n configuration
├── n8n.env.template         # Environment variables template
├── setup.sh                 # Setup script
├── README.md                # This file
├── workflows/               # Workflow definitions
│   ├── content-processing/  # Main content processing workflows
│   ├── youtube-extraction/  # YouTube-specific workflows
│   ├── document-processing/ # Document parsing workflows
│   ├── tts-generation/      # Text-to-speech workflows
│   └── error-handling/      # Error handling workflows
├── credentials/             # Service credentials
│   ├── azure-openai.json.template
│   ├── elevenlabs.json.template
│   ├── firecrawl.json.template
│   ├── azure-storage.json.template
│   └── postgresql.json.template
└── logs/                    # n8n execution logs
```

## Configuration

### Environment Variables

Copy `n8n.env.template` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `N8N_HOST` | n8n host address | Yes |
| `N8N_PORT` | n8n port | Yes |
| `DB_POSTGRESDB_HOST` | PostgreSQL host | Yes |
| `DB_POSTGRESDB_DATABASE` | Database name | Yes |
| `DB_POSTGRESDB_USER` | Database user | Yes |
| `DB_POSTGRESDB_PASSWORD` | Database password | Yes |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | Yes |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `FIRECRAWL_API_KEY` | Firecrawl API key | Yes |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection | Yes |

### Credentials

Each service has a credential template in `credentials/`:
- `azure-openai.json.template` - Azure OpenAI service
- `elevenlabs.json.template` - ElevenLabs TTS service
- `firecrawl.json.template` - Firecrawl web scraping
- `azure-storage.json.template` - Azure Blob Storage
- `postgresql.json.template` - PostgreSQL database

Copy templates to remove `.template` extension and configure with actual values.

## Available Scripts

- `npm run dev` - Start n8n in development mode with tunnel
- `npm run start` - Start n8n in production mode
- `npm run import` - Import workflows from workflows/ directory
- `npm run export` - Export workflows to workflows/ directory
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Workflow Types

### 1. Content Processing Workflow
- **Purpose**: Main workflow for processing content submissions
- **Triggers**: Webhook from API
- **Steps**: Extract content → Process with AI → Generate audio → Store results
- **File**: `workflows/content-processing/main-workflow.json`

### 2. YouTube Extraction Workflow
- **Purpose**: Extract and process YouTube videos
- **Triggers**: YouTube URL submission
- **Steps**: Extract video → Download audio → Transcribe → Process
- **File**: `workflows/youtube-extraction/youtube-workflow.json`

### 3. Document Processing Workflow
- **Purpose**: Process uploaded documents (PDF, Word, etc.)
- **Triggers**: Document upload
- **Steps**: Parse document → Extract text → Process with AI
- **File**: `workflows/document-processing/document-workflow.json`

### 4. TTS Generation Workflow
- **Purpose**: Convert text to speech using ElevenLabs
- **Triggers**: Text content ready for audio generation
- **Steps**: Process text → Generate audio → Store audio file
- **File**: `workflows/tts-generation/tts-workflow.json`

### 5. Error Handling Workflow
- **Purpose**: Handle errors and retry failed operations
- **Triggers**: Error notifications
- **Steps**: Log error → Retry logic → Notify administrators
- **File**: `workflows/error-handling/error-workflow.json`

## Database Setup

n8n requires a PostgreSQL database for workflow storage:

```sql
CREATE DATABASE n8n;
CREATE USER n8n WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;
```

## Security Considerations

1. **Change default credentials** in `.env` file
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** in production
4. **Restrict network access** to n8n instance
5. **Regular credential rotation**

## Monitoring and Logging

- **Logs**: Stored in `logs/n8n.log`
- **Execution history**: Available in n8n interface
- **Error tracking**: Built-in error handling and retry logic
- **Performance metrics**: Available in n8n dashboard

## Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Check PostgreSQL is running
   - Verify database credentials
   - Ensure database exists

2. **API credentials not working:**
   - Verify API keys are correct
   - Check credential files are properly configured
   - Test API endpoints manually

3. **Workflows not executing:**
   - Check webhook URLs are accessible
   - Verify trigger conditions
   - Review execution logs

4. **Memory issues:**
   - Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Check binary data settings
   - Monitor system resources

### Debug Mode

Enable debug logging:
```bash
N8N_LOG_LEVEL=debug npm run dev
```

## Production Deployment

For production deployment:

1. **Use environment variables** for all configuration
2. **Set up proper database** with connection pooling
3. **Configure Redis** for queue management
4. **Enable HTTPS** and proper security
5. **Set up monitoring** and alerting
6. **Configure backup** strategies

## Integration with Podcast Generator API

The n8n workflows integrate with the podcast generator API through:

- **Webhooks**: API triggers workflows via HTTP webhooks
- **Database**: Shared PostgreSQL database for data persistence
- **Storage**: Shared Azure Blob Storage for file management
- **Credentials**: Shared service credentials for external APIs

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review n8n documentation
3. Check workflow execution logs
4. Verify API credentials and connectivity
