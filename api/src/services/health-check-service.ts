import { DatabaseService } from './database-service';
import { AzureOpenAIService } from './azure-openai-service';
import { ElevenLabsService } from './elevenlabs-service';
import { FirecrawlService } from './firecrawl-service';
import { logger } from '../utils/logger';

export interface HealthStatus {
  isHealthy: boolean;
  services: {
    database: boolean;
    azureOpenAI: boolean;
    elevenLabs: boolean;
    firecrawl: boolean;
  };
}

export class HealthCheckService {
  private databaseService: DatabaseService;
  private azureOpenAIService: AzureOpenAIService;
  private elevenLabsService: ElevenLabsService;
  private firecrawlService: FirecrawlService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.azureOpenAIService = new AzureOpenAIService();
    this.elevenLabsService = new ElevenLabsService();
    this.firecrawlService = new FirecrawlService();
  }

  async checkHealth(): Promise<HealthStatus> {
    const services = {
      database: false,
      azureOpenAI: false,
      elevenLabs: false,
      firecrawl: false
    };

    try {
      // Check database connection
      services.database = await this.databaseService.checkConnection();

      // Check Azure OpenAI
      services.azureOpenAI = await this.azureOpenAIService.checkHealth();

      // Check ElevenLabs
      services.elevenLabs = await this.elevenLabsService.checkHealth();

      // Check Firecrawl
      services.firecrawl = await this.firecrawlService.checkHealth();

    } catch (error) {
      logger.error('Health check error:', error);
    }

    const isHealthy = Object.values(services).every(status => status === true);

    return {
      isHealthy,
      services
    };
  }
}
