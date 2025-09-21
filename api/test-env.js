// Test environment variable loading
const fs = require('fs');
const path = require('path');

console.log('Testing environment variable loading...');

// Load from local.settings.json
try {
  const settingsPath = path.join(__dirname, 'local.settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  console.log('local.settings.json loaded successfully');
  console.log('YOUTUBE_API_KEY in settings:', settings.Values.YOUTUBE_API_KEY ? 'SET' : 'NOT SET');
  
  // Set environment variables
  Object.keys(settings.Values).forEach(key => {
    process.env[key] = settings.Values[key];
  });
  
  console.log('Environment variables set');
  console.log('YOUTUBE_API_KEY in process.env:', process.env['YOUTUBE_API_KEY'] ? 'SET' : 'NOT SET');
  
} catch (error) {
  console.error('Failed to load local.settings.json:', error.message);
}

// Test YouTube service
const { YouTubeService } = require('./dist/services/youtube-service');

async function test() {
  try {
    const youtubeService = new YouTubeService();
    const isHealthy = await youtubeService.checkHealth();
    console.log('YouTube service health:', isHealthy);
  } catch (error) {
    console.error('YouTube service error:', error.message);
  }
}

test();
