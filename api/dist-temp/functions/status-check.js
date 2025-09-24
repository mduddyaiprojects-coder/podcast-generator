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
exports.statusCheckFunction = statusCheckFunction;
function statusCheckFunction(request, context) {
    return __awaiter(this, void 0, void 0, function () {
        var submissionId, status_1;
        return __generator(this, function (_a) {
            try {
                submissionId = request.params['id'];
                if (!submissionId) {
                    return [2 /*return*/, {
                            status: 400,
                            jsonBody: {
                                error: 'MISSING_SUBMISSION_ID',
                                message: 'Submission ID is required',
                                details: 'Please provide a valid submission ID'
                            }
                        }];
                }
                context.log('Status check request received for submission:', submissionId);
                status_1 = generateMockStatus(submissionId);
                return [2 /*return*/, {
                        status: 200,
                        jsonBody: {
                            submission_id: submissionId,
                            status: status_1.status,
                            progress: status_1.progress,
                            message: status_1.message,
                            created_at: status_1.created_at,
                            updated_at: status_1.updated_at,
                            estimated_completion: status_1.estimated_completion
                        }
                    }];
            }
            catch (error) {
                context.log('Status check error:', error);
                return [2 /*return*/, {
                        status: 500,
                        jsonBody: {
                            error: 'INTERNAL_ERROR',
                            message: 'Failed to retrieve status',
                            details: 'Please try again later'
                        }
                    }];
            }
            return [2 /*return*/];
        });
    });
}
function generateMockStatus(_submissionId) {
    // Generate a mock status based on submission ID
    var now = new Date();
    var created = new Date(now.getTime() - Math.random() * 30 * 60 * 1000); // Random time within last 30 minutes
    var statuses = ['pending', 'processing', 'completed', 'failed'];
    var status = statuses[Math.floor(Math.random() * statuses.length)];
    var progress = 0;
    var message = '';
    switch (status) {
        case 'pending':
            progress = 10;
            message = 'Content is queued for processing';
            break;
        case 'processing':
            progress = Math.floor(Math.random() * 80) + 20; // 20-100%
            message = 'Content is being processed';
            break;
        case 'completed':
            progress = 100;
            message = 'Processing completed successfully';
            break;
        case 'failed':
            progress = 0;
            message = 'Processing failed';
            break;
    }
    return {
        status: status,
        progress: progress,
        message: message,
        created_at: created.toISOString(),
        updated_at: now.toISOString(),
        estimated_completion: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
    };
}
