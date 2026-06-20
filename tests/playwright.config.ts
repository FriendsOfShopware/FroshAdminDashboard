import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load env from ./.env (copy .env.dist and adjust).
dotenv.config();

if (!process.env.APP_URL) {
    process.stdout.write('Missing APP_URL. Copy tests/.env.dist to tests/.env and set your shop URL.\n');
    process.exit(1);
}

// Defaults match a standard Shopware dev install.
process.env.SHOPWARE_ADMIN_USERNAME = process.env.SHOPWARE_ADMIN_USERNAME || 'admin';
process.env.SHOPWARE_ADMIN_PASSWORD = process.env.SHOPWARE_ADMIN_PASSWORD || 'shopware';
process.env.APP_URL = process.env.APP_URL.replace(/\/+$/, '') + '/';

const ignoreHTTPSErrors =
    process.env.SHOPWARE_PLAYWRIGHT_IGNORE_HTTPS_ERRORS === 'true' ||
    process.env.SHOPWARE_PLAYWRIGHT_IGNORE_HTTPS_ERRORS === '1';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI
        ? [
              ['github'],
              ['kagami-playwright-reporter', {
                  apiUrl: "https://kagami.shyim.de",
                  audience: "https://kagami.shyim.de",
              }],
              ['html', { open: 'never' }],
          ]
        : 'html',
    timeout: 60_000,

    use: {
        baseURL: process.env.APP_URL,
        trace: 'retain-on-failure',
        video: 'off',
        ignoreHTTPSErrors,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
