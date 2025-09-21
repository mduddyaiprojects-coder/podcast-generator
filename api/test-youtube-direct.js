// Test YouTube service directly without Azure Functions
const { YouTubeService } = require('./dist/services/youtube-service');

// Set environment variables directly
process.env['YOUTUBE_API_KEY'] = 'AIzaSyBmjxwsQxHUpBxfobmy4iw1kaMpQuIDehU';

async function testYouTubeDirect() {
  console.log('Testing YouTube Service Directly...');
  console.log('YOUTUBE_API_KEY:', process.env['YOUTUBE_API_KEY'] ? 'SET' : 'NOT SET');
  console.log('');

  try {
    const youtubeService = new YouTubeService();

    // Test health check
    console.log('1. Testing health check...');
    const isHealthy = await youtubeService.checkHealth();
    console.log(`Health status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log('');

    // Test video metadata
    console.log('2. Testing video metadata...');
    const testVideoId = 'dQw4w9WgXcQ';
    const metadata = await youtubeService.getVideoMetadata(testVideoId);
    
    console.log(`✅ Successfully fetched video metadata!`);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Channel: ${metadata.channelTitle}`);
    console.log(`   Duration: ${metadata.duration}`);
    console.log(`   Views: ${metadata.viewCount.toLocaleString()}`);
    console.log(`   Published: ${metadata.publishedAt}`);
    console.log('');

    console.log('🎉 YouTube service working perfectly!');
    console.log('The issue is that Azure Functions runtime needs to be restarted to load the new environment variables.');

  } catch (error) {
    console.error('❌ YouTube service test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testYouTubeDirect();
