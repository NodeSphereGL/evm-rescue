import { logger } from '../../src/utils/logger';

// Configure logger for tests
logger.setLevel(process.env.TEST_LOG_LEVEL?.toUpperCase() as any || 'INFO');

// Set test environment variables
process.env.NODE_ENV = 'test';

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

// Global test utilities
(global as any).testUtils = {
  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Helper to get environment variable with fallback
  getEnvVar: (name: string, fallback?: string): string => {
    const value = process.env[name];
    if (!value && !fallback) {
      throw new Error(`Required environment variable ${name} not set`);
    }
    return value || fallback!;
  },
};

declare global {
  var testUtils: {
    sleep: (ms: number) => Promise<void>;
    getEnvVar: (name: string, fallback?: string) => string;
  };
}