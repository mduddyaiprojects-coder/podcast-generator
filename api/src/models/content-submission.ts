import { v4 as uuidv4 } from 'uuid';

/**
 * ContentSubmission Model
 * 
 * Represents a user's request to convert content into a podcast episode.
 * Matches the data model specification in /specs/001-feature-podcast-generator/data-model.md
 */

export type ContentType = 'url' | 'youtube' | 'pdf' | 'document';
export type SubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ContentSubmissionMetadata {
  title?: string;
  author?: string;
  published_date?: string;
  word_count?: number;
  reading_time?: number;
  language?: string;
  extraction_method?: string;
  extraction_quality?: number;
  [key: string]: any; // Allow additional metadata fields
}

export interface ContentSubmissionData {
  id?: string;
  content_url: string;
  content_type: ContentType;
  user_note?: string;
  status?: SubmissionStatus;
  error_message?: string;
  extracted_content?: string;
  metadata?: ContentSubmissionMetadata;
  created_at?: Date;
  updated_at?: Date;
  processed_at?: Date;
  source?: string;
  device_info?: {
    platform?: string;
    version?: string;
    app?: string;
    share_extension_version?: string;
    shortcut_name?: string;
    shortcut_version?: string;
  };
}

export class ContentSubmission {
  public readonly id: string;
  public readonly content_url: string;
  public readonly content_type: ContentType;
  public readonly user_note?: string;
  public readonly status: SubmissionStatus;
  public readonly error_message?: string;
  public readonly extracted_content?: string;
  public readonly metadata?: ContentSubmissionMetadata;
  public readonly created_at: Date;
  public readonly updated_at: Date;
  public readonly processed_at?: Date;
  public readonly source?: string;
  public readonly device_info?: ContentSubmissionData['device_info'];

  constructor(data: ContentSubmissionData) {
    this.id = data.id || this.generateId();
    this.content_url = data.content_url;
    this.content_type = data.content_type;
    this.user_note = data.user_note;
    this.status = data.status || 'pending';
    this.error_message = data.error_message;
    this.extracted_content = data.extracted_content;
    this.metadata = data.metadata;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.processed_at = data.processed_at;
    this.source = data.source;
    this.device_info = data.device_info;

    this.validate();
  }

  private generateId(): string {
    return uuidv4();
  }

  private validate(): void {
    // Validate content_url
    if (!this.content_url || this.content_url.trim().length === 0) {
      throw new Error('Content URL is required');
    }

    // Validate content_type
    const validContentTypes: ContentType[] = ['url', 'youtube', 'pdf', 'document'];
    if (!validContentTypes.includes(this.content_type)) {
      throw new Error(`Invalid content type: ${this.content_type}. Must be one of: ${validContentTypes.join(', ')}`);
    }

    // Validate status
    const validStatuses: SubmissionStatus[] = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate error_message is present when status is 'failed'
    if (this.status === 'failed' && (!this.error_message || this.error_message.trim().length === 0)) {
      throw new Error('Error message is required when status is "failed"');
    }

    // Validate processed_at is present when status is 'completed' or 'failed'
    if ((this.status === 'completed' || this.status === 'failed') && !this.processed_at) {
      throw new Error('Processed timestamp is required when status is "completed" or "failed"');
    }

    // Validate URL format for url and youtube types
    if (this.content_type === 'url' || this.content_type === 'youtube') {
      try {
        new URL(this.content_url);
      } catch {
        throw new Error(`Invalid URL format: ${this.content_url}`);
      }
    }

    // Validate YouTube URL format
    if (this.content_type === 'youtube') {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
      if (!youtubeRegex.test(this.content_url)) {
        throw new Error(`Invalid YouTube URL format: ${this.content_url}`);
      }
    }
  }

  /**
   * Update the status of the submission
   */
  public updateStatus(newStatus: SubmissionStatus, errorMessage?: string): ContentSubmission {
    // Validate status transition
    this.validateStatusTransition(newStatus);

    const updatedData: ContentSubmissionData = {
      id: this.id,
      content_url: this.content_url,
      content_type: this.content_type,
      user_note: this.user_note,
      status: newStatus,
      error_message: errorMessage || this.error_message,
      extracted_content: this.extracted_content,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: new Date(),
      processed_at: newStatus === 'completed' || newStatus === 'failed' ? new Date() : this.processed_at,
      source: this.source,
      device_info: this.device_info
    };

    return new ContentSubmission(updatedData);
  }

  /**
   * Update the extracted content
   */
  public updateExtractedContent(extractedContent: string): ContentSubmission {
    const updatedData: ContentSubmissionData = {
      id: this.id,
      content_url: this.content_url,
      content_type: this.content_type,
      user_note: this.user_note,
      status: this.status,
      error_message: this.error_message,
      extracted_content: extractedContent,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: new Date(),
      processed_at: this.processed_at,
      source: this.source,
      device_info: this.device_info
    };

    return new ContentSubmission(updatedData);
  }

  /**
   * Update the metadata
   */
  public updateMetadata(metadata: ContentSubmissionMetadata): ContentSubmission {
    const updatedData: ContentSubmissionData = {
      id: this.id,
      content_url: this.content_url,
      content_type: this.content_type,
      user_note: this.user_note,
      status: this.status,
      error_message: this.error_message,
      extracted_content: this.extracted_content,
      metadata: { ...this.metadata, ...metadata },
      created_at: this.created_at,
      updated_at: new Date(),
      processed_at: this.processed_at,
      source: this.source,
      device_info: this.device_info
    };

    return new ContentSubmission(updatedData);
  }

  private validateStatusTransition(newStatus: SubmissionStatus): void {
    const validTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      'pending': ['processing', 'failed'],
      'processing': ['completed', 'failed'],
      'completed': [], // No transitions from completed
      'failed': [] // No transitions from failed
    };

    const allowedTransitions = validTransitions[this.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }
  }

  /**
   * Get the title from metadata or content URL
   */
  public getTitle(): string {
    if (this.metadata?.title) {
      return this.metadata.title;
    }

    if (this.content_type === 'youtube') {
      // Extract video title from YouTube URL (would need API call in real implementation)
      return 'YouTube Video';
    }

    if (this.content_type === 'pdf' || this.content_type === 'document') {
      // Extract filename from URL
      const urlParts = this.content_url.split('/');
      const filename = urlParts[urlParts.length - 1];
      return filename || 'Document';
    }

    // For URL content, use the domain or full URL
    try {
      const url = new URL(this.content_url);
      return url.hostname;
    } catch {
      return this.content_url;
    }
  }

  /**
   * Get the author from metadata
   */
  public getAuthor(): string | undefined {
    return this.metadata?.author;
  }

  /**
   * Get the word count from metadata
   */
  public getWordCount(): number | undefined {
    return this.metadata?.word_count;
  }

  /**
   * Get the reading time from metadata
   */
  public getReadingTime(): number | undefined {
    return this.metadata?.reading_time;
  }

  /**
   * Check if the submission is in a terminal state
   */
  public isTerminal(): boolean {
    return this.status === 'completed' || this.status === 'failed';
  }

  /**
   * Check if the submission is currently being processed
   */
  public isProcessing(): boolean {
    return this.status === 'processing';
  }

  /**
   * Get the processing duration in milliseconds
   */
  public getProcessingDuration(): number | undefined {
    if (!this.processed_at) {
      return undefined;
    }
    return this.processed_at.getTime() - this.created_at.getTime();
  }

  /**
   * Convert to plain object for database storage
   */
  public toJSON(): ContentSubmissionData {
    return {
      id: this.id,
      content_url: this.content_url,
      content_type: this.content_type,
      user_note: this.user_note,
      status: this.status,
      error_message: this.error_message,
      extracted_content: this.extracted_content,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: this.updated_at,
      processed_at: this.processed_at,
      source: this.source,
      device_info: this.device_info
    };
  }

  /**
   * Create from plain object (database retrieval)
   */
  public static fromJSON(data: ContentSubmissionData): ContentSubmission {
    return new ContentSubmission(data);
  }
}
