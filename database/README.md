# Database Setup

This directory contains the PostgreSQL database schema, migrations, and seed data for the Podcast Generator.

## Structure

```
database/
├── config/
│   └── database.json          # Database configuration for different environments
├── migrations/
│   └── 001_create_initial_schema.sql  # Initial database schema
├── seeds/
│   └── 001_initial_data.sql   # Sample data for development
├── schemas/
│   └── 001_initial_schema.sql # Schema documentation
├── scripts/
│   ├── migrate.js             # Migration runner
│   ├── seed.js                # Seed data runner
│   └── reset.js               # Database reset utility
└── package.json               # Database script dependencies
```

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 16+ installed
- Database user with CREATE DATABASE privileges

## Setup

1. **Install dependencies:**
   ```bash
   cd database
   npm install
   ```

2. **Configure database connection:**
   Edit `config/database.json` with your PostgreSQL credentials.

3. **Run migrations:**
   ```bash
   npm run migrate
   ```

4. **Seed with sample data:**
   ```bash
   npm run seed
   ```

## Available Scripts

- `npm run migrate` - Run pending migrations
- `npm run seed` - Run seed data scripts
- `npm run reset` - Drop and recreate database
- `npm run setup` - Complete setup (reset + migrate + seed)
- `npm run test` - Run migrations and seeds for test environment

## Database Schema

### Tables

- **content_submissions** - Stores content submitted by users
- **podcast_episodes** - Stores generated podcast episodes
- **podcast_feeds** - Stores podcast feed configurations
- **user_feeds** - Links users to their feeds (for future authentication)

### Key Features

- UUID primary keys
- JSONB metadata fields for flexibility
- Proper indexing for performance
- Constraints for data integrity
- Automatic updated_at timestamps
- Support for multiple content types (URL, YouTube, documents)

## Environment Variables

For production, set these environment variables:

- `DATABASE_HOST` - Database host
- `DATABASE_PORT` - Database port (default: 5432)
- `DATABASE_NAME` - Database name
- `DATABASE_USER` - Database username
- `DATABASE_PASSWORD` - Database password

## Development

To reset the database and start fresh:

```bash
npm run setup
```

This will drop the database, recreate it, run all migrations, and seed with sample data.
