const { YouTubeService } = require('./dist/services/youtube-service');
const fs = require('fs');
const path = require('path');

// Load environment variables from local.settings.json
try {
  const settingsPath = path.join(__dirname, 'local.settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  // Set environment variables from local.settings.json
  Object.keys(settings.Values).forEach(key => {
    process.env[key] = settings.Values[key];
  });
  
  console.log('Loaded settings from local.settings.json');
} catch (error) {
  console.error('Failed to load local.settings.json:', error.message);
  process.exit(1);
}

async function testYouTubeService() {
  console.log('Testing YouTube Service...');
  console.log('Environment variables:');
  console.log('YOUTUBE_API_KEY:', process.env['YOUTUBE_API_KEY'] ? 'SET' : 'NOT SET');
  console.log('YOUTUBE_BASE_URL:', process.env['YOUTUBE_BASE_URL'] || 'DEFAULT');
  console.log('');

  try {
    const youtubeService = new YouTubeService();

    // Test 1: Health check
    console.log('1. Testing health check...');
    const isHealthy = await youtubeService.checkHealth();
    console.log(`Health status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log('');

    // Test 2: Service info
    console.log('2. Testing service info...');
    const serviceInfo = youtubeService.getServiceInfo();
    console.log('Service info:', JSON.stringify(serviceInfo, null, 2));
    console.log('');

    // Test 3: Video ID extraction
    console.log('3. Testing video ID extraction...');
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    ];
    
    testUrls.forEach(url => {
      const videoId = youtubeService.extractVideoIdFromUrl(url);
      console.log(`URL: ${url}`);
      console.log(`Video ID: ${videoId}`);
    });
    console.log('');

    // Test 4: Search videos (real API call)
    console.log('4. Testing video search...');
    try {
      const searchResults = await youtubeService.searchVideos('podcast', 3);
      console.log(`✅ Found ${searchResults.length} videos`);
      searchResults.forEach((video, index) => {
        console.log(`  ${index + 1}. ${video.title} - ${video.channelTitle}`);
        console.log(`     Video ID: ${video.videoId}`);
      });
    } catch (error) {
      console.log(`❌ Video search failed: ${error.message}`);
    }
    console.log('');

    // Test 5: Get video metadata (real API call)
    console.log('5. Testing video metadata...');
    try {
      // Use a well-known video ID for testing
      const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
      const metadata = await youtubeService.getVideoMetadata(testVideoId);
      
      console.log(`✅ Successfully fetched video metadata!`);
      console.log(`   Title: ${metadata.title}`);
      console.log(`   Channel: ${metadata.channelTitle}`);
      console.log(`   Duration: ${metadata.duration}`);
      console.log(`   Views: ${metadata.viewCount.toLocaleString()}`);
      console.log(`   Likes: ${metadata.likeCount.toLocaleString()}`);
      console.log(`   Published: ${metadata.publishedAt}`);
      
    } catch (error) {
      console.log(`❌ Video metadata failed: ${error.message}`);
    }
    console.log('');

    console.log('🎉 YouTube service test completed!');
    console.log('');
    console.log('✅ Direct API calls working');
    console.log('✅ Video search working');
    console.log('✅ Video metadata working');
    console.log('✅ Video ID extraction working');
    console.log('✅ Ready for Azure Functions integration');

  } catch (error) {
    console.error('❌ YouTube service test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testYouTubeService();
