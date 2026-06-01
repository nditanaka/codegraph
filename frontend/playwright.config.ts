import { defineConfig } from '@playwright/test';

// End-to-end config. Assumes the backend (port 4000) and frontend dev server
// (port 5173) are running. Run with: npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:5173', headless: true },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true
  }
});
