#!/usr/bin/env node

/**
 * Database migration runner
 * Runs SQL migrations in order
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

// Migration tracking table
const MIGRATIONS_TABLE = 'schema_migrations';

async function runMigrations() {
  try {
    await client.connect();
    console.log(`Connected to database: ${dbConfig.database}`);

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Get already executed migrations
    const result = await client.query(`SELECT version FROM ${MIGRATIONS_TABLE}`);
    const executedMigrations = new Set(result.rows.map(row => row.version));

    // Run pending migrations
    for (const filename of migrationFiles) {
      const version = filename.split('_')[0];
      
      if (executedMigrations.has(version)) {
        console.log(`✓ Migration ${version} already executed`);
        continue;
      }

      console.log(`Running migration ${version}...`);
      
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Run migration in a transaction
      await client.query('BEGIN');
      try {
        await client.query(migrationSQL);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (version, filename) VALUES ($1, $2)`,
          [version, filename]
        );
        await client.query('COMMIT');
        console.log(`✓ Migration ${version} completed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Migration ${version} failed:`, error.message);
        throw error;
      }
    }

    console.log('All migrations completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
