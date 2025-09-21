import { DatabaseService } from './database-service';
import { logger } from '../utils/logger';

export interface RetentionPolicy {
  table: string;
  retentionDays: number;
  condition: string;
  description: string;
}

export interface CleanupResult {
  table: string;
  deletedCount: number;
  error?: string;
}

export interface RetentionReport {
  timestamp: Date;
  policies: CleanupResult[];
  totalDeleted: number;
  errors: string[];
}

export class DataRetentionService {
  // Define retention policies for different data types
  private readonly retentionPolicies: RetentionPolicy[] = [
    {
      table: 'processing_jobs',
      retentionDays: 90,
      condition: "status IN ('completed', 'failed') AND updated_at < NOW() - INTERVAL '90 days'",
      description: 'Clean up old completed/failed processing jobs after 90 days'
    },
    {
      table: 'content_submissions',
      retentionDays: 90,
      condition: "status = 'failed' AND updated_at < NOW() - INTERVAL '90 days'",
      description: 'Clean up old failed content submissions after 90 days'
    },
    {
      table: 'content_submissions',
      retentionDays: 30,
      condition: "status = 'pending' AND created_at < NOW() - INTERVAL '30 days'",
      description: 'Clean up stuck pending submissions after 30 days'
    }
  ];

  constructor() {
    // No need to create database service instance here
  }

  /**
   * Execute all retention policies and clean up old data
   */
  async executeRetentionPolicies(): Promise<RetentionReport> {
    const report: RetentionReport = {
      timestamp: new Date(),
      policies: [],
      totalDeleted: 0,
      errors: []
    };

    const db = new DatabaseService();
    
    try {
      await db.connect();

      for (const policy of this.retentionPolicies) {
        try {
          const result = await this.cleanupTable(policy, db);
          report.policies.push(result);
          report.totalDeleted += result.deletedCount;
        } catch (error) {
          const errorMsg = `Failed to cleanup ${policy.table}: ${error}`;
          logger.error(errorMsg, error);
          report.errors.push(errorMsg);
          report.policies.push({
            table: policy.table,
            deletedCount: 0,
            error: errorMsg
          });
        }
      }

      logger.info('Data retention cleanup completed', {
        totalDeleted: report.totalDeleted,
        policiesExecuted: report.policies.length,
        errors: report.errors.length
      });

    } catch (error) {
      const errorMsg = `Data retention service failed: ${error}`;
      logger.error(errorMsg, error);
      report.errors.push(errorMsg);
    } finally {
      try {
        await db.disconnect();
      } catch (disconnectError) {
        logger.warn('Error disconnecting from database:', disconnectError);
      }
    }

    return report;
  }

  /**
   * Clean up a specific table based on retention policy
   */
  private async cleanupTable(policy: RetentionPolicy, db: DatabaseService): Promise<CleanupResult> {
    const query = `DELETE FROM ${policy.table} WHERE ${policy.condition}`;
    
    logger.info(`Executing retention policy for ${policy.table}`, {
      policy: policy.description,
      retentionDays: policy.retentionDays
    });

    const result = await db['executeQuery'](async (client) => {
      return await client.query(query);
    });

    const deletedCount = result.rowCount || 0;

    logger.info(`Retention cleanup completed for ${policy.table}`, {
      deletedCount,
      policy: policy.description
    });

    return {
      table: policy.table,
      deletedCount
    };
  }

  /**
   * Get statistics about data that would be cleaned up
   */
  async getRetentionStatistics(): Promise<{
    table: string;
    policy: string;
    count: number;
    oldestRecord?: Date;
  }[]> {
    const stats: {
      table: string;
      policy: string;
      count: number;
      oldestRecord?: Date;
    }[] = [];

    const db = new DatabaseService();
    
    try {
      await db.connect();

      for (const policy of this.retentionPolicies) {
        const countQuery = `SELECT COUNT(*) as count, MIN(updated_at) as oldest FROM ${policy.table} WHERE ${policy.condition}`;
        
        const result = await db['executeQuery'](async (client) => {
          return await client.query(countQuery);
        });

        const count = parseInt(result.rows[0].count);
        const oldestRecord = result.rows[0].oldest;

        stats.push({
          table: policy.table,
          policy: policy.description,
          count,
          oldestRecord: oldestRecord ? new Date(oldestRecord) : undefined
        });
      }

    } catch (error) {
      logger.error('Failed to get retention statistics:', error);
      throw error;
    } finally {
      try {
        await db.disconnect();
      } catch (disconnectError) {
        logger.warn('Error disconnecting from database:', disconnectError);
      }
    }

    return stats;
  }

  /**
   * Clean up specific data types manually
   */
  async cleanupProcessingJobs(olderThanDays: number = 90): Promise<number> {
    const db = new DatabaseService();
    try {
      await db.connect();
      return await db.cleanupOldProcessingJobs(olderThanDays);
    } finally {
      try {
        await db.disconnect();
      } catch (disconnectError) {
        logger.warn('Error disconnecting from database:', disconnectError);
      }
    }
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<{
    totalSize: string;
    tableSizes: { table: string; size: string; rows: number }[];
  }> {
    const db = new DatabaseService();
    
    try {
      await db.connect();

      const sizeQuery = `
        SELECT 
          pg_tables.schemaname,
          pg_tables.tablename,
          pg_size_pretty(pg_total_relation_size(pg_tables.schemaname||'.'||pg_tables.tablename)) as size,
          pg_stat_user_tables.n_tup_ins - pg_stat_user_tables.n_tup_del as row_count
        FROM pg_tables 
        JOIN pg_stat_user_tables ON pg_tables.tablename = pg_stat_user_tables.relname
        WHERE pg_tables.schemaname = 'public'
        ORDER BY pg_total_relation_size(pg_tables.schemaname||'.'||pg_tables.tablename) DESC
      `;

      const result = await db['executeQuery'](async (client) => {
        return await client.query(sizeQuery);
      });

      const tableSizes = result.rows.map(row => ({
        table: row.tablename,
        size: row.size,
        rows: parseInt(row.row_count) || 0
      }));

      const totalSizeQuery = `
        SELECT pg_size_pretty(pg_database_size(current_database())) as total_size
      `;

      const totalResult = await db['executeQuery'](async (client) => {
        return await client.query(totalSizeQuery);
      });

      return {
        totalSize: totalResult.rows[0].total_size,
        tableSizes
      };

    } catch (error) {
      logger.error('Failed to get database size:', error);
      throw error;
    } finally {
      try {
        await db.disconnect();
      } catch (disconnectError) {
        logger.warn('Error disconnecting from database:', disconnectError);
      }
    }
  }

  /**
   * Archive old data instead of deleting (for compliance)
   */
  async archiveOldData(olderThanDays: number = 90): Promise<{
    archivedSubmissions: number;
    archivedJobs: number;
  }> {
    const db = new DatabaseService();
    
    try {
      await db.connect();

      // Create archive tables if they don't exist
      await this.createArchiveTables(db);

      // Archive old content submissions
      const archiveSubmissionsQuery = `
        INSERT INTO content_submissions_archive 
        SELECT *, NOW() as archived_at 
        FROM content_submissions 
        WHERE status = 'failed' AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
      `;

      const submissionsResult = await db['executeQuery'](async (client) => {
        return await client.query(archiveSubmissionsQuery);
      });

      // Archive old processing jobs
      const archiveJobsQuery = `
        INSERT INTO processing_jobs_archive 
        SELECT *, NOW() as archived_at 
        FROM processing_jobs 
        WHERE status IN ('completed', 'failed') AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
      `;

      const jobsResult = await db['executeQuery'](async (client) => {
        return await client.query(archiveJobsQuery);
      });

      // Delete archived data from main tables
      await db['executeQuery'](async (client) => {
        await client.query(`
          DELETE FROM content_submissions 
          WHERE status = 'failed' AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
        `);
      });

      await db['executeQuery'](async (client) => {
        await client.query(`
          DELETE FROM processing_jobs 
          WHERE status IN ('completed', 'failed') AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
        `);
      });

      return {
        archivedSubmissions: submissionsResult.rowCount || 0,
        archivedJobs: jobsResult.rowCount || 0
      };

    } catch (error) {
      logger.error('Failed to archive old data:', error);
      throw error;
    } finally {
      try {
        await db.disconnect();
      } catch (disconnectError) {
        logger.warn('Error disconnecting from database:', disconnectError);
      }
    }
  }

  /**
   * Create archive tables for data retention compliance
   */
  private async createArchiveTables(db: DatabaseService): Promise<void> {
    const createArchiveTablesQuery = `
      -- Content submissions archive table
      CREATE TABLE IF NOT EXISTS content_submissions_archive (
        LIKE content_submissions INCLUDING ALL,
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Processing jobs archive table
      CREATE TABLE IF NOT EXISTS processing_jobs_archive (
        LIKE processing_jobs INCLUDING ALL,
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Add indexes for archive tables
      CREATE INDEX IF NOT EXISTS idx_content_submissions_archive_archived_at 
        ON content_submissions_archive(archived_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_archive_archived_at 
        ON processing_jobs_archive(archived_at DESC);
    `;

    await db['executeQuery'](async (client) => {
      await client.query(createArchiveTablesQuery);
    });
  }
}
