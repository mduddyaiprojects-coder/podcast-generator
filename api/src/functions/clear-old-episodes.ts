import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';

export async function clearOldEpisodesFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const databaseService = new DatabaseService();
    
    // Get all episodes with old podcast-audio URLs
    const episodes = await databaseService.getEpisodes(1000, 0);
    const episodesToDelete = episodes.filter(episode => 
      episode.audio_url && episode.audio_url.includes('podcast-audio')
    );
    
    context.log(`Found ${episodesToDelete.length} episodes with old URLs to delete`);
    
    let deletedCount = 0;
    
    // Delete each episode with old URLs
    for (const episode of episodesToDelete) {
      try {
        // Use raw SQL to delete the episode
        await databaseService['executeQuery'](async (client) => {
          const query = 'DELETE FROM podcast_episodes WHERE id = $1';
          await client.query(query, [episode.id]);
        });
        
        context.log(`Deleted episode ${episode.id}: ${episode.title}`);
        deletedCount++;
      } catch (error) {
        context.log(`Failed to delete episode ${episode.id}:`, error);
      }
    }
    
    return {
      status: 200,
      jsonBody: {
        message: `Successfully deleted ${deletedCount} old episodes`,
        deletedCount,
        totalEpisodes: episodesToDelete.length
      }
    };
    
  } catch (error) {
    context.log('Error clearing old episodes:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to clear old episodes',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

