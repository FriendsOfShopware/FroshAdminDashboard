// Captures store screenshots of the FroshAdminDashboard plugin.
// Usage: APP_URL=http://sw-trunk.localhost node screenshots/capture.mjs
import { chromium } from '@playwright/test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = process.env.STORE_DIR || resolve(SCRIPT_DIR, '../src/Resources/store');

const APP_URL = process.env.APP_URL || 'http://sw-trunk.localhost';
const USER = process.env.ADMIN_USER || 'admin';
const PASS = process.env.ADMIN_PASS || 'shopware';
const VIEWPORT = { width: 1500, height: 880 };
// e.g. OUT_PREFIX=_raw/img-de- captures localized raw screenshots.
const OUT_PREFIX = process.env.OUT_PREFIX || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
    const target = OUT_PREFIX ? `${OUT_PREFIX}${name.replace(/^img-/, '')}` : name;
    await page.screenshot({ path: join(STORE_DIR, target) });
    console.log('captured', target);
}

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const browser = await chromium.connectOverCDP(CDP_URL);
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = context.pages()[0] ?? (await context.newPage());
await page.setViewportSize(VIEWPORT);

try {
    // --- login ---
    await page.goto(`${APP_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sw-field--username, input[name="sw-field--username"], .sw-login__container input', {
        timeout: 60000,
    });
    const userInput = page.locator('input[name="sw-field--username"], #sw-field--username').first();
    const passInput = page.locator('input[type="password"]').first();
    await userInput.fill(USER);
    await passInput.fill(PASS);
    await page.locator('button[type="submit"], .sw-login__login-action button').first().click();

    // wait for the admin shell to load
    await page.waitForSelector('.sw-admin-menu, .sw-dashboard-index, .frosh-dashboard-grid', { timeout: 60000 });
    await sleep(4000);

    // --- navigate to dashboard explicitly ---
    await page.goto(`${APP_URL}/admin#/sw/dashboard/index`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.frosh-dashboard-grid', { timeout: 60000 });
    await sleep(5000); // let widgets/charts load

    // 0: default dashboard
    await shot(page, 'img-0.png');

    // 1: edit mode (Customize)
    const customize = page.locator('.frosh-dashboard-grid__toolbar-actions button').last();
    await customize.click();
    await sleep(1500);
    await shot(page, 'img-1.png');

    // 2: add-widget modal (grouped picker)
    const addBtn = page.locator('.frosh-dashboard-grid__toolbar-actions button', { hasText: /Add|hinzu/ }).first();
    await addBtn.click();
    await page.waitForSelector('.frosh-dashboard-add-widget-modal', { timeout: 15000 });
    await sleep(1200);
    await shot(page, 'img-2.png');

    // close modal, leave edit mode
    await page.keyboard.press('Escape');
    await sleep(800);
    const done = page.locator('.frosh-dashboard-grid__toolbar-actions button').last();
    await done.click();
    await sleep(1000);

    // 3: scrolled to analytics widgets
    await page.evaluate(() => {
        const el = document.querySelector('.frosh-dashboard-index__content, .frosh-dashboard-grid');
        if (el) el.scrollTop = el.scrollHeight / 2;
    });
    await sleep(2500);
    await shot(page, 'img-3.png');

    // 4: bottom of dashboard
    await page.evaluate(() => {
        const el = document.querySelector('.frosh-dashboard-index__content, .frosh-dashboard-grid');
        if (el) el.scrollTop = el.scrollHeight;
    });
    await sleep(2500);
    await shot(page, 'img-4.png');

    console.log('done');
} catch (err) {
    console.error('FAILED:', err.message);
    await page.screenshot({ path: join(STORE_DIR, 'debug-failure.png') }).catch(() => {});
    process.exitCode = 1;
} finally {
    // Connected over CDP — detach without killing the user's Chrome.
    await browser.close().catch(() => {});
}
