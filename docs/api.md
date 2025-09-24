# Podcast Generator API Documentation

## Overview

The Podcast Generator API is a serverless Azure Functions application that converts various content types (URLs, YouTube videos, PDFs, documents) into podcast episodes. The API provides endpoints for content submission, episode management, RSS feed generation, and system monitoring.

## Base URL

```
https://your-function-app.azurewebsites.net/api
```

## Authentication

Most endpoints require an API key passed in the `X-API-Key` header:

```http
X-API-Key: your-api-key-here
```

## Content Types

The API supports the following content types:
- `url` - Web articles and blog posts
- `youtube` - YouTube videos
- `pdf` - PDF documents
- `document` - Other document formats

## API Endpoints

### Content Submission

#### Submit Content for Processing

**POST** `/api/content`

Submits content for podcast generation. This is the main entry point for creating new podcast episodes.

**Request Body:**
```json
{
  "content_url": "https://example.com/article",
  "content_type": "url",
  "user_note": "Optional note about this content"
}
```

**Request Parameters:**
- `content_url` (string, required) - URL of the content to process
- `content_type` (string, required) - Type of content (`url`, `youtube`, `pdf`, `document`)
- `user_note` (string, optional) - User's note about the content

**Response:**
```json
{
  "submission_id": "uuid",
  "status": "pending",
  "estimated_completion": "2023-01-01T10:05:00Z",
  "message": "Content submitted for processing"
}
```

**Status Codes:**
- `202` - Content accepted for processing
- `400` - Invalid request data
- `429` - Rate limit exceeded
- `500` - Internal server error

**Example:**
```bash
curl -X POST "https://your-app.azurewebsites.net/api/content" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/article",
    "content_type": "url",
    "user_note": "Great article about AI"
  }'
```

### Episode Management

#### List Episodes

**GET** `/api/feeds/{feed_slug}/episodes`

Retrieves a paginated list of podcast episodes.

**Path Parameters:**
- `feed_slug` (string, required) - The feed identifier

**Query Parameters:**
- `limit` (integer, optional) - Number of episodes to return (default: 20, max: 100)
- `offset` (integer, optional) - Number of episodes to skip (default: 0)

**Response:**
```json
{
  "episodes": [
    {
      "episode_id": "uuid",
      "title": "Episode Title",
      "description": "Episode description",
      "source_url": "https://example.com/article",
      "content_type": "url",
      "audio_url": "https://storage.azure.com/audio/episode.mp3",
      "audio_duration": 1800,
      "audio_size": 1024000,
      "pub_date": "2023-01-01T10:00:00Z",
      "created_at": "2023-01-01T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Status Codes:**
- `200` - Episodes retrieved successfully
- `404` - Feed not found or no episodes
- `400` - Invalid parameters

#### Get Episode Details

**GET** `/api/episodes/{episode_id}`

Retrieves detailed information about a specific episode.

**Path Parameters:**
- `episode_id` (string, required) - The episode identifier

**Response:**
```json
{
  "episode_id": "uuid",
  "title": "Episode Title",
  "description": "Episode description",
  "source_url": "https://example.com/article",
  "content_type": "url",
  "audio_url": "https://storage.azure.com/audio/episode.mp3",
  "audio_duration": 1800,
  "audio_size": 1024000,
  "transcript": "Full transcript text...",
  "dialogue_script": "Generated dialogue script...",
  "summary": "Episode summary...",
  "chapter_markers": [
    {
      "title": "Introduction",
      "start_time": 0,
      "end_time": 30
    }
  ],
  "pub_date": "2023-01-01T10:00:00Z",
  "created_at": "2023-01-01T09:00:00Z",
  "updated_at": "2023-01-01T10:00:00Z"
}
```

### RSS Feed

#### Get RSS Feed

**GET** `/api/feeds/{feed_slug}/rss.xml`

Generates and returns the RSS feed for podcast consumption.

**Path Parameters:**
- `feed_slug` (string, required) - The feed identifier

**Query Parameters:**
- `max_episodes` (integer, optional) - Maximum episodes to include (default: 100)
- `sort_order` (string, optional) - Sort order (`asc` or `desc`, default: `desc`)
- `nocache` (boolean, optional) - Bypass cache (default: false)

**Response:**
Returns a valid RSS 2.0 XML feed with iTunes namespace compliance.

**Headers:**
- `Content-Type: application/rss+xml`
- `Cache-Control: public, max-age=3600`
- `ETag: "feed-version-hash"`

**Status Codes:**
- `200` - RSS feed generated successfully
- `400` - Invalid feed slug
- `404` - Feed not found

### System Monitoring

#### Health Check

**GET** `/api/health`

Returns the current health status of the API.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": true,
    "storage": true,
    "tts": true,
    "ai": true
  }
}
```

**Status Codes:**
- `200` - System healthy
- `503` - System unhealthy

#### Status Check

**GET** `/api/status`

Returns detailed system status and metrics.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2023-01-01T10:00:00Z",
  "uptime": 86400,
  "metrics": {
    "total_episodes": 150,
    "total_submissions": 200,
    "processing_jobs": 5,
    "failed_jobs": 2
  },
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 45
    },
    "storage": {
      "status": "healthy",
      "used_space": "2.5GB"
    }
  }
}
```

### Content Processing

#### TTS Generation

**POST** `/api/tts/generate`

Generates text-to-speech audio for content.

**Request Body:**
```json
{
  "text": "Text to convert to speech",
  "voice_id": "voice-uuid",
  "provider": "elevenlabs"
}
```

**Response:**
```json
{
  "audio_url": "https://storage.azure.com/audio/generated.mp3",
  "duration": 120,
  "file_size": 2048000,
  "voice_used": "voice-name"
}
```

#### YouTube Extraction

**POST** `/api/youtube/extract`

Extracts content from YouTube videos.

**Request Body:**
```json
{
  "video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "extract_transcript": true
}
```

**Response:**
```json
{
  "title": "Video Title",
  "description": "Video description",
  "transcript": "Video transcript...",
  "duration": 600,
  "channel": "Channel Name"
}
```

### Storage Management

#### Storage Statistics

**GET** `/api/storage/stats`

Returns storage usage statistics.

**Response:**
```json
{
  "total_size": "5.2GB",
  "episode_count": 150,
  "oldest_episode": "2023-01-01T00:00:00Z",
  "newest_episode": "2023-01-15T12:00:00Z",
  "retention_policy": {
    "max_age_days": 90,
    "cleanup_enabled": true
  }
}
```

#### Cleanup Storage

**POST** `/api/storage/cleanup`

Triggers storage cleanup based on retention policies.

**Response:**
```json
{
  "cleaned_files": 25,
  "freed_space": "1.2GB",
  "remaining_files": 125
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Additional error details",
  "timestamp": "2023-01-01T10:00:00Z",
  "request_id": "uuid"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `CONTENT_NOT_FOUND` - Requested content not found
- `PROCESSING_ERROR` - Content processing failed
- `STORAGE_ERROR` - Storage operation failed
- `TTS_ERROR` - Text-to-speech generation failed
- `INTERNAL_ERROR` - Internal server error

### Rate Limiting

- **Content Submission**: 10 requests per minute per API key
- **RSS Feed**: 100 requests per minute per IP
- **Other Endpoints**: 60 requests per minute per API key

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Request limit per window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Time when the rate limit resets

## Webhooks

### Content Processing Complete

**POST** `/api/webhooks/processing-complete`

Webhook endpoint for processing completion notifications.

**Request Body:**
```json
{
  "submission_id": "uuid",
  "status": "completed",
  "episode_id": "uuid",
  "audio_url": "https://storage.azure.com/audio/episode.mp3",
  "processing_time": 300
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const apiKey = 'your-api-key';
const baseUrl = 'https://your-app.azurewebsites.net/api';

// Submit content
async function submitContent(contentUrl, contentType) {
  const response = await fetch(`${baseUrl}/content`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content_url: contentUrl,
      content_type: contentType
    })
  });
  
  return await response.json();
}

// Get episodes
async function getEpisodes(feedSlug, limit = 20, offset = 0) {
  const response = await fetch(
    `${baseUrl}/feeds/${feedSlug}/episodes?limit=${limit}&offset=${offset}`
  );
  
  return await response.json();
}
```

### Python

```python
import requests

API_KEY = 'your-api-key'
BASE_URL = 'https://your-app.azurewebsites.net/api'

def submit_content(content_url, content_type):
    response = requests.post(
        f'{BASE_URL}/content',
        headers={'X-API-Key': API_KEY},
        json={
            'content_url': content_url,
            'content_type': content_type
        }
    )
    return response.json()

def get_episodes(feed_slug, limit=20, offset=0):
    response = requests.get(
        f'{BASE_URL}/feeds/{feed_slug}/episodes',
        params={'limit': limit, 'offset': offset}
    )
    return response.json()
```

## Changelog

### Version 1.0.0
- Initial API release
- Content submission and processing
- Episode management
- RSS feed generation
- System monitoring
- Storage management

## Support

For API support and questions:
- Check the health endpoint for system status
- Review error responses for troubleshooting
- Monitor rate limits and retry accordingly
- Use appropriate content types for your content

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Content Submission | 10 requests | 1 minute |
| RSS Feed | 100 requests | 1 minute |
| Episodes List | 60 requests | 1 minute |
| Health Check | 300 requests | 1 minute |
| Other Endpoints | 60 requests | 1 minute |
