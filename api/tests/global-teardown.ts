// Global test teardown
import { cleanupApiKeySecurityService } from '../src/services/api-key-security';

export default async function globalTeardown() {
  // Clean up any global services that might have timers
  try {
    cleanupApiKeySecurityService();
  } catch (error) {
    console.error('Error during global teardown:', error);
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}
