# End-to-end tests

Playwright tests for the Frosh Admin Dashboard, built on the official
[`@shopware-ag/acceptance-test-suite`](https://www.npmjs.com/package/@shopware-ag/acceptance-test-suite)
(provides an already logged-in `AdminPage` fixture).

## Setup

```bash
cd tests
npm install
npx playwright install chromium
cp .env.dist .env   # then edit APP_URL / credentials
```

`.env`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `APP_URL` | — | Shop base URL (required), e.g. `http://sw-trunk.localhost` |
| `SHOPWARE_ADMIN_USERNAME` | `admin` | Admin login |
| `SHOPWARE_ADMIN_PASSWORD` | `shopware` | Admin password |
| `SHOPWARE_PLAYWRIGHT_IGNORE_HTTPS_ERRORS` | `0` | `1` for self-signed certs |

The plugin must be installed, activated and the admin bundle built on the target
shop before running.

## Run

```bash
npm test            # headless, Playwright's bundled Chromium
npm run test:chrome # the same suite in installed Google Chrome
npm run test:ui     # Playwright UI mode
npm run test:report # open the last HTML report
```

## Chrome vs Lightpanda

`npm run test:compare` runs this suite twice and prints pass/fail, duration, and
peak RSS:

1. **Google Chrome**, via Playwright's `channel: 'chrome'` (the installed Chrome).
2. **[Lightpanda](https://lightpanda.io/)**, a CDP browser. The script starts
   `lightpanda serve` on `127.0.0.1:9222` and points Playwright at it with
   `PLAYWRIGHT_CDP_ENDPOINT`. Install the binary from
   [Lightpanda's nightly builds](https://lightpanda.io/docs/run-locally/installation/one-liner)
   (default path `~/.local/bin/lightpanda`, override with `LIGHTPANDA_BIN`).

Lightpanda is not a Chromium executable, so Playwright cannot launch it with
`channel` or `executablePath`. `tests/fixtures.ts` attaches with
`chromium.connectOverCDP` only when `PLAYWRIGHT_CDP_ENDPOINT` is set. Unset, the
suite uses the normal browser fixture and CI stays on bundled Chromium.

Lightpanda's layout places admin controls thousands of pixels down the page and
does not scroll them into view, so the CDP fixture opens a 1600×12000 viewport.
Otherwise Playwright reports every button as outside the viewport and the
Shopware login click never lands. Lightpanda also allows one browser context
and one page at a time. The fixture closes the previous context before each
test (the Shopware helper only closes the page), and the axe scan runs in
legacy mode so it does not open a second blank page.

A Lightpanda Cloud browser (`wss://euwest.cloud.lightpanda.io/ws?token=…`) can
be compared the same way by exporting `PLAYWRIGHT_CDP_ENDPOINT` before
`npm run test:compare`. Cloud browsers cannot open a shop that is only reachable
on localhost. `npm run test:lightpanda` runs just the Lightpanda half.

## What is covered

`e2e/dashboard.spec.ts`:
- the modular grid replaces the core dashboard and renders widgets (no console errors)
- edit mode shows the toolbar + grouped add-widget picker
- adding a widget places it and the layout persists across reload
- removing a widget takes it off the board

Selectors live in `pages/dashboard.page.ts` and use the plugin's BEM classes;
widget labels assume the English admin locale.

## Continuous integration

`.github/workflows/playwright.yml` runs the suite on every push/PR:

1. `shopware-cli extension zip` packages the plugin (compiling the admin assets).
2. The [shopware-demo-environment](https://github.com/FriendsOfShopware/shopware-demo-environment)
   container is started on `http://localhost:8000`.
3. `shopware-cli project extension upload dist/FroshAdminDashboard.zip --activate`
   installs the plugin through the Admin API. The connection is taken straight
   from the `SHOPWARE_CLI_API_URL`, `SHOPWARE_CLI_API_USERNAME` and
   `SHOPWARE_CLI_API_PASSWORD` environment variables — no config file or
   committed credentials needed.
4. Playwright runs against the container and the HTML report is uploaded.

You can reproduce this locally: start the demo container, then from the plugin
root run `SHOPWARE_CLI_API_URL=… SHOPWARE_CLI_API_USERNAME=admin
SHOPWARE_CLI_API_PASSWORD=shopware shopware-cli project extension upload . --activate`.

