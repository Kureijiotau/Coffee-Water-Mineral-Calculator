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
      testIgnore: '**/mobile-steppers.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),
      },
    },
    {
      name: 'firefox',
      testIgnore: '**/mobile-steppers.spec.ts',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: executablePath('PLAYWRIGHT_FIREFOX_EXECUTABLE'),
      },
    },
    {
      name: 'webkit',
      testIgnore: '**/mobile-steppers.spec.ts',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: executablePath('PLAYWRIGHT_WEBKIT_EXECUTABLE'),
      },
    },
    {
      name: 'mobile-chromium',
      testMatch: '**/mobile-steppers.spec.ts',
      use: {
        ...devices['Pixel 7'],
        launchOptions: executablePath('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),
      },
    },
  ],
});