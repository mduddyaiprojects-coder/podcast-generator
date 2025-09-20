"use strict";
// Simple Azure Functions entry point
// This version only includes basic functionality for initial deployment
Object.defineProperty(exports, "__esModule", { value: true });
// Import simple functions
require("./functions/health-check-simple");
require("./functions/content-submission-simple");
require("./functions/status-check-simple");
// Note: This is a minimal version for initial deployment
// Full functionality will be added after we get the basic API working
