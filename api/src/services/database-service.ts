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
          id, url, youtube_url, document_content, document_title, 
          document_type, metadata, status, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      
      const values = [
        submission.id,
        submission.url,
        submission.youtubeUrl,
        submission.document?.content,
        submission.document?.title,
        submission.document?.type,
        JSON.stringify(submission.metadata || {}),
        submission.status,
        submission.submittedAt
      ];

      const result = await this.client.query(query, values);
      logger.info('Submission saved to database:', submission.id);
      return result.rows[0].id;

    } catch (error) {
      logger.error('Failed to save submission:', error);
      throw error;
    }
  }

  async updateSubmissionStatus(submissionId: string, status: string): Promise<void> {
    try {
      const query = `
        UPDATE content_submissions 
        SET status = $1, processed_at = NOW()
        WHERE id = $2
      `;
      
      await this.client.query(query, [status, submissionId]);
      logger.info(`Updated submission ${submissionId} status to ${status}`);

    } catch (error) {
      logger.error('Failed to update submission status:', error);
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
        episode.submissionId,
        episode.feedId,
        episode.title,
        episode.description,
        episode.audioUrl,
        episode.duration,
        episode.getEnclosureLength(),
        episode.publishedAt,
        JSON.stringify(episode.metadata || {})
      ];

      await this.client.query(query, values);
      logger.info('Episode saved to database:', episode.id);

    } catch (error) {
      logger.error('Failed to save episode:', error);
      throw error;
    }
  }

  async getEpisodes(feedId?: string): Promise<PodcastEpisode[]> {
    try {
      let query = `
        SELECT id, submission_id, feed_id, title, description, 
               audio_url, duration_seconds, file_size_bytes, 
               published_at, metadata, created_at, updated_at
        FROM podcast_episodes
      `;
      
      const values: any[] = [];
      
      if (feedId) {
        query += ' WHERE feed_id = $1';
        values.push(feedId);
      }
      
      query += ' ORDER BY published_at DESC';

      const result = await this.client.query(query, values);
      
      return result.rows.map(row => new PodcastEpisode({
        id: row.id,
        submissionId: row.submission_id,
        feedId: row.feed_id,
        title: row.title,
        description: row.description,
        audioUrl: row.audio_url,
        duration: row.duration_seconds,
        publishedAt: row.published_at,
        metadata: row.metadata
      }));

    } catch (error) {
      logger.error('Failed to get episodes:', error);
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
}
