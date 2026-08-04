import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'about.spec.ts',
  timeout: 90000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
