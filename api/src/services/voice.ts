import { logger } from '../utils/logger';
import { ElevenLabsService, VoiceInfo } from './elevenlabs-service';

/**
 * Voice Service
 * 
 * Manages voice catalog, previews, and deterministic fallback policy
 * for text-to-speech generation across multiple providers.
 * 
 * Requirements:
 * - FR-011: Voice Selection - Catalog
 *   "System MUST present a catalog of voice styles with descriptive 
 *    labels and language/locale metadata."
 * 
 * - FR-012: Voice Selection - Previews
 *   "System MUST allow users to preview a selected voice style before use."
 * 
 * - FR-013: Voice Selection - Fallbacks
 *   "System MUST define a deterministic fallback policy if the preferred 
 *    voice is unavailable, and inform the user of the applied fallback."
 */

/**
 * Voice profile with complete metadata
 */
export interface VoiceProfile {
  id: string;
  name: string;
  displayName: string;
  provider: 'elevenlabs' | 'azure' | 'google';
  locale: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  styleTags: string[];
  description?: string;
  category: string;
  availability: 'available' | 'unavailable' | 'degraded';
  previewUrl?: string;
  previewText?: string;
  quality: 'standard' | 'premium' | 'ultra';
  useCases: string[];
  characteristics: {
    tone: string;
    pace: string;
    clarity: string;
  };
}

/**
 * Voice selection result with fallback metadata
 */
export interface VoiceSelectionResult {
  voiceId: string;
  voiceName: string;
  provider: string;
  locale: string;
  wasFallback: boolean;
  fallbackReason?: string;
  fallbackLevel: number; // 0 = no fallback, 1 = first fallback, etc.
  requestedVoiceId?: string;
  message?: string;
}

/**
 * Voice preview request
 */
export interface VoicePreviewRequest {
  voiceId: string;
  text?: string;
  provider?: string;
}

/**
 * Voice preview result
 */
export interface VoicePreviewResult {
  voiceId: string;
  voiceName: string;
  previewUrl?: string;
  previewAudio?: Buffer;
  duration?: number;
  format: string;
}

/**
 * Fallback policy configuration
 */
export interface FallbackPolicy {
  enabled: boolean;
  maxAttempts: number;
  fallbackChain: string[]; // Ordered list of voice IDs to try
  crossProviderFallback: boolean;
  notifyUser: boolean;
}

/**
 * Voice catalog filter options
 */
export interface VoiceCatalogFilter {
  provider?: string;
  locale?: string;
  language?: string;
  gender?: string;
  styleTags?: string[];
  quality?: string;
  availability?: string;
}

/**
 * Voice Service
 * Central service for voice management and selection
 */
export class VoiceService {
  private elevenLabsService: ElevenLabsService;
  private voiceCache: Map<string, VoiceProfile>;
  private cacheExpiry: number;
  private lastCacheUpdate: Date | null;

  constructor() {
    this.elevenLabsService = new ElevenLabsService();
    this.voiceCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    this.lastCacheUpdate = null;

    logger.info('VoiceService initialized');
  }

  /**
   * Get complete voice catalog (FR-011)
   * Returns all available voices with metadata
   */
  async getVoiceCatalog(filter?: VoiceCatalogFilter): Promise<VoiceProfile[]> {
    try {
      logger.info('Fetching voice catalog', { filter });

      // Refresh cache if needed
      await this.refreshCacheIfNeeded();

      // Get all voices from cache
      let voices = Array.from(this.voiceCache.values());

      // Apply filters if provided
      if (filter) {
        voices = this.applyFilters(voices, filter);
      }

      logger.info('Voice catalog retrieved', {
        totalVoices: voices.length,
        filtered: !!filter
      });

      return voices;
    } catch (error) {
      logger.error('Failed to fetch voice catalog', { error });
      throw new Error(`Voice catalog retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific voice by ID
   */
  async getVoice(voiceId: string): Promise<VoiceProfile | null> {
    try {
      await this.refreshCacheIfNeeded();
      return this.voiceCache.get(voiceId) || null;
    } catch (error) {
      logger.error('Failed to get voice', { voiceId, error });
      return null;
    }
  }

  /**
   * Preview a voice before use (FR-012)
   */
  async previewVoice(request: VoicePreviewRequest): Promise<VoicePreviewResult> {
    try {
      logger.info('Generating voice preview', {
        voiceId: request.voiceId,
        provider: request.provider
      });

      const voice = await this.getVoice(request.voiceId);
      if (!voice) {
        throw new Error(`Voice not found: ${request.voiceId}`);
      }

      // If voice has a preview URL, return it
      if (voice.previewUrl) {
        return {
          voiceId: voice.id,
          voiceName: voice.name,
          previewUrl: voice.previewUrl,
          duration: 5,
          format: 'mp3'
        };
      }

      // Generate preview audio
      const previewText = request.text || voice.previewText || 
        'Welcome to our podcast. This is a sample of how this voice sounds.';

      // Generate short audio preview
      const audioBuffer = await this.elevenLabsService.generateAudio(previewText, {
        voiceId: request.voiceId, // voiceId is required in request
        voiceName: voice.name
      });

      logger.info('Voice preview generated', {
        voiceId: request.voiceId,
        audioSize: audioBuffer.length
      });

      return {
        voiceId: voice.id,
        voiceName: voice.name,
        previewAudio: audioBuffer,
        duration: 5,
        format: 'mp3'
      };
    } catch (error) {
      logger.error('Voice preview failed', {
        voiceId: request.voiceId,
        error
      });
      throw new Error(`Voice preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select voice with deterministic fallback (FR-013)
   * 
   * @param preferredVoiceId - Preferred voice ID
   * @param locale - Desired locale for fallback
   * @returns Voice selection result with fallback metadata
   */
  async selectVoiceWithFallback(
    preferredVoiceId?: string,
    locale: string = 'en-US'
  ): Promise<VoiceSelectionResult> {
    try {
      logger.info('Selecting voice with fallback', {
        preferredVoiceId,
        locale
      });

      // Get fallback policy
      const policy = this.getFallbackPolicy(locale);

      // Try preferred voice first
      if (preferredVoiceId) {
        const voice = await this.getVoice(preferredVoiceId);
        if (voice && voice.availability === 'available') {
          logger.info('Using preferred voice', { voiceId: preferredVoiceId });
          return {
            voiceId: voice.id,
            voiceName: voice.name,
            provider: voice.provider,
            locale: voice.locale,
            wasFallback: false,
            fallbackLevel: 0,
            message: `Using preferred voice: ${voice.name}`
          };
        }

        // Preferred voice unavailable, will use fallback
        logger.warn('Preferred voice unavailable, applying fallback', {
          preferredVoiceId,
          availability: voice?.availability || 'not_found'
        });
      }

      // Apply deterministic fallback chain
      const fallbackResult = await this.applyFallbackChain(
        policy.fallbackChain,
        preferredVoiceId,
        locale
      );

      logger.info('Voice selected with fallback', {
        selectedVoice: fallbackResult.voiceId,
        fallbackLevel: fallbackResult.fallbackLevel,
        wasFallback: fallbackResult.wasFallback
      });

      return fallbackResult;
    } catch (error) {
      logger.error('Voice selection with fallback failed', { error });
      throw new Error(`Voice selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get deterministic fallback policy for a locale (FR-013)
   */
  getFallbackPolicy(locale: string = 'en-US'): FallbackPolicy {
    // Deterministic fallback chain for English (US)
    const enUSFallbackChain = [
      'pNInz6obpgDQGcFmaJgB', // Adam (ElevenLabs) - Clear, professional male
      '21m00Tcm4TlvDq8ikWAM', // Rachel (ElevenLabs) - Professional female
      'ErXwobaYiN019PkySvjV', // Antoni (ElevenLabs) - Warm male
      'EXAVITQu4vr4xnSDxMaL', // Bella (ElevenLabs) - Friendly female
      'TxGEqnHWrfWFTfGW9XjX'  // Josh (ElevenLabs) - Young male
    ];

    // Deterministic fallback for other locales
    const defaultFallbackChain = [
      'pNInz6obpgDQGcFmaJgB', // Adam - Works for multiple languages
      '21m00Tcm4TlvDq8ikWAM'  // Rachel - Multilingual capable
    ];

    const fallbackChain = locale.startsWith('en') 
      ? enUSFallbackChain 
      : defaultFallbackChain;

    return {
      enabled: true,
      maxAttempts: fallbackChain.length,
      fallbackChain,
      crossProviderFallback: true,
      notifyUser: true
    };
  }

  /**
   * Check voice availability
   */
  async checkVoiceAvailability(voiceId: string): Promise<boolean> {
    try {
      const voice = await this.getVoice(voiceId);
      return voice !== null && voice.availability === 'available';
    } catch (error) {
      logger.error('Voice availability check failed', { voiceId, error });
      return false;
    }
  }

  /**
   * Get available voices for a specific locale
   */
  async getVoicesForLocale(locale: string): Promise<VoiceProfile[]> {
    const catalog = await this.getVoiceCatalog({ locale });
    return catalog.filter(v => v.availability === 'available');
  }

  /**
   * Search voices by query
   */
  async searchVoices(query: string): Promise<VoiceProfile[]> {
    const catalog = await this.getVoiceCatalog();
    const lowerQuery = query.toLowerCase();

    return catalog.filter(voice =>
      voice.name.toLowerCase().includes(lowerQuery) ||
      voice.displayName.toLowerCase().includes(lowerQuery) ||
      voice.description?.toLowerCase().includes(lowerQuery) ||
      voice.styleTags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get voice recommendations based on use case
   */
  async getRecommendedVoices(
    useCase: 'podcast' | 'narration' | 'conversational' | 'news',
    locale: string = 'en-US'
  ): Promise<VoiceProfile[]> {
    const catalog = await this.getVoiceCatalog({
      locale,
      availability: 'available'
    });

    // Filter by use case
    return catalog
      .filter(voice => voice.useCases.includes(useCase))
      .sort((a, b) => {
        // Prioritize by quality
        const qualityOrder = { ultra: 3, premium: 2, standard: 1 };
        return qualityOrder[b.quality] - qualityOrder[a.quality];
      })
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Apply fallback chain deterministically
   */
  private async applyFallbackChain(
    fallbackChain: string[],
    requestedVoiceId: string | undefined,
    _locale: string
  ): Promise<VoiceSelectionResult> {
    if (fallbackChain.length === 0) {
      throw new Error('Fallback chain is empty');
    }

    for (let i = 0; i < fallbackChain.length; i++) {
      const voiceId = fallbackChain[i];
      if (!voiceId) continue;
      
      const voice = await this.getVoice(voiceId);

      if (voice && voice.availability === 'available') {
        const reason = requestedVoiceId
          ? `Preferred voice (${requestedVoiceId}) unavailable`
          : 'Using default voice';

        return {
          voiceId: voice.id,
          voiceName: voice.name,
          provider: voice.provider,
          locale: voice.locale,
          wasFallback: !!requestedVoiceId,
          fallbackReason: reason,
          fallbackLevel: i + 1,
          requestedVoiceId,
          message: `Using fallback voice: ${voice.name} (${reason})`
        };
      }
    }

    // All fallbacks failed, return last voice in chain
    const lastVoiceId = fallbackChain[fallbackChain.length - 1];
    if (!lastVoiceId) {
      throw new Error('Invalid fallback chain');
    }
    
    const lastVoice = await this.getVoice(lastVoiceId);

    if (!lastVoice) {
      throw new Error('All fallback voices unavailable');
    }

    return {
      voiceId: lastVoice.id,
      voiceName: lastVoice.name,
      provider: lastVoice.provider,
      locale: lastVoice.locale,
      wasFallback: true,
      fallbackReason: 'All preferred voices unavailable, using last resort',
      fallbackLevel: fallbackChain.length,
      requestedVoiceId,
      message: `Using last resort voice: ${lastVoice.name}`
    };
  }

  /**
   * Apply filters to voice catalog
   */
  private applyFilters(
    voices: VoiceProfile[],
    filter: VoiceCatalogFilter
  ): VoiceProfile[] {
    let filtered = voices;

    if (filter.provider) {
      filtered = filtered.filter(v => v.provider === filter.provider);
    }

    if (filter.locale) {
      filtered = filtered.filter(v => v.locale === filter.locale);
    }

    if (filter.language) {
      filtered = filtered.filter(v => v.language === filter.language);
    }

    if (filter.gender) {
      filtered = filtered.filter(v => v.gender === filter.gender);
    }

    if (filter.styleTags && filter.styleTags.length > 0) {
      filtered = filtered.filter(v =>
        filter.styleTags!.some(tag => v.styleTags.includes(tag))
      );
    }

    if (filter.quality) {
      filtered = filtered.filter(v => v.quality === filter.quality);
    }

    if (filter.availability) {
      filtered = filtered.filter(v => v.availability === filter.availability);
    }

    return filtered;
  }

  /**
   * Refresh voice cache if expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date();
    const needsRefresh = 
      !this.lastCacheUpdate ||
      (now.getTime() - this.lastCacheUpdate.getTime()) > this.cacheExpiry;

    if (needsRefresh) {
      await this.refreshVoiceCache();
    }
  }

  /**
   * Refresh voice cache from providers
   */
  private async refreshVoiceCache(): Promise<void> {
    try {
      logger.info('Refreshing voice cache');

      // Fetch voices from ElevenLabs
      const elevenLabsVoices = await this.elevenLabsService.getVoices();

      // Convert to VoiceProfile format
      const profiles = this.convertToVoiceProfiles(elevenLabsVoices);

      // Update cache
      this.voiceCache.clear();
      profiles.forEach(profile => {
        this.voiceCache.set(profile.id, profile);
      });

      this.lastCacheUpdate = new Date();

      logger.info('Voice cache refreshed', {
        voiceCount: this.voiceCache.size,
        timestamp: this.lastCacheUpdate
      });
    } catch (error) {
      logger.error('Voice cache refresh failed', { error });
      // Don't clear existing cache on error
    }
  }

  /**
   * Convert ElevenLabs voices to VoiceProfile format
   */
  private convertToVoiceProfiles(voices: VoiceInfo[]): VoiceProfile[] {
    return voices.map(voice => this.mapElevenLabsVoice(voice));
  }

  /**
   * Map ElevenLabs voice to VoiceProfile
   */
  private mapElevenLabsVoice(voice: VoiceInfo): VoiceProfile {
    // Infer metadata from voice name and category
    const metadata = this.inferVoiceMetadata(voice.name, voice.category);

    return {
      id: voice.id,
      name: voice.name,
      displayName: voice.name,
      provider: 'elevenlabs',
      locale: metadata.locale,
      language: metadata.language,
      gender: metadata.gender,
      styleTags: metadata.styleTags,
      description: voice.description || `${voice.name} - ${voice.category} voice`,
      category: voice.category,
      availability: 'available',
      previewUrl: undefined, // ElevenLabs doesn't provide direct preview URLs
      previewText: 'Welcome to our podcast. This is how this voice sounds.',
      quality: metadata.quality,
      useCases: metadata.useCases,
      characteristics: metadata.characteristics
    };
  }

  /**
   * Infer voice metadata from name and category
   */
  private inferVoiceMetadata(name: string, category: string): {
    locale: string;
    language: string;
    gender?: 'male' | 'female' | 'neutral';
    styleTags: string[];
    quality: 'standard' | 'premium' | 'ultra';
    useCases: string[];
    characteristics: { tone: string; pace: string; clarity: string };
  } {
    // Default metadata
    const metadata = {
      locale: 'en-US',
      language: 'en',
      gender: undefined as 'male' | 'female' | 'neutral' | undefined,
      styleTags: [] as string[],
      quality: 'premium' as 'standard' | 'premium' | 'ultra',
      useCases: ['podcast', 'narration'] as string[],
      characteristics: {
        tone: 'neutral',
        pace: 'moderate',
        clarity: 'high'
      }
    };

    // Infer gender from common names
    const maleNames = ['Adam', 'Antoni', 'Arnold', 'Josh', 'Clyde', 'Roger', 'Sam'];
    const femaleNames = ['Bella', 'Rachel', 'Elli'];

    if (maleNames.some(n => name.includes(n))) {
      metadata.gender = 'male';
    } else if (femaleNames.some(n => name.includes(n))) {
      metadata.gender = 'female';
    }

    // Infer style tags from category
    if (category.toLowerCase().includes('professional')) {
      metadata.styleTags.push('professional', 'clear', 'authoritative');
      metadata.useCases.push('news', 'educational');
    } else if (category.toLowerCase().includes('conversational')) {
      metadata.styleTags.push('conversational', 'friendly', 'warm');
      metadata.useCases.push('conversational', 'podcast');
    } else {
      metadata.styleTags.push('general', 'versatile');
    }

    return metadata;
  }

  /**
   * Get service health status
   */
  async checkHealth(): Promise<{
    status: 'OK' | 'DEGRADED' | 'FAILED';
    message: string;
    voiceCount: number;
    lastUpdate: Date | null;
  }> {
    try {
      await this.refreshCacheIfNeeded();

      const voiceCount = this.voiceCache.size;
      const status = voiceCount > 0 ? 'OK' : 'DEGRADED';

      return {
        status,
        message: `Voice service ${status.toLowerCase()}, ${voiceCount} voices available`,
        voiceCount,
        lastUpdate: this.lastCacheUpdate
      };
    } catch (error) {
      return {
        status: 'FAILED',
        message: `Voice service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        voiceCount: 0,
        lastUpdate: this.lastCacheUpdate
      };
    }
  }
}

// Export singleton instance
let voiceService: VoiceService | null = null;

/**
 * Get the voice service instance
 */
export function getVoiceService(): VoiceService {
  if (!voiceService) {
    voiceService = new VoiceService();
  }
  return voiceService;
}
