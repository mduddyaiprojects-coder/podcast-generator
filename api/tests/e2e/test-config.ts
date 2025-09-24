/**
 * Test Configuration for E2E Tests
 * 
 * This file provides configuration to run E2E tests without external dependencies.
 */

// Load environment variables from local.settings.json for E2E tests
process.env['NODE_ENV'] = 'test';

// Load real API keys from local.settings.json for E2E testing
import * as fs from 'fs';
import * as path from 'path';

const localSettingsPath = path.join(__dirname, '../../local.settings.json');
if (fs.existsSync(localSettingsPath)) {
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
  const values = localSettings.Values || {};
  
  // Load real API keys for E2E testing
  if (values['AZURE_OPENAI_API_KEY']) process.env['AZURE_OPENAI_API_KEY'] = values['AZURE_OPENAI_API_KEY'];
  if (values['AZURE_OPENAI_ENDPOINT']) process.env['AZURE_OPENAI_ENDPOINT'] = values['AZURE_OPENAI_ENDPOINT'];
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

// Mock external service responses
export const mockResponses = {
  firecrawl: {
    success: {
      title: 'Test Article: AI and Machine Learning',
      content: 'Artificial Intelligence and Machine Learning are transforming the way we work and live. From autonomous vehicles to personalized recommendations, AI is becoming increasingly integrated into our daily lives. Machine learning algorithms can analyze vast amounts of data to identify patterns and make predictions. This technology has applications in healthcare, finance, transportation, and many other industries. However, with great power comes great responsibility. We must ensure that AI systems are developed ethically and transparently, with proper safeguards to protect privacy and prevent bias. The future of AI looks promising, but it requires careful consideration of its implications for society.',
      url: 'https://example.com/test-article',
      extraction_method: 'url_scraper',
      word_count: 95,
      reading_time_minutes: 1,
      language: 'en',
      quality_score: 88,
      summary: 'A comprehensive look at how AI is transforming society and the challenges we face.',
      metadata: {
        originalUrl: 'https://example.com/test-article',
        originalTitle: 'Test Article: AI and Machine Learning',
        author: 'Test Author',
        publishedDate: new Date(),
        wordCount: 95
      }
    }
  },
  tts: {
    success: {
      audio_buffer: Buffer.from('mock audio data'),
      duration_seconds: 30,
      format: 'mp3',
      sample_rate: 44100,
      bit_rate: 128000
    }
  },
  youtube: {
    success: {
      title: 'Test YouTube Video',
      content: 'This is a test YouTube video about artificial intelligence and machine learning.',
      url: 'https://www.youtube.com/watch?v=test123',
      extraction_method: 'youtube',
      word_count: 50,
      reading_time_minutes: 1,
      language: 'en',
      quality_score: 90,
      summary: 'Test YouTube video about AI and ML',
      metadata: {
        video_id: 'test123',
        channel_title: 'Test Channel',
        duration: '5:00',
        view_count: 1000,
        originalUrl: 'https://www.youtube.com/watch?v=test123',
        originalTitle: 'Test YouTube Video',
        author: 'Test YouTuber',
        publishedDate: new Date(),
        wordCount: 50
      }
    }
  }
};

// Test data
export const testData = {
  submissions: [
    {
      content_url: 'https://example.com/test-article',
      content_type: 'url' as const,
      user_note: 'Test article about AI'
    },
    {
      content_url: 'https://www.youtube.com/watch?v=test123',
      content_type: 'youtube' as const,
      user_note: 'Test YouTube video'
    },
    {
      content_url: 'https://example.com/document.pdf',
      content_type: 'pdf' as const,
      user_note: 'Test PDF document'
    }
  ]
};
