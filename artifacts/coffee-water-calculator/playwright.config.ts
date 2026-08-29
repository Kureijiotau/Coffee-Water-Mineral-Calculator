import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;
const executablePath = (environmentVariable: string): { executablePath?: string } => {
  const value = process.env[environmentVariable];
  return value ? { executablePath: value } : {};
};

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    baseURL,
    acceptDownloads: true,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `PORT=${port} BASE_PATH=/ pnpm run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: executablePath('PLAYWRIGHT_FIREFOX_EXECUTABLE'),
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: executablePath('PLAYWRIGHT_WEBKIT_EXECUTABLE'),
      },
    },
  ],
});