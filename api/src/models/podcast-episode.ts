export interface PodcastEpisodeData {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number; // in seconds
  publishedAt: Date;
  submissionId: string;
  feedId?: string;
  metadata?: {
    originalUrl?: string | undefined;
    originalTitle?: string | undefined;
    author?: string | undefined;
    tags?: string[];
  };
}

export class PodcastEpisode {
  public readonly id: string;
  public readonly title: string;
  public readonly description: string;
  public readonly audioUrl: string;
  public readonly duration: number;
  public readonly publishedAt: Date;
  public readonly submissionId: string;
  public readonly feedId: string | undefined;
  public readonly metadata?: PodcastEpisodeData['metadata'];

  constructor(data: PodcastEpisodeData) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.audioUrl = data.audioUrl;
    this.duration = data.duration;
    this.publishedAt = data.publishedAt;
    this.submissionId = data.submissionId;
    this.feedId = data.feedId;
    this.metadata = data.metadata;
  }

  getFormattedDuration(): string {
    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getRssGuid(): string {
    return `episode_${this.id}`;
  }

  getEnclosureUrl(): string {
    return this.audioUrl;
  }

  getEnclosureType(): string {
    return 'audio/mpeg';
  }

  getEnclosureLength(): number {
    // This would typically be the file size in bytes
    // For now, we'll estimate based on duration (assuming 128kbps)
    return Math.floor(this.duration * 16 * 1024); // 16KB per second at 128kbps
  }
}
