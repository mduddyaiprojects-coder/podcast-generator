-- Initial database schema for Podcast Generator
-- This creates the core tables for content submissions, episodes, and feeds

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE submission_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE content_type AS ENUM ('url', 'youtube', 'document');
CREATE TYPE document_type AS ENUM ('pdf', 'docx', 'txt');

-- Content submissions table
CREATE TABLE content_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT,
    youtube_url TEXT,
    document_content TEXT,
    document_title TEXT,
    document_type document_type,
    metadata JSONB DEFAULT '{}',
    status submission_status DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Podcast episodes table
CREATE TABLE podcast_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES content_submissions(id) ON DELETE CASCADE,
    feed_id UUID,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    file_size_bytes BIGINT,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Podcast feeds table
CREATE TABLE podcast_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    rss_url TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feeds table (for future user-specific feeds)
CREATE TABLE user_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT, -- For future user authentication
    feed_id UUID NOT NULL REFERENCES podcast_feeds(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_content_submissions_status ON content_submissions(status);
CREATE INDEX idx_content_submissions_submitted_at ON content_submissions(submitted_at);
CREATE INDEX idx_content_submissions_url ON content_submissions(url) WHERE url IS NOT NULL;
CREATE INDEX idx_content_submissions_youtube_url ON content_submissions(youtube_url) WHERE youtube_url IS NOT NULL;

CREATE INDEX idx_podcast_episodes_submission_id ON podcast_episodes(submission_id);
CREATE INDEX idx_podcast_episodes_feed_id ON podcast_episodes(feed_id) WHERE feed_id IS NOT NULL;
CREATE INDEX idx_podcast_episodes_published_at ON podcast_episodes(published_at);
CREATE INDEX idx_podcast_episodes_audio_url ON podcast_episodes(audio_url);

CREATE INDEX idx_podcast_feeds_rss_url ON podcast_feeds(rss_url);
CREATE INDEX idx_podcast_feeds_is_active ON podcast_feeds(is_active);

CREATE INDEX idx_user_feeds_user_id ON user_feeds(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_feeds_feed_id ON user_feeds(feed_id);

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

CREATE TRIGGER update_podcast_feeds_updated_at 
    BEFORE UPDATE ON podcast_feeds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE content_submissions 
    ADD CONSTRAINT check_content_provided 
    CHECK (
        (url IS NOT NULL) OR 
        (youtube_url IS NOT NULL) OR 
        (document_content IS NOT NULL AND document_title IS NOT NULL AND document_type IS NOT NULL)
    );

ALTER TABLE content_submissions 
    ADD CONSTRAINT check_url_format 
    CHECK (url IS NULL OR url ~ '^https?://');

ALTER TABLE content_submissions 
    ADD CONSTRAINT check_youtube_url_format 
    CHECK (youtube_url IS NULL OR youtube_url ~ '^https?://(www\.)?(youtube\.com|youtu\.be)/');

ALTER TABLE podcast_episodes 
    ADD CONSTRAINT check_duration_positive 
    CHECK (duration_seconds > 0);

ALTER TABLE podcast_episodes 
    ADD CONSTRAINT check_audio_url_format 
    CHECK (audio_url ~ '^https?://');

-- Add comments for documentation
COMMENT ON TABLE content_submissions IS 'Stores content submissions from users via iOS Share Sheet';
COMMENT ON TABLE podcast_episodes IS 'Stores generated podcast episodes';
COMMENT ON TABLE podcast_feeds IS 'Stores podcast feed configurations';
COMMENT ON TABLE user_feeds IS 'Links users to their podcast feeds';

COMMENT ON COLUMN content_submissions.url IS 'Web URL submitted by user';
COMMENT ON COLUMN content_submissions.youtube_url IS 'YouTube URL submitted by user';
COMMENT ON COLUMN content_submissions.document_content IS 'Document content (for PDF, DOCX, TXT)';
COMMENT ON COLUMN content_submissions.document_title IS 'Document title';
COMMENT ON COLUMN content_submissions.document_type IS 'Type of document (pdf, docx, txt)';
COMMENT ON COLUMN content_submissions.metadata IS 'Additional metadata (title, description, author, etc.)';
COMMENT ON COLUMN content_submissions.status IS 'Processing status of the submission';
COMMENT ON COLUMN content_submissions.error_message IS 'Error message if processing failed';

COMMENT ON COLUMN podcast_episodes.submission_id IS 'Reference to the content submission that generated this episode';
COMMENT ON COLUMN podcast_episodes.feed_id IS 'Feed this episode belongs to (optional)';
COMMENT ON COLUMN podcast_episodes.title IS 'Episode title';
COMMENT ON COLUMN podcast_episodes.description IS 'Episode description/summary';
COMMENT ON COLUMN podcast_episodes.audio_url IS 'URL to the audio file';
COMMENT ON COLUMN podcast_episodes.duration_seconds IS 'Episode duration in seconds';
COMMENT ON COLUMN podcast_episodes.file_size_bytes IS 'Audio file size in bytes';
COMMENT ON COLUMN podcast_episodes.metadata IS 'Additional episode metadata';

COMMENT ON COLUMN podcast_feeds.name IS 'Feed name';
COMMENT ON COLUMN podcast_feeds.description IS 'Feed description';
COMMENT ON COLUMN podcast_feeds.rss_url IS 'RSS feed URL';
COMMENT ON COLUMN podcast_feeds.is_active IS 'Whether the feed is active';

COMMENT ON COLUMN user_feeds.user_id IS 'User identifier (for future authentication)';
COMMENT ON COLUMN user_feeds.feed_id IS 'Reference to podcast feed';
COMMENT ON COLUMN user_feeds.is_default IS 'Whether this is the user''s default feed';
