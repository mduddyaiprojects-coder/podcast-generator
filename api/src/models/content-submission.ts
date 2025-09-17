export interface ContentSubmissionData {
  url?: string;
  youtubeUrl?: string;
  document?: {
    content: string;
    title: string;
    type: 'pdf' | 'docx' | 'txt';
  };
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
  };
}

export class ContentSubmission {
  public readonly id: string;
  public readonly url: string | undefined;
  public readonly youtubeUrl: string | undefined;
  public readonly document?: ContentSubmissionData['document'];
  public readonly metadata?: ContentSubmissionData['metadata'];
  public readonly submittedAt: Date;
  public readonly status: 'pending' | 'processing' | 'completed' | 'failed';

  constructor(data: ContentSubmissionData) {
    this.id = this.generateId();
    this.url = data.url;
    this.youtubeUrl = data.youtubeUrl;
    this.document = data.document;
    this.metadata = data.metadata;
    this.submittedAt = new Date();
    this.status = 'pending';
  }

  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getContentType(): 'url' | 'youtube' | 'document' {
    if (this.youtubeUrl) return 'youtube';
    if (this.document) return 'document';
    if (this.url) return 'url';
    throw new Error('Invalid content submission: no content provided');
  }

  getTitle(): string {
    if (this.metadata?.title) return this.metadata.title;
    if (this.document?.title) return this.document.title;
    if (this.url) return this.url;
    if (this.youtubeUrl) return this.youtubeUrl;
    return 'Untitled Content';
  }
}
