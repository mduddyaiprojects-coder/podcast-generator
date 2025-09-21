import { logger } from '../utils/logger';

export interface ExtractedContent {
  title: string;
  content: string;
  author?: string;
  publishedDate?: Date;
}

export interface FirecrawlConfig {
  apiKey: string;
  apiUrl?: string;
}

export class FirecrawlService {
  private config: FirecrawlConfig;
  private isHealthy: boolean = true;

  constructor() {
    this.config = {
      apiKey: process.env['FIRECRAWL_API_KEY'] || '',
      apiUrl: process.env['FIRECRAWL_API_URL'] || 'https://api.firecrawl.dev'
    };

    if (!this.config.apiKey) {
      logger.warn('FIRECRAWL_API_KEY not configured - Firecrawl service will not function');
    }
  }

  /**
   * Extract content from a URL using Firecrawl
   */
  async extractContent(url: string): Promise<ExtractedContent> {
    if (!this.config.apiKey) {
      throw new Error('Firecrawl API key not configured');
    }

    try {
      logger.info('Extracting content with Firecrawl:', url);

      // Import Firecrawl dynamically to avoid build issues if not installed
      const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
      
      const app = new FirecrawlApp({
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl
      });

      // Scrape the URL
      const scrapeResult = await app.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        removeBase64Images: true,
        includeTags: ['title', 'meta', 'article', 'main'],
        excludeTags: ['nav', 'footer', 'aside', 'script', 'style']
      });

      if (!scrapeResult.success) {
        throw new Error(`Firecrawl scraping failed: ${scrapeResult.error}`);
      }

      const data = scrapeResult;
      
      // Extract metadata
      const title = this.extractTitle(data);
      const author = this.extractAuthor(data);
      const publishedDate = this.extractPublishedDate(data);
      const content = this.cleanContent(data.markdown || data.html || '');

      logger.info('Successfully extracted content:', {
        url,
        title: title.substring(0, 100),
        contentLength: content.length,
        author,
        publishedDate
      });

      return {
        title,
        content,
        author,
        publishedDate
      };

    } catch (error) {
      logger.error('Firecrawl extraction failed:', error);
      this.isHealthy = false;
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Firecrawl service is healthy
   */
  async checkHealth(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // Test with a simple URL to verify API connectivity
      const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
      
      const app = new FirecrawlApp({
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl
      });

      // Try to scrape a simple page to test connectivity
      const testResult = await app.scrapeUrl('https://example.com', {
        formats: ['markdown'],
        onlyMainContent: true
      });

      this.isHealthy = testResult.success;
      return this.isHealthy;

    } catch (error) {
      logger.error('Firecrawl health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Extract title from scraped data
   */
  private extractTitle(data: any): string {
    // Try multiple sources for title
    if (data.metadata?.title) {
      return data.metadata.title;
    }
    
    if (data.metadata?.og?.title) {
      return data.metadata.og.title;
    }
    
    if (data.metadata?.twitter?.title) {
      return data.metadata.twitter.title;
    }
    
    // Extract from HTML if available
    if (data.html) {
      const titleMatch = data.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }
    
    // Fallback to URL-based title
    try {
      const urlObj = new URL(data.metadata?.sourceURL || '');
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Untitled';
    }
  }

  /**
   * Extract author from scraped data
   */
  private extractAuthor(data: any): string | undefined {
    // Try multiple sources for author
    if (data.metadata?.author) {
      return data.metadata.author;
    }
    
    if (data.metadata?.og?.author) {
      return data.metadata.og.author;
    }
    
    if (data.metadata?.twitter?.creator) {
      return data.metadata.twitter.creator;
    }
    
    // Extract from HTML meta tags
    if (data.html) {
      const authorMatch = data.html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
      if (authorMatch) {
        return authorMatch[1].trim();
      }
    }
    
    return undefined;
  }

  /**
   * Extract published date from scraped data
   */
  private extractPublishedDate(data: any): Date | undefined {
    // Try multiple sources for published date
    if (data.metadata?.publishedTime) {
      return new Date(data.metadata.publishedTime);
    }
    
    if (data.metadata?.og?.published_time) {
      return new Date(data.metadata.og.published_time);
    }
    
    if (data.metadata?.article?.published_time) {
      return new Date(data.metadata.article.published_time);
    }
    
    // Extract from HTML meta tags
    if (data.html) {
      const dateMatch = data.html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
      if (dateMatch) {
        const date = new Date(dateMatch[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Clean and format content
   */
  private cleanContent(content: string): string {
    if (!content) {
      return '';
    }

    // Remove excessive whitespace
    let cleaned = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove HTML tags if content is HTML
    if (content.includes('<')) {
      cleaned = cleaned.replace(/<[^>]*>/g, '');
    }
    
    // Clean up markdown formatting
    cleaned = cleaned
      .replace(/\*\*\s*\*\*/g, '') // Remove empty bold
      .replace(/\*\s*\*/g, '') // Remove empty italic
      .replace(/#{1,6}\s*$/gm, '') // Remove empty headers
      .replace(/^\s*[-*+]\s*$/gm, '') // Remove empty list items
      .trim();
    
    return cleaned;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): boolean {
    return this.isHealthy;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Omit<FirecrawlConfig, 'apiKey'> {
    return {
      apiUrl: this.config.apiUrl
    };
  }
}
