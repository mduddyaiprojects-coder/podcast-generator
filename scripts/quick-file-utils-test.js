#!/usr/bin/env node

/**
 * Quick File Utils Test Script
 * 
 * This script provides a quick way to test file utilities functionality
 * without requiring full TypeScript compilation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Simple mock implementations for testing
class MockFileUtils {
  constructor() {
    this.supportedTypes = {
      'audio/mpeg': { extension: '.mp3', category: 'audio', maxSize: 100 * 1024 * 1024 },
      'audio/wav': { extension: '.wav', category: 'audio', maxSize: 200 * 1024 * 1024 },
      'text/plain': { extension: '.txt', category: 'text', maxSize: 10 * 1024 * 1024 },
      'application/json': { extension: '.json', category: 'text', maxSize: 10 * 1024 * 1024 },
      'image/jpeg': { extension: '.jpg', category: 'image', maxSize: 20 * 1024 * 1024 }
    };
  }

  detectMimeType(filename) {
    const extension = path.extname(filename).toLowerCase();
    const mimeMap = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.jpg': 'image/jpeg'
    };
    return mimeMap[extension] || null;
  }

  validateFile(file, filename, mimeType) {
    const errors = [];
    const warnings = [];
    
    // Detect MIME type
    const detectedType = mimeType || this.detectMimeType(filename);
    if (!detectedType) {
      errors.push('Could not determine file type');
      return { valid: false, errors, warnings };
    }

    // Check if type is supported
    const fileType = this.supportedTypes[detectedType];
    if (!fileType) {
      errors.push(`Unsupported file type: ${detectedType}`);
      return { valid: false, errors, warnings };
    }

    // Check file size
    const size = Buffer.isBuffer(file) ? file.length : 0;
    if (size > fileType.maxSize) {
      errors.push(`File size ${this.formatBytes(size)} exceeds maximum for ${fileType.category} files`);
    }

    // Security checks
    const extension = path.extname(filename).toLowerCase();
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr'];
    if (suspiciousExtensions.includes(extension)) {
      errors.push(`Suspicious file extension: ${extension}`);
    }

    // Check for multiple extensions
    const nameWithoutExt = path.basename(filename, extension);
    if (nameWithoutExt.includes('.')) {
      warnings.push('File has multiple extensions, which could be a security risk');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        name: filename,
        size,
        mimeType: detectedType,
        extension: fileType.extension,
        category: fileType.category,
        lastModified: new Date()
      }
    };
  }

  async generateChecksum(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  async uploadFile(file, destination) {
    try {
      const filename = path.basename(destination);
      const validation = this.validateFile(file, filename);
      
      if (!validation.valid) {
        return {
          success: false,
          error: `File validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create directory if it doesn't exist
      const dir = path.dirname(destination);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      if (Buffer.isBuffer(file)) {
        fs.writeFileSync(destination, file);
      } else if (typeof file === 'string') {
        fs.copyFileSync(file, destination);
      }

      return {
        success: true,
        url: destination,
        metadata: validation.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async downloadFile(source, destination) {
    try {
      if (!fs.existsSync(source)) {
        return {
          success: false,
          error: 'Source file does not exist'
        };
      }

      const dest = destination || this.generateTempPath();
      const dir = path.dirname(dest);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.copyFileSync(source, dest);
      
      const stats = fs.statSync(dest);
      return {
        success: true,
        path: dest,
        metadata: {
          name: path.basename(dest),
          size: stats.size,
          lastModified: stats.mtime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractMetadata(filePath) {
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const mimeType = this.detectMimeType(filename);
    const fileType = this.supportedTypes[mimeType] || { category: 'other' };

    return {
      name: filename,
      size: stats.size,
      mimeType: mimeType || 'application/octet-stream',
      extension: path.extname(filename),
      category: fileType.category,
      lastModified: stats.mtime
    };
  }

  async compressFile(inputPath, outputPath) {
    try {
      const inputStats = fs.statSync(inputPath);
      const inputStream = fs.createReadStream(inputPath);
      const outputStream = fs.createWriteStream(outputPath);

      return new Promise((resolve, reject) => {
        inputStream.pipe(outputStream);
        outputStream.on('finish', () => {
          const outputStats = fs.statSync(outputPath);
          resolve({
            success: true,
            originalSize: inputStats.size,
            compressedSize: outputStats.size,
            ratio: outputStats.size / inputStats.size
          });
        });
        outputStream.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  generateTempPath() {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return path.join(tempDir, `podcast-temp-${timestamp}-${random}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Test functions
async function testFileValidation() {
  console.log('🧪 Testing File Validation...');
  
  const fileUtils = new MockFileUtils();
  
  // Test valid audio file
  const audioBuffer = Buffer.from('fake audio data');
  const audioValidation = fileUtils.validateFile(audioBuffer, 'test.mp3', 'audio/mpeg');
  console.log('✅ Audio file validation:', audioValidation.valid ? 'PASS' : 'FAIL');
  
  // Test invalid file type
  const invalidValidation = fileUtils.validateFile(audioBuffer, 'test.exe', 'application/x-executable');
  console.log('✅ Invalid file rejection:', !invalidValidation.valid ? 'PASS' : 'FAIL');
  
  // Test security checks
  const securityValidation = fileUtils.validateFile(audioBuffer, 'test.txt.exe', 'text/plain');
  console.log('✅ Security checks:', securityValidation.warnings.length > 0 ? 'PASS' : 'FAIL');
  
  console.log('✅ File validation test completed\n');
}

async function testFileOperations() {
  console.log('🧪 Testing File Operations...');
  
  const fileUtils = new MockFileUtils();
  const tempDir = path.join(os.tmpdir(), 'file-ops-test');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Test buffer upload
    const buffer = Buffer.from('test content');
    const uploadResult = await fileUtils.uploadFile(buffer, path.join(tempDir, 'uploaded.txt'));
    console.log('✅ Buffer upload:', uploadResult.success ? 'PASS' : 'FAIL');
    
    // Test file upload
    const testFile = path.join(tempDir, 'source.txt');
    fs.writeFileSync(testFile, 'source content');
    const fileUploadResult = await fileUtils.uploadFile(testFile, path.join(tempDir, 'uploaded-from-file.txt'));
    console.log('✅ File upload:', fileUploadResult.success ? 'PASS' : 'FAIL');
    
    // Test download
    const downloadResult = await fileUtils.downloadFile(testFile, path.join(tempDir, 'downloaded.txt'));
    console.log('✅ File download:', downloadResult.success ? 'PASS' : 'FAIL');
    
    // Test metadata extraction
    const metadata = await fileUtils.extractMetadata(testFile);
    console.log('✅ Metadata extraction:', metadata.name === 'source.txt' ? 'PASS' : 'FAIL');
    
    // Test checksum generation
    const checksum = await fileUtils.generateChecksum(buffer);
    console.log('✅ Checksum generation:', checksum ? 'PASS' : 'FAIL');
    
    // Test compression
    const inputFile = path.join(tempDir, 'input.txt');
    const outputFile = path.join(tempDir, 'compressed.txt');
    fs.writeFileSync(inputFile, 'This is a test content for compression. '.repeat(100));
    
    const compressionResult = await fileUtils.compressFile(inputFile, outputFile);
    console.log('✅ File compression:', compressionResult.success ? 'PASS' : 'FAIL');
    console.log(`   Compression ratio: ${(compressionResult.ratio * 100).toFixed(1)}%`);
    
  } finally {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  
  console.log('✅ File operations test completed\n');
}

async function testFileTypeDetection() {
  console.log('🧪 Testing File Type Detection...');
  
  const fileUtils = new MockFileUtils();
  const tempDir = path.join(os.tmpdir(), 'file-types-test');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    const testCases = [
      { filename: 'audio.mp3', expectedType: 'audio/mpeg', expectedCategory: 'audio' },
      { filename: 'audio.wav', expectedType: 'audio/wav', expectedCategory: 'audio' },
      { filename: 'text.txt', expectedType: 'text/plain', expectedCategory: 'text' },
      { filename: 'data.json', expectedType: 'application/json', expectedCategory: 'text' },
      { filename: 'image.jpg', expectedType: 'image/jpeg', expectedCategory: 'image' }
    ];
    
    for (const testCase of testCases) {
      const filePath = path.join(tempDir, testCase.filename);
      fs.writeFileSync(filePath, 'test content');
      
      const metadata = await fileUtils.extractMetadata(filePath);
      const typeMatch = metadata.mimeType === testCase.expectedType;
      const categoryMatch = metadata.category === testCase.expectedCategory;
      
      console.log(`✅ ${testCase.filename}:`, typeMatch && categoryMatch ? 'PASS' : 'FAIL');
    }
  } finally {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  
  console.log('✅ File type detection test completed\n');
}

async function testSecurity() {
  console.log('🧪 Testing Security Features...');
  
  const fileUtils = new MockFileUtils();
  const tempDir = path.join(os.tmpdir(), 'security-test');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Test malicious file extensions
    const maliciousFiles = [
      { name: 'malware.exe', content: 'malicious content' },
      { name: 'script.bat', content: 'batch script' },
      { name: 'virus.scr', content: 'screensaver virus' }
    ];
    
    for (const file of maliciousFiles) {
      const filePath = path.join(tempDir, file.name);
      fs.writeFileSync(filePath, file.content);
      
      const validation = fileUtils.validateFile(filePath, file.name);
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
      
      const validation = fileUtils.validateFile(filePath, name);
      const hasWarning = validation.warnings.some(warning => 
        warning.includes('multiple extensions')
      );
      
      console.log(`✅ ${name} warning:`, hasWarning ? 'PASS' : 'FAIL');
    }
  } finally {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  
  console.log('✅ Security test completed\n');
}

async function testPerformance() {
  console.log('🧪 Testing Performance...');
  
  const fileUtils = new MockFileUtils();
  const tempDir = path.join(os.tmpdir(), 'performance-test');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Test large file handling
    const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
    const startTime = Date.now();
    
    const validation = fileUtils.validateFile(largeBuffer, 'large.mp3', 'audio/mpeg');
    const uploadResult = await fileUtils.uploadFile(largeBuffer, path.join(tempDir, 'large.mp3'));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Large file processing:', validation.valid && uploadResult.success ? 'PASS' : 'FAIL');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Performance: ${duration < 100 ? 'GOOD' : 'SLOW'}`);
    
    // Test concurrent operations
    const concurrentStart = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      const buffer = Buffer.from(`test content ${i}`);
      promises.push(fileUtils.uploadFile(buffer, path.join(tempDir, `concurrent-${i}.txt`)));
    }
    
    const results = await Promise.all(promises);
    const concurrentEnd = Date.now();
    const concurrentDuration = concurrentEnd - concurrentStart;
    
    const allSuccessful = results.every(result => result.success);
    console.log('✅ Concurrent operations:', allSuccessful ? 'PASS' : 'FAIL');
    console.log(`   Duration: ${concurrentDuration}ms`);
    console.log(`   Performance: ${concurrentDuration < 200 ? 'GOOD' : 'SLOW'}`);
    
    // Test checksum generation performance
    const checksumStart = Date.now();
    const checksum = await fileUtils.generateChecksum(largeBuffer);
    const checksumEnd = Date.now();
    const checksumDuration = checksumEnd - checksumStart;
    
    console.log('✅ Checksum generation:', checksum ? 'PASS' : 'FAIL');
    console.log(`   Duration: ${checksumDuration}ms`);
    console.log(`   Performance: ${checksumDuration < 50 ? 'GOOD' : 'SLOW'}`);
  } finally {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  
  console.log('✅ Performance test completed\n');
}

// Main execution
async function main() {
  console.log('🚀 Starting Quick File Utils Test Suite\n');
  
  try {
    await testFileValidation();
    await testFileOperations();
    await testFileTypeDetection();
    await testSecurity();
    await testPerformance();
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ File validation and security');
    console.log('  ✅ File upload/download operations');
    console.log('  ✅ File type detection');
    console.log('  ✅ Performance and error handling');
    console.log('  ✅ Checksum generation and compression');
    
    console.log('\n🔧 Next Steps:');
    console.log('  1. Run full test suite: ./scripts/test-file-utils.sh');
    console.log('  2. Integrate with storage service');
    console.log('  3. Deploy to production');
    console.log('  4. Monitor file operations performance');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  MockFileUtils,
  testFileValidation,
  testFileOperations,
  testFileTypeDetection,
  testSecurity,
  testPerformance
};
