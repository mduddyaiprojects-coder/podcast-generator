// import { PodcastEpisode } from '../models/podcast-episode';
import { serviceManager } from './service-manager';
import { logger } from '../utils/logger';

export class RssFeedService {

  constructor() {
    // Services will be lazy loaded via ServiceManager
  }

  async generateRssFeed(_feedId?: string): Promise<string> {
    try {
      // Generate RSS XML directly from storage (no database needed) - using ServiceManager
      const rssGenerator = serviceManager.getRssGenerator();
      const rssContent = await rssGenerator.generateRssFromStorage({
        title: 'AI Podcast Generator',
        description: 'AI-generated podcast episodes from web content, YouTube videos, and documents',
        link: 'https://podcast-gen-api.azurewebsites.net',
        language: 'en-us',
        author: 'AI Podcast Generator',
        email: 'admin@podcast-gen-api.azurewebsites.net',
        category: 'Technology',
        explicit: false
      }, {
        max_episodes: 50,
        sort_order: 'newest'
      });

      return rssContent;

    } catch (error) {
      logger.error('RSS feed generation error:', error);
      throw error;
    }
  }
}
