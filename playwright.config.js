// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Saksham 3.0 Autonomous Quality Assurance & Playwright Engine Config
 * Targets Root Static PWA: index.html, css/, js/, sw.js
 */
export default defineConfig({
  testDir: './e2e/journeys',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Deterministic sequential journey execution
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa-engine/reports/playwright-results.json' }],
    ['html', { outputFolder: 'qa-engine/reports/html', open: 'never' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    bypassCSP: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  webServer: {
    command: 'PORT=8080 node server.js',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
    timeout: 15000,
  },
});
