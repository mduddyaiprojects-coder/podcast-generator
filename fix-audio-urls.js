#!/usr/bin/env node

/**
 * Fix Audio URLs Script
 * Converts direct Azure Blob Storage URLs to CDN URLs for podcast episodes
 */

const { Pool } = require('pg');

// Database configuration
const databaseUrl = "postgresql://pgadmin:qasbiq-2vogby-Cidbys@pg-m4c-core.postgres.database.azure.com:5432/podcast_generator?sslmode=require";

// CDN configuration from your local.settings.json
const CDN_BASE_URL = "https://podcastgen-cdn-exa2dkdcebdfbfct.z02.azurefd.net";
const BLOB_BASE_URL = "https://podcastgenstorage.blob.core.windows.net/podcast-audio";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 10000,
});

function convertBlobUrlToCdnUrl(blobUrl) {
  if (!blobUrl || !blobUrl.includes(BLOB_BASE_URL)) {
    return blobUrl; // Return as-is if not a blob URL
  }
  
  // Extract the path after the blob base URL
  const path = blobUrl.replace(BLOB_BASE_URL, '');
  
  // Construct CDN URL
  return `${CDN_BASE_URL}${path}`;
}

async function fixAudioUrls() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing audio URLs to use CDN...\n');
    
    // Get all episodes with blob URLs
    const result = await client.query(`
      SELECT 
        id, 
        title, 
        audio_url,
        created_at
      FROM podcast_episodes 
      WHERE audio_url LIKE '%podcastgenstorage.blob.core.windows.net%'
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${result.rows.length} episodes with blob URLs that need to be converted to CDN URLs:\n`);
    
    let updatedCount = 0;
    
    for (const episode of result.rows) {
      const oldUrl = episode.audio_url;
      const newUrl = convertBlobUrlToCdnUrl(oldUrl);
      
      console.log(`Episode: ${episode.title}`);
      console.log(`  Old URL: ${oldUrl}`);
      console.log(`  New URL: ${newUrl}`);
      
      // Update the episode with the new CDN URL
      await client.query(
        'UPDATE podcast_episodes SET audio_url = $1, updated_at = NOW() WHERE id = $2',
        [newUrl, episode.id]
      );
      
      console.log(`  ✅ Updated\n`);
      updatedCount++;
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} episodes to use CDN URLs!`);
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const verifyResult = await client.query(`
      SELECT 
        id, 
        title, 
        audio_url
      FROM podcast_episodes 
      ORDER BY updated_at DESC
      LIMIT 3
    `);
    
    console.log('Recent episodes with updated URLs:');
    verifyResult.rows.forEach((episode, index) => {
      console.log(`${index + 1}. ${episode.title}`);
      console.log(`   URL: ${episode.audio_url}`);
      console.log(`   CDN: ${episode.audio_url.includes('podcastgen-cdn') ? '✅' : '❌'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error fixing audio URLs:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function checkCurrentUrls() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current audio URL status...\n');
    
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE audio_url LIKE '%podcastgenstorage.blob.core.windows.net%') as blob_urls,
        COUNT(*) FILTER (WHERE audio_url LIKE '%podcastgen-cdn%') as cdn_urls,
        COUNT(*) FILTER (WHERE audio_url IS NOT NULL) as total_with_audio
      FROM podcast_episodes
    `);
    
    const stats = result.rows[0];
    console.log(`📊 Audio URL Statistics:`);
    console.log(`  Total episodes with audio: ${stats.total_with_audio}`);
    console.log(`  Using blob URLs: ${stats.blob_urls}`);
    console.log(`  Using CDN URLs: ${stats.cdn_urls}`);
    console.log('');
    
    if (stats.blob_urls > 0) {
      console.log('❌ Some episodes still use blob URLs - run the fix script');
    } else {
      console.log('✅ All episodes are using CDN URLs');
    }
    
  } catch (error) {
    console.error('❌ Error checking URLs:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  console.log('🎙️  Audio URL Fixer Tool\n');
  
  switch (command) {
    case 'check':
      await checkCurrentUrls();
      break;
    case 'fix':
      await fixAudioUrls();
      break;
    case 'both':
      await checkCurrentUrls();
      console.log('\n' + '='.repeat(50) + '\n');
      await fixAudioUrls();
      break;
    default:
      console.log('Usage:');
      console.log('  node fix-audio-urls.js check  - Check current URL status');
      console.log('  node fix-audio-urls.js fix    - Fix URLs to use CDN');
      console.log('  node fix-audio-urls.js both   - Check then fix');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convertBlobUrlToCdnUrl, fixAudioUrls, checkCurrentUrls };
