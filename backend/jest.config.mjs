// Jest configuration for ESM-based Node backend
// Using .mjs so the config itself is ESM-compatible.

/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  // 2-minute timeout: GCP Build machines need extra time to download mongodb-memory-server binary
  testTimeout: 120000,
  // Keep Jest focused on the backend folder
  rootDir: '.',
  // Look for tests inside backend/__test__/
  testMatch: ['<rootDir>/__test__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  setupFilesAfterEnv: ["<rootDir>/__test__/setup.js"],
  globalTeardown: '<rootDir>/__test__/teardown.js',
  // We don't transpile; Node ESM + --experimental-vm-modules handles imports
  transform: {},
  // Show individual test results with the test suite hierarchy
  verbose: true,
};
