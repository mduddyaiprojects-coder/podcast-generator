-- Seed data for initial setup
-- This creates default feeds and sample data for development

-- Insert default podcast feed
INSERT INTO podcast_feeds (id, name, description, rss_url, is_active) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Podcast Feed',
    'AI-generated podcast episodes from shared content',
    'https://podcast-generator.example.com/api/rss',
    true
);

-- Insert sample content submission (for testing)
INSERT INTO content_submissions (
    id,
    url,
    metadata,
    status,
    submitted_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'https://example.com/sample-article',
    '{"title": "Sample Article", "description": "A sample article for testing", "author": "Test Author"}',
    'completed',
    NOW() - INTERVAL '1 hour'
);

-- Insert sample podcast episode
INSERT INTO podcast_episodes (
    id,
    submission_id,
    feed_id,
    title,
    description,
    audio_url,
    duration_seconds,
    file_size_bytes,
    published_at,
    metadata
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Sample Article Podcast',
    'A podcast episode generated from the sample article about web development and AI technology.',
    'https://storage.example.com/audio/sample-episode.mp3',
    900, -- 15 minutes
    14400000, -- 14.4 MB
    NOW() - INTERVAL '1 hour',
    '{"originalUrl": "https://example.com/sample-article", "originalTitle": "Sample Article", "author": "Test Author", "tags": ["podcast", "ai-generated", "web-content"]}'
);

-- Insert another sample submission (pending)
INSERT INTO content_submissions (
    id,
    youtube_url,
    metadata,
    status,
    submitted_at
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'https://www.youtube.com/watch?v=sample-video',
    '{"title": "Sample YouTube Video", "description": "A sample YouTube video for testing"}',
    'pending',
    NOW() - INTERVAL '30 minutes'
);

-- Insert document submission
INSERT INTO content_submissions (
    id,
    document_content,
    document_title,
    document_type,
    metadata,
    status,
    submitted_at
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'This is a sample document content for testing the podcast generation system. It contains multiple paragraphs of text that would be processed by the AI system to generate a podcast episode.',
    'Sample Document',
    'txt',
    '{"author": "Test User", "description": "A sample text document for testing"}',
    'processing',
    NOW() - INTERVAL '15 minutes'
);

-- Create a default user feed (for anonymous users)
INSERT INTO user_feeds (id, user_id, feed_id, is_default) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'anonymous',
    '00000000-0000-0000-0000-000000000001',
    true
);
