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
exports.DatabaseService = void 0;
var content_submission_1 = require("../models/content-submission");
var podcast_episode_1 = require("../models/podcast-episode");
var logger_1 = require("../utils/logger");
var pg_1 = require("pg");
var DatabaseService = /** @class */ (function () {
    function DatabaseService() {
        // Use DATABASE_URL if available, otherwise fall back to individual variables
        var databaseUrl = process.env['DATABASE_URL'];
        var poolConfig = {
            // Connection pool settings optimized for Azure Functions
            max: 10, // Maximum number of clients in the pool
            min: 2, // Minimum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
            acquireTimeoutMillis: 10000, // Return an error after 10 seconds if a client could not be acquired
        };
        if (databaseUrl) {
            this.pool = new pg_1.Pool(__assign({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } }, poolConfig));
        }
        else {
            // Fallback to individual environment variables
            this.pool = new pg_1.Pool(__assign({ host: process.env['DATABASE_HOST'] || 'localhost', port: parseInt(process.env['DATABASE_PORT'] || '5432'), database: process.env['DATABASE_NAME'] || 'podcast_generator_dev', user: process.env['DATABASE_USER'] || 'postgres', password: process.env['DATABASE_PASSWORD'] || 'password', ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false }, poolConfig));
        }
        // Handle pool errors
        this.pool.on('error', function (err) {
            logger_1.logger.error('Unexpected error on idle client', err);
        });
    }
    DatabaseService.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _a.sent();
                        return [4 /*yield*/, client.query('SELECT 1')];
                    case 2:
                        _a.sent();
                        client.release();
                        logger_1.logger.info('Database pool connected successfully');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error('Database pool connection failed:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.end()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Helper method to execute queries with proper connection management
    DatabaseService.prototype.executeQuery = function (queryFn) {
        return __awaiter(this, void 0, void 0, function () {
            var client;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        client = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 4, 5]);
                        return [4 /*yield*/, queryFn(client)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        client.release();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.saveSubmission = function (submission) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var query, values, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    query = "\n        INSERT INTO content_submissions (\n          id, content_url, content_type, user_note, status, created_at, updated_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7)\n        RETURNING id\n      ";
                                    values = [
                                        submission.id,
                                        submission.content_url,
                                        submission.content_type,
                                        submission.user_note,
                                        submission.status,
                                        submission.created_at,
                                        submission.updated_at
                                    ];
                                    return [4 /*yield*/, client.query(query, values)];
                                case 1:
                                    result = _a.sent();
                                    logger_1.logger.info('Submission saved to database:', submission.id);
                                    return [2 /*return*/, result.rows[0].id];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseService.prototype.saveEpisode = function (episode) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var query, values;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    query = "\n        INSERT INTO podcast_episodes (\n          id, submission_id, title, description, source_url, content_type,\n          audio_url, audio_duration, audio_size, transcript, dialogue_script,\n          summary, chapter_markers, pub_date, created_at, updated_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)\n      ";
                                    values = [
                                        episode.id,
                                        episode.submission_id,
                                        episode.title,
                                        episode.description,
                                        episode.source_url,
                                        episode.content_type,
                                        episode.audio_url,
                                        episode.audio_duration,
                                        episode.audio_size,
                                        episode.transcript,
                                        episode.dialogue_script,
                                        episode.summary,
                                        episode.chapter_markers ? JSON.stringify(episode.chapter_markers) : null,
                                        episode.pub_date,
                                        episode.created_at,
                                        episode.updated_at
                                    ];
                                    return [4 /*yield*/, client.query(query, values)];
                                case 1:
                                    _a.sent();
                                    logger_1.logger.info('Episode saved to database:', episode.id);
                                    return [2 /*return*/, episode];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseService.prototype.getEpisodes = function (limit, offset) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var query, values, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    query = "\n        SELECT id, submission_id, title, description, source_url, content_type,\n               audio_url, audio_duration, audio_size, transcript, dialogue_script,\n               summary, chapter_markers, pub_date, created_at, updated_at\n        FROM podcast_episodes\n        ORDER BY pub_date DESC\n      ";
                                    values = [];
                                    if (limit) {
                                        query += " LIMIT $".concat(values.length + 1);
                                        values.push(limit);
                                    }
                                    if (offset) {
                                        query += " OFFSET $".concat(values.length + 1);
                                        values.push(offset);
                                    }
                                    return [4 /*yield*/, client.query(query, values)];
                                case 1:
                                    result = _a.sent();
                                    return [2 /*return*/, result.rows.map(function (row) { return new podcast_episode_1.PodcastEpisode({
                                            id: row.id,
                                            submission_id: row.submission_id,
                                            title: row.title,
                                            description: row.description,
                                            source_url: row.source_url,
                                            content_type: row.content_type,
                                            audio_url: row.audio_url,
                                            audio_duration: row.audio_duration,
                                            audio_size: row.audio_size,
                                            transcript: row.transcript,
                                            dialogue_script: row.dialogue_script,
                                            summary: row.summary,
                                            chapter_markers: row.chapter_markers,
                                            pub_date: row.pub_date,
                                            created_at: row.created_at,
                                            updated_at: row.updated_at
                                        }); })];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseService.prototype.getEpisodeCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var query, result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    query = 'SELECT COUNT(*) as count FROM podcast_episodes';
                                    return [4 /*yield*/, client.query(query)];
                                case 1:
                                    result = _a.sent();
                                    return [2 /*return*/, parseInt(result.rows[0].count)];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseService.prototype.checkConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, client.query('SELECT 1')];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, true];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error('Database connection check failed:', error_2);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Content Submission methods
    DatabaseService.prototype.getSubmission = function (submissionId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result, row;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = 'SELECT * FROM content_submissions WHERE id = $1';
                                            return [4 /*yield*/, client.query(query, [submissionId])];
                                        case 1:
                                            result = _a.sent();
                                            if (result.rows.length === 0) {
                                                return [2 /*return*/, null];
                                            }
                                            row = result.rows[0];
                                            return [2 /*return*/, new content_submission_1.ContentSubmission({
                                                    id: row.id,
                                                    content_url: row.content_url,
                                                    content_type: row.content_type,
                                                    user_note: row.user_note,
                                                    status: row.status,
                                                    created_at: row.created_at,
                                                    updated_at: row.updated_at,
                                                    processed_at: row.processed_at
                                                })];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error('Failed to get submission:', error_3);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.updateSubmissionStatus = function (submissionId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var query;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    query = 'UPDATE content_submissions SET status = $1, updated_at = NOW() WHERE id = $2';
                                    return [4 /*yield*/, client.query(query, [status, submissionId])];
                                case 1:
                                    _a.sent();
                                    logger_1.logger.info("Updated submission ".concat(submissionId, " status to ").concat(status));
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    // Processing Job methods
    DatabaseService.prototype.saveProcessingJob = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                        var query;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    query = "\n        INSERT INTO processing_jobs (\n          id, submission_id, status, progress, current_step, \n          error_message, retry_count, max_retries, created_at, updated_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\n        ON CONFLICT (id) DO UPDATE SET\n          status = EXCLUDED.status,\n          progress = EXCLUDED.progress,\n          current_step = EXCLUDED.current_step,\n          error_message = EXCLUDED.error_message,\n          retry_count = EXCLUDED.retry_count,\n          updated_at = EXCLUDED.updated_at\n      ";
                                    return [4 /*yield*/, client.query(query, [
                                            job.id,
                                            job.submission_id,
                                            job.status,
                                            job.progress,
                                            job.current_step,
                                            job.error_message,
                                            job.retry_count,
                                            job.max_retries,
                                            job.created_at,
                                            job.updated_at
                                        ])];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DatabaseService.prototype.getProcessingJob = function (jobId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_4;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = 'SELECT * FROM processing_jobs WHERE id = $1';
                                            return [4 /*yield*/, client.query(query, [jobId])];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows.length > 0 ? result.rows[0] : null];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_4 = _a.sent();
                        logger_1.logger.error('Failed to get processing job:', error_4);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.getProcessingJobBySubmissionId = function (submissionId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = 'SELECT * FROM processing_jobs WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1';
                                            return [4 /*yield*/, client.query(query, [submissionId])];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows.length > 0 ? result.rows[0] : null];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_5 = _a.sent();
                        logger_1.logger.error('Failed to get processing job by submission ID:', error_5);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.getProcessingJobsBySubmissionId = function (submissionId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = 'SELECT * FROM processing_jobs WHERE submission_id = $1 ORDER BY created_at DESC';
                                            return [4 /*yield*/, client.query(query, [submissionId])];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_6 = _a.sent();
                        logger_1.logger.error('Failed to get processing jobs by submission ID:', error_6);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.getProcessingJobsByStatus = function (status) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = 'SELECT * FROM processing_jobs WHERE status = $1 ORDER BY created_at DESC';
                                            return [4 /*yield*/, client.query(query, [status])];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_7 = _a.sent();
                        logger_1.logger.error('Failed to get processing jobs by status:', error_7);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.getStaleProcessingJobs = function (olderThanHours) {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = "\n          SELECT * FROM processing_jobs \n          WHERE status IN ('queued', 'running') \n          AND created_at < NOW() - INTERVAL '".concat(olderThanHours, " hours'\n          ORDER BY created_at ASC\n        ");
                                            return [4 /*yield*/, client.query(query)];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_8 = _a.sent();
                        logger_1.logger.error('Failed to get stale processing jobs:', error_8);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.cleanupOldProcessingJobs = function (olderThanDays) {
        return __awaiter(this, void 0, void 0, function () {
            var error_9;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = "\n          DELETE FROM processing_jobs \n          WHERE status IN ('completed', 'failed') \n          AND updated_at < NOW() - INTERVAL '".concat(olderThanDays, " days'\n        ");
                                            return [4 /*yield*/, client.query(query)];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rowCount || 0];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_9 = _a.sent();
                        logger_1.logger.error('Failed to cleanup old processing jobs:', error_9);
                        return [2 /*return*/, 0];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseService.prototype.getProcessingJobStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_10;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = "\n          SELECT \n            COUNT(*) as total,\n            COUNT(CASE WHEN status = 'queued' THEN 1 END) as pending,\n            COUNT(CASE WHEN status = 'running' THEN 1 END) as running,\n            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,\n            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed\n          FROM processing_jobs\n        ";
                                            return [4 /*yield*/, client.query(query)];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows[0]];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_10 = _a.sent();
                        logger_1.logger.error('Failed to get processing job statistics:', error_10);
                        return [2 /*return*/, { total: 0, pending: 0, running: 0, completed: 0, failed: 0 }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Episode methods
    DatabaseService.prototype.getEpisodeBySubmissionId = function (submissionId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_11;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executeQuery(function (client) { return __awaiter(_this, void 0, void 0, function () {
                                var query, result;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            query = 'SELECT * FROM podcast_episodes WHERE submission_id = $1';
                                            return [4 /*yield*/, client.query(query, [submissionId])];
                                        case 1:
                                            result = _a.sent();
                                            return [2 /*return*/, result.rows.length > 0 ? result.rows[0] : null];
                                    }
                                });
                            }); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_11 = _a.sent();
                        logger_1.logger.error('Failed to get episode by submission ID:', error_11);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return DatabaseService;
}());
exports.DatabaseService = DatabaseService;
