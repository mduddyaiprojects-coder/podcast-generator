// import { PodcastEpisode } from '../models/podcast-episode';
import { serviceManager } from './service-manager';
import { logger } from '../utils/logger';

/**
 * RSS Feed Service
 * 
 * Generates RSS feeds with current podcast branding.
 * Integrates with branding updates from T016.
 * 
 * Requirements:
 * - FR-003: Propagate updated title and image to RSS feed
 */
export class RssFeedService {

  constructor() {
    // Services will be lazy loaded via ServiceManager
  }

  async generateRssFeed(_feedId?: string): Promise<string> {
    try {
      logger.info('Generating RSS feed with current branding');

      // Generate RSS XML directly from storage (no database needed)
      // The RssGenerator will fetch current branding automatically (FR-003)
      const rssGenerator = serviceManager.getRssGenerator();
      const rssContent = await rssGenerator.generateRssFromStorage({
        // Don't override title or artwork_url - let RssGenerator use current branding
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
