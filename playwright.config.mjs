import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/compare-harness',
  outputDir: './test-results/compare-harness',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/compare-harness/global-setup.mjs',
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  use: {
    browserName: 'chromium',
    channel: 'chrome',
    colorScheme: 'light',
    locale: 'en-IE',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
