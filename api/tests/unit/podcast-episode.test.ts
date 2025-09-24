import { PodcastEpisode, PodcastEpisodeData, ChapterMarker, ContentType } from '../../src/models/podcast-episode';

// Mock timers to control Date.now() for testing
jest.useFakeTimers();

describe('PodcastEpisode', () => {
  const validEpisodeData: PodcastEpisodeData = {
    title: 'Test Episode',
    description: 'A test podcast episode',
    source_url: 'https://example.com/article',
    content_type: 'url'
  };

  const validChapterMarkers: ChapterMarker[] = [
    { title: 'Introduction', start_time: 0, end_time: 30 },
    { title: 'Main Content', start_time: 30, end_time: 120 },
    { title: 'Conclusion', start_time: 120, end_time: 150 }
  ];

  describe('constructor', () => {
    it('should create episode with minimal required data', () => {
      const episode = new PodcastEpisode(validEpisodeData);

      expect(episode.title).toBe('Test Episode');
      expect(episode.description).toBe('A test podcast episode');
      expect(episode.source_url).toBe('https://example.com/article');
      expect(episode.content_type).toBe('url');
      expect(episode.id).toBeDefined();
      expect(episode.pub_date).toBeInstanceOf(Date);
      expect(episode.created_at).toBeInstanceOf(Date);
      expect(episode.updated_at).toBeInstanceOf(Date);
    });

    it('should create episode with all optional data', () => {
      const fullData: PodcastEpisodeData = {
        id: 'test-id-123',
        submission_id: 'sub-123',
        title: 'Full Episode',
        description: 'A complete episode',
        source_url: 'https://example.com/full',
        content_type: 'youtube',
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 300,
        audio_size: 1024000,
        transcript: 'This is the transcript',
        dialogue_script: 'This is the dialogue script',
        summary: 'This is the summary',
        chapter_markers: validChapterMarkers,
        pub_date: new Date('2023-01-01'),
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      };

      const episode = new PodcastEpisode(fullData);

      expect(episode.id).toBe('test-id-123');
      expect(episode.submission_id).toBe('sub-123');
      expect(episode.audio_url).toBe('https://example.com/audio.mp3');
      expect(episode.audio_duration).toBe(300);
      expect(episode.audio_size).toBe(1024000);
      expect(episode.transcript).toBe('This is the transcript');
      expect(episode.dialogue_script).toBe('This is the dialogue script');
      expect(episode.summary).toBe('This is the summary');
      expect(episode.chapter_markers).toEqual(validChapterMarkers);
    });

    it('should generate UUID when no ID provided', () => {
      const episode = new PodcastEpisode(validEpisodeData);
      expect(episode.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should set default dates when not provided', () => {
      const episode = new PodcastEpisode(validEpisodeData);
      const now = new Date();
      
      expect(episode.pub_date.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(episode.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(episode.updated_at.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  describe('validation', () => {
    it('should throw error for empty title', () => {
      expect(() => new PodcastEpisode({ ...validEpisodeData, title: '' }))
        .toThrow('Title is required');
    });

    it('should throw error for whitespace-only title', () => {
      expect(() => new PodcastEpisode({ ...validEpisodeData, title: '   ' }))
        .toThrow('Title is required');
    });

    it('should throw error for title too long', () => {
      const longTitle = 'a'.repeat(201);
      expect(() => new PodcastEpisode({ ...validEpisodeData, title: longTitle }))
        .toThrow('Title must be 200 characters or less');
    });

    it('should throw error for empty description', () => {
      expect(() => new PodcastEpisode({ ...validEpisodeData, description: '' }))
        .toThrow('Description is required');
    });

    it('should throw error for whitespace-only description', () => {
      expect(() => new PodcastEpisode({ ...validEpisodeData, description: '   ' }))
        .toThrow('Description is required');
    });

    it('should throw error for description too long', () => {
      const longDescription = 'a'.repeat(1001);
      expect(() => new PodcastEpisode({ ...validEpisodeData, description: longDescription }))
        .toThrow('Description must be 1000 characters or less');
    });

    it('should throw error for empty source_url', () => {
      expect(() => new PodcastEpisode({ ...validEpisodeData, source_url: '' }))
        .toThrow('Source URL is required');
    });

    it('should throw error for invalid content_type', () => {
      expect(() => new PodcastEpisode({ ...validEpisodeData, content_type: 'invalid' as ContentType }))
        .toThrow('Invalid content type: invalid. Must be one of: url, youtube, pdf, document');
    });

    it('should throw error for audio_url without duration', () => {
      expect(() => new PodcastEpisode({ 
        ...validEpisodeData, 
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 0
      })).toThrow('Audio duration must be greater than 0 when audio URL is present');
    });

    it('should throw error for audio_url without size', () => {
      expect(() => new PodcastEpisode({ 
        ...validEpisodeData, 
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 300,
        audio_size: 0
      })).toThrow('Audio size must be greater than 0 when audio URL is present');
    });

    it('should throw error for future pub_date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      expect(() => new PodcastEpisode({ ...validEpisodeData, pub_date: futureDate }))
        .toThrow('Publication date cannot be in the future');
    });
  });

  describe('chapter markers validation', () => {
    it('should validate valid chapter markers', () => {
      const episode = new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: validChapterMarkers,
        audio_duration: 200
      });

      expect(episode.chapter_markers).toEqual(validChapterMarkers);
    });

    it('should throw error for non-array chapter markers', () => {
      expect(() => new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: 'not an array' as any
      })).toThrow('Chapter markers must be an array');
    });

    it('should throw error for chapter marker without title', () => {
      const invalidMarkers = [
        { title: '', start_time: 0, end_time: 30 }
      ];

      expect(() => new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: invalidMarkers
      })).toThrow('Chapter marker 1: title is required');
    });

    it('should throw error for negative start_time', () => {
      const invalidMarkers = [
        { title: 'Test', start_time: -1, end_time: 30 }
      ];

      expect(() => new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: invalidMarkers
      })).toThrow('Chapter marker 1: start_time must be a non-negative number');
    });

    it('should throw error for end_time not greater than start_time', () => {
      const invalidMarkers = [
        { title: 'Test', start_time: 30, end_time: 30 }
      ];

      expect(() => new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: invalidMarkers
      })).toThrow('Chapter marker 1: end_time must be greater than start_time');
    });

    it('should throw error for end_time exceeding audio duration', () => {
      const invalidMarkers = [
        { title: 'Test', start_time: 0, end_time: 200 }
      ];

      expect(() => new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: invalidMarkers,
        audio_duration: 150
      })).toThrow('Chapter marker 1: end_time cannot exceed audio duration');
    });

    it('should throw error for overlapping chapter markers', () => {
      const overlappingMarkers = [
        { title: 'First', start_time: 0, end_time: 60 },
        { title: 'Second', start_time: 30, end_time: 90 }
      ];

      expect(() => new PodcastEpisode({
        ...validEpisodeData,
        chapter_markers: overlappingMarkers
      })).toThrow('Chapter markers 1 and 2 overlap');
    });
  });

  describe('update methods', () => {
    let episode: PodcastEpisode;

    beforeEach(() => {
      episode = new PodcastEpisode(validEpisodeData);
      // Add a small delay to ensure updated_at is different
      jest.advanceTimersByTime(1);
    });

    it('should update audio information', () => {
      const updatedEpisode = episode.updateAudio(
        'https://example.com/new-audio.mp3',
        300,
        2048000
      );

      expect(updatedEpisode.audio_url).toBe('https://example.com/new-audio.mp3');
      expect(updatedEpisode.audio_duration).toBe(300);
      expect(updatedEpisode.audio_size).toBe(2048000);
      expect(updatedEpisode.updated_at).not.toEqual(episode.updated_at);
      expect(updatedEpisode.id).toBe(episode.id);
    });

    it('should update transcript', () => {
      const updatedEpisode = episode.updateTranscript('New transcript content');

      expect(updatedEpisode.transcript).toBe('New transcript content');
      expect(updatedEpisode.updated_at).not.toEqual(episode.updated_at);
      expect(updatedEpisode.id).toBe(episode.id);
    });

    it('should update dialogue script', () => {
      const updatedEpisode = episode.updateDialogueScript('New dialogue script');

      expect(updatedEpisode.dialogue_script).toBe('New dialogue script');
      expect(updatedEpisode.updated_at).not.toEqual(episode.updated_at);
      expect(updatedEpisode.id).toBe(episode.id);
    });

    it('should update summary', () => {
      const updatedEpisode = episode.updateSummary('New summary');

      expect(updatedEpisode.summary).toBe('New summary');
      expect(updatedEpisode.updated_at).not.toEqual(episode.updated_at);
      expect(updatedEpisode.id).toBe(episode.id);
    });

    it('should update chapter markers', () => {
      const newMarkers: ChapterMarker[] = [
        { title: 'New Chapter', start_time: 0, end_time: 60 }
      ];
      const updatedEpisode = episode.updateChapterMarkers(newMarkers);

      expect(updatedEpisode.chapter_markers).toEqual(newMarkers);
      expect(updatedEpisode.updated_at).not.toEqual(episode.updated_at);
      expect(updatedEpisode.id).toBe(episode.id);
    });
  });

  describe('utility methods', () => {
    let episode: PodcastEpisode;

    beforeEach(() => {
      episode = new PodcastEpisode({
        ...validEpisodeData,
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 3661, // 1 hour, 1 minute, 1 second
        audio_size: 1024000,
        transcript: 'This is a test transcript with multiple words for counting',
        chapter_markers: validChapterMarkers
      });
    });

    describe('getFormattedDuration', () => {
      it('should return formatted duration in MM:SS', () => {
        expect(episode.getFormattedDuration()).toBe('61:01');
      });

      it('should return 00:00 when no audio duration', () => {
        const episodeWithoutAudio = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutAudio.getFormattedDuration()).toBe('00:00');
      });
    });

    describe('getFormattedDurationLong', () => {
      it('should return formatted duration in HH:MM:SS for long duration', () => {
        expect(episode.getFormattedDurationLong()).toBe('1:01:01');
      });

      it('should return MM:SS for duration less than an hour', () => {
        const shortEpisode = new PodcastEpisode({
          ...validEpisodeData,
          audio_duration: 125 // 2 minutes, 5 seconds
        });
        expect(shortEpisode.getFormattedDurationLong()).toBe('2:05');
      });

      it('should return 00:00:00 when no audio duration', () => {
        const episodeWithoutAudio = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutAudio.getFormattedDurationLong()).toBe('00:00:00');
      });
    });

    describe('getRssGuid', () => {
      it('should return episode GUID', () => {
        expect(episode.getRssGuid()).toBe(`episode_${episode.id}`);
      });
    });

    describe('getEnclosureUrl', () => {
      it('should return audio URL', () => {
        expect(episode.getEnclosureUrl()).toBe(episode.audio_url);
      });

      it('should return undefined when no audio URL', () => {
        const episodeWithoutAudio = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutAudio.getEnclosureUrl()).toBeUndefined();
      });
    });

    describe('getEnclosureType', () => {
      it('should return audio/mpeg', () => {
        expect(episode.getEnclosureType()).toBe('audio/mpeg');
      });
    });

    describe('getEnclosureLength', () => {
      it('should return audio size', () => {
        expect(episode.getEnclosureLength()).toBe(episode.audio_size);
      });

      it('should return undefined when no audio size', () => {
        const episodeWithoutAudio = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutAudio.getEnclosureLength()).toBeUndefined();
      });
    });

    describe('getWordCount', () => {
    it('should return word count from transcript', () => {
      expect(episode.getWordCount()).toBe(10); // "This is a test transcript with multiple words for counting"
    });

      it('should return 0 when no transcript', () => {
        const episodeWithoutTranscript = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutTranscript.getWordCount()).toBe(0);
      });
    });

    describe('getReadingTime', () => {
      it('should return estimated reading time in minutes', () => {
        expect(episode.getReadingTime()).toBe(1); // 12 words / 200 words per minute = 0.06, rounded up to 1
      });

      it('should return 0 when no transcript', () => {
        const episodeWithoutTranscript = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutTranscript.getReadingTime()).toBe(0);
      });
    });

    describe('hasAudio', () => {
      it('should return true when all audio properties present', () => {
        expect(episode.hasAudio()).toBe(true);
      });

      it('should return false when audio URL missing', () => {
        const episodeWithoutAudioUrl = new PodcastEpisode({
          ...validEpisodeData,
          audio_duration: 300,
          audio_size: 1024000
        });
        expect(episodeWithoutAudioUrl.hasAudio()).toBe(false);
      });

    it('should return false when audio duration missing', () => {
      // Create episode without audio first, then manually set properties to bypass validation
      const episodeWithoutDuration = new PodcastEpisode(validEpisodeData);
      (episodeWithoutDuration as any).audio_url = 'https://example.com/audio.mp3';
      (episodeWithoutDuration as any).audio_size = 1024000;
      expect(episodeWithoutDuration.hasAudio()).toBe(false);
    });

    it('should return false when audio size missing', () => {
      // Create episode without audio first, then manually set properties to bypass validation
      const episodeWithoutSize = new PodcastEpisode(validEpisodeData);
      (episodeWithoutSize as any).audio_url = 'https://example.com/audio.mp3';
      (episodeWithoutSize as any).audio_duration = 300;
      expect(episodeWithoutSize.hasAudio()).toBe(false);
    });
    });

    describe('hasTranscript', () => {
      it('should return true when transcript present', () => {
        expect(episode.hasTranscript()).toBe(true);
      });

      it('should return false when no transcript', () => {
        const episodeWithoutTranscript = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutTranscript.hasTranscript()).toBe(false);
      });

      it('should return false when transcript is empty', () => {
        const episodeWithEmptyTranscript = new PodcastEpisode({
          ...validEpisodeData,
          transcript: '   '
        });
        expect(episodeWithEmptyTranscript.hasTranscript()).toBe(false);
      });
    });

    describe('hasDialogueScript', () => {
      it('should return true when dialogue script present', () => {
        const episodeWithScript = new PodcastEpisode({
          ...validEpisodeData,
          dialogue_script: 'Some dialogue script'
        });
        expect(episodeWithScript.hasDialogueScript()).toBe(true);
      });

      it('should return false when no dialogue script', () => {
        expect(episode.hasDialogueScript()).toBe(false);
      });
    });

    describe('hasChapterMarkers', () => {
      it('should return true when chapter markers present', () => {
        expect(episode.hasChapterMarkers()).toBe(true);
      });

      it('should return false when no chapter markers', () => {
        const episodeWithoutMarkers = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutMarkers.hasChapterMarkers()).toBe(false);
      });

      it('should return false when empty chapter markers array', () => {
        const episodeWithEmptyMarkers = new PodcastEpisode({
          ...validEpisodeData,
          chapter_markers: []
        });
        expect(episodeWithEmptyMarkers.hasChapterMarkers()).toBe(false);
      });
    });

    describe('getChapterAtTime', () => {
      it('should return chapter marker at specific time', () => {
        const chapter = episode.getChapterAtTime(45);
        expect(chapter).toEqual({ title: 'Main Content', start_time: 30, end_time: 120 });
      });

      it('should return undefined when no chapter at time', () => {
        const chapter = episode.getChapterAtTime(200);
        expect(chapter).toBeUndefined();
      });

      it('should return undefined when no chapter markers', () => {
        const episodeWithoutMarkers = new PodcastEpisode(validEpisodeData);
        const chapter = episodeWithoutMarkers.getChapterAtTime(45);
        expect(chapter).toBeUndefined();
      });
    });

    describe('getChapterMarkersAsString', () => {
      it('should return formatted chapter markers string', () => {
        const result = episode.getChapterMarkersAsString();
        expect(result).toContain('Introduction');
        expect(result).toContain('Main Content');
        expect(result).toContain('Conclusion');
      });

      it('should return empty string when no chapter markers', () => {
        const episodeWithoutMarkers = new PodcastEpisode(validEpisodeData);
        expect(episodeWithoutMarkers.getChapterMarkersAsString()).toBe('');
      });
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should convert to JSON correctly', () => {
      const episode = new PodcastEpisode({
        ...validEpisodeData,
        id: 'test-id',
        submission_id: 'sub-123',
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 300,
        audio_size: 1024000,
        transcript: 'Test transcript',
        chapter_markers: validChapterMarkers
      });

      const json = episode.toJSON();

      expect(json.id).toBe('test-id');
      expect(json.submission_id).toBe('sub-123');
      expect(json.title).toBe('Test Episode');
      expect(json.audio_url).toBe('https://example.com/audio.mp3');
      expect(json.chapter_markers).toEqual(validChapterMarkers);
    });

    it('should create from JSON correctly', () => {
      const jsonData: PodcastEpisodeData = {
        id: 'test-id',
        submission_id: 'sub-123',
        title: 'Test Episode',
        description: 'A test episode',
        source_url: 'https://example.com/article',
        content_type: 'url',
        audio_url: 'https://example.com/audio.mp3',
        audio_duration: 300,
        audio_size: 1024000,
        transcript: 'Test transcript',
        chapter_markers: validChapterMarkers,
        pub_date: new Date('2023-01-01'),
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      };

      const episode = PodcastEpisode.fromJSON(jsonData);

      expect(episode.id).toBe('test-id');
      expect(episode.submission_id).toBe('sub-123');
      expect(episode.title).toBe('Test Episode');
      expect(episode.audio_url).toBe('https://example.com/audio.mp3');
      expect(episode.chapter_markers).toEqual(validChapterMarkers);
    });
  });

  describe('content type validation', () => {
    it('should accept all valid content types', () => {
      const validTypes: ContentType[] = ['url', 'youtube', 'pdf', 'document'];
      
      validTypes.forEach(type => {
        expect(() => new PodcastEpisode({ ...validEpisodeData, content_type: type }))
          .not.toThrow();
      });
    });
  });
});