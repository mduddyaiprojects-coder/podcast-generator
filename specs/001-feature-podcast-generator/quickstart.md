# Quickstart: Podcast Generator

**Feature**: 001-feature-podcast-generator  
**Date**: 2024-12-19  
**Purpose**: Validate the complete user journey from content submission to podcast episode

## Prerequisites

- iOS device with Share Sheet capability
- Podcast app (Apple Podcasts, Overcast, Spotify, etc.)
- Valid content URLs or documents

## User Journey Validation

### Scenario 1: Web Article to Podcast

**Objective**: Convert a web article into a podcast episode

**Steps**:
1. **Find Content**: Browse to an interesting article (e.g., tech blog post)
2. **Share Content**: 
   - Tap "Share" button in Safari/Chrome
   - Select "Send to Podcast Generator" from share sheet
   - Add optional note: "Great article about AI trends"
3. **Submit Content**:
   - Verify content URL is detected
   - Confirm content type is "url"
   - Submit the request
4. **Monitor Progress**:
   - Check processing status via API
   - Verify status updates: pending → processing → completed
   - Confirm 15-minute processing time limit
5. **Access Podcast**:
   - Receive RSS feed URL
   - Subscribe to feed in podcast app
   - Download and play the generated episode
6. **Validate Episode**:
   - Episode title is engaging and relevant
   - Description matches source content
   - Audio quality is clear and natural
   - Duration is under 15 minutes
   - Episode appears in podcast app

**Expected Results**:
- ✅ Content submitted successfully
- ✅ Processing completes within 15 minutes
- ✅ Episode generated with high quality
- ✅ RSS feed accessible and valid
- ✅ Episode plays in podcast app

### Scenario 2: YouTube Video to Podcast

**Objective**: Convert a YouTube video into a podcast episode

**Steps**:
1. **Find Video**: Open YouTube app, find educational video
2. **Share Video**:
   - Tap "Share" button on video
   - Select "Send to Podcast Generator"
   - Add note: "Interesting tutorial about React"
3. **Submit Content**:
   - Verify YouTube URL is detected
   - Confirm content type is "youtube"
   - Submit the request
4. **Monitor Processing**:
   - Check status updates
   - Verify video transcript extraction
   - Confirm dialogue generation
5. **Access Podcast**:
   - Subscribe to RSS feed
   - Play generated episode
6. **Validate Episode**:
   - Episode discusses video content
   - Key points from video are covered
   - Natural conversational flow
   - Appropriate length for content

**Expected Results**:
- ✅ YouTube video processed successfully
- ✅ Transcript extracted and converted
- ✅ Episode covers video content
- ✅ Audio quality is good
- ✅ Episode integrates with podcast app

### Scenario 3: PDF Document to Podcast

**Objective**: Convert a PDF document into a podcast episode

**Steps**:
1. **Find Document**: Access PDF file (e.g., research paper, report)
2. **Share Document**:
   - Use file sharing in iOS
   - Select "Send to Podcast Generator"
   - Add note: "Important research findings"
3. **Submit Content**:
   - Verify PDF file is detected
   - Confirm content type is "pdf"
   - Submit the request
4. **Monitor Processing**:
   - Check status updates
   - Verify text extraction from PDF
   - Confirm content processing
5. **Access Podcast**:
   - Subscribe to RSS feed
   - Play generated episode
6. **Validate Episode**:
   - Episode discusses document content
   - Key findings are highlighted
   - Professional tone maintained
   - Appropriate length

**Expected Results**:
- ✅ PDF document processed successfully
- ✅ Text extracted and converted
- ✅ Episode covers document content
- ✅ Professional quality maintained
- ✅ Episode accessible via podcast app

## API Validation

### Content Submission API

**Endpoint**: `POST /api/content`

**Test Cases**:
1. **Valid URL Submission**:
   ```bash
   curl -X POST https://podcast-generator.azurewebsites.net/api/content \
     -H "Content-Type: application/json" \
     -d '{
       "content_url": "https://example.com/article",
       "content_type": "url",
       "user_note": "Test article"
     }'
   ```
   **Expected**: 202 Accepted with submission_id

2. **Invalid URL**:
   ```bash
   curl -X POST https://podcast-generator.azurewebsites.net/api/content \
     -H "Content-Type: application/json" \
     -d '{
       "content_url": "not-a-url",
       "content_type": "url"
     }'
   ```
   **Expected**: 400 Bad Request with error details

3. **Rate Limit Test**:
   - Submit 11 requests rapidly
   - **Expected**: 429 Too Many Requests on 11th request

### Status Check API

**Endpoint**: `GET /api/content/{submission_id}/status`

**Test Cases**:
1. **Valid Submission ID**:
   ```bash
   curl https://podcast-generator.azurewebsites.net/api/content/123e4567-e89b-12d3-a456-426614174000/status
   ```
   **Expected**: 200 OK with status information

2. **Invalid Submission ID**:
   ```bash
   curl https://podcast-generator.azurewebsites.net/api/content/invalid-id/status
   ```
   **Expected**: 404 Not Found

### RSS Feed API

**Endpoint**: `GET /api/feeds/{feed_slug}/rss.xml`

**Test Cases**:
1. **Valid Feed**:
   ```bash
   curl https://podcast-generator.azurewebsites.net/api/feeds/abc123/rss.xml
   ```
   **Expected**: 200 OK with valid RSS XML

2. **Invalid Feed**:
   ```bash
   curl https://podcast-generator.azurewebsites.net/api/feeds/invalid/rss.xml
   ```
   **Expected**: 404 Not Found

3. **RSS Validation**:
   - Validate RSS XML against RSS 2.0 schema
   - Check iTunes namespace compliance
   - Verify enclosure URLs are accessible
   - **Expected**: Valid RSS feed

## Performance Validation

### Processing Time
- **Target**: 15 minutes maximum
- **Test**: Submit various content types and measure processing time
- **Expected**: All content processes within 15 minutes

### Concurrent Processing
- **Target**: 10 simultaneous jobs
- **Test**: Submit 10 content items simultaneously
- **Expected**: All jobs process without errors

### Audio Quality
- **Target**: Clear, natural speech
- **Test**: Listen to generated episodes
- **Expected**: High-quality audio with natural intonation

### RSS Feed Performance
- **Target**: < 2 seconds response time
- **Test**: Load RSS feed multiple times
- **Expected**: Fast, consistent response times

## Error Handling Validation

### Content Extraction Failures
1. **Invalid URL**: Submit non-existent URL
   - **Expected**: Clear error message, graceful failure

2. **Unsupported Content**: Submit unsupported file type
   - **Expected**: Error message with supported types

3. **Access Denied**: Submit URL requiring authentication
   - **Expected**: Error message about access issues

### TTS Failures
1. **ElevenLabs API Error**: Simulate API failure
   - **Expected**: Fallback to Azure TTS

2. **Audio Generation Failure**: Simulate processing error
   - **Expected**: Error notification, retry attempt

### Storage Failures
1. **Blob Storage Error**: Simulate storage failure
   - **Expected**: Retry logic, error notification

2. **CDN Issues**: Simulate CDN problems
   - **Expected**: Fallback to direct blob access

## Security Validation

### Input Validation
1. **Malicious URLs**: Submit suspicious URLs
   - **Expected**: Rejected with appropriate error

2. **Large Content**: Submit very large files
   - **Expected**: Rejected based on size limits

3. **Invalid JSON**: Submit malformed requests
   - **Expected**: 400 Bad Request with validation errors

### Data Privacy
1. **Content Retention**: Verify 90-day deletion
   - **Expected**: Old content automatically removed

2. **Anonymous Access**: Verify no user data collection
   - **Expected**: No personal information stored

## Integration Validation

### iOS Share Sheet
1. **Share from Safari**: Test article sharing
   - **Expected**: Seamless integration

2. **Share from Chrome**: Test cross-browser compatibility
   - **Expected**: Consistent experience

3. **Share from Files**: Test document sharing
   - **Expected**: File type detection works

### Podcast Apps
1. **Apple Podcasts**: Subscribe to RSS feed
   - **Expected**: Episodes appear and play

2. **Overcast**: Test with different podcast app
   - **Expected**: Compatible RSS feed

3. **Spotify**: Test with Spotify podcast support
   - **Expected**: Episodes accessible

## Success Criteria

### Functional Requirements
- ✅ All content types supported (URL, YouTube, PDF, Document)
- ✅ 15-minute processing time limit
- ✅ 90-day retention policy
- ✅ Anonymous access
- ✅ RSS-compliant feeds
- ✅ iOS Share Sheet integration

### Non-Functional Requirements
- ✅ 10 concurrent processing jobs
- ✅ High-quality audio output
- ✅ Reliable error handling
- ✅ Fast API responses
- ✅ Secure data handling

### User Experience
- ✅ Intuitive sharing process
- ✅ Clear status updates
- ✅ Seamless podcast integration
- ✅ Professional audio quality
- ✅ Engaging episode content

## Troubleshooting

### Common Issues
1. **Processing Stuck**: Check n8n workflow status
2. **Audio Quality Issues**: Verify ElevenLabs API key
3. **RSS Feed Not Loading**: Check CDN configuration
4. **iOS Share Sheet Not Appearing**: Verify extension installation

### Debug Steps
1. Check Azure Functions logs
2. Verify n8n workflow execution
3. Test API endpoints directly
4. Validate RSS feed XML
5. Check iOS Share Sheet configuration

This quickstart validates the complete podcast generator functionality and ensures all requirements are met.
