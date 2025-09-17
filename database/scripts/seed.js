#!/usr/bin/env node

/**
 * Database seed runner
 * Runs seed data scripts
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load database configuration
const configPath = path.join(__dirname, '../config/database.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Get environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create database client
const client = new Client(dbConfig);

async function runSeeds() {
  try {
    await client.connect();
    console.log(`Connected to database: ${dbConfig.database}`);

    // Get list of seed files
    const seedsDir = path.join(__dirname, '../seeds');
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${seedFiles.length} seed files`);

    // Run seed files
    for (const filename of seedFiles) {
      console.log(`Running seed ${filename}...`);
      
      const seedPath = path.join(seedsDir, filename);
      const seedSQL = fs.readFileSync(seedPath, 'utf8');

      await client.query(seedSQL);
      console.log(`✓ Seed ${filename} completed successfully`);
    }

    console.log('All seeds completed successfully!');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run seeds if this script is executed directly
if (require.main === module) {
  runSeeds();
}

module.exports = { runSeeds };
