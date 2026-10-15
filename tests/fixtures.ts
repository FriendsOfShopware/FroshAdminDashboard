import { test as shopwareTest, expect } from '@shopware-ag/acceptance-test-suite';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';

/**
 * Lightpanda speaks CDP, which Playwright Test will not launch on its own
 * (`connectOptions` talks Playwright's browser protocol, not CDP). When
 * PLAYWRIGHT_CDP_ENDPOINT is set, attach the worker browser to that endpoint
 * so the Shopware suite's `browser.newContext()` path stays intact.
 *
 * Chrome and the default Playwright Chromium keep the stock browser fixture.
 */
const cdpEndpoint = process.env.PLAYWRIGHT_CDP_ENDPOINT;

function attachOverCdp() {
    return shopwareTest.extend<{}, { browser: Browser }>({
        browser: [
            async ({}, use) => {
                const browser = await chromium.connectOverCDP(cdpEndpoint!, {
                    timeout: 30_000,
                    // Loopback Lightpanda shares this machine's filesystem.
                    // A remote cloud browser does not.
                    isLocal: isLoopback(cdpEndpoint!),
                });
                const openContext = browser.newContext.bind(browser);
                const opened: BrowserContext[] = [];
                browser.newContext = (async (options = {}) => {
                    // The Shopware fixture closes its page but not the context.
                    // Lightpanda allows one context at a time ("Cannot have more
                    // than one browser context at a time"), so drop the previous
                    // one before the next test logs in.
                    await Promise.all(opened.splice(0).map((context) => context.close().catch(() => undefined)));

                    // Lightpanda lays the Shopware admin out at multi-thousand-pixel
                    // Y positions and does not scroll those nodes into a normal
                    // viewport, so Playwright treats every control as unclickable.
                    // A viewport taller than that layout keeps hit targets inside
                    // the window. Callers can still pass their own viewport.
                    const withViewport: Parameters<Browser['newContext']>[0] = {
                        viewport: { width: 1600, height: 12_000 },
                        ...options,
                    };
                    const context = await openContext(withViewport);
                    opened.push(context);
                    return context;
                }) as Browser['newContext'];
                await use(browser);
                await browser.close().catch(() => undefined);
            },
            { scope: 'worker' },
        ],
    });
}

function isLoopback(endpoint: string): boolean {
    try {
        const url = new URL(endpoint);
        return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';
    } catch {
        return false;
    }
}

export const test = cdpEndpoint ? attachOverCdp() : shopwareTest;

export { expect };
