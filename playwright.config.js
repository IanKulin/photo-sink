const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  workers: 1, // Tests share a single SQLite DB; parallel workers cause getLastImageId() races
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node server.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      ...process.env,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'a'.repeat(64),
      PORT: '3000',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
