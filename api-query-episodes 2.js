#!/usr/bin/env node

/**
 * API Query Episodes Script
 * Uses your existing API endpoints to query and manage episodes
 */

const https = require('https');

// Configuration - update these with your actual function app URL
const CONFIG = {
  baseUrl: process.env.FUNCTION_APP_URL || 'https://your-function-app.azurewebsites.net',
  apiKey: process.env.API_KEY || '', // Add if you have API key authentication
};

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EpisodeQueryScript/1.0'
      }
    };

    if (CONFIG.apiKey) {
      options.headers['Authorization'] = `Bearer ${CONFIG.apiKey}`;
    }

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function queryEpisodes() {
  console.log('🔍 Querying episodes using your API...\n');
  
  try {
    // Test database connection first
    console.log('📡 Testing database connection...');
    const dbTest = await makeRequest('GET', '/api/test-db');
    
    if (dbTest.status !== 200) {
      console.error('❌ Database connection failed:', dbTest.body);
      return;
    }
    
    console.log('✅ Database connection successful');
    console.log(`📊 Total episodes: ${dbTest.body.episodeCount}\n`);
    
    // Get episodes list
    console.log('📋 Getting episodes list...');
    const episodesResponse = await makeRequest('GET', '/api/feeds/public/episodes?limit=50');
    
    if (episodesResponse.status !== 200) {
      console.error('❌ Failed to get episodes:', episodesResponse.body);
      return;
    }
    
    const episodes = episodesResponse.body.episodes || [];
    console.log(`📋 Found ${episodes.length} episodes:\n`);
    
    episodes.forEach((episode, index) => {
      const pubDate = new Date(episode.pubDate);
      const daysOld = Math.floor((new Date() - pubDate) / (1000 * 60 * 60 * 24));
      const duration = episode.duration ? `${Math.floor(episode.duration / 60)}:${(episode.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
      
      console.log(`${index + 1}. ${episode.title}`);
      console.log(`   Published: ${pubDate.toLocaleDateString()} (${daysOld} days ago)`);
      console.log(`   Duration: ${duration}`);
      console.log(`   URL: ${episode.enclosure?.url || 'No audio URL'}`);
      console.log('');
    });
    
    // Get storage statistics
    console.log('💾 Getting storage statistics...');
    const storageStats = await makeRequest('GET', '/api/storage-management?action=stats');
    
    if (storageStats.status === 200) {
      console.log('📊 Storage Statistics:');
      console.log(`   Total files: ${storageStats.body.totalFiles || 'Unknown'}`);
      console.log(`   Total size: ${storageStats.body.totalSize || 'Unknown'} bytes`);
      console.log(`   Last modified: ${storageStats.body.lastModified || 'Unknown'}`);
    }
    
    // Get cost optimization recommendations
    console.log('\n💰 Getting cost optimization recommendations...');
    const costOpt = await makeRequest('POST', '/api/storage-management?action=cost-optimization');
    
    if (costOpt.status === 200) {
      console.log('💡 Cost Optimization Recommendations:');
      console.log(`   Total potential savings: $${costOpt.body.totalPotentialSavings || 0}`);
      console.log(`   Recommendations: ${costOpt.body.recommendations?.length || 0}`);
      
      if (costOpt.body.recommendations && costOpt.body.recommendations.length > 0) {
        costOpt.body.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec.description} ($${rec.potentialSavings?.toFixed(2) || 0})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error querying episodes:', error.message);
    console.log('\n💡 Make sure to:');
    console.log('   1. Update the FUNCTION_APP_URL in the script');
    console.log('   2. Ensure your function app is running');
    console.log('   3. Check if you need an API key');
  }
}

async function runLifecycleManagement() {
  console.log('🔄 Running lifecycle management...\n');
  
  try {
    const response = await makeRequest('POST', '/api/storage-management?action=lifecycle');
    
    if (response.status !== 200) {
      console.error('❌ Lifecycle management failed:', response.body);
      return;
    }
    
    console.log('✅ Lifecycle management completed:');
    console.log(`   Files processed: ${response.body.totalFilesProcessed || 0}`);
    console.log(`   Files deleted: ${response.body.filesDeleted || 0}`);
    console.log(`   Files tiered to Cool: ${response.body.filesTieredToCool || 0}`);
    console.log(`   Files tiered to Archive: ${response.body.filesTieredToArchive || 0}`);
    console.log(`   Estimated cost savings: $${response.body.estimatedCostSavings || 0}`);
    console.log(`   Execution time: ${response.body.executionTime || 0}ms`);
    
  } catch (error) {
    console.error('❌ Error running lifecycle management:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'query';
  
  console.log('🎙️  Podcast Generator API Query Tool\n');
  
  switch (command) {
    case 'query':
      await queryEpisodes();
      break;
    case 'lifecycle':
      await runLifecycleManagement();
      break;
    case 'both':
      await queryEpisodes();
      console.log('\n' + '='.repeat(50) + '\n');
      await runLifecycleManagement();
      break;
    default:
      console.log('Usage:');
      console.log('  node api-query-episodes.js query      - Query episodes and stats');
      console.log('  node api-query-episodes.js lifecycle  - Run lifecycle management');
      console.log('  node api-query-episodes.js both       - Run both');
      console.log('\nMake sure to update FUNCTION_APP_URL in the script!');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { queryEpisodes, runLifecycleManagement };
