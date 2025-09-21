const { DatabaseService } = require('./dist/services/database-service');

async function testConnection() {
  console.log('Environment variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  const db = new DatabaseService();
  
  try {
    console.log('Testing database connection...');
    await db.connect();
    
    console.log('Testing database query...');
    const isConnected = await db.checkConnection();
    console.log('Connection status:', isConnected);
    
    console.log('Testing episode count...');
    const count = await db.getEpisodeCount();
    console.log('Episode count:', count);
    
    console.log('Database connection test successful!');
  } catch (error) {
    console.error('Database connection test failed:', error);
  } finally {
    await db.disconnect();
  }
}

testConnection();
