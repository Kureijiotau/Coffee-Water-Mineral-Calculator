import { existsSync } from 'node:fs';
import { chromium, defineConfig, devices, firefox, webkit } from '@playwright/test';
import type { BrowserType, PlaywrightTestConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

function browserLaunchOptions(
  browser: BrowserType,
  environmentVariables: string[],
): { launchOptions?: { executablePath: string } } | undefined {
  const configuredPath = environmentVariables
    .map(environmentVariable => process.env[environmentVariable])
    .find(Boolean);

  if (configuredPath) {
    if (!existsSync(configuredPath)) {
      throw new Error(`Configured browser executable does not exist: ${configuredPath}`);
    }
    return { launchOptions: { executablePath: configuredPath } };
  }

  return existsSync(browser.executablePath()) ? {} : undefined;
}

const chromiumOptions = browserLaunchOptions(
  chromium,
  ['PLAYWRIGHT_CHROMIUM_EXECUTABLE', 'REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE'],
);
const firefoxOptions = browserLaunchOptions(
  firefox,
  ['PLAYWRIGHT_FIREFOX_EXECUTABLE', 'REPLIT_PLAYWRIGHT_FIREFOX_EXECUTABLE'],
);
const webkitOptions = browserLaunchOptions(
  webkit,
  ['PLAYWRIGHT_WEBKIT_EXECUTABLE', 'REPLIT_PLAYWRIGHT_WEBKIT_EXECUTABLE'],
);
const projects: NonNullable<PlaywrightTestConfig['projects']> = [];

if (chromiumOptions) {
  projects.push({
    name: 'chromium',
    testIgnore: '**/mobile-steppers.spec.ts',
    use: {
      ...devices['Desktop Chrome'],
      ...chromiumOptions,
    },
  });
  projects.push({
    name: 'mobile-chromium',
    testMatch: '**/mobile-steppers.spec.ts',
    use: {
      ...devices['Pixel 7'],
      ...chromiumOptions,
    },
  });
} else {
  throw new Error(
    'No Chromium executable is available. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE or install Playwright Chromium.',
  );
}

if (firefoxOptions) {
  projects.push({
    name: 'firefox',
    testIgnore: '**/mobile-steppers.spec.ts',
    use: {
      ...devices['Desktop Firefox'],
      ...firefoxOptions,
    },
  });
}

if (webkitOptions) {
  projects.push({
    name: 'webkit',
    testIgnore: '**/mobile-steppers.spec.ts',
    use: {
      ...devices['Desktop Safari'],
      ...webkitOptions,
    },
  });
}

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
  projects,
});