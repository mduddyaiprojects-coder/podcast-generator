import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { WhisperService } from '../services/whisper-service';

/**
 * POST /api/whisper-transcribe
 *
 * Transcribes audio files using Azure OpenAI Whisper.
 *
 * Request body (multipart/form-data):
 * - file: Audio file (MP3, WAV, M4A, etc.)
 * - language: Optional language code (default: 'en')
 * - prompt: Optional prompt to guide transcription
 * - contentType: Optional content type ('podcast', 'interview', 'lecture', 'meeting')
 *
 * Response body:
 * {
 *   "success": true,
 *   "message": "Audio transcribed successfully",
 *   "transcription": {
 *     "text": "Transcribed text here...",
 *     "language": "en",
 *     "duration": 10.5,
 *     "segments": [...]
 *   },
 *   "metadata": {
 *     "fileSize": 1024000,
 *     "contentType": "podcast",
 *     "transcribedAt": "2023-10-27T10:00:00Z"
 *   }
 * }
 */
export async function whisperTranscriptionFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Whisper transcription function processed request.`);

  try {
    // Check if request has form data
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return {
        status: 400,
        jsonBody: {
          error: 'BAD_REQUEST',
          message: 'Request must be multipart/form-data with audio file'
        }
      };
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    const language = formData.get('language') as string || 'en';
    const prompt = formData.get('prompt') as string;
    const contentType = formData.get('contentType') as string || 'podcast';

    if (!audioFile) {
      return {
        status: 400,
        jsonBody: {
          error: 'BAD_REQUEST',
          message: 'No audio file provided in form data'
        }
      };
    }

    context.log('Whisper transcription request received', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      language,
      contentType
    });

    // Initialize Whisper service
    const whisperService = new WhisperService();
    
    // Check service health
    const isHealthy = await whisperService.checkHealth();
    if (!isHealthy) {
      return {
        status: 503,
        jsonBody: {
          error: 'SERVICE_UNAVAILABLE',
          message: 'Whisper service is not available'
        }
      };
    }

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Validate audio file
    const validation = whisperService.validateAudioFile(audioBuffer);
    if (!validation.isValid) {
      return {
        status: 400,
        jsonBody: {
          error: 'INVALID_AUDIO',
          message: 'Invalid audio file',
          issues: validation.issues
        }
      };
    }

    // Get transcription options based on content type
    const options = contentType && ['podcast', 'interview', 'lecture', 'meeting'].includes(contentType)
      ? whisperService.getContentTypeOptions(contentType as any)
      : whisperService.getDefaultPodcastOptions();

    // Override with user-provided options
    if (language) options.language = language;
    if (prompt) options.prompt = prompt;

    context.log('Starting Whisper transcription', {
      audioSize: audioBuffer.length,
      language: options.language,
      contentType,
      responseFormat: options.responseFormat
    });

    // Transcribe audio
    const result = await whisperService.transcribeAudio(audioBuffer, options);

    context.log('Whisper transcription completed', {
      textLength: result.text.length,
      language: result.language,
      duration: result.duration,
      segmentCount: result.segments?.length || 0
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Audio transcribed successfully',
        transcription: {
          text: result.text,
          language: result.language,
          duration: result.duration,
          segments: result.segments
        },
        metadata: {
          fileSize: audioBuffer.length,
          fileName: audioFile.name,
          fileType: audioFile.type,
          contentType,
          transcribedAt: new Date().toISOString()
        }
      }
    };

  } catch (error) {
    context.error('Whisper transcription error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred during transcription',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
