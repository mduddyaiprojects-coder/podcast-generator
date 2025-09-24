"use strict";
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
exports.rssFeedFunction = rssFeedFunction;
var database_service_1 = require("../services/database-service");
var rss_generator_1 = require("../services/rss-generator");
var logger_1 = require("../utils/logger");
/**
 * GET /api/feeds/{slug}/rss.xml
 *
 * Generates and returns the RSS feed for the podcast with caching and performance optimization.
 * Since we're using a single public feed, the slug parameter is ignored.
 */
function rssFeedFunction(request, _context) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, feedSlug, options, databaseService, episodes, rssGenerator, rssContent, rssResult, headers, error_1, responseTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    feedSlug = request.params['slug'];
                    // Validate feed slug format
                    if (!feedSlug || !isValidFeedSlug(feedSlug)) {
                        return [2 /*return*/, {
                                status: 400,
                                jsonBody: {
                                    error: 'INVALID_FEED_SLUG',
                                    message: 'Invalid feed slug format',
                                    details: 'feed_slug must contain only alphanumeric characters, hyphens, and underscores'
                                }
                            }];
                    }
                    logger_1.logger.info('RSS feed request received', { feedSlug: feedSlug });
                    options = parseRssOptions(request);
                    databaseService = new database_service_1.DatabaseService();
                    return [4 /*yield*/, databaseService.getEpisodes(options.maxEpisodes || 100, 0)];
                case 2:
                    episodes = _a.sent();
                    rssGenerator = new rss_generator_1.RssGenerator();
                    return [4 /*yield*/, rssGenerator.generateRss(episodes)];
                case 3:
                    rssContent = _a.sent();
                    rssResult = {
                        content: rssContent,
                        fromCache: false,
                        responseTime: Date.now() - startTime,
                        etag: "\"".concat(Date.now(), "\""),
                        lastModified: new Date()
                    };
                    headers = {
                        'Content-Type': 'application/rss+xml; charset=utf-8',
                        'Cache-Control': 'public, max-age=300, s-maxage=3600',
                        'ETag': rssResult.etag,
                        'Last-Modified': rssResult.lastModified.toUTCString(),
                        'X-Response-Time': "".concat(rssResult.responseTime, "ms")
                    };
                    logger_1.logger.info('RSS feed generated successfully', {
                        feedSlug: feedSlug,
                        episodeCount: episodes.length,
                        fromCache: rssResult.fromCache,
                        responseTime: rssResult.responseTime,
                        contentLength: rssResult.content.length
                    });
                    return [2 /*return*/, {
                            status: 200,
                            headers: headers,
                            body: rssResult.content
                        }];
                case 4:
                    error_1 = _a.sent();
                    responseTime = Date.now() - startTime;
                    logger_1.logger.error('RSS feed generation failed', {
                        error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                        responseTime: responseTime,
                        feedSlug: request.params['slug']
                    });
                    return [2 /*return*/, {
                            status: 500,
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Response-Time': "".concat(responseTime, "ms")
                            },
                            jsonBody: {
                                error: 'INTERNAL_ERROR',
                                message: 'Failed to generate RSS feed',
                                details: 'Please try again later'
                            }
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function isValidFeedSlug(slug) {
    // Allow alphanumeric characters, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(slug);
}
function parseRssOptions(request) {
    var query = request.query;
    return {
        includeChapters: query.get('chapters') === 'true',
        includeTranscript: query.get('transcript') === 'true',
        maxEpisodes: query.get('limit') ? parseInt(query.get('limit'), 10) : undefined,
        sortOrder: query.get('sort') === 'oldest' ? 'oldest' : 'newest',
        compression: query.get('compress') !== 'false'
    };
}
