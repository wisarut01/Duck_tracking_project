import { defineConfig, devices } from '@playwright/test';

/** Gateway / mock base URL. Always normalised to end with "/" so relative paths keep the /api/v1 prefix. */
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:4010/api/v1').replace(/\/+$/, '') + '/';
const STORYBOOK_URL = (process.env.STORYBOOK_URL ?? 'http://localhost:6006').replace(/\/+$/, '');

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'results/junit.xml' }],
  ],
  projects: [
    {
      name: 'api',
      testDir: './api',
      use: {
        baseURL: API_BASE_URL,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
    {
      name: 'ui',
      testDir: './ui',
      timeout: 10 * 60_000, // one test walks every story
      use: {
        ...devices['Desktop Chrome'],
        baseURL: STORYBOOK_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
    },
  ],
});
