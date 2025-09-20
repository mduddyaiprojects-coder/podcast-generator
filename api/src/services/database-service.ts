import { ContentSubmission } from '../models/content-submission';
import { PodcastEpisode } from '../models/podcast-episode';
import { logger } from '../utils/logger';
import { Client } from 'pg';

export class DatabaseService {
  private client: Client;

  constructor() {
    this.client = new Client({
      host: process.env['DATABASE_HOST'] || 'localhost',
      port: parseInt(process.env['DATABASE_PORT'] || '5432'),
      database: process.env['DATABASE_NAME'] || 'podcast_generator_dev',
      user: process.env['DATABASE_USER'] || 'postgres',
      password: process.env['DATABASE_PASSWORD'] || 'password',
      ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Connected to database');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async saveSubmission(submission: ContentSubmission): Promise<string> {
    try {
      const query = `
        INSERT INTO content_submissions (
          id, content_url, content_type, user_note, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const values = [
        submission.id,
        submission.content_url,
        submission.content_type,
        submission.user_note,
        submission.status,
        submission.created_at,
        submission.updated_at
      ];

      const result = await this.client.query(query, values);
      logger.info('Submission saved to database:', submission.id);
      return result.rows[0].id;

    } catch (error) {
      logger.error('Failed to save submission:', error);
      throw error;
    }
  }


  async saveEpisode(episode: PodcastEpisode): Promise<void> {
    try {
      const query = `
        INSERT INTO podcast_episodes (
          id, submission_id, feed_id, title, description, 
          audio_url, duration_seconds, file_size_bytes, 
          published_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      const values = [
        episode.id,
        episode.submission_id,
        undefined, // feed_id removed - using single public feed
        episode.title,
        episode.description,
        episode.audio_url,
        episode.audio_duration,
        episode.getEnclosureLength(),
        episode.pub_date,
        JSON.stringify({}) // metadata not available in PodcastEpisode model
      ];

      await this.client.query(query, values);
      logger.info('Episode saved to database:', episode.id);

    } catch (error) {
      logger.error('Failed to save episode:', error);
      throw error;
    }
  }

  async getEpisodes(limit?: number, offset?: number): Promise<PodcastEpisode[]> {
    try {
      let query = `
        SELECT id, submission_id, title, description, source_url, content_type,
               audio_url, audio_duration, audio_size, transcript, dialogue_script,
               summary, chapter_markers, pub_date, created_at, updated_at
        FROM podcast_episodes
        ORDER BY pub_date DESC
      `;
      
      const values: any[] = [];
      
      if (limit) {
        query += ` LIMIT $${values.length + 1}`;
        values.push(limit);
      }
      
      if (offset) {
        query += ` OFFSET $${values.length + 1}`;
        values.push(offset);
      }

      const result = await this.client.query(query, values);
      
      return result.rows.map(row => new PodcastEpisode({
        id: row.id,
        submission_id: row.submission_id,
        title: row.title,
        description: row.description,
        source_url: row.source_url,
        content_type: row.content_type,
        audio_url: row.audio_url,
        audio_duration: row.audio_duration,
        audio_size: row.audio_size,
        transcript: row.transcript,
        dialogue_script: row.dialogue_script,
        summary: row.summary,
        chapter_markers: row.chapter_markers,
        pub_date: row.pub_date,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

    } catch (error) {
      logger.error('Failed to get episodes:', error);
      throw error;
    }
  }

  async getEpisodeCount(): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM podcast_episodes';
      const result = await this.client.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to get episode count:', error);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connection check failed:', error);
      return false;
    }
  }

  // Content Submission methods
  async getSubmission(submissionId: string): Promise<ContentSubmission | null> {
    try {
      const query = 'SELECT * FROM content_submissions WHERE id = $1';
      const result = await this.client.query(query, [submissionId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new ContentSubmission({
        id: row.id,
        content_url: row.content_url,
        content_type: row.content_type,
        user_note: row.user_note,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        processed_at: row.processed_at
      });
    } catch (error) {
      logger.error('Failed to get submission:', error);
      return null;
    }
  }

  async updateSubmissionStatus(submissionId: string, status: string): Promise<void> {
    try {
      const query = 'UPDATE content_submissions SET status = $1, updated_at = NOW() WHERE id = $2';
      await this.client.query(query, [status, submissionId]);
      logger.info(`Updated submission ${submissionId} status to ${status}`);
    } catch (error) {
      logger.error('Failed to update submission status:', error);
      throw error;
    }
  }

  // Processing Job methods
  async saveProcessingJob(job: any): Promise<void> {
    try {
      const query = `
        INSERT INTO processing_jobs (
          id, submission_id, status, progress, current_step, 
          error_message, retry_count, max_retries, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          current_step = EXCLUDED.current_step,
          error_message = EXCLUDED.error_message,
          retry_count = EXCLUDED.retry_count,
          updated_at = EXCLUDED.updated_at
      `;
      
      await this.client.query(query, [
        job.id,
        job.submission_id,
        job.status,
        job.progress,
        job.current_step,
        job.error_message,
        job.retry_count,
        job.max_retries,
        job.created_at,
        job.updated_at
      ]);
    } catch (error) {
      logger.error('Failed to save processing job:', error);
      throw error;
    }
  }

  async getProcessingJob(jobId: string): Promise<any | null> {
    try {
      const query = 'SELECT * FROM processing_jobs WHERE id = $1';
      const result = await this.client.query(query, [jobId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get processing job:', error);
      return null;
    }
  }

  async getProcessingJobBySubmissionId(submissionId: string): Promise<any | null> {
    try {
      const query = 'SELECT * FROM processing_jobs WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1';
      const result = await this.client.query(query, [submissionId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get processing job by submission ID:', error);
      return null;
    }
  }

  async getProcessingJobsBySubmissionId(submissionId: string): Promise<any[]> {
    try {
      const query = 'SELECT * FROM processing_jobs WHERE submission_id = $1 ORDER BY created_at DESC';
      const result = await this.client.query(query, [submissionId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get processing jobs by submission ID:', error);
      return [];
    }
  }

  async getProcessingJobsByStatus(status: string): Promise<any[]> {
    try {
      const query = 'SELECT * FROM processing_jobs WHERE status = $1 ORDER BY created_at DESC';
      const result = await this.client.query(query, [status]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get processing jobs by status:', error);
      return [];
    }
  }

  async getStaleProcessingJobs(olderThanHours: number): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM processing_jobs 
        WHERE status IN ('queued', 'running') 
        AND created_at < NOW() - INTERVAL '${olderThanHours} hours'
        ORDER BY created_at ASC
      `;
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get stale processing jobs:', error);
      return [];
    }
  }

  async cleanupOldProcessingJobs(olderThanDays: number): Promise<number> {
    try {
      const query = `
        DELETE FROM processing_jobs 
        WHERE status IN ('completed', 'failed') 
        AND updated_at < NOW() - INTERVAL '${olderThanDays} days'
      `;
      const result = await this.client.query(query);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup old processing jobs:', error);
      return 0;
    }
  }

  async getProcessingJobStatistics(): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'queued' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM processing_jobs
      `;
      const result = await this.client.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get processing job statistics:', error);
      return { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    }
  }

  // Episode methods
  async getEpisodeBySubmissionId(submissionId: string): Promise<any | null> {
    try {
      const query = 'SELECT * FROM podcast_episodes WHERE submission_id = $1';
      const result = await this.client.query(query, [submissionId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get episode by submission ID:', error);
      return null;
    }
  }
}
