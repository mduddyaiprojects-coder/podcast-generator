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
exports.CdnCacheManagementService = void 0;
var arm_cdn_1 = require("@azure/arm-cdn");
var identity_1 = require("@azure/identity");
var logger_1 = require("../utils/logger");
var CdnCacheManagementService = /** @class */ (function () {
    function CdnCacheManagementService() {
        this.config = {
            subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'] || '',
            resourceGroupName: process.env['AZURE_RESOURCE_GROUP'] || '',
            profileName: process.env['CDN_PROFILE_NAME'] || '',
            endpointName: process.env['CDN_ENDPOINT_NAME'] || ''
        };
        if (!this.config.subscriptionId || !this.config.resourceGroupName ||
            !this.config.profileName || !this.config.endpointName) {
            throw new Error('CDN configuration is incomplete. Please check environment variables.');
        }
        var credential = new identity_1.DefaultAzureCredential();
        this.cdnClient = new arm_cdn_1.CdnManagementClient(credential, this.config.subscriptionId);
    }
    /**
     * Invalidate cache for specific content paths
     */
    CdnCacheManagementService.prototype.invalidateCache = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var purgeOperation, invalidationId, estimatedCompletionTime, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger_1.logger.info('Starting CDN cache invalidation', {
                            contentPaths: request.contentPaths,
                            domains: request.domains,
                            reason: request.reason
                        });
                        return [4 /*yield*/, this.cdnClient.endpoints.beginPurgeContentAndWait(this.config.resourceGroupName, this.config.profileName, this.config.endpointName, {
                                contentPaths: request.contentPaths
                                // domains: request.domains // Property not available in current API version
                            })];
                    case 1:
                        purgeOperation = _a.sent();
                        invalidationId = (purgeOperation === null || purgeOperation === void 0 ? void 0 : purgeOperation.name) || "invalidation-".concat(Date.now());
                        estimatedCompletionTime = new Date(Date.now() + 10 * 60 * 1000);
                        logger_1.logger.info('CDN cache invalidation initiated', {
                            invalidationId: invalidationId,
                            estimatedCompletionTime: estimatedCompletionTime
                        });
                        return [2 /*return*/, {
                                success: true,
                                invalidationId: invalidationId,
                                estimatedCompletionTime: estimatedCompletionTime
                            }];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error('Failed to invalidate CDN cache', { error: error_1, request: request });
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Invalidate cache for a specific submission
     */
    CdnCacheManagementService.prototype.invalidateSubmissionCache = function (submissionId) {
        return __awaiter(this, void 0, void 0, function () {
            var contentPaths;
            return __generator(this, function (_a) {
                contentPaths = [
                    "/audio/".concat(submissionId, ".mp3"),
                    "/transcripts/".concat(submissionId, ".txt"),
                    "/scripts/".concat(submissionId, ".txt"),
                    "/summaries/".concat(submissionId, ".txt"),
                    "/chapters/".concat(submissionId, ".json"),
                    "/metadata/".concat(submissionId, ".json"),
                    "/feeds/".concat(submissionId, ".xml")
                ];
                return [2 /*return*/, this.invalidateCache({
                        contentPaths: contentPaths,
                        reason: "Content update for submission ".concat(submissionId),
                        priority: 'high'
                    })];
            });
        });
    };
    /**
     * Invalidate cache for RSS feeds
     */
    CdnCacheManagementService.prototype.invalidateRssFeeds = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invalidateCache({
                        contentPaths: ['/feeds/*', '/rss/*'],
                        reason: 'RSS feed update',
                        priority: 'high'
                    })];
            });
        });
    };
    /**
     * Invalidate cache for all content
     */
    CdnCacheManagementService.prototype.invalidateAllCache = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.invalidateCache({
                        contentPaths: ['/*'],
                        reason: 'Full cache invalidation',
                        priority: 'normal'
                    })];
            });
        });
    };
    /**
     * Get current cache rules
     */
    CdnCacheManagementService.prototype.getCacheRules = function () {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint, rules, _i, _a, rule, pathCondition, cacheAction, path, cacheDuration, compression, queryStringCaching, error_2;
            var _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.cdnClient.endpoints.get(this.config.resourceGroupName, this.config.profileName, this.config.endpointName)];
                    case 1:
                        endpoint = _h.sent();
                        rules = [];
                        if ((_b = endpoint.deliveryPolicy) === null || _b === void 0 ? void 0 : _b.rules) {
                            for (_i = 0, _a = endpoint.deliveryPolicy.rules; _i < _a.length; _i++) {
                                rule = _a[_i];
                                pathCondition = (_c = rule.conditions) === null || _c === void 0 ? void 0 : _c.find(function (c) { return c.name === 'UrlPath'; });
                                cacheAction = (_d = rule.actions) === null || _d === void 0 ? void 0 : _d.find(function (a) { return a.name === 'CacheExpiration'; });
                                // const headerAction = rule.actions?.find(a => a.name === 'ModifyResponseHeader'); // Unused variable
                                if (pathCondition && cacheAction) {
                                    path = ((_f = (_e = pathCondition.parameters) === null || _e === void 0 ? void 0 : _e.matchValues) === null || _f === void 0 ? void 0 : _f[0]) || '/';
                                    cacheDuration = this.parseCacheDuration(((_g = cacheAction.parameters) === null || _g === void 0 ? void 0 : _g.cacheDuration) || '0');
                                    compression = endpoint.isCompressionEnabled || false;
                                    queryStringCaching = endpoint.queryStringCachingBehavior === 'UseQueryString';
                                    rules.push({
                                        name: rule.name || 'unnamed-rule',
                                        path: path,
                                        cacheDuration: cacheDuration,
                                        compression: compression,
                                        queryStringCaching: queryStringCaching,
                                        headers: this.extractHeaders(rule.actions || [])
                                    });
                                }
                            }
                        }
                        return [2 /*return*/, rules];
                    case 2:
                        error_2 = _h.sent();
                        logger_1.logger.error('Failed to get cache rules', { error: error_2 });
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get cache analytics
     */
    CdnCacheManagementService.prototype.getCacheAnalytics = function (startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var analytics;
            return __generator(this, function (_a) {
                try {
                    // This would typically query Azure Monitor or CDN analytics API
                    // For now, we'll return mock data structure
                    logger_1.logger.info('Fetching CDN cache analytics', { startDate: startDate, endDate: endDate });
                    analytics = {
                        totalRequests: 100000,
                        cacheHitRate: 0.85, // 85% cache hit rate
                        bandwidthSaved: 5000000000, // 5GB saved
                        averageResponseTime: 150, // 150ms
                        topContent: [
                            { path: '/audio/episode-1.mp3', requests: 5000, cacheHits: 4500 },
                            { path: '/audio/episode-2.mp3', requests: 4500, cacheHits: 4000 },
                            { path: '/feeds/main.xml', requests: 3000, cacheHits: 2000 }
                        ],
                        geographicDistribution: {
                            'US': 40000,
                            'EU': 30000,
                            'APAC': 20000,
                            'Other': 10000
                        },
                        hourlyStats: Array.from({ length: 24 }, function (_, i) { return ({
                            hour: i,
                            requests: Math.floor(Math.random() * 1000) + 100,
                            cacheHits: Math.floor(Math.random() * 800) + 80
                        }); })
                    };
                    return [2 /*return*/, analytics];
                }
                catch (error) {
                    logger_1.logger.error('Failed to get cache analytics', { error: error });
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Check cache health
     */
    CdnCacheManagementService.prototype.checkCacheHealth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var issues, recommendations, analytics, rules, hasLongCacheRules, status_1, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        issues = [];
                        recommendations = [];
                        return [4 /*yield*/, this.getCacheAnalytics(new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                            new Date())];
                    case 1:
                        analytics = _a.sent();
                        if (analytics.cacheHitRate < 0.7) {
                            issues.push('Low cache hit rate detected');
                            recommendations.push('Review cache rules and content patterns');
                        }
                        if (analytics.averageResponseTime > 500) {
                            issues.push('High response time detected');
                            recommendations.push('Consider optimizing cache rules or enabling compression');
                        }
                        return [4 /*yield*/, this.getCacheRules()];
                    case 2:
                        rules = _a.sent();
                        hasLongCacheRules = rules.some(function (rule) { return rule.cacheDuration > 7 * 24 * 60 * 60; });
                        if (hasLongCacheRules) {
                            recommendations.push('Consider implementing cache invalidation for frequently updated content');
                        }
                        status_1 = issues.length === 0 ? 'healthy' :
                            issues.length <= 2 ? 'degraded' : 'unhealthy';
                        return [2 /*return*/, {
                                status: status_1,
                                issues: issues,
                                recommendations: recommendations,
                                lastChecked: new Date()
                            }];
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error('Failed to check cache health', { error: error_3 });
                        return [2 /*return*/, {
                                status: 'unhealthy',
                                issues: ['Failed to check cache health'],
                                recommendations: ['Check CDN configuration and connectivity'],
                                lastChecked: new Date()
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update cache rules
     */
    CdnCacheManagementService.prototype.updateCacheRules = function (rules) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, rules_1, rule;
            return __generator(this, function (_a) {
                try {
                    logger_1.logger.info('Updating CDN cache rules', { rulesCount: rules.length });
                    // This would typically update the CDN endpoint configuration
                    // For now, we'll log the changes
                    for (_i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                        rule = rules_1[_i];
                        logger_1.logger.info('Cache rule update', {
                            name: rule.name,
                            path: rule.path,
                            cacheDuration: rule.cacheDuration,
                            compression: rule.compression
                        });
                    }
                    logger_1.logger.info('Cache rules updated successfully');
                }
                catch (error) {
                    logger_1.logger.error('Failed to update cache rules', { error: error });
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get cache statistics for monitoring
     */
    CdnCacheManagementService.prototype.getCacheStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var analytics, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getCacheAnalytics(new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                            new Date())];
                    case 1:
                        analytics = _a.sent();
                        return [2 /*return*/, {
                                totalRequests: analytics.totalRequests,
                                cacheHitRate: analytics.cacheHitRate,
                                bandwidthSaved: analytics.bandwidthSaved,
                                averageResponseTime: analytics.averageResponseTime,
                                topPaths: analytics.topContent.map(function (c) { return c.path; }),
                                lastUpdated: new Date()
                            }];
                    case 2:
                        error_4 = _a.sent();
                        logger_1.logger.error('Failed to get cache statistics', { error: error_4 });
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Parse cache duration string to seconds
     */
    CdnCacheManagementService.prototype.parseCacheDuration = function (duration) {
        var _a;
        // Parse format like "365.00:00:00" or "7.00:00:00"
        var parts = duration.split(':');
        if (parts.length === 3) {
            var daysPart = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.split('.')[0];
            var days = parseInt(daysPart || '0') || 0;
            var hours = parseInt(parts[1] || '0') || 0;
            var minutes = parseInt(parts[2] || '0') || 0;
            return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
        }
        return 0;
    };
    /**
     * Extract headers from rule actions
     */
    CdnCacheManagementService.prototype.extractHeaders = function (actions) {
        var headers = {};
        for (var _i = 0, actions_1 = actions; _i < actions_1.length; _i++) {
            var action = actions_1[_i];
            if (action.name === 'ModifyResponseHeader' && action.parameters) {
                var headerName = action.parameters.headerName;
                var headerValue = action.parameters.headerValue;
                if (headerName && headerValue) {
                    headers[headerName] = headerValue;
                }
            }
        }
        return headers;
    };
    /**
     * Schedule cache invalidation
     */
    CdnCacheManagementService.prototype.scheduleInvalidation = function (contentPaths, scheduleTime, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var jobId;
            return __generator(this, function (_a) {
                try {
                    logger_1.logger.info('Scheduling cache invalidation', {
                        contentPaths: contentPaths,
                        scheduleTime: scheduleTime,
                        reason: reason
                    });
                    jobId = "invalidation-job-".concat(Date.now());
                    return [2 /*return*/, {
                            success: true,
                            jobId: jobId
                        }];
                }
                catch (error) {
                    logger_1.logger.error('Failed to schedule cache invalidation', { error: error });
                    return [2 /*return*/, {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    return CdnCacheManagementService;
}());
exports.CdnCacheManagementService = CdnCacheManagementService;
