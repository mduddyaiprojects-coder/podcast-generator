import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { TTSService } from '../services/tts-service';

/**
 * POST /api/tts
 *
 * Generates text-to-speech audio from provided text.
 */
export async function ttsGenerationFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('TTS generation request received');

    const body = await request.json() as { 
      text?: string; 
      voice?: string; 
      speed?: number; 
      format?: string;
      provider?: string;
    };
    
    const { text, voice, speed, format, provider } = body;

    // Basic validation
    if (!text) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_REQUEST',
          message: 'Missing required field: text'
        }
      };
    }

    // Validate text length
    if (text.length > 5000) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_REQUEST',
          message: 'Text too long. Maximum 5000 characters allowed.'
        }
      };
    }

    context.log('Generating TTS audio:', { 
      textLength: text.length, 
      voice, 
      speed, 
      format, 
      provider 
    });

    // Initialize TTS service
    const ttsService = new TTSService();

    // Prepare TTS configuration
    const ttsConfig = {
      provider: (provider as 'elevenlabs' | 'azure') || 'elevenlabs',
      voice_id: voice || 'rachel',
      speed: speed || 1.0,
      language: 'en'
    };

    // Generate audio
    const ttsResult = await ttsService.generateAudio(text, ttsConfig);

    // For now, return the audio data as base64
    // In a real implementation, you'd upload to storage and return a URL
    const audioBase64 = ttsResult.audio_buffer.toString('base64');

    context.log('TTS generation completed:', {
      duration: ttsResult.duration_seconds,
      fileSize: ttsResult.file_size_bytes,
      provider: ttsResult.provider_used,
      voice: ttsResult.voice_used
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'TTS generation completed successfully',
        audio_data: audioBase64,
        audio_url: null, // Would be set if uploaded to storage
        duration: ttsResult.duration_seconds,
        format: format || 'mp3',
        voice: ttsResult.voice_used,
        provider: ttsResult.provider_used,
        text_length: text.length,
        file_size: ttsResult.file_size_bytes,
        quality_score: ttsResult.metadata.quality_score,
        processing_time_ms: ttsResult.metadata.processing_time_ms,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    context.error('TTS generation error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred during TTS generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}




