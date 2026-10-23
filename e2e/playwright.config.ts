import { defineConfig, devices } from '@playwright/test';

/** Gateway (default) or mock base URL. Always normalised to end with "/" so relative paths keep the /api/v1 prefix. */
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:8080/api/v1').replace(/\/+$/, '') + '/';
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
      // the real web app (WEB_URL) + API. baseURL is the API so the data builders in lib/fixtures.ts work.
      name: 'app',
      testDir: './app',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 1000 },
        baseURL: API_BASE_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
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
