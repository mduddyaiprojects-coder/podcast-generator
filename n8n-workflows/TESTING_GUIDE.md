# n8n Workflow Testing Guide

This guide provides comprehensive testing procedures for all n8n workflows in the Podcast Generator system.

## 🧪 Testing Overview

### Test Categories
1. **Unit Tests** - Individual workflow validation
2. **Integration Tests** - End-to-end workflow testing
3. **Load Tests** - Performance under load
4. **Error Tests** - Error handling validation
5. **Security Tests** - Input validation and security

## 🚀 Pre-Testing Setup

### 1. Environment Preparation

Ensure your test environment is properly configured:

```bash
# Set test environment variables
export N8N_ENV=test
export PODCAST_API_BASE_URL=https://your-test-api.azurewebsites.net/api
export WEBHOOK_BASE_URL=https://your-test-n8n.azurewebsites.net/webhook

# Create test data directory
mkdir -p test-data
```

### 2. Test Data Preparation

Create test data files:

```bash
# Create test data directory
mkdir -p test-data/samples
```

## 📋 Test Cases

### 1. Content Processing Workflow Tests

#### Test Case 1.1: Valid URL Processing
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/process-content \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/test-article",
    "content_type": "url",
    "submission_id": "test-content-001",
    "metadata": {
      "source": "test",
      "priority": "normal"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Content processing initiated via n8n",
  "submission_id": "test-content-001",
  "status": "processing",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 1.2: Invalid Input
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/process-content \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "",
    "content_type": "invalid"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing required fields: content_url and content_type",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 1.3: Missing Fields
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/process-content \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing required fields: content_url and content_type",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

### 2. YouTube Extraction Workflow Tests

#### Test Case 2.1: Valid YouTube URL
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/extract-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "submission_id": "test-youtube-001",
    "metadata": {
      "extract_audio": true,
      "quality": "high"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "YouTube extraction initiated via n8n",
  "submission_id": "test-youtube-001",
  "status": "processing",
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 2.2: Invalid YouTube URL
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/extract-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://example.com/not-youtube",
    "submission_id": "test-youtube-002"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid YouTube URL format",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

### 3. Document Processing Workflow Tests

#### Test Case 3.1: Valid Document URL
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/process-document \
  -H "Content-Type: application/json" \
  -d '{
    "document_url": "https://example.com/test-document.pdf",
    "submission_id": "test-document-001",
    "metadata": {
      "extract_text": true,
      "preserve_formatting": false
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Document processing initiated via n8n",
  "submission_id": "test-document-001",
  "status": "processing",
  "document_url": "https://example.com/test-document.pdf",
  "file_type": "pdf",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 3.2: Unsupported Document Type
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/process-document \
  -H "Content-Type: application/json" \
  -d '{
    "document_url": "https://example.com/test-file.xyz",
    "submission_id": "test-document-002"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Document processing initiated via n8n",
  "submission_id": "test-document-002",
  "status": "processing",
  "document_url": "https://example.com/test-file.xyz",
  "file_type": "xyz",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

### 4. TTS Generation Workflow Tests

#### Test Case 4.1: Valid Text Content
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/generate-tts \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "test-tts-001",
    "text_content": "Hello, this is a test of the text-to-speech system. It should work correctly.",
    "voice_settings": {
      "voice_id": "default",
      "speed": 1.0,
      "pitch": 1.0
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "TTS generation initiated via n8n",
  "submission_id": "test-tts-001",
  "status": "processing",
  "text_length": 95,
  "estimated_duration": 32,
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 4.2: Empty Text Content
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/generate-tts \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "test-tts-002",
    "text_content": ""
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing or empty text_content field",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 4.3: Text Too Long
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/generate-tts \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "test-tts-003",
    "text_content": "' + 'A'.repeat(50001) + '"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Text content too long. Maximum 50,000 characters allowed.",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

### 5. Error Handling Workflow Tests

#### Test Case 5.1: Valid Error Report
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/handle-error \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "test-error-001",
    "error_type": "processing_error",
    "error_message": "Failed to extract content from URL",
    "context": {
      "step": "content_extraction",
      "url": "https://example.com"
    },
    "severity": "medium"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Error handled successfully",
  "submission_id": "test-error-001",
  "error_type": "processing_error",
  "severity": "medium",
  "logged": true,
  "retry_prepared": false,
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

#### Test Case 5.2: Missing Required Fields
```bash
curl -X POST https://your-test-n8n.azurewebsites.net/webhook/handle-error \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "test-error-002",
    "error_type": "processing_error"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Missing required fields: submission_id, error_type, error_message",
  "timestamp": "2024-12-19T15:30:00.000Z"
}
```

## 🔄 Automated Testing Scripts

### 1. Test Runner Script

Create `scripts/run-tests.sh`:

```bash
#!/bin/bash

# Test configuration
N8N_BASE_URL="https://your-test-n8n.azurewebsites.net/webhook"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Test functions
run_test() {
    local test_name="$1"
    local webhook_path="$2"
    local payload="$3"
    local expected_status="$4"
    
    echo "Running test: $test_name"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$N8N_BASE_URL/$webhook_path" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    # Save test result
    echo "Test: $test_name" >> "$TEST_RESULTS_DIR/test_results_$TIMESTAMP.log"
    echo "HTTP Code: $http_code" >> "$TEST_RESULTS_DIR/test_results_$TIMESTAMP.log"
    echo "Response: $body" >> "$TEST_RESULTS_DIR/test_results_$TIMESTAMP.log"
    echo "---" >> "$TEST_RESULTS_DIR/test_results_$TIMESTAMP.log"
    
    # Check if test passed
    if [ "$http_code" = "$expected_status" ]; then
        echo "✅ PASS: $test_name"
        return 0
    else
        echo "❌ FAIL: $test_name (Expected: $expected_status, Got: $http_code)"
        return 1
    fi
}

# Run all tests
echo "Starting n8n workflow tests..."

# Content Processing Tests
run_test "Content Processing - Valid URL" "process-content" \
    '{"content_url":"https://example.com/test","content_type":"url","submission_id":"test-001"}' \
    "200"

run_test "Content Processing - Invalid Input" "process-content" \
    '{"content_url":"","content_type":"invalid"}' \
    "500"

# YouTube Extraction Tests
run_test "YouTube Extraction - Valid URL" "extract-youtube" \
    '{"youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","submission_id":"yt-test-001"}' \
    "200"

run_test "YouTube Extraction - Invalid URL" "extract-youtube" \
    '{"youtube_url":"https://example.com/not-youtube","submission_id":"yt-test-002"}' \
    "500"

# Document Processing Tests
run_test "Document Processing - Valid URL" "process-document" \
    '{"document_url":"https://example.com/test.pdf","submission_id":"doc-test-001"}' \
    "200"

# TTS Generation Tests
run_test "TTS Generation - Valid Text" "generate-tts" \
    '{"submission_id":"tts-test-001","text_content":"Hello, this is a test."}' \
    "200"

run_test "TTS Generation - Empty Text" "generate-tts" \
    '{"submission_id":"tts-test-002","text_content":""}' \
    "500"

# Error Handling Tests
run_test "Error Handling - Valid Error" "handle-error" \
    '{"submission_id":"error-test-001","error_type":"test_error","error_message":"Test error message"}' \
    "200"

run_test "Error Handling - Missing Fields" "handle-error" \
    '{"submission_id":"error-test-002","error_type":"test_error"}' \
    "500"

echo "Test run completed. Results saved to $TEST_RESULTS_DIR/test_results_$TIMESTAMP.log"
```

### 2. Load Testing Script

Create `scripts/load-test.sh`:

```bash
#!/bin/bash

# Load test configuration
N8N_BASE_URL="https://your-test-n8n.azurewebsites.net/webhook"
CONCURRENT_USERS=10
REQUESTS_PER_USER=100
TEST_DURATION=300  # 5 minutes

echo "Starting load test with $CONCURRENT_USERS concurrent users..."

# Function to simulate user load
simulate_user() {
    local user_id="$1"
    local requests="$2"
    
    for i in $(seq 1 $requests); do
        # Randomly select a workflow to test
        case $((RANDOM % 4)) in
            0)
                curl -s -X POST "$N8N_BASE_URL/process-content" \
                    -H "Content-Type: application/json" \
                    -d "{\"content_url\":\"https://example.com/test-$user_id-$i\",\"content_type\":\"url\",\"submission_id\":\"load-test-$user_id-$i\"}" > /dev/null
                ;;
            1)
                curl -s -X POST "$N8N_BASE_URL/extract-youtube" \
                    -H "Content-Type: application/json" \
                    -d "{\"youtube_url\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\",\"submission_id\":\"load-test-$user_id-$i\"}" > /dev/null
                ;;
            2)
                curl -s -X POST "$N8N_BASE_URL/process-document" \
                    -H "Content-Type: application/json" \
                    -d "{\"document_url\":\"https://example.com/test-$user_id-$i.pdf\",\"submission_id\":\"load-test-$user_id-$i\"}" > /dev/null
                ;;
            3)
                curl -s -X POST "$N8N_BASE_URL/generate-tts" \
                    -H "Content-Type: application/json" \
                    -d "{\"submission_id\":\"load-test-$user_id-$i\",\"text_content\":\"Load test message $user_id-$i\"}" > /dev/null
                ;;
        esac
        
        # Small delay between requests
        sleep 0.1
    done
}

# Start load test
start_time=$(date +%s)
end_time=$((start_time + TEST_DURATION))

# Launch concurrent users
for user in $(seq 1 $CONCURRENT_USERS); do
    simulate_user $user $REQUESTS_PER_USER &
done

# Wait for test duration
while [ $(date +%s) -lt $end_time ]; do
    sleep 1
done

echo "Load test completed. Check n8n execution logs for performance metrics."
```

## 📊 Test Results Analysis

### 1. Success Rate Calculation

```bash
# Calculate success rate from test results
grep "HTTP Code: 200" test-results/test_results_*.log | wc -l
grep "HTTP Code:" test-results/test_results_*.log | wc -l
```

### 2. Performance Metrics

```bash
# Extract response times from logs
grep "Response time:" test-results/test_results_*.log | awk '{print $3}' | sort -n
```

### 3. Error Analysis

```bash
# Count error types
grep "error" test-results/test_results_*.log | grep -o '"error":"[^"]*"' | sort | uniq -c
```

## 🐛 Troubleshooting Test Failures

### Common Issues and Solutions

1. **Connection Refused**
   - Check if n8n instance is running
   - Verify webhook URLs are correct
   - Check firewall settings

2. **Timeout Errors**
   - Increase timeout values in workflows
   - Check Azure Functions API performance
   - Verify network connectivity

3. **Authentication Errors**
   - Check API keys and credentials
   - Verify environment variables
   - Test API endpoints directly

4. **Validation Errors**
   - Review input data format
   - Check required field validation
   - Verify data types

### Debug Commands

```bash
# Check n8n status
curl -X GET https://your-test-n8n.azurewebsites.net/api/v1/health

# Check workflow executions
curl -X GET https://your-test-n8n.azurewebsites.net/api/v1/executions

# Check specific workflow
curl -X GET https://your-test-n8n.azurewebsites.net/api/v1/workflows/{workflow-id}
```

## 📈 Continuous Testing

### 1. CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test-n8n-workflows.yml
name: Test n8n Workflows

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  push:
    branches: [main]

jobs:
  test-workflows:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run n8n workflow tests
        run: |
          chmod +x scripts/run-tests.sh
          ./scripts/run-tests.sh
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

### 2. Monitoring Integration

Set up alerts for test failures:

```bash
# Alert on test failures
if [ $(grep "FAIL" test-results/test_results_*.log | wc -l) -gt 0 ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"❌ n8n workflow tests failed. Check test results."}'
fi
```

This comprehensive testing guide ensures your n8n workflows are reliable and performant in the Podcast Generator system.

