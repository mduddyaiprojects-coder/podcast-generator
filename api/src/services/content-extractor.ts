import { ContentSubmission, ContentType, ContentSubmissionMetadata } from '../models/content-submission';
import { FirecrawlService } from './firecrawl-service';
import { AzureOpenAIService } from './azure-openai-service';
import { logger } from '../utils/logger';

/**
 * ContentExtractor Service
 * 
 * Handles content extraction from various sources (URLs, YouTube videos, PDFs, documents).
 * Integrates with Firecrawl for web content and Azure OpenAI for content processing.
 */

export interface ExtractedContent {
  title: string;
  content: string;
  author?: string;
  published_date?: string;
  word_count: number;
  reading_time: number;
  language: string;
  extraction_method: string;
  extraction_quality: number;
  metadata?: Record<string, any>;
}

export interface YouTubeVideoInfo {
  title: string;
  description: string;
  duration: number; // seconds
  author: string;
  published_date: string;
  thumbnail_url?: string;
  transcript?: string;
}

export interface DocumentInfo {
  title: string;
  content: string;
  page_count?: number;
  file_type: string;
  file_size?: number;
  author?: string;
  created_date?: string;
}

export class ContentExtractor {
  private firecrawlService: FirecrawlService;
  private azureOpenAIService: AzureOpenAIService;

  constructor() {
    this.firecrawlService = new FirecrawlService();
    this.azureOpenAIService = new AzureOpenAIService();
  }

  /**
   * Extract content from a ContentSubmission
   */
  async extractContent(submission: ContentSubmission): Promise<ExtractedContent> {
    try {
      logger.info(`Extracting content for submission ${submission.id}, type: ${submission.content_type}`);

      let extractedContent: ExtractedContent;

      switch (submission.content_type) {
        case 'url':
          extractedContent = await this.extractFromUrl(submission.content_url);
          break;
        case 'youtube':
          extractedContent = await this.extractFromYouTube(submission.content_url);
          break;
        case 'pdf':
          extractedContent = await this.extractFromPdf(submission.content_url);
          break;
        case 'document':
          extractedContent = await this.extractFromDocument(submission.content_url);
          break;
        default:
          throw new Error(`Unsupported content type: ${submission.content_type}`);
      }

      logger.info(`Successfully extracted content for submission ${submission.id}`);
      return extractedContent;
    } catch (error) {
      logger.error(`Content extraction failed for submission ${submission.id}:`, error);
      throw error;
    }
  }

  /**
   * Extract content from a URL using Firecrawl
   */
  private async extractFromUrl(url: string): Promise<ExtractedContent> {
    try {
      logger.info(`Extracting content from URL: ${url}`);

      // Use Firecrawl to extract content
      const firecrawlResult = await this.firecrawlService.extractContent(url);
      
      // Calculate word count and reading time
      const wordCount = this.calculateWordCount(firecrawlResult.content);
      const readingTime = this.calculateReadingTime(wordCount);

      // Detect language
      const language = await this.detectLanguage(firecrawlResult.content);

      // Assess extraction quality
      const extractionQuality = this.assessExtractionQuality(firecrawlResult.content, wordCount);

      const extractedContent: ExtractedContent = {
        title: firecrawlResult.title || this.extractTitleFromUrl(url),
        content: firecrawlResult.content,
        author: firecrawlResult.author,
        published_date: firecrawlResult.publishedDate?.toISOString(),
        word_count: wordCount,
        reading_time: readingTime,
        language: language,
        extraction_method: 'firecrawl',
        extraction_quality: extractionQuality,
        metadata: {
          original_url: url,
          extraction_timestamp: new Date().toISOString(),
          firecrawl_metadata: firecrawlResult
        }
      };

      logger.info(`Successfully extracted content from URL: ${url}, word count: ${wordCount}`);
      return extractedContent;
    } catch (error) {
      logger.error(`URL extraction failed for ${url}:`, error);
      throw new Error(`Failed to extract content from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from a YouTube video
   */
  private async extractFromYouTube(youtubeUrl: string): Promise<ExtractedContent> {
    try {
      logger.info(`Extracting content from YouTube video: ${youtubeUrl}`);

      // Extract video ID from URL
      const videoId = this.extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      // Get video information
      const videoInfo = await this.getYouTubeVideoInfo(videoId);
      
      // Get transcript if available
      const transcript = await this.getYouTubeTranscript(videoId);
      
      // Use transcript as content, fallback to description
      const content = transcript || videoInfo.description || '';
      
      // Calculate word count and reading time
      const wordCount = this.calculateWordCount(content);
      const readingTime = this.calculateReadingTime(wordCount);

      // Detect language
      const language = await this.detectLanguage(content);

      // Assess extraction quality
      const extractionQuality = this.assessExtractionQuality(content, wordCount);

      const extractedContent: ExtractedContent = {
        title: videoInfo.title,
        content: content,
        author: videoInfo.author,
        published_date: videoInfo.published_date,
        word_count: wordCount,
        reading_time: readingTime,
        language: language,
        extraction_method: 'youtube_api',
        extraction_quality: extractionQuality,
        metadata: {
          youtube_video_id: videoId,
          youtube_url: youtubeUrl,
          duration: videoInfo.duration,
          thumbnail_url: videoInfo.thumbnail_url,
          extraction_timestamp: new Date().toISOString(),
          has_transcript: !!transcript
        }
      };

      logger.info(`Successfully extracted content from YouTube video: ${youtubeUrl}, word count: ${wordCount}`);
      return extractedContent;
    } catch (error) {
      logger.error(`YouTube extraction failed for ${youtubeUrl}:`, error);
      throw new Error(`Failed to extract content from YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from a PDF file
   */
  private async extractFromPdf(pdfUrl: string): Promise<ExtractedContent> {
    try {
      logger.info(`Extracting content from PDF: ${pdfUrl}`);

      // Use Firecrawl to extract PDF content
      const firecrawlResult = await this.firecrawlService.extractContent(pdfUrl);
      
      // Calculate word count and reading time
      const wordCount = this.calculateWordCount(firecrawlResult.content);
      const readingTime = this.calculateReadingTime(wordCount);

      // Detect language
      const language = await this.detectLanguage(firecrawlResult.content);

      // Assess extraction quality
      const extractionQuality = this.assessExtractionQuality(firecrawlResult.content, wordCount);

      const extractedContent: ExtractedContent = {
        title: firecrawlResult.title || this.extractTitleFromUrl(pdfUrl),
        content: firecrawlResult.content,
        author: firecrawlResult.author,
        published_date: firecrawlResult.publishedDate?.toISOString(),
        word_count: wordCount,
        reading_time: readingTime,
        language: language,
        extraction_method: 'firecrawl_pdf',
        extraction_quality: extractionQuality,
        metadata: {
          original_url: pdfUrl,
          file_type: 'pdf',
          extraction_timestamp: new Date().toISOString(),
          firecrawl_metadata: firecrawlResult
        }
      };

      logger.info(`Successfully extracted content from PDF: ${pdfUrl}, word count: ${wordCount}`);
      return extractedContent;
    } catch (error) {
      logger.error(`PDF extraction failed for ${pdfUrl}:`, error);
      throw new Error(`Failed to extract content from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from a document file
   */
  private async extractFromDocument(documentUrl: string): Promise<ExtractedContent> {
    try {
      logger.info(`Extracting content from document: ${documentUrl}`);

      // Use Firecrawl to extract document content
      const firecrawlResult = await this.firecrawlService.extractContent(documentUrl);
      
      // Calculate word count and reading time
      const wordCount = this.calculateWordCount(firecrawlResult.content);
      const readingTime = this.calculateReadingTime(wordCount);

      // Detect language
      const language = await this.detectLanguage(firecrawlResult.content);

      // Assess extraction quality
      const extractionQuality = this.assessExtractionQuality(firecrawlResult.content, wordCount);

      // Determine file type from URL
      const fileType = this.getFileTypeFromUrl(documentUrl);

      const extractedContent: ExtractedContent = {
        title: firecrawlResult.title || this.extractTitleFromUrl(documentUrl),
        content: firecrawlResult.content,
        author: firecrawlResult.author,
        published_date: firecrawlResult.publishedDate?.toISOString(),
        word_count: wordCount,
        reading_time: readingTime,
        language: language,
        extraction_method: 'firecrawl_document',
        extraction_quality: extractionQuality,
        metadata: {
          original_url: documentUrl,
          file_type: fileType,
          extraction_timestamp: new Date().toISOString(),
          firecrawl_metadata: firecrawlResult
        }
      };

      logger.info(`Successfully extracted content from document: ${documentUrl}, word count: ${wordCount}`);
      return extractedContent;
    } catch (error) {
      logger.error(`Document extraction failed for ${documentUrl}:`, error);
      throw new Error(`Failed to extract content from document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get YouTube video information
   */
  private async getYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    // TODO: Implement YouTube API integration
    // For now, return mock data
    logger.warn('YouTube API integration not implemented, using mock data');
    
    return {
      title: `YouTube Video ${videoId}`,
      description: 'Video description not available',
      duration: 0,
      author: 'Unknown Author',
      published_date: new Date().toISOString(),
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  }

  /**
   * Get YouTube video transcript
   */
  private async getYouTubeTranscript(videoId: string): Promise<string | null> {
    // TODO: Implement YouTube transcript extraction
    // This would use YouTube API or a service like Firecrawl
    logger.warn('YouTube transcript extraction not implemented');
    return null;
  }

  /**
   * Calculate word count from content
   */
  private calculateWordCount(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }

    // Split by whitespace and filter out empty strings
    const words = content.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Calculate reading time in minutes
   */
  private calculateReadingTime(wordCount: number): number {
    const wordsPerMinute = 200; // Average reading speed
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Detect language of content
   */
  private async detectLanguage(content: string): Promise<string> {
    if (!content || content.trim().length === 0) {
      return 'unknown';
    }

    // Simple language detection based on common words
    // In a real implementation, this would use a proper language detection library
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le'];
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans'];

    const words = content.toLowerCase().split(/\s+/);
    const sampleSize = Math.min(100, words.length);
    const sample = words.slice(0, sampleSize);

    let englishCount = 0;
    let spanishCount = 0;
    let frenchCount = 0;

    for (const word of sample) {
      if (englishWords.includes(word)) englishCount++;
      if (spanishWords.includes(word)) spanishCount++;
      if (frenchWords.includes(word)) frenchCount++;
    }

    if (englishCount > spanishCount && englishCount > frenchCount) return 'en';
    if (spanishCount > englishCount && spanishCount > frenchCount) return 'es';
    if (frenchCount > englishCount && frenchCount > spanishCount) return 'fr';
    
    return 'en'; // Default to English
  }

  /**
   * Assess extraction quality (0-100)
   */
  private assessExtractionQuality(content: string, wordCount: number): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }

    let quality = 50; // Base quality

    // Adjust based on content length
    if (wordCount > 100) quality += 20;
    if (wordCount > 500) quality += 10;
    if (wordCount > 1000) quality += 10;

    // Adjust based on content structure
    if (content.includes('\n\n')) quality += 5; // Has paragraphs
    if (content.includes('.')) quality += 5; // Has sentences
    if (content.includes('?')) quality += 5; // Has questions
    if (content.includes('!')) quality += 5; // Has exclamations

    // Adjust based on content quality indicators
    if (content.length > 100 && content.includes(' ')) quality += 10; // Proper spacing
    if (content.match(/[A-Z][a-z]+/)) quality += 5; // Proper capitalization

    return Math.min(100, Math.max(0, quality));
  }

  /**
   * Extract title from URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.includes('.')) {
        return filename.split('.')[0].replace(/[-_]/g, ' ');
      }
      
      return urlObj.hostname;
    } catch {
      return 'Untitled Content';
    }
  }

  /**
   * Get file type from URL
   */
  private getFileTypeFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop()?.toLowerCase();
      
      return extension || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Convert extracted content to ContentSubmissionMetadata
   */
  public toContentSubmissionMetadata(extractedContent: ExtractedContent): ContentSubmissionMetadata {
    return {
      title: extractedContent.title,
      author: extractedContent.author,
      published_date: extractedContent.published_date,
      word_count: extractedContent.word_count,
      reading_time: extractedContent.reading_time,
      language: extractedContent.language,
      extraction_method: extractedContent.extraction_method,
      extraction_quality: extractedContent.extraction_quality
    };
  }

  /**
   * Check if the service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Check Firecrawl service health
      const firecrawlHealthy = await this.firecrawlService.checkHealth();
      
      // Check Azure OpenAI service health
      const azureOpenAIHealthy = await this.azureOpenAIService.checkHealth();
      
      return firecrawlHealthy && azureOpenAIHealthy;
    } catch (error) {
      logger.error('ContentExtractor health check failed:', error);
      return false;
    }
  }
}
