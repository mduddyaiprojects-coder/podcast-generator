import { v4 as uuidv4 } from 'uuid';

/**
 * PodcastEpisode Model
 * 
 * Represents a generated podcast episode with metadata and audio file reference.
 * Matches the data model specification in /specs/001-feature-podcast-generator/data-model.md
 */

export type ContentType = 'url' | 'youtube' | 'pdf' | 'document';

export interface ChapterMarker {
  title: string;
  start_time: number; // seconds
  end_time: number; // seconds
}

export interface PodcastEpisodeData {
  id?: string;
  submission_id?: string;
  title: string;
  description: string;
  source_url: string;
  content_type: ContentType;
  audio_url?: string;
  audio_duration?: number; // seconds
  audio_size?: number; // bytes
  transcript?: string;
  dialogue_script?: string;
  summary?: string;
  chapter_markers?: ChapterMarker[];
  pub_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class PodcastEpisode {
  public readonly id: string;
  public readonly submission_id?: string;
  public readonly title: string;
  public readonly description: string;
  public readonly source_url: string;
  public readonly content_type: ContentType;
  public readonly audio_url?: string;
  public readonly audio_duration?: number;
  public readonly audio_size?: number;
  public readonly transcript?: string;
  public readonly dialogue_script?: string;
  public readonly summary?: string;
  public readonly chapter_markers?: ChapterMarker[];
  public readonly pub_date: Date;
  public readonly created_at: Date;
  public readonly updated_at: Date;

  constructor(data: PodcastEpisodeData) {
    this.id = data.id || this.generateId();
    this.submission_id = data.submission_id;
    this.title = data.title;
    this.description = data.description;
    this.source_url = data.source_url;
    this.content_type = data.content_type;
    this.audio_url = data.audio_url;
    this.audio_duration = data.audio_duration;
    this.audio_size = data.audio_size;
    this.transcript = data.transcript;
    this.dialogue_script = data.dialogue_script;
    this.summary = data.summary;
    this.chapter_markers = data.chapter_markers;
    this.pub_date = data.pub_date || new Date();
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();

    this.validate();
  }

  private generateId(): string {
    return uuidv4();
  }

  private validate(): void {
    // Validate title
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (this.title.length > 200) {
      throw new Error('Title must be 200 characters or less');
    }

    // Validate description
    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Description is required');
    }
    if (this.description.length > 1000) {
      throw new Error('Description must be 1000 characters or less');
    }

    // Validate source_url
    if (!this.source_url || this.source_url.trim().length === 0) {
      throw new Error('Source URL is required');
    }

    // Validate content_type
    const validContentTypes: ContentType[] = ['url', 'youtube', 'pdf', 'document'];
    if (!validContentTypes.includes(this.content_type)) {
      throw new Error(`Invalid content type: ${this.content_type}. Must be one of: ${validContentTypes.join(', ')}`);
    }

    // Note: feed_id removed - using single public feed

    // Validate audio_duration if audio_url is present
    if (this.audio_url && (!this.audio_duration || this.audio_duration <= 0)) {
      throw new Error('Audio duration must be greater than 0 when audio URL is present');
    }

    // Validate audio_size if audio_url is present
    if (this.audio_url && (!this.audio_size || this.audio_size <= 0)) {
      throw new Error('Audio size must be greater than 0 when audio URL is present');
    }

    // Validate pub_date is not in the future
    if (this.pub_date > new Date()) {
      throw new Error('Publication date cannot be in the future');
    }

    // Validate chapter markers
    if (this.chapter_markers) {
      this.validateChapterMarkers();
    }
  }

  private validateChapterMarkers(): void {
    if (!Array.isArray(this.chapter_markers)) {
      throw new Error('Chapter markers must be an array');
    }

    for (let i = 0; i < this.chapter_markers.length; i++) {
      const marker = this.chapter_markers[i];
      
      if (!marker || !marker.title || marker.title.trim().length === 0) {
        throw new Error(`Chapter marker ${i + 1}: title is required`);
      }

      if (typeof marker.start_time !== 'number' || marker.start_time < 0) {
        throw new Error(`Chapter marker ${i + 1}: start_time must be a non-negative number`);
      }

      if (typeof marker.end_time !== 'number' || marker.end_time <= marker.start_time) {
        throw new Error(`Chapter marker ${i + 1}: end_time must be greater than start_time`);
      }

      // Validate against audio duration if available
      if (this.audio_duration && marker.end_time > this.audio_duration) {
        throw new Error(`Chapter marker ${i + 1}: end_time cannot exceed audio duration`);
      }
    }

    // Check for overlapping markers
    for (let i = 0; i < this.chapter_markers.length - 1; i++) {
      const current = this.chapter_markers[i];
      const next = this.chapter_markers[i + 1];

      if (current && next && current.end_time > next.start_time) {
        throw new Error(`Chapter markers ${i + 1} and ${i + 2} overlap`);
      }
    }
  }

  /**
   * Update the audio information
   */
  public updateAudio(audioUrl: string, duration: number, size: number): PodcastEpisode {
    const updatedData: PodcastEpisodeData = {
      id: this.id,
      submission_id: this.submission_id,
      title: this.title,
      description: this.description,
      source_url: this.source_url,
      content_type: this.content_type,
      audio_url: audioUrl,
      audio_duration: duration,
      audio_size: size,
      transcript: this.transcript,
      dialogue_script: this.dialogue_script,
      summary: this.summary,
      chapter_markers: this.chapter_markers,
      pub_date: this.pub_date,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new PodcastEpisode(updatedData);
  }

  /**
   * Update the transcript
   */
  public updateTranscript(transcript: string): PodcastEpisode {
    const updatedData: PodcastEpisodeData = {
      id: this.id,
      submission_id: this.submission_id,
      title: this.title,
      description: this.description,
      source_url: this.source_url,
      content_type: this.content_type,
      audio_url: this.audio_url,
      audio_duration: this.audio_duration,
      audio_size: this.audio_size,
      transcript: transcript,
      dialogue_script: this.dialogue_script,
      summary: this.summary,
      chapter_markers: this.chapter_markers,
      pub_date: this.pub_date,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new PodcastEpisode(updatedData);
  }

  /**
   * Update the dialogue script
   */
  public updateDialogueScript(dialogueScript: string): PodcastEpisode {
    const updatedData: PodcastEpisodeData = {
      id: this.id,
      submission_id: this.submission_id,
      title: this.title,
      description: this.description,
      source_url: this.source_url,
      content_type: this.content_type,
      audio_url: this.audio_url,
      audio_duration: this.audio_duration,
      audio_size: this.audio_size,
      transcript: this.transcript,
      dialogue_script: dialogueScript,
      summary: this.summary,
      chapter_markers: this.chapter_markers,
      pub_date: this.pub_date,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new PodcastEpisode(updatedData);
  }

  /**
   * Update the summary
   */
  public updateSummary(summary: string): PodcastEpisode {
    const updatedData: PodcastEpisodeData = {
      id: this.id,
      submission_id: this.submission_id,
      title: this.title,
      description: this.description,
      source_url: this.source_url,
      content_type: this.content_type,
      audio_url: this.audio_url,
      audio_duration: this.audio_duration,
      audio_size: this.audio_size,
      transcript: this.transcript,
      dialogue_script: this.dialogue_script,
      summary: summary,
      chapter_markers: this.chapter_markers,
      pub_date: this.pub_date,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new PodcastEpisode(updatedData);
  }

  /**
   * Update the chapter markers
   */
  public updateChapterMarkers(chapterMarkers: ChapterMarker[]): PodcastEpisode {
    const updatedData: PodcastEpisodeData = {
      id: this.id,
      submission_id: this.submission_id,
      title: this.title,
      description: this.description,
      source_url: this.source_url,
      content_type: this.content_type,
      audio_url: this.audio_url,
      audio_duration: this.audio_duration,
      audio_size: this.audio_size,
      transcript: this.transcript,
      dialogue_script: this.dialogue_script,
      summary: this.summary,
      chapter_markers: chapterMarkers,
      pub_date: this.pub_date,
      created_at: this.created_at,
      updated_at: new Date()
    };

    return new PodcastEpisode(updatedData);
  }

  /**
   * Get formatted duration string (MM:SS)
   */
  public getFormattedDuration(): string {
    if (!this.audio_duration) {
      return '00:00';
    }

    const minutes = Math.floor(this.audio_duration / 60);
    const seconds = Math.floor(this.audio_duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get formatted duration string (HH:MM:SS)
   */
  public getFormattedDurationLong(): string {
    if (!this.audio_duration) {
      return '00:00:00';
    }

    const hours = Math.floor(this.audio_duration / 3600);
    const minutes = Math.floor((this.audio_duration % 3600) / 60);
    const seconds = Math.floor(this.audio_duration % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get RSS GUID for the episode
   */
  public getRssGuid(): string {
    return `episode_${this.id}`;
  }

  /**
   * Get enclosure URL for RSS feed
   */
  public getEnclosureUrl(): string | undefined {
    return this.audio_url;
  }

  /**
   * Get enclosure type for RSS feed
   */
  public getEnclosureType(): string {
    return 'audio/mpeg';
  }

  /**
   * Get enclosure length for RSS feed
   */
  public getEnclosureLength(): number | undefined {
    return this.audio_size;
  }

  /**
   * Get word count from transcript
   */
  public getWordCount(): number {
    if (!this.transcript) {
      return 0;
    }
    return this.transcript.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get estimated reading time in minutes
   */
  public getReadingTime(): number {
    const wordCount = this.getWordCount();
    const wordsPerMinute = 200; // Average reading speed
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Check if episode has audio
   */
  public hasAudio(): boolean {
    return !!this.audio_url && !!this.audio_duration && !!this.audio_size;
  }

  /**
   * Check if episode has transcript
   */
  public hasTranscript(): boolean {
    return !!this.transcript && this.transcript.trim().length > 0;
  }

  /**
   * Check if episode has dialogue script
   */
  public hasDialogueScript(): boolean {
    return !!this.dialogue_script && this.dialogue_script.trim().length > 0;
  }

  /**
   * Check if episode has chapter markers
   */
  public hasChapterMarkers(): boolean {
    return !!this.chapter_markers && this.chapter_markers.length > 0;
  }

  /**
   * Get chapter marker at specific time
   */
  public getChapterAtTime(timeInSeconds: number): ChapterMarker | undefined {
    if (!this.chapter_markers) {
      return undefined;
    }

    return this.chapter_markers.find(marker => 
      timeInSeconds >= marker.start_time && timeInSeconds <= marker.end_time
    );
  }

  /**
   * Get all chapter markers as a formatted string
   */
  public getChapterMarkersAsString(): string {
    if (!this.chapter_markers || this.chapter_markers.length === 0) {
      return '';
    }

    return this.chapter_markers
      .map(marker => `${this.getFormattedDurationLong()}: ${marker.title}`)
      .join('\n');
  }

  /**
   * Convert to plain object for database storage
   */
  public toJSON(): PodcastEpisodeData {
    return {
      id: this.id,
      submission_id: this.submission_id,
      title: this.title,
      description: this.description,
      source_url: this.source_url,
      content_type: this.content_type,
      audio_url: this.audio_url,
      audio_duration: this.audio_duration,
      audio_size: this.audio_size,
      transcript: this.transcript,
      dialogue_script: this.dialogue_script,
      summary: this.summary,
      chapter_markers: this.chapter_markers,
      pub_date: this.pub_date,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from plain object (database retrieval)
   */
  public static fromJSON(data: PodcastEpisodeData): PodcastEpisode {
    return new PodcastEpisode(data);
  }
}
