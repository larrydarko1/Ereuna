/**
 * Playwright configuration for Ereuna end-to-end tests.
 * These tests exercise the REAL stack: Playwright boots the Express API and
 * the Vite frontend, and drives a real Chromium browser against them. The
 * only external dependencies are MongoDB and Redis.
 * The worker, the ingestor and a market-data vendor key are NOT needed — the
 * suite seeds the handful of reference rows and bars it reads straight into
 * the test database, so nothing here waits on a nightly run or a live feed.
 */
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FRONTEND_URL, API_URL } from './support/constants';

const e2eDir = dirname(fileURLToPath(import.meta.url));
// `quiet` because anything that loads this config inherits its stdout, and
// dotenv's banner is enough to make a tool reading JSON off this process fail
const e2eEnv = loadEnv({ path: resolve(e2eDir, '.env.e2e'), quiet: true }).parsed ?? {};

export default defineConfig({
    testDir: './tests',
    globalSetup: './support/global-setup.ts',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: FRONTEND_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            name: 'api',
            command: 'npm --workspace api run dev',
            cwd: resolve(e2eDir, '..'),
            url: `${API_URL}/healthz`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            stdout: 'pipe',
            stderr: 'pipe',
            env: e2eEnv,
        },
        {
            name: 'frontend',
            command: 'npm --workspace frontend run dev',
            cwd: resolve(e2eDir, '..'),
            url: FRONTEND_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    ],
});
