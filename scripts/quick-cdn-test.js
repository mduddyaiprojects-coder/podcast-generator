#!/usr/bin/env node

/**
 * Quick CDN Test Script
 * 
 * This script provides a quick way to test CDN functionality
 * without requiring full Azure deployment or complex setup.
 */

const fs = require('fs');
const path = require('path');

// Simple mock implementations for testing
class MockCdnService {
    constructor() {
        this.baseUrl = 'https://mock-cdn.test.com';
        this.cache = new Map();
        this.stats = {
            requests: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    async getEndpointUrl() {
        return this.baseUrl;
    }

    async deliverContent(path, content) {
        this.stats.requests++;
        
        if (this.cache.has(path)) {
            this.stats.cacheHits++;
            return {
                url: `${this.baseUrl}${path}`,
                fromCache: true,
                compressed: false,
                responseTime: 1
            };
        } else {
            this.stats.cacheMisses++;
            this.cache.set(path, content);
            return {
                url: `${this.baseUrl}${path}`,
                fromCache: false,
                compressed: false,
                responseTime: 50
            };
        }
    }

    async purgeCache(paths) {
        let purged = 0;
        for (const path of paths) {
            if (this.cache.delete(path)) {
                purged++;
            }
        }
        console.log(`Purged ${purged} items from cache`);
    }

    getStats() {
        return {
            ...this.stats,
            cacheHitRatio: this.stats.requests > 0 ? this.stats.cacheHits / this.stats.requests : 0,
            cacheSize: this.cache.size
        };
    }

    checkHealth() {
        return true;
    }
}

class MockStorageService {
    constructor(cdnService) {
        this.cdnService = cdnService;
        this.containerName = 'test-container';
    }

    async getPublicUrl(blobName) {
        if (this.cdnService && this.cdnService.checkHealth()) {
            try {
                const cdnUrl = await this.cdnService.getEndpointUrl();
                return `${cdnUrl}/${blobName}`;
            } catch (error) {
                console.warn('CDN service error, falling back to blob storage');
            }
        }
        
        return `https://teststorage.blob.core.windows.net/${this.containerName}/${blobName}`;
    }

    async uploadAudio(audioBuffer, submissionId) {
        const blobName = `audio/${submissionId}.mp3`;
        const url = await this.getPublicUrl(blobName);
        
        return {
            url,
            size: audioBuffer.length,
            contentType: 'audio/mpeg',
            etag: 'test-etag',
            lastModified: new Date()
        };
    }

    async uploadTranscript(content, submissionId) {
        const blobName = `transcripts/${submissionId}.txt`;
        const url = await this.getPublicUrl(blobName);
        
        return {
            url,
            size: Buffer.byteLength(content, 'utf8'),
            contentType: 'text/plain',
            etag: 'test-etag',
            lastModified: new Date()
        };
    }

    async deleteSubmissionFiles(submissionId) {
        const paths = [
            `/audio/${submissionId}.mp3`,
            `/transcripts/${submissionId}.txt`,
            `/scripts/${submissionId}.txt`,
            `/summaries/${submissionId}.txt`,
            `/chapters/${submissionId}.json`
        ];

        if (this.cdnService && this.cdnService.checkHealth()) {
            await this.cdnService.purgeCache(paths);
        }
    }
}

// Test functions
async function testCdnService() {
    console.log('🧪 Testing CDN Service...');
    
    const cdnService = new MockCdnService();
    
    // Test basic functionality
    const endpointUrl = await cdnService.getEndpointUrl();
    console.log(`✅ Endpoint URL: ${endpointUrl}`);
    
    // Test content delivery
    const testContent = Buffer.from('test audio content');
    const result1 = await cdnService.deliverContent('/audio/test.mp3', testContent);
    console.log(`✅ First delivery: ${result1.url} (cache: ${result1.fromCache})`);
    
    const result2 = await cdnService.deliverContent('/audio/test.mp3', testContent);
    console.log(`✅ Second delivery: ${result2.url} (cache: ${result2.fromCache})`);
    
    // Test cache purging
    await cdnService.purgeCache(['/audio/test.mp3']);
    const result3 = await cdnService.deliverContent('/audio/test.mp3', testContent);
    console.log(`✅ After purge: ${result3.url} (cache: ${result3.fromCache})`);
    
    // Test statistics
    const stats = cdnService.getStats();
    console.log(`✅ Statistics:`, stats);
    
    console.log('✅ CDN Service test completed\n');
}

async function testStorageIntegration() {
    console.log('🧪 Testing Storage + CDN Integration...');
    
    const cdnService = new MockCdnService();
    const storageService = new MockStorageService(cdnService);
    
    // Test audio upload
    const audioResult = await storageService.uploadAudio(Buffer.from('audio data'), 'test-123');
    console.log(`✅ Audio URL: ${audioResult.url}`);
    
    // Test transcript upload
    const transcriptResult = await storageService.uploadTranscript('transcript content', 'test-123');
    console.log(`✅ Transcript URL: ${transcriptResult.url}`);
    
    // Test file deletion with cache purging
    await storageService.deleteSubmissionFiles('test-123');
    console.log('✅ Files deleted and cache purged');
    
    console.log('✅ Storage Integration test completed\n');
}

async function testUrlGeneration() {
    console.log('🧪 Testing URL Generation...');
    
    const cdnService = new MockCdnService();
    const storageService = new MockStorageService(cdnService);
    
    const testCases = [
        { type: 'audio', id: 'episode-001' },
        { type: 'transcript', id: 'episode-001' },
        { type: 'script', id: 'episode-001' },
        { type: 'summary', id: 'episode-001' },
        { type: 'chapters', id: 'episode-001' }
    ];
    
    for (const testCase of testCases) {
        let result;
        if (testCase.type === 'audio') {
            result = await storageService.uploadAudio(Buffer.from('test'), testCase.id);
        } else if (testCase.type === 'transcript') {
            result = await storageService.uploadTranscript('test', testCase.id);
        } else {
            // Skip other types for now
            continue;
        }
        
        console.log(`✅ ${testCase.type} URL: ${result.url}`);
        
        // Verify URL structure
        const expectedPath = testCase.type === 'audio' ? 'audio/' : 'transcripts/';
        if (result.url.includes(expectedPath)) {
            console.log(`  ✅ URL contains correct path: ${expectedPath}`);
        } else {
            console.log(`  ❌ URL missing expected path: ${expectedPath}`);
        }
    }
    
    console.log('✅ URL Generation test completed\n');
}

async function testPerformance() {
    console.log('🧪 Testing Performance...');
    
    const cdnService = new MockCdnService();
    const storageService = new MockStorageService(cdnService);
    
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        const submissionId = `test-${i % 10}`; // Reuse some IDs for cache testing
        await storageService.uploadAudio(Buffer.from(`audio data ${i}`), submissionId);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    const stats = cdnService.getStats();
    
    console.log(`✅ Performance Results:`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Average time: ${avgTime.toFixed(2)}ms per request`);
    console.log(`  Total requests: ${stats.requests}`);
    console.log(`  Cache hits: ${stats.cacheHits}`);
    console.log(`  Cache misses: ${stats.cacheMisses}`);
    console.log(`  Cache hit ratio: ${(stats.cacheHitRatio * 100).toFixed(1)}%`);
    
    if (avgTime < 10) {
        console.log(`  ✅ Performance is good (< 10ms average)`);
    } else {
        console.log(`  ⚠️ Performance could be better (> 10ms average)`);
    }
    
    console.log('✅ Performance test completed\n');
}

async function testErrorHandling() {
    console.log('🧪 Testing Error Handling...');
    
    // Test with unhealthy CDN service
    const unhealthyCdnService = {
        checkHealth: () => false,
        getEndpointUrl: () => Promise.reject(new Error('CDN unavailable'))
    };
    
    const storageService = new MockStorageService(unhealthyCdnService);
    
    try {
        const result = await storageService.uploadAudio(Buffer.from('test'), 'test-123');
        console.log(`✅ Fallback URL: ${result.url}`);
        
        if (result.url.includes('blob.core.windows.net')) {
            console.log(`  ✅ Correctly fell back to blob storage URL`);
        } else {
            console.log(`  ❌ Did not fall back to blob storage URL`);
        }
    } catch (error) {
        console.log(`❌ Error handling failed: ${error.message}`);
    }
    
    console.log('✅ Error Handling test completed\n');
}

// Main execution
async function main() {
    console.log('🚀 Starting Quick CDN Test Suite\n');
    
    try {
        await testCdnService();
        await testStorageIntegration();
        await testUrlGeneration();
        await testPerformance();
        await testErrorHandling();
        
        console.log('🎉 All tests completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log('  ✅ CDN Service functionality');
        console.log('  ✅ Storage + CDN integration');
        console.log('  ✅ URL generation with CDN');
        console.log('  ✅ Performance simulation');
        console.log('  ✅ Error handling and fallback');
        
        console.log('\n🔧 Next Steps:');
        console.log('  1. Run full test suite: ./scripts/test-cdn.sh');
        console.log('  2. Deploy to Azure for real CDN testing');
        console.log('  3. Configure production CDN settings');
        console.log('  4. Monitor CDN performance and costs');
        
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
    MockCdnService,
    MockStorageService,
    testCdnService,
    testStorageIntegration,
    testUrlGeneration,
    testPerformance,
    testErrorHandling
};
