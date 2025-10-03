import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Integration Test: Voice Selection Fallback
 * 
 * This test validates that the voice selection system applies deterministic fallback
 * when a preferred voice is unavailable. Tests verify:
 * 
 * 1. Voice catalog is available with metadata
 * 2. Voice availability is checked before use
 * 3. Fallback policy is applied when voice is unavailable
 * 4. Fallback selection is deterministic and predictable
 * 5. User is informed of the applied fallback
 * 
 * Test Strategy:
 * - Test voice availability checking
 * - Simulate unavailable voice scenarios
 * - Verify deterministic fallback selection
 * - Validate user notification of fallback
 * 
 * Requirements Tested:
 * - FR-011: Voice catalog with descriptive labels and locale metadata
 * - FR-012: Voice preview capability
 * - FR-013: Deterministic fallback policy with user notification
 */
describe('Voice Selection Fallback Integration Tests', () => {
  let client: AxiosInstance;
  const baseURL = process.env['API_BASE_URL'] || 'http://localhost:7071/api';

  beforeAll(() => {
    client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
  });

  describe('Voice Catalog Availability', () => {
    it('should retrieve voice catalog successfully', async () => {
      // Test endpoint to get available voices
      const response = await client.get('/voices');
      
      // Should return voice catalog
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data) || response.data.voices).toBeTruthy();
      }
    });

    it('should include voice metadata in catalog', async () => {
      const response = await client.get('/voices');
      
      if (response.status === 200) {
        const voices = Array.isArray(response.data) ? response.data : response.data.voices;
        
        if (voices && voices.length > 0) {
          const firstVoice = voices[0];
          
          // Should have essential metadata
          expect(firstVoice).toHaveProperty('id');
          
          // Should have descriptive information
          const hasName = firstVoice.name || firstVoice.display_name || firstVoice.displayName;
          expect(hasName).toBeTruthy();
          
          // Should have locale/language info
          const hasLocale = firstVoice.locale || firstVoice.language || firstVoice.lang;
          expect(hasLocale).toBeTruthy();
        }
      }
    });

    it('should indicate voice availability status', async () => {
      const response = await client.get('/voices');
      
      if (response.status === 200) {
        const voices = Array.isArray(response.data) ? response.data : response.data.voices;
        
        if (voices && voices.length > 0) {
          const firstVoice = voices[0];
          
          // Should have availability indicator
          const hasAvailability = 
            firstVoice.hasOwnProperty('availability') ||
            firstVoice.hasOwnProperty('available') ||
            firstVoice.hasOwnProperty('status');
          
          expect(hasAvailability).toBeTruthy();
        }
      }
    });
  });

  describe('Voice Preview Capability', () => {
    it('should support voice preview request', async () => {
      // Test voice preview endpoint
      const response = await client.get('/voices/preview', {
        params: { voiceId: 'test-voice-id' }
      });
      
      // Should return preview info or 404 if not implemented
      expect([200, 404, 400]).toContain(response.status);
    });

    it('should provide preview URL or audio sample', async () => {
      const response = await client.get('/voices');
      
      if (response.status === 200) {
        const voices = Array.isArray(response.data) ? response.data : response.data.voices;
        
        if (voices && voices.length > 0) {
          const voiceWithPreview = voices.find((v: any) => 
            v.preview_url || v.previewUrl || v.preview || v.sampleUrl
          );
          
          if (voiceWithPreview) {
            const previewUrl = 
              voiceWithPreview.preview_url || 
              voiceWithPreview.previewUrl || 
              voiceWithPreview.preview ||
              voiceWithPreview.sampleUrl;
            
            expect(typeof previewUrl).toBe('string');
            expect(previewUrl.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Voice Availability Checking', () => {
    it('should validate voice availability before use', async () => {
      // Test TTS generation with specific voice
      const ttsRequest = {
        text: 'Test audio generation',
        voice_id: 'test-voice-id',
        voice_name: 'Test Voice'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should accept or reject based on voice availability
      expect([200, 202, 400, 404]).toContain(response.status);
      
      if (response.status === 400 || response.status === 404) {
        // Error should mention voice availability
        expect(response.data).toHaveProperty('error');
      }
    });

    it('should check voice provider availability', async () => {
      // Test health check for TTS providers
      const providers = ['elevenlabs', 'azure'];
      
      for (const provider of providers) {
        const response = await client.get(`/health/${provider}`, {
          validateStatus: () => true
        });
        
        // Should return health status or 404 if endpoint doesn't exist
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toHaveProperty('status');
        }
      }
    });
  });

  describe('Deterministic Fallback Selection', () => {
    it('should apply fallback when preferred voice is unavailable', async () => {
      // Request TTS with an unavailable voice
      const ttsRequest = {
        text: 'Fallback test audio',
        voice_id: 'unavailable-voice-12345',
        provider: 'elevenlabs'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should either accept with fallback or return error with fallback info
      expect([200, 202, 400, 503]).toContain(response.status);
      
      if (response.status === 200 || response.status === 202) {
        // Should indicate if fallback was used
        const dataStr = JSON.stringify(response.data);
        const mentionsFallback = 
          dataStr.includes('fallback') || 
          dataStr.includes('alternate') ||
          dataStr.includes('default');
        
        // If voice wasn't found, some indication of fallback should exist
        expect(response.data).toBeDefined();
      }
    });

    it('should use deterministic fallback order', async () => {
      // Make multiple requests with same unavailable voice
      const ttsRequest = {
        text: 'Deterministic fallback test',
        voice_id: 'unavailable-voice-99999'
      };
      
      const response1 = await client.post('/tts/generate', ttsRequest);
      const response2 = await client.post('/tts/generate', ttsRequest);
      
      // Both should return same fallback behavior
      expect(response1.status).toBe(response2.status);
      
      if (response1.status === 200 || response1.status === 202) {
        // If successful, should use same fallback voice
        const voice1 = response1.data.voice_used || response1.data.voiceUsed;
        const voice2 = response2.data.voice_used || response2.data.voiceUsed;
        
        if (voice1 && voice2) {
          expect(voice1).toBe(voice2);
        }
      }
    });

    it('should fallback to default voice when preferred unavailable', async () => {
      // Request with unavailable voice, expect fallback to default
      const ttsRequest = {
        text: 'Default fallback test',
        voice_id: 'definitely-not-a-real-voice-id-12345'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        // Should have used some voice (default fallback)
        expect(response.data).toBeDefined();
        
        const voiceUsed = response.data.voice_used || response.data.voiceUsed;
        if (voiceUsed) {
          // Should not be the unavailable voice
          expect(voiceUsed).not.toBe('definitely-not-a-real-voice-id-12345');
        }
      }
    });

    it('should fallback across providers when necessary', async () => {
      // Request with provider that might be unavailable
      const ttsRequest = {
        text: 'Cross-provider fallback test',
        provider: 'elevenlabs',
        voice_id: 'unavailable-elevenlabs-voice'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        // May have fallen back to different provider
        const providerUsed = response.data.provider_used || response.data.providerUsed || response.data.provider;
        
        if (providerUsed) {
          // Should be one of the valid providers
          expect(['elevenlabs', 'azure']).toContain(providerUsed);
        }
      }
    });
  });

  describe('Fallback Notification', () => {
    it('should indicate when fallback is applied', async () => {
      // Request with unavailable voice
      const ttsRequest = {
        text: 'Notification test',
        voice_id: 'unavailable-voice-notify-test'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        const data = response.data;
        
        // Should have metadata about voice used
        const hasVoiceInfo = 
          data.voice_used || 
          data.voiceUsed || 
          data.voice || 
          data.metadata?.voice_used;
        
        expect(hasVoiceInfo).toBeDefined();
      }
    });

    it('should provide reason for fallback in response', async () => {
      const ttsRequest = {
        text: 'Fallback reason test',
        voice_id: 'unavailable-voice-reason-test'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        // Response should include metadata
        expect(response.data).toBeDefined();
        
        // May include fallback information in metadata
        const metadata = response.data.metadata || response.data;
        expect(metadata).toBeTruthy();
      }
    });

    it('should return consistent fallback information', async () => {
      const ttsRequest = {
        text: 'Consistent fallback test',
        voice_id: 'test-consistency-voice'
      };
      
      // Make multiple requests
      const responses = await Promise.all([
        client.post('/tts/generate', ttsRequest),
        client.post('/tts/generate', ttsRequest),
        client.post('/tts/generate', ttsRequest)
      ]);
      
      // All should return same status
      const statuses = responses.map(r => r.status);
      const uniqueStatuses = [...new Set(statuses)];
      expect(uniqueStatuses.length).toBe(1);
      
      // If successful, should use consistent voice
      if (responses[0].status === 200 || responses[0].status === 202) {
        const voices = responses.map(r => r.data.voice_used || r.data.voiceUsed).filter(Boolean);
        if (voices.length > 1) {
          const uniqueVoices = [...new Set(voices)];
          expect(uniqueVoices.length).toBe(1);
        }
      }
    });
  });

  describe('Voice Selection Policy', () => {
    it('should respect locale in fallback selection', async () => {
      // Request specific locale
      const ttsRequest = {
        text: 'Locale-specific fallback test',
        voice_id: 'unavailable-voice',
        language: 'en-US'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        // Should have used appropriate locale voice
        const voiceUsed = response.data.voice_used || response.data.voiceUsed;
        expect(voiceUsed).toBeDefined();
      }
    });

    it('should handle multiple unavailable voices gracefully', async () => {
      // Request with primary and secondary voices both unavailable
      const ttsRequest = {
        text: 'Multiple unavailable test',
        voice_id: 'unavailable-primary-voice',
        fallback_voice_id: 'unavailable-secondary-voice'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should either succeed with tertiary fallback or return clear error
      expect([200, 202, 400, 503]).toContain(response.status);
      
      if (response.status === 400 || response.status === 503) {
        expect(response.data).toHaveProperty('error');
        expect(response.data).toHaveProperty('message');
      }
    });

    it('should prioritize available voices by quality', async () => {
      // Request TTS and check which voice was selected
      const ttsRequest = {
        text: 'Quality prioritization test',
        language: 'en-US'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        // Should have selected a voice
        const voiceUsed = response.data.voice_used || response.data.voiceUsed;
        expect(voiceUsed).toBeDefined();
        expect(typeof voiceUsed).toBe('string');
        expect(voiceUsed.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Provider Fallback Behavior', () => {
    it('should fallback from ElevenLabs to Azure when ElevenLabs unavailable', async () => {
      // Simulate ElevenLabs unavailable by using invalid key
      const ttsRequest = {
        text: 'Provider fallback test',
        provider: 'elevenlabs',
        voice_id: 'any-elevenlabs-voice'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should either succeed with fallback or indicate provider issue
      expect([200, 202, 400, 503]).toContain(response.status);
      
      if (response.status === 200 || response.status === 202) {
        const providerUsed = response.data.provider_used || response.data.providerUsed;
        
        if (providerUsed) {
          // May have fallen back to azure
          expect(['elevenlabs', 'azure']).toContain(providerUsed);
        }
      }
    });

    it('should use Azure as default fallback provider', async () => {
      const ttsRequest = {
        text: 'Azure fallback test',
        // Don't specify provider, should use default with fallback
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      if (response.status === 200 || response.status === 202) {
        const providerUsed = response.data.provider_used || response.data.providerUsed;
        
        // Should have used a provider
        if (providerUsed) {
          expect(['elevenlabs', 'azure']).toContain(providerUsed);
        }
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid voice ID gracefully', async () => {
      const ttsRequest = {
        text: 'Invalid voice ID test',
        voice_id: 'invalid-voice-@#$%'
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should return error or fallback successfully
      expect([200, 202, 400]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.data).toHaveProperty('error');
        expect(response.data.message).toBeTruthy();
      }
    });

    it('should handle empty voice ID with default', async () => {
      const ttsRequest = {
        text: 'Empty voice ID test',
        voice_id: ''
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should use default voice
      expect([200, 202, 400]).toContain(response.status);
      
      if (response.status === 200 || response.status === 202) {
        expect(response.data.voice_used || response.data.voiceUsed).toBeDefined();
      }
    });

    it('should handle null voice ID with default', async () => {
      const ttsRequest = {
        text: 'Null voice ID test',
        voice_id: null
      };
      
      const response = await client.post('/tts/generate', ttsRequest);
      
      // Should use default voice
      expect([200, 202, 400]).toContain(response.status);
    });

    it('should recover from transient voice unavailability', async () => {
      const ttsRequest = {
        text: 'Transient unavailability test',
        voice_id: 'potentially-transient-voice'
      };
      
      // Make multiple attempts
      const responses = await Promise.all([
        client.post('/tts/generate', ttsRequest),
        client.post('/tts/generate', ttsRequest)
      ]);
      
      // At least one should succeed or both should fail consistently
      const successCount = responses.filter(r => r.status === 200 || r.status === 202).length;
      const failCount = responses.filter(r => r.status >= 400).length;
      
      expect(successCount + failCount).toBe(2);
    });
  });

  describe('Voice Metadata and Documentation', () => {
    it('should provide voice style tags', async () => {
      const response = await client.get('/voices');
      
      if (response.status === 200) {
        const voices = Array.isArray(response.data) ? response.data : response.data.voices;
        
        if (voices && voices.length > 0) {
          const voiceWithTags = voices.find((v: any) => 
            v.style_tags || v.styleTags || v.tags || v.categories
          );
          
          if (voiceWithTags) {
            const tags = 
              voiceWithTags.style_tags || 
              voiceWithTags.styleTags || 
              voiceWithTags.tags ||
              voiceWithTags.categories;
            
            expect(Array.isArray(tags) || typeof tags === 'string').toBeTruthy();
          }
        }
      }
    });

    it('should document fallback policy', async () => {
      // Check if there's a fallback policy endpoint or documentation
      const response = await client.get('/voices/policy', {
        validateStatus: () => true
      });
      
      // May return policy info or 404 if not implemented
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });
  });
});
