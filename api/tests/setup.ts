// Test setup file
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables for testing
config({ path: '.env.test' });

// Load real API keys from local.settings.json for E2E testing
const localSettingsPath = path.join(__dirname, '../local.settings.json');
if (fs.existsSync(localSettingsPath)) {
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
  const values = localSettings.Values || {};
  
  // Load real API keys for E2E testing
  if (values['AZURE_OPENAI_API_KEY']) process.env['AZURE_OPENAI_API_KEY'] = values['AZURE_OPENAI_API_KEY'];
  if (values['AZURE_OPENAI_ENDPOINT']) process.env['AZURE_OPENAI_ENDPOINT'] = values['AZURE_OPENAI_ENDPOINT'];
  if (values['AZURE_OPENAI_DEPLOYMENT_NAME']) process.env['AZURE_OPENAI_DEPLOYMENT_NAME'] = values['AZURE_OPENAI_DEPLOYMENT_NAME'];
  if (values['AZURE_OPENAI_API_VERSION']) process.env['AZURE_OPENAI_API_VERSION'] = values['AZURE_OPENAI_API_VERSION'];
        if (values['AZURE_OPENAI_WHISPER_API_VERSION']) process.env['AZURE_OPENAI_WHISPER_API_VERSION'] = values['AZURE_OPENAI_WHISPER_API_VERSION'];
        if (values['AZURE_SPEECH_KEY']) process.env['AZURE_SPEECH_KEY'] = values['AZURE_SPEECH_KEY'];
        if (values['AZURE_SPEECH_REGION']) process.env['AZURE_SPEECH_REGION'] = values['AZURE_SPEECH_REGION'];
        if (values['AZURE_SPEECH_VOICE']) process.env['AZURE_SPEECH_VOICE'] = values['AZURE_SPEECH_VOICE'];
        if (values['AZURE_SPEECH_LANGUAGE']) process.env['AZURE_SPEECH_LANGUAGE'] = values['AZURE_SPEECH_LANGUAGE'];
        if (values['ELEVENLABS_API_KEY']) process.env['ELEVENLABS_API_KEY'] = values['ELEVENLABS_API_KEY'];
  if (values['FIRECRAWL_API_KEY']) process.env['FIRECRAWL_API_KEY'] = values['FIRECRAWL_API_KEY'];
  if (values['YOUTUBE_API_KEY']) process.env['YOUTUBE_API_KEY'] = values['YOUTUBE_API_KEY'];
  if (values['AZURE_STORAGE_CONNECTION_STRING']) process.env['AZURE_STORAGE_CONNECTION_STRING'] = values['AZURE_STORAGE_CONNECTION_STRING'];
  if (values['AZURE_STORAGE_CONTAINER_NAME']) process.env['AZURE_STORAGE_CONTAINER_NAME'] = values['AZURE_STORAGE_CONTAINER_NAME'];
  if (values['DATABASE_URL']) process.env['DATABASE_URL'] = values['DATABASE_URL'];
  if (values['CDN_BASE_URL']) process.env['CDN_BASE_URL'] = values['CDN_BASE_URL'];
  if (values['AZURE_SUBSCRIPTION_ID']) process.env['AZURE_SUBSCRIPTION_ID'] = values['AZURE_SUBSCRIPTION_ID'];
  if (values['AZURE_RESOURCE_GROUP']) process.env['AZURE_RESOURCE_GROUP'] = values['AZURE_RESOURCE_GROUP'];
  if (values['CDN_PROFILE_NAME']) process.env['CDN_PROFILE_NAME'] = values['CDN_PROFILE_NAME'];
  if (values['CDN_ENDPOINT_NAME']) process.env['CDN_ENDPOINT_NAME'] = values['CDN_ENDPOINT_NAME'];
}

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['AZURE_FUNCTIONS_ENVIRONMENT'] = 'Development';

// Mock Azure Functions context for testing
(global as any).mockContext = {
  log: jest.fn(),
  bindings: {},
  bindingData: {},
  invocationId: 'test-invocation-id',
  executionContext: {
    invocationId: 'test-invocation-id',
    functionName: 'test-function',
    functionDirectory: '/test',
    retryContext: null
  }
};

// Extend Jest matchers if needed
expect.extend({
  // Add custom matchers here if needed
});
