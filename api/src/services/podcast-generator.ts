import { ExtractedContent } from './content-processor';
import { PodcastEpisode } from '../models/podcast-episode';
import { AzureOpenAIService } from './azure-openai-service';
import { TTSService } from './tts-service';
import { StorageService } from './storage-service';
import { logger } from '../utils/logger';

export class PodcastGenerator {
  private azureOpenAIService: AzureOpenAIService;
  private ttsService: TTSService;
  private storageService: StorageService;

  constructor() {
    this.azureOpenAIService = new AzureOpenAIService();
    this.ttsService = new TTSService();
    this.storageService = new StorageService({
      connectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'] || '',
      containerName: process.env['AZURE_STORAGE_CONTAINER_NAME'] || 'podcast-audio',
      cdnBaseUrl: process.env['AZURE_CDN_BASE_URL']
    });
  }

  async generateEpisode(content: ExtractedContent, submissionId: string): Promise<PodcastEpisode> {
    try {
      // Generate podcast script using Azure OpenAI
      const script = await this.azureOpenAIService.generatePodcastScript(content);

      // Generate audio using TTS service (Azure Speech with ElevenLabs fallback)
      const ttsResult = await this.ttsService.generateAudioWithFallback(
        script,
        'azure', // Use Azure Speech as primary
        {
          voice_name: this.getRecommendedVoice('url'), // Default to 'url' content type
          language: 'en-US'
        }
      );
      const audioBuffer = ttsResult.audio_buffer;

      // Upload audio to storage
      const audioResult = await this.storageService.uploadAudio(audioBuffer, submissionId);

      // Calculate duration (estimate)
      const duration = this.estimateDuration(script);

      // Create episode
      const episode = new PodcastEpisode({
        id: this.generateEpisodeId(),
        title: content.title,
        description: content.summary,
        source_url: content.metadata?.originalUrl || (content as any).url || '',
        content_type: 'url', // Default to URL type
        audio_url: audioResult.url,
        audio_duration: duration,
        audio_size: audioResult.size,
        transcript: script, // Use script as transcript
        dialogue_script: script,
        summary: content.summary,
        chapter_markers: this.generateChapterMarkers(script, duration),
        pub_date: new Date(),
        submission_id: submissionId
      });

      return episode;

    } catch (error) {
      logger.error('Podcast generation error:', error);
      throw error;
    }
  }

  private generateEpisodeId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateDuration(script: string): number {
    // Estimate 150 words per minute for podcast speech
    const wordCount = script.split(' ').length;
    return Math.ceil((wordCount / 150) * 60);
  }

  private generateChapterMarkers(script: string, audioDuration?: number): any[] {
    // Simple chapter marker generation based on script structure
    const lines = script.split('\n').filter(line => line.trim().length > 0);
    const markers = [];
    
    // Use actual audio duration if available, otherwise estimate based on script length
    const estimatedDuration = audioDuration || this.estimateDuration(script);
    
    // Look for lines that might be chapter titles (short lines, questions, or key phrases)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      // More lenient criteria for chapter markers
      if (line.length > 5 && line.length < 150 && 
          (line.endsWith('?') || line.includes('Introduction') || line.includes('Conclusion') || 
           line.includes('First') || line.includes('Next') || line.includes('Finally') ||
           line.includes('Welcome') || line.includes('Hello') || line.includes('Thanks') ||
           line.includes('Summary') || line.includes('Overview') || line.includes('Key') ||
           line.includes('Important') || line.includes('Remember') || line.includes('Note'))) {
        markers.push({
          title: line,
          start_time: Math.floor((i / lines.length) * estimatedDuration),
          end_time: Math.floor(((i + 1) / lines.length) * estimatedDuration)
        });
      }
    }
    
    // If no markers found, create some basic ones based on script structure
    if (markers.length === 0 && lines.length > 3) {
      markers.push(
        {
          title: 'Introduction',
          start_time: 0,
          end_time: Math.floor(estimatedDuration / 3)
        },
        {
          title: 'Main Content',
          start_time: Math.floor(estimatedDuration / 3),
          end_time: Math.floor((estimatedDuration * 2) / 3)
        },
        {
          title: 'Conclusion',
          start_time: Math.floor((estimatedDuration * 2) / 3),
          end_time: estimatedDuration
        }
      );
    }
    
    return markers;
  }

  private getRecommendedVoice(contentType: string): string {
    const recommendations: Record<string, string> = {
      'url': 'en-US-AriaNeural',      // Friendly, good for articles
      'youtube': 'en-US-DavisNeural', // Conversational, good for videos
      'pdf': 'en-US-JennyNeural',     // Assistant-like, good for documents
      'document': 'en-US-GuyNeural'   // Conversational, good for documents
    };

    return recommendations[contentType] || 'en-US-AriaNeural';
  }

}
