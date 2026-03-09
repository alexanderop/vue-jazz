import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    actionTimeout: 5000,
    navigationTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: process.env.CI
      ? 'pnpm preview --port 4173'
      : 'pnpm build-only && pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
