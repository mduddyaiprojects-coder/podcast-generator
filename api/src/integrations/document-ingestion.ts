import { logger } from '../utils/logger';
import { serviceManager } from '../services/service-manager';

/**
 * Document Ingestion Integration Module
 * 
 * Handles ingestion of web documents and articles as a content source 
 * for podcast generation. This module uses Firecrawl to extract clean,
 * structured content from URLs.
 * 
 * Requirements:
 * - FR-003: Document Ingestion Support
 *   "System MUST support ingesting web documents and articles as content 
 *    sources for podcast generation via Firecrawl API."
 * 
 * Note: Documents are a SOURCE only, not a distribution target.
 */

/**
 * Document ingestion result containing extracted content
 */
export interface DocumentIngestionResult {
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedDate?: Date;
  
  // Metadata
  metadata: {
    wordCount: number;
    characterCount: number;
    estimatedReadingTime: number; // in minutes
    language?: string;
  };
  
  // Status
  extractedAt: Date;
  extractionMethod: 'firecrawl' | 'stub';
}

/**
 * Options for document ingestion
 */
export interface DocumentIngestionOptions {
  includeMetadata?: boolean;
  onlyMainContent?: boolean;
  removeImages?: boolean;
  format?: 'markdown' | 'html' | 'text';
}

/**
 * Ingest web document as content source for podcast generation
 * 
 * This is the main entry point for document ingestion (FR-003).
 * Extracts clean, structured content from web pages.
 * 
 * @param url - Web document URL
 * @param options - Ingestion options
 * @returns Complete ingestion result for podcast pipeline
 */
export async function ingestDocument(
  url: string,
  options: DocumentIngestionOptions = {}
): Promise<DocumentIngestionResult> {
  try {
    logger.info('Document ingestion started', { 
      url, 
      options 
    });

    // Validate URL format
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Get Firecrawl service
    const firecrawlService = serviceManager.getFirecrawl();

    // Extract content using Firecrawl
    const extractedContent = await firecrawlService.extractContent(url);

    logger.info('Document content extracted', {
      url,
      title: extractedContent.title.substring(0, 50),
      contentLength: extractedContent.content.length,
      author: extractedContent.author
    });

    // Calculate metadata
    const wordCount = countWords(extractedContent.content);
    const characterCount = extractedContent.content.length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 wpm

    // Build ingestion result
    const result: DocumentIngestionResult = {
      url,
      title: extractedContent.title,
      content: extractedContent.content,
      author: extractedContent.author,
      publishedDate: extractedContent.publishedDate,
      metadata: {
        wordCount,
        characterCount,
        estimatedReadingTime,
        language: detectLanguage(extractedContent.content)
      },
      extractedAt: new Date(),
      extractionMethod: 'firecrawl'
    };

    logger.info('Document ingestion completed successfully', {
      url,
      title: result.title.substring(0, 50),
      wordCount: result.metadata.wordCount,
      estimatedReadingTime: result.metadata.estimatedReadingTime
    });

    return result;

  } catch (error) {
    logger.error('Document ingestion failed', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(`Document ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns true if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Count words in text
 * @param text - Text to count words in
 * @returns Word count
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Detect language from content
 * Simple heuristic-based detection (can be enhanced with proper library)
 * 
 * @param content - Content to detect language from
 * @returns Language code (e.g., 'en', 'es') or undefined
 */
function detectLanguage(content: string): string | undefined {
  // MVP: Simple heuristic detection
  // TODO: Integrate proper language detection library (e.g., franc)
  
  if (!content || content.length < 100) {
    return undefined;
  }

  // For MVP, assume English
  // In production, use a proper language detection library
  return 'en';
}

/**
 * Validate document is accessible and ingestible
 * 
 * Quick check before full ingestion to avoid wasted API calls.
 * 
 * @param url - Document URL
 * @returns true if document is valid and accessible
 */
export async function validateDocument(url: string): Promise<boolean> {
  try {
    if (!isValidUrl(url)) {
      logger.warn('Invalid URL format', { url });
      return false;
    }

    // Quick HEAD request to check if document is accessible
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      logger.warn('Document not accessible', { 
        url, 
        status: response.status 
      });
      return false;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      logger.warn('Document is not HTML', { 
        url, 
        contentType 
      });
      return false;
    }

    return true;

  } catch (error) {
    logger.warn('Document validation failed', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Check if document ingestion is operational
 * Used by health checks (FR-005)
 * 
 * @returns Health status and details
 */
export async function checkDocumentIngestionHealth(): Promise<{
  status: 'OK' | 'DEGRADED' | 'FAILED';
  message: string;
  lastSuccessAt?: Date;
}> {
  try {
    logger.debug('Checking document ingestion health');

    // Check Firecrawl service health
    const firecrawlService = serviceManager.getFirecrawl();
    const isHealthy = await firecrawlService.checkHealth();

    if (isHealthy) {
      return {
        status: 'OK',
        message: 'Document ingestion is operational',
        lastSuccessAt: new Date() // In production, track actual last success
      };
    } else {
      return {
        status: 'DEGRADED',
        message: 'Firecrawl service is not healthy'
      };
    }

  } catch (error) {
    logger.error('Document ingestion health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      status: 'FAILED',
      message: `Document ingestion health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Batch ingest multiple documents
 * 
 * @param urls - Array of document URLs
 * @param options - Ingestion options
 * @returns Array of ingestion results
 */
export async function batchIngestDocuments(
  urls: string[],
  options: DocumentIngestionOptions = {}
): Promise<Array<DocumentIngestionResult | Error>> {
  logger.info('Batch document ingestion started', { 
    count: urls.length,
    options 
  });

  // Ingest documents in parallel
  const results = await Promise.allSettled(
    urls.map(url => ingestDocument(url, options))
  );

  // Map results
  const mappedResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error('Document ingestion failed in batch', {
        url: urls[index],
        error: result.reason
      });
      return new Error(`Failed to ingest ${urls[index]}: ${result.reason}`);
    }
  });

  const successCount = mappedResults.filter(r => !(r instanceof Error)).length;
  logger.info('Batch document ingestion completed', {
    total: urls.length,
    successful: successCount,
    failed: urls.length - successCount
  });

  return mappedResults;
}
