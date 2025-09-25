#!/usr/bin/env node

/**
 * Query Episodes Script
 * Uses the existing DatabaseService to query podcast episodes
 */

const { Pool } = require('pg');

// Database configuration from your local.settings.json
const databaseUrl = "postgresql://pgadmin:qasbiq-2vogby-Cidbys@pg-m4c-core.postgres.database.azure.com:5432/podcast_generator?sslmode=require";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 10000,
});

async function queryEpisodes() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Querying podcast episodes...\n');
    
    // Basic episode count
    const countResult = await client.query('SELECT COUNT(*) as total FROM podcast_episodes');
    console.log(`📊 Total episodes: ${countResult.rows[0].total}\n`);
    
    // Episodes by age groups
    console.log('📅 Episodes by age groups:');
    const ageGroupsResult = await client.query(`
      SELECT 
        CASE 
          WHEN created_at > NOW() - INTERVAL '7 days' THEN 'Last 7 days'
          WHEN created_at > NOW() - INTERVAL '30 days' THEN '7-30 days'
          WHEN created_at > NOW() - INTERVAL '90 days' THEN '30-90 days'
          ELSE 'Older than 90 days'
        END as age_group,
        COUNT(*) as episode_count,
        SUM(audio_size) as total_size_bytes,
        ROUND(SUM(audio_size) / 1024.0 / 1024.0 / 1024.0, 2) as total_size_gb,
        ROUND(AVG(audio_duration), 2) as avg_duration_seconds
      FROM podcast_episodes 
      GROUP BY 
        CASE 
          WHEN created_at > NOW() - INTERVAL '7 days' THEN 'Last 7 days'
          WHEN created_at > NOW() - INTERVAL '30 days' THEN '7-30 days'
          WHEN created_at > NOW() - INTERVAL '90 days' THEN '30-90 days'
          ELSE 'Older than 90 days'
        END
      ORDER BY MIN(created_at)
    `);
    
    ageGroupsResult.rows.forEach(row => {
      console.log(`  ${row.age_group}: ${row.episode_count} episodes (${row.total_size_gb} GB)`);
    });
    
    console.log('\n📋 Recent episodes (last 10):');
    const recentResult = await client.query(`
      SELECT 
        id, 
        title, 
        created_at,
        audio_duration,
        audio_size,
        EXTRACT(DAYS FROM NOW() - created_at) as days_old
      FROM podcast_episodes 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    recentResult.rows.forEach(row => {
      console.log(`  • ${row.title} (${row.days_old} days old, ${row.audio_duration}s, ${Math.round(row.audio_size / 1024 / 1024)}MB)`);
    });
    
    console.log('\n🗑️  Episodes older than 30 days:');
    const oldResult = await client.query(`
      SELECT 
        id, 
        title, 
        created_at,
        audio_url,
        audio_size,
        EXTRACT(DAYS FROM NOW() - created_at) as days_old
      FROM podcast_episodes 
      WHERE created_at < NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `);
    
    if (oldResult.rows.length === 0) {
      console.log('  No episodes older than 30 days found.');
    } else {
      console.log(`  Found ${oldResult.rows.length} episodes older than 30 days:`);
      oldResult.rows.forEach(row => {
        console.log(`    • ${row.title} (${row.days_old} days old, ${Math.round(row.audio_size / 1024 / 1024)}MB)`);
      });
    }
    
    console.log('\n📊 Storage summary:');
    const storageResult = await client.query(`
      SELECT 
        COUNT(*) as total_episodes,
        SUM(audio_size) as total_size_bytes,
        ROUND(SUM(audio_size) / 1024.0 / 1024.0 / 1024.0, 2) as total_size_gb,
        ROUND(AVG(audio_size) / 1024.0 / 1024.0, 2) as avg_size_mb,
        MIN(created_at) as oldest_episode,
        MAX(created_at) as newest_episode
      FROM podcast_episodes
    `);
    
    const storage = storageResult.rows[0];
    console.log(`  Total episodes: ${storage.total_episodes}`);
    console.log(`  Total size: ${storage.total_size_gb} GB`);
    console.log(`  Average size: ${storage.avg_size_mb} MB`);
    console.log(`  Oldest episode: ${storage.oldest_episode}`);
    console.log(`  Newest episode: ${storage.newest_episode}`);
    
  } catch (error) {
    console.error('❌ Error querying episodes:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the query
queryEpisodes().catch(console.error);
