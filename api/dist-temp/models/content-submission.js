"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSubmission = void 0;
var uuid_1 = require("uuid");
var ContentSubmission = /** @class */ (function () {
    function ContentSubmission(data) {
        this.id = data.id || this.generateId();
        this.content_url = data.content_url;
        this.content_type = data.content_type;
        this.user_note = data.user_note;
        this.status = data.status || 'pending';
        this.error_message = data.error_message;
        this.extracted_content = data.extracted_content;
        this.metadata = data.metadata;
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
        this.processed_at = data.processed_at;
        this.source = data.source;
        this.device_info = data.device_info;
        this.validate();
    }
    ContentSubmission.prototype.generateId = function () {
        return (0, uuid_1.v4)();
    };
    ContentSubmission.prototype.validate = function () {
        // Validate content_url
        if (!this.content_url || this.content_url.trim().length === 0) {
            throw new Error('Content URL is required');
        }
        // Validate content_type
        var validContentTypes = ['url', 'youtube', 'pdf', 'document'];
        if (!validContentTypes.includes(this.content_type)) {
            throw new Error("Invalid content type: ".concat(this.content_type, ". Must be one of: ").concat(validContentTypes.join(', ')));
        }
        // Validate status
        var validStatuses = ['pending', 'processing', 'completed', 'failed'];
        if (!validStatuses.includes(this.status)) {
            throw new Error("Invalid status: ".concat(this.status, ". Must be one of: ").concat(validStatuses.join(', ')));
        }
        // Validate error_message is present when status is 'failed'
        if (this.status === 'failed' && (!this.error_message || this.error_message.trim().length === 0)) {
            throw new Error('Error message is required when status is "failed"');
        }
        // Validate processed_at is present when status is 'completed' or 'failed'
        if ((this.status === 'completed' || this.status === 'failed') && !this.processed_at) {
            throw new Error('Processed timestamp is required when status is "completed" or "failed"');
        }
        // Validate URL format for url and youtube types
        if (this.content_type === 'url' || this.content_type === 'youtube') {
            try {
                var url = new URL(this.content_url);
                // Only allow http and https protocols
                if (!['http:', 'https:'].includes(url.protocol)) {
                    throw new Error("Invalid URL protocol: ".concat(url.protocol, ". Only HTTP and HTTPS are allowed"));
                }
            }
            catch (_a) {
                throw new Error("Invalid URL format: ".concat(this.content_url));
            }
        }
        // Validate YouTube URL format
        if (this.content_type === 'youtube') {
            var youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
            if (!youtubeRegex.test(this.content_url)) {
                throw new Error("Invalid YouTube URL format: ".concat(this.content_url));
            }
        }
    };
    /**
     * Update the status of the submission
     */
    ContentSubmission.prototype.updateStatus = function (newStatus, errorMessage) {
        // Validate status transition
        this.validateStatusTransition(newStatus);
        var updatedData = {
            id: this.id,
            content_url: this.content_url,
            content_type: this.content_type,
            user_note: this.user_note,
            status: newStatus,
            error_message: errorMessage || this.error_message,
            extracted_content: this.extracted_content,
            metadata: this.metadata,
            created_at: this.created_at,
            updated_at: new Date(),
            processed_at: newStatus === 'completed' || newStatus === 'failed' ? new Date() : this.processed_at,
            source: this.source,
            device_info: this.device_info
        };
        return new ContentSubmission(updatedData);
    };
    /**
     * Update the extracted content
     */
    ContentSubmission.prototype.updateExtractedContent = function (extractedContent) {
        var updatedData = {
            id: this.id,
            content_url: this.content_url,
            content_type: this.content_type,
            user_note: this.user_note,
            status: this.status,
            error_message: this.error_message,
            extracted_content: extractedContent,
            metadata: this.metadata,
            created_at: this.created_at,
            updated_at: new Date(),
            processed_at: this.processed_at,
            source: this.source,
            device_info: this.device_info
        };
        return new ContentSubmission(updatedData);
    };
    /**
     * Update the metadata
     */
    ContentSubmission.prototype.updateMetadata = function (metadata) {
        var updatedData = {
            id: this.id,
            content_url: this.content_url,
            content_type: this.content_type,
            user_note: this.user_note,
            status: this.status,
            error_message: this.error_message,
            extracted_content: this.extracted_content,
            metadata: __assign(__assign({}, this.metadata), metadata),
            created_at: this.created_at,
            updated_at: new Date(),
            processed_at: this.processed_at,
            source: this.source,
            device_info: this.device_info
        };
        return new ContentSubmission(updatedData);
    };
    ContentSubmission.prototype.validateStatusTransition = function (newStatus) {
        var validTransitions = {
            'pending': ['processing', 'failed'],
            'processing': ['completed', 'failed'],
            'completed': [], // No transitions from completed
            'failed': [] // No transitions from failed
        };
        var allowedTransitions = validTransitions[this.status];
        if (!allowedTransitions.includes(newStatus)) {
            throw new Error("Invalid status transition from ".concat(this.status, " to ").concat(newStatus));
        }
    };
    /**
     * Get the title from metadata or content URL
     */
    ContentSubmission.prototype.getTitle = function () {
        var _a;
        if ((_a = this.metadata) === null || _a === void 0 ? void 0 : _a.title) {
            return this.metadata.title;
        }
        if (this.content_type === 'youtube') {
            // Extract video title from YouTube URL (would need API call in real implementation)
            return 'YouTube Video';
        }
        if (this.content_type === 'pdf' || this.content_type === 'document') {
            // Extract filename from URL
            var urlParts = this.content_url.split('/');
            var filename = urlParts[urlParts.length - 1];
            return filename || 'Document';
        }
        // For URL content, use the domain or full URL
        try {
            var url = new URL(this.content_url);
            return url.hostname;
        }
        catch (_b) {
            return this.content_url;
        }
    };
    /**
     * Get the author from metadata
     */
    ContentSubmission.prototype.getAuthor = function () {
        var _a;
        return (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.author;
    };
    /**
     * Get the word count from metadata
     */
    ContentSubmission.prototype.getWordCount = function () {
        var _a;
        return (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.word_count;
    };
    /**
     * Get the reading time from metadata
     */
    ContentSubmission.prototype.getReadingTime = function () {
        var _a;
        return (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.reading_time;
    };
    /**
     * Check if the submission is in a terminal state
     */
    ContentSubmission.prototype.isTerminal = function () {
        return this.status === 'completed' || this.status === 'failed';
    };
    /**
     * Check if the submission is currently being processed
     */
    ContentSubmission.prototype.isProcessing = function () {
        return this.status === 'processing';
    };
    /**
     * Get the processing duration in milliseconds
     */
    ContentSubmission.prototype.getProcessingDuration = function () {
        if (!this.processed_at) {
            return undefined;
        }
        return this.processed_at.getTime() - this.created_at.getTime();
    };
    /**
     * Convert to plain object for database storage
     */
    ContentSubmission.prototype.toJSON = function () {
        return {
            id: this.id,
            content_url: this.content_url,
            content_type: this.content_type,
            user_note: this.user_note,
            status: this.status,
            error_message: this.error_message,
            extracted_content: this.extracted_content,
            metadata: this.metadata,
            created_at: this.created_at,
            updated_at: this.updated_at,
            processed_at: this.processed_at,
            source: this.source,
            device_info: this.device_info
        };
    };
    /**
     * Create from plain object (database retrieval)
     */
    ContentSubmission.fromJSON = function (data) {
        return new ContentSubmission(data);
    };
    return ContentSubmission;
}());
exports.ContentSubmission = ContentSubmission;
