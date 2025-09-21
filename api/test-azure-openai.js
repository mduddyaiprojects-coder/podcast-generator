const { AzureOpenAIService } = require('./dist/services/azure-openai-service');

async function testAzureOpenAI() {
  console.log('Testing Azure OpenAI Service...');
  console.log('Environment variables:');
  console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT ? 'SET' : 'NOT SET');
  console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? 'SET' : 'NOT SET');
  console.log('AZURE_OPENAI_API_VERSION:', process.env.AZURE_OPENAI_API_VERSION || 'default');
  console.log('AZURE_OPENAI_DEPLOYMENT_NAME:', process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'default');
  
  const azureOpenAIService = new AzureOpenAIService();
  
  try {
    console.log('\n1. Testing health check...');
    const isHealthy = await azureOpenAIService.checkHealth();
    console.log('Health status:', isHealthy ? 'HEALTHY' : 'UNHEALTHY');
    
    if (!isHealthy) {
      console.log('❌ Service is not healthy. Check your Azure OpenAI configuration.');
      return;
    }
    
    console.log('\n2. Testing summary generation...');
    const testContent = `
    Artificial Intelligence (AI) is transforming industries across the globe. 
    From healthcare to finance, AI technologies are enabling new possibilities 
    and improving efficiency. Machine learning algorithms can now process 
    vast amounts of data to identify patterns and make predictions that 
    would be impossible for humans to achieve manually. The future of AI 
    looks promising with continued advances in deep learning, natural language 
    processing, and computer vision technologies.
    `;
    
    console.log('Generating summary for content...');
    const summary = await azureOpenAIService.generateSummary(testContent);
    
    console.log('✅ Summary generation successful!');
    console.log('Summary:', summary);
    
    console.log('\n3. Testing podcast script generation...');
    const extractedContent = {
      title: 'The Future of Artificial Intelligence',
      content: testContent,
      summary: summary,
      metadata: {
        source: 'test',
        wordCount: testContent.split(' ').length
      }
    };
    
    console.log('Generating podcast script...');
    const script = await azureOpenAIService.generatePodcastScript(extractedContent);
    
    console.log('✅ Podcast script generation successful!');
    console.log('Script length:', script.length, 'characters');
    console.log('Word count:', script.split(' ').length, 'words');
    console.log('Script preview:', script.substring(0, 200) + '...');
    
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

testAzureOpenAI();
