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
