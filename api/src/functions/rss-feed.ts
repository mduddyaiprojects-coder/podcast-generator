import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * GET /api/feeds/{slug}/rss.xml
 * 
 * Generates and returns the RSS feed for the podcast.
 * Since we're using a single public feed, the slug parameter is ignored.
 */
export async function rssFeedFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const feedSlug = request.params['slug'];

    // Validate feed slug format
    if (!feedSlug || !isValidFeedSlug(feedSlug)) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_FEED_SLUG',
          message: 'Invalid feed slug format',
          details: 'feed_slug must contain only alphanumeric characters, hyphens, and underscores'
        }
      };
    }

    context.log('RSS feed request received for slug:', feedSlug);

    // For now, return a simple RSS feed without database dependency
    const rssContent = generateSimpleRSS();

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml',
        'Cache-Control': 'public, max-age=300'
      },
      body: rssContent
    };

  } catch (error) {
    context.log('RSS feed error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate RSS feed',
        details: 'Please try again later'
      }
    };
  }
}

function isValidFeedSlug(slug: string): boolean {
  // Allow alphanumeric characters, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

function generateSimpleRSS(): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Podcast Generator</title>
    <description>AI-generated podcast episodes</description>
    <link>https://podcast-generator.example.com</link>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <managingEditor>noreply@example.com</managingEditor>
    <webMaster>noreply@example.com</webMaster>
    <generator>Podcast Generator v1.0</generator>
    <itunes:author>Podcast Generator</itunes:author>
    <itunes:summary>AI-generated podcast episodes from web content</itunes:summary>
    <itunes:owner>
      <itunes:name>Podcast Generator</itunes:name>
      <itunes:email>noreply@example.com</itunes:email>
    </itunes:owner>
    <itunes:image href="https://podcast-generator.example.com/logo.jpg"/>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>
    <item>
      <title>Welcome to Podcast Generator</title>
      <description>This is a sample episode. The RSS feed is working!</description>
      <link>https://podcast-generator.example.com/episodes/welcome</link>
      <guid isPermaLink="false">welcome-episode-001</guid>
      <pubDate>${now}</pubDate>
      <enclosure url="https://podcast-generator.example.com/audio/welcome.mp3" type="audio/mpeg" length="0"/>
      <itunes:author>Podcast Generator</itunes:author>
      <itunes:duration>00:05:00</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>
  </channel>
</rss>`;
}