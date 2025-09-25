#!/usr/bin/env node

/**
 * Force Podcast Refresh Script
 * Forces podcast apps to refresh by invalidating caches and adding cache-busting parameters
 */

const https = require('https');

// Configuration
const CONFIG = {
  baseUrl: process.env.FUNCTION_APP_URL || 'https://your-function-app.azurewebsites.net',
  cdnBaseUrl: 'https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net',
  apiKey: process.env.API_KEY || '',
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
        'User-Agent': 'PodcastRefreshScript/1.0'
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

async function invalidateCaches() {
  console.log('🔄 Invalidating caches...\n');
  
  try {
    // Invalidate CDN cache
    console.log('1. Invalidating CDN cache...');
    const cdnResponse = await makeRequest('POST', '/api/cdn-management?action=invalidate', {
      contentPaths: [
        '/feeds/*',
        '/rss/*',
        '/audio/*'
      ]
    });
    
    if (cdnResponse.status === 200) {
      console.log('   ✅ CDN cache invalidated successfully');
    } else {
      console.log('   ⚠️  CDN cache invalidation failed or not available');
    }
    
    // Force RSS feed refresh
    console.log('\n2. Forcing RSS feed refresh...');
    const rssResponse = await makeRequest('GET', '/api/feeds/public/rss.xml?refresh=true&t=' + Date.now());
    
    if (rssResponse.status === 200) {
      console.log('   ✅ RSS feed refreshed successfully');
      console.log(`   📊 Feed size: ${rssResponse.body.length} characters`);
    } else {
      console.log('   ❌ RSS feed refresh failed');
    }
    
    // Purge CDN cache for audio files
    console.log('\n3. Purging audio file cache...');
    const purgeResponse = await makeRequest('POST', '/api/storage-management?action=purge-cdn');
    
    if (purgeResponse.status === 200) {
      console.log('   ✅ Audio file cache purged');
    } else {
      console.log('   ⚠️  Audio file cache purge failed or not available');
    }
    
  } catch (error) {
    console.error('❌ Error invalidating caches:', error.message);
  }
}

async function generateCacheBustingUrls() {
  console.log('\n🔗 Cache-busting URLs for podcast apps:\n');
  
  const timestamp = Date.now();
  const baseRssUrl = `${CONFIG.baseUrl}/api/feeds/public/rss.xml`;
  
  console.log('Add these URLs to your podcast app:');
  console.log('=====================================');
  console.log(`1. RSS Feed (with cache busting):`);
  console.log(`   ${baseRssUrl}?t=${timestamp}&refresh=true`);
  console.log('');
  console.log(`2. RSS Feed (force refresh):`);
  console.log(`   ${baseRssUrl}?v=${Date.now()}&nocache=1`);
  console.log('');
  console.log(`3. CDN RSS Feed (if available):`);
  console.log(`   ${CONFIG.cdnBaseUrl}/feeds/public/rss.xml?t=${timestamp}`);
  console.log('');
  console.log('4. Test individual episode URLs:');
  console.log(`   ${CONFIG.cdnBaseUrl}/audio/[episode-id].mp3?t=${timestamp}`);
}

async function testRssFeed() {
  console.log('\n🧪 Testing RSS feed...\n');
  
  try {
    const response = await makeRequest('GET', '/api/feeds/public/rss.xml?t=' + Date.now());
    
    if (response.status === 200) {
      console.log('✅ RSS feed is accessible');
      console.log(`📊 Response size: ${response.body.length} characters`);
      console.log(`📅 Last-Modified: ${response.headers['last-modified'] || 'Not set'}`);
      console.log(`🏷️  ETag: ${response.headers['etag'] || 'Not set'}`);
      console.log(`⏱️  Cache-Control: ${response.headers['cache-control'] || 'Not set'}`);
      
      // Check if URLs are using CDN
      const rssContent = response.body;
      const cdnUrlCount = (rssContent.match(/podcastgen-cdn/g) || []).length;
      const blobUrlCount = (rssContent.match(/podcastgenstorage\.blob\.core\.windows\.net/g) || []).length;
      
      console.log(`\n🔍 URL Analysis:`);
      console.log(`   CDN URLs: ${cdnUrlCount}`);
      console.log(`   Blob URLs: ${blobUrlCount}`);
      
      if (cdnUrlCount > 0 && blobUrlCount === 0) {
        console.log('   ✅ All URLs are using CDN');
      } else if (blobUrlCount > 0) {
        console.log('   ❌ Some URLs are still using blob storage');
      } else {
        console.log('   ⚠️  No audio URLs found in RSS feed');
      }
      
    } else {
      console.log(`❌ RSS feed test failed with status ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing RSS feed:', error.message);
  }
}

async function providePodcastAppInstructions() {
  console.log('\n📱 Instructions for Podcast Apps:\n');
  
  console.log('1. APPLE PODCASTS:');
  console.log('   - Go to Library > Shows > [Your Podcast]');
  console.log('   - Pull down to refresh or swipe left and tap "Refresh"');
  console.log('   - Or remove and re-add the podcast feed');
  console.log('');
  
  console.log('2. SPOTIFY:');
  console.log('   - Go to Your Library > Podcasts');
  console.log('   - Find your podcast and tap the three dots');
  console.log('   - Select "Refresh" or "Update"');
  console.log('');
  
  console.log('3. GOOGLE PODCASTS:');
  console.log('   - Go to Library > Subscriptions');
  console.log('   - Tap on your podcast');
  console.log('   - Pull down to refresh');
  console.log('');
  
  console.log('4. POCKET CASTS:');
  console.log('   - Go to Podcasts tab');
  console.log('   - Long press on your podcast');
  console.log('   - Select "Refresh"');
  console.log('');
  
  console.log('5. OVERCAST:');
  console.log('   - Go to Library');
  console.log('   - Pull down to refresh all podcasts');
  console.log('   - Or tap the refresh icon');
  console.log('');
  
  console.log('6. GENERAL TROUBLESHOOTING:');
  console.log('   - Wait 5-10 minutes for caches to clear');
  console.log('   - Try removing and re-adding the podcast');
  console.log('   - Clear the app cache/data');
  console.log('   - Restart the podcast app');
  console.log('   - Check your internet connection');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  console.log('🔄 Podcast Refresh Tool\n');
  
  switch (command) {
    case 'invalidate':
      await invalidateCaches();
      break;
    case 'urls':
      await generateCacheBustingUrls();
      break;
    case 'test':
      await testRssFeed();
      break;
    case 'instructions':
      await providePodcastAppInstructions();
      break;
    case 'all':
      await invalidateCaches();
      await generateCacheBustingUrls();
      await testRssFeed();
      await providePodcastAppInstructions();
      break;
    default:
      console.log('Usage:');
      console.log('  node force-podcast-refresh.js invalidate   - Invalidate caches');
      console.log('  node force-podcast-refresh.js urls        - Generate cache-busting URLs');
      console.log('  node force-podcast-refresh.js test        - Test RSS feed');
      console.log('  node force-podcast-refresh.js instructions - Show app instructions');
      console.log('  node force-podcast-refresh.js all         - Run everything');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { invalidateCaches, generateCacheBustingUrls, testRssFeed };
