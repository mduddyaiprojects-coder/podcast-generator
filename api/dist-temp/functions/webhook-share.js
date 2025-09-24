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
exports.webhookShareFunction = webhookShareFunction;
var error_handler_1 = require("../utils/error-handler");
var database_service_1 = require("../services/database-service");
var content_submission_1 = require("../models/content-submission");
/**
 * POST /api/webhook/share
 *
 * Webhook endpoint for iOS Shortcuts and other integrations
 * Accepts shared content and processes it into the podcast feed
 *
 * Expected payload from iOS Shortcuts:
 * {
 *   "url": "https://example.com/article",
 *   "title": "Article Title",
 *   "content": "Article content or description",
 *   "type": "webpage" // optional, will be auto-detected
 * }
 */
function webhookShareFunction(request, context) {
    return __awaiter(this, void 0, void 0, function () {
        var body, url, title, type, cleanUrl, urlMatches, doubleUrlMatch, parsedUrl, contentType, submission, db, submissionId, estimatedCompletion, rssFeedUrl, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    context.log('Webhook share request received');
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    url = body.url, title = body.title, type = body.type;
                    // Validate required fields
                    if (!url) {
                        return [2 /*return*/, {
                                status: 400,
                                jsonBody: {
                                    error: 'MISSING_URL',
                                    message: 'URL is required',
                                    details: 'The "url" field must be provided'
                                }
                            }];
                    }
                    cleanUrl = url.trim();
                    // Basic URL cleaning - remove common artifacts
                    cleanUrl = cleanUrl.replace(/SpeckitSpeckit/g, '');
                    cleanUrl = cleanUrl.replace(/Speckit/g, '');
                    urlMatches = cleanUrl.match(/https?:\/\/[^\s]+/g);
                    if (urlMatches && urlMatches.length > 0) {
                        // Take the first complete URL
                        cleanUrl = urlMatches[0];
                    }
                    doubleUrlMatch = cleanUrl.match(/https?:\/\/[^h]*https?:\/\/(.+)/);
                    if (doubleUrlMatch) {
                        cleanUrl = 'https://' + doubleUrlMatch[1];
                    }
                    // Validate URL format
                    try {
                        parsedUrl = new URL(cleanUrl);
                        // Additional validation - must have proper protocol and hostname
                        if (!parsedUrl.protocol.startsWith('http') || !parsedUrl.hostname.includes('.')) {
                            throw new Error('Invalid URL format');
                        }
                        url = cleanUrl; // Use the cleaned URL
                    }
                    catch (urlError) {
                        context.log('URL validation error:', urlError);
                        return [2 /*return*/, {
                                status: 400,
                                jsonBody: {
                                    error: 'INVALID_URL',
                                    message: 'Invalid URL format',
                                    details: 'The provided URL is not valid or could not be cleaned',
                                    original_url: url,
                                    cleaned_url: cleanUrl
                                }
                            }];
                    }
                    contentType = type || 'url';
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        contentType = 'youtube';
                    }
                    else if (url.includes('twitter.com') || url.includes('x.com')) {
                        contentType = 'twitter';
                    }
                    else if (url.includes('reddit.com')) {
                        contentType = 'reddit';
                    }
                    submission = new content_submission_1.ContentSubmission({
                        content_url: url,
                        content_type: contentType,
                        user_note: title ? "Shared: ".concat(title) : undefined,
                        status: 'pending'
                    });
                    db = new database_service_1.DatabaseService();
                    return [4 /*yield*/, db.connect()];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, , 5, 7]);
                    return [4 /*yield*/, db.saveSubmission(submission)];
                case 4:
                    submissionId = _a.sent();
                    estimatedCompletion = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                    rssFeedUrl = "https://podcast-gen-api.azurewebsites.net/api/feeds/".concat(submissionId, "/rss.xml");
                    context.log('Webhook processed successfully:', {
                        submissionId: submissionId,
                        url: url,
                        contentType: contentType,
                        title: title
                    });
                    // Return success response optimized for iOS Shortcuts
                    return [2 /*return*/, {
                            status: 200,
                            jsonBody: {
                                success: true,
                                submission_id: submissionId,
                                message: 'Content added to your podcast feed successfully!',
                                rss_feed_url: rssFeedUrl,
                                estimated_completion: estimatedCompletion,
                                content_type: contentType,
                                title: title || 'Shared Content'
                            }
                        }];
                case 5: return [4 /*yield*/, db.disconnect()];
                case 6:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    context.log('Webhook share error:', error_1);
                    return [2 /*return*/, error_handler_1.ErrorHandler.handleError(error_1, request, context, {
                            includeStack: false,
                            logErrors: true,
                            sanitizeErrors: true
                        })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Function is exported above in the function declaration
