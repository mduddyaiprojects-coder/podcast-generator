import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DatabaseService } from '../services/database-service';

export async function fixAudioUrlsFunction(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const databaseService = new DatabaseService();
    
    // Get all episodes with old podcast-audio URLs
    const episodes = await databaseService.getEpisodes(1000, 0);
    const episodesToFix = episodes.filter(episode => 
      episode.audio_url && episode.audio_url.includes('podcast-audio')
    );
    
    context.log(`Found ${episodesToFix.length} episodes with old URLs`);
    
    let fixedCount = 0;
    
    // Update each episode to use podcast-content instead of podcast-audio
    for (const episode of episodesToFix) {
      if (episode.audio_url) {
        const newUrl = episode.audio_url.replace('podcast-audio', 'podcast-content');
        
        // Update the episode in the database
        await databaseService.updateEpisode(episode.id, {
          audio_url: newUrl
        });
        
        context.log(`Fixed episode ${episode.id}: ${episode.audio_url} -> ${newUrl}`);
        fixedCount++;
      }
    }
    
    return {
      status: 200,
      jsonBody: {
        message: `Successfully fixed ${fixedCount} episodes`,
        fixedCount,
        totalEpisodes: episodesToFix.length
      }
    };
    
  } catch (error) {
    context.log('Error fixing audio URLs:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Failed to fix audio URLs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
