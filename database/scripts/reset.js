#!/usr/bin/env node

/**
 * Database reset utility
 * Drops and recreates the database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load database configuration
const configPath = path.join(__dirname, '../config/database.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Get environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

async function resetDatabase() {
  const adminClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');

    // Drop database if it exists
    console.log(`Dropping database ${dbConfig.database}...`);
    await adminClient.query(`DROP DATABASE IF EXISTS ${dbConfig.database}`);

    // Create database
    console.log(`Creating database ${dbConfig.database}...`);
    await adminClient.query(`CREATE DATABASE ${dbConfig.database}`);

    console.log('Database reset completed successfully!');

  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  } finally {
    await adminClient.end();
  }
}

// Run reset if this script is executed directly
if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
