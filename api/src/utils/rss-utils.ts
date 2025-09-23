import { PodcastEpisode } from '../models/podcast-episode';

/**
 * RSS Utilities
 * 
 * Provides utilities for iTunes namespace compliance and RSS feed formatting
 * according to Apple's Podcasts Connect requirements.
 */

export interface iTunesCategory {
  text: string;
  subcategory?: string;
}

export interface iTunesOwner {
  name: string;
  email: string;
}

export interface iTunesImage {
  href: string;
}

export interface iTunesEpisodeInfo {
  title: string;
  summary: string;
  subtitle?: string;
  duration: string;
  explicit: boolean;
  episodeType: 'full' | 'trailer' | 'bonus';
  season?: number;
  episode?: number;
  image?: iTunesImage;
  chapters?: iTunesChapter[];
}

export interface iTunesChapter {
  start: number;
  title: string;
  url?: string;
  image?: string;
}

export class RssUtils {
  /**
   * Valid iTunes categories for podcasts
   */
  static readonly ITUNES_CATEGORIES = [
    'Arts',
    'Business',
    'Comedy',
    'Education',
    'Fiction',
    'Government',
    'History',
    'Health & Fitness',
    'Kids & Family',
    'Leisure',
    'Music',
    'News',
    'Religion & Spirituality',
    'Science',
    'Society & Culture',
    'Sports',
    'Technology',
    'True Crime',
    'TV & Film'
  ] as const;

  /**
   * Valid iTunes subcategories
   */
  static readonly ITUNES_SUBCATEGORIES: Record<string, string[]> = {
    'Arts': ['Design', 'Fashion & Beauty', 'Food', 'Literature', 'Performing Arts', 'Visual Arts'],
    'Business': ['Careers', 'Entrepreneurship', 'Investing', 'Management', 'Marketing', 'Non-Profit'],
    'Comedy': ['Comedy Interviews', 'Improv', 'Stand-Up'],
    'Education': ['Courses', 'How To', 'Language Learning', 'Self-Improvement'],
    'Fiction': ['Comedy Fiction', 'Drama', 'Science Fiction'],
    'Government': [],
    'History': [],
    'Health & Fitness': ['Alternative Health', 'Fitness', 'Medicine', 'Mental Health', 'Nutrition', 'Sexuality'],
    'Kids & Family': ['Education for Kids', 'Parenting', 'Pets & Animals', 'Stories for Kids'],
    'Leisure': ['Animation & Manga', 'Automotive', 'Aviation', 'Crafts', 'Games & Hobbies', 'Home & Garden', 'Video Games'],
    'Music': ['Music Commentary', 'Music History', 'Music Interviews'],
    'News': ['Business News', 'Daily News', 'Entertainment News', 'News Commentary', 'Politics', 'Sports News', 'Tech News'],
    'Religion & Spirituality': ['Buddhism', 'Christianity', 'Hinduism', 'Islam', 'Judaism', 'Spirituality'],
    'Science': ['Astronomy', 'Chemistry', 'Earth Sciences', 'Life Sciences', 'Mathematics', 'Natural Sciences', 'Nature', 'Physics', 'Social Sciences'],
    'Society & Culture': ['Documentary', 'Personal Journals', 'Philosophy', 'Places & Travel'],
    'Sports': ['Baseball', 'Basketball', 'Cricket', 'Fantasy Sports', 'Football', 'Golf', 'Hockey', 'Rugby', 'Running', 'Soccer', 'Swimming', 'Tennis', 'Volleyball', 'Wilderness', 'Wrestling'],
    'Technology': ['Gadgets', 'Tech News', 'Podcasting', 'Software How-To'],
    'True Crime': [],
    'TV & Film': ['After Shows', 'Film History', 'Film Interviews', 'Film Reviews', 'TV Reviews']
  };

  /**
   * Validate iTunes category
   */
  static validateiTunesCategory(category: string, subcategory?: string): { valid: boolean; error?: string } {
    if (!this.ITUNES_CATEGORIES.includes(category as any)) {
      return {
        valid: false,
        error: `Invalid iTunes category: ${category}. Must be one of: ${this.ITUNES_CATEGORIES.join(', ')}`
      };
    }

    if (subcategory) {
      const validSubcategories = this.ITUNES_SUBCATEGORIES[category] || [];
      if (!validSubcategories.includes(subcategory)) {
        return {
          valid: false,
          error: `Invalid iTunes subcategory: ${subcategory}. Valid subcategories for ${category}: ${validSubcategories.join(', ')}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Format duration for iTunes (HH:MM:SS or MM:SS)
   */
  static formatDurationForiTunes(seconds: number): string {
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
   * Format explicit flag for iTunes
   */
  static formatExplicitForiTunes(explicit: boolean): string {
    return explicit ? 'yes' : 'no';
  }

  /**
   * Validate iTunes owner information
   */
  static validateiTunesOwner(owner: iTunesOwner): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!owner.name || owner.name.trim().length === 0) {
      errors.push('iTunes owner name is required');
    } else if (owner.name.length > 255) {
      errors.push('iTunes owner name cannot exceed 255 characters');
    }

    if (!owner.email || owner.email.trim().length === 0) {
      errors.push('iTunes owner email is required');
    } else if (!this.isValidEmail(owner.email)) {
      errors.push('iTunes owner email must be a valid email address');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate iTunes image
   */
  static validateiTunesImage(image: iTunesImage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!image.href || image.href.trim().length === 0) {
      errors.push('iTunes image href is required');
    } else if (!this.isValidUrl(image.href)) {
      errors.push('iTunes image href must be a valid URL');
    } else {
      // Check image format
      const validExtensions = ['.jpg', '.jpeg', '.png'];
      const hasValidExtension = validExtensions.some(ext => 
        image.href.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        errors.push('iTunes image must be a JPG or PNG file');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate iTunes category XML
   */
  static generateiTunesCategoryXML(category: string, subcategory?: string): string {
    const validation = this.validateiTunesCategory(category, subcategory);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (subcategory) {
      return `<itunes:category text="${this.escapeXml(category)}">
    <itunes:category text="${this.escapeXml(subcategory)}"/>
  </itunes:category>`;
    } else {
      return `<itunes:category text="${this.escapeXml(category)}"/>`;
    }
  }

  /**
   * Generate iTunes owner XML
   */
  static generateiTunesOwnerXML(owner: iTunesOwner): string {
    const validation = this.validateiTunesOwner(owner);
    if (!validation.valid) {
      throw new Error(`Invalid iTunes owner: ${validation.errors.join(', ')}`);
    }

    return `<itunes:owner>
  <itunes:name>${this.escapeXml(owner.name)}</itunes:name>
  <itunes:email>${this.escapeXml(owner.email)}</itunes:email>
</itunes:owner>`;
  }

  /**
   * Generate iTunes image XML
   */
  static generateiTunesImageXML(image: iTunesImage): string {
    const validation = this.validateiTunesImage(image);
    if (!validation.valid) {
      throw new Error(`Invalid iTunes image: ${validation.errors.join(', ')}`);
    }

    return `<itunes:image href="${this.escapeXml(image.href)}"/>`;
  }

  /**
   * Generate iTunes episode info XML
   */
  static generateiTunesEpisodeXML(episode: PodcastEpisode, options: {
    includeChapters?: boolean;
    includeTranscript?: boolean;
  } = {}): string {
    const duration = this.formatDurationForiTunes(episode.audio_duration || 0);
    const explicit = this.formatExplicitForiTunes(false); // Default to false since explicit is not in the model

    let xml = `      <itunes:title><![CDATA[${this.escapeXml(episode.title)}]]></itunes:title>
      <itunes:summary><![CDATA[${this.escapeXml(episode.description)}]]></itunes:summary>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:explicit>${explicit}</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>`;

    // Add subtitle if available
    if (episode.summary) {
      xml += `
      <itunes:subtitle><![CDATA[${this.escapeXml(episode.summary)}]]></itunes:subtitle>`;
    }

    // Add chapters if available and requested
    if (options.includeChapters && episode.chapter_markers && episode.chapter_markers.length > 0) {
      xml += `
      <itunes:chapters>`;
      
      for (const chapter of episode.chapter_markers) {
        xml += `
        <itunes:chapter start="${chapter.start_time}" title="${this.escapeXml(chapter.title)}"/>`;
      }
      
      xml += `
      </itunes:chapters>`;
    }

    return xml;
  }

  /**
   * Validate iTunes episode info
   */
  static validateiTunesEpisode(episode: PodcastEpisode): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check title length
    if (episode.title.length > 255) {
      warnings.push('Episode title exceeds 255 characters (iTunes recommendation)');
    }

    // Check description length
    if (episode.description.length > 4000) {
      warnings.push('Episode description exceeds 4000 characters (iTunes limit)');
    }

    // Check for required audio
    if (!episode.hasAudio()) {
      warnings.push('Episode has no audio file (required for iTunes)');
    }

    // Check audio duration
    if (episode.audio_duration && episode.audio_duration < 1) {
      warnings.push('Episode audio duration is very short (less than 1 second)');
    }

    // Check for very long titles
    if (episode.title.length > 200) {
      warnings.push('Episode title is very long (may be truncated in some podcast apps)');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Generate iTunes namespace declaration
   */
  static generateiTunesNamespace(): string {
    return 'xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"';
  }

  /**
   * Generate content namespace declaration
   */
  static generateContentNamespace(): string {
    return 'xmlns:content="http://purl.org/rss/1.0/modules/content/"';
  }

  /**
   * Check if RSS feed is iTunes compliant
   */
  static checkiTunesCompliance(rssContent: string): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for iTunes namespace
    if (!rssContent.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')) {
      issues.push('Missing iTunes namespace declaration');
    }

    // Check for required iTunes elements
    const requirediTunesElements = [
      'itunes:author',
      'itunes:summary',
      'itunes:explicit',
      'itunes:category'
    ];

    for (const element of requirediTunesElements) {
      if (!rssContent.includes(`<${element}>`) && !rssContent.includes(`<${element} `)) {
        issues.push(`Missing required iTunes element: ${element}`);
      }
    }

    // Check for iTunes owner
    if (!rssContent.includes('<itunes:owner>')) {
      issues.push('Missing iTunes owner information');
    }

    // Check for iTunes type
    if (!rssContent.includes('<itunes:type>')) {
      issues.push('Missing iTunes type (should be "episodic" or "serial")');
    }

    return {
      compliant: issues.length === 0,
      issues
    };
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get iTunes compliance score
   */
  static getiTunesComplianceScore(rssContent: string): {
    score: number;
    maxScore: number;
    percentage: number;
    details: { element: string; present: boolean; required: boolean }[];
  } {
    const checks = [
      { element: 'iTunes namespace', present: rssContent.includes('xmlns:itunes='), required: true },
      { element: 'iTunes author', present: rssContent.includes('<itunes:author>'), required: true },
      { element: 'iTunes summary', present: rssContent.includes('<itunes:summary>'), required: true },
      { element: 'iTunes explicit', present: rssContent.includes('<itunes:explicit>'), required: true },
      { element: 'iTunes category', present: rssContent.includes('<itunes:category'), required: true },
      { element: 'iTunes owner', present: rssContent.includes('<itunes:owner>'), required: true },
      { element: 'iTunes type', present: rssContent.includes('<itunes:type>'), required: true },
      { element: 'iTunes image', present: rssContent.includes('<itunes:image'), required: false },
      { element: 'iTunes subtitle', present: rssContent.includes('<itunes:subtitle>'), required: false },
      { element: 'iTunes keywords', present: rssContent.includes('<itunes:keywords>'), required: false }
    ];

    const requiredChecks = checks.filter(check => check.required);
    const passedRequired = requiredChecks.filter(check => check.present).length;
    const passedOptional = checks.filter(check => !check.required && check.present).length;

    const score = passedRequired + (passedOptional * 0.5);
    const maxScore = requiredChecks.length + (checks.length - requiredChecks.length) * 0.5;
    const percentage = Math.round((score / maxScore) * 100);

    return {
      score,
      maxScore,
      percentage,
      details: checks
    };
  }
}
