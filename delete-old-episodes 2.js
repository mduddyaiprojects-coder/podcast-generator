#!/usr/bin/env node

/**
 * Delete Old Episodes Script
 * Uses the existing DatabaseService pattern to delete old episodes
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

async function executeQuery(queryFn) {
  const client = await pool.connect();
  try {
    return await queryFn(client);
  } finally {
    client.release();
  }
}

async function getEpisodes(limit, offset) {
  return executeQuery(async (client) => {
    let query = `
      SELECT id, submission_id, title, description, source_url, content_type,
             audio_url, audio_duration, audio_size, transcript, dialogue_script,
             summary, chapter_markers, pub_date, created_at, updated_at
      FROM podcast_episodes
      ORDER BY pub_date DESC
    `;
    
    const values = [];
    
    if (limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(limit);
    }
    
    if (offset) {
      query += ` OFFSET $${values.length + 1}`;
      values.push(offset);
    }

    const result = await client.query(query, values);
    return result.rows;
  });
}

async function getEpisodeCount() {
  return executeQuery(async (client) => {
    const result = await client.query('SELECT COUNT(*) as count FROM podcast_episodes');
    return parseInt(result.rows[0].count);
  });
}

async function deleteOldEpisodes(daysOld = 30) {
  return executeQuery(async (client) => {
    // First, get the episodes that will be deleted
    const selectQuery = `
      SELECT id, title, created_at, audio_url, audio_size
      FROM podcast_episodes 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      ORDER BY created_at DESC
    `;
    
    const selectResult = await client.query(selectQuery);
    const episodesToDelete = selectResult.rows;
    
    console.log(`Found ${episodesToDelete.length} episodes older than ${daysOld} days:`);
    episodesToDelete.forEach(episode => {
      const daysOld = Math.floor((new Date() - new Date(episode.created_at)) / (1000 * 60 * 60 * 24));
      console.log(`  • ${episode.title} (${daysOld} days old, ${Math.round(episode.audio_size / 1024 / 1024)}MB)`);
    });
    
    if (episodesToDelete.length === 0) {
      console.log('No episodes to delete.');
      return { deletedCount: 0, totalSize: 0 };
    }
    
    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question(`\nDo you want to delete these ${episodesToDelete.length} episodes? (y/N): `, resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('Deletion cancelled.');
      return { deletedCount: 0, totalSize: 0 };
    }
    
    // Delete the episodes
    const deleteQuery = `DELETE FROM podcast_episodes WHERE created_at < NOW() - INTERVAL '${daysOld} days'`;
    const deleteResult = await client.query(deleteQuery);
    
    const totalSize = episodesToDelete.reduce((sum, episode) => sum + (episode.audio_size || 0), 0);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
    
    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} episodes`);
    console.log(`💾 Freed up ${totalSizeGB.toFixed(2)} GB of storage`);
    
    return { 
      deletedCount: deleteResult.rowCount, 
      totalSize: totalSize,
      totalSizeGB: totalSizeGB
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const daysOld = parseInt(args[0]) || 30;
  
  console.log(`🗑️  Delete Old Episodes Script`);
  console.log(`📅 Looking for episodes older than ${daysOld} days\n`);
  
  try {
    // Show current stats
    const totalCount = await getEpisodeCount();
    console.log(`📊 Current total episodes: ${totalCount}\n`);
    
    // Delete old episodes
    const result = await deleteOldEpisodes(daysOld);
    
    // Show final stats
    const finalCount = await getEpisodeCount();
    console.log(`\n📊 Final total episodes: ${finalCount}`);
    console.log(`🗑️  Episodes deleted: ${result.deletedCount}`);
    console.log(`💾 Storage freed: ${result.totalSizeGB.toFixed(2)} GB`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getEpisodes, getEpisodeCount, deleteOldEpisodes };
