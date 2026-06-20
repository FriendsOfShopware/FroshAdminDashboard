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
npm test            # headless
npm run test:ui     # Playwright UI mode
npm run test:report # open the last HTML report
```

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

