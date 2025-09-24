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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RssCacheService = void 0;
var cdn_cache_management_1 = require("./cdn-cache-management");
var logger_1 = require("../utils/logger");
var rss_generator_1 = require("./rss-generator");
var RssCacheService = /** @class */ (function () {
    function RssCacheService() {
        this.cache = new Map();
        this.config = {
            defaultCacheDuration: 3600, // 1 hour
            maxCacheSize: 10 * 1024 * 1024, // 10MB
            enableCompression: true,
            enableCDN: process.env['ENABLE_CDN'] === 'true',
            cacheKeyPrefix: 'rss:',
            invalidationStrategy: 'immediate'
        };
        this.cdnCacheService = new cdn_cache_management_1.CdnCacheManagementService();
        this.rssGenerator = new rss_generator_1.RssGenerator();
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            averageResponseTime: 0,
            totalDataServed: 0,
            compressionRatio: 0,
            invalidationCount: 0,
            lastInvalidation: null
        };
        // Start cleanup interval
        this.startCleanupInterval();
    }
    /**
     * Get RSS feed with caching
     */
    RssCacheService.prototype.getRssFeed = function (episodes_1) {
        return __awaiter(this, arguments, void 0, function (episodes, feedSlug, options) {
            var startTime, cacheKey, etag, cached, rssContent, compressed, finalContent, _a, entry, responseTime;
            if (feedSlug === void 0) { feedSlug = 'default'; }
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        this.stats.totalRequests++;
                        cacheKey = this.generateCacheKey(feedSlug, options);
                        etag = this.generateEtag(episodes, options);
                        // Check cache first
                        if (!options.forceRefresh) {
                            cached = this.getCachedEntry(cacheKey, etag);
                            if (cached) {
                                this.stats.cacheHits++;
                                this.updateHitRate();
                                logger_1.logger.debug('RSS cache hit', {
                                    feedSlug: feedSlug,
                                    cacheKey: cacheKey,
                                    episodeCount: cached.episodeCount,
                                    age: Date.now() - cached.timestamp
                                });
                                return [2 /*return*/, {
                                        content: cached.content,
                                        fromCache: true,
                                        responseTime: Date.now() - startTime,
                                        etag: cached.etag,
                                        lastModified: cached.lastModified
                                    }];
                            }
                        }
                        // Cache miss - generate new RSS feed
                        this.stats.cacheMisses++;
                        this.updateHitRate();
                        logger_1.logger.debug('RSS cache miss', { feedSlug: feedSlug, cacheKey: cacheKey });
                        return [4 /*yield*/, this.generateRssContent(episodes, options)];
                    case 1:
                        rssContent = _b.sent();
                        compressed = this.config.enableCompression && options.compression !== false;
                        if (!compressed) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.compressContent(rssContent)];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = rssContent;
                        _b.label = 4;
                    case 4:
                        finalContent = _a;
                        entry = {
                            content: finalContent,
                            timestamp: Date.now(),
                            ttl: this.config.defaultCacheDuration,
                            size: Buffer.byteLength(finalContent, 'utf8'),
                            compressed: compressed,
                            episodeCount: episodes.length,
                            lastModified: new Date(),
                            etag: etag
                        };
                        // Store in cache
                        this.setCachedEntry(cacheKey, entry);
                        // Update stats
                        this.stats.totalDataServed += entry.size;
                        this.updateCompressionRatio();
                        responseTime = Date.now() - startTime;
                        this.updateAverageResponseTime(responseTime);
                        logger_1.logger.info('RSS feed generated and cached', {
                            feedSlug: feedSlug,
                            episodeCount: episodes.length,
                            size: entry.size,
                            compressed: entry.compressed,
                            responseTime: responseTime
                        });
                        return [2 /*return*/, {
                                content: finalContent,
                                fromCache: false,
                                responseTime: responseTime,
                                etag: entry.etag,
                                lastModified: entry.lastModified
                            }];
                }
            });
        });
    };
    /**
     * Invalidate RSS feed cache
     */
    RssCacheService.prototype.invalidateRssCache = function () {
        return __awaiter(this, arguments, void 0, function (feedSlug, reason) {
            var keysToInvalidate, _i, _a, key, cdnPaths, error_1;
            var _this = this;
            if (feedSlug === void 0) { feedSlug = 'default'; }
            if (reason === void 0) { reason = 'manual'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        keysToInvalidate = [];
                        // Find all cache keys for this feed
                        for (_i = 0, _a = this.cache.entries(); _i < _a.length; _i++) {
                            key = _a[_i][0];
                            if (key.startsWith("".concat(this.config.cacheKeyPrefix).concat(feedSlug, ":"))) {
                                keysToInvalidate.push(key);
                            }
                        }
                        // Remove from local cache
                        keysToInvalidate.forEach(function (key) { return _this.cache.delete(key); });
                        if (!this.config.enableCDN) return [3 /*break*/, 2];
                        cdnPaths = [
                            "/feeds/".concat(feedSlug, "/rss.xml"),
                            "/feeds/".concat(feedSlug, "/episodes")
                        ];
                        return [4 /*yield*/, this.cdnCacheService.invalidateCache({
                                contentPaths: cdnPaths,
                                domains: [],
                                reason: "RSS feed invalidation: ".concat(reason)
                            })];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        // Update stats
                        this.stats.invalidationCount++;
                        this.stats.lastInvalidation = new Date();
                        logger_1.logger.info('RSS cache invalidated', {
                            feedSlug: feedSlug,
                            invalidatedKeys: keysToInvalidate.length,
                            reason: reason
                        });
                        return [2 /*return*/, {
                                success: true,
                                invalidatedKeys: keysToInvalidate
                            }];
                    case 3:
                        error_1 = _b.sent();
                        logger_1.logger.error('Failed to invalidate RSS cache', { error: error_1, feedSlug: feedSlug, reason: reason });
                        return [2 /*return*/, {
                                success: false,
                                invalidatedKeys: [],
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Invalidate cache when episodes are added/updated
     */
    RssCacheService.prototype.invalidateOnEpisodeChange = function (episodeId, changeType) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        _a = this.config.invalidationStrategy;
                        switch (_a) {
                            case 'immediate': return [3 /*break*/, 1];
                            case 'scheduled': return [3 /*break*/, 3];
                            case 'lazy': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 6];
                    case 1: return [4 /*yield*/, this.invalidateRssCache('default', "episode ".concat(changeType, ": ").concat(episodeId))];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 3: 
                    // Schedule invalidation for next batch
                    return [4 /*yield*/, this.scheduleInvalidation("episode ".concat(changeType, ": ").concat(episodeId))];
                    case 4:
                        // Schedule invalidation for next batch
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        // Mark for lazy invalidation
                        this.markForLazyInvalidation();
                        return [3 /*break*/, 6];
                    case 6:
                        logger_1.logger.debug('Episode change invalidation triggered', {
                            episodeId: episodeId,
                            changeType: changeType,
                            strategy: this.config.invalidationStrategy
                        });
                        return [3 /*break*/, 8];
                    case 7:
                        error_2 = _b.sent();
                        logger_1.logger.error('Failed to trigger episode change invalidation', { error: error_2, episodeId: episodeId, changeType: changeType });
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get cache statistics
     */
    RssCacheService.prototype.getCacheStats = function () {
        return __assign({}, this.stats);
    };
    /**
     * Get cache health information
     */
    RssCacheService.prototype.getCacheHealth = function () {
        var issues = [];
        var recommendations = [];
        // Check memory usage
        var totalSize = Array.from(this.cache.values()).reduce(function (sum, entry) { return sum + entry.size; }, 0);
        var memoryUsage = (totalSize / this.config.maxCacheSize) * 100;
        if (memoryUsage > 90) {
            issues.push('Cache memory usage is very high');
            recommendations.push('Consider reducing cache duration or implementing LRU eviction');
        }
        // Check hit rate
        if (this.stats.hitRate < 0.5) {
            issues.push('Cache hit rate is low');
            recommendations.push('Review cache key generation and TTL settings');
        }
        // Check response time
        if (this.stats.averageResponseTime > 1000) {
            issues.push('Average response time is high');
            recommendations.push('Consider enabling compression or optimizing RSS generation');
        }
        // Check for stale entries
        var now = Date.now();
        var staleEntries = Array.from(this.cache.values()).filter(function (entry) { return (now - entry.timestamp) > entry.ttl * 1000; }).length;
        if (staleEntries > 0) {
            issues.push("".concat(staleEntries, " stale cache entries found"));
            recommendations.push('Run cache cleanup more frequently');
        }
        return {
            healthy: issues.length === 0,
            issues: issues,
            recommendations: recommendations,
            memoryUsage: memoryUsage,
            entryCount: this.cache.size
        };
    };
    /**
     * Clear all cache entries
     */
    RssCacheService.prototype.clearCache = function () {
        this.cache.clear();
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            averageResponseTime: 0,
            totalDataServed: 0,
            compressionRatio: 0,
            invalidationCount: 0,
            lastInvalidation: null
        };
        logger_1.logger.info('RSS cache cleared');
    };
    /**
     * Generate cache key
     */
    RssCacheService.prototype.generateCacheKey = function (feedSlug, options) {
        var optionsHash = this.hashOptions(options);
        return "".concat(this.config.cacheKeyPrefix).concat(feedSlug, ":").concat(optionsHash);
    };
    /**
     * Generate ETag for content
     */
    RssCacheService.prototype.generateEtag = function (episodes, options) {
        var episodeIds = episodes.map(function (ep) { return ep.id; }).sort().join(',');
        var optionsStr = JSON.stringify(options);
        var content = "".concat(episodeIds, ":").concat(optionsStr);
        // Simple hash function
        var hash = 0;
        for (var i = 0; i < content.length; i++) {
            var char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return "\"".concat(Math.abs(hash).toString(16), "\"");
    };
    /**
     * Get cached entry if valid
     */
    RssCacheService.prototype.getCachedEntry = function (cacheKey, etag) {
        var entry = this.cache.get(cacheKey);
        if (!entry)
            return null;
        var now = Date.now();
        var isExpired = (now - entry.timestamp) > entry.ttl * 1000;
        if (isExpired) {
            this.cache.delete(cacheKey);
            return null;
        }
        // Check ETag match
        if (entry.etag !== etag) {
            this.cache.delete(cacheKey);
            return null;
        }
        return entry;
    };
    /**
     * Set cached entry
     */
    RssCacheService.prototype.setCachedEntry = function (cacheKey, entry) {
        // Check memory limit
        if (entry.size > this.config.maxCacheSize) {
            logger_1.logger.warn('RSS entry too large for cache', { size: entry.size, maxSize: this.config.maxCacheSize });
            return;
        }
        this.cache.set(cacheKey, entry);
    };
    /**
     * Generate RSS content
     */
    RssCacheService.prototype.generateRssContent = function (episodes, options) {
        return __awaiter(this, void 0, void 0, function () {
            var rssOptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rssOptions = {
                            include_chapters: options.includeChapters,
                            include_transcript: options.includeTranscript,
                            max_episodes: options.maxEpisodes,
                            sort_order: options.sortOrder
                        };
                        return [4 /*yield*/, this.rssGenerator.generateRss(episodes, {}, rssOptions)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Compress content
     */
    RssCacheService.prototype.compressContent = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Simple compression simulation - in production, use actual compression
                return [2 /*return*/, content.replace(/\s+/g, ' ').trim()];
            });
        });
    };
    /**
     * Hash options for cache key
     */
    RssCacheService.prototype.hashOptions = function (options) {
        var sortedOptions = Object.keys(options)
            .sort()
            .reduce(function (result, key) {
            result[key] = options[key];
            return result;
        }, {});
        return Buffer.from(JSON.stringify(sortedOptions)).toString('base64').slice(0, 16);
    };
    /**
     * Update hit rate
     */
    RssCacheService.prototype.updateHitRate = function () {
        this.stats.hitRate = this.stats.totalRequests > 0
            ? this.stats.cacheHits / this.stats.totalRequests
            : 0;
    };
    /**
     * Update average response time
     */
    RssCacheService.prototype.updateAverageResponseTime = function (responseTime) {
        this.stats.averageResponseTime =
            (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / this.stats.totalRequests;
    };
    /**
     * Update compression ratio
     */
    RssCacheService.prototype.updateCompressionRatio = function () {
        var compressedEntries = Array.from(this.cache.values()).filter(function (entry) { return entry.compressed; });
        if (compressedEntries.length > 0) {
            var totalOriginalSize = compressedEntries.reduce(function (sum, entry) { return sum + entry.size; }, 0);
            var totalCompressedSize = compressedEntries.reduce(function (sum, entry) { return sum + entry.size; }, 0);
            this.stats.compressionRatio = totalCompressedSize / totalOriginalSize;
        }
    };
    /**
     * Schedule invalidation
     */
    RssCacheService.prototype.scheduleInvalidation = function (reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Implementation would depend on your scheduling system
                logger_1.logger.debug('Scheduled invalidation', { reason: reason });
                return [2 /*return*/];
            });
        });
    };
    /**
     * Mark for lazy invalidation
     */
    RssCacheService.prototype.markForLazyInvalidation = function () {
        // Implementation would mark entries for lazy invalidation
        logger_1.logger.debug('Marked for lazy invalidation');
    };
    /**
     * Start cleanup interval
     */
    RssCacheService.prototype.startCleanupInterval = function () {
        var _this = this;
        this.cleanupIntervalId = setInterval(function () {
            _this.cleanupExpiredEntries();
        }, 5 * 60 * 1000); // Every 5 minutes
        // Unref to prevent Jest from hanging
        if (this.cleanupIntervalId) {
            this.cleanupIntervalId.unref();
        }
    };
    /**
     * Clean up timers and resources
     */
    RssCacheService.prototype.cleanup = function () {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
    };
    /**
     * Clean up expired entries
     */
    RssCacheService.prototype.cleanupExpiredEntries = function () {
        var now = Date.now();
        var cleanedCount = 0;
        for (var _i = 0, _a = this.cache.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], entry = _b[1];
            if ((now - entry.timestamp) > entry.ttl * 1000) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.debug('Cleaned up expired cache entries', { count: cleanedCount });
        }
    };
    return RssCacheService;
}());
exports.RssCacheService = RssCacheService;
