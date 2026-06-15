# Store screenshots

Two-step process, both driven by a local Chrome over CDP (no Playwright browser download needed):

1. Launch Chrome with remote debugging:
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 --user-data-dir=/tmp/frosh-chrome about:blank &

2. Capture raw admin screenshots into src/Resources/store/_raw/:
   (run from tests/acceptance so @playwright/test resolves)
   APP_URL=http://sw-trunk.localhost ADMIN_USER=admin ADMIN_PASS=shopware \
     node /path/to/screenshots/capture.mjs

3. Wrap them into marketing images (headline + branded background):
   node /path/to/screenshots/marketing.mjs

`capture.mjs` writes the raw UI captures; `marketing.mjs` composes the final
img-0..4.png used by .shopware-extension.yml. Edit the SLIDES array in
marketing.mjs to change the captions.
