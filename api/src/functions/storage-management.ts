import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AzureBlobStorageService } from '../services/azure-blob-storage';
import { AzureCDNService } from '../services/azure-cdn';
import { StorageLifecycleService } from '../services/storage-lifecycle';
import { getStorageConfig, validateStorageConfig } from '../config/storage';
import { logger } from '../utils/logger';

const httpTrigger = async function (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const method = request.method?.toUpperCase();
    const action = request.query.get('action') || '';

    logger.info(`Storage management request: ${method} ${action}`);

    // Initialize services
    const blobStorage = new AzureBlobStorageService();
    const cdnService = new AzureCDNService();
    const lifecycleService = new StorageLifecycleService(blobStorage);

    // Initialize blob storage
    await blobStorage.initialize();

    switch (method) {
      case 'GET':
        return await handleGetRequest(request, blobStorage, cdnService, lifecycleService, action);
      case 'POST':
        return await handlePostRequest(request, blobStorage, cdnService, lifecycleService, action);
      case 'DELETE':
        return await handleDeleteRequest(request, blobStorage, action);
      default:
        return {
          status: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    logger.error('Storage management error:', error);
    return {
      status: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function handleGetRequest(
  request: HttpRequest,
  blobStorage: AzureBlobStorageService,
  cdnService: AzureCDNService,
  lifecycleService: StorageLifecycleService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'stats':
      const stats = await lifecycleService.getStorageStats();
      return {
        status: 200,
        body: JSON.stringify(stats)
      };

    case 'config':
      const config = getStorageConfig();
      const errors = validateStorageConfig(config);
      return {
        status: 200,
        body: JSON.stringify({
          config,
          validationErrors: errors
        })
      };

    case 'health':
      const isConfigured = cdnService.isConfigured();
      const connectivity = await cdnService.testConnectivity();
      return {
        status: 200,
        body: JSON.stringify({
          blobStorage: 'connected',
          cdn: {
            configured: isConfigured,
            connected: connectivity
          }
        })
      };

    case 'files':
      const prefix = request.query.get('prefix');
      const files = await blobStorage.listFiles(prefix || undefined);
      return {
        status: 200,
        body: JSON.stringify({ files })
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for GET request' })
      };
  }
}

async function handlePostRequest(
  request: HttpRequest,
  blobStorage: AzureBlobStorageService,
  cdnService: AzureCDNService,
  lifecycleService: StorageLifecycleService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'upload':
      return await handleFileUpload(request, blobStorage, cdnService);

    case 'purge-cache':
      const body = await request.json();
      const urls = (body as any)?.urls || [];
      const result = await cdnService.purgeCache(urls);
      return {
        status: result.success ? 200 : 500,
        body: JSON.stringify(result)
      };

    case 'lifecycle':
      const lifecycleStats = await lifecycleService.runLifecycleManagement();
      return {
        status: 200,
        body: JSON.stringify(lifecycleStats)
      };

    case 'cost-optimization':
      const recommendations = await lifecycleService.getCostOptimizationRecommendations();
      return {
        status: 200,
        body: JSON.stringify(recommendations)
      };

    case 'cleanup-temp':
      const deletedCount = await lifecycleService.cleanupTemporaryFiles();
      return {
        status: 200,
        body: JSON.stringify({ deletedCount })
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for POST request' })
      };
  }
}

async function handleDeleteRequest(
  request: HttpRequest,
  blobStorage: AzureBlobStorageService,
  action: string
): Promise<HttpResponseInit> {
  switch (action) {
    case 'file':
      const fileName = request.query.get('fileName');
      if (!fileName) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'fileName parameter is required' })
        };
      }

      const success = await blobStorage.deleteFile(fileName);
      return {
        status: success ? 200 : 500,
        body: JSON.stringify({ success })
      };

    default:
      return {
        status: 400,
        body: JSON.stringify({ error: 'Invalid action for DELETE request' })
      };
  }
}

async function handleFileUpload(
  request: HttpRequest,
  blobStorage: AzureBlobStorageService,
  cdnService: AzureCDNService
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const { fileName, contentType, data, metadata } = body as any;

    if (!fileName || !contentType || !data) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'fileName, contentType, and data are required' })
      };
    }

    // Convert base64 data to buffer
    const fileBuffer = Buffer.from(data, 'base64');

    // Upload file
    const uploadResult = await blobStorage.uploadFile(
      fileBuffer,
      fileName,
      contentType,
      metadata
    );

    if (uploadResult.success) {
      // Get CDN URL
      const cdnUrl = cdnService.getCdnUrl(uploadResult.url || '');
      
      return {
        status: 200,
        body: JSON.stringify({
          success: true,
          blobName: uploadResult.blobName,
          url: uploadResult.url,
          cdnUrl,
          size: fileBuffer.length
        })
      };
    } else {
      return {
        status: 500,
        body: JSON.stringify({
          success: false,
          error: uploadResult.error
        })
      };
    }
  } catch (error) {
    logger.error('File upload error:', error);
    return {
      status: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    };
  }
}

export default httpTrigger;