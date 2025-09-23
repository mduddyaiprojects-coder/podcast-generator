-- Podcast Generator Database Schema
-- This creates the complete schema matching the data model specification
-- Database: podcast_generator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE submission_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE content_type AS ENUM ('url', 'youtube', 'pdf', 'document');
CREATE TYPE tts_provider AS ENUM ('elevenlabs', 'azure');
CREATE TYPE job_status AS ENUM ('queued', 'running', 'completed', 'failed');

-- Content submissions table
CREATE TABLE content_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_url TEXT NOT NULL,
    content_type content_type NOT NULL,
    user_note TEXT,
    status submission_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    extracted_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global feed table (single public feed)
CREATE TABLE global_feed (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    category TEXT,
    artwork_url TEXT,
    admin_email TEXT NOT NULL,
    tts_voice_id TEXT,
    tts_provider tts_provider NOT NULL DEFAULT 'elevenlabs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Podcast episodes table
CREATE TABLE podcast_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES content_submissions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_url TEXT NOT NULL,
    content_type content_type NOT NULL,
    audio_url TEXT,
    audio_duration INTEGER,
    audio_size INTEGER,
    transcript TEXT,
    dialogue_script TEXT,
    summary TEXT,
    chapter_markers JSONB,
    pub_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processing jobs table
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES content_submissions(id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User feeds table (for future user-specific feeds)
CREATE TABLE user_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT, -- For future user authentication
    feed_id UUID NOT NULL REFERENCES global_feed(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
-- Content submissions indexes
CREATE INDEX idx_content_submissions_status ON content_submissions(status);
CREATE INDEX idx_content_submissions_created_at ON content_submissions(created_at DESC);
CREATE INDEX idx_content_submissions_content_type ON content_submissions(content_type);
CREATE INDEX idx_content_submissions_content_url ON content_submissions(content_url) WHERE content_url IS NOT NULL;

-- Podcast episodes indexes
CREATE INDEX idx_podcast_episodes_pub_date ON podcast_episodes(pub_date DESC);
CREATE INDEX idx_podcast_episodes_content_type ON podcast_episodes(content_type);
CREATE INDEX idx_podcast_episodes_created_at ON podcast_episodes(created_at DESC);
CREATE INDEX idx_podcast_episodes_submission_id ON podcast_episodes(submission_id) WHERE submission_id IS NOT NULL;

-- Processing jobs indexes
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_submission_id ON processing_jobs(submission_id);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);

-- Global feed indexes
CREATE INDEX idx_global_feed_created_at ON global_feed(created_at DESC);

-- User feeds indexes
CREATE INDEX idx_user_feeds_user_id ON user_feeds(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_feeds_feed_id ON user_feeds(feed_id);

-- JSONB indexes for metadata searches
CREATE INDEX idx_content_submissions_metadata_gin ON content_submissions USING GIN (metadata);
CREATE INDEX idx_podcast_episodes_chapter_markers_gin ON podcast_episodes USING GIN (chapter_markers);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_content_submissions_updated_at 
    BEFORE UPDATE ON content_submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_podcast_episodes_updated_at 
    BEFORE UPDATE ON podcast_episodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_feed_updated_at 
    BEFORE UPDATE ON global_feed 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at 
    BEFORE UPDATE ON processing_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
-- Content submissions constraints
ALTER TABLE content_submissions 
    ADD CONSTRAINT check_content_url_format 
    CHECK (content_url ~ '^https?://');

ALTER TABLE content_submissions 
    ADD CONSTRAINT check_error_message_when_failed 
    CHECK ((status = 'failed' AND error_message IS NOT NULL) OR status != 'failed');

-- Podcast episodes constraints
ALTER TABLE podcast_episodes 
    ADD CONSTRAINT check_audio_duration_positive 
    CHECK (audio_duration IS NULL OR audio_duration > 0);

ALTER TABLE podcast_episodes 
    ADD CONSTRAINT check_audio_size_positive 
    CHECK (audio_size IS NULL OR audio_size > 0);

ALTER TABLE podcast_episodes 
    ADD CONSTRAINT check_title_length 
    CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 200);

ALTER TABLE podcast_episodes 
    ADD CONSTRAINT check_description_length 
    CHECK (LENGTH(description) >= 1 AND LENGTH(description) <= 1000);

-- Processing jobs constraints
ALTER TABLE processing_jobs 
    ADD CONSTRAINT check_retry_count_limit 
    CHECK (retry_count <= max_retries);

ALTER TABLE processing_jobs 
    ADD CONSTRAINT check_started_at_when_running 
    CHECK ((status = 'running' AND started_at IS NOT NULL) OR status != 'running');

ALTER TABLE processing_jobs 
    ADD CONSTRAINT check_completed_at_when_done 
    CHECK ((status IN ('completed', 'failed') AND completed_at IS NOT NULL) OR status NOT IN ('completed', 'failed'));

-- Global feed constraints
ALTER TABLE global_feed 
    ADD CONSTRAINT check_title_length 
    CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 100);

ALTER TABLE global_feed 
    ADD CONSTRAINT check_admin_email_format 
    CHECK (admin_email ~ '^[^@]+@[^@]+\.[^@]+$');

ALTER TABLE global_feed 
    ADD CONSTRAINT check_tts_voice_id_when_elevenlabs 
    CHECK ((tts_provider = 'elevenlabs' AND tts_voice_id IS NOT NULL) OR tts_provider != 'elevenlabs');

-- Insert default global feed
INSERT INTO global_feed (id, title, description, author, category, admin_email, tts_provider) 
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'AI Podcast Generator',
    'AI-generated podcast episodes from shared content',
    'AI Podcast Generator',
    'Technology',
    'admin@podcastgenerator.com',
    'elevenlabs'
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE content_submissions IS 'Stores content submissions from users via webhook';
COMMENT ON TABLE podcast_episodes IS 'Stores generated podcast episodes';
COMMENT ON TABLE global_feed IS 'Stores the single public podcast feed configuration';
COMMENT ON TABLE processing_jobs IS 'Stores background processing jobs for content conversion';
COMMENT ON TABLE user_feeds IS 'Links users to their podcast feeds (future feature)';

COMMENT ON COLUMN content_submissions.content_url IS 'Web URL submitted by user';
COMMENT ON COLUMN content_submissions.content_type IS 'Type of content (url, youtube, pdf, document)';
COMMENT ON COLUMN content_submissions.user_note IS 'Optional user-provided note';
COMMENT ON COLUMN content_submissions.status IS 'Processing status of the submission';
COMMENT ON COLUMN content_submissions.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN content_submissions.extracted_content IS 'Raw content extracted from source';
COMMENT ON COLUMN content_submissions.metadata IS 'Additional metadata (title, author, duration, etc.)';

COMMENT ON COLUMN podcast_episodes.submission_id IS 'Reference to the content submission that generated this episode';
COMMENT ON COLUMN podcast_episodes.title IS 'Episode title';
COMMENT ON COLUMN podcast_episodes.description IS 'Episode description/summary';
COMMENT ON COLUMN podcast_episodes.source_url IS 'Original content URL';
COMMENT ON COLUMN podcast_episodes.audio_url IS 'URL to the audio file';
COMMENT ON COLUMN podcast_episodes.audio_duration IS 'Episode duration in seconds';
COMMENT ON COLUMN podcast_episodes.audio_size IS 'Audio file size in bytes';
COMMENT ON COLUMN podcast_episodes.transcript IS 'Full transcript text';
COMMENT ON COLUMN podcast_episodes.dialogue_script IS 'Generated dialogue script';
COMMENT ON COLUMN podcast_episodes.summary IS 'Content summary';
COMMENT ON COLUMN podcast_episodes.chapter_markers IS 'Timestamp markers for navigation';

COMMENT ON COLUMN global_feed.title IS 'Feed title';
COMMENT ON COLUMN global_feed.description IS 'Feed description';
COMMENT ON COLUMN global_feed.author IS 'Feed author name';
COMMENT ON COLUMN global_feed.category IS 'Feed category';
COMMENT ON COLUMN global_feed.artwork_url IS 'CDN URL to feed artwork';
COMMENT ON COLUMN global_feed.admin_email IS 'Contact email for feed';
COMMENT ON COLUMN global_feed.tts_voice_id IS 'ElevenLabs voice ID';
COMMENT ON COLUMN global_feed.tts_provider IS 'TTS provider (elevenlabs, azure)';

COMMENT ON COLUMN processing_jobs.submission_id IS 'Reference to content submission';
COMMENT ON COLUMN processing_jobs.status IS 'Job status (queued, running, completed, failed)';
COMMENT ON COLUMN processing_jobs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN processing_jobs.current_step IS 'Current processing step';
COMMENT ON COLUMN processing_jobs.error_message IS 'Error details if failed';
COMMENT ON COLUMN processing_jobs.retry_count IS 'Number of retry attempts';
COMMENT ON COLUMN processing_jobs.max_retries IS 'Maximum retry attempts';




