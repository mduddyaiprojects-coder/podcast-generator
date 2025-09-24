"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastEpisode = void 0;
var uuid_1 = require("uuid");
var PodcastEpisode = /** @class */ (function () {
    function PodcastEpisode(data) {
        this.id = data.id || this.generateId();
        this.submission_id = data.submission_id;
        this.title = data.title;
        this.description = data.description;
        this.source_url = data.source_url;
        this.content_type = data.content_type;
        this.audio_url = data.audio_url;
        this.audio_duration = data.audio_duration;
        this.audio_size = data.audio_size;
        this.transcript = data.transcript;
        this.dialogue_script = data.dialogue_script;
        this.summary = data.summary;
        this.chapter_markers = data.chapter_markers;
        this.pub_date = data.pub_date || new Date();
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
        this.validate();
    }
    PodcastEpisode.prototype.generateId = function () {
        return (0, uuid_1.v4)();
    };
    PodcastEpisode.prototype.validate = function () {
        // Validate title
        if (!this.title || this.title.trim().length === 0) {
            throw new Error('Title is required');
        }
        if (this.title.length > 200) {
            throw new Error('Title must be 200 characters or less');
        }
        // Validate description
        if (!this.description || this.description.trim().length === 0) {
            throw new Error('Description is required');
        }
        if (this.description.length > 1000) {
            throw new Error('Description must be 1000 characters or less');
        }
        // Validate source_url
        if (!this.source_url || this.source_url.trim().length === 0) {
            throw new Error('Source URL is required');
        }
        // Validate content_type
        var validContentTypes = ['url', 'youtube', 'pdf', 'document'];
        if (!validContentTypes.includes(this.content_type)) {
            throw new Error("Invalid content type: ".concat(this.content_type, ". Must be one of: ").concat(validContentTypes.join(', ')));
        }
        // Note: feed_id removed - using single public feed
        // Validate audio_duration if audio_url is present
        if (this.audio_url && (!this.audio_duration || this.audio_duration <= 0)) {
            throw new Error('Audio duration must be greater than 0 when audio URL is present');
        }
        // Validate audio_size if audio_url is present
        if (this.audio_url && (!this.audio_size || this.audio_size <= 0)) {
            throw new Error('Audio size must be greater than 0 when audio URL is present');
        }
        // Validate pub_date is not in the future
        if (this.pub_date > new Date()) {
            throw new Error('Publication date cannot be in the future');
        }
        // Validate chapter markers
        if (this.chapter_markers) {
            this.validateChapterMarkers();
        }
    };
    PodcastEpisode.prototype.validateChapterMarkers = function () {
        if (!Array.isArray(this.chapter_markers)) {
            throw new Error('Chapter markers must be an array');
        }
        for (var i = 0; i < this.chapter_markers.length; i++) {
            var marker = this.chapter_markers[i];
            if (!marker || !marker.title || marker.title.trim().length === 0) {
                throw new Error("Chapter marker ".concat(i + 1, ": title is required"));
            }
            if (typeof marker.start_time !== 'number' || marker.start_time < 0) {
                throw new Error("Chapter marker ".concat(i + 1, ": start_time must be a non-negative number"));
            }
            if (typeof marker.end_time !== 'number' || marker.end_time <= marker.start_time) {
                throw new Error("Chapter marker ".concat(i + 1, ": end_time must be greater than start_time"));
            }
            // Validate against audio duration if available
            if (this.audio_duration && marker.end_time > this.audio_duration) {
                throw new Error("Chapter marker ".concat(i + 1, ": end_time cannot exceed audio duration"));
            }
        }
        // Check for overlapping markers
        for (var i = 0; i < this.chapter_markers.length - 1; i++) {
            var current = this.chapter_markers[i];
            var next = this.chapter_markers[i + 1];
            if (current && next && current.end_time > next.start_time) {
                throw new Error("Chapter markers ".concat(i + 1, " and ").concat(i + 2, " overlap"));
            }
        }
    };
    /**
     * Update the audio information
     */
    PodcastEpisode.prototype.updateAudio = function (audioUrl, duration, size) {
        var updatedData = {
            id: this.id,
            submission_id: this.submission_id,
            title: this.title,
            description: this.description,
            source_url: this.source_url,
            content_type: this.content_type,
            audio_url: audioUrl,
            audio_duration: duration,
            audio_size: size,
            transcript: this.transcript,
            dialogue_script: this.dialogue_script,
            summary: this.summary,
            chapter_markers: this.chapter_markers,
            pub_date: this.pub_date,
            created_at: this.created_at,
            updated_at: new Date()
        };
        return new PodcastEpisode(updatedData);
    };
    /**
     * Update the transcript
     */
    PodcastEpisode.prototype.updateTranscript = function (transcript) {
        var updatedData = {
            id: this.id,
            submission_id: this.submission_id,
            title: this.title,
            description: this.description,
            source_url: this.source_url,
            content_type: this.content_type,
            audio_url: this.audio_url,
            audio_duration: this.audio_duration,
            audio_size: this.audio_size,
            transcript: transcript,
            dialogue_script: this.dialogue_script,
            summary: this.summary,
            chapter_markers: this.chapter_markers,
            pub_date: this.pub_date,
            created_at: this.created_at,
            updated_at: new Date()
        };
        return new PodcastEpisode(updatedData);
    };
    /**
     * Update the dialogue script
     */
    PodcastEpisode.prototype.updateDialogueScript = function (dialogueScript) {
        var updatedData = {
            id: this.id,
            submission_id: this.submission_id,
            title: this.title,
            description: this.description,
            source_url: this.source_url,
            content_type: this.content_type,
            audio_url: this.audio_url,
            audio_duration: this.audio_duration,
            audio_size: this.audio_size,
            transcript: this.transcript,
            dialogue_script: dialogueScript,
            summary: this.summary,
            chapter_markers: this.chapter_markers,
            pub_date: this.pub_date,
            created_at: this.created_at,
            updated_at: new Date()
        };
        return new PodcastEpisode(updatedData);
    };
    /**
     * Update the summary
     */
    PodcastEpisode.prototype.updateSummary = function (summary) {
        var updatedData = {
            id: this.id,
            submission_id: this.submission_id,
            title: this.title,
            description: this.description,
            source_url: this.source_url,
            content_type: this.content_type,
            audio_url: this.audio_url,
            audio_duration: this.audio_duration,
            audio_size: this.audio_size,
            transcript: this.transcript,
            dialogue_script: this.dialogue_script,
            summary: summary,
            chapter_markers: this.chapter_markers,
            pub_date: this.pub_date,
            created_at: this.created_at,
            updated_at: new Date()
        };
        return new PodcastEpisode(updatedData);
    };
    /**
     * Update the chapter markers
     */
    PodcastEpisode.prototype.updateChapterMarkers = function (chapterMarkers) {
        var updatedData = {
            id: this.id,
            submission_id: this.submission_id,
            title: this.title,
            description: this.description,
            source_url: this.source_url,
            content_type: this.content_type,
            audio_url: this.audio_url,
            audio_duration: this.audio_duration,
            audio_size: this.audio_size,
            transcript: this.transcript,
            dialogue_script: this.dialogue_script,
            summary: this.summary,
            chapter_markers: chapterMarkers,
            pub_date: this.pub_date,
            created_at: this.created_at,
            updated_at: new Date()
        };
        return new PodcastEpisode(updatedData);
    };
    /**
     * Get formatted duration string (MM:SS)
     */
    PodcastEpisode.prototype.getFormattedDuration = function () {
        if (!this.audio_duration) {
            return '00:00';
        }
        var minutes = Math.floor(this.audio_duration / 60);
        var seconds = Math.floor(this.audio_duration % 60);
        return "".concat(minutes, ":").concat(seconds.toString().padStart(2, '0'));
    };
    /**
     * Get formatted duration string (HH:MM:SS)
     */
    PodcastEpisode.prototype.getFormattedDurationLong = function () {
        if (!this.audio_duration) {
            return '00:00:00';
        }
        var hours = Math.floor(this.audio_duration / 3600);
        var minutes = Math.floor((this.audio_duration % 3600) / 60);
        var seconds = Math.floor(this.audio_duration % 60);
        if (hours > 0) {
            return "".concat(hours, ":").concat(minutes.toString().padStart(2, '0'), ":").concat(seconds.toString().padStart(2, '0'));
        }
        else {
            return "".concat(minutes, ":").concat(seconds.toString().padStart(2, '0'));
        }
    };
    /**
     * Get RSS GUID for the episode
     */
    PodcastEpisode.prototype.getRssGuid = function () {
        return "episode_".concat(this.id);
    };
    /**
     * Get enclosure URL for RSS feed
     */
    PodcastEpisode.prototype.getEnclosureUrl = function () {
        return this.audio_url;
    };
    /**
     * Get enclosure type for RSS feed
     */
    PodcastEpisode.prototype.getEnclosureType = function () {
        return 'audio/mpeg';
    };
    /**
     * Get enclosure length for RSS feed
     */
    PodcastEpisode.prototype.getEnclosureLength = function () {
        return this.audio_size;
    };
    /**
     * Get word count from transcript
     */
    PodcastEpisode.prototype.getWordCount = function () {
        if (!this.transcript) {
            return 0;
        }
        return this.transcript.split(/\s+/).filter(function (word) { return word.length > 0; }).length;
    };
    /**
     * Get estimated reading time in minutes
     */
    PodcastEpisode.prototype.getReadingTime = function () {
        var wordCount = this.getWordCount();
        var wordsPerMinute = 200; // Average reading speed
        return Math.ceil(wordCount / wordsPerMinute);
    };
    /**
     * Check if episode has audio
     */
    PodcastEpisode.prototype.hasAudio = function () {
        return !!this.audio_url && !!this.audio_duration && !!this.audio_size;
    };
    /**
     * Check if episode has transcript
     */
    PodcastEpisode.prototype.hasTranscript = function () {
        return !!this.transcript && this.transcript.trim().length > 0;
    };
    /**
     * Check if episode has dialogue script
     */
    PodcastEpisode.prototype.hasDialogueScript = function () {
        return !!this.dialogue_script && this.dialogue_script.trim().length > 0;
    };
    /**
     * Check if episode has chapter markers
     */
    PodcastEpisode.prototype.hasChapterMarkers = function () {
        return !!this.chapter_markers && this.chapter_markers.length > 0;
    };
    /**
     * Get chapter marker at specific time
     */
    PodcastEpisode.prototype.getChapterAtTime = function (timeInSeconds) {
        if (!this.chapter_markers) {
            return undefined;
        }
        return this.chapter_markers.find(function (marker) {
            return timeInSeconds >= marker.start_time && timeInSeconds <= marker.end_time;
        });
    };
    /**
     * Get all chapter markers as a formatted string
     */
    PodcastEpisode.prototype.getChapterMarkersAsString = function () {
        var _this = this;
        if (!this.chapter_markers || this.chapter_markers.length === 0) {
            return '';
        }
        return this.chapter_markers
            .map(function (marker) { return "".concat(_this.getFormattedDurationLong(), ": ").concat(marker.title); })
            .join('\n');
    };
    /**
     * Convert to plain object for database storage
     */
    PodcastEpisode.prototype.toJSON = function () {
        return {
            id: this.id,
            submission_id: this.submission_id,
            title: this.title,
            description: this.description,
            source_url: this.source_url,
            content_type: this.content_type,
            audio_url: this.audio_url,
            audio_duration: this.audio_duration,
            audio_size: this.audio_size,
            transcript: this.transcript,
            dialogue_script: this.dialogue_script,
            summary: this.summary,
            chapter_markers: this.chapter_markers,
            pub_date: this.pub_date,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    };
    /**
     * Create from plain object (database retrieval)
     */
    PodcastEpisode.fromJSON = function (data) {
        return new PodcastEpisode(data);
    };
    return PodcastEpisode;
}());
exports.PodcastEpisode = PodcastEpisode;
