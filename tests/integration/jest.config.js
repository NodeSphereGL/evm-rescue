module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 75,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/setup-tests.ts'],
  testTimeout: 300000, // 5 minutes for integration tests
  verbose: true,
  detectOpenHandles: false,
};