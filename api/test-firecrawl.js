const { FirecrawlService } = require('./dist/services/firecrawl-service');

async function testFirecrawl() {
  console.log('Testing Firecrawl Service...');
  console.log('Environment variables:');
  console.log('FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? 'SET' : 'NOT SET');
  console.log('FIRECRAWL_API_URL:', process.env.FIRECRAWL_API_URL || 'default');
  
  const firecrawlService = new FirecrawlService();
  
  try {
    console.log('\n1. Testing health check...');
    const isHealthy = await firecrawlService.checkHealth();
    console.log('Health status:', isHealthy ? 'HEALTHY' : 'UNHEALTHY');
    
    if (!isHealthy) {
      console.log('❌ Service is not healthy. Check your API key.');
      return;
    }
    
    console.log('\n2. Testing content extraction...');
    const testUrl = 'https://example.com';
    console.log('Extracting content from:', testUrl);
    
    const result = await firecrawlService.extractContent(testUrl);
    
    console.log('✅ Extraction successful!');
    console.log('Title:', result.title);
    console.log('Author:', result.author || 'Not found');
    console.log('Published Date:', result.publishedDate || 'Not found');
    console.log('Content length:', result.content.length, 'characters');
    console.log('Content preview:', result.content.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Load environment variables from local.settings.json
const fs = require('fs');
const path = require('path');

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

testFirecrawl();
