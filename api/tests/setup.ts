// Test setup file
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['AZURE_FUNCTIONS_ENVIRONMENT'] = 'Development';

// Mock Azure Functions context for testing
(global as any).mockContext = {
  log: jest.fn(),
  bindings: {},
  bindingData: {},
  invocationId: 'test-invocation-id',
  executionContext: {
    invocationId: 'test-invocation-id',
    functionName: 'test-function',
    functionDirectory: '/test',
    retryContext: null
  }
};

// Extend Jest matchers if needed
expect.extend({
  // Add custom matchers here if needed
});
