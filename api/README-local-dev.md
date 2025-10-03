# Azure Functions Local Development Setup

This guide covers the local development environment setup for the Podcast Generator API.

## Prerequisites

- Node.js (v18 or later)
- Azure Functions Core Tools v4.x
- Azure Storage Emulator (for local development)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure local settings:**
   ```bash
   cp local.settings.json.template local.settings.json
   # Edit local.settings.json with your actual values
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   # or
   func start --typescript
   ```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Start Azure Functions runtime in development mode
- `npm run start` - Start Azure Functions runtime (production mode)
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

## Local Development Configuration

### local.settings.json

The `local.settings.json` file contains environment variables for local development:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FUNCTIONS_EXTENSION_VERSION": "~4",
    "NODE_ENV": "development",
    "SUPABASE_URL": "your-supabase-url",
    "SUPABASE_ANON_KEY": "your-supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "your-supabase-service-role-key",
    "AZURE_OPENAI_ENDPOINT": "your-azure-openai-endpoint",
    "AZURE_OPENAI_API_KEY": "your-azure-openai-api-key",
    "ELEVENLABS_API_KEY": "your-elevenlabs-api-key",
    "FIRECRAWL_API_KEY": "your-firecrawl-api-key",
    "AZURE_STORAGE_CONNECTION_STRING": "your-azure-storage-connection-string",
    "DATABASE_URL": "your-postgresql-connection-string",
    "CDN_BASE_URL": "your-cdn-base-url"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### Environment Variables

| Variable | Description | Required for Local Dev |
|----------|-------------|----------------------|
| `AzureWebJobsStorage` | Azure Storage connection string | Yes (use `UseDevelopmentStorage=true`) |
| `FUNCTIONS_WORKER_RUNTIME` | Runtime type | Yes (set to `node`) |
| `FUNCTIONS_EXTENSION_VERSION` | Functions extension version | Yes (set to `~4`) |
| `NODE_ENV` | Node environment | Yes (set to `development`) |
| `SUPABASE_URL` | Supabase project URL | No (for database operations) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | No (for database operations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No (for database operations) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | No (for AI processing) |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | No (for AI processing) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | No (for TTS) |
| `FIRECRAWL_API_KEY` | Firecrawl API key | No (for web scraping) |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection | No (for file storage) |
| `DATABASE_URL` | PostgreSQL connection string | No (for database) |
| `CDN_BASE_URL` | CDN base URL | No (for file serving) |
| `HEALTH_CHECK_YOUTUBE_ENABLED` | Enable YouTube health checks | No (default: `true`) |
| `HEALTH_CHECK_DOC_INGEST_ENABLED` | Enable document ingestion health checks | No (default: `true`) |
| `HEARTBEAT_ENABLED` | Enable server heartbeat | No (default: `true`) |

### Advanced Health Check Configuration (Optional)

These settings control health check behavior and are optional. Defaults are suitable for most cases.

| Variable | Description | Default |
|----------|-------------|---------|
| `HEALTH_CHECK_YOUTUBE_INTERVAL_MS` | YouTube health check interval | `60000` (1 min) |
| `HEALTH_CHECK_YOUTUBE_TIMEOUT_MS` | YouTube health check timeout | `5000` (5 sec) |
| `HEALTH_CHECK_YOUTUBE_RETRY_ATTEMPTS` | YouTube health check retry attempts | `2` |
| `HEALTH_CHECK_DOC_INGEST_INTERVAL_MS` | Doc ingestion health check interval | `60000` (1 min) |
| `HEALTH_CHECK_DOC_INGEST_TIMEOUT_MS` | Doc ingestion health check timeout | `5000` (5 sec) |
| `HEALTH_CHECK_DOC_INGEST_RETRY_ATTEMPTS` | Doc ingestion health check retry attempts | `2` |
| `HEARTBEAT_INTERVAL_MS` | Heartbeat check interval | `30000` (30 sec) |

## Development Workflow

1. **Make changes** to TypeScript files in `src/`
2. **Build** the project: `npm run build`
3. **Test** your changes: `npm test`
4. **Start** the development server: `npm run dev`
5. **Test** endpoints using the local URLs

## Local Endpoints

When running locally, the functions will be available at:

- Health Check: `http://localhost:7071/api/health-check`
- Content Submission: `http://localhost:7071/api/content-submission`
- RSS Feed: `http://localhost:7071/api/rss-feed`

## Troubleshooting

### Common Issues

1. **Functions not starting:**
   - Check that `local.settings.json` exists and is valid JSON
   - Verify Azure Functions Core Tools are installed: `func --version`
   - Check Node.js version: `node --version` (should be v18+)

2. **TypeScript compilation errors:**
   - Run `npm run build` to see detailed error messages
   - Check `tsconfig.json` configuration
   - Verify all dependencies are installed: `npm install`

3. **Port already in use:**
   - Change the port in `local.settings.json` under `Host.LocalHttpPort`
   - Kill existing processes: `lsof -ti:7071 | xargs kill -9`

4. **Storage emulator issues:**
   - Install Azure Storage Emulator
   - Or use `UseDevelopmentStorage=true` for basic functionality

### Debug Mode

To run in debug mode with more verbose logging:

```bash
func start --typescript --verbose
```

## Testing the Setup

Run the test script to verify everything is working:

```bash
node test-local-dev.js
```

This will check:
- Azure Functions Core Tools installation
- local.settings.json configuration
- TypeScript compilation
- Build output generation

## Next Steps

After the local development environment is set up:

1. Configure external services (database, APIs)
2. Run contract tests (T009-T016)
3. Implement core functionality (T017-T030)
4. Test with real data

## Resources

- [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azure Functions TypeScript Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Local Development Best Practices](https://docs.microsoft.com/en-us/azure/azure-functions/functions-develop-local)

