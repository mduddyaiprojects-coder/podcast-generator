import { UserFeed, UserFeedData, TTSProvider } from '../../src/models/user-feed';

// Mock timers to control Date.now() for testing
jest.useFakeTimers();

describe('UserFeed', () => {
  const validFeedData: UserFeedData = {
    slug: 'test-feed',
    title: 'Test Podcast Feed',
    admin_email: 'admin@example.com',
    tts_voice_id: 'default-voice-123'
  };

  const fullFeedData: UserFeedData = {
    id: 'test-id-123',
    slug: 'full-feed',
    title: 'Full Podcast Feed',
    description: 'A comprehensive podcast feed',
    author: 'Test Author',
    category: 'Technology',
    artwork_url: 'https://example.com/artwork.jpg',
    admin_email: 'admin@example.com',
    tts_voice_id: 'voice-123',
    tts_provider: 'elevenlabs',
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-01')
  };

  describe('constructor', () => {
    it('should create feed with minimal required data', () => {
      const feed = new UserFeed(validFeedData);

      expect(feed.slug).toBe('test-feed');
      expect(feed.title).toBe('Test Podcast Feed');
      expect(feed.admin_email).toBe('admin@example.com');
      expect(feed.tts_provider).toBe('elevenlabs'); // default
      expect(feed.id).toBeDefined();
      expect(feed.created_at).toBeInstanceOf(Date);
      expect(feed.updated_at).toBeInstanceOf(Date);
    });

    it('should create feed with all optional data', () => {
      const feed = new UserFeed(fullFeedData);

      expect(feed.id).toBe('test-id-123');
      expect(feed.slug).toBe('full-feed');
      expect(feed.title).toBe('Full Podcast Feed');
      expect(feed.description).toBe('A comprehensive podcast feed');
      expect(feed.author).toBe('Test Author');
      expect(feed.category).toBe('Technology');
      expect(feed.artwork_url).toBe('https://example.com/artwork.jpg');
      expect(feed.tts_voice_id).toBe('voice-123');
      expect(feed.tts_provider).toBe('elevenlabs');
    });

    it('should generate UUID when no ID provided', () => {
      const feed = new UserFeed(validFeedData);
      expect(feed.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should set default dates when not provided', () => {
      const feed = new UserFeed(validFeedData);
      const now = new Date();
      
      expect(feed.created_at.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(feed.updated_at.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it('should default to elevenlabs TTS provider', () => {
      const feed = new UserFeed(validFeedData);
      expect(feed.tts_provider).toBe('elevenlabs');
    });
  });

  describe('validation', () => {
    it('should throw error for empty slug', () => {
      expect(() => new UserFeed({ ...validFeedData, slug: '' }))
        .toThrow('Slug is required');
    });

    it('should throw error for whitespace-only slug', () => {
      expect(() => new UserFeed({ ...validFeedData, slug: '   ' }))
        .toThrow('Slug is required');
    });

    it('should throw error for invalid slug format', () => {
      const invalidSlugs = ['test feed', 'test@feed', 'test.feed', 'test/feed', 'test+feed'];
      
      invalidSlugs.forEach(slug => {
        expect(() => new UserFeed({ ...validFeedData, slug }))
          .toThrow('Slug must be URL-safe (alphanumeric, hyphens, underscores only)');
      });
    });

    it('should accept valid slug formats', () => {
      const validSlugs = ['test-feed', 'test_feed', 'test123', 'test-feed-123', 'Test_Feed'];
      
      validSlugs.forEach(slug => {
        expect(() => new UserFeed({ 
          ...validFeedData, 
          slug,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        })).not.toThrow();
      });
    });

    it('should throw error for empty title', () => {
      expect(() => new UserFeed({ ...validFeedData, title: '' }))
        .toThrow('Title is required');
    });

    it('should throw error for whitespace-only title', () => {
      expect(() => new UserFeed({ ...validFeedData, title: '   ' }))
        .toThrow('Title is required');
    });

    it('should throw error for title too long', () => {
      const longTitle = 'a'.repeat(101);
      expect(() => new UserFeed({ ...validFeedData, title: longTitle }))
        .toThrow('Title must be 100 characters or less');
    });

    it('should throw error for empty admin_email', () => {
      expect(() => new UserFeed({ ...validFeedData, admin_email: '' }))
        .toThrow('Admin email is required');
    });

    it('should throw error for invalid email format', () => {
      const invalidEmails = ['invalid-email', '@example.com', 'test@', 'test.example.com'];
      
      invalidEmails.forEach(email => {
        expect(() => new UserFeed({ ...validFeedData, admin_email: email }))
          .toThrow('Invalid email format');
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'test+tag@example.org'];
      
      validEmails.forEach(email => {
        expect(() => new UserFeed({ 
          ...validFeedData, 
          admin_email: email,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        })).not.toThrow();
      });
    });

    it('should throw error for elevenlabs without voice ID', () => {
      expect(() => new UserFeed({ 
        ...validFeedData, 
        tts_provider: 'elevenlabs',
        tts_voice_id: ''
      })).toThrow('TTS voice ID is required when TTS provider is ElevenLabs');
    });

    it('should accept elevenlabs with voice ID', () => {
      expect(() => new UserFeed({ 
        ...validFeedData, 
        tts_provider: 'elevenlabs',
        tts_voice_id: 'voice-123'
      })).not.toThrow();
    });

    it('should accept azure without voice ID', () => {
      expect(() => new UserFeed({ 
        ...validFeedData, 
        tts_provider: 'azure'
      })).not.toThrow();
    });

    it('should throw error for invalid TTS provider', () => {
      expect(() => new UserFeed({ 
        ...validFeedData, 
        tts_provider: 'invalid' as TTSProvider
      })).toThrow('Invalid TTS provider: invalid. Must be one of: elevenlabs, azure');
    });

    it('should throw error for invalid artwork URL', () => {
      expect(() => new UserFeed({ 
        ...validFeedData, 
        artwork_url: 'not-a-url',
        tts_provider: 'azure' // Use Azure to avoid voice ID requirement
      })).toThrow('Invalid artwork URL format');
    });

    it('should accept valid artwork URL', () => {
      expect(() => new UserFeed({ 
        ...validFeedData, 
        artwork_url: 'https://example.com/artwork.jpg',
        tts_provider: 'azure' // Use Azure to avoid voice ID requirement
      })).not.toThrow();
    });
  });

  describe('update methods', () => {
    let feed: UserFeed;

    beforeEach(() => {
      feed = new UserFeed(validFeedData);
      jest.advanceTimersByTime(1);
    });

    it('should update title', () => {
      const updated = feed.updateTitle('New Title');

      expect(updated.title).toBe('New Title');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update description', () => {
      const updated = feed.updateDescription('New description');

      expect(updated.description).toBe('New description');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update author', () => {
      const updated = feed.updateAuthor('New Author');

      expect(updated.author).toBe('New Author');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update category', () => {
      const updated = feed.updateCategory('Science');

      expect(updated.category).toBe('Science');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update artwork URL', () => {
      const updated = feed.updateArtwork('https://example.com/new-artwork.jpg');

      expect(updated.artwork_url).toBe('https://example.com/new-artwork.jpg');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update admin email', () => {
      const updated = feed.updateAdminEmail('newadmin@example.com');

      expect(updated.admin_email).toBe('newadmin@example.com');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update TTS configuration', () => {
      const updated = feed.updateTTSConfig('azure', 'azure-voice-123');

      expect(updated.tts_provider).toBe('azure');
      expect(updated.tts_voice_id).toBe('azure-voice-123');
      expect(updated.updated_at).not.toEqual(feed.updated_at);
      expect(updated.id).toBe(feed.id);
    });

    it('should update TTS voice ID', () => {
      const feedWithElevenLabs = new UserFeed({
        ...validFeedData,
        tts_provider: 'elevenlabs',
        tts_voice_id: 'old-voice-123'
      });

      jest.advanceTimersByTime(1); // Ensure different timestamp
      const updated = feedWithElevenLabs.updateTTSVoiceId('new-voice-456');

      expect(updated.tts_voice_id).toBe('new-voice-456');
      expect(updated.updated_at).not.toEqual(feedWithElevenLabs.updated_at);
      expect(updated.id).toBe(feedWithElevenLabs.id);
    });
  });

  describe('utility methods', () => {
    let feed: UserFeed;

    beforeEach(() => {
      feed = new UserFeed(fullFeedData);
    });

    describe('getRssFeedUrl', () => {
      it('should return RSS feed URL', () => {
        expect(feed.getRssFeedUrl('https://api.example.com'))
          .toBe('https://api.example.com/feeds/full-feed/rss.xml');
      });
    });

    describe('getEpisodesUrl', () => {
      it('should return episodes URL', () => {
        expect(feed.getEpisodesUrl('https://api.example.com'))
          .toBe('https://api.example.com/feeds/full-feed/episodes');
      });
    });

    describe('getDisplayName', () => {
      it('should return title when available', () => {
        expect(feed.getDisplayName()).toBe('Full Podcast Feed');
      });

      it('should return slug when title is empty', () => {
        // Create feed with valid title first, then manually set empty title to bypass validation
        const feedWithoutTitle = new UserFeed(validFeedData);
        (feedWithoutTitle as any).title = '';
        expect(feedWithoutTitle.getDisplayName()).toBe('test-feed');
      });
    });

    describe('getDescription', () => {
      it('should return description when available', () => {
        expect(feed.getDescription()).toBe('A comprehensive podcast feed');
      });

      it('should return fallback when description is empty', () => {
        const feedWithoutDescription = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        expect(feedWithoutDescription.getDescription())
          .toBe('Personal podcast feed for Test Podcast Feed');
      });
    });

    describe('getAuthor', () => {
      it('should return author when available', () => {
        expect(feed.getAuthor()).toBe('Test Author');
      });

      it('should return fallback when author is empty', () => {
        const feedWithoutAuthor = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        expect(feedWithoutAuthor.getAuthor()).toBe('Podcast Generator');
      });
    });

    describe('getCategory', () => {
      it('should return category when available', () => {
        expect(feed.getCategory()).toBe('Technology');
      });

      it('should return fallback when category is empty', () => {
        const feedWithoutCategory = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        expect(feedWithoutCategory.getCategory()).toBe('Technology');
      });
    });

    describe('hasArtwork', () => {
      it('should return true when artwork URL is present', () => {
        expect(feed.hasArtwork()).toBe(true);
      });

      it('should return false when artwork URL is empty', () => {
        const feedWithoutArtwork = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        expect(feedWithoutArtwork.hasArtwork()).toBe(false);
      });

      it('should return false when artwork URL is whitespace', () => {
        // Create feed with valid artwork first, then manually set whitespace to bypass validation
        const feedWithWhitespaceArtwork = new UserFeed({
          ...validFeedData,
          artwork_url: 'https://example.com/artwork.jpg',
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        (feedWithWhitespaceArtwork as any).artwork_url = '   ';
        expect(feedWithWhitespaceArtwork.hasArtwork()).toBe(false);
      });
    });

    describe('hasTTSConfig', () => {
      it('should return true for elevenlabs with voice ID', () => {
        expect(feed.hasTTSConfig()).toBe(true);
      });

      it('should return false for elevenlabs without voice ID', () => {
        // Create feed with valid voice ID first, then manually set empty voice ID to bypass validation
        const feedWithoutVoiceId = new UserFeed({
          ...validFeedData,
          tts_provider: 'elevenlabs',
          tts_voice_id: 'valid-voice-123'
        });
        (feedWithoutVoiceId as any).tts_voice_id = '';
        expect(feedWithoutVoiceId.hasTTSConfig()).toBe(false);
      });

      it('should return true for azure TTS', () => {
        const azureFeed = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure'
        });
        expect(azureFeed.hasTTSConfig()).toBe(true);
      });
    });

    describe('getTTSVoiceId', () => {
      it('should return TTS voice ID when available', () => {
        expect(feed.getTTSVoiceId()).toBe('voice-123');
      });

      it('should return undefined when not available', () => {
        const feedWithoutVoiceId = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure',
          tts_voice_id: undefined // Explicitly set to undefined
        });
        expect(feedWithoutVoiceId.getTTSVoiceId()).toBeUndefined();
      });
    });

    describe('getTTSProvider', () => {
      it('should return TTS provider', () => {
        expect(feed.getTTSProvider()).toBe('elevenlabs');
      });
    });

    describe('isUsingElevenLabs', () => {
      it('should return true for elevenlabs provider', () => {
        expect(feed.isUsingElevenLabs()).toBe(true);
      });

      it('should return false for azure provider', () => {
        const azureFeed = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure'
        });
        expect(azureFeed.isUsingElevenLabs()).toBe(false);
      });
    });

    describe('isUsingAzureTTS', () => {
      it('should return true for azure provider', () => {
        const azureFeed = new UserFeed({
          ...validFeedData,
          tts_provider: 'azure'
        });
        expect(azureFeed.isUsingAzureTTS()).toBe(true);
      });

      it('should return false for elevenlabs provider', () => {
        expect(feed.isUsingAzureTTS()).toBe(false);
      });
    });

    describe('getAgeInDays', () => {
      it('should return age in days', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10);
        
        const oldFeed = new UserFeed({
          ...validFeedData,
          created_at: oldDate,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });

        expect(oldFeed.getAgeInDays()).toBe(10);
      });
    });

    describe('getLastUpdateAgeInDays', () => {
      it('should return last update age in days', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 5);
        
        const oldFeed = new UserFeed({
          ...validFeedData,
          updated_at: oldDate,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });

        expect(oldFeed.getLastUpdateAgeInDays()).toBe(5);
      });
    });

    describe('isRecentlyUpdated', () => {
      it('should return true for recently updated feed', () => {
        const recentFeed = new UserFeed({
          ...validFeedData,
          updated_at: new Date(), // Just now
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        expect(recentFeed.isRecentlyUpdated()).toBe(true);
      });

      it('should return false for old feed', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10);
        
        const oldFeed = new UserFeed({
          ...validFeedData,
          updated_at: oldDate,
          tts_provider: 'azure' // Use Azure to avoid voice ID requirement
        });
        expect(oldFeed.isRecentlyUpdated()).toBe(false);
      });
    });

    describe('getRSSMetadata', () => {
      it('should return RSS metadata', () => {
        const metadata = feed.getRSSMetadata();

        expect(metadata.title).toBe('Full Podcast Feed');
        expect(metadata.description).toBe('A comprehensive podcast feed');
        expect(metadata.author).toBe('Test Author');
        expect(metadata.category).toBe('Technology');
        expect(metadata.admin_email).toBe('admin@example.com');
        expect(metadata.artwork_url).toBe('https://example.com/artwork.jpg');
        expect(metadata.tts_provider).toBe('elevenlabs');
        expect(metadata.tts_voice_id).toBe('voice-123');
      });
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should convert to JSON correctly', () => {
      const testFeed = new UserFeed(fullFeedData);
      const json = testFeed.toJSON();

      expect(json.id).toBe('test-id-123');
      expect(json.slug).toBe('full-feed');
      expect(json.title).toBe('Full Podcast Feed');
      expect(json.description).toBe('A comprehensive podcast feed');
      expect(json.author).toBe('Test Author');
      expect(json.category).toBe('Technology');
      expect(json.artwork_url).toBe('https://example.com/artwork.jpg');
      expect(json.admin_email).toBe('admin@example.com');
      expect(json.tts_voice_id).toBe('voice-123');
      expect(json.tts_provider).toBe('elevenlabs');
    });

    it('should create from JSON correctly', () => {
      const jsonData: UserFeedData = {
        id: 'test-id',
        slug: 'test-feed',
        title: 'Test Feed',
        description: 'Test description',
        author: 'Test Author',
        category: 'Technology',
        artwork_url: 'https://example.com/artwork.jpg',
        admin_email: 'admin@example.com',
        tts_voice_id: 'voice-123',
        tts_provider: 'elevenlabs',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      };

      const feed = UserFeed.fromJSON(jsonData);

      expect(feed.id).toBe('test-id');
      expect(feed.slug).toBe('test-feed');
      expect(feed.title).toBe('Test Feed');
      expect(feed.description).toBe('Test description');
      expect(feed.author).toBe('Test Author');
      expect(feed.category).toBe('Technology');
      expect(feed.artwork_url).toBe('https://example.com/artwork.jpg');
      expect(feed.admin_email).toBe('admin@example.com');
      expect(feed.tts_voice_id).toBe('voice-123');
      expect(feed.tts_provider).toBe('elevenlabs');
    });
  });

  describe('createNew static method', () => {
    it('should create new feed with generated slug', () => {
      const feed = UserFeed.createNew('My Awesome Podcast', 'admin@example.com', {
        tts_voice_id: 'default-voice-123' // Provide voice ID for ElevenLabs
      });

      expect(feed.title).toBe('My Awesome Podcast');
      expect(feed.admin_email).toBe('admin@example.com');
      expect(feed.slug).toBe('my-awesome-podcast');
      expect(feed.tts_provider).toBe('elevenlabs');
    });

    it('should create new feed with options', () => {
      const feed = UserFeed.createNew('My Podcast', 'admin@example.com', {
        description: 'My description',
        author: 'My Author',
        category: 'Science',
        artwork_url: 'https://example.com/artwork.jpg',
        tts_provider: 'azure',
        tts_voice_id: 'azure-voice-123'
      });

      expect(feed.title).toBe('My Podcast');
      expect(feed.description).toBe('My description');
      expect(feed.author).toBe('My Author');
      expect(feed.category).toBe('Science');
      expect(feed.artwork_url).toBe('https://example.com/artwork.jpg');
      expect(feed.tts_provider).toBe('azure');
      expect(feed.tts_voice_id).toBe('azure-voice-123');
    });

    it('should generate URL-safe slug from title', () => {
      const testCases = [
        { title: 'My Awesome Podcast!', expected: 'my-awesome-podcast' },
        { title: 'Tech & Science @2023', expected: 'tech-science-2023' },
        { title: 'Hello World!!!', expected: 'hello-world' },
        { title: 'A Very Long Title That Should Be Truncated Because It Exceeds The Maximum Length', expected: 'a-very-long-title-that-should-be-truncated-because' }
      ];

      testCases.forEach(({ title, expected }) => {
        const feed = UserFeed.createNew(title, 'admin@example.com', {
          tts_voice_id: 'default-voice-123' // Provide voice ID for ElevenLabs
        });
        expect(feed.slug).toBe(expected);
      });
    });
  });
});
