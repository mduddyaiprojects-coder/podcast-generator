import { PodcastEpisode } from '../models/podcast-episode';

/**
 * Episode Utilities
 * 
 * Provides utilities for formatting and processing episode metadata
 * for RSS feeds, podcast apps, and various display formats.
 */

export interface EpisodeFormatOptions {
  includeChapters?: boolean;
  includeTranscript?: boolean;
  includeSummary?: boolean;
  maxTitleLength?: number;
  maxDescriptionLength?: number;
  maxSummaryLength?: number;
  formatDuration?: boolean;
  includeMetadata?: boolean;
  sanitizeHtml?: boolean;
}

export interface EpisodeDisplayInfo {
  title: string;
  description: string;
  summary?: string;
  duration: string;
  durationSeconds: number;
  publishDate: string;
  publishDateISO: string;
  relativeDate: string;
  contentType: string;
  sourceUrl: string;
  audioUrl?: string;
  audioSize?: number;
  explicit: boolean;
  season?: number;
  episode?: number;
  chapters?: EpisodeChapter[];
  transcript?: string;
  tags?: string[];
  metadata?: EpisodeMetadata;
}

export interface EpisodeChapter {
  startTime: number;
  endTime?: number;
  title: string;
  url?: string;
  image?: string;
  description?: string;
}

export interface EpisodeMetadata {
  id: string;
  guid: string;
  contentType: string;
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
  audioFormat?: string;
  audioBitrate?: number;
  audioSampleRate?: number;
  fileSize?: number;
  downloadCount?: number;
  playCount?: number;
  rating?: number;
  tags?: string[];
  categories?: string[];
}

export class EpisodeUtils {
  /**
   * Format episode for display
   */
  static formatEpisodeForDisplay(
    episode: PodcastEpisode,
    options: EpisodeFormatOptions = {}
  ): EpisodeDisplayInfo {
    const {
      maxTitleLength = 255,
      maxDescriptionLength = 4000,
      maxSummaryLength = 500,
      formatDuration = true,
      includeChapters = true,
      includeTranscript = false,
      includeSummary = true,
      sanitizeHtml = true
    } = options;

    // Format title
    let title = episode.title;
    if (title.length > maxTitleLength) {
      title = title.substring(0, maxTitleLength - 3) + '...';
    }

    // Format description
    let description = episode.description;
    if (sanitizeHtml) {
      description = this.sanitizeHtml(description);
    }
    if (description.length > maxDescriptionLength) {
      description = description.substring(0, maxDescriptionLength - 3) + '...';
    }

    // Format summary
    let summary: string | undefined;
    if (includeSummary && episode.summary) {
      summary = episode.summary;
      if (sanitizeHtml) {
        summary = this.sanitizeHtml(summary);
      }
      if (summary.length > maxSummaryLength) {
        summary = summary.substring(0, maxSummaryLength - 3) + '...';
      }
    }

    // Format duration
    const duration = formatDuration ? this.formatDuration(episode.audio_duration || 0) : '';
    const durationSeconds = episode.audio_duration || 0;

    // Format dates
    const publishDate = this.formatDate(episode.pub_date);
    const publishDateISO = episode.pub_date.toISOString();
    const relativeDate = this.formatRelativeDate(episode.pub_date);

    // Format chapters
    let chapters: EpisodeChapter[] | undefined;
    if (includeChapters && episode.chapter_markers) {
      chapters = episode.chapter_markers.map(chapter => ({
        startTime: chapter.start_time,
        endTime: chapter.end_time,
        title: chapter.title
      }));
    }

    // Format transcript
    let transcript: string | undefined;
    if (includeTranscript && episode.transcript) {
      transcript = sanitizeHtml ? this.sanitizeHtml(episode.transcript) : episode.transcript;
    }

    return {
      title,
      description,
      summary,
      duration,
      durationSeconds,
      publishDate,
      publishDateISO,
      relativeDate,
      contentType: episode.content_type,
      sourceUrl: episode.source_url,
      audioUrl: episode.audio_url,
      audioSize: episode.audio_size,
      explicit: false, // Default to false since explicit is not in the model
      chapters,
      transcript,
      tags: [], // Default to empty array since tags is not in the model
      metadata: this.extractMetadata(episode)
    };
  }

  /**
   * Format episode for RSS feed
   */
  static formatEpisodeForRss(
    episode: PodcastEpisode,
    options: EpisodeFormatOptions = {}
  ): {
    title: string;
    description: string;
    summary?: string;
    duration: string;
    explicit: string;
    guid: string;
    pubDate: string;
    enclosure?: {
      url: string;
      type: string;
      length: number;
    };
    chapters?: string;
    transcript?: string;
  } {
    const {
      maxTitleLength = 255,
      maxDescriptionLength = 4000,
      maxSummaryLength = 500,
      includeChapters = true,
      includeTranscript = false,
      includeSummary = true,
      sanitizeHtml = true
    } = options;

    // Format title
    let title = episode.title;
    if (title.length > maxTitleLength) {
      title = title.substring(0, maxTitleLength - 3) + '...';
    }

    // Format description
    let description = episode.description;
    if (sanitizeHtml) {
      description = this.sanitizeHtml(description);
    }
    if (description.length > maxDescriptionLength) {
      description = description.substring(0, maxDescriptionLength - 3) + '...';
    }

    // Format summary
    let summary: string | undefined;
    if (includeSummary && episode.summary) {
      summary = episode.summary;
      if (sanitizeHtml) {
        summary = this.sanitizeHtml(summary);
      }
      if (summary.length > maxSummaryLength) {
        summary = summary.substring(0, maxSummaryLength - 3) + '...';
      }
    }

    // Format duration
    const duration = this.formatDuration(episode.audio_duration || 0);

    // Format explicit flag
    const explicit = 'no'; // Default to no since explicit is not in the model

    // Format GUID
    const guid = episode.getRssGuid();

    // Format publication date
    const pubDate = episode.pub_date.toUTCString();

    // Format enclosure
    let enclosure: { url: string; type: string; length: number } | undefined;
    if (episode.hasAudio()) {
      enclosure = {
        url: episode.getEnclosureUrl() || '',
        type: episode.getEnclosureType(),
        length: episode.getEnclosureLength() || 0
      };
    }

    // Format chapters
    let chapters: string | undefined;
    if (includeChapters && episode.chapter_markers && episode.chapter_markers.length > 0) {
      chapters = episode.chapter_markers.map(chapter => 
        `${chapter.start_time}:${chapter.title}`
      ).join('\n');
    }

    // Format transcript
    let transcript: string | undefined;
    if (includeTranscript && episode.transcript) {
      transcript = sanitizeHtml ? this.sanitizeHtml(episode.transcript) : episode.transcript;
    }

    return {
      title,
      description,
      summary,
      duration,
      explicit,
      guid,
      pubDate,
      enclosure,
      chapters,
      transcript
    };
  }

  /**
   * Format episode for JSON API
   */
  static formatEpisodeForApi(
    episode: PodcastEpisode,
    options: EpisodeFormatOptions = {}
  ): any {
    const displayInfo = this.formatEpisodeForDisplay(episode, options);
    
    return {
      id: episode.id,
      title: displayInfo.title,
      description: displayInfo.description,
      summary: displayInfo.summary,
      duration: {
        formatted: displayInfo.duration,
        seconds: displayInfo.durationSeconds
      },
      publishDate: {
        formatted: displayInfo.publishDate,
        iso: displayInfo.publishDateISO,
        relative: displayInfo.relativeDate
      },
      contentType: displayInfo.contentType,
      sourceUrl: displayInfo.sourceUrl,
      audio: displayInfo.audioUrl ? {
        url: displayInfo.audioUrl,
        size: displayInfo.audioSize,
        format: episode.getEnclosureType()
      } : null,
      explicit: displayInfo.explicit,
      season: displayInfo.season,
      episode: displayInfo.episode,
      chapters: displayInfo.chapters,
      transcript: displayInfo.transcript,
      tags: displayInfo.tags,
      metadata: displayInfo.metadata
    };
  }

  /**
   * Format episode for search indexing
   */
  static formatEpisodeForSearch(episode: PodcastEpisode): {
    id: string;
    title: string;
    description: string;
    summary?: string;
    content: string;
    tags: string[];
    categories: string[];
    publishDate: string;
    duration: number;
  } {
    const content = [
      episode.title,
      episode.description,
      episode.summary || '',
      episode.transcript || '',
      '' // No tags since tags is not in the model
    ].join(' ').toLowerCase();

    return {
      id: episode.id,
      title: episode.title,
      description: episode.description,
      summary: episode.summary,
      content: this.sanitizeHtml(content),
      tags: [], // Default to empty array since tags is not in the model
      categories: [episode.content_type],
      publishDate: episode.pub_date.toISOString(),
      duration: episode.audio_duration || 0
    };
  }

  /**
   * Extract metadata from episode
   */
  private static extractMetadata(episode: PodcastEpisode): EpisodeMetadata {
    return {
      id: episode.id,
      guid: episode.getRssGuid(),
      contentType: episode.content_type,
      processingStatus: 'completed', // Default status
      createdAt: episode.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: episode.updated_at?.toISOString() || new Date().toISOString(),
      audioFormat: episode.getEnclosureType(),
      fileSize: episode.audio_size,
      tags: [], // Default to empty array since tags is not in the model
      categories: [episode.content_type]
    };
  }

  /**
   * Format duration in HH:MM:SS or MM:SS format
   */
  static formatDuration(seconds: number): string {
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
   * Format date for display
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format relative date (e.g., "2 days ago")
   */
  static formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 7) {
      return this.formatDate(date);
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate episode slug
   */
  static generateEpisodeSlug(episode: PodcastEpisode): string {
    const title = episode.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const date = episode.pub_date.toISOString().split('T')[0];
    
    return `${date}-${title}`;
  }

  /**
   * Generate episode summary from description
   */
  static generateEpisodeSummary(description: string, maxLength: number = 500): string {
    const sanitized = this.sanitizeHtml(description);
    
    if (sanitized.length <= maxLength) {
      return sanitized;
    }
    
    // Try to find a good break point
    const truncated = sanitized.substring(0, maxLength - 3);
    const lastSentence = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    const breakPoint = lastSentence > maxLength * 0.7 ? lastSentence + 1 : lastSpace;
    
    return truncated.substring(0, breakPoint) + '...';
  }

  /**
   * Extract keywords from episode content
   */
  static extractKeywords(episode: PodcastEpisode): string[] {
    const content = [
      episode.title,
      episode.description,
      episode.summary || '',
      episode.transcript || ''
    ].join(' ').toLowerCase();
    
    // Simple keyword extraction (can be enhanced with NLP)
    const words = content
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Check if word is a stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
      'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
      'themselves', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those',
      'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
      'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'shall', 'ought', 'need', 'dare', 'used'
    ]);
    
    return stopWords.has(word);
  }

  /**
   * Validate episode data
   */
  static validateEpisode(episode: PodcastEpisode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!episode.title || episode.title.trim().length === 0) {
      errors.push('Episode title is required');
    }

    if (!episode.description || episode.description.trim().length === 0) {
      errors.push('Episode description is required');
    }

    if (!episode.source_url || episode.source_url.trim().length === 0) {
      errors.push('Episode source URL is required');
    }

    if (!episode.content_type || episode.content_type.trim().length === 0) {
      errors.push('Episode content type is required');
    }

    if (!episode.pub_date) {
      errors.push('Episode publication date is required');
    }

    if (episode.title && episode.title.length > 255) {
      errors.push('Episode title exceeds 255 characters');
    }

    if (episode.description && episode.description.length > 4000) {
      errors.push('Episode description exceeds 4000 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get episode statistics
   */
  static getEpisodeStats(episodes: PodcastEpisode[]): {
    totalEpisodes: number;
    totalDuration: number;
    averageDuration: number;
    contentTypes: Record<string, number>;
    dateRange: {
      oldest: Date | null;
      newest: Date | null;
    };
    withAudio: number;
    withChapters: number;
    withTranscripts: number;
  } {
    const totalEpisodes = episodes.length;
    const totalDuration = episodes.reduce((sum, episode) => sum + (episode.audio_duration || 0), 0);
    const averageDuration = totalEpisodes > 0 ? totalDuration / totalEpisodes : 0;

    const contentTypes: Record<string, number> = {};
    episodes.forEach(episode => {
      contentTypes[episode.content_type] = (contentTypes[episode.content_type] || 0) + 1;
    });

    const dates = episodes.map(episode => episode.pub_date).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      oldest: dates.length > 0 ? dates[0]! : null,
      newest: dates.length > 0 ? dates[dates.length - 1]! : null
    };

    const withAudio = episodes.filter(episode => episode.hasAudio()).length;
    const withChapters = episodes.filter(episode => episode.chapter_markers && episode.chapter_markers.length > 0).length;
    const withTranscripts = episodes.filter(episode => episode.transcript && episode.transcript.length > 0).length;

    return {
      totalEpisodes,
      totalDuration,
      averageDuration,
      contentTypes,
      dateRange,
      withAudio,
      withChapters,
      withTranscripts
    };
  }
}
