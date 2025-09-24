import { ContentSubmission, ContentSubmissionData, ContentSubmissionMetadata, ContentType, SubmissionStatus } from '../../src/models/content-submission';

// Mock timers to control Date.now() for testing
jest.useFakeTimers();

describe('ContentSubmission', () => {
  const validSubmissionData: ContentSubmissionData = {
    content_url: 'https://example.com/article',
    content_type: 'url'
  };

  const validMetadata: ContentSubmissionMetadata = {
    title: 'Test Article',
    author: 'Test Author',
    published_date: '2023-01-01',
    word_count: 1000,
    reading_time: 5,
    language: 'en',
    extraction_method: 'firecrawl',
    extraction_quality: 0.95
  };

  const validDeviceInfo = {
    platform: 'iOS',
    version: '17.0',
    app: 'PodcastGenerator',
    share_extension_version: '1.0.0',
    shortcut_name: 'Create Podcast',
    shortcut_version: '1.0.0'
  };

  describe('constructor', () => {
    it('should create submission with minimal required data', () => {
      const submission = new ContentSubmission(validSubmissionData);

      expect(submission.content_url).toBe('https://example.com/article');
      expect(submission.content_type).toBe('url');
      expect(submission.status).toBe('pending');
      expect(submission.id).toBeDefined();
      expect(submission.created_at).toBeInstanceOf(Date);
      expect(submission.updated_at).toBeInstanceOf(Date);
    });

    it('should create submission with all optional data', () => {
      const fullData: ContentSubmissionData = {
        id: 'test-id-123',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        content_type: 'youtube',
        user_note: 'Test note',
        status: 'completed',
        error_message: undefined,
        extracted_content: 'Extracted content here',
        metadata: validMetadata,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
        processed_at: new Date('2023-01-01'),
        source: 'ios_share',
        device_info: validDeviceInfo
      };

      const submission = new ContentSubmission(fullData);

      expect(submission.id).toBe('test-id-123');
      expect(submission.user_note).toBe('Test note');
      expect(submission.status).toBe('completed');
      expect(submission.extracted_content).toBe('Extracted content here');
      expect(submission.metadata).toEqual(validMetadata);
      expect(submission.processed_at).toEqual(new Date('2023-01-01'));
      expect(submission.source).toBe('ios_share');
      expect(submission.device_info).toEqual(validDeviceInfo);
    });

    it('should generate UUID when no ID provided', () => {
      const submission = new ContentSubmission(validSubmissionData);
      expect(submission.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should set default dates when not provided', () => {
      const submission = new ContentSubmission(validSubmissionData);
      const now = new Date();
      
      expect(submission.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(submission.updated_at.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  describe('validation', () => {
    it('should throw error for empty content_url', () => {
      expect(() => new ContentSubmission({ ...validSubmissionData, content_url: '' }))
        .toThrow('Content URL is required');
    });

    it('should throw error for whitespace-only content_url', () => {
      expect(() => new ContentSubmission({ ...validSubmissionData, content_url: '   ' }))
        .toThrow('Content URL is required');
    });

    it('should throw error for invalid content_type', () => {
      expect(() => new ContentSubmission({ ...validSubmissionData, content_type: 'invalid' as ContentType }))
        .toThrow('Invalid content type: invalid. Must be one of: url, youtube, pdf, document');
    });

    it('should throw error for invalid status', () => {
      expect(() => new ContentSubmission({ ...validSubmissionData, status: 'invalid' as SubmissionStatus }))
        .toThrow('Invalid status: invalid. Must be one of: pending, processing, completed, failed');
    });

    it('should throw error for failed status without error message', () => {
      expect(() => new ContentSubmission({ 
        ...validSubmissionData, 
        status: 'failed',
        processed_at: new Date()
      })).toThrow('Error message is required when status is "failed"');
    });

    it('should throw error for completed status without processed_at', () => {
      expect(() => new ContentSubmission({ 
        ...validSubmissionData, 
        status: 'completed'
      })).toThrow('Processed timestamp is required when status is "completed" or "failed"');
    });

    it('should throw error for failed status without processed_at', () => {
      expect(() => new ContentSubmission({ 
        ...validSubmissionData, 
        status: 'failed',
        error_message: 'Test error'
      })).toThrow('Processed timestamp is required when status is "completed" or "failed"');
    });

    it('should throw error for invalid URL format', () => {
      expect(() => new ContentSubmission({ 
        ...validSubmissionData, 
        content_url: 'not-a-url'
      })).toThrow('Invalid URL format: not-a-url');
    });

    it('should throw error for invalid YouTube URL format', () => {
      expect(() => new ContentSubmission({ 
        ...validSubmissionData, 
        content_type: 'youtube',
        content_url: 'https://example.com/not-youtube'
      })).toThrow('Invalid YouTube URL format: https://example.com/not-youtube');
    });

    it('should accept valid YouTube URL formats', () => {
      const validYouTubeUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'http://youtu.be/dQw4w9WgXcQ'
      ];

      validYouTubeUrls.forEach(url => {
        expect(() => new ContentSubmission({ 
          ...validSubmissionData, 
          content_type: 'youtube',
          content_url: url
        })).not.toThrow();
      });
    });

    it('should accept valid content types', () => {
      const validTypes: ContentType[] = ['url', 'pdf', 'document'];
      
      validTypes.forEach(type => {
        expect(() => new ContentSubmission({ ...validSubmissionData, content_type: type }))
          .not.toThrow();
      });

      // Test YouTube separately with valid YouTube URL
      expect(() => new ContentSubmission({ 
        ...validSubmissionData, 
        content_type: 'youtube',
        content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      })).not.toThrow();
    });
  });

  describe('updateStatus', () => {
    let submission: ContentSubmission;

    beforeEach(() => {
      submission = new ContentSubmission(validSubmissionData);
      jest.advanceTimersByTime(1);
    });

    it('should update status from pending to processing', () => {
      const updated = submission.updateStatus('processing');

      expect(updated.status).toBe('processing');
      expect(updated.updated_at).not.toEqual(submission.updated_at);
      expect(updated.id).toBe(submission.id);
    });

    it('should update status from pending to failed with error message', () => {
      const updated = submission.updateStatus('failed', 'Test error');

      expect(updated.status).toBe('failed');
      expect(updated.error_message).toBe('Test error');
      expect(updated.processed_at).toBeDefined();
      expect(updated.updated_at).not.toEqual(submission.updated_at);
    });

    it('should update status from processing to completed', () => {
      const processingSubmission = submission.updateStatus('processing');
      jest.advanceTimersByTime(1); // Ensure different timestamp
      const updated = processingSubmission.updateStatus('completed');

      expect(updated.status).toBe('completed');
      expect(updated.processed_at).toBeDefined();
      expect(updated.updated_at).not.toEqual(processingSubmission.updated_at);
    });

    it('should throw error for invalid status transition from pending to completed', () => {
      expect(() => submission.updateStatus('completed'))
        .toThrow('Invalid status transition from pending to completed');
    });

    it('should throw error for invalid status transition from completed to processing', () => {
      const completedSubmission = new ContentSubmission({
        ...validSubmissionData,
        status: 'completed',
        processed_at: new Date()
      });

      expect(() => completedSubmission.updateStatus('processing'))
        .toThrow('Invalid status transition from completed to processing');
    });

    it('should throw error for invalid status transition from failed to processing', () => {
      const failedSubmission = new ContentSubmission({
        ...validSubmissionData,
        status: 'failed',
        error_message: 'Test error',
        processed_at: new Date()
      });

      expect(() => failedSubmission.updateStatus('processing'))
        .toThrow('Invalid status transition from failed to processing');
    });
  });

  describe('updateExtractedContent', () => {
    let submission: ContentSubmission;

    beforeEach(() => {
      submission = new ContentSubmission(validSubmissionData);
      jest.advanceTimersByTime(1);
    });

    it('should update extracted content', () => {
      const updated = submission.updateExtractedContent('New extracted content');

      expect(updated.extracted_content).toBe('New extracted content');
      expect(updated.updated_at).not.toEqual(submission.updated_at);
      expect(updated.id).toBe(submission.id);
    });
  });

  describe('updateMetadata', () => {
    let submission: ContentSubmission;

    beforeEach(() => {
      submission = new ContentSubmission(validSubmissionData);
      jest.advanceTimersByTime(1);
    });

    it('should update metadata', () => {
      const newMetadata: ContentSubmissionMetadata = {
        title: 'Updated Title',
        author: 'Updated Author'
      };

      const updated = submission.updateMetadata(newMetadata);

      expect(updated.metadata).toEqual(newMetadata);
      expect(updated.updated_at).not.toEqual(submission.updated_at);
      expect(updated.id).toBe(submission.id);
    });

    it('should merge with existing metadata', () => {
      const submissionWithMetadata = new ContentSubmission({
        ...validSubmissionData,
        metadata: { title: 'Original Title', word_count: 1000 }
      });

      const newMetadata: ContentSubmissionMetadata = {
        title: 'Updated Title',
        author: 'New Author'
      };

      const updated = submissionWithMetadata.updateMetadata(newMetadata);

      expect(updated.metadata).toEqual({
        title: 'Updated Title',
        word_count: 1000,
        author: 'New Author'
      });
    });
  });

  describe('utility methods', () => {
    describe('getTitle', () => {
      it('should return title from metadata', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          metadata: { title: 'Metadata Title' }
        });

        expect(submission.getTitle()).toBe('Metadata Title');
      });

      it('should return YouTube Video for YouTube content type', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          content_type: 'youtube',
          content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        });

        expect(submission.getTitle()).toBe('YouTube Video');
      });

      it('should return filename for PDF content type', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          content_type: 'pdf',
          content_url: 'https://example.com/document.pdf'
        });

        expect(submission.getTitle()).toBe('document.pdf');
      });

      it('should return filename for document content type', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          content_type: 'document',
          content_url: 'https://example.com/document.docx'
        });

        expect(submission.getTitle()).toBe('document.docx');
      });

      it('should return hostname for URL content type', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          content_type: 'url',
          content_url: 'https://example.com/article'
        });

        expect(submission.getTitle()).toBe('example.com');
      });

      it('should return full URL if URL parsing fails', () => {
        // Create a submission with valid URL first, then manually set invalid URL to bypass validation
        const submission = new ContentSubmission(validSubmissionData);
        (submission as any).content_url = 'invalid-url';
        (submission as any).content_type = 'url';

        expect(submission.getTitle()).toBe('invalid-url');
      });
    });

    describe('getAuthor', () => {
      it('should return author from metadata', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          metadata: { author: 'Test Author' }
        });

        expect(submission.getAuthor()).toBe('Test Author');
      });

      it('should return undefined when no author in metadata', () => {
        const submission = new ContentSubmission(validSubmissionData);
        expect(submission.getAuthor()).toBeUndefined();
      });
    });

    describe('getWordCount', () => {
      it('should return word count from metadata', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          metadata: { word_count: 1500 }
        });

        expect(submission.getWordCount()).toBe(1500);
      });

      it('should return undefined when no word count in metadata', () => {
        const submission = new ContentSubmission(validSubmissionData);
        expect(submission.getWordCount()).toBeUndefined();
      });
    });

    describe('getReadingTime', () => {
      it('should return reading time from metadata', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          metadata: { reading_time: 8 }
        });

        expect(submission.getReadingTime()).toBe(8);
      });

      it('should return undefined when no reading time in metadata', () => {
        const submission = new ContentSubmission(validSubmissionData);
        expect(submission.getReadingTime()).toBeUndefined();
      });
    });

    describe('isTerminal', () => {
      it('should return true for completed status', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          status: 'completed',
          processed_at: new Date()
        });

        expect(submission.isTerminal()).toBe(true);
      });

      it('should return true for failed status', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          status: 'failed',
          error_message: 'Test error',
          processed_at: new Date()
        });

        expect(submission.isTerminal()).toBe(true);
      });

      it('should return false for pending status', () => {
        const submission = new ContentSubmission(validSubmissionData);
        expect(submission.isTerminal()).toBe(false);
      });

      it('should return false for processing status', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          status: 'processing'
        });

        expect(submission.isTerminal()).toBe(false);
      });
    });

    describe('isProcessing', () => {
      it('should return true for processing status', () => {
        const submission = new ContentSubmission({
          ...validSubmissionData,
          status: 'processing'
        });

        expect(submission.isProcessing()).toBe(true);
      });

      it('should return false for other statuses', () => {
        const statuses: SubmissionStatus[] = ['pending', 'completed', 'failed'];
        
        statuses.forEach(status => {
          const submission = new ContentSubmission({
            ...validSubmissionData,
            status,
            ...(status === 'completed' || status === 'failed' ? { processed_at: new Date() } : {}),
            ...(status === 'failed' ? { error_message: 'Test error' } : {})
          });

          expect(submission.isProcessing()).toBe(false);
        });
      });
    });

    describe('getProcessingDuration', () => {
      it('should return processing duration in milliseconds', () => {
        const created = new Date('2023-01-01T10:00:00Z');
        const processed = new Date('2023-01-01T10:05:00Z');
        
        const submission = new ContentSubmission({
          ...validSubmissionData,
          status: 'completed',
          created_at: created,
          processed_at: processed
        });

        expect(submission.getProcessingDuration()).toBe(300000); // 5 minutes in milliseconds
      });

      it('should return undefined when not processed', () => {
        const submission = new ContentSubmission(validSubmissionData);
        expect(submission.getProcessingDuration()).toBeUndefined();
      });
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should convert to JSON correctly', () => {
      const submission = new ContentSubmission({
        ...validSubmissionData,
        id: 'test-id',
        user_note: 'Test note',
        status: 'completed',
        extracted_content: 'Test content',
        metadata: validMetadata,
        processed_at: new Date('2023-01-01'),
        source: 'ios_share',
        device_info: validDeviceInfo
      });

      const json = submission.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.content_url).toBe('https://example.com/article');
      expect(json.user_note).toBe('Test note');
      expect(json.status).toBe('completed');
      expect(json.metadata).toEqual(validMetadata);
      expect(json.device_info).toEqual(validDeviceInfo);
    });

    it('should create from JSON correctly', () => {
      const jsonData: ContentSubmissionData = {
        id: 'test-id',
        content_url: 'https://example.com/article',
        content_type: 'url',
        user_note: 'Test note',
        status: 'completed',
        extracted_content: 'Test content',
        metadata: validMetadata,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
        processed_at: new Date('2023-01-01'),
        source: 'ios_share',
        device_info: validDeviceInfo
      };

      const submission = ContentSubmission.fromJSON(jsonData);

      expect(submission.id).toBe('test-id');
      expect(submission.content_url).toBe('https://example.com/article');
      expect(submission.user_note).toBe('Test note');
      expect(submission.status).toBe('completed');
      expect(submission.metadata).toEqual(validMetadata);
      expect(submission.device_info).toEqual(validDeviceInfo);
    });
  });

  describe('device info handling', () => {
    it('should handle partial device info', () => {
      const partialDeviceInfo = {
        platform: 'iOS',
        version: '17.0'
      };

      const submission = new ContentSubmission({
        ...validSubmissionData,
        device_info: partialDeviceInfo
      });

      expect(submission.device_info).toEqual(partialDeviceInfo);
    });

    it('should handle empty device info', () => {
      const submission = new ContentSubmission({
        ...validSubmissionData,
        device_info: {}
      });

      expect(submission.device_info).toEqual({});
    });
  });
});