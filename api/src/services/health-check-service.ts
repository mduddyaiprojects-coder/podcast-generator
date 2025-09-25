import { serviceManager } from './service-manager';
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
  constructor() {
    // Services will be lazy loaded via ServiceManager
  }

  async checkHealth(): Promise<HealthStatus> {
    const services = {
      database: false,
      azureOpenAI: false,
      elevenLabs: false,
      firecrawl: false
    };

    try {
      // Check Azure OpenAI health (lazy loaded)
      const azureOpenAI = serviceManager.getAzureOpenAI();
      services.azureOpenAI = await azureOpenAI.checkHealth();

      // Check ElevenLabs health (lazy loaded)
      const elevenLabs = serviceManager.getElevenLabs();
      services.elevenLabs = await elevenLabs.checkHealth();

      // Check Firecrawl health (lazy loaded)
      const firecrawl = serviceManager.getFirecrawl();
      services.firecrawl = await firecrawl.checkHealth();

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
