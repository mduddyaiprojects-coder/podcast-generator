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

  async generateRssFeed(feedId?: string): Promise<string> {
    try {
      // Get episodes from database
      const episodes = await this.databaseService.getEpisodes(feedId);

      // Generate RSS XML
      const rssContent = await this.rssGenerator.generateRss(episodes, feedId);

      return rssContent;

    } catch (error) {
      logger.error('RSS feed generation error:', error);
      throw error;
    }
  }
}
