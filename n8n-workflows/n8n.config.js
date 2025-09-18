/**
 * n8n Configuration for Podcast Generator Workflows
 * This file configures n8n for the podcast generation pipeline
 */

module.exports = {
  // Basic Configuration
  host: process.env.N8N_HOST || 'localhost',
  port: process.env.N8N_PORT || 5678,
  protocol: process.env.N8N_PROTOCOL || 'http',
  
  // Editor Configuration
  editorBaseUrl: process.env.N8N_EDITOR_BASE_URL || 'http://localhost:5678',
  
  // Database Configuration
  database: {
    type: process.env.DB_TYPE || 'postgresdb',
    postgresdb: {
      host: process.env.DB_POSTGRESDB_HOST || 'localhost',
      port: process.env.DB_POSTGRESDB_PORT || 5432,
      database: process.env.DB_POSTGRESDB_DATABASE || 'n8n',
      user: process.env.DB_POSTGRESDB_USER || 'n8n',
      password: process.env.DB_POSTGRESDB_PASSWORD || 'n8n',
    },
  },
  
  // Security Configuration
  security: {
    basicAuth: {
      active: process.env.N8N_BASIC_AUTH_ACTIVE === 'true',
      user: process.env.N8N_BASIC_AUTH_USER || 'admin',
      password: process.env.N8N_BASIC_AUTH_PASSWORD || 'admin',
    },
  },
  
  // Logging Configuration
  logging: {
    level: process.env.N8N_LOG_LEVEL || 'info',
    output: process.env.N8N_LOG_OUTPUT?.split(',') || ['console'],
    file: {
      location: process.env.N8N_LOG_FILE_LOCATION || './logs/n8n.log',
    },
  },
  
  // Binary Data Configuration
  binaryData: {
    defaultMode: process.env.N8N_DEFAULT_BINARY_DATA_MODE || 'filesystem',
    ttl: parseInt(process.env.N8N_BINARY_DATA_TTL) || 24,
    maxSize: parseInt(process.env.N8N_BINARY_DATA_MAX_SIZE) || 16777216, // 16MB
  },
  
  // Execution Configuration
  executions: {
    process: process.env.EXECUTIONS_PROCESS || 'main',
    mode: process.env.EXECUTIONS_MODE || 'regular',
    timeout: parseInt(process.env.EXECUTIONS_TIMEOUT) || 3600, // 1 hour
    timeoutMax: parseInt(process.env.EXECUTIONS_TIMEOUT_MAX) || 7200, // 2 hours
  },
  
  // Queue Configuration (for production scaling)
  queue: {
    bull: {
      redis: {
        host: process.env.QUEUE_BULL_REDIS_HOST || 'localhost',
        port: parseInt(process.env.QUEUE_BULL_REDIS_PORT) || 6379,
        password: process.env.QUEUE_BULL_REDIS_PASSWORD,
      },
    },
  },
  
  // Custom Configuration for Podcast Generator
  custom: {
    // API Endpoints
    podcastApiBaseUrl: process.env.PODCAST_API_BASE_URL || 'http://localhost:7071/api',
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'https://your-domain.com/webhooks',
    
    // External Service Credentials
    azureOpenAI: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    },
    
    elevenLabs: {
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: process.env.ELEVENLABS_VOICE_ID,
    },
    
    firecrawl: {
      apiKey: process.env.FIRECRAWL_API_KEY,
    },
    
    azureStorage: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'podcast-content',
    },
    
    database: {
      url: process.env.DATABASE_URL,
    },
  },
  
  // Workflow-specific settings
  workflows: {
    // Content processing workflow settings
    contentProcessing: {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      timeout: 1800000, // 30 minutes
    },
    
    // TTS generation workflow settings
    ttsGeneration: {
      maxRetries: 2,
      retryDelay: 10000, // 10 seconds
      timeout: 900000, // 15 minutes
    },
    
    // YouTube extraction workflow settings
    youtubeExtraction: {
      maxRetries: 3,
      retryDelay: 3000, // 3 seconds
      timeout: 600000, // 10 minutes
    },
  },
};

