import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContentSubmission } from '../../src/models/content-submission';

describe('ContentSubmission Model', () => {
  let submission: ContentSubmission;

  beforeEach(() => {
    submission = new ContentSubmission({
      content_url: 'https://example.com/article',
      content_type: 'url',
      user_note: 'Test submission',
      source: 'web'
    });
  });

  describe('Constructor and Basic Properties', () => {
    it('should create a ContentSubmission with valid data', () => {
      expect(submission.id).toBeDefined();
      expect(submission.content_url).toBe('https://example.com/article');
      expect(submission.content_type).toBe('url');
      expect(submission.user_note).toBe('Test submission');
      expect(submission.source).toBe('web');
      expect(submission.status).toBe('pending');
      expect(submission.created_at).toBeInstanceOf(Date);
    });

    it('should generate a valid UUID for id', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(submission.id).toMatch(uuidRegex);
    });

    it('should set default values correctly', () => {
      expect(submission.status).toBe('pending');
      expect(submission.created_at).toBeInstanceOf(Date);
      expect(submission.error_message).toBeUndefined();
      expect(submission.processed_at).toBeUndefined();
      expect(submission.extracted_content).toBeUndefined();
      expect(submission.metadata).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should validate required fields', () => {
      expect(() => new ContentSubmission({
        content_url: '',
        content_type: 'url'
      })).toThrow('Content URL is required');

      expect(() => new ContentSubmission({
        content_url: 'https://example.com',
        content_type: '' as any
      })).toThrow('Invalid content type');
    });

    it('should validate URL format', () => {
      expect(() => new ContentSubmission({
        content_url: 'not-a-url',
        content_type: 'url'
      })).toThrow('Invalid URL format');
    });

    it('should validate content type', () => {
      expect(() => new ContentSubmission({
        content_url: 'https://example.com',
        content_type: 'invalid-type' as any
      })).toThrow('Invalid content type');
    });

    it('should accept long user notes', () => {
      const longNote = 'a'.repeat(1001);
      const submission = new ContentSubmission({
        content_url: 'https://example.com',
        content_type: 'url',
        user_note: longNote
      });
      expect(submission.user_note).toBe(longNote);
    });

    it('should validate status transitions', () => {
      expect(() => submission.updateStatus('invalid-status' as any)).toThrow('Invalid status');
    });
  });

  describe('Status Management', () => {
    it('should update status correctly', () => {
      const updated = submission.updateStatus('processing');
      expect(updated.status).toBe('processing');
      expect(updated).not.toBe(submission); // Should return new instance
    });

    it('should validate status transitions', () => {
      const processing = submission.updateStatus('processing');
      const completed = processing.updateStatus('completed');
      
      expect(completed.status).toBe('completed');
      expect(completed.processed_at).toBeInstanceOf(Date);
    });

    it('should not allow invalid status transitions', () => {
      expect(() => submission.updateStatus('completed')).toThrow('Invalid status transition');
    });
  });

  describe('Content Extraction', () => {
    it('should update extracted content', () => {
      const extractedContent = 'Test extracted content...';

      const updated = submission.updateExtractedContent(extractedContent);
      expect(updated.extracted_content).toBe(extractedContent);
      expect(updated).not.toBe(submission);
    });
  });

  describe('Metadata Management', () => {
    it('should update metadata', () => {
      const metadata = {
        source_domain: 'example.com',
        extraction_method: 'firecrawl',
        quality_score: 0.95
      };

      const updated = submission.updateMetadata(metadata);
      expect(updated.metadata).toEqual(metadata);
      expect(updated).not.toBe(submission);
    });

    it('should merge metadata', () => {
      const initialMetadata = { source_domain: 'example.com' };
      const submissionWithMetadata = submission.updateMetadata(initialMetadata);
      
      const additionalMetadata = { quality_score: 0.95 };
      const updated = submissionWithMetadata.updateMetadata(additionalMetadata);
      
      expect(updated.metadata).toEqual({
        source_domain: 'example.com',
        quality_score: 0.95
      });
    });
  });

  describe('Utility Methods', () => {
    it('should get title from metadata', () => {
      const metadata = {
        title: 'Test Article',
        author: 'Test Author',
        word_count: 100,
        reading_time: 1,
        language: 'en'
      };

      const updated = submission.updateMetadata(metadata);
      expect(updated.getTitle()).toBe('Test Article');
    });

    it('should get author from metadata', () => {
      const metadata = {
        title: 'Test Article',
        author: 'Test Author',
        word_count: 100,
        reading_time: 1,
        language: 'en'
      };

      const updated = submission.updateMetadata(metadata);
      expect(updated.getAuthor()).toBe('Test Author');
    });

    it('should calculate word count from metadata', () => {
      const metadata = {
        title: 'Test Article',
        author: 'Test Author',
        word_count: 150,
        reading_time: 1,
        language: 'en'
      };

      const updated = submission.updateMetadata(metadata);
      expect(updated.getWordCount()).toBe(150);
    });

    it('should calculate reading time from metadata', () => {
      const metadata = {
        title: 'Test Article',
        author: 'Test Author',
        word_count: 300,
        reading_time: 2,
        language: 'en'
      };

      const updated = submission.updateMetadata(metadata);
      expect(updated.getReadingTime()).toBe(2);
    });

    it('should check if status is terminal', () => {
      expect(submission.isTerminal()).toBe(false);
      
      const processing = submission.updateStatus('processing');
      const completed = processing.updateStatus('completed');
      expect(completed.isTerminal()).toBe(true);
      
      const failed = submission.updateStatus('failed', 'Processing failed');
      expect(failed.isTerminal()).toBe(true);
    });

    it('should check if status is processing', () => {
      expect(submission.isProcessing()).toBe(false);
      
      const processing = submission.updateStatus('processing');
      expect(processing.isProcessing()).toBe(true);
    });

    it('should calculate processing duration', () => {
      const processing = submission.updateStatus('processing');
      // Wait a small amount to ensure duration > 0
      setTimeout(() => {
        const completed = processing.updateStatus('completed');
        const duration = completed.getProcessingDuration();
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const json = submission.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('content_url');
      expect(json).toHaveProperty('content_type');
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('created_at');
    });

    it('should deserialize from JSON correctly', () => {
      const json = submission.toJSON();
      const deserialized = ContentSubmission.fromJSON(json);
      
      expect(deserialized.id).toBe(submission.id);
      expect(deserialized.content_url).toBe(submission.content_url);
      expect(deserialized.content_type).toBe(submission.content_type);
      expect(deserialized.status).toBe(submission.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle error messages', () => {
      const errorMessage = 'Processing failed';
      const failed = submission.updateStatus('failed', errorMessage);
      
      expect(failed.status).toBe('failed');
      expect(failed.error_message).toBe(errorMessage);
    });

    it('should clear error message on successful status update', () => {
      const processing = submission.updateStatus('processing');
      const completed = processing.updateStatus('completed');
      
      // Error message should be undefined for completed status
      expect(completed.error_message).toBeUndefined();
    });
  });
});
