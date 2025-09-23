import { CdnInvalidationTriggersService } from '../../src/services/cdn-invalidation-triggers';
import { CdnCacheManagementService } from '../../src/services/cdn-cache-management';

// Mock the CdnCacheManagementService
jest.mock('../../src/services/cdn-cache-management');

describe('CdnInvalidationTriggersService', () => {
  let service: CdnInvalidationTriggersService;
  let mockCacheManagement: jest.Mocked<CdnCacheManagementService>;

  beforeEach(() => {
    mockCacheManagement = new CdnCacheManagementService() as jest.Mocked<CdnCacheManagementService>;
    service = new CdnInvalidationTriggersService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default triggers', () => {
      const stats = service.getTriggerStatistics();
      
      expect(stats.totalTriggers).toBeGreaterThan(0);
      expect(stats.enabledTriggers).toBeGreaterThan(0);
    });
  });

  describe('addTrigger', () => {
    it('should add a new trigger', () => {
      const trigger = {
        id: 'test-trigger',
        name: 'Test Trigger',
        description: 'A test trigger',
        enabled: true,
        conditions: [
          {
            type: 'content_type' as const,
            operator: 'equals' as const,
            value: 'audio/mpeg'
          }
        ],
        actions: [
          {
            type: 'invalidate_path' as const,
            target: '/audio/test.mp3'
          }
        ],
        triggerCount: 0
      };

      service.addTrigger(trigger);

      const stats = service.getTriggerStatistics();
      expect(stats.totalTriggers).toBeGreaterThan(0);
    });
  });

  describe('removeTrigger', () => {
    it('should remove an existing trigger', () => {
      const triggerId = 'audio-upload-trigger';
      const initialStats = service.getTriggerStatistics();
      
      const removed = service.removeTrigger(triggerId);
      
      expect(removed).toBe(true);
      
      const finalStats = service.getTriggerStatistics();
      expect(finalStats.totalTriggers).toBe(initialStats.totalTriggers - 1);
    });

    it('should return false for non-existent trigger', () => {
      const removed = service.removeTrigger('non-existent-trigger');
      expect(removed).toBe(false);
    });
  });

  describe('updateTrigger', () => {
    it('should update an existing trigger', () => {
      const triggerId = 'audio-upload-trigger';
      const updates = {
        enabled: false,
        description: 'Updated description'
      };

      const updated = service.updateTrigger(triggerId, updates);
      
      expect(updated).toBe(true);
    });

    it('should return false for non-existent trigger', () => {
      const updated = service.updateTrigger('non-existent-trigger', { enabled: false });
      expect(updated).toBe(false);
    });
  });

  describe('processFileUpload', () => {
    beforeEach(() => {
      mockCacheManagement.invalidateCache.mockResolvedValue({
        success: true,
        invalidationId: 'test-invalidation'
      });
    });

    it('should process file upload event and trigger invalidation', async () => {
      await service.processFileUpload(
        '/audio/episode-1.mp3',
        'audio/mpeg',
        50 * 1024 * 1024,
        'submission-123',
        'user-456'
      );

      // Should trigger invalidation for audio files
      expect(mockCacheManagement.invalidateCache).toHaveBeenCalled();
    });

    it('should not trigger invalidation for non-matching content types', async () => {
      await service.processFileUpload(
        '/temp/processing.tmp',
        'application/octet-stream',
        1024,
        'submission-123',
        'user-456'
      );

      // Should not trigger invalidation for temp files
      expect(mockCacheManagement.invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe('processFileUpdate', () => {
    beforeEach(() => {
      mockCacheManagement.invalidateCache.mockResolvedValue({
        success: true,
        invalidationId: 'test-invalidation'
      });
    });

    it('should process file update event and trigger invalidation', async () => {
      await service.processFileUpdate(
        '/transcripts/episode-1.txt',
        'text/plain',
        1024 * 1024,
        'submission-123',
        'user-456'
      );

      // Should trigger invalidation for transcript updates
      expect(mockCacheManagement.invalidateCache).toHaveBeenCalled();
    });
  });

  describe('processFileDelete', () => {
    beforeEach(() => {
      mockCacheManagement.invalidateCache.mockResolvedValue({
        success: true,
        invalidationId: 'test-invalidation'
      });
    });

    it('should process file delete event', async () => {
      await service.processFileDelete(
        '/audio/episode-1.mp3',
        'audio/mpeg',
        'submission-123',
        'user-456'
      );

      // Should trigger invalidation for deleted files
      expect(mockCacheManagement.invalidateCache).toHaveBeenCalled();
    });
  });

  describe('processContentPublish', () => {
    beforeEach(() => {
      mockCacheManagement.invalidateCache.mockResolvedValue({
        success: true,
        invalidationId: 'test-invalidation'
      });
    });

    it('should process content publish event for multiple paths', async () => {
      const contentPaths = [
        '/audio/episode-1.mp3',
        '/transcripts/episode-1.txt',
        '/feeds/episode-1.xml'
      ];

      await service.processContentPublish(
        'submission-123',
        contentPaths,
        'user-456'
      );

      // Should trigger invalidation for each content path
      expect(mockCacheManagement.invalidateCache).toHaveBeenCalledTimes(contentPaths.length);
    });
  });

  describe('processScheduledInvalidation', () => {
    beforeEach(() => {
      mockCacheManagement.invalidateCache.mockResolvedValue({
        success: true,
        invalidationId: 'test-invalidation'
      });
    });

    it('should process scheduled invalidation event', async () => {
      await service.processScheduledInvalidation();

      // Should trigger invalidation for scheduled content
      expect(mockCacheManagement.invalidateCache).toHaveBeenCalled();
    });
  });

  describe('findMatchingTriggers', () => {
    it('should find triggers that match file upload events', () => {
      const service = new CdnInvalidationTriggersService();
      const findMatchingTriggers = (service as any).findMatchingTriggers;

      const event = {
        id: 'test-event',
        type: 'file_upload',
        timestamp: new Date(),
        data: {
          filePath: '/audio/episode-1.mp3',
          contentType: 'audio/mpeg',
          fileSize: 50 * 1024 * 1024,
          submissionId: 'submission-123',
          userId: 'user-456'
        },
        processed: false,
        invalidationResults: []
      };

      const matchingTriggers = findMatchingTriggers(event);

      expect(matchingTriggers.length).toBeGreaterThan(0);
      expect(matchingTriggers[0].name).toBe('Audio File Upload');
    });

    it('should find triggers that match RSS feed updates', () => {
      const service = new CdnInvalidationTriggersService();
      const findMatchingTriggers = (service as any).findMatchingTriggers;

      const event = {
        id: 'test-event',
        type: 'file_upload',
        timestamp: new Date(),
        data: {
          filePath: '/feeds/main.xml',
          contentType: 'application/rss+xml',
          fileSize: 10 * 1024,
          submissionId: 'submission-123',
          userId: 'user-456'
        },
        processed: false,
        invalidationResults: []
      };

      const matchingTriggers = findMatchingTriggers(event);

      expect(matchingTriggers.length).toBeGreaterThan(0);
      expect(matchingTriggers[0].name).toBe('RSS Feed Update');
    });

    it('should not find triggers for non-matching events', () => {
      const service = new CdnInvalidationTriggersService();
      const findMatchingTriggers = (service as any).findMatchingTriggers;

      const event = {
        id: 'test-event',
        type: 'file_upload',
        timestamp: new Date(),
        data: {
          filePath: '/unknown/file.txt',
          contentType: 'text/plain',
          fileSize: 1024,
          submissionId: 'submission-123',
          userId: 'user-456'
        },
        processed: false,
        invalidationResults: []
      };

      const matchingTriggers = findMatchingTriggers(event);

      expect(matchingTriggers.length).toBe(0);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate content type conditions correctly', () => {
      const service = new CdnInvalidationTriggersService();
      const evaluateCondition = (service as any).evaluateCondition;

      const condition = {
        type: 'content_type',
        operator: 'starts_with',
        value: 'audio/'
      };

      const event = {
        type: 'file_upload',
        data: {
          contentType: 'audio/mpeg',
          fileSize: 1024
        }
      };

      const result = evaluateCondition(condition, event);
      expect(result).toBe(true);
    });

    it('should evaluate file size conditions correctly', () => {
      const service = new CdnInvalidationTriggersService();
      const evaluateCondition = (service as any).evaluateCondition;

      const condition = {
        type: 'file_size',
        operator: 'greater_than',
        value: 50 * 1024 * 1024 // 50MB
      };

      const event = {
        type: 'file_upload',
        data: {
          contentType: 'audio/mpeg',
          fileSize: 100 * 1024 * 1024 // 100MB
        }
      };

      const result = evaluateCondition(condition, event);
      expect(result).toBe(true);
    });

    it('should evaluate file upload conditions correctly', () => {
      const service = new CdnInvalidationTriggersService();
      const evaluateCondition = (service as any).evaluateCondition;

      const condition = {
        type: 'file_uploaded',
        operator: 'equals',
        value: true
      };

      const event = {
        type: 'file_upload',
        data: {
          contentType: 'audio/mpeg',
          fileSize: 1024
        }
      };

      const result = evaluateCondition(condition, event);
      expect(result).toBe(true);
    });
  });

  describe('compareValues', () => {
    it('should compare values with equals operator', () => {
      const service = new CdnInvalidationTriggersService();
      const compareValues = (service as any).compareValues;

      expect(compareValues('audio/mpeg', 'equals', 'audio/mpeg')).toBe(true);
      expect(compareValues('audio/mpeg', 'equals', 'video/mp4')).toBe(false);
    });

    it('should compare values with starts_with operator', () => {
      const service = new CdnInvalidationTriggersService();
      const compareValues = (service as any).compareValues;

      expect(compareValues('audio/mpeg', 'starts_with', 'audio/')).toBe(true);
      expect(compareValues('video/mp4', 'starts_with', 'audio/')).toBe(false);
    });

    it('should compare values with contains operator', () => {
      const service = new CdnInvalidationTriggersService();
      const compareValues = (service as any).compareValues;

      expect(compareValues('episode-1-transcript.txt', 'contains', 'transcript')).toBe(true);
      expect(compareValues('episode-1-audio.mp3', 'contains', 'transcript')).toBe(false);
    });

    it('should compare values with greater_than operator', () => {
      const service = new CdnInvalidationTriggersService();
      const compareValues = (service as any).compareValues;

      expect(compareValues(100, 'greater_than', 50)).toBe(true);
      expect(compareValues(25, 'greater_than', 50)).toBe(false);
    });

    it('should compare values with matches operator', () => {
      const service = new CdnInvalidationTriggersService();
      const compareValues = (service as any).compareValues;

      expect(compareValues('episode-123.mp3', 'matches', 'episode-\\d+\\.mp3')).toBe(true);
      expect(compareValues('episode-abc.mp3', 'matches', 'episode-\\d+\\.mp3')).toBe(false);
    });
  });

  describe('resolveTarget', () => {
    it('should resolve target paths with variables', () => {
      const service = new CdnInvalidationTriggersService();
      const resolveTarget = (service as any).resolveTarget;

      const event = {
        data: {
          filePath: '/audio/episode-1.mp3',
          submissionId: 'submission-123',
          userId: 'user-456'
        }
      };

      const target = '${filePath}';
      const resolved = resolveTarget(target, event);

      expect(resolved).toBe('/audio/episode-1.mp3');
    });

    it('should resolve submission ID variables', () => {
      const service = new CdnInvalidationTriggersService();
      const resolveTarget = (service as any).resolveTarget;

      const event = {
        data: {
          filePath: '/audio/episode-1.mp3',
          submissionId: 'submission-123',
          userId: 'user-456'
        }
      };

      const target = '/audio/${submissionId}.mp3';
      const resolved = resolveTarget(target, event);

      expect(resolved).toBe('/audio/submission-123.mp3');
    });

    it('should resolve user ID variables', () => {
      const service = new CdnInvalidationTriggersService();
      const resolveTarget = (service as any).resolveTarget;

      const event = {
        data: {
          filePath: '/audio/episode-1.mp3',
          submissionId: 'submission-123',
          userId: 'user-456'
        }
      };

      const target = '/users/${userId}/content';
      const resolved = resolveTarget(target, event);

      expect(resolved).toBe('/users/user-456/content');
    });
  });

  describe('getTriggerStatistics', () => {
    it('should return trigger statistics', () => {
      const stats = service.getTriggerStatistics();

      expect(stats).toHaveProperty('totalTriggers');
      expect(stats).toHaveProperty('enabledTriggers');
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('recentExecutions');
      expect(stats).toHaveProperty('topTriggers');

      expect(typeof stats.totalTriggers).toBe('number');
      expect(typeof stats.enabledTriggers).toBe('number');
      expect(typeof stats.totalExecutions).toBe('number');
      expect(typeof stats.recentExecutions).toBe('number');
      expect(Array.isArray(stats.topTriggers)).toBe(true);
    });
  });

  describe('getEventHistory', () => {
    it('should return event history with limit', () => {
      const events = service.getEventHistory(10);

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeLessThanOrEqual(10);
    });

    it('should return all events when no limit specified', () => {
      const events = service.getEventHistory();

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('cleanupOldEvents', () => {
    it('should clean up events older than 24 hours', () => {
      const service = new CdnInvalidationTriggersService();
      const cleanupOldEvents = (service as any).cleanupOldEvents;

      // Add old events
      (service as any).eventQueue = [
        {
          id: 'old-event',
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
          type: 'file_upload',
          data: {},
          processed: true,
          invalidationResults: []
        },
        {
          id: 'recent-event',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          type: 'file_upload',
          data: {},
          processed: true,
          invalidationResults: []
        }
      ];

      cleanupOldEvents();

      const events = service.getEventHistory();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('recent-event');
    });
  });
});

