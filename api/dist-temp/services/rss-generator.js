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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RssGenerator = void 0;
var logger_1 = require("../utils/logger");
var RssGenerator = /** @class */ (function () {
    function RssGenerator() {
        this.defaultMetadata = {
            title: 'AI Podcast Generator',
            description: 'AI-generated podcast episodes from web content, YouTube videos, and documents',
            link: 'https://podcast-generator.example.com',
            language: 'en-us',
            author: 'Podcast Generator',
            email: 'admin@podcast-generator.example.com',
            category: 'Technology',
            explicit: false,
            artwork_url: 'https://podcast-generator.example.com/artwork.png'
        };
    }
    /**
     * Generate RSS feed for episodes
     */
    RssGenerator.prototype.generateRss = function (episodes_1) {
        return __awaiter(this, arguments, void 0, function (episodes, metadata, options) {
            var mergedMetadata, mergedOptions, sortedEpisodes, limitedEpisodes, rssContent;
            if (metadata === void 0) { metadata = {}; }
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                try {
                    mergedMetadata = __assign(__assign({}, this.defaultMetadata), metadata);
                    mergedOptions = __assign({ include_chapters: true, include_transcript: false, max_episodes: 100, sort_order: 'newest' }, options);
                    logger_1.logger.info("Generating RSS feed for ".concat(episodes.length, " episodes"));
                    sortedEpisodes = this.sortEpisodes(episodes, mergedOptions.sort_order);
                    limitedEpisodes = mergedOptions.max_episodes
                        ? sortedEpisodes.slice(0, mergedOptions.max_episodes)
                        : sortedEpisodes;
                    rssContent = this.buildRSSXML(limitedEpisodes, mergedMetadata, mergedOptions);
                    logger_1.logger.info("RSS feed generated successfully with ".concat(limitedEpisodes.length, " episodes"));
                    return [2 /*return*/, rssContent];
                }
                catch (error) {
                    logger_1.logger.error('RSS generation failed:', error);
                    throw new Error("RSS generation failed: ".concat(error instanceof Error ? error.message : 'Unknown error'));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Generate RSS feed for single public feed
     */
    RssGenerator.prototype.generatePublicRss = function (episodes) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.generateRss(episodes, {
                        title: 'AI Podcast Generator',
                        description: 'AI-generated podcast episodes from web content, YouTube videos, and documents',
                        link: 'https://podcast-generator.example.com',
                        language: 'en-us',
                        author: 'Podcast Generator',
                        email: 'admin@podcast-generator.example.com',
                        category: 'Technology',
                        explicit: false
                    })];
            });
        });
    };
    /**
     * Build the complete RSS XML
     */
    RssGenerator.prototype.buildRSSXML = function (episodes, metadata, options) {
        var _this = this;
        var now = new Date();
        var lastBuildDate = now.toUTCString();
        var pubDate = episodes.length > 0 ? episodes[0].pub_date.toUTCString() : lastBuildDate;
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\" xmlns:itunes=\"http://www.itunes.com/dtds/podcast-1.0.dtd\" xmlns:content=\"http://purl.org/rss/1.0/modules/content/\">\n  <channel>\n    <title><![CDATA[".concat(this.escapeXml(metadata.title), "]]></title>\n    <description><![CDATA[").concat(this.escapeXml(metadata.description), "]]></description>\n    <link>").concat(this.escapeXml(metadata.link), "</link>\n    <language>").concat(metadata.language, "</language>\n    <copyright>Copyright ").concat(now.getFullYear(), " ").concat(metadata.author, "</copyright>\n    <lastBuildDate>").concat(lastBuildDate, "</lastBuildDate>\n    <pubDate>").concat(pubDate, "</pubDate>\n    <generator>Podcast Generator v1.0</generator>\n    <managingEditor>").concat(this.escapeXml(metadata.email), " (").concat(this.escapeXml(metadata.author), ")</managingEditor>\n    <webMaster>").concat(this.escapeXml(metadata.email), " (").concat(this.escapeXml(metadata.author), ")</webMaster>\n    \n    <!-- iTunes specific elements -->\n    <itunes:author>").concat(this.escapeXml(metadata.author), "</itunes:author>\n    <itunes:summary><![CDATA[").concat(this.escapeXml(metadata.description), "]]></itunes:summary>\n    <itunes:owner>\n      <itunes:name>").concat(this.escapeXml(metadata.author), "</itunes:name>\n      <itunes:email>").concat(this.escapeXml(metadata.email), "</itunes:email>\n    </itunes:owner>\n    <itunes:explicit>").concat(metadata.explicit ? 'yes' : 'no', "</itunes:explicit>\n    <itunes:category text=\"").concat(this.escapeXml(metadata.category), "\"/>\n    <itunes:type>episodic</itunes:type>\n    ").concat(metadata.artwork_url ? "<itunes:image href=\"".concat(this.escapeXml(metadata.artwork_url), "\"/>") : '', "\n    \n    <!-- Episodes -->\n    ").concat(episodes.map(function (episode) { return _this.generateEpisodeXML(episode, options); }).join('\n'), "\n  </channel>\n</rss>");
    };
    /**
     * Generate XML for a single episode
     */
    RssGenerator.prototype.generateEpisodeXML = function (episode, options) {
        var pubDate = episode.pub_date.toUTCString();
        var duration = episode.getFormattedDuration();
        var enclosureUrl = episode.getEnclosureUrl();
        var enclosureLength = episode.getEnclosureLength();
        var episodeXml = "    <item>\n      <title><![CDATA[".concat(this.escapeXml(episode.title), "]]></title>\n      <description><![CDATA[").concat(this.escapeXml(episode.description), "]]></description>\n      <link>").concat(this.escapeXml(episode.source_url), "</link>\n      <guid isPermaLink=\"false\">").concat(episode.getRssGuid(), "</guid>\n      <pubDate>").concat(pubDate, "</pubDate>");
        // Add enclosure if audio is available
        if (enclosureUrl && enclosureLength) {
            episodeXml += "\n      <enclosure url=\"".concat(this.escapeXml(enclosureUrl), "\" type=\"").concat(episode.getEnclosureType(), "\" length=\"").concat(enclosureLength, "\"/>");
        }
        // Add iTunes specific elements
        episodeXml += "\n      <itunes:title><![CDATA[".concat(this.escapeXml(episode.title), "]]></itunes:title>\n      <itunes:summary><![CDATA[").concat(this.escapeXml(episode.description), "]]></itunes:summary>\n      <itunes:duration>").concat(duration, "</itunes:duration>\n      <itunes:episodeType>full</itunes:episodeType>");
        // Add chapter markers if available and requested
        if (options.include_chapters && episode.hasChapterMarkers() && episode.chapter_markers) {
            episodeXml += "\n      <itunes:chapters>";
            for (var _i = 0, _a = episode.chapter_markers; _i < _a.length; _i++) {
                var chapter = _a[_i];
                episodeXml += "\n        <itunes:chapter start=\"".concat(chapter.start_time, "\" title=\"").concat(this.escapeXml(chapter.title), "\"/>");
            }
            episodeXml += "\n      </itunes:chapters>";
        }
        // Add transcript if available and requested
        if (options.include_transcript && episode.hasTranscript() && episode.transcript) {
            episodeXml += "\n      <content:encoded><![CDATA[".concat(this.escapeXml(episode.transcript), "]]></content:encoded>");
        }
        // Add summary if available
        if (episode.summary) {
            episodeXml += "\n      <itunes:subtitle><![CDATA[".concat(this.escapeXml(episode.summary), "]]></itunes:subtitle>");
        }
        episodeXml += "\n    </item>";
        return episodeXml;
    };
    /**
     * Sort episodes by publication date
     */
    RssGenerator.prototype.sortEpisodes = function (episodes, sortOrder) {
        return __spreadArray([], episodes, true).sort(function (a, b) {
            var dateA = a.pub_date.getTime();
            var dateB = b.pub_date.getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    };
    /**
     * Escape XML special characters
     */
    RssGenerator.prototype.escapeXml = function (text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
    /**
     * Validate RSS feed content
     */
    RssGenerator.prototype.validateRSS = function (rssContent) {
        var errors = [];
        // Check for required XML declaration
        if (!rssContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
            errors.push('Missing XML declaration');
        }
        // Check for RSS root element
        if (!rssContent.includes('<rss version="2.0"')) {
            errors.push('Missing or invalid RSS root element');
        }
        // Check for iTunes namespace
        if (!rssContent.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')) {
            errors.push('Missing iTunes namespace');
        }
        // Check for channel element
        if (!rssContent.includes('<channel>')) {
            errors.push('Missing channel element');
        }
        // Check for required channel elements
        var requiredElements = ['title', 'description', 'link', 'language'];
        for (var _i = 0, requiredElements_1 = requiredElements; _i < requiredElements_1.length; _i++) {
            var element = requiredElements_1[_i];
            if (!rssContent.includes("<".concat(element, ">"))) {
                errors.push("Missing required channel element: ".concat(element));
            }
        }
        // Check for iTunes required elements
        var itunesElements = ['itunes:author', 'itunes:summary', 'itunes:explicit'];
        for (var _a = 0, itunesElements_1 = itunesElements; _a < itunesElements_1.length; _a++) {
            var element = itunesElements_1[_a];
            if (!rssContent.includes("<".concat(element, ">"))) {
                errors.push("Missing required iTunes element: ".concat(element));
            }
        }
        // Check for episodes
        if (!rssContent.includes('<item>')) {
            errors.push('No episodes found in RSS feed');
        }
        return {
            valid: errors.length === 0,
            errors: errors
        };
    };
    /**
     * Get RSS feed statistics
     */
    RssGenerator.prototype.getFeedStats = function (episodes) {
        var totalEpisodes = episodes.length;
        var totalDurationSeconds = episodes.reduce(function (sum, episode) {
            return sum + (episode.audio_duration || 0);
        }, 0);
        var contentTypes = {};
        episodes.forEach(function (episode) {
            contentTypes[episode.content_type] = (contentTypes[episode.content_type] || 0) + 1;
        });
        var dates = episodes.map(function (episode) { return episode.pub_date; }).sort(function (a, b) { return a.getTime() - b.getTime(); });
        var dateRange = {
            oldest: dates.length > 0 ? dates[0] : null,
            newest: dates.length > 0 ? dates[dates.length - 1] : null
        };
        return {
            total_episodes: totalEpisodes,
            total_duration_seconds: totalDurationSeconds,
            total_duration_formatted: this.formatDuration(totalDurationSeconds),
            content_types: contentTypes,
            date_range: dateRange
        };
    };
    /**
     * Format duration in HH:MM:SS format
     */
    RssGenerator.prototype.formatDuration = function (seconds) {
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var secs = Math.floor(seconds % 60);
        if (hours > 0) {
            return "".concat(hours, ":").concat(minutes.toString().padStart(2, '0'), ":").concat(secs.toString().padStart(2, '0'));
        }
        else {
            return "".concat(minutes, ":").concat(secs.toString().padStart(2, '0'));
        }
    };
    /**
     * Generate RSS feed URL
     */
    RssGenerator.prototype.getRSSFeedUrl = function (baseUrl) {
        return "".concat(baseUrl, "/rss.xml");
    };
    /**
     * Generate episodes list URL
     */
    RssGenerator.prototype.getEpisodesUrl = function (baseUrl) {
        return "".concat(baseUrl, "/episodes");
    };
    /**
     * Check if RSS feed is valid
     */
    RssGenerator.prototype.validateFeed = function (episodes) {
        return __awaiter(this, void 0, void 0, function () {
            var warnings, episodesWithoutAudio, episodesWithoutDescription, longTitles, longDescriptions;
            return __generator(this, function (_a) {
                warnings = [];
                episodesWithoutAudio = episodes.filter(function (episode) { return !episode.hasAudio(); });
                if (episodesWithoutAudio.length > 0) {
                    warnings.push("".concat(episodesWithoutAudio.length, " episodes without audio"));
                }
                episodesWithoutDescription = episodes.filter(function (episode) {
                    return !episode.description || episode.description.trim().length === 0;
                });
                if (episodesWithoutDescription.length > 0) {
                    warnings.push("".concat(episodesWithoutDescription.length, " episodes without descriptions"));
                }
                longTitles = episodes.filter(function (episode) { return episode.title.length > 200; });
                if (longTitles.length > 0) {
                    warnings.push("".concat(longTitles.length, " episodes with very long titles (>200 chars)"));
                }
                longDescriptions = episodes.filter(function (episode) { return episode.description.length > 1000; });
                if (longDescriptions.length > 0) {
                    warnings.push("".concat(longDescriptions.length, " episodes with very long descriptions (>1000 chars)"));
                }
                return [2 /*return*/, {
                        valid: warnings.length === 0,
                        warnings: warnings
                    }];
            });
        });
    };
    return RssGenerator;
}());
exports.RssGenerator = RssGenerator;
