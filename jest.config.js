export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/elysium.js' // Exclude main hook file (just imports)
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
