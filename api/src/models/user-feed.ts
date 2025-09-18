import { v4 as uuidv4 } from 'uuid';

/**
 * UserFeed Model
 * 
 * Represents a user's personal podcast feed containing all their generated episodes.
 * Matches the data model specification in /specs/001-feature-podcast-generator/data-model.md
 */

export type TTSProvider = 'elevenlabs' | 'azure';

export interface UserFeedData {
  id?: string;
  slug: string;
  title: string;
  description?: string;
  author?: string;
  category?: string;
  artwork_url?: string;
  admin_email: string;
  tts_voice_id?: string;
  tts_provider?: TTSProvider;
  created_at?: Date;
  updated_at?: Date;
}

export class UserFeed {
  public readonly id: string;
  public readonly slug: string;
  public readonly title: string;
  public readonly description?: string;
  public readonly author?: string;
  public readonly category?: string;
  public readonly artwork_url?: string;
  public readonly admin_email: string;
  public readonly tts_voice_id?: string;
  public readonly tts_provider: TTSProvider;
  public readonly created_at: Date;
  public readonly updated_at: Date;

  constructor(data: UserFeedData) {
    this.id = data.id || this.generateId();
    this.slug = data.slug;
    this.title = data.title;
    this.description = data.description;
    this.author = data.author;
    this.category = data.category;
    this.artwork_url = data.artwork_url;
    this.admin_email = data.admin_email;
    this.tts_voice_id = data.tts_voice_id;
    this.tts_provider = data.tts_provider || 'elevenlabs';
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();

    this.validate();
  }

  private generateId(): string {
    return uuidv4();
  }

  private validate(): void {
    // Validate slug
    if (!this.slug || this.slug.trim().length === 0) {
      throw new Error('Slug is required');
    }
    if (!this.isValidSlug(this.slug)) {
      throw new Error('Slug must be URL-safe (alphanumeric, hyphens, underscores only)');
    }

    // Validate title
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (this.title.length > 100) {
      throw new Error('Title must be 100 characters or less');
    }

    // Validate admin_email
    if (!this.admin_email || this.admin_email.trim().length === 0) {
      throw new Error('Admin email is required');
    }
    if (!this.isValidEmail(this.admin_email)) {
      throw new Error('Invalid email format');
    }

    // Validate tts_voice_id is required when tts_provider is 'elevenlabs'
    if (this.tts_provider === 'elevenlabs' && (!this.tts_voice_id || this.tts_voice_id.trim().length === 0)) {
      throw new Error('TTS voice ID is required when TTS provider is ElevenLabs');
    }

    // Validate tts_provider
    const validTTSProviders: TTSProvider[] = ['elevenlabs', 'azure'];
    if (!validTTSProviders.includes(this.tts_provider)) {
      throw new Error(`Invalid TTS provider: ${this.tts_provider}. Must be one of: ${validTTSProviders.join(', ')}`);
    }

    // Validate artwork_url if provided
    if (this.artwork_url && !this.isValidUrl(this.artwork_url)) {
      throw new Error('Invalid artwork URL format');
    }
  }

  private isValidSlug(slug: string): boolean {
    // URL-safe: alphanumeric, hyphens, underscores only
    const slugRegex = /^[a-zA-Z0-9_-]+$/;
    return slugRegex.test(slug);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update the feed title
   */
  public updateTitle(title: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: title,
      description: this.description,
      author: this.author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the feed description
   */
  public updateDescription(description: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: description,
      author: this.author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the feed author
   */
  public updateAuthor(author: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the feed category
   */
  public updateCategory(category: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: this.author,
      category: category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the artwork URL
   */
  public updateArtwork(artworkUrl: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: this.author,
      category: this.category,
      artwork_url: artworkUrl,
      admin_email: this.admin_email,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the admin email
   */
  public updateAdminEmail(adminEmail: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: this.author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: adminEmail,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the TTS configuration
   */
  public updateTTSConfig(ttsProvider: TTSProvider, ttsVoiceId?: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: this.author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: ttsVoiceId,
      tts_provider: ttsProvider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Update the TTS voice ID
   */
  public updateTTSVoiceId(ttsVoiceId: string): UserFeed {
    const updatedData: UserFeedData = {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: this.author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: ttsVoiceId,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new UserFeed(updatedData);
  }

  /**
   * Get the RSS feed URL
   */
  public getRssFeedUrl(baseUrl: string): string {
    return `${baseUrl}/feeds/${this.slug}/rss.xml`;
  }

  /**
   * Get the episodes list URL
   */
  public getEpisodesUrl(baseUrl: string): string {
    return `${baseUrl}/feeds/${this.slug}/episodes`;
  }

  /**
   * Get the feed display name (title or slug fallback)
   */
  public getDisplayName(): string {
    return this.title || this.slug;
  }

  /**
   * Get the feed description or fallback
   */
  public getDescription(): string {
    return this.description || `Personal podcast feed for ${this.getDisplayName()}`;
  }

  /**
   * Get the feed author or fallback
   */
  public getAuthor(): string {
    return this.author || 'Podcast Generator';
  }

  /**
   * Get the feed category or fallback
   */
  public getCategory(): string {
    return this.category || 'Technology';
  }

  /**
   * Check if the feed has artwork
   */
  public hasArtwork(): boolean {
    return !!this.artwork_url && this.artwork_url.trim().length > 0;
  }

  /**
   * Check if the feed has TTS configuration
   */
  public hasTTSConfig(): boolean {
    if (this.tts_provider === 'elevenlabs') {
      return !!this.tts_voice_id && this.tts_voice_id.trim().length > 0;
    }
    return true; // Azure TTS doesn't require voice ID
  }

  /**
   * Get the TTS voice ID or fallback
   */
  public getTTSVoiceId(): string | undefined {
    return this.tts_voice_id;
  }

  /**
   * Get the TTS provider
   */
  public getTTSProvider(): TTSProvider {
    return this.tts_provider;
  }

  /**
   * Check if the feed is using ElevenLabs TTS
   */
  public isUsingElevenLabs(): boolean {
    return this.tts_provider === 'elevenlabs';
  }

  /**
   * Check if the feed is using Azure TTS
   */
  public isUsingAzureTTS(): boolean {
    return this.tts_provider === 'azure';
  }

  /**
   * Get the feed age in days
   */
  public getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.created_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get the last update age in days
   */
  public getLastUpdateAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.updated_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if the feed was recently updated (within last 7 days)
   */
  public isRecentlyUpdated(): boolean {
    return this.getLastUpdateAgeInDays() <= 7;
  }

  /**
   * Get the feed metadata for RSS generation
   */
  public getRSSMetadata(): {
    title: string;
    description: string;
    author: string;
    category: string;
    admin_email: string;
    artwork_url?: string;
    tts_provider: TTSProvider;
    tts_voice_id?: string;
  } {
    return {
      title: this.title,
      description: this.getDescription(),
      author: this.getAuthor(),
      category: this.getCategory(),
      admin_email: this.admin_email,
      artwork_url: this.artwork_url,
      tts_provider: this.tts_provider,
      tts_voice_id: this.tts_voice_id
    };
  }

  /**
   * Convert to plain object for database storage
   */
  public toJSON(): UserFeedData {
    return {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      author: this.author,
      category: this.category,
      artwork_url: this.artwork_url,
      admin_email: this.admin_email,
      tts_voice_id: this.tts_voice_id,
      tts_provider: this.tts_provider,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from plain object (database retrieval)
   */
  public static fromJSON(data: UserFeedData): UserFeed {
    return new UserFeed(data);
  }

  /**
   * Create a new feed with a generated slug
   */
  public static createNew(
    title: string,
    adminEmail: string,
    options?: {
      description?: string;
      author?: string;
      category?: string;
      artwork_url?: string;
      tts_provider?: TTSProvider;
      tts_voice_id?: string;
    }
  ): UserFeed {
    const slug = UserFeed.generateSlugFromTitle(title);
    
    const data: UserFeedData = {
      slug,
      title,
      description: options?.description,
      author: options?.author,
      category: options?.category,
      artwork_url: options?.artwork_url,
      admin_email: adminEmail,
      tts_voice_id: options?.tts_voice_id,
      tts_provider: options?.tts_provider || 'elevenlabs'
    };

    return new UserFeed(data);
  }

  /**
   * Generate a URL-safe slug from a title
   */
  private static generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }
}
