import { HealthConfigService } from '../../src/config/health';

describe('HealthConfigService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('default configuration', () => {
    it('should load with default values when no env vars set', () => {
      // Clear health-check related env vars
      delete process.env['HEALTH_CHECK_YOUTUBE_ENABLED'];
      delete process.env['HEALTH_CHECK_DOC_INGEST_ENABLED'];
      delete process.env['HEARTBEAT_ENABLED'];

      const service = new HealthConfigService();
      const config = service.getConfig();

      expect(config.youtube.enabled).toBe(true);
      expect(config.youtube.checkIntervalMs).toBe(60000);
      expect(config.youtube.timeoutMs).toBe(5000);
      expect(config.youtube.retryAttempts).toBe(2);

      expect(config.docIngestion.enabled).toBe(true);
      expect(config.docIngestion.checkIntervalMs).toBe(60000);
      expect(config.docIngestion.timeoutMs).toBe(5000);
      expect(config.docIngestion.retryAttempts).toBe(2);

      expect(config.heartbeat.enabled).toBe(true);
      expect(config.heartbeat.intervalMs).toBe(30000);
    });
  });

  describe('environment variable overrides', () => {
    it('should respect HEALTH_CHECK_YOUTUBE_ENABLED=false', () => {
      process.env['HEALTH_CHECK_YOUTUBE_ENABLED'] = 'false';

      const service = new HealthConfigService();
      expect(service.isYouTubeHealthCheckEnabled()).toBe(false);
    });

    it('should respect HEALTH_CHECK_DOC_INGEST_ENABLED=false', () => {
      process.env['HEALTH_CHECK_DOC_INGEST_ENABLED'] = 'false';

      const service = new HealthConfigService();
      expect(service.isDocIngestionHealthCheckEnabled()).toBe(false);
    });

    it('should respect HEARTBEAT_ENABLED=false', () => {
      process.env['HEARTBEAT_ENABLED'] = 'false';

      const service = new HealthConfigService();
      expect(service.isHeartbeatEnabled()).toBe(false);
    });

    it('should parse custom interval values', () => {
      process.env['HEALTH_CHECK_YOUTUBE_INTERVAL_MS'] = '120000';
      process.env['HEALTH_CHECK_DOC_INGEST_INTERVAL_MS'] = '90000';
      process.env['HEARTBEAT_INTERVAL_MS'] = '45000';

      const service = new HealthConfigService();
      const config = service.getConfig();

      expect(config.youtube.checkIntervalMs).toBe(120000);
      expect(config.docIngestion.checkIntervalMs).toBe(90000);
      expect(config.heartbeat.intervalMs).toBe(45000);
    });

    it('should parse custom timeout values', () => {
      process.env['HEALTH_CHECK_YOUTUBE_TIMEOUT_MS'] = '10000';
      process.env['HEALTH_CHECK_DOC_INGEST_TIMEOUT_MS'] = '8000';

      const service = new HealthConfigService();
      const config = service.getConfig();

      expect(config.youtube.timeoutMs).toBe(10000);
      expect(config.docIngestion.timeoutMs).toBe(8000);
    });

    it('should parse custom retry attempts', () => {
      process.env['HEALTH_CHECK_YOUTUBE_RETRY_ATTEMPTS'] = '5';
      process.env['HEALTH_CHECK_DOC_INGEST_RETRY_ATTEMPTS'] = '3';

      const service = new HealthConfigService();
      const config = service.getConfig();

      expect(config.youtube.retryAttempts).toBe(5);
      expect(config.docIngestion.retryAttempts).toBe(3);
    });
  });

  describe('configuration getters', () => {
    it('should return YouTube config', () => {
      const service = new HealthConfigService();
      const youtubeConfig = service.getYouTubeHealthCheckConfig();

      expect(youtubeConfig).toHaveProperty('enabled');
      expect(youtubeConfig).toHaveProperty('checkIntervalMs');
      expect(youtubeConfig).toHaveProperty('timeoutMs');
      expect(youtubeConfig).toHaveProperty('retryAttempts');
    });

    it('should return doc ingestion config', () => {
      const service = new HealthConfigService();
      const docConfig = service.getDocIngestionHealthCheckConfig();

      expect(docConfig).toHaveProperty('enabled');
      expect(docConfig).toHaveProperty('checkIntervalMs');
      expect(docConfig).toHaveProperty('timeoutMs');
      expect(docConfig).toHaveProperty('retryAttempts');
    });

    it('should return heartbeat config', () => {
      const service = new HealthConfigService();
      const heartbeatConfig = service.getHeartbeatConfig();

      expect(heartbeatConfig).toHaveProperty('enabled');
      expect(heartbeatConfig).toHaveProperty('intervalMs');
    });
  });

  describe('config immutability', () => {
    it('should return a copy of config to prevent mutation', () => {
      const service = new HealthConfigService();
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('validation', () => {
    it('should handle invalid number values gracefully', () => {
      process.env['HEALTH_CHECK_YOUTUBE_INTERVAL_MS'] = 'not-a-number';

      const service = new HealthConfigService();
      const config = service.getConfig();

      // Should fall back to default
      expect(config.youtube.checkIntervalMs).toBe(60000);
    });

    it('should handle invalid boolean values gracefully', () => {
      process.env['HEALTH_CHECK_YOUTUBE_ENABLED'] = 'maybe';

      const service = new HealthConfigService();
      
      // Should interpret as false (not 'true' or '1')
      expect(service.isYouTubeHealthCheckEnabled()).toBe(false);
    });
  });
});
