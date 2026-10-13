import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: { baseURL: 'http://localhost:4010' },
  webServer: {
    command: 'pnpm build && pnpm exec next start -p 4010',
    url: 'http://localhost:4010/en',
    timeout: 600_000,
    reuseExistingServer: true,
  },
});
