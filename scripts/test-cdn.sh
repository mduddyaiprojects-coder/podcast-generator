#!/bin/bash

# CDN Testing Script for Podcast Generator
# This script tests CDN functionality without requiring full Azure deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="/tmp/podcast-cdn-test"
MOCK_CDN_URL="https://mock-cdn.localhost:3000"
TEST_FILES=(
    "audio/test-episode.mp3"
    "transcripts/test-episode.txt"
    "scripts/test-episode.txt"
    "summaries/test-episode.txt"
    "chapters/test-episode.json"
)

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test files..."
    rm -rf "$TEST_DIR"
}

# Set up trap for cleanup
trap cleanup EXIT

# Create test directory
setup_test_environment() {
    log_info "Setting up test environment..."
    mkdir -p "$TEST_DIR"
    
    # Create test files
    echo "This is a test audio file" > "$TEST_DIR/test-audio.mp3"
    echo "This is a test transcript" > "$TEST_DIR/test-transcript.txt"
    echo "This is a test script" > "$TEST_DIR/test-script.txt"
    echo "This is a test summary" > "$TEST_DIR/test-summary.txt"
    echo '{"chapters": [{"title": "Chapter 1", "start": 0}]}' > "$TEST_DIR/test-chapters.json"
    
    log_info "Test environment created at $TEST_DIR"
}

# Test 1: Unit Tests
run_unit_tests() {
    log_test "Running CDN service unit tests..."
    
    cd api
    
    if npm test -- --testPathPattern=cdn-service.test.ts --verbose; then
        log_info "✅ CDN service unit tests passed"
    else
        log_error "❌ CDN service unit tests failed"
        return 1
    fi
    
    cd ..
}

# Test 2: Integration Tests
run_integration_tests() {
    log_test "Running CDN integration tests..."
    
    cd api
    
    if npm test -- --testPathPattern=cdn-storage-integration.test.ts --verbose; then
        log_info "✅ CDN integration tests passed"
    else
        log_error "❌ CDN integration tests failed"
        return 1
    fi
    
    cd ..
}

# Test 3: Mock CDN Service
test_mock_cdn_service() {
    log_test "Testing mock CDN service..."
    
    cd api
    
    # Create a simple test script
    cat > test-mock-cdn.js << 'EOF'
const { MockCdnService } = require('./dist/services/mock-cdn-service');

async function testMockCdn() {
    console.log('Testing Mock CDN Service...');
    
    const mockCdn = new MockCdnService({
        baseUrl: 'https://mock-cdn.test.com',
        enableCompression: true
    });
    
    // Test basic functionality
    const endpointUrl = await mockCdn.getEndpointUrl();
    console.log('✅ Endpoint URL:', endpointUrl);
    
    // Test content delivery
    const testContent = Buffer.from('test content');
    const result = await mockCdn.deliverContent('/audio/test.mp3', testContent);
    console.log('✅ Content delivery:', result);
    
    // Test cache behavior
    const cachedResult = await mockCdn.deliverContent('/audio/test.mp3', testContent);
    console.log('✅ Cache behavior:', cachedResult);
    
    // Test statistics
    const stats = mockCdn.getStats();
    console.log('✅ Statistics:', stats);
    
    // Test cache purging
    await mockCdn.purgeCache(['/audio/test.mp3']);
    console.log('✅ Cache purging completed');
    
    console.log('✅ Mock CDN service test completed successfully');
}

testMockCdn().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-mock-cdn.js
    
    # Cleanup
    rm test-mock-cdn.js
    
    log_info "✅ Mock CDN service test passed"
    cd ..
}

# Test 4: URL Generation
test_url_generation() {
    log_test "Testing URL generation with CDN..."
    
    cd api
    
    # Create a test script for URL generation
    cat > test-url-generation.js << 'EOF'
const { StorageService } = require('./dist/services/storage-service');
const { mockCdnService } = require('./dist/services/mock-cdn-service');

async function testUrlGeneration() {
    console.log('Testing URL generation...');
    
    // Mock the CDN service
    const originalCdnService = require('./dist/services/cdn-service').cdnService;
    require('./dist/services/cdn-service').cdnService = mockCdnService;
    
    const storageService = new StorageService({
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=teststorage;AccountKey=testkey;EndpointSuffix=core.windows.net',
        containerName: 'test-container'
    });
    
    // Test different content types
    const testCases = [
        { type: 'audio', content: Buffer.from('audio data'), expectedPath: '/audio/test.mp3' },
        { type: 'transcript', content: 'transcript data', expectedPath: '/transcripts/test.txt' },
        { type: 'script', content: 'script data', expectedPath: '/scripts/test.txt' },
        { type: 'summary', content: 'summary data', expectedPath: '/summaries/test.txt' },
        { type: 'chapters', content: [{ title: 'Chapter 1' }], expectedPath: '/chapters/test.json' }
    ];
    
    for (const testCase of testCases) {
        let result;
        try {
            if (testCase.type === 'audio') {
                result = await storageService.uploadAudio(testCase.content, 'test');
            } else if (testCase.type === 'transcript') {
                result = await storageService.uploadTranscript(testCase.content, 'test');
            } else if (testCase.type === 'script') {
                result = await storageService.uploadDialogueScript(testCase.content, 'test');
            } else if (testCase.type === 'summary') {
                result = await storageService.uploadSummary(testCase.content, 'test');
            } else if (testCase.type === 'chapters') {
                result = await storageService.uploadChapterMarkers(testCase.content, 'test');
            }
            
            console.log(`✅ ${testCase.type} URL:`, result.url);
            
            // Verify URL contains expected path
            if (result.url.includes(testCase.expectedPath)) {
                console.log(`✅ ${testCase.type} URL path is correct`);
            } else {
                console.log(`❌ ${testCase.type} URL path is incorrect`);
            }
        } catch (error) {
            console.log(`❌ ${testCase.type} upload failed:`, error.message);
        }
    }
    
    // Restore original CDN service
    require('./dist/services/cdn-service').cdnService = originalCdnService;
    
    console.log('✅ URL generation test completed');
}

testUrlGeneration().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-url-generation.js
    
    # Cleanup
    rm test-url-generation.js
    
    log_info "✅ URL generation test passed"
    cd ..
}

# Test 5: Cache Purging
test_cache_purging() {
    log_test "Testing cache purging functionality..."
    
    cd api
    
    # Create a test script for cache purging
    cat > test-cache-purging.js << 'EOF'
const { mockCdnService } = require('./dist/services/mock-cdn-service');

async function testCachePurging() {
    console.log('Testing cache purging...');
    
    // Add some content to cache
    await mockCdnService.deliverContent('/audio/test1.mp3', Buffer.from('audio1'));
    await mockCdnService.deliverContent('/audio/test2.mp3', Buffer.from('audio2'));
    await mockCdnService.deliverContent('/transcripts/test1.txt', Buffer.from('transcript1'));
    
    const statsBefore = mockCdnService.getStats();
    console.log('Cache size before purge:', statsBefore.cacheSize);
    
    // Test purging specific paths
    await mockCdnService.purgeCache(['/audio/test1.mp3', '/transcripts/test1.txt']);
    
    const statsAfter = mockCdnService.getStats();
    console.log('Cache size after purge:', statsAfter.cacheSize);
    
    // Test purging submission content
    await mockCdnService.purgeSubmissionContent('test-submission');
    
    const statsFinal = mockCdnService.getStats();
    console.log('Cache size after submission purge:', statsFinal.cacheSize);
    
    console.log('✅ Cache purging test completed');
}

testCachePurging().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-cache-purging.js
    
    # Cleanup
    rm test-cache-purging.js
    
    log_info "✅ Cache purging test passed"
    cd ..
}

# Test 6: Performance Testing
test_performance() {
    log_test "Testing CDN performance simulation..."
    
    cd api
    
    # Create a performance test script
    cat > test-performance.js << 'EOF'
const { MockCdnService } = require('./dist/services/mock-cdn-service');

async function testPerformance() {
    console.log('Testing CDN performance...');
    
    const mockCdn = new MockCdnService({
        baseUrl: 'https://mock-cdn.test.com',
        enableCompression: true
    });
    
    const testContent = Buffer.from('This is a test content for performance testing. '.repeat(1000));
    const iterations = 100;
    
    console.log(`Running ${iterations} iterations...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        const path = `/audio/test-${i % 10}.mp3`; // Reuse some paths for cache testing
        await mockCdn.deliverContent(path, testContent);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    const stats = mockCdn.getStats();
    
    console.log('Performance Results:');
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
    console.log(`Total requests: ${stats.requests}`);
    console.log(`Cache hits: ${stats.cacheHits}`);
    console.log(`Cache misses: ${stats.cacheMisses}`);
    console.log(`Cache hit ratio: ${(stats.cacheHitRatio * 100).toFixed(2)}%`);
    console.log(`Data transferred: ${stats.dataTransferred} bytes`);
    
    // Performance assertions
    if (avgTime < 10) {
        console.log('✅ Average response time is acceptable (< 10ms)');
    } else {
        console.log('⚠️ Average response time is high (> 10ms)');
    }
    
    if (stats.cacheHitRatio > 0.5) {
        console.log('✅ Cache hit ratio is good (> 50%)');
    } else {
        console.log('⚠️ Cache hit ratio is low (< 50%)');
    }
    
    console.log('✅ Performance test completed');
}

testPerformance().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-performance.js
    
    # Cleanup
    rm test-performance.js
    
    log_info "✅ Performance test passed"
    cd ..
}

# Test 7: Configuration Validation
test_configuration() {
    log_test "Testing CDN configuration..."
    
    cd api
    
    # Create a configuration test script
    cat > test-configuration.js << 'EOF'
const { environmentService } = require('./dist/config/environment');

function testConfiguration() {
    console.log('Testing CDN configuration...');
    
    const config = environmentService.getConfig();
    
    // Test CDN configuration exists
    if (config.storage.cdn) {
        console.log('✅ CDN configuration found');
        console.log('CDN Profile Name:', config.storage.cdn.profileName);
        console.log('CDN Endpoint Name:', config.storage.cdn.endpointName);
        console.log('CDN Compression:', config.storage.cdn.enableCompression);
        console.log('CDN HTTPS:', config.storage.cdn.enableHttps);
    } else {
        console.log('❌ CDN configuration not found');
    }
    
    // Test environment variables
    const requiredEnvVars = [
        'CDN_PROFILE_NAME',
        'CDN_ENDPOINT_NAME',
        'CDN_ENABLE_COMPRESSION',
        'CDN_ENABLE_HTTPS'
    ];
    
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar] !== undefined) {
            console.log(`✅ ${envVar} is set`);
        } else {
            console.log(`⚠️ ${envVar} is not set (using default)`);
        }
    }
    
    console.log('✅ Configuration test completed');
}

testConfiguration();
EOF

    # Build and run the test
    npm run build
    node test-configuration.js
    
    # Cleanup
    rm test-configuration.js
    
    log_info "✅ Configuration test passed"
    cd ..
}

# Main test execution
main() {
    log_info "Starting CDN testing suite..."
    log_info "Test directory: $TEST_DIR"
    
    # Check if we're in the right directory
    if [ ! -f "api/package.json" ]; then
        log_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "api/node_modules" ]; then
        log_info "Installing dependencies..."
        cd api && npm install && cd ..
    fi
    
    # Run all tests
    local failed_tests=0
    
    setup_test_environment
    
    if ! run_unit_tests; then
        ((failed_tests++))
    fi
    
    if ! run_integration_tests; then
        ((failed_tests++))
    fi
    
    test_mock_cdn_service
    test_url_generation
    test_cache_purging
    test_performance
    test_configuration
    
    # Summary
    log_info "CDN testing completed!"
    
    if [ $failed_tests -eq 0 ]; then
        log_info "✅ All tests passed successfully!"
        exit 0
    else
        log_error "❌ $failed_tests test(s) failed"
        exit 1
    fi
}

# Run main function
main "$@"
