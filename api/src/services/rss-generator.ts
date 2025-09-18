import { PodcastEpisode } from '../models/podcast-episode';
import { logger } from '../utils/logger';

/**
 * RSSGenerator Service
 * 
 * Handles RSS feed generation for the single public podcast feed.
 * Generates iTunes-compliant RSS XML with proper metadata and episode information.
 */

export interface FeedMetadata {
  title: string;
  description: string;
  link: string;
  language: string;
  author: string;
  email: string;
  category: string;
  explicit: boolean;
  artwork_url?: string;
  tts_provider?: string;
  tts_voice_id?: string;
}

export interface RSSGenerationOptions {
  include_chapters?: boolean;
  include_transcript?: boolean;
  max_episodes?: number;
  sort_order?: 'newest' | 'oldest';
}

export class RssGenerator {
  private defaultMetadata: FeedMetadata;

  constructor() {
    this.defaultMetadata = {
      title: 'AI Podcast Generator',
      description: 'AI-generated podcast episodes from web content, YouTube videos, and documents',
      link: 'https://podcast-generator.example.com',
      language: 'en-us',
      author: 'Podcast Generator',
      email: 'admin@podcast-generator.example.com',
      category: 'Technology',
      explicit: false,
      artwork_url: 'https://podcast-generator.example.com/artwork.png'
    };
  }

  /**
   * Generate RSS feed for episodes
   */
  async generateRss(
    episodes: PodcastEpisode[],
    metadata: Partial<FeedMetadata> = {},
    options: RSSGenerationOptions = {}
  ): Promise<string> {
    try {
      const mergedMetadata = { ...this.defaultMetadata, ...metadata };
      const mergedOptions = {
        include_chapters: true,
        include_transcript: false,
        max_episodes: 100,
        sort_order: 'newest' as const,
        ...options
      };

      logger.info(`Generating RSS feed for ${episodes.length} episodes`);

      // Sort episodes
      const sortedEpisodes = this.sortEpisodes(episodes, mergedOptions.sort_order);

      // Limit episodes if specified
      const limitedEpisodes = mergedOptions.max_episodes 
        ? sortedEpisodes.slice(0, mergedOptions.max_episodes)
        : sortedEpisodes;

      // Generate RSS XML
      const rssContent = this.buildRSSXML(limitedEpisodes, mergedMetadata, mergedOptions);

      logger.info(`RSS feed generated successfully with ${limitedEpisodes.length} episodes`);
      return rssContent;
    } catch (error) {
      logger.error('RSS generation failed:', error);
      throw new Error(`RSS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate RSS feed for single public feed
   */
  async generatePublicRss(episodes: PodcastEpisode[]): Promise<string> {
    return this.generateRss(episodes, {
      title: 'AI Podcast Generator',
      description: 'AI-generated podcast episodes from web content, YouTube videos, and documents',
      link: 'https://podcast-generator.example.com',
      language: 'en-us',
      author: 'Podcast Generator',
      email: 'admin@podcast-generator.example.com',
      category: 'Technology',
      explicit: false
    });
  }

  /**
   * Build the complete RSS XML
   */
  private buildRSSXML(
    episodes: PodcastEpisode[],
    metadata: FeedMetadata,
    options: RSSGenerationOptions
  ): string {
    const now = new Date();
    const lastBuildDate = now.toUTCString();
    const pubDate = episodes.length > 0 ? episodes[0]!.pub_date.toUTCString() : lastBuildDate;

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${this.escapeXml(metadata.title)}]]></title>
    <description><![CDATA[${this.escapeXml(metadata.description)}]]></description>
    <link>${this.escapeXml(metadata.link)}</link>
    <language>${metadata.language}</language>
    <copyright>Copyright ${now.getFullYear()} ${metadata.author}</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <pubDate>${pubDate}</pubDate>
    <generator>Podcast Generator v1.0</generator>
    <managingEditor>${this.escapeXml(metadata.email)} (${this.escapeXml(metadata.author)})</managingEditor>
    <webMaster>${this.escapeXml(metadata.email)} (${this.escapeXml(metadata.author)})</webMaster>
    
    <!-- iTunes specific elements -->
    <itunes:author>${this.escapeXml(metadata.author)}</itunes:author>
    <itunes:summary><![CDATA[${this.escapeXml(metadata.description)}]]></itunes:summary>
    <itunes:owner>
      <itunes:name>${this.escapeXml(metadata.author)}</itunes:name>
      <itunes:email>${this.escapeXml(metadata.email)}</itunes:email>
    </itunes:owner>
    <itunes:explicit>${metadata.explicit ? 'yes' : 'no'}</itunes:explicit>
    <itunes:category text="${this.escapeXml(metadata.category)}"/>
    <itunes:type>episodic</itunes:type>
    ${metadata.artwork_url ? `<itunes:image href="${this.escapeXml(metadata.artwork_url)}"/>` : ''}
    
    <!-- Episodes -->
    ${episodes.map(episode => this.generateEpisodeXML(episode, options)).join('\n')}
  </channel>
</rss>`;
  }

  /**
   * Generate XML for a single episode
   */
  private generateEpisodeXML(episode: PodcastEpisode, options: RSSGenerationOptions): string {
    const pubDate = episode.pub_date.toUTCString();
    const duration = episode.getFormattedDuration();
    const enclosureUrl = episode.getEnclosureUrl();
    const enclosureLength = episode.getEnclosureLength();

    let episodeXml = `    <item>
      <title><![CDATA[${this.escapeXml(episode.title)}]]></title>
      <description><![CDATA[${this.escapeXml(episode.description)}]]></description>
      <link>${this.escapeXml(episode.source_url)}</link>
      <guid isPermaLink="false">${episode.getRssGuid()}</guid>
      <pubDate>${pubDate}</pubDate>`;

    // Add enclosure if audio is available
    if (enclosureUrl && enclosureLength) {
      episodeXml += `
      <enclosure url="${this.escapeXml(enclosureUrl)}" type="${episode.getEnclosureType()}" length="${enclosureLength}"/>`;
    }

    // Add iTunes specific elements
    episodeXml += `
      <itunes:title><![CDATA[${this.escapeXml(episode.title)}]]></itunes:title>
      <itunes:summary><![CDATA[${this.escapeXml(episode.description)}]]></itunes:summary>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:episodeType>full</itunes:episodeType>`;

    // Add chapter markers if available and requested
    if (options.include_chapters && episode.hasChapterMarkers() && episode.chapter_markers) {
      episodeXml += `
      <itunes:chapters>`;
      
      for (const chapter of episode.chapter_markers) {
        episodeXml += `
        <itunes:chapter start="${chapter.start_time}" title="${this.escapeXml(chapter.title)}"/>`;
      }
      
      episodeXml += `
      </itunes:chapters>`;
    }

    // Add transcript if available and requested
    if (options.include_transcript && episode.hasTranscript() && episode.transcript) {
      episodeXml += `
      <content:encoded><![CDATA[${this.escapeXml(episode.transcript)}]]></content:encoded>`;
    }

    // Add summary if available
    if (episode.summary) {
      episodeXml += `
      <itunes:subtitle><![CDATA[${this.escapeXml(episode.summary)}]]></itunes:subtitle>`;
    }

    episodeXml += `
    </item>`;

    return episodeXml;
  }

  /**
   * Sort episodes by publication date
   */
  private sortEpisodes(episodes: PodcastEpisode[], sortOrder: 'newest' | 'oldest'): PodcastEpisode[] {
    return [...episodes].sort((a, b) => {
      const dateA = a.pub_date.getTime();
      const dateB = b.pub_date.getTime();
      
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Validate RSS feed content
   */
  validateRSS(rssContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required XML declaration
    if (!rssContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
      errors.push('Missing XML declaration');
    }

    // Check for RSS root element
    if (!rssContent.includes('<rss version="2.0"')) {
      errors.push('Missing or invalid RSS root element');
    }

    // Check for iTunes namespace
    if (!rssContent.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')) {
      errors.push('Missing iTunes namespace');
    }

    // Check for channel element
    if (!rssContent.includes('<channel>')) {
      errors.push('Missing channel element');
    }

    // Check for required channel elements
    const requiredElements = ['title', 'description', 'link', 'language'];
    for (const element of requiredElements) {
      if (!rssContent.includes(`<${element}>`)) {
        errors.push(`Missing required channel element: ${element}`);
      }
    }

    // Check for iTunes required elements
    const itunesElements = ['itunes:author', 'itunes:summary', 'itunes:explicit'];
    for (const element of itunesElements) {
      if (!rssContent.includes(`<${element}>`)) {
        errors.push(`Missing required iTunes element: ${element}`);
      }
    }

    // Check for episodes
    if (!rssContent.includes('<item>')) {
      errors.push('No episodes found in RSS feed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get RSS feed statistics
   */
  getFeedStats(episodes: PodcastEpisode[]): {
    total_episodes: number;
    total_duration_seconds: number;
    total_duration_formatted: string;
    content_types: Record<string, number>;
    date_range: {
      oldest: Date | null;
      newest: Date | null;
    };
  } {
    const totalEpisodes = episodes.length;
    const totalDurationSeconds = episodes.reduce((sum, episode) => 
      sum + (episode.audio_duration || 0), 0
    );

    const contentTypes: Record<string, number> = {};
    episodes.forEach(episode => {
      contentTypes[episode.content_type] = (contentTypes[episode.content_type] || 0) + 1;
    });

    const dates = episodes.map(episode => episode.pub_date).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      oldest: dates.length > 0 ? dates[0]! : null,
      newest: dates.length > 0 ? dates[dates.length - 1]! : null
    };

    return {
      total_episodes: totalEpisodes,
      total_duration_seconds: totalDurationSeconds,
      total_duration_formatted: this.formatDuration(totalDurationSeconds),
      content_types: contentTypes,
      date_range: dateRange
    };
  }

  /**
   * Format duration in HH:MM:SS format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Generate RSS feed URL
   */
  getRSSFeedUrl(baseUrl: string): string {
    return `${baseUrl}/rss.xml`;
  }

  /**
   * Generate episodes list URL
   */
  getEpisodesUrl(baseUrl: string): string {
    return `${baseUrl}/episodes`;
  }

  /**
   * Check if RSS feed is valid
   */
  async validateFeed(episodes: PodcastEpisode[]): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    // Check for episodes without audio
    const episodesWithoutAudio = episodes.filter(episode => !episode.hasAudio());
    if (episodesWithoutAudio.length > 0) {
      warnings.push(`${episodesWithoutAudio.length} episodes without audio`);
    }

    // Check for episodes without descriptions
    const episodesWithoutDescription = episodes.filter(episode => 
      !episode.description || episode.description.trim().length === 0
    );
    if (episodesWithoutDescription.length > 0) {
      warnings.push(`${episodesWithoutDescription.length} episodes without descriptions`);
    }

    // Check for very long titles
    const longTitles = episodes.filter(episode => episode.title.length > 200);
    if (longTitles.length > 0) {
      warnings.push(`${longTitles.length} episodes with very long titles (>200 chars)`);
    }

    // Check for very long descriptions
    const longDescriptions = episodes.filter(episode => episode.description.length > 1000);
    if (longDescriptions.length > 0) {
      warnings.push(`${longDescriptions.length} episodes with very long descriptions (>1000 chars)`);
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}
