import * as dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.TARGET ?? 'mocks'}` });

console.log('[config] TARGET =', process.env.TARGET);
console.log('[config] BASE_URL =', process.env.BASE_URL);
console.log('[config] DELEGATED_TOKEN len =', (process.env.DELEGATED_TOKEN ?? '').length);
console.log('[config] DELEGATED_TOKEN first30 =', (process.env.DELEGATED_TOKEN ?? '').slice(0, 30));

import { defineConfig, devices } from '@playwright/test';

const TARGET = process.env.TARGET ?? 'mocks';
const isMocks = TARGET === 'mocks';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mocks',
      testDir: './tests/mocks',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4001',
      },
    },
    {
      name: 'dev',
      testDir: './tests/dev',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL ?? 'https://vishenka.skroy.ru',
        extraHTTPHeaders: process.env.AUTH_HEADER
          ? { Authorization: process.env.AUTH_HEADER }
          : {},
      },
    },
  ],
  webServer: isMocks
    ? {
        command: 'node scripts/start-mocks.js',
        url: 'http://localhost:4001/api/v1/events',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      }
    : undefined,
});