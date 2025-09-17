# Data Model: Podcast Generator

**Feature**: 001-feature-podcast-generator  
**Date**: 2024-12-19  
**Database**: PostgreSQL (Azure Database for PostgreSQL)

## Entity Definitions

### ContentSubmission
Represents a user's request to convert content into a podcast episode.

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `content_url` (TEXT, NOT NULL): Source URL or file path
- `content_type` (ENUM, NOT NULL): 'url', 'youtube', 'pdf', 'document'
- `user_note` (TEXT, NULL): Optional user-provided note
- `status` (ENUM, NOT NULL, DEFAULT 'pending'): 'pending', 'processing', 'completed', 'failed'
- `error_message` (TEXT, NULL): Error details if processing failed
- `extracted_content` (TEXT, NULL): Raw content extracted from source
- `metadata` (JSONB, NULL): Flexible metadata (title, author, duration, etc.)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Submission timestamp
- `processed_at` (TIMESTAMPTZ, NULL): Processing completion timestamp

**Validation Rules**:
- `content_url` must be valid URL or file path
- `content_type` must match supported types
- `status` transitions: pending → processing → completed/failed
- `error_message` required when status = 'failed'

**Indexes**:
- `idx_content_submission_status` on `status`
- `idx_content_submission_created_at` on `created_at DESC`
- `idx_content_submission_content_type` on `content_type`

### PodcastEpisode
Represents a generated podcast episode with metadata and audio file reference.

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `feed_id` (UUID, Foreign Key): Reference to UserFeed
- `submission_id` (UUID, Foreign Key, NULL): Reference to ContentSubmission
- `title` (TEXT, NOT NULL): Episode title
- `description` (TEXT, NOT NULL): Episode description
- `source_url` (TEXT, NOT NULL): Original content URL
- `content_type` (ENUM, NOT NULL): Source content type
- `audio_url` (TEXT, NULL): CDN URL to audio file
- `audio_duration` (INTEGER, NULL): Duration in seconds
- `audio_size` (INTEGER, NULL): File size in bytes
- `transcript` (TEXT, NULL): Full transcript text
- `dialogue_script` (TEXT, NULL): Generated dialogue script
- `summary` (TEXT, NULL): Content summary
- `chapter_markers` (JSONB, NULL): Timestamp markers for navigation
- `pub_date` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Publication date
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Last update timestamp

**Validation Rules**:
- `title` must be 1-200 characters
- `description` must be 1-1000 characters
- `audio_duration` must be > 0 if audio_url is present
- `audio_size` must be > 0 if audio_url is present
- `pub_date` cannot be in the future

**Indexes**:
- `idx_podcast_episode_feed_id` on `feed_id`
- `idx_podcast_episode_pub_date` on `pub_date DESC`
- `idx_podcast_episode_content_type` on `content_type`
- `idx_podcast_episode_created_at` on `created_at DESC`

### UserFeed
Represents a user's personal podcast feed containing all their generated episodes.

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `slug` (TEXT, UNIQUE, NOT NULL): URL-safe identifier for RSS feed
- `title` (TEXT, NOT NULL): Feed title
- `description` (TEXT, NULL): Feed description
- `author` (TEXT, NULL): Feed author name
- `category` (TEXT, NULL): Feed category
- `artwork_url` (TEXT, NULL): CDN URL to feed artwork
- `admin_email` (TEXT, NOT NULL): Contact email for feed
- `tts_voice_id` (TEXT, NULL): ElevenLabs voice ID
- `tts_provider` (ENUM, NOT NULL, DEFAULT 'elevenlabs'): 'elevenlabs', 'azure'
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Last update timestamp

**Validation Rules**:
- `slug` must be URL-safe (alphanumeric, hyphens, underscores)
- `title` must be 1-100 characters
- `admin_email` must be valid email format
- `tts_voice_id` required when tts_provider = 'elevenlabs'

**Indexes**:
- `idx_user_feed_slug` on `slug`
- `idx_user_feed_created_at` on `created_at DESC`

### ProcessingJob
Represents a background processing job for content conversion.

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `submission_id` (UUID, Foreign Key, NOT NULL): Reference to ContentSubmission
- `status` (ENUM, NOT NULL, DEFAULT 'queued'): 'queued', 'running', 'completed', 'failed'
- `progress` (INTEGER, NOT NULL, DEFAULT 0): Progress percentage (0-100)
- `current_step` (TEXT, NULL): Current processing step
- `error_message` (TEXT, NULL): Error details if failed
- `retry_count` (INTEGER, NOT NULL, DEFAULT 0): Number of retry attempts
- `max_retries` (INTEGER, NOT NULL, DEFAULT 3): Maximum retry attempts
- `started_at` (TIMESTAMPTZ, NULL): Processing start timestamp
- `completed_at` (TIMESTAMPTZ, NULL): Processing completion timestamp
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Job creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Last update timestamp

**Validation Rules**:
- `progress` must be 0-100
- `retry_count` cannot exceed `max_retries`
- `started_at` required when status = 'running'
- `completed_at` required when status = 'completed' or 'failed'

**Indexes**:
- `idx_processing_job_status` on `status`
- `idx_processing_job_submission_id` on `submission_id`
- `idx_processing_job_created_at` on `created_at DESC`

## Relationships

### ContentSubmission → PodcastEpisode
- **Type**: One-to-One (optional)
- **Constraint**: `submission_id` can be NULL (episodes can exist without submissions)
- **Cascade**: SET NULL on submission deletion

### UserFeed → PodcastEpisode
- **Type**: One-to-Many
- **Constraint**: `feed_id` is required
- **Cascade**: CASCADE on feed deletion (episodes are deleted with feed)

### ContentSubmission → ProcessingJob
- **Type**: One-to-One
- **Constraint**: `submission_id` is required
- **Cascade**: CASCADE on submission deletion

## State Transitions

### ContentSubmission Status
```
pending → processing → completed
  ↓           ↓
failed ←──────┘
```

**Rules**:
- Only one transition per status
- Cannot go backwards
- `processed_at` set on completion/failure

### ProcessingJob Status
```
queued → running → completed
  ↓         ↓
failed ←────┘
```

**Rules**:
- Can retry failed jobs (up to max_retries)
- `retry_count` increments on retry
- `started_at` set on first run
- `completed_at` set on completion/failure

## Data Retention

### Automatic Cleanup
- **ContentSubmission**: Delete after 90 days if status = 'completed'
- **ProcessingJob**: Delete after 30 days if status = 'completed' or 'failed'
- **PodcastEpisode**: Delete after 90 days (matches feed retention)
- **UserFeed**: Keep indefinitely (user data)

### Soft Deletes
- Use `deleted_at` timestamp instead of hard deletes
- Maintain referential integrity
- Enable data recovery if needed

## JSONB Metadata Schemas

### ContentSubmission.metadata
```json
{
  "title": "string",
  "author": "string",
  "published_date": "ISO 8601 string",
  "word_count": "number",
  "reading_time": "number",
  "language": "string",
  "extraction_method": "string",
  "extraction_quality": "number"
}
```

### PodcastEpisode.chapter_markers
```json
[
  {
    "title": "string",
    "start_time": "number (seconds)",
    "end_time": "number (seconds)"
  }
]
```

## Database Constraints

### Check Constraints
- `content_submission.status` IN ('pending', 'processing', 'completed', 'failed')
- `content_submission.content_type` IN ('url', 'youtube', 'pdf', 'document')
- `podcast_episode.audio_duration` > 0
- `podcast_episode.audio_size` > 0
- `processing_job.progress` BETWEEN 0 AND 100
- `processing_job.retry_count` <= `processing_job.max_retries`

### Unique Constraints
- `user_feed.slug` UNIQUE
- `content_submission.id` UNIQUE
- `podcast_episode.id` UNIQUE
- `processing_job.id` UNIQUE

### Foreign Key Constraints
- `podcast_episode.feed_id` REFERENCES `user_feed(id)` ON DELETE CASCADE
- `podcast_episode.submission_id` REFERENCES `content_submission(id)` ON DELETE SET NULL
- `processing_job.submission_id` REFERENCES `content_submission(id)` ON DELETE CASCADE

## Performance Considerations

### Query Optimization
- Indexes on frequently queried columns
- Composite indexes for common query patterns
- JSONB GIN indexes for metadata searches

### Partitioning Strategy
- Partition `podcast_episode` by `created_at` (monthly)
- Partition `processing_job` by `created_at` (monthly)
- Keep recent data in hot storage

### Connection Pooling
- Use connection pooling for Azure Functions
- Configure appropriate pool size for 10 concurrent jobs
- Monitor connection usage and adjust as needed

## Security Considerations

### Row Level Security (RLS)
- Enable RLS on all tables
- Anonymous users can only read public feeds
- No user authentication required (anonymous access)

### Data Encryption
- Encrypt sensitive fields (admin_email)
- Use application-level encryption for PII
- Database encryption at rest (Azure default)

### Audit Logging
- Log all data modifications
- Track access patterns
- Monitor for suspicious activity

This data model supports the podcast generator requirements while maintaining data integrity, performance, and security.
