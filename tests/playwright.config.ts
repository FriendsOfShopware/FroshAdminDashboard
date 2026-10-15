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

// Empty keeps CI on Playwright's bundled Chromium. `chrome` uses the installed
// Google Chrome. A CDP endpoint (local Lightpanda, or Lightpanda Cloud) is
// attached from tests/fixtures.ts and must not also launch a local browser.
const cdpEndpoint = process.env.PLAYWRIGHT_CDP_ENDPOINT;
const useInstalledChrome = !cdpEndpoint && process.env.PLAYWRIGHT_CHANNEL === 'chrome';

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
        // Lightpanda has no tracing or screenshot pipeline; leave those off
        // when the suite is attached over CDP.
        trace: cdpEndpoint ? 'off' : 'retain-on-failure',
        video: 'off',
        screenshot: 'off',
        ignoreHTTPSErrors,
    },

    projects: [
        cdpEndpoint
            ? {
                  name: 'lightpanda',
                  use: { trace: 'off', video: 'off', screenshot: 'off' },
              }
            : useInstalledChrome
              ? {
                    name: 'chrome',
                    use: { ...devices['Desktop Chrome'], channel: 'chrome' },
                }
              : {
                    name: 'chromium',
                    use: { ...devices['Desktop Chrome'] },
                },
    ],
});
