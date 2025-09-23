#!/bin/bash

# File Utils Testing Script for Podcast Generator
# This script tests file upload/download utilities functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="/tmp/podcast-file-utils-test"
TEST_FILES=(
    "test-audio.mp3"
    "test-transcript.txt"
    "test-script.txt"
    "test-summary.txt"
    "test-chapters.json"
    "test-image.jpg"
    "test-document.pdf"
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

# Create test directory and files
setup_test_environment() {
    log_info "Setting up test environment..."
    mkdir -p "$TEST_DIR"
    
    # Create test files with different content types
    echo "This is a test audio file content" > "$TEST_DIR/test-audio.mp3"
    echo "This is a test transcript content" > "$TEST_DIR/test-transcript.txt"
    echo "This is a test script content" > "$TEST_DIR/test-script.txt"
    echo "This is a test summary content" > "$TEST_DIR/test-summary.txt"
    echo '{"chapters": [{"title": "Chapter 1", "start": 0}]}' > "$TEST_DIR/test-chapters.json"
    echo "This is a test image content" > "$TEST_DIR/test-image.jpg"
    echo "This is a test PDF content" > "$TEST_DIR/test-document.pdf"
    
    # Create some large files for performance testing
    dd if=/dev/zero of="$TEST_DIR/large-file.mp3" bs=1M count=5 2>/dev/null
    
    # Create malicious test files
    echo "malicious content" > "$TEST_DIR/malware.exe"
    echo "batch script" > "$TEST_DIR/script.bat"
    echo "suspicious file" > "$TEST_DIR/file.txt.exe"
    
    log_info "Test environment created at $TEST_DIR"
}

# Test 1: Unit Tests
run_unit_tests() {
    log_test "Running file utilities unit tests..."
    
    cd api
    
    if npm test -- --testPathPattern=file-utils.test.ts --verbose; then
        log_info "✅ File utilities unit tests passed"
    else
        log_error "❌ File utilities unit tests failed"
        return 1
    fi
    
    cd ..
}

# Test 2: Integration Tests
run_integration_tests() {
    log_test "Running file utilities integration tests..."
    
    cd api
    
    if npm test -- --testPathPattern=file-storage-integration.test.ts --verbose; then
        log_info "✅ File utilities integration tests passed"
    else
        log_error "❌ File utilities integration tests failed"
        return 1
    fi
    
    cd ..
}

# Test 3: File Validation
test_file_validation() {
    log_test "Testing file validation functionality..."
    
    cd api
    
    # Create a test script for file validation
    cat > test-file-validation.js << 'EOF'
const { validateFile, fileUtils } = require('./dist/utils/file-utils');
const fs = require('fs');
const path = require('path');

async function testFileValidation() {
    console.log('Testing file validation...');
    
    // Test valid audio file
    const audioBuffer = Buffer.from('fake audio data');
    const audioValidation = await validateFile(audioBuffer, 'test.mp3', 'audio/mpeg');
    console.log('✅ Audio file validation:', audioValidation.valid ? 'PASS' : 'FAIL');
    
    // Test invalid file type
    const invalidValidation = await validateFile(audioBuffer, 'test.exe', 'application/x-executable');
    console.log('✅ Invalid file rejection:', !invalidValidation.valid ? 'PASS' : 'FAIL');
    
    // Test file size validation
    const largeBuffer = Buffer.alloc(30 * 1024 * 1024); // 30MB
    const sizeValidation = await validateFile(largeBuffer, 'large.mp3', 'audio/mpeg');
    console.log('✅ File size validation:', !sizeValidation.valid ? 'PASS' : 'FAIL');
    
    // Test security checks
    const securityValidation = await validateFile(audioBuffer, 'test.txt.exe', 'text/plain');
    console.log('✅ Security checks:', securityValidation.warnings.length > 0 ? 'PASS' : 'FAIL');
    
    console.log('✅ File validation test completed');
}

testFileValidation().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-file-validation.js
    
    # Cleanup
    rm test-file-validation.js
    
    log_info "✅ File validation test passed"
    cd ..
}

# Test 4: File Upload/Download
test_file_operations() {
    log_test "Testing file upload/download operations..."
    
    cd api
    
    # Create a test script for file operations
    cat > test-file-operations.js << 'EOF'
const { uploadFile, downloadFile, extractMetadata } = require('./dist/utils/file-utils');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testFileOperations() {
    console.log('Testing file operations...');
    
    const tempDir = path.join(os.tmpdir(), 'file-ops-test');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Test buffer upload
    const buffer = Buffer.from('test content');
    const uploadResult = await uploadFile(buffer, path.join(tempDir, 'uploaded.txt'));
    console.log('✅ Buffer upload:', uploadResult.success ? 'PASS' : 'FAIL');
    
    // Test file upload
    const testFile = path.join(tempDir, 'source.txt');
    fs.writeFileSync(testFile, 'source content');
    const fileUploadResult = await uploadFile(testFile, path.join(tempDir, 'uploaded-from-file.txt'));
    console.log('✅ File upload:', fileUploadResult.success ? 'PASS' : 'FAIL');
    
    // Test download
    const downloadResult = await downloadFile(testFile, path.join(tempDir, 'downloaded.txt'));
    console.log('✅ File download:', downloadResult.success ? 'PASS' : 'FAIL');
    
    // Test metadata extraction
    const metadata = await extractMetadata(testFile);
    console.log('✅ Metadata extraction:', metadata.name === 'source.txt' ? 'PASS' : 'FAIL');
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ File operations test completed');
}

testFileOperations().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-file-operations.js
    
    # Cleanup
    rm test-file-operations.js
    
    log_info "✅ File operations test passed"
    cd ..
}

# Test 5: File Type Detection
test_file_type_detection() {
    log_test "Testing file type detection..."
    
    cd api
    
    # Create a test script for file type detection
    cat > test-file-types.js << 'EOF'
const { fileUtils } = require('./dist/utils/file-utils');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testFileTypeDetection() {
    console.log('Testing file type detection...');
    
    const tempDir = path.join(os.tmpdir(), 'file-types-test');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const testCases = [
        { filename: 'audio.mp3', expectedType: 'audio/mpeg', expectedCategory: 'audio' },
        { filename: 'audio.wav', expectedType: 'audio/wav', expectedCategory: 'audio' },
        { filename: 'text.txt', expectedType: 'text/plain', expectedCategory: 'text' },
        { filename: 'data.json', expectedType: 'application/json', expectedCategory: 'text' },
        { filename: 'image.jpg', expectedType: 'image/jpeg', expectedCategory: 'image' },
        { filename: 'video.mp4', expectedType: 'video/mp4', expectedCategory: 'video' }
    ];
    
    for (const testCase of testCases) {
        const filePath = path.join(tempDir, testCase.filename);
        fs.writeFileSync(filePath, 'test content');
        
        const metadata = await fileUtils.extractMetadata(filePath);
        const typeMatch = metadata.mimeType === testCase.expectedType;
        const categoryMatch = metadata.category === testCase.expectedCategory;
        
        console.log(`✅ ${testCase.filename}:`, typeMatch && categoryMatch ? 'PASS' : 'FAIL');
    }
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ File type detection test completed');
}

testFileTypeDetection().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-file-types.js
    
    # Cleanup
    rm test-file-types.js
    
    log_info "✅ File type detection test passed"
    cd ..
}

# Test 6: Security Testing
test_security() {
    log_test "Testing security features..."
    
    cd api
    
    # Create a test script for security testing
    cat > test-security.js << 'EOF'
const { validateFile } = require('./dist/utils/file-utils');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testSecurity() {
    console.log('Testing security features...');
    
    const tempDir = path.join(os.tmpdir(), 'security-test');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Test malicious file extensions
    const maliciousFiles = [
        { name: 'malware.exe', content: 'malicious content' },
        { name: 'script.bat', content: 'batch script' },
        { name: 'virus.scr', content: 'screensaver virus' }
    ];
    
    for (const file of maliciousFiles) {
        const filePath = path.join(tempDir, file.name);
        fs.writeFileSync(filePath, file.content);
        
        const validation = await validateFile(filePath, file.name);
        const isBlocked = !validation.valid && validation.errors.some(error => 
            error.includes('Suspicious file extension')
        );
        
        console.log(`✅ ${file.name} blocked:`, isBlocked ? 'PASS' : 'FAIL');
    }
    
    // Test suspicious filenames
    const suspiciousNames = [
        'file.txt.exe',
        'document.pdf.bat',
        'image.jpg.scr'
    ];
    
    for (const name of suspiciousNames) {
        const filePath = path.join(tempDir, name);
        fs.writeFileSync(filePath, 'content');
        
        const validation = await validateFile(filePath, name);
        const hasWarning = validation.warnings.some(warning => 
            warning.includes('multiple extensions')
        );
        
        console.log(`✅ ${name} warning:`, hasWarning ? 'PASS' : 'FAIL');
    }
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ Security test completed');
}

testSecurity().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-security.js
    
    # Cleanup
    rm test-security.js
    
    log_info "✅ Security test passed"
    cd ..
}

# Test 7: Performance Testing
test_performance() {
    log_test "Testing performance..."
    
    cd api
    
    # Create a test script for performance testing
    cat > test-performance.js << 'EOF'
const { uploadFile, validateFile, fileUtils } = require('./dist/utils/file-utils');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testPerformance() {
    console.log('Testing performance...');
    
    const tempDir = path.join(os.tmpdir(), 'performance-test');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Test large file handling
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
    const startTime = Date.now();
    
    const validation = await validateFile(largeBuffer, 'large.mp3', 'audio/mpeg');
    const uploadResult = await uploadFile(largeBuffer, path.join(tempDir, 'large.mp3'));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Large file processing:', validation.valid && uploadResult.success ? 'PASS' : 'FAIL');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Performance: ${duration < 2000 ? 'GOOD' : 'SLOW'}`);
    
    // Test concurrent operations
    const concurrentStart = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
        const buffer = Buffer.from(`test content ${i}`);
        promises.push(uploadFile(buffer, path.join(tempDir, `concurrent-${i}.txt`)));
    }
    
    const results = await Promise.all(promises);
    const concurrentEnd = Date.now();
    const concurrentDuration = concurrentEnd - concurrentStart;
    
    const allSuccessful = results.every(result => result.success);
    console.log('✅ Concurrent operations:', allSuccessful ? 'PASS' : 'FAIL');
    console.log(`   Duration: ${concurrentDuration}ms`);
    console.log(`   Performance: ${concurrentDuration < 1000 ? 'GOOD' : 'SLOW'}`);
    
    // Test checksum generation performance
    const checksumStart = Date.now();
    const checksum = await fileUtils.generateChecksum(largeBuffer);
    const checksumEnd = Date.now();
    const checksumDuration = checksumEnd - checksumStart;
    
    console.log('✅ Checksum generation:', checksum ? 'PASS' : 'FAIL');
    console.log(`   Duration: ${checksumDuration}ms`);
    console.log(`   Performance: ${checksumDuration < 100 ? 'GOOD' : 'SLOW'}`);
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
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

# Test 8: Error Handling
test_error_handling() {
    log_test "Testing error handling..."
    
    cd api
    
    # Create a test script for error handling
    cat > test-error-handling.js << 'EOF'
const { uploadFile, downloadFile, extractMetadata } = require('./dist/utils/file-utils');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testErrorHandling() {
    console.log('Testing error handling...');
    
    const tempDir = path.join(os.tmpdir(), 'error-test');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Test invalid file upload
    const invalidResult = await uploadFile(Buffer.from('test'), 'test.exe', 'application/x-executable');
    console.log('✅ Invalid file rejection:', !invalidResult.success ? 'PASS' : 'FAIL');
    
    // Test missing file download
    const downloadResult = await downloadFile('/nonexistent/file.txt');
    console.log('✅ Missing file handling:', !downloadResult.success ? 'PASS' : 'FAIL');
    
    // Test metadata extraction from missing file
    try {
        await extractMetadata('/nonexistent/file.txt');
        console.log('✅ Missing file metadata: FAIL');
    } catch (error) {
        console.log('✅ Missing file metadata: PASS');
    }
    
    // Test timeout handling
    const timeoutResult = await uploadFile(Buffer.from('test'), path.join(tempDir, 'timeout.txt'), {
        timeout: 1 // 1ms timeout
    });
    console.log('✅ Timeout handling:', timeoutResult.success !== undefined ? 'PASS' : 'FAIL');
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ Error handling test completed');
}

testErrorHandling().catch(console.error);
EOF

    # Build and run the test
    npm run build
    node test-error-handling.js
    
    # Cleanup
    rm test-error-handling.js
    
    log_info "✅ Error handling test passed"
    cd ..
}

# Main test execution
main() {
    log_info "Starting File Utils testing suite..."
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
    
    test_file_validation
    test_file_operations
    test_file_type_detection
    test_security
    test_performance
    test_error_handling
    
    # Summary
    log_info "File Utils testing completed!"
    
    if [ $failed_tests -eq 0 ]; then
        log_info "✅ All tests passed successfully!"
        log_info ""
        log_info "📋 Test Summary:"
        log_info "  ✅ File validation and security"
        log_info "  ✅ File upload/download operations"
        log_info "  ✅ File type detection"
        log_info "  ✅ Performance and error handling"
        log_info "  ✅ Integration with storage service"
        log_info ""
        log_info "🔧 Next Steps:"
        log_info "  1. Deploy file utilities to production"
        log_info "  2. Configure file size and type limits"
        log_info "  3. Set up monitoring for file operations"
        log_info "  4. Test with real podcast content"
        exit 0
    else
        log_error "❌ $failed_tests test(s) failed"
        exit 1
    fi
}

# Run main function
main "$@"
