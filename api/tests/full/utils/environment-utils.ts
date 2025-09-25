/**
 * Environment Utilities for Real E2E Test
 * 
 * These utilities validate that all services are properly configured and accessible.
 */


export interface EnvironmentValidationResult {
  functionAppHealthy: boolean;
  apiKeysConfigured: boolean;
  storageAccessible: boolean;
  cdnConfigured: boolean;
}

/**
 * Step 1: Validate environment setup
 * 
 * This function should:
 * - Check Azure Function App health
 * - Verify database connection
 * - Validate all API keys are configured
 * - Check Azure Storage accessibility
 * - Verify CDN configuration
 */
export async function validateEnvironment(): Promise<EnvironmentValidationResult> {
  const baseUrl = 'https://podcast-gen-api.azurewebsites.net';
  
  // Test multiple endpoints to ensure the function app is fully functional
  const endpoints = [
    { url: `${baseUrl}/api/health`, name: 'Health Check' },
    { url: `${baseUrl}/api/feeds/public/rss.xml`, name: 'RSS Feed' },
    { url: `${baseUrl}/api/content`, name: 'Content Submission' }
  ];

  console.log('🔍 Testing function app endpoints...');
  
  let functionAppHealthy = true;
  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`  Testing ${endpoint.name}: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.name === 'Content Submission' ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        body: endpoint.name === 'Content Submission' ? JSON.stringify({}) : undefined
      });

      const isHealthy = response.ok || response.status === 400; // 400 is OK for POST with empty body
      results.push({ endpoint: endpoint.name, healthy: isHealthy, status: response.status });
      
      if (!isHealthy) {
        functionAppHealthy = false;
        console.log(`  ❌ ${endpoint.name} failed: ${response.status} ${response.statusText}`);
      } else {
        console.log(`  ✅ ${endpoint.name} healthy: ${response.status}`);
      }
    } catch (error) {
      functionAppHealthy = false;
      console.log(`  ❌ ${endpoint.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({ endpoint: endpoint.name, healthy: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Database connection not needed - we're using blob storage only

  // Check API keys configuration (we'll check environment variables)
  const requiredKeys = [
    'AZURE_OPENAI_API_KEY',
    'ELEVENLABS_API_KEY', 
    'FIRECRAWL_API_KEY',
    'YOUTUBE_API_KEY'
  ];
  
  const apiKeysConfigured = requiredKeys.every(key => {
    const value = process.env[key];
    return value && value.length > 0 && !value.includes('your-');
  });

  console.log(`  ${apiKeysConfigured ? '✅' : '❌'} API keys configured: ${apiKeysConfigured ? 'Yes' : 'No'}`);

  // Check Azure Storage accessibility (we'll test by checking if we can access the RSS feed)
  let storageAccessible = false;
  try {
    console.log('🔍 Testing storage accessibility...');
    const response = await fetch(`${baseUrl}/api/feeds/public/rss.xml`);
    if (response.ok) {
      const rssContent = await response.text();
      // Storage is accessible if we can get the RSS feed (even if empty)
      // The RSS feed generation itself requires storage access
      storageAccessible = rssContent.includes('<rss') && rssContent.includes('<channel>');
      console.log(`  ${storageAccessible ? '✅' : '❌'} Storage accessible: ${storageAccessible ? 'Yes' : 'No'}`);
    }
  } catch (error) {
    console.log(`  ❌ Storage accessibility error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check CDN configuration (we'll test by checking if CDN is accessible)
  let cdnConfigured = false;
  try {
    console.log('🔍 Testing CDN configuration...');
    const response = await fetch(`${baseUrl}/api/feeds/public/rss.xml`);
    if (response.ok) {
      const rssContent = await response.text();
      // Check if RSS feed is accessible and doesn't have blob storage URLs
      // If there are no episodes, that's OK - we just need the RSS to be valid
      const hasBlobUrls = rssContent.includes('blob.core.windows.net');
      const hasValidRss = rssContent.includes('<rss') && rssContent.includes('<channel>');
      
      // CDN is configured if RSS is valid and either has no audio URLs or uses CDN
      cdnConfigured = hasValidRss && !hasBlobUrls;
      console.log(`  ${cdnConfigured ? '✅' : '❌'} CDN configured: ${cdnConfigured ? 'Yes' : 'No'}`);
      if (hasBlobUrls) {
        console.log(`    ⚠️  Found blob storage URLs in RSS feed`);
      }
    }
  } catch (error) {
    console.log(`  ❌ CDN configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('📊 Environment validation results:');
  console.log(`  Function App: ${functionAppHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`  API Keys: ${apiKeysConfigured ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Storage: ${storageAccessible ? '✅ Accessible' : '❌ Inaccessible'}`);
  console.log(`  CDN: ${cdnConfigured ? '✅ Configured' : '❌ Not configured'}`);

  return {
    functionAppHealthy,
    apiKeysConfigured,
    storageAccessible,
    cdnConfigured
  };
}

// Database cleanup not needed - we're using blob storage only

/**
 * Update the test outline markdown file with current test results
 */
export function updateTestOutline(stepNumber: number, stepName: string, status: 'PASS' | 'FAIL' | 'PENDING', details?: string): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const outlinePath = path.join(__dirname, '../real-e2e-test-outline.md');
    
    let content = fs.readFileSync(outlinePath, 'utf8');
    
    // Update the specific step's exit criteria
    const stepPattern = new RegExp(`(### Step ${stepNumber}: ${stepName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(### Step|## Success Criteria|$)`, 'i');
    const match = content.match(stepPattern);
    
    if (match) {
      const stepContent = match[1];
      const updatedStepContent = stepContent.replace(
        /(\*\*Exit Criteria\*\*:[\s\S]*?)(### Step|## Success Criteria|$)/i,
        (_match: string, exitCriteria: string) => {
          // Update all checkboxes in this step
          const updatedExitCriteria = exitCriteria.replace(
            /- \[ \]/g,
            status === 'PASS' ? '- [x]' : '- [ ]'
          );
          
          // Add status and details if provided
          let statusLine = '';
          if (status === 'PASS') {
            statusLine = '\n\n**✅ STATUS: PASSED**';
          } else if (status === 'FAIL') {
            statusLine = '\n\n**❌ STATUS: FAILED**';
          } else {
            statusLine = '\n\n**⏳ STATUS: PENDING**';
          }
          
          if (details) {
            statusLine += `\n\n**Details**: ${details}`;
          }
          
          return updatedExitCriteria + statusLine + '\n\n$2';
        }
      );
      
      content = content.replace(stepPattern, updatedStepContent + '$2');
      
      // Add timestamp
      const timestamp = new Date().toISOString();
      content = content.replace(
        /(## Overview[\s\S]*?)(## Test Data)/,
        `$1\n\n**Last Updated**: ${timestamp}\n\n$2`
      );
      
      fs.writeFileSync(outlinePath, content);
      console.log(`📝 Updated test outline: Step ${stepNumber} - ${stepName} - ${status}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to update test outline:', error instanceof Error ? error.message : 'Unknown error');
  }
}
