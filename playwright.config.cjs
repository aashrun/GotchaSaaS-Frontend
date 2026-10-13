const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_APP_ORIGIN || 'http://localhost:7011',
    headless: true,
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
