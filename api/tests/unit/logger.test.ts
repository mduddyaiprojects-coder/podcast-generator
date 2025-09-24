import { logger } from '../../src/utils/logger';

// Mock winston
jest.mock('winston', () => {
  const mockLogger = {
    level: 'info',
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn()
    },
    defaultMeta: { service: 'podcast-generator' },
    transports: [],
    add: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

describe('Logger', () => {
  it('should export logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger).toBe('object');
  });

  it('should have required methods', () => {
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('debug');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have correct default meta', () => {
    expect(logger).toHaveProperty('defaultMeta');
    expect(logger.defaultMeta).toEqual({ service: 'podcast-generator' });
  });

  it('should have level property', () => {
    expect(logger).toHaveProperty('level');
    expect(typeof logger.level).toBe('string');
  });

  it('should have transports property', () => {
    expect(logger).toHaveProperty('transports');
    expect(Array.isArray(logger.transports)).toBe(true);
  });

  it('should have add method for adding transports', () => {
    expect(logger).toHaveProperty('add');
    expect(typeof logger.add).toBe('function');
  });

  it('should be able to call logging methods', () => {
    // These should not throw errors
    expect(() => logger.info('Test info message')).not.toThrow();
    expect(() => logger.warn('Test warning message')).not.toThrow();
    expect(() => logger.error('Test error message')).not.toThrow();
    expect(() => logger.debug('Test debug message')).not.toThrow();
  });

  it('should be able to call logging methods with objects', () => {
    const testData = { message: 'Test', data: { key: 'value' } };
    
    expect(() => logger.info(testData)).not.toThrow();
    expect(() => logger.warn(testData)).not.toThrow();
    expect(() => logger.error(testData)).not.toThrow();
    expect(() => logger.debug(testData)).not.toThrow();
  });

  it('should be able to call logging methods with multiple arguments', () => {
    expect(() => logger.info('Message', { data: 'test' })).not.toThrow();
    expect(() => logger.warn('Warning', 'Additional info')).not.toThrow();
    expect(() => logger.error('Error', new Error('Test error'))).not.toThrow();
  });
});