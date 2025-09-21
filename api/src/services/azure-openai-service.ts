import { logger } from '../utils/logger';
import { AzureOpenAI } from 'openai';
import { environmentService } from '../config/environment';
import { apiKeySecurityService } from './api-key-security';

export interface ExtractedContent {
  title: string;
  content: string;
  summary?: string;
  metadata?: any;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deploymentName: string;
}

export class AzureOpenAIService {
  private client!: AzureOpenAI;
  private config: AzureOpenAIConfig;
  private isHealthy: boolean = true;

  constructor() {
    const envConfig = environmentService.getConfig();
    this.config = {
      endpoint: envConfig.apiKeys.azureOpenAI.endpoint,
      apiKey: envConfig.apiKeys.azureOpenAI.apiKey,
      apiVersion: envConfig.apiKeys.azureOpenAI.apiVersion,
      deploymentName: envConfig.apiKeys.azureOpenAI.deploymentName
    };

    if (!this.config.endpoint || !this.config.apiKey) {
      logger.warn('Azure OpenAI not configured - service will not function');
      this.isHealthy = false;
    } else {
      // Validate API key security
      this.validateApiKeySecurity();
      
      this.client = new AzureOpenAI({
        endpoint: this.config.endpoint,
        apiKey: this.config.apiKey,
        apiVersion: this.config.apiVersion,
        deployment: this.config.deploymentName
      });
    }
  }

  /**
   * Validate API key security
   */
  private async validateApiKeySecurity(): Promise<void> {
    if (environmentService.isSecurityFeatureEnabled('enableApiKeyValidation')) {
      try {
        await apiKeySecurityService.validateApiKey('azure-openai', this.config.apiKey);
      } catch (error) {
        logger.warn('Azure OpenAI API key validation failed', { error });
      }
    }
  }

  /**
   * Generate a summary of the provided content
   */
  async generateSummary(content: string): Promise<string> {
    if (!this.isHealthy) {
      throw new Error('Azure OpenAI service not configured or unhealthy');
    }

    try {
      logger.info('Generating summary with Azure OpenAI');

      const messages = [
        {
          role: 'system' as const,
          content: `You are a helpful assistant that creates concise, informative summaries of web content. 
          Your summaries should be:
          - 2-3 sentences long
          - Capture the main points and key insights
          - Written in a clear, engaging style
          - Suitable for a podcast introduction`
        },
        {
          role: 'user' as const,
          content: `Please summarize the following content:\n\n${content}`
        }
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages,
        max_tokens: 200,
        temperature: 0.7,
        top_p: 0.9
      });

      const summary = response.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated from Azure OpenAI');
      }

      logger.info('Successfully generated summary:', {
        contentLength: content.length,
        summaryLength: summary.length
      });

      return summary;

    } catch (error) {
      logger.error('Azure OpenAI summary generation failed:', error);
      this.isHealthy = false;
      throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a podcast script from extracted content
   */
  async generatePodcastScript(content: ExtractedContent): Promise<string> {
    if (!this.isHealthy) {
      throw new Error('Azure OpenAI service not configured or unhealthy');
    }

    try {
      logger.info('Generating podcast script with Azure OpenAI');

      const messages = [
        {
          role: 'system' as const,
          content: `You are a professional podcast host creating engaging, conversational scripts. 
          Your scripts should be:
          - 3-5 minutes of speaking time (approximately 400-600 words)
          - Conversational and engaging tone
          - Include a brief introduction and conclusion
          - Break down complex topics into digestible segments
          - Use natural transitions between ideas
          - Include occasional questions to engage listeners
          - End with a thoughtful conclusion or call-to-action`
        },
        {
          role: 'user' as const,
          content: `Create a podcast script based on this content:

Title: ${content.title}
Summary: ${content.summary || 'No summary available'}
Content: ${content.content.substring(0, 2000)}...

Please create an engaging podcast script that covers the main points of this content.`
        }
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages,
        max_tokens: 800,
        temperature: 0.8,
        top_p: 0.9
      });

      const script = response.choices[0]?.message?.content?.trim();
      
      if (!script) {
        throw new Error('No podcast script generated from Azure OpenAI');
      }

      logger.info('Successfully generated podcast script:', {
        title: content.title,
        scriptLength: script.length,
        wordCount: script.split(' ').length
      });

      return script;

    } catch (error) {
      logger.error('Azure OpenAI podcast script generation failed:', error);
      this.isHealthy = false;
      throw new Error(`Podcast script generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Azure OpenAI service is healthy
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isHealthy) {
      return false;
    }

    try {
      // Test with a simple completion to verify connectivity
      const messages = [
        {
          role: 'user' as const,
          content: 'Hello, please respond with "OK" to confirm the service is working.'
        }
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages,
        max_tokens: 10,
        temperature: 0
      });

      const result = response.choices[0]?.message?.content?.trim();
      this.isHealthy = result === 'OK';
      
      return this.isHealthy;

    } catch (error) {
      logger.error('Azure OpenAI health check failed:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): boolean {
    return this.isHealthy;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Omit<AzureOpenAIConfig, 'apiKey'> {
    return {
      endpoint: this.config.endpoint,
      apiVersion: this.config.apiVersion,
      deploymentName: this.config.deploymentName
    };
  }
}
