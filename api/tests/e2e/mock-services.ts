/**
 * Mock Services for E2E Testing
 * 
 * This file provides mock implementations of external services
 * to allow E2E tests to run without requiring real API keys.
 */

export class MockFirecrawlService {
  async extractContent(url: string): Promise<any> {
    // Return mock content based on URL
    if (url.includes('example.com')) {
      return {
        title: 'Mock Article Title',
        content: 'This is mock content for testing purposes. It contains enough text to generate a meaningful podcast episode.',
        url: url,
        extraction_method: 'mock',
        word_count: 50,
        reading_time_minutes: 1,
        language: 'en',
        quality_score: 85,
        summary: 'Mock article summary for testing',
        metadata: {
          originalUrl: url,
          originalTitle: 'Mock Article Title',
          author: 'Mock Author',
          publishedDate: new Date(),
          wordCount: 50
        }
      };
    }
    throw new Error('Mock: URL not supported for testing');
  }
}

export class MockTTSService {
  async generateAudio(text: string): Promise<any> {
    // Return mock audio data
    return {
      audio_buffer: Buffer.from('mock audio data'),
      duration_seconds: Math.max(10, text.length / 100), // Rough estimate
      format: 'mp3',
      sample_rate: 44100,
      bit_rate: 128000
    };
  }
}

export class MockYouTubeService {
  async extractVideoContent(videoId: string): Promise<any> {
    return {
      title: 'Mock YouTube Video',
      content: 'This is mock YouTube video content for testing.',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      extraction_method: 'youtube',
      word_count: 100,
      reading_time_minutes: 2,
      language: 'en',
      quality_score: 90,
      summary: 'Mock YouTube video summary',
      metadata: {
        video_id: videoId,
        channel_title: 'Mock Channel',
        duration: '10:00',
        view_count: 1000,
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        originalTitle: 'Mock YouTube Video',
        author: 'Mock YouTuber',
        publishedDate: new Date(),
        wordCount: 100
      }
    };
  }
}

export class MockDatabaseService {
  private episodes: any[] = [];
  private submissions: any[] = [];

  async saveEpisode(episode: any): Promise<any> {
    const savedEpisode = { ...episode, id: `episode-${Date.now()}` };
    this.episodes.push(savedEpisode);
    return savedEpisode;
  }

  async saveSubmission(submission: any): Promise<string> {
    const savedSubmission = { ...submission, id: `submission-${Date.now()}` };
    this.submissions.push(savedSubmission);
    return savedSubmission.id;
  }

  async getEpisodes(limit: number = 10): Promise<any[]> {
    return this.episodes.slice(0, limit);
  }

  async getSubmission(id: string): Promise<any> {
    return this.submissions.find(s => s.id === id);
  }

  async connect(): Promise<void> {
    // Mock connection
  }

  async disconnect(): Promise<void> {
    // Mock disconnection
  }
}
