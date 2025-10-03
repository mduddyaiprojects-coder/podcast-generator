# Podcast Generator# Podcast Generator 🎧



An automated podcast generation system that converts web content (articles, videos, etc.) into AI-narrated podcast episodes with RSS feed distribution.Convert any web content (URLs, YouTube videos, documents) into podcast episodes via iOS Share Sheet and listen through traditional podcast apps.



## Overview## 🚀 Quick Start



This system accepts content submissions via API, processes the content, generates an AI-narrated podcast episode, uploads it to Azure Storage, and makes it available through an RSS feed for podcast players.### Option 1: iOS Shortcuts (Recommended)

1. **Set up iOS Shortcuts**: Follow our [iOS Shortcuts Setup Guide](docs/ios-shortcuts-quickstart.md)

## Content Submission Flow2. **Share Content**: Use the "Send to Podcast Generator" shortcut from any app

3. **Listen**: Subscribe to your personal RSS feed in Apple Podcasts, Overcast, or Spotify

```mermaid

sequenceDiagram### Option 2: Direct API

    participant User1. **Send Content**: POST to `/api/webhook/share` with your content

    participant API2. **AI Processing**: Content is automatically converted to engaging podcast dialogue

    participant ContentService3. **Listen**: Subscribe to your personal RSS feed in Apple Podcasts, Overcast, or Spotify

    participant ContentProcessor

    participant PodcastGenerator## ✨ Features

    participant AzureTTS

    participant Storage- **iOS Shortcuts Integration**: One-tap sharing from any app via Shortcuts

    participant RSSFeed- **Webhook API**: Direct integration for developers and power users

- **Multi-Content Support**: URLs, YouTube videos, PDFs, documents

    User->>API: POST /api/webhook/share (content)- **AI-Powered**: Azure OpenAI converts content to conversational dialogue

    API->>ContentService: processSubmission(request)- **High-Quality Audio**: ElevenLabs TTS with Azure fallback

    ContentService->>ContentProcessor: extractContent(submission)- **RSS Compliant**: Works with all major podcast apps

    ContentProcessor-->>ContentService: Extracted content- **Fast Processing**: 15-minute maximum processing time

    ContentService->>PodcastGenerator: generateEpisode(content, submissionId)- **Anonymous Access**: No account required

    PodcastGenerator->>AzureTTS: generateAudioWithFallback(script)

    AzureTTS-->>PodcastGenerator: Audio buffer, duration## 🏗️ Architecture

    PodcastGenerator->>Storage: uploadAudio(audioBuffer, submissionId)

    Storage-->>PodcastGenerator: Audio URL, size

    PodcastGenerator-->>ContentService: PodcastEpisode object## 📋 Specification

    ContentService-->>API: submissionId, estimatedCompletion

    API-->>User: Success response (submission_id, rss_feed_url)Complete specification and implementation plan available in `/specs/001-feature-podcast-generator/`:



    User->>RSSFeed: GET /feeds/public/rss.xml- **Feature Specification**: 20 functional requirements

    RSSFeed-->>User: Podcast episode (audio, transcript, metadata)- **Implementation Plan**: Azure Functions + n8n + ElevenLabs architecture

```- **Research**: Technical decisions and rationale

- **Data Model**: PostgreSQL schema design

## System Architecture- **API Contracts**: OpenAPI specifications

- **Tasks**: 90 detailed implementation tasks

### Core Components

## 🛠️ Development

#### 1. Content Submission Service (`api/src/services/ContentSubmissionService.ts`)

- Validates incoming content submissionsThis project uses the [Specify Framework](https://github.com/specify-framework/specify) for specification-driven development.

- Orchestrates the content-to-podcast pipeline

- Handles submission tracking and status updates### Prerequisites

- Manages the end-to-end process from URL to audio

- Node.js 18+

#### 2. Content Processor (`api/src/services/ContentProcessor.ts`)- Azure Functions Core Tools

- Extracts content from URLs using Azure OpenAI- n8n (workflow orchestration)

- Cleans and formats extracted content- PostgreSQL database

- Prepares content for podcast script generation- Azure OpenAI API access

- Handles various content types (articles, videos, etc.)- ElevenLabs API access

- Firecrawl API access

#### 3. Podcast Generator (`api/src/services/PodcastGenerator.ts`)

- Generates podcast scripts using Azure OpenAI (GPT-4o)### Getting Started

- Converts scripts to audio using Azure Cognitive Services Text-to-Speech

- Implements fallback mechanisms for TTS failures1. **Review Specification**: Read `/specs/001-feature-podcast-generator/spec.md`

- Creates podcast episode metadata (title, description, duration)2. **Follow Implementation Plan**: See `/specs/001-feature-podcast-generator/plan.md`

- Uploads audio files to Azure Blob Storage3. **Execute Tasks**: Start with `/specs/001-feature-podcast-generator/tasks.md`



#### 4. Storage Manager (`api/src/services/StorageManager.ts`)## 📊 Status

- Manages Azure Blob Storage operations

- Handles audio file uploads with SAS token generation- ✅ **Specification Complete**: Feature requirements defined

- Provides CDN-enabled public URLs for audio files- ✅ **Architecture Designed**: Technical approach planned

- Manages blob lifecycle and cleanup- ✅ **Implementation Tasks**: 90 detailed tasks ready

- 🚧 **Implementation**: Ready to begin development

#### 5. RSS Feed Service (`api/src/services/RSSFeedService.ts`)

- Generates and maintains RSS 2.0 compliant podcast feed## 🤝 Contributing

- Manages episode metadata and ordering

- Provides podcast discovery informationThis project follows specification-driven development. Please review the specification documents before contributing.

- Handles feed caching and updates

## 📄 License

## API Endpoints

MIT License - see LICENSE file for details.

### Content Submission

#### `POST /api/webhook/share`
Submit content for podcast generation.

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "metadata": {
    "title": "Optional custom title",
    "source": "web|mobile|browser-extension"
  }
}
```

**Response:**
```json
{
  "submission_id": "uuid-string",
  "status": "processing",
  "estimated_completion": "2025-10-03T12:30:00Z",
  "rss_feed_url": "https://your-domain.com/feeds/public/rss.xml"
}
```

**Status Codes:**
- `202` - Accepted for processing
- `400` - Invalid request (missing URL, invalid format)
- `500` - Server error

### Feed Management

#### `GET /feeds/public/rss.xml`
Retrieve the public RSS feed with all podcast episodes.

**Response:** RSS 2.0 XML feed

**Query Parameters:**
- `limit` (optional) - Maximum number of episodes to return (default: 50)

#### `GET /api/feed-items/:id`
Retrieve a specific podcast episode by ID.

**Response:**
```json
{
  "id": "uuid-string",
  "title": "Episode Title",
  "description": "Episode description",
  "audioUrl": "https://cdn.url/audio.mp3",
  "duration": 300,
  "publishDate": "2025-10-03T12:00:00Z",
  "transcript": "Full episode transcript...",
  "metadata": {
    "sourceUrl": "https://example.com/article",
    "audioSize": 5242880
  }
}
```

#### `DELETE /api/feed-items/:id`
Delete a podcast episode (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Episode deleted successfully"
}
```

## Technology Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Azure Functions (HTTP triggers)
- **AI Services:**
  - Azure OpenAI (GPT-4o) - Content extraction and script generation
  - Azure Cognitive Services Speech - Text-to-Speech
  - ElevenLabs - Alternative TTS provider
- **Storage:** Azure Blob Storage with Azure CDN
- **Database:** Azure Table Storage (feed items, metadata)

## Setup & Configuration

### Prerequisites
- Node.js 18+ and npm
- Azure subscription with the following services:
  - Azure Functions
  - Azure Blob Storage
  - Azure OpenAI Service
  - Azure Cognitive Services (Speech)
  - Azure CDN

### Environment Variables

Create a `local.settings.json` file in the `api/` directory:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FUNCTIONS_EXTENSION_VERSION": "~4",
    "NODE_ENV": "development",
    
    "AZURE_OPENAI_ENDPOINT": "https://your-instance.cognitiveservices.azure.com/",
    "AZURE_OPENAI_API_KEY": "your-azure-openai-key",
    "AZURE_OPENAI_DEPLOYMENT_NAME": "gpt-4o",
    "AZURE_OPENAI_API_VERSION": "2024-04-01-preview",
    
    "AZURE_SPEECH_KEY": "your-azure-speech-key",
    "AZURE_SPEECH_REGION": "eastus2",
    "AZURE_SPEECH_VOICE": "en-US-AriaNeural",
    "AZURE_SPEECH_LANGUAGE": "en-US",
    
    "ELEVENLABS_API_KEY": "your-elevenlabs-key",
    
    "AZURE_STORAGE_CONNECTION_STRING": "your-storage-connection-string",
    "AZURE_STORAGE_CONTAINER_NAME": "podcast-audio",
    "CDN_BASE_URL": "https://your-cdn-endpoint.azurefd.net",
    
    "AZURE_SUBSCRIPTION_ID": "your-subscription-id",
    "AZURE_RESOURCE_GROUP_NAME": "your-resource-group",
    "CDN_PROFILE_NAME": "your-cdn-profile",
    "CDN_ENDPOINT_NAME": "your-cdn-endpoint"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### Local Development

```bash
# Install dependencies
cd api
npm install

# Start Azure Functions locally
npm start
```

The API will be available at `http://localhost:7071`

### Testing Content Submission

```bash
curl -X POST http://localhost:7071/api/webhook/share \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "metadata": {
      "source": "web"
    }
  }'
```

## Deployment

### Azure Functions Deployment

1. **Create Azure Resources:**
   ```bash
   az group create --name podcast-generator-rg --location eastus2
   az storage account create --name podcaststorage --resource-group podcast-generator-rg
   az functionapp create --name podcast-generator-api --resource-group podcast-generator-rg
   ```

2. **Configure Application Settings:**
   ```bash
   az functionapp config appsettings set --name podcast-generator-api \
     --resource-group podcast-generator-rg \
     --settings @appsettings.json
   ```

3. **Deploy Function App:**
   ```bash
   cd api
   func azure functionapp publish podcast-generator-api
   ```

### Azure Storage Configuration

1. Create a blob container named `podcast-audio` (or your configured name)
2. Enable public access for the container (or use SAS tokens)
3. Configure Azure CDN for the storage account for optimized content delivery

### Monitoring

- **Application Insights:** Automatically enabled for Azure Functions
- **Logs:** Available in Azure Portal under Function App > Monitor
- **Metrics:** Track invocations, duration, and errors

## Content Processing Pipeline

1. **Submission:** User submits URL via API
2. **Extraction:** Content extracted using Azure OpenAI
3. **Script Generation:** Azure OpenAI (GPT-4o) generates podcast script
4. **Audio Synthesis:** Azure Speech Services converts script to audio
5. **Storage:** Audio uploaded to Azure Blob Storage
6. **CDN Distribution:** Audio served via Azure CDN for optimal delivery
7. **Feed Update:** RSS feed updated with new episode
8. **Delivery:** Episode available via RSS feed URL

## Error Handling

The system implements comprehensive error handling:

- **Content Extraction Failures:** Retries with exponential backoff
- **TTS Failures:** Automatic fallback to ElevenLabs if Azure Speech fails
- **Storage Failures:** Logged and reported with detailed error messages
- **API Errors:** Proper HTTP status codes and error messages

## Future UI Integration

The API is designed to support a frontend UI with:
- Content submission form
- Episode management dashboard
- Feed configuration panel
- Analytics and monitoring

All endpoints return JSON and support CORS for browser-based clients.

## License

MIT

## Support

For issues or questions, please open an issue in the GitHub repository.
