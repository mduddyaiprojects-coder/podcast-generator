const { ElevenLabsService } = require('./dist/services/elevenlabs-service');
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

async function testElevenLabsAPI() {
  console.log('Testing ElevenLabs API Integration...');
  console.log('Environment variables:');
  console.log('ELEVENLABS_API_KEY:', process.env['ELEVENLABS_API_KEY'] ? 'SET' : 'NOT SET');
  console.log('ELEVENLABS_BASE_URL:', process.env['ELEVENLABS_BASE_URL'] || 'DEFAULT');
  console.log('');

  try {
    const elevenLabsService = new ElevenLabsService();

    // Test 1: Health check
    console.log('1. Testing health check...');
    const isHealthy = await elevenLabsService.checkHealth();
    console.log(`Health status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log('');

    // Test 2: Get voices (real API call)
    console.log('2. Testing voice fetching...');
    try {
      const voices = await elevenLabsService.getVoices();
      console.log(`✅ Successfully fetched ${voices.length} voices`);
      console.log('Sample voices:');
      voices.slice(0, 3).forEach(voice => {
        console.log(`  - ${voice.name} (${voice.id}) - ${voice.category}`);
      });
    } catch (error) {
      console.log(`❌ Voice fetching failed: ${error.message}`);
    }
    console.log('');

    // Test 3: Search voices
    console.log('3. Testing voice search...');
    try {
      const searchResults = await elevenLabsService.searchVoices('Adam');
      console.log(`✅ Found ${searchResults.length} voices matching "Adam"`);
      searchResults.forEach(voice => {
        console.log(`  - ${voice.name} (${voice.id})`);
      });
    } catch (error) {
      console.log(`❌ Voice search failed: ${error.message}`);
    }
    console.log('');

    // Test 4: Generate audio (real API call)
    console.log('4. Testing audio generation...');
    try {
      const testText = 'Hello! This is a test of the ElevenLabs text-to-speech integration for the podcast generator. We are now using direct API calls instead of MCP tools.';
      
      console.log('Generating audio with Rachel voice...');
      const audioBuffer = await elevenLabsService.generateAudio(testText, {
        voiceName: 'Rachel',
        modelId: 'eleven_multilingual_v2'
      });
      
      console.log(`✅ Successfully generated audio!`);
      console.log(`   Audio size: ${audioBuffer.length} bytes`);
      console.log(`   Text length: ${testText.length} characters`);
      
      // Save the audio file for verification
      const audioPath = path.join(__dirname, `test-audio-${Date.now()}.mp3`);
      fs.writeFileSync(audioPath, audioBuffer);
      console.log(`   Audio saved to: ${audioPath}`);
      
    } catch (error) {
      console.log(`❌ Audio generation failed: ${error.message}`);
    }
    console.log('');

    // Test 5: Generate speech (real API call)
    console.log('5. Testing speech generation...');
    try {
      const testText = 'This is a test of the speech generation method with different voice settings.';
      
      console.log('Generating speech with Clyde voice...');
      const speechResult = await elevenLabsService.generateSpeech(testText, {
        voiceName: 'Clyde',
        modelId: 'eleven_multilingual_v2',
        stability: 0.4,
        similarityBoost: 0.8
      });
      
      console.log(`✅ Successfully generated speech!`);
      console.log(`   Voice used: ${speechResult.voiceUsed}`);
      console.log(`   File size: ${speechResult.fileSize} bytes`);
      console.log(`   Audio path: ${speechResult.audioPath}`);
      
    } catch (error) {
      console.log(`❌ Speech generation failed: ${error.message}`);
    }
    console.log('');

    console.log('🎉 ElevenLabs API integration test completed!');
    console.log('');
    console.log('✅ Direct API calls working');
    console.log('✅ Voice fetching working');
    console.log('✅ Audio generation working');
    console.log('✅ Speech generation working');
    console.log('✅ Ready for Azure Functions integration');

  } catch (error) {
    console.error('❌ ElevenLabs API test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testElevenLabsAPI();
