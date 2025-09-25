import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { serviceManager } from '../services/service-manager';

/**
 * GET /api/test-storage
 * Test endpoint to verify storage connection
 */
export async function testStorageFunction(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('Testing storage connection...');
    
    const storage = serviceManager.getStorage();
    
    // Test storage connection by listing audio files
    const audioFiles = await storage.listAudioFiles();
    
    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Storage connection successful',
        audioFileCount: audioFiles.length,
        storageType: 'Azure Blob Storage'
      }
    };
    
  } catch (error) {
    context.log('Storage test error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Storage test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.toString() : String(error)
      }
    };
  }
}
