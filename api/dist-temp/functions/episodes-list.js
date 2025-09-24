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
exports.episodesListFunction = episodesListFunction;
/**
 * GET /api/feeds/{slug}/episodes
 *
 * Returns a paginated list of episodes in the podcast feed.
 * Since we're using a single public feed, the slug parameter is ignored.
 */
function episodesListFunction(request, context) {
    return __awaiter(this, void 0, void 0, function () {
        var feedSlug, limit, offset, episodes;
        return __generator(this, function (_a) {
            try {
                feedSlug = request.params['slug'];
                limit = parseInt(request.query.get('limit') || '50');
                offset = parseInt(request.query.get('offset') || '0');
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
                // Validate query parameters
                if (limit < 1 || limit > 100) {
                    return [2 /*return*/, {
                            status: 400,
                            jsonBody: {
                                error: 'INVALID_LIMIT',
                                message: 'Invalid limit parameter',
                                details: 'limit must be between 1 and 100'
                            }
                        }];
                }
                if (offset < 0) {
                    return [2 /*return*/, {
                            status: 400,
                            jsonBody: {
                                error: 'INVALID_OFFSET',
                                message: 'Invalid offset parameter',
                                details: 'offset must be 0 or greater'
                            }
                        }];
                }
                context.log('Episodes list request received for slug:', feedSlug, 'limit:', limit, 'offset:', offset);
                episodes = generateSampleEpisodes(limit, offset);
                return [2 /*return*/, {
                        status: 200,
                        jsonBody: {
                            episodes: episodes,
                            pagination: {
                                limit: limit,
                                offset: offset,
                                total: 1, // Sample total
                                hasMore: false
                            },
                            feed: {
                                slug: feedSlug,
                                title: 'Podcast Generator',
                                description: 'AI-generated podcast episodes'
                            }
                        }
                    }];
            }
            catch (error) {
                context.log('Episodes list error:', error);
                return [2 /*return*/, {
                        status: 500,
                        jsonBody: {
                            error: 'INTERNAL_ERROR',
                            message: 'Failed to retrieve episodes',
                            details: 'Please try again later'
                        }
                    }];
            }
            return [2 /*return*/];
        });
    });
}
function isValidFeedSlug(slug) {
    // Allow alphanumeric characters, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(slug);
}
function generateSampleEpisodes(limit, offset) {
    // Generate sample episodes for testing
    var episodes = [];
    var now = new Date();
    for (var i = 0; i < Math.min(limit, 3); i++) {
        var episodeDate = new Date(now.getTime() - (i + offset) * 24 * 60 * 60 * 1000);
        episodes.push({
            id: "episode-".concat(i + offset + 1),
            title: "Sample Episode ".concat(i + offset + 1),
            description: "This is a sample episode ".concat(i + offset + 1, " for testing purposes."),
            audioUrl: "https://podcast-generator.example.com/audio/episode-".concat(i + offset + 1, ".mp3"),
            duration: '00:05:00',
            publishedAt: episodeDate.toISOString(),
            slug: "sample-episode-".concat(i + offset + 1)
        });
    }
    return episodes;
}
