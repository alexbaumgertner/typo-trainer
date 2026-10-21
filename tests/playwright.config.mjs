import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT || 4173);
export default defineConfig({
  testDir: './browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs dist',
    cwd: new URL('../', import.meta.url).pathname,
    url: `http://127.0.0.1:${port}`,
    env: { PORT: String(port), HOST: '0.0.0.0' },
    reuseExistingServer: false,
  },
});
