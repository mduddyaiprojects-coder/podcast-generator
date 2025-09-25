const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://pgadmin:qasbiq-2vogby-Cidbys@pg-m4c-core.postgres.database.azure.com:5432/podcast_generator?sslmode=require"
});

async function fixGlobalFeed() {
  try {
    console.log('🔧 Fixing global_feed table...');
    
    // Create global_feed table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_feed (
        id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
        title VARCHAR(255) NOT NULL DEFAULT 'I''m Connected',
        description TEXT DEFAULT 'A podcast about technology and innovation',
        link VARCHAR(500) DEFAULT 'https://podcast-gen-api.azurewebsites.net',
        admin_email VARCHAR(255) DEFAULT 'admin@podcast-gen-api.azurewebsites.net',
        artwork_url VARCHAR(500),
        language VARCHAR(10) DEFAULT 'en-US',
        category VARCHAR(100) DEFAULT 'Technology',
        explicit BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Insert default global feed data
    await pool.query(`
      INSERT INTO global_feed (id, title, description, link, admin_email, artwork_url, language, category, explicit)
      VALUES ('00000000-0000-0000-0000-000000000000', 'I''m Connected', 'A podcast about technology and innovation', 'https://podcast-gen-api.azurewebsites.net', 'admin@podcast-gen-api.azurewebsites.net', NULL, 'en-US', 'Technology', false)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        link = EXCLUDED.link,
        admin_email = EXCLUDED.admin_email,
        artwork_url = EXCLUDED.artwork_url,
        language = EXCLUDED.language,
        category = EXCLUDED.category,
        explicit = EXCLUDED.explicit,
        updated_at = NOW();
    `);
    
    console.log('✅ Global feed table fixed!');
    
    // Test RSS feed
    console.log('🧪 Testing RSS feed...');
    const response = await fetch('https://podcast-gen-api.azurewebsites.net/api/feeds/public/rss.xml');
    if (response.ok) {
      console.log('✅ RSS feed is working!');
    } else {
      console.log('❌ RSS feed still has issues:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error fixing global feed:', error);
  } finally {
    await pool.end();
  }
}

fixGlobalFeed();
