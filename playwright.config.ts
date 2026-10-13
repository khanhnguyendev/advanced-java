import { defineConfig } from '@playwright/test';

const port = process.env.E2E_PORT ?? '4010';
const origin = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: { baseURL: origin },
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${port}`,
    url: `${origin}/en`,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
  },
});
