import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';

/**
 * GET /api/test-db
 * Test endpoint to verify database connection
 */
export async function testDbFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Testing database connection...');
    
    const db = new DatabaseService();
    await db.connect();
    
    // Test basic connection
    const isConnected = await db.checkConnection();
    if (!isConnected) {
      return {
        status: 500,
        jsonBody: {
          error: 'Database connection failed',
          message: 'Could not connect to database'
        }
      };
    }
    
    // Test episode count
    const episodeCount = await db.getEpisodeCount();
    
    // Test global feed
    const result = await db['executeQuery'](async (client) => {
      const query = 'SELECT * FROM global_feed LIMIT 1';
      const result = await client.query(query);
      return result.rows[0];
    });
    
    await db.disconnect();
    
    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Database connection successful',
        episodeCount,
        globalFeed: result
      }
    };
    
  } catch (error) {
    context.log('Database test error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Database test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.toString() : String(error)
      }
    };
  }
}
