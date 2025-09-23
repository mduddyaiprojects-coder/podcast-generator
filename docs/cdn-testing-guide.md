# CDN Testing Guide

This guide explains how to test the Azure CDN implementation for the Podcast Generator application at different levels, from local development to production deployment.

## Testing Levels

### 1. 🚀 Quick Local Test (No Azure Required)

**Purpose**: Immediate validation of CDN logic and integration

**Command**:
```bash
node scripts/quick-cdn-test.js
```

**What it tests**:
- ✅ CDN service basic functionality
- ✅ Storage + CDN integration
- ✅ URL generation with CDN
- ✅ Cache behavior simulation
- ✅ Error handling and fallback
- ✅ Performance simulation

**Expected Output**:
```
🚀 Starting Quick CDN Test Suite

🧪 Testing CDN Service...
✅ Endpoint URL: https://mock-cdn.test.com
✅ First delivery: https://mock-cdn.test.com/audio/test.mp3 (cache: false)
✅ Second delivery: https://mock-cdn.test.com/audio/test.mp3 (cache: true)
✅ Statistics: { requests: 3, cacheHits: 1, cacheMisses: 2, cacheHitRatio: 0.33 }

🧪 Testing Storage + CDN Integration...
✅ Audio URL: https://mock-cdn.test.com/audio/test-123.mp3
✅ Transcript URL: https://mock-cdn.test.com/transcripts/test-123.txt

🎉 All tests completed successfully!
```

### 2. 🧪 Unit Tests

**Purpose**: Test individual CDN service components

**Command**:
```bash
cd api
npm test -- --testPathPattern=cdn-service.test.ts
```

**What it tests**:
- ✅ CDN service initialization
- ✅ Profile and endpoint creation
- ✅ URL generation
- ✅ Cache purging
- ✅ Error handling
- ✅ Configuration validation

### 3. 🔗 Integration Tests

**Purpose**: Test CDN integration with storage service

**Command**:
```bash
cd api
npm test -- --testPathPattern=cdn-storage-integration.test.ts
```

**What it tests**:
- ✅ Storage service with CDN URLs
- ✅ Fallback to blob storage when CDN unavailable
- ✅ Cache purging on file deletion
- ✅ Different content types (audio, transcript, etc.)
- ✅ Error handling scenarios

### 4. 🏗️ Full Test Suite

**Purpose**: Comprehensive testing of all CDN functionality

**Command**:
```bash
./scripts/test-cdn.sh
```

**What it tests**:
- ✅ All unit tests
- ✅ All integration tests
- ✅ Mock CDN service functionality
- ✅ URL generation for all content types
- ✅ Cache purging mechanisms
- ✅ Performance simulation
- ✅ Configuration validation

### 5. 🌐 Azure CDN Testing (Production)

**Purpose**: Test with real Azure CDN resources

**Prerequisites**:
- Azure subscription
- CDN resources deployed
- Storage account configured

**Commands**:
```bash
# Deploy CDN resources
./scripts/deploy-cdn.sh

# Test with real CDN
curl -I https://your-cdn-endpoint.azureedge.net/audio/test.mp3
```

## Test Scenarios

### Scenario 1: Basic CDN Functionality

**Test**: Verify CDN service can be initialized and configured

```javascript
const { CdnService } = require('./src/services/cdn-service');

const cdnService = new CdnService();
console.log('CDN Health:', cdnService.checkHealth());
console.log('Endpoint URL:', await cdnService.getEndpointUrl());
```

**Expected**: Service initializes successfully and returns endpoint URL

### Scenario 2: Content Delivery

**Test**: Verify content is delivered through CDN with proper URLs

```javascript
const { StorageService } = require('./src/services/storage-service');

const storageService = new StorageService(config);
const result = await storageService.uploadAudio(audioBuffer, 'test-123');
console.log('Audio URL:', result.url);
```

**Expected**: URL contains CDN endpoint domain

### Scenario 3: Cache Behavior

**Test**: Verify caching works correctly

```javascript
// First request - should be cache miss
const result1 = await cdnService.deliverContent('/audio/test.mp3', content);
console.log('First request - from cache:', result1.fromCache); // false

// Second request - should be cache hit
const result2 = await cdnService.deliverContent('/audio/test.mp3', content);
console.log('Second request - from cache:', result2.fromCache); // true
```

**Expected**: First request is cache miss, second is cache hit

### Scenario 4: Cache Purging

**Test**: Verify cache can be purged when content is updated

```javascript
// Add content to cache
await cdnService.deliverContent('/audio/test.mp3', content);

// Purge cache
await cdnService.purgeCache(['/audio/test.mp3']);

// Next request should be cache miss
const result = await cdnService.deliverContent('/audio/test.mp3', content);
console.log('After purge - from cache:', result.fromCache); // false
```

**Expected**: Content is purged and next request is cache miss

### Scenario 5: Error Handling

**Test**: Verify graceful fallback when CDN is unavailable

```javascript
// Simulate CDN failure
const unhealthyCdnService = {
    checkHealth: () => false,
    getEndpointUrl: () => Promise.reject(new Error('CDN unavailable'))
};

const storageService = new StorageService(config, unhealthyCdnService);
const result = await storageService.uploadAudio(audioBuffer, 'test-123');
console.log('Fallback URL:', result.url);
```

**Expected**: Falls back to blob storage URL

### Scenario 6: Performance Testing

**Test**: Verify CDN improves performance

```javascript
const iterations = 100;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
    await cdnService.deliverContent(`/audio/test-${i % 10}.mp3`, content);
}

const endTime = Date.now();
const avgTime = (endTime - startTime) / iterations;
console.log('Average response time:', avgTime, 'ms');
```

**Expected**: Average response time < 10ms for cached content

## Testing Checklist

### ✅ Pre-Testing Setup

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Test files created

### ✅ Local Testing

- [ ] Quick test passes (`node scripts/quick-cdn-test.js`)
- [ ] Unit tests pass (`npm test -- cdn-service.test.ts`)
- [ ] Integration tests pass (`npm test -- cdn-storage-integration.test.ts`)
- [ ] Full test suite passes (`./scripts/test-cdn.sh`)

### ✅ Azure Testing (Optional)

- [ ] Azure CLI installed and authenticated
- [ ] CDN resources deployed (`./scripts/deploy-cdn.sh`)
- [ ] CDN endpoint accessible
- [ ] Content delivery working
- [ ] Cache purging functional

### ✅ Performance Validation

- [ ] Response times acceptable (< 100ms for cache hits)
- [ ] Cache hit ratio > 80% for audio files
- [ ] Compression working for text content
- [ ] Error handling graceful

## Troubleshooting

### Common Issues

#### 1. Tests Failing with "CDN service not healthy"

**Cause**: Missing environment variables or configuration

**Solution**:
```bash
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_RESOURCE_GROUP_NAME="your-resource-group"
```

#### 2. URL Generation Not Using CDN

**Cause**: CDN service not properly integrated

**Solution**: Check that `cdnService.checkHealth()` returns true and `getEndpointUrl()` is working

#### 3. Cache Not Working

**Cause**: Cache rules not properly configured

**Solution**: Verify cache rules in `getDefaultCacheRules()` method

#### 4. Performance Issues

**Cause**: Inefficient cache implementation or too many cache misses

**Solution**: 
- Check cache hit ratio
- Verify cache duration settings
- Monitor response times

### Debug Commands

```bash
# Check CDN service health
node -e "const { cdnService } = require('./api/dist/services/cdn-service'); console.log(cdnService.checkHealth());"

# Test URL generation
node -e "const { StorageService } = require('./api/dist/services/storage-service'); const s = new StorageService({connectionString: 'test', containerName: 'test'}); s.uploadAudio(Buffer.from('test'), 'test').then(r => console.log(r.url));"

# Check configuration
node -e "const { environmentService } = require('./api/dist/config/environment'); console.log(environmentService.getConfig().storage.cdn);"
```

## Next Steps

1. **Run Quick Test**: Start with `node scripts/quick-cdn-test.js`
2. **Run Full Suite**: Execute `./scripts/test-cdn.sh`
3. **Deploy to Azure**: Use `./scripts/deploy-cdn.sh` for real testing
4. **Monitor Performance**: Set up monitoring and analytics
5. **Optimize**: Adjust cache rules based on usage patterns

## Test Results Interpretation

### ✅ Success Indicators

- All tests pass without errors
- CDN URLs generated correctly
- Cache behavior working as expected
- Performance within acceptable limits
- Error handling graceful

### ⚠️ Warning Signs

- High response times (> 100ms)
- Low cache hit ratio (< 50%)
- Frequent fallbacks to blob storage
- Configuration errors

### ❌ Failure Indicators

- Tests failing with errors
- CDN service not initializing
- URLs not using CDN domain
- Cache not working
- Performance degradation

This testing approach ensures the CDN implementation is robust, performant, and ready for production use.
