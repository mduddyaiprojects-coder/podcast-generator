import { ExtractedContent } from './content-processor';
import { PodcastEpisode } from '../models/podcast-episode';
import { serviceManager } from './service-manager';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class PodcastGenerator {
  constructor() {
    // Services will be lazy loaded via ServiceManager
  }

  async generateEpisode(content: ExtractedContent, submissionId: string): Promise<PodcastEpisode> {
    try {
      // Generate podcast script using Azure OpenAI (lazy loaded)
      const azureOpenAI = serviceManager.getAzureOpenAI();
      const script = await azureOpenAI.generatePodcastScript(content);

      // Generate audio using TTS service (lazy loaded)
      const tts = serviceManager.getTTS();
      const ttsResult = await tts.generateAudioWithFallback(
        script,
        'azure', // Use Azure Speech as primary
        {
          voice_name: this.getRecommendedVoice('url'), // Default to 'url' content type
          language: 'en-US'
        }
      );
      const audioBuffer = ttsResult.audio_buffer;

      // Upload audio to storage (lazy loaded)
      const storage = serviceManager.getStorage();
      const audioResult = await storage.uploadAudio(audioBuffer, submissionId);

      // Use actual audio duration from TTS service
      const actualDuration = ttsResult.duration_seconds;

      // Create episode
      const episode = new PodcastEpisode({
        id: this.generateEpisodeId(),
        title: content.title,
        description: content.summary,
        source_url: content.metadata?.originalUrl || (content as any).url || '',
        content_type: 'url', // Default to URL type
        audio_url: audioResult.url,
        audio_duration: actualDuration,
        audio_size: audioResult.size,
        transcript: script, // Use script as transcript
        dialogue_script: script,
        summary: content.summary,
        chapter_markers: this.generateChapterMarkers(script, actualDuration),
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
    return uuidv4();
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
    
    // Fix overlapping markers by ensuring proper sequencing
    return this.fixOverlappingMarkers(markers, estimatedDuration);
  }

  private fixOverlappingMarkers(markers: any[], totalDuration: number): any[] {
    if (markers.length === 0) return markers;
    
    // Sort markers by start_time
    markers.sort((a, b) => a.start_time - b.start_time);
    
    // Fix overlapping markers
    for (let i = 0; i < markers.length - 1; i++) {
      const current = markers[i];
      const next = markers[i + 1];
      
      // If current marker ends after next marker starts, adjust end time
      if (current.end_time > next.start_time) {
        current.end_time = next.start_time;
      }
      
      // Ensure end time doesn't exceed total duration
      if (current.end_time > totalDuration) {
        current.end_time = totalDuration;
      }
    }
    
    // Ensure last marker doesn't exceed total duration
    const lastMarker = markers[markers.length - 1];
    if (lastMarker && lastMarker.end_time > totalDuration) {
      lastMarker.end_time = totalDuration;
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
