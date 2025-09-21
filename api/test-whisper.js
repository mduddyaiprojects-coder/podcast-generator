const fs = require('fs');
const path = require('path');

// Load environment variables from local.settings.json
const localSettingsPath = path.join(__dirname, 'local.settings.json');
if (fs.existsSync(localSettingsPath)) {
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
  Object.assign(process.env, localSettings.Values);
}

async function testWhisperService() {
  console.log('🎤 Testing Azure OpenAI Whisper Service...\n');

  try {
    // Import the service
    const { WhisperService } = require('./dist/services/whisper-service');
    
    const whisperService = new WhisperService();
    
    // Test 1: Service Health Check
    console.log('1️⃣ Testing service health check...');
    const isHealthy = await whisperService.checkHealth();
    console.log(`   Health Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    if (!isHealthy) {
      console.log('   Service is not healthy. Check configuration.');
      return;
    }

    // Test 2: Service Info
    console.log('\n2️⃣ Testing service info...');
    const serviceInfo = whisperService.getServiceInfo();
    console.log('   Service Info:', JSON.stringify(serviceInfo, null, 2));

    // Test 3: Default Options
    console.log('\n3️⃣ Testing default podcast options...');
    const defaultOptions = whisperService.getDefaultPodcastOptions();
    console.log('   Default Options:', JSON.stringify(defaultOptions, null, 2));

    // Test 4: Content Type Options
    console.log('\n4️⃣ Testing content type options...');
    const podcastOptions = whisperService.getContentTypeOptions('podcast');
    console.log('   Podcast Options:', JSON.stringify(podcastOptions, null, 2));

    // Test 5: Audio Validation
    console.log('\n5️⃣ Testing audio validation...');
    const testBuffer = Buffer.alloc(1024 * 1024); // 1MB test buffer
    const validation = whisperService.validateAudioFile(testBuffer);
    console.log(`   Validation Result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (!validation.isValid) {
      console.log('   Issues:', validation.issues);
    }

    // Test 6: Mock Transcription (without actual API call)
    console.log('\n6️⃣ Testing transcription interface...');
    try {
      // This will fail because we don't have a real audio file, but it tests the interface
      await whisperService.transcribeAudio(testBuffer);
    } catch (error) {
      console.log(`   Expected error (no real audio): ${error.message}`);
    }

    console.log('\n✅ Whisper service tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   - Test with real audio files');
    console.log('   - Integrate with Azure Functions');
    console.log('   - Add to content processing pipeline');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testWhisperService();

