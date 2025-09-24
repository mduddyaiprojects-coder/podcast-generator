"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.ErrorUtils = exports.ProcessingError = exports.ExternalServiceError = exports.StorageError = exports.DatabaseError = exports.RateLimitError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.ErrorHandler = exports.ErrorType = void 0;
exports.withErrorHandling = withErrorHandling;
var logger_1 = require("./logger");
/**
 * Error types and their corresponding HTTP status codes
 */
var ErrorType;
(function (ErrorType) {
    // Client Errors (4xx)
    ErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorType["INVALID_REQUEST"] = "INVALID_REQUEST";
    ErrorType["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorType["FORBIDDEN"] = "FORBIDDEN";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["METHOD_NOT_ALLOWED"] = "METHOD_NOT_ALLOWED";
    ErrorType["CONFLICT"] = "CONFLICT";
    ErrorType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorType["PAYLOAD_TOO_LARGE"] = "PAYLOAD_TOO_LARGE";
    ErrorType["UNSUPPORTED_MEDIA_TYPE"] = "UNSUPPORTED_MEDIA_TYPE";
    // Server Errors (5xx)
    ErrorType["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorType["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorType["BAD_GATEWAY"] = "BAD_GATEWAY";
    ErrorType["GATEWAY_TIMEOUT"] = "GATEWAY_TIMEOUT";
    // Custom Errors
    ErrorType["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorType["STORAGE_ERROR"] = "STORAGE_ERROR";
    ErrorType["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorType["PROCESSING_ERROR"] = "PROCESSING_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * Error Handler Class
 */
var ErrorHandler = /** @class */ (function () {
    function ErrorHandler() {
    }
    /**
     * Handle errors and return standardized error responses
     */
    ErrorHandler.handleError = function (error, request, context, config) {
        if (config === void 0) { config = {}; }
        var mergedConfig = __assign(__assign({}, this.DEFAULT_CONFIG), config);
        var requestId = this.getRequestId(request, mergedConfig.requestIdHeader);
        // Determine error type and status code
        var errorInfo = this.categorizeError(error);
        // Log error if configured
        if (mergedConfig.logErrors) {
            this.logError(error, errorInfo, request, context, requestId);
        }
        // Create error response
        return this.createErrorResponse(errorInfo.type, errorInfo.message, errorInfo.status, errorInfo.details, requestId);
    };
    /**
     * Create standardized error response
     */
    ErrorHandler.createErrorResponse = function (errorType, message, status, details, requestId, validationErrors) {
        var errorResponse = __assign(__assign(__assign({ error: errorType, message: message, timestamp: new Date().toISOString() }, (requestId && { request_id: requestId })), (details && { details: details })), (validationErrors && { validation_errors: validationErrors }));
        return {
            status: status,
            jsonBody: errorResponse
        };
    };
    /**
     * Create validation error response
     */
    ErrorHandler.createValidationErrorResponse = function (errors, requestId) {
        return this.createErrorResponse(ErrorType.VALIDATION_ERROR, 'Request validation failed', 400, 'One or more fields contain invalid values', requestId, errors);
    };
    /**
     * Create not found error response
     */
    ErrorHandler.createNotFoundErrorResponse = function (resource, identifier, requestId) {
        var message = identifier
            ? "".concat(resource, " with identifier '").concat(identifier, "' not found")
            : "".concat(resource, " not found");
        return this.createErrorResponse(ErrorType.NOT_FOUND, message, 404, "The requested ".concat(resource.toLowerCase(), " does not exist"), requestId);
    };
    /**
     * Create rate limit error response
     */
    ErrorHandler.createRateLimitErrorResponse = function (limit, retryAfter, requestId) {
        var response = this.createErrorResponse(ErrorType.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', 429, "Maximum ".concat(limit, " requests allowed"), requestId);
        if (retryAfter) {
            response.headers = {
                'Retry-After': retryAfter.toString()
            };
        }
        return response;
    };
    /**
     * Create internal server error response
     */
    ErrorHandler.createInternalErrorResponse = function (message, details, requestId) {
        if (message === void 0) { message = 'An internal error occurred'; }
        return this.createErrorResponse(ErrorType.INTERNAL_ERROR, message, 500, details || 'Please try again later', requestId);
    };
    /**
     * Create service unavailable error response
     */
    ErrorHandler.createServiceUnavailableErrorResponse = function (service, retryAfter, requestId) {
        var response = this.createErrorResponse(ErrorType.SERVICE_UNAVAILABLE, 'Service temporarily unavailable', 503, "".concat(service, " is currently unavailable"), requestId);
        if (retryAfter) {
            response.headers = {
                'Retry-After': retryAfter.toString()
            };
        }
        return response;
    };
    /**
     * Categorize error and determine appropriate response
     */
    ErrorHandler.categorizeError = function (error) {
        if (error instanceof ValidationError) {
            return {
                type: ErrorType.VALIDATION_ERROR,
                status: 400,
                message: 'Request validation failed',
                details: error.message
            };
        }
        if (error instanceof NotFoundError) {
            return {
                type: ErrorType.NOT_FOUND,
                status: 404,
                message: error.message,
                details: error.details
            };
        }
        if (error instanceof UnauthorizedError) {
            return {
                type: ErrorType.UNAUTHORIZED,
                status: 401,
                message: error.message,
                details: error.details
            };
        }
        if (error instanceof ForbiddenError) {
            return {
                type: ErrorType.FORBIDDEN,
                status: 403,
                message: error.message,
                details: error.details
            };
        }
        if (error instanceof RateLimitError) {
            return {
                type: ErrorType.RATE_LIMIT_EXCEEDED,
                status: 429,
                message: error.message,
                details: error.details
            };
        }
        if (error instanceof DatabaseError) {
            return {
                type: ErrorType.DATABASE_ERROR,
                status: 500,
                message: 'Database operation failed',
                details: error.message
            };
        }
        if (error instanceof StorageError) {
            return {
                type: ErrorType.STORAGE_ERROR,
                status: 500,
                message: 'Storage operation failed',
                details: error.message
            };
        }
        if (error instanceof ExternalServiceError) {
            return {
                type: ErrorType.EXTERNAL_SERVICE_ERROR,
                status: 502,
                message: 'External service error',
                details: error.message
            };
        }
        if (error instanceof ProcessingError) {
            return {
                type: ErrorType.PROCESSING_ERROR,
                status: 500,
                message: 'Content processing failed',
                details: error.message
            };
        }
        // Generic error handling
        if (error instanceof Error) {
            return {
                type: ErrorType.INTERNAL_ERROR,
                status: 500,
                message: 'An internal error occurred',
                details: error.message
            };
        }
        return {
            type: ErrorType.INTERNAL_ERROR,
            status: 500,
            message: 'An unknown error occurred',
            details: 'Please try again later'
        };
    };
    /**
     * Log error with appropriate level
     */
    ErrorHandler.logError = function (error, errorInfo, request, _context, requestId) {
        var logData = {
            requestId: requestId,
            method: request.method,
            url: request.url,
            userAgent: request.headers.get('user-agent'),
            errorType: errorInfo.type,
            status: errorInfo.status,
            message: errorInfo.message,
            details: errorInfo.details,
            stack: error instanceof Error ? error.stack : undefined
        };
        if (errorInfo.status >= 500) {
            logger_1.logger.error('Server error occurred:', logData);
        }
        else if (errorInfo.status >= 400) {
            logger_1.logger.warn('Client error occurred:', logData);
        }
        else {
            logger_1.logger.info('Error occurred:', logData);
        }
    };
    /**
     * Extract request ID from headers
     */
    ErrorHandler.getRequestId = function (request, headerName) {
        return request.headers.get(headerName) || undefined;
    };
    ErrorHandler.DEFAULT_CONFIG = {
        includeStack: false,
        logErrors: true,
        sanitizeErrors: true,
        requestIdHeader: 'x-request-id'
    };
    return ErrorHandler;
}());
exports.ErrorHandler = ErrorHandler;
/**
 * Custom Error Classes
 */
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message, field, code) {
        var _this = _super.call(this, message) || this;
        _this.field = field;
        _this.code = code;
        _this.name = 'ValidationError';
        return _this;
    }
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message, details) {
        var _this = _super.call(this, message) || this;
        _this.details = details;
        _this.name = 'NotFoundError';
        return _this;
    }
    return NotFoundError;
}(Error));
exports.NotFoundError = NotFoundError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message, details) {
        var _this = _super.call(this, message) || this;
        _this.details = details;
        _this.name = 'UnauthorizedError';
        return _this;
    }
    return UnauthorizedError;
}(Error));
exports.UnauthorizedError = UnauthorizedError;
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message, details) {
        var _this = _super.call(this, message) || this;
        _this.details = details;
        _this.name = 'ForbiddenError';
        return _this;
    }
    return ForbiddenError;
}(Error));
exports.ForbiddenError = ForbiddenError;
var RateLimitError = /** @class */ (function (_super) {
    __extends(RateLimitError, _super);
    function RateLimitError(message, details, retryAfter) {
        var _this = _super.call(this, message) || this;
        _this.details = details;
        _this.retryAfter = retryAfter;
        _this.name = 'RateLimitError';
        return _this;
    }
    return RateLimitError;
}(Error));
exports.RateLimitError = RateLimitError;
var DatabaseError = /** @class */ (function (_super) {
    __extends(DatabaseError, _super);
    function DatabaseError(message, operation) {
        var _this = _super.call(this, message) || this;
        _this.operation = operation;
        _this.name = 'DatabaseError';
        return _this;
    }
    return DatabaseError;
}(Error));
exports.DatabaseError = DatabaseError;
var StorageError = /** @class */ (function (_super) {
    __extends(StorageError, _super);
    function StorageError(message, operation) {
        var _this = _super.call(this, message) || this;
        _this.operation = operation;
        _this.name = 'StorageError';
        return _this;
    }
    return StorageError;
}(Error));
exports.StorageError = StorageError;
var ExternalServiceError = /** @class */ (function (_super) {
    __extends(ExternalServiceError, _super);
    function ExternalServiceError(message, service) {
        var _this = _super.call(this, message) || this;
        _this.service = service;
        _this.name = 'ExternalServiceError';
        return _this;
    }
    return ExternalServiceError;
}(Error));
exports.ExternalServiceError = ExternalServiceError;
var ProcessingError = /** @class */ (function (_super) {
    __extends(ProcessingError, _super);
    function ProcessingError(message, step) {
        var _this = _super.call(this, message) || this;
        _this.step = step;
        _this.name = 'ProcessingError';
        return _this;
    }
    return ProcessingError;
}(Error));
exports.ProcessingError = ProcessingError;
/**
 * Higher-order function to wrap Azure Functions with error handling
 */
function withErrorHandling(config) {
    if (config === void 0) { config = {}; }
    return function (handler) {
        var _this = this;
        return (function (request, context) { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, handler(request, context)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        return [2 /*return*/, ErrorHandler.handleError(error_1, request, context, config)];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    };
}
/**
 * Utility functions for common error scenarios
 */
var ErrorUtils = /** @class */ (function () {
    function ErrorUtils() {
    }
    /**
     * Check if error is a known error type
     */
    ErrorUtils.isKnownError = function (error) {
        return error instanceof ValidationError ||
            error instanceof NotFoundError ||
            error instanceof UnauthorizedError ||
            error instanceof ForbiddenError ||
            error instanceof RateLimitError ||
            error instanceof DatabaseError ||
            error instanceof StorageError ||
            error instanceof ExternalServiceError ||
            error instanceof ProcessingError;
    };
    /**
     * Extract error message safely
     */
    ErrorUtils.getErrorMessage = function (error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'An unknown error occurred';
    };
    /**
     * Extract error stack safely
     */
    ErrorUtils.getErrorStack = function (error) {
        if (error instanceof Error) {
            return error.stack;
        }
        return undefined;
    };
    /**
     * Create error from HTTP status code
     */
    ErrorUtils.createErrorFromStatus = function (status, message) {
        switch (status) {
            case 400:
                return new ValidationError(message || 'Bad request');
            case 401:
                return new UnauthorizedError(message || 'Unauthorized');
            case 403:
                return new ForbiddenError(message || 'Forbidden');
            case 404:
                return new NotFoundError(message || 'Not found');
            case 429:
                return new RateLimitError(message || 'Rate limit exceeded');
            case 500:
                return new Error(message || 'Internal server error');
            case 503:
                return new Error(message || 'Service unavailable');
            default:
                return new Error(message || 'Unknown error');
        }
    };
    return ErrorUtils;
}());
exports.ErrorUtils = ErrorUtils;
