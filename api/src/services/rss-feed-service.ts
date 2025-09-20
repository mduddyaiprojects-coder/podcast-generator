// import { PodcastEpisode } from '../models/podcast-episode';
import { DatabaseService } from './database-service';
import { RssGenerator } from './rss-generator';
import { logger } from '../utils/logger';

export class RssFeedService {
  private databaseService: DatabaseService;
  private rssGenerator: RssGenerator;

  constructor() {
    this.databaseService = new DatabaseService();
    this.rssGenerator = new RssGenerator();
  }

  async generateRssFeed(_feedId?: string): Promise<string> {
    try {
      // Get episodes from database (limit to 50 episodes for RSS feed)
      const episodes = await this.databaseService.getEpisodes(50, 0);

      // Generate RSS XML
      const rssContent = await this.rssGenerator.generateRss(episodes);

      return rssContent;

    } catch (error) {
      logger.error('RSS feed generation error:', error);
      throw error;
    }
  }
}
