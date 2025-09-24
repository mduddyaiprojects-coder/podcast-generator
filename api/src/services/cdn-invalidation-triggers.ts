import { CdnCacheManagementService } from './cdn-cache-management';
import { logger } from '../utils/logger';

export interface InvalidationTrigger {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: InvalidationCondition[];
  actions: InvalidationAction[];
  lastTriggered?: Date;
  triggerCount: number;
}

export interface InvalidationCondition {
  type: 'file_uploaded' | 'file_updated' | 'file_deleted' | 'content_type' | 'file_size' | 'time_based';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'matches';
  value: string | number;
  field?: string;
}

export interface InvalidationAction {
  type: 'invalidate_path' | 'invalidate_prefix' | 'invalidate_all' | 'notify';
  target: string;
  parameters?: Record<string, any>;
}

export interface InvalidationEvent {
  id: string;
  type: 'file_upload' | 'file_update' | 'file_delete' | 'content_publish' | 'scheduled';
  timestamp: Date;
  data: {
    filePath: string;
    contentType: string;
    fileSize: number;
    submissionId?: string;
    userId?: string;
  };
  processed: boolean;
  invalidationResults: Array<{
    triggerId: string;
    success: boolean;
    error?: string;
  }>;
}

export class CdnInvalidationTriggersService {
  private cacheManagement: CdnCacheManagementService;
  private triggers: Map<string, InvalidationTrigger> = new Map();
  private eventQueue: InvalidationEvent[] = [];
  private isProcessing = false;

  constructor() {
    this.cacheManagement = new CdnCacheManagementService();
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default invalidation triggers
   */
  private initializeDefaultTriggers(): void {
    // Audio file upload trigger
    this.addTrigger({
      id: 'audio-upload-trigger',
      name: 'Audio File Upload',
      description: 'Invalidate cache when audio files are uploaded',
      enabled: true,
      conditions: [
        {
          type: 'content_type',
          operator: 'starts_with',
          value: 'audio/'
        }
      ],
      actions: [
        {
          type: 'invalidate_path',
          target: '${filePath}'
        },
        {
          type: 'invalidate_prefix',
          target: '/feeds/'
        }
      ],
      triggerCount: 0
    });

    // RSS feed update trigger
    this.addTrigger({
      id: 'rss-update-trigger',
      name: 'RSS Feed Update',
      description: 'Invalidate cache when RSS feeds are updated',
      enabled: true,
      conditions: [
        {
          type: 'file_uploaded',
          operator: 'ends_with',
          value: '.xml'
        }
      ],
      actions: [
        {
          type: 'invalidate_prefix',
          target: '/feeds/'
        },
        {
          type: 'invalidate_prefix',
          target: '/rss/'
        }
      ],
      triggerCount: 0
    });

    // Content update trigger
    this.addTrigger({
      id: 'content-update-trigger',
      name: 'Content Update',
      description: 'Invalidate cache when content is updated',
      enabled: true,
      conditions: [
        {
          type: 'file_updated',
          operator: 'contains',
          value: 'transcript'
        }
      ],
      actions: [
        {
          type: 'invalidate_path',
          target: '${filePath}'
        },
        {
          type: 'invalidate_prefix',
          target: '/transcripts/'
        }
      ],
      triggerCount: 0
    });

    // Large file trigger
    this.addTrigger({
      id: 'large-file-trigger',
      name: 'Large File Upload',
      description: 'Invalidate related content when large files are uploaded',
      enabled: true,
      conditions: [
        {
          type: 'file_size',
          operator: 'greater_than',
          value: 50 * 1024 * 1024 // 50MB
        }
      ],
      actions: [
        {
          type: 'invalidate_prefix',
          target: '/audio/'
        }
      ],
      triggerCount: 0
    });

    // Scheduled invalidation trigger
    this.addTrigger({
      id: 'scheduled-invalidation-trigger',
      name: 'Scheduled Invalidation',
      description: 'Daily cache invalidation for frequently updated content',
      enabled: true,
      conditions: [
        {
          type: 'time_based',
          operator: 'equals',
          value: 'daily'
        }
      ],
      actions: [
        {
          type: 'invalidate_prefix',
          target: '/feeds/'
        },
        {
          type: 'invalidate_prefix',
          target: '/rss/'
        }
      ],
      triggerCount: 0
    });
  }

  /**
   * Add a new invalidation trigger
   */
  addTrigger(trigger: InvalidationTrigger): void {
    this.triggers.set(trigger.id, trigger);
    logger.info('Invalidation trigger added', { triggerId: trigger.id, name: trigger.name });
  }

  /**
   * Remove an invalidation trigger
   */
  removeTrigger(triggerId: string): boolean {
    const removed = this.triggers.delete(triggerId);
    if (removed) {
      logger.info('Invalidation trigger removed', { triggerId });
    }
    return removed;
  }

  /**
   * Update an invalidation trigger
   */
  updateTrigger(triggerId: string, updates: Partial<InvalidationTrigger>): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    const updatedTrigger = { ...trigger, ...updates };
    this.triggers.set(triggerId, updatedTrigger);
    logger.info('Invalidation trigger updated', { triggerId, updates });
    return true;
  }

  /**
   * Process a file upload event
   */
  async processFileUpload(
    filePath: string,
    contentType: string,
    fileSize: number,
    submissionId?: string,
    userId?: string
  ): Promise<void> {
    const event: InvalidationEvent = {
      id: `upload-${Date.now()}`,
      type: 'file_upload',
      timestamp: new Date(),
      data: {
        filePath,
        contentType,
        fileSize,
        submissionId,
        userId
      },
      processed: false,
      invalidationResults: []
    };

    await this.processEvent(event);
  }

  /**
   * Process a file update event
   */
  async processFileUpdate(
    filePath: string,
    contentType: string,
    fileSize: number,
    submissionId?: string,
    userId?: string
  ): Promise<void> {
    const event: InvalidationEvent = {
      id: `update-${Date.now()}`,
      type: 'file_update',
      timestamp: new Date(),
      data: {
        filePath,
        contentType,
        fileSize,
        submissionId,
        userId
      },
      processed: false,
      invalidationResults: []
    };

    await this.processEvent(event);
  }

  /**
   * Process a file delete event
   */
  async processFileDelete(
    filePath: string,
    contentType: string,
    submissionId?: string,
    userId?: string
  ): Promise<void> {
    const event: InvalidationEvent = {
      id: `delete-${Date.now()}`,
      type: 'file_delete',
      timestamp: new Date(),
      data: {
        filePath,
        contentType,
        fileSize: 0,
        submissionId,
        userId
      },
      processed: false,
      invalidationResults: []
    };

    await this.processEvent(event);
  }

  /**
   * Process a content publish event
   */
  async processContentPublish(
    submissionId: string,
    contentPaths: string[],
    userId?: string
  ): Promise<void> {
    const event: InvalidationEvent = {
      id: `publish-${Date.now()}`,
      type: 'content_publish',
      timestamp: new Date(),
      data: {
        filePath: contentPaths[0] || '',
        contentType: 'application/octet-stream',
        fileSize: 0,
        submissionId,
        userId
      },
      processed: false,
      invalidationResults: []
    };

    // Process each content path
    for (const contentPath of contentPaths) {
      const pathEvent = { ...event, data: { ...event.data, filePath: contentPath } };
      await this.processEvent(pathEvent);
    }
  }

  /**
   * Process a scheduled invalidation event
   */
  async processScheduledInvalidation(): Promise<void> {
    const event: InvalidationEvent = {
      id: `scheduled-${Date.now()}`,
      type: 'scheduled',
      timestamp: new Date(),
      data: {
        filePath: '',
        contentType: '',
        fileSize: 0
      },
      processed: false,
      invalidationResults: []
    };

    await this.processEvent(event);
  }

  /**
   * Process an invalidation event
   */
  private async processEvent(event: InvalidationEvent): Promise<void> {
    try {
      logger.info('Processing invalidation event', {
        eventId: event.id,
        type: event.type,
        filePath: event.data.filePath
      });

      // Find matching triggers
      const matchingTriggers = this.findMatchingTriggers(event);

      if (matchingTriggers.length === 0) {
        logger.debug('No matching triggers found for event', { eventId: event.id });
        event.processed = true;
        return;
      }

      // Execute each matching trigger
      for (const trigger of matchingTriggers) {
        try {
          await this.executeTrigger(trigger, event);
          event.invalidationResults.push({
            triggerId: trigger.id,
            success: true
          });
        } catch (error) {
          logger.error('Failed to execute trigger', {
            triggerId: trigger.id,
            eventId: event.id,
            error
          });
          event.invalidationResults.push({
            triggerId: trigger.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      event.processed = true;
      this.eventQueue.push(event);

      // Clean up old events
      this.cleanupOldEvents();

    } catch (error) {
      logger.error('Failed to process invalidation event', {
        eventId: event.id,
        error
      });
    }
  }

  /**
   * Find triggers that match the event
   */
  private findMatchingTriggers(event: InvalidationEvent): InvalidationTrigger[] {
    const matchingTriggers: InvalidationTrigger[] = [];

    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;

      let matches = true;
      for (const condition of trigger.conditions) {
        if (!this.evaluateCondition(condition, event)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchingTriggers.push(trigger);
      }
    }

    return matchingTriggers;
  }

  /**
   * Evaluate a condition against an event
   */
  private evaluateCondition(condition: InvalidationCondition, event: InvalidationEvent): boolean {
    const { type, operator, value, field } = condition;
    const eventData = event.data;

    let targetValue: any;
    switch (type) {
      case 'file_uploaded':
        targetValue = event.type === 'file_upload';
        break;
      case 'file_updated':
        targetValue = event.type === 'file_update';
        break;
      case 'file_deleted':
        targetValue = event.type === 'file_delete';
        break;
      case 'content_type':
        targetValue = eventData.contentType;
        break;
      case 'file_size':
        targetValue = eventData.fileSize;
        break;
      case 'time_based':
        targetValue = 'daily'; // Simplified for scheduled events
        break;
      default:
        return false;
    }

    return this.compareValues(targetValue, operator, value);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(target: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return target === expected;
      case 'contains':
        return typeof target === 'string' && target.includes(expected);
      case 'starts_with':
        return typeof target === 'string' && target.startsWith(expected);
      case 'ends_with':
        return typeof target === 'string' && target.endsWith(expected);
      case 'greater_than':
        return typeof target === 'number' && target > expected;
      case 'less_than':
        return typeof target === 'number' && target < expected;
      case 'matches':
        return typeof target === 'string' && new RegExp(expected).test(target);
      default:
        return false;
    }
  }

  /**
   * Execute a trigger
   */
  private async executeTrigger(trigger: InvalidationTrigger, event: InvalidationEvent): Promise<void> {
    logger.info('Executing invalidation trigger', {
      triggerId: trigger.id,
      triggerName: trigger.name,
      eventId: event.id
    });

    const contentPaths: string[] = [];

    for (const action of trigger.actions) {
      const target = this.resolveTarget(action.target, event);
      
      switch (action.type) {
        case 'invalidate_path':
          contentPaths.push(target);
          break;
        case 'invalidate_prefix':
          contentPaths.push(target);
          break;
        case 'invalidate_all':
          contentPaths.push('/*');
          break;
        case 'notify':
          await this.sendNotification(action, event);
          break;
      }
    }

    if (contentPaths.length > 0) {
      await this.cacheManagement.invalidateCache({
        contentPaths,
        reason: `Triggered by ${trigger.name}`,
        priority: 'normal'
      });
    }

    // Update trigger statistics
    trigger.lastTriggered = new Date();
    trigger.triggerCount++;
    this.triggers.set(trigger.id, trigger);
  }

  /**
   * Resolve target path with variables
   */
  private resolveTarget(target: string, event: InvalidationEvent): string {
    return target
      .replace('${filePath}', event.data.filePath)
      .replace('${submissionId}', event.data.submissionId || '')
      .replace('${userId}', event.data.userId || '');
  }

  /**
   * Send notification
   */
  private async sendNotification(action: InvalidationAction, event: InvalidationEvent): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    logger.info('Notification sent', {
      action: action.type,
      eventId: event.id,
      parameters: action.parameters
    });
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.eventQueue = this.eventQueue.filter(event => event.timestamp > cutoffTime);
  }

  /**
   * Get trigger statistics
   */
  getTriggerStatistics(): {
    totalTriggers: number;
    enabledTriggers: number;
    totalExecutions: number;
    recentExecutions: number;
    topTriggers: Array<{
      id: string;
      name: string;
      executions: number;
      lastTriggered?: Date;
    }>;
  } {
    const triggers = Array.from(this.triggers.values());
    const totalExecutions = triggers.reduce((sum, trigger) => sum + trigger.triggerCount, 0);
    const recentExecutions = this.eventQueue.filter(
      event => event.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    ).length;

    const topTriggers = triggers
      .sort((a, b) => b.triggerCount - a.triggerCount)
      .slice(0, 5)
      .map(trigger => ({
        id: trigger.id,
        name: trigger.name,
        executions: trigger.triggerCount,
        lastTriggered: trigger.lastTriggered
      }));

    return {
      totalTriggers: triggers.length,
      enabledTriggers: triggers.filter(t => t.enabled).length,
      totalExecutions,
      recentExecutions,
      topTriggers
    };
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 100): InvalidationEvent[] {
    return this.eventQueue
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}




