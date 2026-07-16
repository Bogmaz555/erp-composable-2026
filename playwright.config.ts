import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  snapshotPathTemplate: '{testDir}/visual-baseline/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PW_SKIP_SERVER
    ? undefined
    : {
        command: 'pnpm --filter frontend run dev',
        url: 'http://127.0.0.1:3001',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
