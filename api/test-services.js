#!/usr/bin/env node
/**
 * Test script to validate each service in the processing pipeline
 * Run this locally to find which service is failing
 */

const { FirecrawlService } = require('./dist/services/firecrawl-service');
const { AzureOpenAIService } = require('./dist/services/azure-openai-service');

async function testFirecrawl() {
  console.log('\n=== Testing Firecrawl Service ===');
  try {
    const firecrawl = new FirecrawlService();
    console.log('Testing with URL: https://paulgraham.com/love.html');
    
    const result = await firecrawl.extractContent('https://paulgraham.com/love.html');
    console.log('✅ Firecrawl SUCCESS');
    console.log(`Title: ${result.title}`);
    console.log(`Content length: ${result.content.length} chars`);
    console.log(`Author: ${result.author || 'N/A'}`);
    return result;
  } catch (error) {
    console.log('❌ Firecrawl FAILED:');
    console.log(error.message);
    throw error;
  }
}

async function testOpenAI(content) {
  console.log('\n=== Testing Azure OpenAI Service ===');
  try {
    const openai = new AzureOpenAIService();
    console.log('Generating summary...');
    
    const summary = await openai.generateSummary(content.content.substring(0, 2000));
    console.log('✅ OpenAI Summary SUCCESS');
    console.log(`Summary: ${summary}`);
    
    console.log('\nGenerating podcast script...');
    const script = await openai.generatePodcastScript({
      title: content.title,
      content: content.content,
      summary: summary,
      metadata: {}
    });
    console.log('✅ OpenAI Script SUCCESS');
    console.log(`Script length: ${script.length} chars`);
    console.log(`First 200 chars: ${script.substring(0, 200)}...`);
    return script;
  } catch (error) {
    console.log('❌ OpenAI FAILED:');
    console.log(error.message);
    throw error;
  }
}

async function main() {
  console.log('========================================');
  console.log('Content Processing Pipeline Test');
  console.log('========================================');
  
  try {
    // Test 1: Firecrawl
    const extractedContent = await testFirecrawl();
    
    // Test 2: Azure OpenAI
    await testOpenAI(extractedContent);
    
    console.log('\n========================================');
    console.log('✅ All services working!');
    console.log('========================================');
    console.log('\nThe issue might be:');
    console.log('1. TTS service (not tested here)');
    console.log('2. Blob storage upload');
    console.log('3. Function timeout (Y1 plan has 5-10 min limit)');
    
  } catch (error) {
    console.log('\n========================================');
    console.log('❌ Pipeline test failed');
    console.log('========================================');
    console.log('\nFix the failing service above, then redeploy.');
  }
}

main();
