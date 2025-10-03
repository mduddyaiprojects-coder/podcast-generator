# Quickstart: Validate Feature 002

Use this checklist to validate end-to-end:

## Prerequisites

Before starting validation:
- Ensure the API is deployed and running
- Have API key ready (if authentication is enabled)
- Have a podcast feed URL available
- Prepare a test image that meets Apple Podcasts requirements:
  - Square aspect ratio (1:1)
  - Dimensions: 1400×1400 to 3000×3000 pixels
  - Format: JPEG or PNG
  - Color space: RGB
  - Hosted on HTTPS URL

## 1. Branding Update

### 1.1 Update Title
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"title": "My Updated Podcast Title"}'
```

**Expected Response:**
```json
{
  "title": "My Updated Podcast Title",
  "imageUrl": "https://...",
  "updatedAt": "2025-09-30T12:34:56.789Z"
}
```

**Verify:**
- ✅ Response status is 200
- ✅ `updatedAt` timestamp is recent
- ✅ Title in response matches what was sent

### 1.2 Update Image
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"imageUrl": "https://cdn.example.com/podcast-art.jpg"}'
```

**Verify:**
- ✅ Response status is 200
- ✅ Image URL in response matches what was sent
- ✅ `updatedAt` timestamp is updated

### 1.3 Update Both Title and Image
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "title": "My Complete Branding",
    "imageUrl": "https://cdn.example.com/new-art.jpg"
  }'
```

### 1.4 Verify RSS Feed Reflects Changes
```bash
curl "https://your-app.azurewebsites.net/api/feeds/{feed_slug}/rss.xml"
```

**Verify:**
- ✅ RSS `<title>` element contains updated title
- ✅ RSS `<itunes:image href="...">` contains updated image URL
- ✅ Changes appear within a few minutes (cached feeds may take longer)

### 1.5 Verify in Podcast Apps
- ✅ Within 24 hours, confirm podcast app shows updated title/image
- ✅ Future episodes use updated metadata/thumbnail defaults

### 1.6 Test Validation Errors

**Missing Content-Type:**
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "X-API-Key: your-api-key" \
  -d '{"title": "Test"}'
```
Expected: 400 error with message about Content-Type

**Invalid URL (HTTP instead of HTTPS):**
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"imageUrl": "http://insecure.com/image.jpg"}'
```
Expected: 400 error about HTTPS requirement

**Private IP (SSRF Protection):**
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"imageUrl": "https://192.168.1.1/image.jpg"}'
```
Expected: 400 error about private network addresses

**Invalid File Format:**
```bash
curl -X PUT "https://your-app.azurewebsites.net/api/branding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"imageUrl": "https://example.com/image.gif"}'
```
Expected: 400 error about file format

## 2. Health Checks

### 2.1 Heartbeat Check
```bash
curl "https://your-app.azurewebsites.net/api/heartbeat"
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-30T12:34:56.789Z"
}
```

**Verify:**
- ✅ Response status is 200 (even if status field is FAILED)
- ✅ `status` field is present (OK/DEGRADED/FAILED)
- ✅ `timestamp` is a valid ISO 8601 date
- ✅ `timestamp` is recent (within last minute)
- ✅ Response time is < 1 second

### 2.2 YouTube Health Check
```bash
curl "https://your-app.azurewebsites.net/api/health/youtube"
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "YouTube ingestion operational",
  "lastSuccessAt": "2025-09-30T12:30:00.000Z"
}
```

**Verify:**
- ✅ Response status is 200
- ✅ `status` field is present (OK/DEGRADED/FAILED)
- ✅ `message` field provides human-readable description
- ✅ `lastSuccessAt` is a valid ISO 8601 timestamp
- ✅ If status is OK, `lastSuccessAt` should be recent

### 2.3 Document Ingestion Health Check
```bash
curl "https://your-app.azurewebsites.net/api/health/doc-ingest"
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Document ingestion operational",
  "lastSuccessAt": "2025-09-30T12:30:00.000Z"
}
```

**Verify:**
- ✅ Response status is 200
- ✅ `status` field is present (OK/DEGRADED/FAILED)
- ✅ `message` field provides human-readable description
- ✅ `lastSuccessAt` is a valid ISO 8601 timestamp

### 2.4 Monitor Health Over Time
Set up periodic health checks to monitor system stability:
```bash
# Check every 60 seconds for 5 minutes
for i in {1..5}; do
  echo "Check $i:"
  curl -s "https://your-app.azurewebsites.net/api/heartbeat" | jq '.status'
  curl -s "https://your-app.azurewebsites.net/api/health/youtube" | jq '.status'
  curl -s "https://your-app.azurewebsites.net/api/health/doc-ingest" | jq '.status'
  echo "---"
  sleep 60
done
```

## 3. iOS Shortcut E2E (Dry-Run)

### 3.1 Install Shortcut
- Download the Shortcut from `docs/SendToPodcastGenerator.shortcut`
- Import into iOS Shortcuts app

### 3.2 Run Dry-Run Validation
- Open the Shortcut
- Select "Dry Run" mode (if available)
- Run the validation flow
- Shortcut should check heartbeat endpoint

**Verify:**
- ✅ Shortcut completes without errors
- ✅ Local validation passes
- ✅ Heartbeat shows OK status
- ✅ No content is submitted to server
- ✅ No public artifacts are created

### 3.3 Check Logs (Server-Side)
Review winston logs for heartbeat requests from iOS Shortcut:
```bash
# Check Azure Function logs or Application Insights
az monitor app-insights query \
  --app "your-app-insights" \
  --analytics-query "traces | where message contains 'Heartbeat'"
```

**Verify:**
- ✅ Heartbeat requests logged with requestId
- ✅ Response times tracked
- ✅ No errors in logs

## 4. Script & Voice Quality

### 4.1 Generate Test Episode
Submit content for podcast generation:
```bash
curl -X POST "https://your-app.azurewebsites.net/api/content" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "content_url": "https://example.com/test-article",
    "content_type": "url",
    "user_note": "Test script quality"
  }'
```

### 4.2 Verify Script Structure
Once episode is generated, retrieve it and check the script:
```bash
curl "https://your-app.azurewebsites.net/api/episodes/{episode_id}"
```

**Verify Script Quality:**
- ✅ Clear structure present:
  - Hook/intro
  - 3-7 key points with transitions
  - Recap section
  - Outro
- ✅ Tone is "Energetic, conversational, and warm"
- ✅ Target duration: 12-20 minutes
- ✅ No abrupt transitions
- ✅ Consistent voice throughout

### 4.3 Voice Selection and Preview
(Note: Voice selection API endpoints not yet implemented)

**Expected in future:**
- View available voice styles
- Preview voice samples
- Select preferred voice
- Verify fallback behavior when voice unavailable

## 5. Logging and Monitoring

### 5.1 Check Structured Logs
All endpoints should log with structured format:

**Example log entry:**
```json
{
  "level": "info",
  "message": "Branding updated successfully",
  "requestId": "abc-123-def",
  "timestamp": "2025-09-30T12:34:56.789Z",
  "responseTime": 45,
  "changes": {
    "titleChanged": true,
    "imageChanged": false
  }
}
```

**Verify:**
- ✅ All requests have unique `requestId`
- ✅ Response times are logged
- ✅ Errors include stack traces
- ✅ Branding changes include audit details

### 5.2 Performance Monitoring
**Target Performance:**
- Heartbeat: < 1s p95
- Health checks: < 1s p95
- Branding updates: < 2s p95

**Check response times:**
```bash
time curl -s "https://your-app.azurewebsites.net/api/heartbeat" > /dev/null
```

## 6. Security Validation

### 6.1 Content-Type Enforcement
- ✅ Requests without `Content-Type: application/json` rejected
- ✅ Appropriate error messages returned

### 6.2 URL Security
- ✅ HTTP URLs rejected (HTTPS only)
- ✅ Private IPs blocked (localhost, 192.168.x.x, 10.x.x.x, etc.)
- ✅ Data URLs blocked (data:)
- ✅ JavaScript pseudo-protocols blocked (javascript:)

### 6.3 Input Validation
- ✅ Title length limits enforced (1-500 chars)
- ✅ URL length limits enforced (max 2048 chars)
- ✅ File format validation (.jpg, .jpeg, .png only)
- ✅ At least one field required in branding updates

## 7. End-to-End Workflow

### Complete Flow Test
1. Update branding with new title and image
2. Check heartbeat - should be OK
3. Check YouTube health - should be OK
4. Check document ingestion health - should be OK
5. Verify RSS feed reflects branding changes
6. Generate a new episode
7. Verify episode uses new branding
8. Check logs for audit trail

**Success Criteria:**
- ✅ All health checks return OK
- ✅ Branding propagates to RSS feed
- ✅ New episodes use updated branding
- ✅ All operations logged with audit details
- ✅ No errors in system logs
- ✅ Response times meet performance targets

## Troubleshooting

### Branding not appearing in RSS
- Check cache headers on RSS endpoint
- Wait a few minutes for cache to expire
- Use `?nocache=true` query parameter if available
- Verify `updatedAt` timestamp in branding response

### Health checks showing DEGRADED or FAILED
- Check Azure Function app configuration
- Verify environment variables are set
- Check external service connectivity (YouTube API, etc.)
- Review winston logs for error details

### iOS Shortcut failing
- Verify heartbeat endpoint is accessible
- Check API key configuration (if required)
- Ensure device has internet connectivity
- Review Shortcut error messages

### Security validation blocking legitimate URLs
- Ensure image URL uses HTTPS
- Verify URL is publicly accessible (not behind VPN)
- Check file extension is .jpg, .jpeg, or .png
- Ensure URL length is under 2048 characters

## Known Limitations

1. **Image Validation**: Currently validates URL format only. Actual image dimensions, color space, and aspect ratio are not verified. Full validation requires downloading and inspecting the image.

2. **Voice Selection**: Voice catalog, previews, and fallback behavior not yet implemented (planned for future phases).

3. **Feed Propagation Delay**: RSS feeds may be cached by CDNs or podcast apps. Full propagation to all apps can take up to 24 hours.

4. **Concurrent Updates**: Last-write-wins policy means rapid concurrent updates may have race conditions. Consider implementing optimistic locking if this becomes an issue.

5. **Rate Limiting**: Current implementation does not include rate limiting. Monitor usage and add rate limiting if needed.

## Next Steps

After validating Feature 002:
1. Configure monitoring alerts for health check failures
2. Set up dashboard for tracking response times
3. Implement image dimension validation
4. Add voice selection and preview endpoints
5. Configure rate limiting for production use
6. Set up automated health check monitoring
