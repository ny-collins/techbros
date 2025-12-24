export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-environment-jsdom)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/__tests__/**/*.test.js'
  ],
  collectCoverageFrom: [
    'public/js/**/*.js',
    '!public/js/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};